// js/apiService.js
import {
    N8N_GET_DATA_WEBHOOK_URL,
    N8N_UPDATE_DATA_WEBHOOK_URL
    // N8N_CROP_IMAGE_WEBHOOK_URL, // Sera utilisé par une fonction d'action spécifique
    // N8N_REMOVE_WATERMARK_WEBHOOK_URL,
    // N8N_GENERATE_MOCKUP_WEBHOOK_URL
} from './config.js';

console.log('apiService.js module loaded');

/**
 * Récupère les données du produit depuis le webhook N8N.
 * @param {string} productId - L'ID du produit.
 * @returns {Promise<Object>} La promesse résolue avec les données du produit ou rejetée avec une erreur.
 */
export async function fetchProductDataAPI(productId) {
    // Logs de débogage pour vérifier les valeurs
    console.log('apiService.js: N8N_GET_DATA_WEBHOOK_URL value:', N8N_GET_DATA_WEBHOOK_URL);
    console.log('apiService.js: productId value:', productId);

    // Assurez-vous que cette ligne est exactement comme ci-dessous,
    // utilisant les vraies variables N8N_GET_DATA_WEBHOOK_URL et productId
    const urlToFetch = `${N8N_GET_DATA_WEBHOOK_URL}?productId=${productId}`;

    console.log(`apiService.js: Attempting to fetch from constructed urlToFetch: ${urlToFetch}`); // Ce log va nous montrer l'URL réellement construite

    const response = await fetch(urlToFetch);
    if (!response.ok) {
        let errorMsg = `Erreur serveur N8N (fetchProductDataAPI): ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || JSON.stringify(errorData);
        } catch (e) {
            // Si le corps n'est pas JSON ou est vide, on garde le message d'erreur HTTP simple
        }
        throw new Error(errorMsg);
    }
    return response.json();
}

/**
 * Enregistre les modifications des rôles d'images et les suppressions via le webhook N8N.
 * @param {Object} payload - Les données à envoyer (productId, mainImageId, galleryImageIds, etc.).
 * @returns {Promise<Object>} La promesse résolue avec la réponse du serveur ou rejetée avec une erreur.
 */
export async function saveChangesAPI(payload) {
    console.log('apiService.js: Saving changes via N8N_UPDATE_DATA_WEBHOOK_URL with payload:', payload);
    const response = await fetch(N8N_UPDATE_DATA_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let errorMsg = `Erreur serveur N8N (saveChangesAPI): ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || JSON.stringify(errorData);
        } catch (e) {
            // Ignorer l'erreur de parsing JSON ici, utiliser le message d'erreur HTTP
        }
        throw new Error(errorMsg);
    }
    return response.json();
}

/**
 * Exécute une action d'édition d'image (crop, removeWatermark, mockup) via un webhook N8N spécifique.
 * @param {string} webhookUrl - L'URL du webhook N8N à appeler.
 * @param {Object} payload - Les données à envoyer pour l'action.
 * @returns {Promise<Object>} La promesse résolue avec la réponse du serveur ou rejetée avec une erreur.
 */
export async function executeImageActionAPI(webhookUrl, payload) {
    console.log(`apiService.js: Executing image action via ${webhookUrl} with payload:`, payload);
    if (!webhookUrl) {
        console.error("apiService.js: executeImageActionAPI - webhookUrl est manquant !");
        throw new Error("URL du webhook pour l'action d'image non fournie.");
    }
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let errorMsg = `Erreur serveur N8N (executeImageActionAPI - ${webhookUrl}): ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
        } catch (e) {
             // Si le corps de la réponse d'erreur n'est pas du JSON valide ou est vide
            console.warn(`apiService.js: Impossible de parser la réponse d'erreur JSON de n8n pour <span class="math-inline">\{webhookUrl\} \(</span>{response.status}).`);
        }
        throw new Error(errorMsg);
    }
    return response.json();
}
