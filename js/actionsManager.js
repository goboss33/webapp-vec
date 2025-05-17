// js/actionsManager.js
import {
    N8N_CROP_IMAGE_WEBHOOK_URL,
    N8N_REMOVE_WATERMARK_WEBHOOK_URL,
    N8N_GENERATE_MOCKUP_WEBHOOK_URL,
    N8N_RESIZE_IMAGE_WEBHOOK_URL // Assurez-vous que cette constante est bien définie dans config.js
} from './config.js';
import {
    modalOverlay,
    dropzoneGallery
} from './dom.js';
import { showLoading, hideLoading, updateStatus } from './uiUtils.js'; // resetModalToActionView n'est pas directement utilisé ici
import { executeImageActionAPI } from './apiService.js';
import { addGalleryImageToDOM } from './sortableManager.js';
import { addImageToModalSwiper } from './modalManager.js'; // updateImageInSwiper n'est pas utilisé directement ici

console.log('actionsManager.js module loaded');

export async function executeConfirmedAction(
    editMode,
    currentEditContext, // Reçu comme contextePourCetteAction depuis app.js
    productId,
    currentAllImageData, // Référence au tableau allImageData d'app.js
    onUpdateImageAfterCrop // Callback vers updateImageAfterCrop d'app.js
) {
    console.log('actionsManager.js: executeConfirmedAction called. Mode:', editMode, 'Context REÇU:', JSON.parse(JSON.stringify(currentEditContext || {})));

    if (!currentEditContext || !currentEditContext.type || !currentEditContext.imageData) {
        console.error("actionsManager.js: Contexte d'action d'édition invalide ou manquant.", currentEditContext);
        // updateStatus est généralement géré par l'appelant dans le catch, mais on peut en mettre un ici
        updateStatus("Erreur : Contexte d'action invalide.", "error");
        // Il est préférable de lancer une erreur pour que l'appelant la gère proprement
        throw new Error("Contexte d'action d'édition invalide ou manquant reçu par actionsManager.");
    }

    const { type, imageData, payloadData } = currentEditContext;
    let webhookUrl = '';

    const basePayload = {
        productId: productId,
        imageId: imageData.id,
        imageUrl: imageData.url.split('?')[0],
        editMode: editMode
    };
    console.log('[actionsManager.js] basePayload initial:', JSON.parse(JSON.stringify(basePayload)));

    if (editMode === 'new') {
        if (dropzoneGallery) {
            const galleryImageThumbs = dropzoneGallery.querySelectorAll('.thumbnail-container .thumbnail-wrapper');
            console.log('[actionsManager.js] Nombre de galleryImageThumbs trouvées:', galleryImageThumbs.length);
            const galleryImageIds = Array.from(galleryImageThumbs).map(wrapper => {
                // console.log('[actionsManager.js] Thumbnail wrapper dataset imageId:', wrapper.dataset.imageId); // Peut être verbeux
                return wrapper.dataset.imageId;
            });
            basePayload.currentGalleryImageIds = galleryImageIds;
            console.log('[actionsManager.js] basePayload APRÈS ajout currentGalleryImageIds:', JSON.parse(JSON.stringify(basePayload)));
            console.log('[actionsManager.js] IDs de galerie actuels collectés pour le mode new:', galleryImageIds);
        } else {
            console.warn('actionsManager.js: dropzoneGallery non trouvée, currentGalleryImageIds ne sera pas envoyé.');
            basePayload.currentGalleryImageIds = [];
            console.log('[actionsManager.js] basePayload APRÈS setting currentGalleryImageIds à [] (dropzone non trouvée):', JSON.parse(JSON.stringify(basePayload)));
        }
    }

    const finalPayload = { ...basePayload, ...payloadData };
    console.log('[actionsManager.js] payloadData (données spécifiques à l\'action):', JSON.parse(JSON.stringify(payloadData)));
    console.log('[actionsManager.js] finalPayload CRÉÉ:', JSON.parse(JSON.stringify(finalPayload)));

    // Détermination de webhookUrl
    if (type === 'crop') {
        webhookUrl = N8N_CROP_IMAGE_WEBHOOK_URL;
    } else if (type === 'removeWatermark') {
        webhookUrl = N8N_REMOVE_WATERMARK_WEBHOOK_URL;
    } else if (type === 'generateMockup') {
        webhookUrl = N8N_GENERATE_MOCKUP_WEBHOOK_URL;
    } else if (type === 'resizeImage') {
        webhookUrl = N8N_RESIZE_IMAGE_WEBHOOK_URL;
    } else {
        console.error(`actionsManager.js: Type d'action inconnu lors de la détermination du webhook: ${type}`);
        throw new Error(`Type d'action inconnu '${type}'. Impossible de déterminer le webhook.`);
    }

    // Log avant l'appel API
    console.log(`actionsManager.js: Exécution de l'action: ${type}, Mode: ${editMode}, Webhook: ${webhookUrl}, Payload à envoyer:`, JSON.parse(JSON.stringify(finalPayload)));
    showLoading(`Traitement de l'image (${type}, Mode: ${editMode})...`);
    // updateStatus est fait par l'appelant ou ici, mais showLoading inclut souvent un message.

    try {
        const result = await executeImageActionAPI(webhookUrl, finalPayload);
        console.log(`actionsManager.js: Réponse du workflow n8n (${type}, ${editMode}):`, result);

        if (!result || result.status !== 'success' || !result.newImageUrl) {
            let errorDetail = result.message || `Réponse invalide du workflow n8n pour '${type}' en mode '${editMode}'.`;
            if (!result.newImageUrl && type !== 'delete') { /* Pour delete, newImageUrl n'est pas attendu */
                errorDetail += " 'newImageUrl' manquant.";
            }
            if (result.status !== 'success') errorDetail += ` Statut incorrect: ${result.status}.`;
            throw new Error(errorDetail);
        }

        if (editMode === 'replace') {
            onUpdateImageAfterCrop(imageData.id.toString(), result.newImageUrl); // imageData vient de currentEditContext
            updateStatus(`Image (ID: ${imageData.id}) modifiée avec succès via '${type}' !`, 'success');
        } else { // editMode === 'new'
            if (!result.newImageId) {
                throw new Error("L'ID de la nouvelle image ('newImageId') est manquant dans la réponse n8n pour le mode 'new'.");
            }
            const newImageObject = {
                id: result.newImageId,
                url: result.newImageUrl,
                status: 'current',
                uses: [] // Par défaut, ou ['gallery'] si c'est l'intention
            };
            currentAllImageData.push(newImageObject); // Modifie la référence du tableau de app.js

            if (dropzoneGallery) {
                addGalleryImageToDOM(newImageObject);
                console.log(`actionsManager.js: Nouvelle image ID ${newImageObject.id} ajoutée au DOM de la dropzone-gallery.`);
            } else {
                console.warn("actionsManager.js: dropzoneGallery non trouvée, impossible d'ajouter la nouvelle image au DOM de la galerie.");
            }

            if (modalOverlay && modalOverlay.style.display === 'flex') {
                addImageToModalSwiper(newImageObject);
            }
            updateStatus(`Nouvelle image (ID: ${newImageObject.id}) créée via '${type}' et ajoutée !`, 'success');
        }
    } catch (error) {
        console.error(`actionsManager.js: Échec de l'action '${type}' en mode '${editMode}':`, error);
        throw error; // Remonter l'erreur pour que l'appelant (app.js) la gère (status, hideLoading, reset view)
    }
    // hideLoading() est géré par l'appelant (app.js) dans le bloc finally.
}

// Potentiellement d'autres fonctions d'actionsManager ici à l'avenir (handleSaveChanges, etc.)
