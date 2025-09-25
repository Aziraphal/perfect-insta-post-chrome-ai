// =============================================================================
// PERFECT INSTA POST - POPUP (NOUVELLE VERSION AVEC SERVICE WORKER)
// Interface utilisateur qui communique avec background.js
// =============================================================================

// Configuration et constantes
const CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    backend: {
        baseUrl: 'https://perfect-insta-extension-production.up.railway.app',
        endpoints: {
            generatePost: '/api/generate-post'
        }
    }
};

// État global de l'application
const AppState = {
    currentImage: null,
    auth: {
        isAuthenticated: false,
        jwtToken: null,
        user: null
    }
};

// Éléments DOM
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    imageInput: document.getElementById('imageInput'),
    previewImage: document.getElementById('previewImage'),
    configSection: document.getElementById('configSection'),
    resultsSection: document.getElementById('resultsSection'),
    authSection: document.getElementById('authSection'),
    postType: document.getElementById('postType'),
    tone: document.getElementById('tone'),
    location: document.getElementById('location'),
    context: document.getElementById('context'),
    captionLength: document.getElementById('captionLength'),
    captionStyle: document.getElementById('captionStyle'),
    generateBtn: document.getElementById('generateBtn'),
    generatedCaption: document.getElementById('generatedCaption'),
    hashtagsContainer: document.getElementById('hashtagsContainer'),
    suggestionsList: document.getElementById('suggestionsList'),
    copyBtn: document.getElementById('copyBtn'),
    rewriteBtn: document.getElementById('rewriteBtn'),
    newPostBtn: document.getElementById('newPostBtn'),
    // Éléments d'authentification
    googleLoginBtn: document.getElementById('googleLoginBtn'),
    userBar: document.getElementById('userBar'),
    userEmail: document.getElementById('userEmail'),
    userPlan: document.getElementById('userPlan'),
    usageText: document.getElementById('usageText'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    logoutBtn: document.getElementById('logoutBtn')
};

// =============================================================================
// INITIALISATION DE L'APPLICATION
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Perfect Insta Post - Initialisation');

    try {
        // Charger l'état d'authentification depuis le service worker
        await loadAuthenticationState();

        // Initialiser l'interface selon l'état d'auth
        updateUI();

        // Configuration des event listeners
        setupEventListeners();

        console.log('✅ Application initialisée avec succès');

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur lors de l\'initialisation de l\'extension', 'error');
    }
});

// =============================================================================
// GESTION DE L'AUTHENTIFICATION
// =============================================================================

// Charger l'état d'authentification depuis le service worker
async function loadAuthenticationState() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });

        AppState.auth.isAuthenticated = response.isAuthenticated;
        AppState.auth.jwtToken = response.token;
        AppState.auth.user = response.user;

        if (response.isAuthenticated) {
            console.log('✅ Utilisateur authentifié:', response.user.email);
        } else {
            console.log('🔍 Utilisateur non authentifié');
        }
    } catch (error) {
        console.error('❌ Erreur chargement auth state:', error);
        AppState.auth.isAuthenticated = false;
    }
}

// Connexion Google OAuth
async function loginWithGoogle() {
    try {
        console.log('🔐 Démarrage de la connexion...');

        // Désactiver le bouton pendant le processus
        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.disabled = true;
            elements.googleLoginBtn.textContent = 'Connexion en cours...';
        }

        const response = await chrome.runtime.sendMessage({ type: 'LOGIN' });

        if (response.success) {
            console.log('✅ Connexion réussie');

            // Mettre à jour l'état local
            AppState.auth.isAuthenticated = true;
            AppState.auth.jwtToken = response.token;
            AppState.auth.user = response.user;

            // Mettre à jour l'interface
            updateUI();

            showNotification(`Connexion réussie ! Bienvenue ${response.user.email}`, 'success');
        } else {
            console.error('❌ Erreur de connexion:', response.error);
            showNotification('Erreur lors de la connexion: ' + response.error, 'error');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la connexion:', error);
        showNotification('Erreur lors de la connexion', 'error');
    } finally {
        // Réactiver le bouton
        if (elements.googleLoginBtn) {
            elements.googleLoginBtn.disabled = false;
            elements.googleLoginBtn.textContent = 'Se connecter avec Google';
        }
    }
}

// Déconnexion
async function logout() {
    try {
        console.log('🚪 Déconnexion...');

        const response = await chrome.runtime.sendMessage({ type: 'LOGOUT' });

        if (response.success) {
            // Mettre à jour l'état local
            AppState.auth.isAuthenticated = false;
            AppState.auth.jwtToken = null;
            AppState.auth.user = null;

            // Mettre à jour l'interface
            updateUI();

            console.log('✅ Déconnexion réussie');
        } else {
            console.error('❌ Erreur déconnexion:', response.error);
            showNotification('Erreur lors de la déconnexion', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);
        showNotification('Erreur lors de la déconnexion', 'error');
    }
}

// =============================================================================
// GESTION DE L'INTERFACE UTILISATEUR
// =============================================================================

function updateUI() {
    if (AppState.auth.isAuthenticated) {
        updateUIForAuthenticatedUser();
    } else {
        updateUIForUnauthenticatedUser();
    }
}

function updateUIForAuthenticatedUser() {
    console.log('🎨 UI: Utilisateur connecté');

    // Masquer la section d'authentification
    hideSection('authSection');

    // Afficher la barre utilisateur
    if (elements.userBar) {
        elements.userBar.hidden = false;
        elements.userEmail.textContent = AppState.auth.user.email;
        elements.userPlan.textContent = AppState.auth.user.plan.toUpperCase();
        elements.usageText.textContent = `${AppState.auth.user.postsThisMonth}/${AppState.auth.user.plan === 'free' ? 5 : 50} posts ce mois`;

        // Afficher/masquer le bouton d'upgrade
        if (AppState.auth.user.plan === 'free') {
            elements.upgradeBtn.hidden = false;
        } else {
            elements.upgradeBtn.hidden = true;
        }
    }

    // Permettre l'upload d'images
    if (elements.uploadArea) {
        elements.uploadArea.style.pointerEvents = 'auto';
        elements.uploadArea.style.opacity = '1';
    }

    // Gérer les fonctionnalités Pro
    updateProFeatures();
}

function updateProFeatures() {
    const isPro = AppState.auth.user && AppState.auth.user.plan === 'pro';
    console.log('🎯 Mise à jour Pro features, plan:', AppState.auth.user?.plan);

    // Gérer l'overlay Pro principal
    const mainProOverlay = document.getElementById('proOverlay');
    if (mainProOverlay) {
        mainProOverlay.hidden = isPro; // Masquer si utilisateur Pro
    }

    // Éléments des fonctionnalités Pro
    const proFields = ['location', 'context', 'captionLength', 'captionStyle'];

    proFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        const container = field?.closest('.form-group');

        if (container) {
            if (isPro) {
                // Activer pour les utilisateurs Pro
                container.classList.remove('pro-disabled');
                field.disabled = false;
                field.style.opacity = '1';
                field.style.pointerEvents = 'auto';

                // Supprimer les overlays individuels s'ils existent
                const existingOverlay = container.querySelector('.pro-overlay:not(#proOverlay)');
                if (existingOverlay) {
                    existingOverlay.remove();
                }
            } else {
                // Désactiver pour les utilisateurs Free
                container.classList.add('pro-disabled');
                field.disabled = true;
                field.style.opacity = '0.5';
                field.style.pointerEvents = 'none';

                // Ajouter overlay Pro si pas présent
                if (!container.querySelector('.pro-overlay:not(#proOverlay)')) {
                    const overlay = document.createElement('div');
                    overlay.className = 'pro-overlay';
                    overlay.innerHTML = `
                        <div class="pro-badge">PRO</div>
                        <small>Fonctionnalité Pro</small>
                    `;
                    overlay.addEventListener('click', showUpgradeModal);
                    container.style.position = 'relative';
                    container.appendChild(overlay);
                }
            }
        }
    });

    // Afficher message de bienvenue Pro
    const proWelcome = document.querySelector('.pro-welcome');
    if (proWelcome) {
        proWelcome.hidden = !isPro;
    }
}

function showUpgradeModal() {
    alert('Cette fonctionnalité est réservée aux utilisateurs Pro. Passez à Pro pour 19€/mois pour débloquer toutes les options avancées !');
    // TODO: Implémenter un vrai modal stylé
}


function updateUIForUnauthenticatedUser() {
    console.log('🎨 UI: Utilisateur non connecté');

    // Masquer la barre utilisateur
    if (elements.userBar) {
        elements.userBar.hidden = true;
    }

    // Afficher la section d'authentification
    showSection('authSection');

    // Désactiver l'upload d'images
    if (elements.uploadArea) {
        elements.uploadArea.style.pointerEvents = 'none';
        elements.uploadArea.style.opacity = '0.5';
    }

    // Masquer les autres sections
    hideSection('configSection');
    hideSection('resultsSection');
}

function showSection(sectionId) {
    if (elements[sectionId]) {
        elements[sectionId].hidden = false;
    }
}

function hideSection(sectionId) {
    if (elements[sectionId]) {
        elements[sectionId].hidden = true;
    }
}

// =============================================================================
// GESTION DES IMAGES
// =============================================================================

function handleImageUpload(file) {
    if (!AppState.auth.isAuthenticated) {
        showNotification('Veuillez vous connecter pour uploader une image', 'error');
        return;
    }

    // Vérifications
    if (!CONFIG.supportedFormats.includes(file.type)) {
        showNotification('Format non supporté. Utilisez JPG, PNG ou WebP.', 'error');
        return;
    }

    if (file.size > CONFIG.maxFileSize) {
        showNotification('Fichier trop volumineux. Maximum 10MB.', 'error');
        return;
    }

    AppState.currentImage = file;

    // Prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImage.src = e.target.result;
        elements.previewImage.hidden = false;
        elements.uploadArea.querySelector('.upload-placeholder').style.display = 'none';
        elements.uploadArea.classList.add('has-image');

        // Agrandir le popup et afficher la config
        document.body.classList.add('expanded');
        showSection('configSection');

        console.log('✅ Image uploadée:', file.name);
    };
    reader.readAsDataURL(file);
}

// =============================================================================
// GÉNÉRATION DE POST
// =============================================================================

async function generatePost() {
    try {
        // Vérifications préalables
        if (!AppState.currentImage) {
            showNotification('Veuillez d\'abord uploader une image', 'error');
            return;
        }

        if (!AppState.auth.isAuthenticated) {
            showNotification('Veuillez vous connecter pour générer un post', 'error');
            return;
        }

        setLoading(true);

        // Préparer la configuration selon le plan de l'utilisateur
        const isPro = AppState.auth.user.plan === 'pro';
        const config = {
            postType: elements.postType.value,
            tone: elements.tone.value,
            // Fonctionnalités Pro uniquement si l'utilisateur est Pro
            location: isPro ? elements.location.value : '',
            context: isPro ? elements.context.value : '',
            captionLength: isPro ? elements.captionLength.value : 'moyenne',
            captionStyle: isPro ? elements.captionStyle.value : 'naturel'
        };


        // Utiliser le système hybride Chrome AI + Backend
        console.log('🤖 Génération avec système hybride');

        const content = await generatePostHybrid(AppState.currentImage, config);

        // Afficher les résultats
        displayResults(content);

        // Afficher la section des résultats
        showSection('resultsSection');

        console.log('✅ Post généré avec succès');

    } catch (error) {
        console.error('❌ Erreur génération:', error);

        if (error.message.includes('Token') || error.message.includes('Session')) {
            showNotification('Session expirée, veuillez vous reconnecter', 'error');
            await logout();
        } else if (error.message.includes('Quota')) {
            showNotification('Quota de posts atteint. Passez à Pro pour plus de posts !', 'error');
        } else {
            showNotification('Erreur lors de la génération: ' + error.message, 'error');
        }
    } finally {
        setLoading(false);
    }
}

// Générer un post avec le système hybride Chrome AI + Backend
async function generatePostHybrid(imageFile, config) {
    try {
        // Vérifier si le système hybride est disponible
        if (!window.hybridAI) {
            console.warn('⚠️ Système hybride non disponible, fallback vers backend');
            const imageData = await getImageAsBase64(imageFile);
            return await generatePostWithBackend(imageData, config);
        }

        // Utiliser le système hybride
        console.log('🤖 Utilisation du système hybride');
        const result = await window.hybridAI.generatePost(imageFile, config);

        if (!result.success) {
            throw new Error(result.error || 'Erreur génération hybride');
        }

        // Formater selon le format attendu par l'interface
        return {
            caption: result.caption,
            hashtags: result.hashtags || [],
            suggestions: result.suggestions || [
                'Votre post a été généré avec l\'IA locale pour une meilleure confidentialité',
                'Essayez le bouton "Réécrire" pour des variations',
                'Adaptez le contenu selon votre style personnel'
            ]
        };

    } catch (error) {
        console.error('❌ Erreur système hybride, fallback vers backend:', error);
        const imageData = await getImageAsBase64(imageFile);
        return await generatePostWithBackend(imageData, config);
    }
}

// Générer un post avec authentification backend
async function generatePostWithBackend(imageData, config) {
    if (!AppState.auth.isAuthenticated) {
        throw new Error('Utilisateur non authentifié');
    }

    try {
        const response = await fetch(`${CONFIG.backend.baseUrl}${CONFIG.backend.endpoints.generatePost}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AppState.auth.jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageData: imageData,
                config: config
            })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('Session expirée, veuillez vous reconnecter');
            }
            throw new Error(`Erreur backend: ${response.statusText}`);
        }

        const data = await response.json();

        // Mettre à jour le compteur d'usage
        if (data.user) {
            AppState.auth.user = data.user;
            elements.usageText.textContent = `${data.user.postsThisMonth}/${data.user.plan === 'free' ? 5 : 50} posts ce mois`;
        }

        return data.content;

    } catch (error) {
        console.error('❌ Erreur génération backend:', error);
        throw error;
    }
}

// Convertir l'image en base64
function getImageAsBase64(imageFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
    });
}

// Affichage des résultats
function displayResults(content) {
    // Légende
    elements.generatedCaption.value = content.caption;

    // Hashtags
    elements.hashtagsContainer.innerHTML = '';
    content.hashtags.forEach(hashtag => {
        const hashtagElement = document.createElement('span');
        hashtagElement.className = 'hashtag';
        const cleanHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
        hashtagElement.textContent = cleanHashtag;
        elements.hashtagsContainer.appendChild(hashtagElement);
    });

    // Suggestions
    elements.suggestionsList.innerHTML = '';
    content.suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        elements.suggestionsList.appendChild(li);
    });
}

// =============================================================================
// ACTIONS UTILISATEUR
// =============================================================================

async function copyToClipboard() {
    const caption = elements.generatedCaption.value;
    const hashtags = Array.from(elements.hashtagsContainer.children)
        .map(span => span.textContent)
        .join(' ');

    const fullText = `${caption}\n\n${hashtags}`;

    try {
        await navigator.clipboard.writeText(fullText);
        elements.copyBtn.textContent = '✅ Copié!';
        elements.copyBtn.classList.add('success');

        setTimeout(() => {
            elements.copyBtn.textContent = '📋 Copier tout';
            elements.copyBtn.classList.remove('success');
        }, 2000);
    } catch (error) {
        showNotification('Erreur lors de la copie', 'error');
    }
}

function resetApp() {
    AppState.currentImage = null;

    elements.imageInput.value = '';
    elements.previewImage.hidden = true;
    elements.previewImage.src = '';
    elements.uploadArea.querySelector('.upload-placeholder').style.display = 'block';
    elements.uploadArea.classList.remove('has-image');

    document.body.classList.remove('expanded');
    hideSection('configSection');
    hideSection('resultsSection');
}

// Réécrire la légende actuelle
async function rewriteCaption() {
    const currentCaption = elements.generatedCaption.value;

    if (!currentCaption) {
        showNotification('Aucune légende à réécrire', 'error');
        return;
    }

    try {
        // Désactiver le bouton temporairement
        const rewriteBtn = document.getElementById('rewriteBtn');
        const originalText = rewriteBtn.textContent;
        rewriteBtn.disabled = true;
        rewriteBtn.textContent = '✨ Réécriture...';

        // Styles de réécriture disponibles
        const styles = ['more-engaging', 'creative', 'professional', 'casual'];
        const randomStyle = styles[Math.floor(Math.random() * styles.length)];

        let newCaption;

        // Essayer Chrome AI d'abord
        if (window.hybridAI && window.hybridAI.chromeAI?.capabilities.rewriterAPI) {
            console.log('🔄 Réécriture avec Chrome AI');
            const result = await window.hybridAI.rewriteCaption(currentCaption, randomStyle);

            if (result.success && !result.requiresBackend) {
                newCaption = result.content;
            }
        }

        // Fallback vers backend si nécessaire
        if (!newCaption) {
            console.log('📡 Réécriture avec backend');
            newCaption = await rewriteCaptionBackend(currentCaption, randomStyle);
        }

        // Mettre à jour la légende
        elements.generatedCaption.value = newCaption;

        // Animation de mise à jour
        elements.generatedCaption.style.background = 'rgba(156, 39, 176, 0.1)';
        setTimeout(() => {
            elements.generatedCaption.style.background = '';
        }, 1000);

        // Feedback visuel sur le bouton
        rewriteBtn.textContent = '✅ Réécrit!';
        rewriteBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';

        setTimeout(() => {
            rewriteBtn.textContent = originalText;
            rewriteBtn.style.background = '';
            rewriteBtn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('❌ Erreur réécriture:', error);
        showNotification('Erreur lors de la réécriture: ' + error.message, 'error');

        const rewriteBtn = document.getElementById('rewriteBtn');
        rewriteBtn.textContent = '✨ Réécrire';
        rewriteBtn.disabled = false;
    }
}

// Réécriture via backend (fallback)
async function rewriteCaptionBackend(caption, style) {
    if (!AppState.auth.isAuthenticated) {
        throw new Error('Authentification requise');
    }

    const response = await fetch(`${CONFIG.backend.baseUrl}/api/rewrite-caption`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AppState.auth.jwtToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            caption: caption,
            style: style
        })
    });

    if (!response.ok) {
        throw new Error(`Erreur backend: ${response.statusText}`);
    }

    const data = await response.json();
    return data.rewritten_caption;
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
    // Connexion Google
    if (elements.googleLoginBtn) {
        elements.googleLoginBtn.addEventListener('click', loginWithGoogle);
    }

    // Déconnexion
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', logout);
    }

    // Upload d'image
    if (elements.uploadArea) {
        elements.uploadArea.addEventListener('click', () => {
            if (AppState.auth.isAuthenticated) {
                elements.imageInput.click();
            }
        });

        elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (AppState.auth.isAuthenticated) {
                elements.uploadArea.classList.add('drag-over');
            }
        });

        elements.uploadArea.addEventListener('dragleave', () => {
            elements.uploadArea.classList.remove('drag-over');
        });

        elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.uploadArea.classList.remove('drag-over');

            if (AppState.auth.isAuthenticated && e.dataTransfer.files.length > 0) {
                handleImageUpload(e.dataTransfer.files[0]);
            }
        });
    }

    if (elements.imageInput) {
        elements.imageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
            }
        });
    }

    // Génération de post
    if (elements.generateBtn) {
        elements.generateBtn.addEventListener('click', generatePost);
    }

    // Actions des résultats
    if (elements.copyBtn) {
        elements.copyBtn.addEventListener('click', copyToClipboard);
    }

    if (elements.rewriteBtn) {
        elements.rewriteBtn.addEventListener('click', rewriteCaption);
    }

    if (elements.newPostBtn) {
        elements.newPostBtn.addEventListener('click', resetApp);
    }

    console.log('🔧 Event listeners configurés');
}

// =============================================================================
// UTILITAIRES
// =============================================================================

function setLoading(loading) {
    elements.generateBtn.disabled = loading;
    const btnText = elements.generateBtn.querySelector('.btn-text');
    const loader = elements.generateBtn.querySelector('.loader');

    if (loading) {
        btnText.textContent = '⏳ Génération en cours...';
        if (loader) loader.hidden = false;
    } else {
        btnText.textContent = '✨ Générer le post';
        if (loader) loader.hidden = true;
    }
}

function showNotification(message, type = 'info') {
    // Implémentation simple avec alert pour l'instant
    // TODO: Améliorer avec une notification toast personnalisée
    alert(message);
}

console.log('🎯 Perfect Insta Post popup initialisé');