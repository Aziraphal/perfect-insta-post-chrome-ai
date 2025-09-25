// Système hybride Chrome AI + Backend pour Perfect Insta Post
// Priorité aux APIs Chrome Built-in AI avec fallback vers backend

class HybridAISystem {
    constructor() {
        this.chromeAI = window.chromeAI;
        this.backendURL = 'https://perfect-insta-extension-production.up.railway.app';
        this.preferLocalAI = true; // Préférer Chrome AI quand disponible
        this.initializeSystem();
    }

    async initializeSystem() {
        // Attendre que Chrome AI soit initialisé
        if (this.chromeAI) {
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (this.chromeAI.capabilities) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });

            const status = this.chromeAI.getCapabilitiesStatus();
            console.log('🚀 Système hybride initialisé:', status);

            // Afficher le statut dans l'interface
            this.updateUIStatus(status);
        }
    }

    // Générer un post complet (méthode principale)
    async generatePost(imageFile, options = {}) {
        try {
            console.log('🎯 Génération de post avec options:', options);

            // Étape 1: Analyser l'image
            const imageAnalysis = await this.analyzeImage(imageFile, options);

            if (!imageAnalysis.success) {
                throw new Error('Échec de l\'analyse d\'image');
            }

            // Étape 2: Générer la légende
            const captionResult = await this.generateCaption(imageAnalysis, options);

            if (!captionResult.success) {
                throw new Error('Échec de la génération de légende');
            }

            // Retourner le résultat complet
            return {
                success: true,
                caption: captionResult.caption,
                hashtags: captionResult.hashtags || [],
                suggestions: captionResult.suggestions || [],
                source: captionResult.source,
                analysis: imageAnalysis.analysis
            };

        } catch (error) {
            console.error('❌ Erreur génération de post:', error);
            return {
                success: false,
                error: error.message,
                source: 'error'
            };
        }
    }

    // Analyser l'image (Chrome AI puis fallback backend)
    async analyzeImage(imageFile, options = {}) {
        // Essayer Chrome AI d'abord
        if (this.preferLocalAI && this.chromeAI?.capabilities.promptAPI) {
            console.log('🤖 Utilisation de Chrome AI pour l\'analyse');
            const result = await this.chromeAI.analyzeImage(imageFile, options);

            if (result.success && !result.requiresBackend) {
                return result;
            }
        }

        // Fallback vers backend
        console.log('📡 Utilisation du backend pour l\'analyse');
        return this.analyzeImageBackend(imageFile, options);
    }

    // Générer la légende (Chrome AI puis fallback backend)
    async generateCaption(imageAnalysis, options = {}) {
        // Essayer Chrome AI d'abord
        if (this.preferLocalAI && this.chromeAI?.capabilities.writerAPI) {
            console.log('✍️ Utilisation de Chrome AI pour la génération');
            const result = await this.chromeAI.generateCaption(imageAnalysis.analysis, options);

            if (result.success && !result.requiresBackend) {
                return result;
            }
        }

        // Fallback vers backend
        console.log('📡 Utilisation du backend pour la génération');
        return this.generateCaptionBackend(imageAnalysis, options);
    }

    // Réécrire une légende (Chrome AI puis fallback backend)
    async rewriteCaption(originalCaption, style = 'more-engaging') {
        // Essayer Chrome AI d'abord
        if (this.preferLocalAI && this.chromeAI?.capabilities.rewriterAPI) {
            console.log('🔄 Utilisation de Chrome AI pour la réécriture');
            const result = await this.chromeAI.rewriteCaption(originalCaption, style);

            if (result.success && !result.requiresBackend) {
                return result;
            }
        }

        // Fallback vers backend
        console.log('📡 Utilisation du backend pour la réécriture');
        return this.rewriteCaptionBackend(originalCaption, style);
    }

    // === MÉTHODES BACKEND (fallback) ===

    async analyzeImageBackend(imageFile, options = {}) {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('options', JSON.stringify(options));

            const response = await fetch(`${this.backendURL}/api/analyze-image`, {
                method: 'POST',
                body: formData,
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const result = await response.json();
            return {
                success: true,
                analysis: result.analysis,
                source: 'backend'
            };

        } catch (error) {
            console.error('❌ Erreur backend analyse:', error);
            return {
                success: false,
                error: error.message,
                source: 'backend-error'
            };
        }
    }

    async generateCaptionBackend(imageAnalysis, options = {}) {
        try {
            const response = await fetch(`${this.backendURL}/api/generate-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({
                    analysis: imageAnalysis.analysis,
                    options: options
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const result = await response.json();
            return {
                success: true,
                caption: result.caption,
                hashtags: result.hashtags,
                suggestions: result.suggestions,
                source: 'backend'
            };

        } catch (error) {
            console.error('❌ Erreur backend génération:', error);
            return {
                success: false,
                error: error.message,
                source: 'backend-error'
            };
        }
    }

    async rewriteCaptionBackend(originalCaption, style) {
        try {
            const response = await fetch(`${this.backendURL}/api/rewrite-caption`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({
                    caption: originalCaption,
                    style: style
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const result = await response.json();
            return {
                success: true,
                content: result.rewritten_caption,
                source: 'backend',
                style: style
            };

        } catch (error) {
            console.error('❌ Erreur backend réécriture:', error);
            return {
                success: false,
                error: error.message,
                source: 'backend-error'
            };
        }
    }

    // Obtenir les headers d'authentification
    getAuthHeaders() {
        // Cette fonction sera complétée avec votre système d'auth existant
        const headers = {};

        // Ajouter token si disponible
        const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        return headers;
    }

    // Mettre à jour le statut dans l'interface
    updateUIStatus(capabilities) {
        const statusElement = document.getElementById('aiStatus');
        if (!statusElement) return;

        const hasLocalAI = capabilities.hasAny;
        const statusHTML = `
            <div class="ai-status ${hasLocalAI ? 'local' : 'cloud'}">
                <span class="status-icon">${hasLocalAI ? '🤖' : '☁️'}</span>
                <span class="status-text">
                    ${hasLocalAI ? 'IA locale disponible' : 'IA cloud uniquement'}
                </span>
            </div>
        `;

        statusElement.innerHTML = statusHTML;
    }

    // Basculer la préférence IA locale/cloud
    toggleAIPreference() {
        this.preferLocalAI = !this.preferLocalAI;
        console.log('🔄 Préférence IA:', this.preferLocalAI ? 'Locale' : 'Cloud');

        // Sauvegarder la préférence
        localStorage.setItem('preferLocalAI', this.preferLocalAI.toString());

        // Mettre à jour l'interface
        this.updatePreferenceUI();
    }

    // Mettre à jour l'interface de préférence
    updatePreferenceUI() {
        const toggleElement = document.getElementById('aiToggle');
        if (toggleElement) {
            toggleElement.checked = this.preferLocalAI;
        }
    }

    // Obtenir des statistiques d'utilisation
    getUsageStats() {
        return {
            preferLocalAI: this.preferLocalAI,
            capabilities: this.chromeAI?.getCapabilitiesStatus() || { hasAny: false },
            backendURL: this.backendURL
        };
    }

    // Nettoyer les ressources
    async cleanup() {
        if (this.chromeAI) {
            await this.chromeAI.cleanup();
        }
    }
}

// Initialiser le système hybride
if (typeof window !== 'undefined') {
    // Attendre que chrome-ai.js soit chargé
    const initHybridSystem = () => {
        if (window.chromeAI) {
            window.hybridAI = new HybridAISystem();
            console.log('🔗 Système hybride initialisé');
        } else {
            setTimeout(initHybridSystem, 100);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHybridSystem);
    } else {
        initHybridSystem();
    }

    // Nettoyer au déchargement
    window.addEventListener('beforeunload', () => {
        if (window.hybridAI) {
            window.hybridAI.cleanup();
        }
    });
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridAISystem;
}