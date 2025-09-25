// Chrome Built-in AI Integration for Perfect Insta Post
// Utilise Prompt API, Writer API, et Rewriter API avec fallback vers backend

class ChromeAIManager {
    constructor() {
        this.capabilities = {
            promptAPI: false,
            writerAPI: false,
            rewriterAPI: false
        };
        this.sessions = {
            prompt: null,
            writer: null,
            rewriter: null
        };
        this.initializeCapabilities();
    }

    // Vérifier les capacités AI disponibles
    async initializeCapabilities() {
        try {
            // Vérifier Prompt API (pour analyse d'images)
            if (typeof window !== 'undefined' && 'ai' in window && 'languageModel' in window.ai) {
                const availability = await window.ai.languageModel.capabilities();
                this.capabilities.promptAPI = availability.available === 'readily';
                console.log('🤖 Prompt API disponible:', this.capabilities.promptAPI);
            }

            // Vérifier Writer API
            if (typeof window !== 'undefined' && 'ai' in window && 'writer' in window.ai) {
                const availability = await window.ai.writer.capabilities();
                this.capabilities.writerAPI = availability.available === 'readily';
                console.log('✍️ Writer API disponible:', this.capabilities.writerAPI);
            }

            // Vérifier Rewriter API
            if (typeof window !== 'undefined' && 'ai' in window && 'rewriter' in window.ai) {
                const availability = await window.ai.rewriter.capabilities();
                this.capabilities.rewriterAPI = availability.available === 'readily';
                console.log('🔄 Rewriter API disponible:', this.capabilities.rewriterAPI);
            }

        } catch (error) {
            console.log('⚠️ APIs Chrome AI non disponibles:', error);
        }
    }

    // Analyser une image avec Prompt API (multimodal)
    async analyzeImage(imageFile, context = {}) {
        if (!this.capabilities.promptAPI) {
            console.log('📡 Fallback: utilisation de l\'API backend pour l\'analyse d\'image');
            return this.fallbackToBackend('analyze', { imageFile, context });
        }

        try {
            // Créer une session avec support multimodal
            if (!this.sessions.prompt) {
                this.sessions.prompt = await window.ai.languageModel.create({
                    systemPrompt: `Tu es un expert en analyse d'images pour Instagram.
                    Analyse les images et identifie le contenu, l'ambiance, les objets, les personnes,
                    les couleurs dominantes, et le style pour créer des posts Instagram engageants.`,
                    expectedInputs: [{ type: 'image' }]
                });
            }

            // Construire le prompt d'analyse
            const analysisPrompt = this.buildImageAnalysisPrompt(context);

            // Envoyer l'image et le prompt
            const result = await this.sessions.prompt.prompt(analysisPrompt, {
                image: imageFile
            });

            return this.parseImageAnalysis(result);

        } catch (error) {
            console.error('❌ Erreur Prompt API:', error);
            return this.fallbackToBackend('analyze', { imageFile, context });
        }
    }

    // Générer une légende avec Writer API
    async generateCaption(imageAnalysis, options = {}) {
        if (!this.capabilities.writerAPI) {
            console.log('📡 Fallback: utilisation de l\'API backend pour la génération');
            return this.fallbackToBackend('generate', { imageAnalysis, options });
        }

        try {
            // Créer une session Writer
            if (!this.sessions.writer) {
                this.sessions.writer = await window.ai.writer.create({
                    tone: options.tone || 'casual',
                    format: 'plain-text',
                    length: options.captionLength || 'medium'
                });
            }

            // Construire le prompt de génération
            const generationPrompt = this.buildCaptionPrompt(imageAnalysis, options);

            // Générer la légende
            const result = await this.sessions.writer.write(generationPrompt);

            return this.parseCaptionResult(result, imageAnalysis, options);

        } catch (error) {
            console.error('❌ Erreur Writer API:', error);
            return this.fallbackToBackend('generate', { imageAnalysis, options });
        }
    }

    // Réécrire une légende avec Rewriter API
    async rewriteCaption(originalCaption, style = 'more-engaging') {
        if (!this.capabilities.rewriterAPI) {
            console.log('📡 Fallback: utilisation de l\'API backend pour la réécriture');
            return this.fallbackToBackend('rewrite', { originalCaption, style });
        }

        try {
            // Créer une session Rewriter
            if (!this.sessions.rewriter) {
                this.sessions.rewriter = await window.ai.rewriter.create({
                    tone: 'casual',
                    format: 'plain-text'
                });
            }

            // Réécrire selon le style demandé
            const rewriteContext = this.getRewriteContext(style);
            const result = await this.sessions.rewriter.rewrite(
                originalCaption,
                { context: rewriteContext }
            );

            return {
                success: true,
                content: result,
                source: 'chrome-ai',
                style: style
            };

        } catch (error) {
            console.error('❌ Erreur Rewriter API:', error);
            return this.fallbackToBackend('rewrite', { originalCaption, style });
        }
    }

    // Construire le prompt d'analyse d'image
    buildImageAnalysisPrompt(context) {
        const { postType, location, situation } = context;

        return `Analyse cette image pour un post Instagram ${postType || 'lifestyle'}.
        ${location ? `Lieu: ${location}` : ''}
        ${situation ? `Contexte: ${situation}` : ''}

        Identifie:
        1. Le contenu principal (objets, personnes, activités)
        2. L'ambiance et l'émotion
        3. Les couleurs dominantes
        4. Le style photographique
        5. Les éléments remarquables
        6. Les hashtags pertinents possibles

        Réponds en JSON avec ces informations structurées.`;
    }

    // Construire le prompt de génération de légende
    buildCaptionPrompt(imageAnalysis, options) {
        const { tone, postType, captionStyle, location, context: situation } = options;

        return `Crée une légende Instagram engageante basée sur cette analyse d'image:
        ${JSON.stringify(imageAnalysis, null, 2)}

        Paramètres:
        - Type: ${postType || 'lifestyle'}
        - Ton: ${tone || 'décontracté'}
        - Style: ${captionStyle || 'engageant'}
        ${location ? `- Lieu: ${location}` : ''}
        ${situation ? `- Contexte: ${situation}` : ''}

        La légende doit:
        - Être authentique et engageante
        - Inclure un appel à l'action subtil
        - Être adaptée au contenu de l'image
        - Respecter le ton et le style demandés

        Génère uniquement le texte de la légende, sans hashtags.`;
    }

    // Parser le résultat de l'analyse d'image
    parseImageAnalysis(result) {
        try {
            // Essayer de parser en JSON
            const parsed = JSON.parse(result);
            return {
                success: true,
                analysis: parsed,
                source: 'chrome-ai'
            };
        } catch {
            // Si pas JSON, parser le texte
            return {
                success: true,
                analysis: {
                    content: result,
                    mainSubject: 'Contenu détecté',
                    mood: 'Positive',
                    colors: ['Variées'],
                    style: 'Naturel'
                },
                source: 'chrome-ai'
            };
        }
    }

    // Parser le résultat de génération de légende
    parseCaptionResult(result, imageAnalysis, options) {
        // Générer des hashtags basiques basés sur l'analyse
        const hashtags = this.generateHashtags(imageAnalysis, options);

        return {
            success: true,
            caption: result.trim(),
            hashtags: hashtags,
            suggestions: [
                'Essayez de varier le style avec le bouton de réécriture',
                'Ajoutez votre touche personnelle',
                'Pensez à adapter selon votre audience'
            ],
            source: 'chrome-ai'
        };
    }

    // Générer des hashtags basiques
    generateHashtags(imageAnalysis, options) {
        const baseHashtags = ['#instagram', '#photography'];

        if (options.postType) {
            switch (options.postType) {
                case 'food':
                    baseHashtags.push('#food', '#foodie', '#delicious');
                    break;
                case 'travel':
                    baseHashtags.push('#travel', '#adventure', '#explore');
                    break;
                case 'fashion':
                    baseHashtags.push('#fashion', '#style', '#ootd');
                    break;
                case 'lifestyle':
                    baseHashtags.push('#lifestyle', '#daily', '#moments');
                    break;
                default:
                    baseHashtags.push('#life', '#moments');
            }
        }

        if (options.location) {
            // Ajouter des hashtags de localisation basiques
            const locationTag = options.location.toLowerCase().replace(/\s+/g, '');
            baseHashtags.push(`#${locationTag}`);
        }

        return baseHashtags.slice(0, 10); // Limiter à 10 hashtags
    }

    // Obtenir le contexte de réécriture
    getRewriteContext(style) {
        const contexts = {
            'more-engaging': 'Rend ce texte plus engageant et accrocheur',
            'professional': 'Reformule dans un ton plus professionnel',
            'casual': 'Simplifie et rend plus décontracté',
            'creative': 'Ajoute plus de créativité et d\'originalité',
            'shorter': 'Raccourcis tout en gardant l\'essentiel',
            'longer': 'Développe et enrichis le contenu'
        };
        return contexts[style] || contexts['more-engaging'];
    }

    // Fallback vers l'API backend
    async fallbackToBackend(action, data) {
        console.log(`📡 Utilisation de l'API backend pour: ${action}`);

        // Cette fonction sera appelée par le système existant
        // Retourner un format cohérent pour indiquer le fallback
        return {
            success: true,
            requiresBackend: true,
            action: action,
            data: data,
            source: 'backend-required'
        };
    }

    // Nettoyer les sessions
    async cleanup() {
        try {
            if (this.sessions.prompt) {
                await this.sessions.prompt.destroy();
                this.sessions.prompt = null;
            }
            if (this.sessions.writer) {
                await this.sessions.writer.destroy();
                this.sessions.writer = null;
            }
            if (this.sessions.rewriter) {
                await this.sessions.rewriter.destroy();
                this.sessions.rewriter = null;
            }
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
        }
    }

    // Vérifier si au moins une API est disponible
    hasAnyCapability() {
        return Object.values(this.capabilities).some(Boolean);
    }

    // Obtenir le statut des capacités
    getCapabilitiesStatus() {
        return {
            ...this.capabilities,
            hasAny: this.hasAnyCapability()
        };
    }
}

// Initialiser le manager AI
if (typeof window !== 'undefined') {
    window.chromeAI = new ChromeAIManager();

    // Nettoyer au déchargement de la page
    window.addEventListener('beforeunload', () => {
        if (window.chromeAI) {
            window.chromeAI.cleanup();
        }
    });
}

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChromeAIManager;
}