// =============================================================================
// PERFECT INSTA POST - SERVICE WORKER (BACKGROUND.JS)
// Gestion de l'authentification Google OAuth avec chrome.identity
// =============================================================================

const CONFIG = {
    backend: {
        baseUrl: 'https://perfect-insta-extension-production.up.railway.app',
        endpoints: {
            auth: '/auth/google',
            userMe: '/api/user/me',
            generatePost: '/api/generate-post'
        }
    }
};

// État global du service worker
let authState = {
    isAuthenticated: false,
    jwtToken: null,
    user: null
};

// =============================================================================
// INITIALISATION DU SERVICE WORKER
// =============================================================================

// Charger l'état d'authentification au démarrage du service worker
chrome.runtime.onStartup.addListener(async () => {
    console.log('🚀 Perfect Insta Service Worker - Startup');
    await loadAuthState();
});

chrome.runtime.onInstalled.addListener(async () => {
    console.log('🚀 Perfect Insta Service Worker - Installed');
    await loadAuthState();
});

// Charger l'état d'authentification depuis chrome.storage
async function loadAuthState() {
    try {
        const stored = await chrome.storage.local.get(['jwtToken', 'user']);
        if (stored.jwtToken && stored.user) {
            authState.jwtToken = stored.jwtToken;
            authState.user = stored.user;
            authState.isAuthenticated = true;
            console.log('✅ Auth state chargé:', stored.user.email);

            // Valider le token avec le backend
            await validateToken();
        } else {
            console.log('🔍 Aucun état d\'auth trouvé');
            authState.isAuthenticated = false;
        }
    } catch (error) {
        console.error('❌ Erreur chargement auth state:', error);
        authState.isAuthenticated = false;
    }
}

// =============================================================================
// GESTION DES MESSAGES DEPUIS LE POPUP
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Message reçu:', message.type);

    switch (message.type) {
        case 'LOGIN':
            handleLogin(sendResponse);
            return true; // Réponse asynchrone

        case 'GET_AUTH':
            sendResponse({
                isAuthenticated: authState.isAuthenticated,
                token: authState.jwtToken,
                user: authState.user
            });
            return false;

        case 'LOGOUT':
            handleLogout(sendResponse);
            return true; // Réponse asynchrone

        case 'VALIDATE_TOKEN':
            validateToken().then(() => {
                sendResponse({
                    isAuthenticated: authState.isAuthenticated,
                    user: authState.user
                });
            });
            return true; // Réponse asynchrone

        default:
            console.warn('⚠️ Type de message non reconnu:', message.type);
            sendResponse({ success: false, error: 'Type de message non reconnu' });
            return false;
    }
});

// =============================================================================
// AUTHENTIFICATION GOOGLE OAUTH
// =============================================================================

async function handleLogin(sendResponse) {
    try {
        console.log('🔐 Démarrage du flow OAuth simple...');

        // Ouvrir un onglet normal vers la page de connexion
        const authUrl = `${CONFIG.backend.baseUrl}/auth/extension`;
        console.log('🌐 Auth URL:', authUrl);

        chrome.tabs.create({ url: authUrl }, (tab) => {
            console.log('🔗 Onglet OAuth ouvert:', tab.id);

            // Écouter les changements d'URL de cet onglet
            const updateListener = (tabId, changeInfo, updatedTab) => {
                if (tabId === tab.id && changeInfo.url) {
                    console.log('🔄 URL changée:', changeInfo.url);

                    // Vérifier si on a une réponse de succès (callback ou success)
                    if ((changeInfo.url.includes('/auth/success') && changeInfo.url.includes('success=true')) ||
                        (changeInfo.url.includes('/auth/google/callback') && changeInfo.url.includes('code='))) {
                        try {
                            console.log('🎯 URL de succès détectée:', changeInfo.url);
                            const url = new URL(changeInfo.url);

                            // Si c'est /auth/success, extraire directement token et user
                            if (changeInfo.url.includes('/auth/success')) {
                                const token = url.searchParams.get('token');
                                const userStr = url.searchParams.get('user');

                                console.log('🔑 Token extrait:', token ? 'présent' : 'manquant');
                                console.log('👤 User extrait:', userStr ? 'présent' : 'manquant');

                                if (token && userStr) {
                                    const user = JSON.parse(decodeURIComponent(userStr));
                                    console.log('✅ Données utilisateur parsées:', user.email);

                                    // Sauvegarder l'état d'auth
                                    saveAuthState(token, user).then(() => {
                                        console.log('💾 Auth state sauvegardé');
                                        sendResponse({
                                            success: true,
                                            token: token,
                                            user: user
                                        });

                                        // Attendre un peu avant de fermer l'onglet
                                        setTimeout(() => {
                                            chrome.tabs.remove(tab.id);
                                            chrome.tabs.onUpdated.removeListener(updateListener);
                                        }, 1000);
                                    });
                                } else {
                                    console.error('❌ Token ou user manquant dans l\'URL');
                                    sendResponse({
                                        success: false,
                                        error: 'Token ou données utilisateur manquants'
                                    });
                                }
                            }
                            // Si c'est /auth/google/callback, attendre un peu la redirection
                            else if (changeInfo.url.includes('/auth/google/callback')) {
                                console.log('⏳ Callback détecté, attente de la redirection...');
                                // Attendre 3 secondes que la page se redirige vers /auth/success
                                setTimeout(() => {
                                    chrome.tabs.get(tab.id, (currentTab) => {
                                        if (chrome.runtime.lastError) {
                                            console.log('⚠️ Onglet fermé pendant l\'attente');
                                            return;
                                        }

                                        console.log('🔍 URL après attente:', currentTab.url);

                                        // Si toujours sur callback, forcer une vérification manuelle
                                        if (currentTab.url.includes('/auth/google/callback')) {
                                            console.log('❌ Pas de redirection, échec de l\'authentification');
                                            sendResponse({
                                                success: false,
                                                error: 'Redirection vers la page de succès échouée'
                                            });
                                            chrome.tabs.remove(tab.id);
                                            chrome.tabs.onUpdated.removeListener(updateListener);
                                        }
                                    });
                                }, 3000);
                            }
                        } catch (parseError) {
                            console.error('❌ Erreur parsing OAuth:', parseError);
                            sendResponse({
                                success: false,
                                error: 'Erreur parsing: ' + parseError.message
                            });
                            chrome.tabs.remove(tab.id);
                            chrome.tabs.onUpdated.removeListener(updateListener);
                        }
                    }

                    // Vérifier si on a une erreur
                    if (changeInfo.url.includes('error=')) {
                        const url = new URL(changeInfo.url);
                        const error = url.searchParams.get('error') || 'Erreur OAuth inconnue';

                        console.error('❌ Erreur OAuth:', error);
                        sendResponse({
                            success: false,
                            error: error
                        });
                        chrome.tabs.remove(tab.id);
                        chrome.tabs.onUpdated.removeListener(updateListener);
                    }
                }
            };

            chrome.tabs.onUpdated.addListener(updateListener);

            // Timeout après 5 minutes
            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(updateListener);
                sendResponse({
                    success: false,
                    error: 'Timeout - connexion trop longue'
                });
            }, 5 * 60 * 1000);
        });

    } catch (error) {
        console.error('❌ Erreur générale lors du login:', error);
        sendResponse({
            success: false,
            error: 'Erreur générale: ' + error.message
        });
    }
}

// Sauvegarder l'état d'authentification
async function saveAuthState(token, user) {
    try {
        // Sauvegarder en local
        await chrome.storage.local.set({
            jwtToken: token,
            user: user
        });

        // Mettre à jour l'état du service worker
        authState.jwtToken = token;
        authState.user = user;
        authState.isAuthenticated = true;

        console.log('💾 État d\'auth sauvegardé pour:', user.email);
    } catch (error) {
        console.error('❌ Erreur sauvegarde auth state:', error);
        throw error;
    }
}

// =============================================================================
// DÉCONNEXION
// =============================================================================

async function handleLogout(sendResponse) {
    try {
        console.log('🚪 Déconnexion en cours...');

        // Supprimer de chrome.storage
        await chrome.storage.local.remove(['jwtToken', 'user']);

        // Reset de l'état du service worker
        authState.jwtToken = null;
        authState.user = null;
        authState.isAuthenticated = false;

        console.log('✅ Déconnexion réussie');
        sendResponse({ success: true });

    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// =============================================================================
// VALIDATION TOKEN
// =============================================================================

async function validateToken() {
    if (!authState.jwtToken) {
        authState.isAuthenticated = false;
        return;
    }

    try {
        console.log('🔍 Validation du token...');

        const response = await fetch(`${CONFIG.backend.baseUrl}${CONFIG.backend.endpoints.userMe}`, {
            headers: {
                'Authorization': `Bearer ${authState.jwtToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            authState.user = data.user;
            authState.isAuthenticated = true;
            console.log('✅ Token valide, utilisateur:', data.user.email);

            // Mettre à jour le storage avec les nouvelles données
            await chrome.storage.local.set({ user: data.user });
        } else {
            console.warn('⚠️ Token invalide, déconnexion...');
            await handleLogout(() => {});
        }
    } catch (error) {
        console.error('❌ Erreur validation token:', error);
        // Ne pas déconnecter automatiquement en cas d'erreur réseau
    }
}

// =============================================================================
// VALIDATION PÉRIODIQUE DU TOKEN
// =============================================================================

// Valider le token toutes les 30 minutes
setInterval(async () => {
    if (authState.isAuthenticated) {
        console.log('🔄 Validation périodique du token...');
        await validateToken();
    }
}, 30 * 60 * 1000); // 30 minutes

console.log('🎯 Perfect Insta Service Worker initialisé');