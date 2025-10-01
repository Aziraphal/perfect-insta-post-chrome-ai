# 🚀 Guide de Migration V1 → V2

## Vue d'ensemble

Migration de l'ancienne architecture (8 fichiers, 3500 lignes) vers la nouvelle (3 fichiers, 660 lignes).

---

## 📋 Checklist de migration

### ✅ **Étape 1 : Backup de la V1**

```bash
cd C:\Users\rince\perfect-insta-extension-final

# Créer dossier de backup
mkdir v1-backup

# Sauvegarder les fichiers principaux
move popup.js v1-backup/
move popup.html v1-backup/
move background.js v1-backup/
move manifest.json v1-backup/

# Sauvegarder les modules (optionnel si vous voulez les garder)
move hybrid-ai.js v1-backup/
move chrome-ai.js v1-backup/
move freemium.js v1-backup/
move payment.js v1-backup/
move analytics.js v1-backup/
move legal.js v1-backup/
move i18n.js v1-backup/
```

### ✅ **Étape 2 : Activer la V2**

```bash
# Renommer les nouveaux fichiers
ren popup-v2.js popup.js
ren popup-v2.html popup.html
ren background-v2.js background.js
ren manifest-v2.json manifest.json

# api.js est déjà au bon nom
```

### ✅ **Étape 3 : Mettre à jour popup.html**

Le `popup-v2.html` utilise déjà les bons noms, mais vérifiez les imports :

```html
<!-- popup.html - Vérifier ces lignes -->
<script type="module" src="popup.js"></script>
```

**Note :** `type="module"` est important pour `import { API } from './api.js'`

### ✅ **Étape 4 : Recharger l'extension**

1. Ouvrir Chrome
2. `chrome://extensions/`
3. Cliquer sur **Recharger** (icône ↻)
4. Ouvrir la console : DevTools → Onglet Extension

**Vérifier les logs :**
```
✅ 📦 api.js chargé
✅ 📦 popup.js chargé
✅ 🎯 Service Worker V2 initialisé
```

---

## 🧪 Tests à effectuer

### **1. Test d'authentification**

- [ ] Cliquer sur "Se connecter avec Google"
- [ ] Onglet OAuth s'ouvre
- [ ] Connexion Google fonctionne
- [ ] Redirection automatique
- [ ] Onglet se ferme automatiquement
- [ ] UI se met à jour (userEmail affiché)

**Logs attendus :**
```
🔐 Login...
🌐 Auth URL: https://...
✅ Auth sauvegardée: votre@email.com
🎨 UI mise à jour
```

### **2. Test d'upload**

- [ ] Cliquer sur la zone d'upload
- [ ] Sélectionner une image (< 10MB)
- [ ] Prévisualisation s'affiche
- [ ] Bouton "Générer" devient actif

**Logs attendus :**
```
✅ Image chargée: photo.jpg 450KB
```

### **3. Test de génération**

- [ ] Sélectionner type/ton
- [ ] Cliquer "Générer le post"
- [ ] Bouton passe en "Génération..."
- [ ] Résultats s'affichent (caption, hashtags, suggestions)

**Logs attendus :**
```
🎨 Génération avec options: {postType: 'lifestyle', tone: 'casual'}
📡 API.generatePost: ...
✅ Généré: {caption, hashtags, suggestions}
```

### **4. Test des actions**

- [ ] **Copier tout** → Texte copié
- [ ] **Copier caption** → Caption copiée
- [ ] **Copier hashtags** → Tags copiés
- [ ] **Réécrire** → Nouvelle caption
- [ ] **Nouveau post** → Reset complet

---

## 🐛 Troubleshooting

### **Erreur : "Cannot use import statement"**

**Cause :** Manifest n'a pas `"type": "module"`

**Solution :**
```json
// manifest.json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"  // ← Ajouter cette ligne
  }
}
```

### **Erreur : "API is not defined"**

**Cause :** Import manquant dans popup.js

**Solution :**
```javascript
// popup.js - Ligne 1
import { API } from './api.js';  // ← Vérifier cette ligne
```

### **Erreur : "FormData is not defined" (backend)**

**Cause :** Backend attend JSON au lieu de FormData

**Solution :** Deux options :

**Option A : Modifier api.js** (utiliser JSON au lieu de FormData)
```javascript
// api.js - Modifier generatePost()
const response = await fetch(`${this.baseUrl}/api/generate-post`, {
    method: 'POST',
    headers: this.getHeaders(),  // Avec Content-Type: application/json
    body: JSON.stringify({
        image: imageBase64,  // Convertir File en base64
        postType: options.postType,
        tone: options.tone
    })
});
```

**Option B : Modifier le backend** (accepter FormData - RECOMMANDÉ)
```javascript
// server.js
const multer = require('multer');
const upload = multer();

app.post('/api/generate-post',
    authenticateJWT,
    upload.single('image'),  // ← Ajouter multer
    async (req, res) => {
        const postType = req.body.postType;  // FormData fields
        const tone = req.body.tone;
        const imageBuffer = req.file.buffer;  // Image
        // ...
    }
);
```

### **Erreur : "Cannot read properties of undefined (reading 'postType')"**

**Cause :** Backend ligne 796 lit `req.body.options.postType` mais reçoit `req.body.postType`

**Solution :** Fixer le backend
```javascript
// server.js - Ligne ~796
// AVANT
const postType = req.body.options.postType;  // ❌

// APRÈS
const postType = req.body.postType || 'lifestyle';  // ✅
const tone = req.body.tone || 'casual';
```

---

## 🔄 Retour arrière (rollback)

Si la V2 ne fonctionne pas, retour rapide à la V1 :

```bash
cd C:\Users\rince\perfect-insta-extension-final

# Supprimer V2
del popup.js
del popup.html
del background.js
del manifest.json
del api.js

# Restaurer V1
move v1-backup\popup.js .
move v1-backup\popup.html .
move v1-backup\background.js .
move v1-backup\manifest.json .

# Recharger l'extension
```

---

## 📊 Comparaison avant/après

### **Taille des fichiers**

| Fichier | V1 | V2 | Réduction |
|---------|----|----|-----------|
| popup.js | 1729 lignes | 240 lignes | **-86%** |
| background.js | 336 lignes | 220 lignes | **-35%** |
| **Total** | 3500+ lignes | 660 lignes | **-81%** |

### **Nombre de fichiers**

- V1 : **8 fichiers JS**
- V2 : **3 fichiers JS**
- Réduction : **-62%**

### **Dépendances supprimées**

- ❌ `hybrid-ai.js` (331 lignes)
- ❌ `chrome-ai.js` (344 lignes)
- ❌ Chrome Built-in AI APIs (instable)

---

## ✅ Validation finale

Une fois la migration terminée, vérifier :

- [ ] Connexion Google fonctionne
- [ ] Upload d'image fonctionne
- [ ] Génération de post fonctionne
- [ ] Actions (copier, réécrire) fonctionnent
- [ ] Pas d'erreurs dans la console
- [ ] Extension stable après recharge

**Console propre attendue :**
```
📦 api.js chargé
🚀 Perfect Insta Post v2.0 - Initialisation
📋 Éléments DOM initialisés
✅ Utilisateur authentifié: cyril.paquier@gmail.com
🔧 Event listeners configurés
🎨 Interface mise à jour
✅ Popup initialisé
```

---

## 🚀 Déploiement production

Une fois la V2 validée en local :

1. **Mettre à jour version** : `manifest.json` → `"version": "2.0.0"`
2. **Créer package** : Zipper tous les fichiers
3. **Tester sur Chrome stable** (pas seulement Canary)
4. **Soumettre au Chrome Web Store**

---

## 📝 Notes importantes

- **Pas de retour V1 après prod** : Une fois en production, ne pas revenir à la V1
- **Backup manuel** : Garder `v1-backup/` pour référence historique
- **Documentation** : Lire `ARCHITECTURE_V2.md` pour comprendre la nouvelle structure
- **Backend** : Fixer impérativement la ligne 796 avant production

---

**Date :** 2025-10-01
**Version :** 2.0.0
**Status :** ✅ Prêt pour migration
