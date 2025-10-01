// =============================================================================
// BACKGROUND SERVICE WORKER V2 - AUTH UNIQUEMENT
// Gestion simplifiée de l'authentification Google OAuth
// =============================================================================

const CONFIG = {
    backendUrl: 'https://perfect-insta-extension-production.up.railway.app',
    authTimeout: 2 * 60 * 1000 // 2 minutes
};

// État d'authentification
let authState = {
    isAuthenticated: false,
    jwtToken: null,
    user: null
};

// =============================================================================
// LIFECYCLE
// =============================================================================

chrome.runtime.onStartup.addListener(async () => {
    console.log('🚀 Service Worker - Startup');
    await loadAuthState();
});

chrome.runtime.onInstalled.addListener(async () => {
    console.log('🚀 Service Worker - Installed');
    await loadAuthState();
});

// =============================================================================
// MESSAGES
// =============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Message:', message.type);

    switch (message.type) {
        case 'GET_AUTH':
            sendResponse({
                isAuthenticated: authState.isAuthenticated,
                token: authState.jwtToken,
                user: authState.user
            });
            return false;

        case 'LOGIN':
            handleLogin(sendResponse);
            return true; // Async

        case 'LOGOUT':
            handleLogout(sendResponse);
            return true; // Async

        case 'VALIDATE_TOKEN':
            validateToken().then(() => {
                sendResponse({
                    isAuthenticated: authState.isAuthenticated,
                    user: authState.user
                });
            });
            return true; // Async

        default:
            sendResponse({ success: false, error: 'Unknown message type' });
            return false;
    }
});

// =============================================================================
// AUTHENTIFICATION
// =============================================================================

async function loadAuthState() {
    try {
        const stored = await chrome.storage.local.get(['jwtToken', 'user']);

        if (stored.jwtToken && stored.user) {
            authState = {
                isAuthenticated: true,
                jwtToken: stored.jwtToken,
                user: stored.user
            };
            console.log('✅ Auth chargée:', stored.user.email);

            // Valider le token
            await validateToken();
        } else {
            console.log('🔍 Pas d\'auth');
            authState.isAuthenticated = false;
        }
    } catch (error) {
        console.error('❌ Load auth error:', error);
        authState.isAuthenticated = false;
    }
}

async function handleLogin(sendResponse) {
    try {
        console.log('🔐 Login...');

        const authUrl = `${CONFIG.backendUrl}/auth/extension`;

        chrome.tabs.create({ url: authUrl, active: true }, (authTab) => {
            let completed = false;

            const listener = (tabId, changeInfo) => {
                if (tabId !== authTab.id || completed || !changeInfo.url) return;

                const url = changeInfo.url;

                // Success: /auth/success?token=xxx&user=yyy
                if (url.includes('/auth/success')) {
                    completed = true;

                    try {
                        const urlObj = new URL(url);
                        const token = urlObj.searchParams.get('token');
                        const userStr = urlObj.searchParams.get('user');

                        if (token && userStr) {
                            const user = JSON.parse(decodeURIComponent(userStr));

                            saveAuthState(token, user).then(() => {
                                chrome.tabs.onUpdated.removeListener(listener);
                                chrome.tabs.remove(authTab.id).catch(() => {});

                                sendResponse({
                                    success: true,
                                    token,
                                    user
                                });
                            });
                        } else {
                            throw new Error('Token/user manquants');
                        }
                    } catch (error) {
                        console.error('❌ Parse error:', error);
                        chrome.tabs.onUpdated.removeListener(listener);
                        chrome.tabs.remove(authTab.id).catch(() => {});

                        sendResponse({
                            success: false,
                            error: 'Erreur de traitement'
                        });
                    }
                }

                // Error: /auth/error?error=xxx
                if (url.includes('/auth/error') || url.includes('error=')) {
                    completed = true;

                    const urlObj = new URL(url);
                    const error = urlObj.searchParams.get('error') || 'Erreur OAuth';

                    console.error('❌ OAuth error:', error);
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.remove(authTab.id).catch(() => {});

                    sendResponse({
                        success: false,
                        error
                    });
                }
            };

            chrome.tabs.onUpdated.addListener(listener);

            // Timeout
            setTimeout(() => {
                if (!completed) {
                    completed = true;
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.remove(authTab.id).catch(() => {});

                    sendResponse({
                        success: false,
                        error: 'Timeout'
                    });
                }
            }, CONFIG.authTimeout);
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

async function handleLogout(sendResponse) {
    try {
        console.log('🚪 Logout');

        await chrome.storage.local.remove(['jwtToken', 'user']);

        authState = {
            isAuthenticated: false,
            jwtToken: null,
            user: null
        };

        sendResponse({ success: true });

    } catch (error) {
        console.error('❌ Logout error:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

async function saveAuthState(token, user) {
    try {
        await chrome.storage.local.set({ jwtToken: token, user });

        authState = {
            isAuthenticated: true,
            jwtToken: token,
            user
        };

        console.log('💾 Auth sauvegardée:', user.email);
    } catch (error) {
        console.error('❌ Save auth error:', error);
        throw error;
    }
}

async function validateToken() {
    if (!authState.jwtToken) {
        authState.isAuthenticated = false;
        return;
    }

    try {
        console.log('🔍 Validation token...');

        const response = await fetch(`${CONFIG.backendUrl}/api/user/me`, {
            headers: {
                'Authorization': `Bearer ${authState.jwtToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            authState.user = data.user;
            authState.isAuthenticated = true;
            console.log('✅ Token valide:', data.user.email);

            // Mettre à jour le storage
            await chrome.storage.local.set({ user: data.user });
        } else {
            console.warn('⚠️ Token invalide');
            await handleLogout(() => {});
        }
    } catch (error) {
        console.error('❌ Validate error:', error);
        // Ne pas déconnecter automatiquement en cas d'erreur réseau
    }
}

// =============================================================================
// VALIDATION PÉRIODIQUE
// =============================================================================

setInterval(async () => {
    if (authState.isAuthenticated) {
        console.log('🔄 Validation périodique');
        await validateToken();
    }
}, 30 * 60 * 1000); // 30 minutes

console.log('🎯 Service Worker V2 initialisé');
