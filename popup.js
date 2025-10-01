// =============================================================================
// PERFECT INSTA POST - VERSION 2.0 (CLEAN & PERFORMANT)
// Architecture simplifiée : popup.js → api.js → backend
// =============================================================================

import { API } from './api.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    maxImageSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    defaultOptions: {
        postType: 'lifestyle',
        tone: 'casual'
    }
};

// =============================================================================
// ÉTAT GLOBAL
// =============================================================================

const State = {
    auth: {
        isAuthenticated: false,
        token: null,
        user: null
    },
    currentImage: null,
    currentFile: null,
    result: null
};

// =============================================================================
// ÉLÉMENTS DOM
// =============================================================================

const DOM = {
    // Auth
    authSection: null,
    googleLoginBtn: null,
    userBar: null,
    userEmail: null,
    userPlan: null,
    logoutBtn: null,

    // Upload
    uploadArea: null,
    imageInput: null,
    previewImage: null,

    // Config
    configSection: null,
    postTypeSelect: null,
    toneSelect: null,
    locationInput: null,
    contextInput: null,
    generateBtn: null,

    // Results
    resultsSection: null,
    generatedCaption: null,
    hashtagsContainer: null,
    suggestionsList: null,
    copyAllBtn: null,
    copyCaptionBtn: null,
    copyHashtagsBtn: null,
    rewriteBtn: null,
    newPostBtn: null
};

// =============================================================================
// INITIALISATION
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Perfect Insta Post v2.0 - Initialisation');

    // 1. Initialiser les références DOM
    initDOM();

    // 2. Charger l'authentification
    await loadAuth();

    // 3. Configurer les event listeners
    setupListeners();

    // 4. Mettre à jour l'UI
    updateUI();

    console.log('✅ Popup initialisé');
});

function initDOM() {
    // Auth
    DOM.authSection = document.getElementById('authSection');
    DOM.googleLoginBtn = document.getElementById('googleLoginBtn');
    DOM.userBar = document.getElementById('userBar');
    DOM.userEmail = document.getElementById('userEmail');
    DOM.userPlan = document.getElementById('userPlan');
    DOM.logoutBtn = document.getElementById('logoutBtn');

    // Upload
    DOM.uploadArea = document.getElementById('uploadArea');
    DOM.imageInput = document.getElementById('imageInput');
    DOM.previewImage = document.getElementById('previewImage');

    // Config
    DOM.configSection = document.getElementById('configSection');
    DOM.postTypeSelect = document.getElementById('postType');
    DOM.toneSelect = document.getElementById('tone');
    DOM.locationInput = document.getElementById('location');
    DOM.contextInput = document.getElementById('context');
    DOM.generateBtn = document.getElementById('generateBtn');

    // Results
    DOM.resultsSection = document.getElementById('resultsSection');
    DOM.generatedCaption = document.getElementById('generatedCaption');
    DOM.hashtagsContainer = document.getElementById('hashtagsContainer');
    DOM.suggestionsList = document.getElementById('suggestionsList');
    DOM.copyAllBtn = document.getElementById('copyAllBtn');
    DOM.copyCaptionBtn = document.getElementById('copyCaptionBtn');
    DOM.copyHashtagsBtn = document.getElementById('copyHashtagsBtn');
    DOM.rewriteBtn = document.getElementById('rewriteBtn');
    DOM.newPostBtn = document.getElementById('newPostBtn');

    // Désactiver le bouton de génération au départ
    if (DOM.generateBtn) {
        DOM.generateBtn.disabled = true;
    }
}

function setupListeners() {
    // Auth
    DOM.googleLoginBtn?.addEventListener('click', handleLogin);
    DOM.logoutBtn?.addEventListener('click', handleLogout);

    // Upload
    DOM.imageInput?.addEventListener('change', handleImageSelect);
    DOM.uploadArea?.addEventListener('click', () => DOM.imageInput?.click());
    DOM.uploadArea?.addEventListener('dragover', handleDragOver);
    DOM.uploadArea?.addEventListener('drop', handleDrop);

    // Generate
    DOM.generateBtn?.addEventListener('click', handleGenerate);

    // Actions
    DOM.copyAllBtn?.addEventListener('click', () => copyToClipboard('all'));
    DOM.copyCaptionBtn?.addEventListener('click', () => copyToClipboard('caption'));
    DOM.copyHashtagsBtn?.addEventListener('click', () => copyToClipboard('hashtags'));
    DOM.rewriteBtn?.addEventListener('click', handleRewrite);
    DOM.newPostBtn?.addEventListener('click', handleReset);
}

// =============================================================================
// AUTHENTIFICATION
// =============================================================================

async function loadAuth() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });

        if (response?.isAuthenticated) {
            State.auth = {
                isAuthenticated: true,
                token: response.token,
                user: response.user
            };
            API.setToken(response.token);
            console.log('✅ Authentifié:', response.user.email);
        }
    } catch (error) {
        console.error('❌ Erreur auth:', error);
    }
}

async function handleLogin() {
    try {
        setButtonLoading(DOM.googleLoginBtn, true, 'Connexion en cours...');

        const response = await chrome.runtime.sendMessage({ type: 'LOGIN' });

        if (response?.success) {
            State.auth = {
                isAuthenticated: true,
                token: response.token,
                user: response.user
            };
            API.setToken(response.token);
            updateUI();
            console.log('✅ Connexion réussie !');
        } else {
            showToast(response.error || 'Erreur de connexion', 'error');
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast('Erreur de connexion', 'error');
    } finally {
        setButtonLoading(DOM.googleLoginBtn, false, 'Se connecter avec Google');
    }
}

async function handleLogout() {
    try {
        await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        State.auth = { isAuthenticated: false, token: null, user: null };
        API.setToken(null);
        updateUI();
        showToast('Déconnecté', 'success');
    } catch (error) {
        console.error('❌ Logout error:', error);
    }
}

// =============================================================================
// UPLOAD D'IMAGE
// =============================================================================

function handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (file) processImage(file);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
}

function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];

    if (file && CONFIG.supportedFormats.includes(file.type)) {
        processImage(file);
    } else {
        showToast('Format non supporté (JPG, PNG, WebP uniquement)', 'error');
    }
}

function processImage(file) {
    // Vérifier la taille
    if (file.size > CONFIG.maxImageSize) {
        showToast('Image trop volumineuse (max 10MB)', 'error');
        return;
    }

    State.currentFile = file;

    // Afficher la prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
        State.currentImage = e.target.result;

        if (DOM.previewImage) {
            DOM.previewImage.src = State.currentImage;
            DOM.previewImage.hidden = false;
        }

        // Activer le bouton
        if (DOM.generateBtn) {
            DOM.generateBtn.disabled = false;
        }

        console.log('✅ Image chargée:', file.name, (file.size / 1024).toFixed(0) + 'KB');
    };
    reader.readAsDataURL(file);
}

// =============================================================================
// GÉNÉRATION DE CONTENU
// =============================================================================

async function handleGenerate() {
    if (!State.currentFile) {
        showToast('Sélectionnez une image', 'error');
        return;
    }

    try {
        setButtonLoading(DOM.generateBtn, true, 'Génération...');

        const options = {
            postType: DOM.postTypeSelect?.value || CONFIG.defaultOptions.postType,
            tone: DOM.toneSelect?.value || CONFIG.defaultOptions.tone,
            location: DOM.locationInput?.value?.trim() || '',
            context: DOM.contextInput?.value?.trim() || ''
        };

        console.log('🎨 Génération avec options:', options);

        // Appel API centralisé
        const result = await API.generatePost(State.currentFile, options);

        if (result.success) {
            State.result = result;
            displayResults(result);
            show(DOM.resultsSection);
            console.log('✅ Généré:', result);
        } else {
            showToast(result.error || 'Erreur de génération', 'error');
        }

    } catch (error) {
        console.error('❌ Generate error:', error);
        showToast('Erreur: ' + error.message, 'error');
    } finally {
        setButtonLoading(DOM.generateBtn, false, '✨ Générer le post');
    }
}

function displayResults(result) {
    // Caption
    if (DOM.generatedCaption) {
        DOM.generatedCaption.value = result.caption || '';
    }

    // Hashtags
    if (DOM.hashtagsContainer && result.hashtags) {
        DOM.hashtagsContainer.innerHTML = '';
        result.hashtags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'hashtag';
            span.textContent = tag.startsWith('#') ? tag : '#' + tag;
            DOM.hashtagsContainer.appendChild(span);
        });
    }

    // Suggestions
    if (DOM.suggestionsList && result.suggestions) {
        DOM.suggestionsList.innerHTML = '';
        result.suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.textContent = suggestion;
            DOM.suggestionsList.appendChild(li);
        });
    }
}

// =============================================================================
// ACTIONS
// =============================================================================

async function handleRewrite() {
    if (!State.result?.caption) {
        showToast('Aucune légende à réécrire', 'error');
        return;
    }

    try {
        setButtonLoading(DOM.rewriteBtn, true, 'Réécriture...');

        const tone = DOM.toneSelect?.value || 'casual';
        const result = await API.rewriteCaption(State.result.caption, tone);

        if (result.success && result.caption) {
            State.result.caption = result.caption;
            if (DOM.generatedCaption) {
                DOM.generatedCaption.value = result.caption;
            }
            showToast('Légende réécrite !', 'success');
        } else {
            showToast('Erreur de réécriture', 'error');
        }

    } catch (error) {
        console.error('❌ Rewrite error:', error);
        showToast('Erreur: ' + error.message, 'error');
    } finally {
        setButtonLoading(DOM.rewriteBtn, false, '✨ Réécrire');
    }
}

function handleReset() {
    State.currentImage = null;
    State.currentFile = null;
    State.result = null;

    if (DOM.imageInput) DOM.imageInput.value = '';
    if (DOM.previewImage) {
        DOM.previewImage.hidden = true;
        DOM.previewImage.src = '';
    }
    if (DOM.generateBtn) DOM.generateBtn.disabled = true;

    hide(DOM.resultsSection);
    console.log('🔄 Reset');
}

// =============================================================================
// COPIE VERS PRESSE-PAPIER
// =============================================================================

function copyToClipboard(type) {
    let text = '';

    switch (type) {
        case 'caption':
            text = DOM.generatedCaption?.value || '';
            break;

        case 'hashtags':
            const hashtags = Array.from(DOM.hashtagsContainer?.children || [])
                .map(el => el.textContent)
                .join(' ');
            text = hashtags;
            break;

        case 'all':
            const caption = DOM.generatedCaption?.value || '';
            const tags = Array.from(DOM.hashtagsContainer?.children || [])
                .map(el => el.textContent)
                .join(' ');
            text = `${caption}\n\n${tags}`;
            break;
    }

    if (!text) {
        showToast('Rien à copier', 'error');
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => showToast('Copié !', 'success'))
        .catch(err => {
            console.error('Copy error:', err);
            showToast('Erreur de copie', 'error');
        });
}

// =============================================================================
// UI HELPERS
// =============================================================================

function updateUI() {
    const isAuth = State.auth.isAuthenticated;

    // Toggle sections
    toggle(DOM.authSection, !isAuth);
    toggle(DOM.uploadArea, isAuth);
    toggle(DOM.configSection, isAuth);
    toggle(DOM.userBar, isAuth);

    // Update user info
    if (isAuth && State.auth.user) {
        if (DOM.userEmail) {
            DOM.userEmail.textContent = State.auth.user.email;
        }
        if (DOM.userPlan) {
            DOM.userPlan.textContent = State.auth.user.plan === 'pro' ? 'Pro' : 'Free';
        }
    }

    console.log('🎨 UI mise à jour');
}

function setButtonLoading(button, isLoading, text) {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = text;
}

function show(element) {
    if (element) element.hidden = false;
}

function hide(element) {
    if (element) element.hidden = true;
}

function toggle(element, visible) {
    if (element) element.hidden = !visible;
}

function showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}]`, message);

    // TODO: Remplacer par un vrai système de toast
    // Pour l'instant, utiliser alert
    if (type === 'error') {
        alert('❌ ' + message);
    } else if (type === 'success') {
        // Ne pas afficher d'alert pour les succès (UX)
        console.log('✅', message);
    } else {
        alert('ℹ️ ' + message);
    }
}

console.log('📦 popup-v2.js chargé');
