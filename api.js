// =============================================================================
// API MODULE - Centralisation de tous les appels backend
// =============================================================================

const API_BASE_URL = 'https://perfect-insta-extension-production.up.railway.app';

class APIClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.token = null;
    }

    /**
     * Définir le token d'authentification
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * Headers par défaut pour toutes les requêtes
     */
    getHeaders(includeContentType = true) {
        const headers = {};

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (includeContentType) {
            headers['Content-Type'] = 'application/json';
        }

        return headers;
    }

    /**
     * Générer un post Instagram à partir d'une image
     * @param {File} imageFile - Fichier image
     * @param {Object} options - Options de génération (postType, tone, etc.)
     * @returns {Promise<Object>} Résultat avec caption, hashtags, suggestions
     */
    async generatePost(imageFile, options = {}) {
        try {
            console.log('📡 API.generatePost:', options);

            // Préparer FormData
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('postType', options.postType || 'lifestyle');
            formData.append('tone', options.tone || 'casual');

            // Ajouter options avancées si présentes
            if (options.location) formData.append('location', options.location);
            if (options.context) formData.append('context', options.context);
            if (options.captionLength) formData.append('captionLength', options.captionLength);
            if (options.captionStyle) formData.append('captionStyle', options.captionStyle);

            const response = await fetch(`${this.baseUrl}/api/generate-post`, {
                method: 'POST',
                headers: this.getHeaders(false), // Pas de Content-Type pour FormData
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            return {
                success: true,
                caption: result.caption || '',
                hashtags: result.hashtags || [],
                suggestions: result.suggestions || [],
                ...result
            };

        } catch (error) {
            console.error('❌ API.generatePost error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Réécrire une légende existante
     * @param {string} caption - Légende à réécrire
     * @param {string} style - Style de réécriture
     * @returns {Promise<Object>} Nouvelle légende
     */
    async rewriteCaption(caption, style = 'casual') {
        try {
            console.log('📡 API.rewriteCaption:', style);

            const response = await fetch(`${this.baseUrl}/api/rewrite-caption`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ caption, style })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();

            return {
                success: true,
                caption: result.caption || caption,
                ...result
            };

        } catch (error) {
            console.error('❌ API.rewriteCaption error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Récupérer les informations utilisateur
     * @returns {Promise<Object>} User data
     */
    async getUserInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/api/user/me`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            return {
                success: true,
                user: result.user
            };

        } catch (error) {
            console.error('❌ API.getUserInfo error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Récupérer l'historique des posts
     * @param {number} limit - Nombre de posts à récupérer
     * @returns {Promise<Object>} Liste des posts
     */
    async getHistory(limit = 10) {
        try {
            const response = await fetch(`${this.baseUrl}/api/history?limit=${limit}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            return {
                success: true,
                posts: result.posts || []
            };

        } catch (error) {
            console.error('❌ API.getHistory error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Créer une session de paiement Stripe
     * @returns {Promise<Object>} URL de checkout Stripe
     */
    async createCheckoutSession() {
        try {
            const response = await fetch(`${this.baseUrl}/api/create-checkout-session`, {
                method: 'POST',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();

            return {
                success: true,
                url: result.url
            };

        } catch (error) {
            console.error('❌ API.createCheckoutSession error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Exporter une instance unique (singleton)
export const API = new APIClient();

console.log('📦 api.js chargé');
