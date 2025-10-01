# Fix Backend API

## Problème identifié

Le backend (ligne 796 de server.js) essaie d'accéder à `req.body.options.postType` mais reçoit `undefined`.

**Erreur actuelle :**
```
TypeError: Cannot read properties of undefined (reading 'postType')
at generateInstagramPost (/app/server.js:796:92)
```

## Solutions possibles

### Option 1: Fixer le backend (RECOMMANDÉ)

Modifier `server.js` ligne 796 pour gérer les deux formats :

```javascript
// Ligne ~796 dans generateInstagramPost()
const postType = req.body.options?.postType || req.body.postType || 'lifestyle';
const tone = req.body.options?.tone || req.body.tone || 'casual';
```

### Option 2: Envoyer les données au format exact attendu

Le backend semble attendre :
```javascript
{
  "image": "data:image/jpeg;base64,...",
  "options": {
    "postType": "lifestyle",
    "tone": "casual",
    // autres options...
  }
}
```

**Format actuel envoyé :** ✅ Correct
**Format attendu par le backend :** ✅ Correct

Le problème vient donc probablement d'une autre ligne du backend qui ne gère pas bien le cas où `options` existe.

### Option 3: Bypass complet - Utiliser un endpoint différent

Si le backend a un autre endpoint qui fonctionne, utiliser celui-ci.

## Investigation nécessaire

Vous devez vérifier le code backend Railway autour de la ligne 796 :

```bash
# Dans le terminal Railway
cat server.js | sed -n '790,800p'
```

Ou aller sur Railway.app → Votre projet → Deployments → Logs pour voir les détails complets.

## Workaround temporaire

En attendant le fix backend, créer des données de test factices :

```javascript
// Dans popup.js - À la place de l'appel API
const mockResult = {
  success: true,
  caption: "Belle journée ensoleillée ☀️ Profiter de chaque instant est un art de vivre. #lifestyle #bonheur",
  hashtags: ["#lifestyle", "#bonheur", "#soleil", "#nature", "#zen", "#inspiration"],
  suggestions: [
    "Ajouter un call-to-action à la fin",
    "Mentionner la localisation si pertinent",
    "Utiliser plus d'emojis pour l'engagement"
  ],
  source: 'mock'
};
```
