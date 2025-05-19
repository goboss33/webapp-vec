// js/actionsManager.js
import {
    N8N_CROP_IMAGE_WEBHOOK_URL,
    N8N_REMOVE_WATERMARK_WEBHOOK_URL,
    N8N_GENERATE_MOCKUP_WEBHOOK_URL,
    N8N_REPLACE_BACKGROUND_WEBHOOK_URL
} from './config.js';
import {
    modalOverlay, // Pour vérifier si la modale est visible (pour addImageToModalSwiper)
    // Si d'autres éléments DOM sont directement manipulés PAR CETTE FONCTION, ajoutez-les.
    // Pour l'instant, executeConfirmedAction utilise principalement d'autres managers.
    dropzoneGallery
} from './dom.js';
import { showLoading, hideLoading, updateStatus, resetModalToActionView } from './uiUtils.js';
import { executeImageActionAPI } from './apiService.js';
import { addGalleryImageToDOM } from './sortableManager.js'; // Utilisé par executeConfirmedAction
import { addImageToModalSwiper, updateImageInSwiper } from './modalManager.js'; // Utilisé par executeConfirmedAction
import { cancelCropper as cancelCropperFromManager, isCropperActive } from './cropperManager.js'; // Utilisé par executeConfirmedAction

console.log('actionsManager.js module loaded');

// Pour gérer les variables d'état qui étaient globales dans app.js
// Nous allons les passer en paramètre aux fonctions qui en ont besoin au lieu de les recréer ici.
// let currentProductId_actions; // Sera passé en argument
// let allImageData_actions;     // Sera passé en argument
// let currentEditActionContext_actions; // Sera passé en argument ou retourné/géré par des fonctions spécifiques

/**
 * Exécute une action d'édition d'image confirmée (crop, removeWatermark, mockup).
 * @param {string} editMode - 'replace' ou 'new'.
 * @param {Object} currentEditContext - L'objet currentEditActionContext d'app.js.
 * @param {string} productId - L'ID du produit actuel (currentProductId d'app.js).
 * @param {Array} currentAllImageData - Référence au tableau allImageData d'app.js.
 * @param {Function} onUpdateImageAfterCrop - Référence à la fonction updateImageAfterCrop d'app.js.
 * @returns {Promise<void>}
 */
export async function executeConfirmedAction(
    editMode,
    currentEditContext,
    productId,
    currentAllImageData,
    onUpdateImageAfterCrop
) {
    console.log('actionsManager.js: executeConfirmedAction called. Mode:', editMode, 'Context REÇU:', JSON.parse(JSON.stringify(currentEditContext || {}))); // MODIFIER CETTE LIGNE

    if (!currentEditContext) {
        console.error("actionsManager.js: Aucun contexte d'action d'édition trouvé pour exécuter.");
        updateStatus("Erreur : Contexte d'action manquant.", "error");
        // La confirmation est cachée par l'appelant (app.js) avant d'appeler cette fonction.
        // La restauration de la vue (Cropper ou reset) est aussi gérée par l'appelant dans le `finally` ou `catch`
        return;
    }

    const { type, imageData, payloadData } = currentEditContext;
    let webhookUrl = '';
    const basePayload = {
        productId: productId, // Utilise le productId passé en argument
        imageId: imageData.id,
        imageUrl: imageData.url.split('?')[0], // Enlève les query params de l'URL si présents
        editMode: editMode
    };

    console.log('[actionsManager.js] basePayload initial:', JSON.parse(JSON.stringify(basePayload))); // LOG 1

    if (editMode === 'new') {
        if (dropzoneGallery) {
            const galleryImageThumbs = dropzoneGallery.querySelectorAll('.thumbnail-container .thumbnail-wrapper');
            console.log('[actionsManager.js] Nombre de galleryImageThumbs trouvées:', galleryImageThumbs.length); // LOG 2
            const galleryImageIds = Array.from(galleryImageThumbs).map(wrapper => {
                console.log('[actionsManager.js] Thumbnail wrapper dataset imageId:', wrapper.dataset.imageId); // LOG 3 (pour chaque image)
                return wrapper.dataset.imageId;
            });
            basePayload.currentGalleryImageIds = galleryImageIds;
            console.log('[actionsManager.js] basePayload APRÈS ajout currentGalleryImageIds:', JSON.parse(JSON.stringify(basePayload))); // LOG 4
            console.log('[actionsManager.js] IDs de galerie actuels collectés pour le mode new:', galleryImageIds);
        } else {
            console.warn('actionsManager.js: dropzoneGallery non trouvée, currentGalleryImageIds ne sera pas envoyé.');
            basePayload.currentGalleryImageIds = [];
            console.log('[actionsManager.js] basePayload APRÈS setting currentGalleryImageIds à [] (dropzone non trouvée):', JSON.parse(JSON.stringify(basePayload))); // LOG 5
        }
    }

    const finalPayload = { ...basePayload, ...payloadData };
    console.log('[actionsManager.js] payloadData (les données spécifiques à l\'action comme "crop"):', JSON.parse(JSON.stringify(payloadData))); // LOG 6
    console.log('[actionsManager.js] finalPayload CRÉÉ:', JSON.parse(JSON.stringify(finalPayload))); // LOG 7 (remplace le log précédent du payload)


    console.log(`actionsManager.js: Exécution de l'action: ${type}, Mode: ${editMode}, Webhook: ${webhookUrl}`); // Payload loggué juste au-dessus
    
    if (type === 'crop') {
        webhookUrl = N8N_CROP_IMAGE_WEBHOOK_URL;
    } else if (type === 'removeWatermark') {
        webhookUrl = N8N_REMOVE_WATERMARK_WEBHOOK_URL;
    } else if (type === 'generateMockup') {
        webhookUrl = N8N_GENERATE_MOCKUP_WEBHOOK_URL;
    } else if (type === 'replaceBackground') { // << NOUVELLE CONDITION ELSE IF
        webhookUrl = N8N_REPLACE_BACKGROUND_WEBHOOK_URL;
    } else {
        console.error(`actionsManager.js: Type d'action inconnu lors de l'exécution: ${type}`);
        // hideLoading() et updateStatus() seront appelés par l'appelant dans le bloc catch/finally.
        // On lance une erreur pour que l'appelant la gère.
        throw new Error(`Type d'action inconnu '${type}'.`);
    }

    console.log(`actionsManager.js: Exécution de l'action: ${type}, Mode: ${editMode}, Webhook: ${webhookUrl}, Payload:`, finalPayload);
    showLoading(`Traitement de l'image (${type}, Mode: ${editMode})...`);
    updateStatus(`Traitement (${type}, Mode: ${editMode}) en cours...`, 'info');
    // hideEditActionConfirmation(); // Est appelé AVANT l'appel à executeConfirmedAction dans app.js

    try {
        const result = await executeImageActionAPI(webhookUrl, finalPayload);
        console.log(`actionsManager.js: Réponse du workflow n8n (${type}, ${editMode}):`, result);

        if (!result || result.status !== 'success' || !result.newImageUrl) {
            let errorDetail = result.message || `Réponse invalide du workflow n8n pour '${type}' en mode '${editMode}'.`;
            if (!result.newImageUrl) errorDetail += " 'newImageUrl' manquant.";
            if (result.status !== 'success') errorDetail += ` Statut incorrect: ${result.status}.`;
            throw new Error(errorDetail);
        }

        if (editMode === 'replace') {
            // Appel du callback passé en argument
            onUpdateImageAfterCrop(imageData.id.toString(), result.newImageUrl);
            updateStatus(`Image (ID: ${imageData.id}) remplacée avec succès via '${type}' !`, 'success');
        } else { // editMode === 'new'
            if (!result.newImageId) {
                throw new Error("L'ID de la nouvelle image ('newImageId') est manquant dans la réponse n8n pour le mode 'new'.");
            }
            const newImageObject = {
                id: result.newImageId,
                url: result.newImageUrl,
                status: 'current', // ou tout autre statut par défaut pertinent
                uses: ['gallery'] // Par défaut, les nouvelles images pourraient aller en galerie
                                  // ou cela pourrait être configuré/décidé autrement.
                                  // Pour l'instant, cette affectation 'gallery' n'a pas d'impact direct
                                  // car l'image est juste ajoutée à allImageData et au carrousel/swiper.
            };
            currentAllImageData.push(newImageObject); // Modifie le tableau de app.js via sa référence

            if (dropzoneGallery) { // Vérifier si l'élément existe
                addGalleryImageToDOM(newImageObject); // Utilise la fonction de sortableManager
                console.log(`actionsManager.js: Nouvelle image ID ${newImageObject.id} ajoutée au DOM de la dropzone-gallery.`);
            } else {
                console.warn("actionsManager.js: dropzoneGallery non trouvée, impossible d'ajouter la nouvelle image au DOM de la galerie.");
            }
            // Ajoute au carrousel via sortableManager (qui a besoin de son propre createCarouselItem)
            // Pour l'instant, on va supposer qu'on a une fonction `addCarouselItemToDOM` dans sortableManager
            // ou alors on doit repenser comment les images sont ajoutées au carrousel principal.
            // La fonction existante `addGalleryImageToDOM` est pour les THUMBNAILS dans les zones.
            // Il nous faut l'équivalent pour le CAROUSEL principal.
            // TEMPORAIREMENT: on appelle `addGalleryImageToDOM` pour voir l'effet, mais c'est incorrect.
            // On corrigera cela plus tard en ajoutant une fonction à sortableManager pour ajouter au carrousel,
            // ou en appelant `WorkspaceProductData` pour tout rafraîchir (moins idéal).
            // Pour l'instant, on va se contenter de l'ajouter à `allImageData` et à la modale.
            // Le carrousel sera mis à jour lors du prochain `WorkspaceProductData` ou si on implemente
            // un `addCarouselItemFromData(newImageObject)` dans `sortableManager`.

            // Mieux : on va appeler la fonction pour ajouter au carousel (si elle existe, sinon on la créera)
            // Pour l'instant, on ne l'appelle pas pour éviter une erreur si elle n'est pas dans sortableManager.
            // On se concentre sur la modale.
            // addCarouselItemToDOM(newImageObject); // Supposons que cela existe dans sortableManager ou app.js

            if (modalOverlay && modalOverlay.style.display === 'flex') {
                addImageToModalSwiper(newImageObject);
            }
            updateStatus(`Nouvelle image (ID: ${newImageObject.id}) générée via '${type}' et ajoutée. Elle apparaîtra dans le carrousel après un rechargement ou une sauvegarde.`, 'success');
        }

        // La gestion de la vue (cancelCropper ou resetModalToActionView) sera faite par l'appelant
        // dans le bloc `finally` de l'appel à `executeConfirmedAction` dans `app.js`.

    } catch (error) {
        console.error(`actionsManager.js: Échec de l'action '${type}' en mode '${editMode}':`, error);
        // Remonter l'erreur pour que l'appelant puisse la gérer (showStatus, hideLoading, resetView)
        throw error;
    }
    // hideLoading() sera appelé par l'appelant dans le bloc `finally`.
    // console.log(`actionsManager.js: Fin du traitement pour action '${type}', mode '${editMode}'.`);
}

// D'autres fonctions seront ajoutées ici...
