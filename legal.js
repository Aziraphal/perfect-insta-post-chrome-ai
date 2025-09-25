// Legal compliance manager for GDPR and privacy features
class LegalManager {
    constructor() {
        this.PRIVACY_POLICY_URL = 'https://perfect-insta-extension-production.up.railway.app/privacy';
        this.TERMS_URL = 'https://perfect-insta-extension-production.up.railway.app/terms';
        this.COOKIES_URL = 'https://perfect-insta-extension-production.up.railway.app/cookies';
        this.GDPR_CONSENT_KEY = 'perfectInsta_gdprConsent';
        this.initElements();
        this.bindEvents();
        this.checkGDPRConsent();
    }

    initElements() {
        // Buttons and elements
        this.privacyBtn = document.getElementById('privacyBtn');
        this.privacyLink = document.getElementById('privacyLink');
        this.termsLink = document.getElementById('termsLink');
        this.cookiesLink = document.getElementById('cookiesLink');

        // Modals and popups
        this.gdprPopup = document.getElementById('gdprPopup');
        this.privacyModal = document.getElementById('privacyModal');

        // GDPR popup elements
        this.gdprAccept = document.getElementById('gdprAccept');
        this.gdprDecline = document.getElementById('gdprDecline');
        this.gdprDetails = document.getElementById('gdprDetails');

        // Modal elements
        this.modalClose = document.getElementById('modalClose');
        this.fullPrivacyPolicy = document.getElementById('fullPrivacyPolicy');
        this.deleteAccount = document.getElementById('deleteAccount');
    }

    bindEvents() {
        // Privacy button and links
        this.privacyBtn?.addEventListener('click', () => this.showPrivacyModal());
        this.privacyLink?.addEventListener('click', () => this.showPrivacyModal());
        this.termsLink?.addEventListener('click', () => this.openExternalLink(this.TERMS_URL));
        this.cookiesLink?.addEventListener('click', () => this.openExternalLink(this.COOKIES_URL));

        // GDPR consent popup
        this.gdprAccept?.addEventListener('click', () => this.acceptGDPR());
        this.gdprDecline?.addEventListener('click', () => this.declineGDPR());
        this.gdprDetails?.addEventListener('click', () => this.openExternalLink(this.PRIVACY_POLICY_URL));

        // Privacy modal
        this.modalClose?.addEventListener('click', () => this.hidePrivacyModal());
        this.fullPrivacyPolicy?.addEventListener('click', () => this.openExternalLink(this.PRIVACY_POLICY_URL));
        this.deleteAccount?.addEventListener('click', () => this.handleAccountDeletion());

        // Close modals on background click
        this.gdprPopup?.addEventListener('click', (e) => {
            if (e.target === this.gdprPopup) {
                this.declineGDPR();
            }
        });

        this.privacyModal?.addEventListener('click', (e) => {
            if (e.target === this.privacyModal) {
                this.hidePrivacyModal();
            }
        });
    }

    checkGDPRConsent() {
        // Check if user has already given consent
        chrome.storage.local.get([this.GDPR_CONSENT_KEY], (result) => {
            const consent = result[this.GDPR_CONSENT_KEY];

            if (!consent || consent.timestamp < Date.now() - (365 * 24 * 60 * 60 * 1000)) {
                // No consent or consent is older than 1 year
                this.showGDPRPopup();
            }
        });
    }

    showGDPRPopup() {
        if (this.gdprPopup) {
            this.gdprPopup.hidden = false;
        }
    }

    hideGDPRPopup() {
        if (this.gdprPopup) {
            this.gdprPopup.hidden = true;
        }
    }

    acceptGDPR() {
        // Store consent
        const consentData = {
            accepted: true,
            timestamp: Date.now(),
            version: '1.0'
        };

        chrome.storage.local.set({ [this.GDPR_CONSENT_KEY]: consentData }, () => {
            console.log('GDPR consent accepted');
            this.hideGDPRPopup();
        });
    }

    declineGDPR() {
        // Store decline
        const consentData = {
            accepted: false,
            timestamp: Date.now(),
            version: '1.0'
        };

        chrome.storage.local.set({ [this.GDPR_CONSENT_KEY]: consentData }, () => {
            console.log('GDPR consent declined');
            this.hideGDPRPopup();
            // Optionally disable certain features or show limited functionality
        });
    }

    showPrivacyModal() {
        if (this.privacyModal) {
            this.privacyModal.hidden = false;
        }
    }

    hidePrivacyModal() {
        if (this.privacyModal) {
            this.privacyModal.hidden = true;
        }
    }

    openExternalLink(url) {
        chrome.tabs.create({ url: url });
    }

    handleAccountDeletion() {
        // Show confirmation dialog
        if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
            // Clear all local data
            chrome.storage.local.clear(() => {
                console.log('Local data cleared');
                alert('Votre compte et toutes vos données ont été supprimés.');
                // Optionally redirect to uninstall page
                this.hidePrivacyModal();
            });
        }
    }

    // Method to check if user has valid GDPR consent
    hasValidConsent() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.GDPR_CONSENT_KEY], (result) => {
                const consent = result[this.GDPR_CONSENT_KEY];
                const isValid = consent &&
                               consent.accepted === true &&
                               consent.timestamp > Date.now() - (365 * 24 * 60 * 60 * 1000);
                resolve(isValid);
            });
        });
    }

    // Method to update consent timestamp (e.g., on policy updates)
    updateConsentTimestamp() {
        chrome.storage.local.get([this.GDPR_CONSENT_KEY], (result) => {
            const consent = result[this.GDPR_CONSENT_KEY];
            if (consent && consent.accepted) {
                consent.timestamp = Date.now();
                chrome.storage.local.set({ [this.GDPR_CONSENT_KEY]: consent });
            }
        });
    }
}

// Initialize legal manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.legalManager = new LegalManager();
    });
} else {
    window.legalManager = new LegalManager();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegalManager;
}