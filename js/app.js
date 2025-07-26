// js/app.js
import {
    N8N_GET_DATA_WEBHOOK_URL,
    N8N_UPDATE_DATA_WEBHOOK_URL,
    N8N_CROP_IMAGE_WEBHOOK_URL,
    N8N_REMOVE_WATERMARK_WEBHOOK_URL,
    N8N_GENERATE_MOCKUP_WEBHOOK_URL,
    N8N_REPLACE_BACKGROUND_WEBHOOK_URL,
    N8N_UPSCALE_IMAGE_WEBHOOK_URL
} from './config.js';
console.log('app.js main script loaded, N8N URLs imported.');

import { initDomElements, productIdElement, productNameElement, saveChangesButton, statusElement, dropzoneMain, dropzoneGallery, dropzoneCustom, imageCarouselContainer, imageCarousel, modalOverlay, modalCloseBtn, /* modalImageContainer, */ modalSwiperContainer, modalSwiperWrapper, modalImageId, modalImageDimensions, modalPrevBtn, modalNextBtn, modalActions, modalImageInfo, modalCropperContainer, imageToCropElement, modalCropBtn, modalCropValidateBtn, modalCropCancelBtn, cropperDataDisplay, cropDataX, cropDataY, cropDataWidth, cropDataHeight, cropperAspectRatioButtonsContainer, modalRemoveWatermarkBtn, modalGenerateMockupBtn, modalMarkForDeletionBtn, editActionConfirmationOverlay, confirmActionReplaceBtn, confirmActionNewBtn, confirmActionCancelBtn, loadingOverlay, modalToggleSizeGuideBtn, modalImageAssignedColorIndicatorElement, modalImageAssignedColorNameElement, modalDissociateColorBtn, modalReplaceBackgroundBtn, modalUpscaleBtn, productStatusToggleBtn,
    // NOUVEAUX ÉLÉMENTS DOM POUR LA SÉLECTION DES MANNEQUINS
    mannequinChoiceBtn, mannequinSelectionModal, mannequinModalCloseBtn, mannequinFilterAll, mannequinFilterHomme, mannequinFilterFemme, mannequinListContainer, mannequinSelectBtn, mannequinCancelBtn
} from './dom.js';
console.log('app.js: DOM element variables and init function imported.');

import { updateStatus, showLoading, hideLoading, resetModalToActionView } from './uiUtils.js';
console.log('app.js: UI utility functions imported.');

import { fetchProductDataAPI, saveChangesAPI, executeImageActionAPI, fetchMannequinsAPI } from './apiService.js'; // Importer fetchMannequinsAPI
console.log('app.js: API service functions imported.');

import { initializeSortableManager, addGalleryImageToDOM } from './sortableManager.js';
console.log('app.js: Sortable manager function imported.');

import { openModal as openImageModalFromManager, closeModal as closeModalFromManager, updateModalInfo as updateModalInfoFromManager, getCurrentModalImage, addImageToModalSwiper, updateImageInSwiper, refreshCurrentModalViewData as refreshCurrentModalViewDataFromManager } from './modalManager.js';
console.log('app.js: Modal manager functions imported.');

import { startCropper, cancelCropper as cancelCropperFromManager, validateCropData as validateCropDataFromManager, setCropperAspectRatio, isCropperActive } from './cropperManager.js';
console.log('app.js: Cropper manager functions imported.');

import * as actionsManager from './actionsManager.js';
console.log('app.js: Actions manager functions imported.');

import * as variantManager from './variantManager.js';
console.log('app.js: Variant manager functions imported.');

// --- Variables Globales ---
let currentProductId = null;
let allImageData = [];
let currentEditActionContext = null;
let currentSystemColorAttributeSlug = null;
let allMannequinsData = []; // Nouvelle variable globale pour stocker les mannequins
let selectedMannequinId = null; // Nouvelle variable globale pour le mannequin sélectionné

// --- Fonctions Utilitaires ---

// Met à jour l'affichage de l'icône Guide des Tailles sur une miniature ou un item de carrousel
function updateSizeGuideIcon(imageId, isSizeGuide) {
    console.log(`app.js: updateSizeGuideIcon called for ID ${imageId}, isSizeGuide: ${isSizeGuide}`);
    // Chercher l'élément dans le carrousel principal
    const carouselItem = imageCarousel.querySelector(`.carousel-image-container[data-image-id="${imageId}"]`);
    if (carouselItem) {
        if (isSizeGuide) {
            // Ajouter l'icône si elle n'existe pas déjà
            if (!carouselItem.querySelector('.size-guide-icon')) {
                const icon = document.createElement('span');
                icon.className = 'eih-item-icon size-guide-icon';
                icon.textContent = '📏'; // Ou autre icône/symbole
                icon.title = 'Guide des tailles';
                carouselItem.appendChild(icon); // L'ajoute à la fin, le CSS avec position:absolute le place
            }
            carouselItem.classList.add('has-size-guide-icon'); // Active l'affichage via CSS
        } else {
            carouselItem.classList.remove('has-size-guide-icon'); // Cache l'icône via CSS
            // Optionnel : supprimer l'élément icône du DOM s'il existe
            const existingIcon = carouselItem.querySelector('.size-guide-icon');
            if (existingIcon) existingIcon.remove();
        }
    }

    // Chercher l'élément dans toutes les zones de dépôt
    document.querySelectorAll(`.thumbnail-wrapper[data-image-id="${imageId}"]`).forEach(thumbnailWrapper => {
         if (isSizeGuide) {
            if (!thumbnailWrapper.querySelector('.size-guide-icon')) {
                const icon = document.createElement('span');
                icon.className = 'eih-item-icon size-guide-icon';
                icon.textContent = '📏';
                icon.title = 'Guide des tailles';
                thumbnailWrapper.appendChild(icon);
            }
            thumbnailWrapper.classList.add('has-size-guide-icon');
        } else {
            thumbnailWrapper.classList.remove('has-size-guide-icon');
            const existingIcon = thumbnailWrapper.querySelector('.size-guide-icon');
            if (existingIcon) existingIcon.remove();
        }
    });
    console.log(`app.js: Icône Guide des Tailles mise à jour pour ID ${imageId}: ${isSizeGuide}`);
}

// --- Enregistrement des Modifications ---
// Elle collecte toujours les IDs depuis les .thumbnail-wrapper présents dans les zones au moment du clic.
const handleSaveChanges = async () => {
    console.log('app.js: handleSaveChanges started.');
    showLoading("Sauvegarde des rôles...");
    updateStatus("Enregistrement des modifications...", 'info');
    if(saveChangesButton) saveChangesButton.disabled = true;

    const mainImageThumb = dropzoneMain ? dropzoneMain.querySelector('.thumbnail-wrapper') : null;
    const mainImageId = mainImageThumb ? mainImageThumb.dataset.imageId : null;
    console.log('app.js: Main Image ID:', mainImageId);

    const galleryImageThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper') : [];
    const galleryImageIds = Array.from(galleryImageThumbs).map(wrapper => wrapper.dataset.imageId);
    console.log('app.js: Gallery Image IDs:', galleryImageIds);

    const customGalleryThumbs = dropzoneCustom ? dropzoneCustom.querySelectorAll('.thumbnail-wrapper') : [];
    const customGalleryImageIds = Array.from(customGalleryThumbs).map(wrapper => wrapper.dataset.imageId);
    console.log('app.js: Custom Gallery Image IDs:', customGalleryImageIds);

    // Trouver l'ID de l'image désignée comme guide des tailles (ou null)
    const sizeGuideEntry = allImageData.find(imgData => imgData.uses && imgData.uses.includes('size_guide'));
    const sizeGuideImageId = sizeGuideEntry ? sizeGuideEntry.id : null;
    console.log(`app.js: Image Guide des Tailles sélectionnée pour sauvegarde: ID ${sizeGuideImageId}`);

    // **** AJOUT : Collecter les IDs des images marquées pour suppression ****
    const imageIdsToDelete = allImageData
        .filter(imgData => imgData.markedForDeletion === true)
        .map(imgData => imgData.id);
    
    const variantColorMappings = variantManager.getVariantColorMappings();

    // **** AJOUT : Récupérer le statut de traitement (0 ou 1) ****
    const processingStatusString = productStatusToggleBtn ? productStatusToggleBtn.dataset.status : '0';
    const imageProcessingStatus = parseInt(processingStatusString, 10); // Convertit '0'/'1' en nombre 0/1
    
    console.log(`app.js: Images marquées pour suppression (IDs): ${imageIdsToDelete.join(', ') || 'Aucune'}`);
    console.log(`app.js: Mannequin sélectionné pour sauvegarde (ID): ${selectedMannequinId}`);
    
    const payload = {
        productId: currentProductId,
        image_processing_status: imageProcessingStatus,
        mainImageId: mainImageId,
        galleryImageIds: galleryImageIds,
        customGalleryImageIds: customGalleryImageIds,
        sizeGuideImageId: sizeGuideImageId, // **** AJOUTER CETTE LIGNE ****
        imageIdsToDelete: imageIdsToDelete,
        variantColorMappings: variantColorMappings, // **** AJOUTER CE CHAMP AU PAYLOAD ****
        colorAttributeSlug: currentSystemColorAttributeSlug,
        linked_mannequin_id: selectedMannequinId // Ajouter le mannequin sélectionné
    };
    console.log("app.js: Données envoyées à n8n:", payload);

    try {
        // NOUVELLE LIGNE : Appel à la fonction API
        const result = await saveChangesAPI(payload);
        
        console.log("app.js: Réponse de n8n (Mise à jour):", result);
        updateStatus(result.message || "Modifications enregistrées avec succès !", 'success');

        // ** NOUVEAU : Retirer les images supprimées de l'UI **
        if (imageIdsToDelete.length > 0) {
            // Retirer de allImageData
            allImageData = allImageData.filter(imgData => !imageIdsToDelete.includes(imgData.id));
            // Retirer du carrousel DOM
            imageIdsToDelete.forEach(deletedId => {
                const itemToRemove = imageCarousel.querySelector(`.carousel-image-container[data-image-id="${deletedId}"]`);
                if (itemToRemove) {
                    itemToRemove.remove();
                }
                // Note: Inutile de les retirer des dropzones car elles ne devraient pas y être si elles sont dans le carrousel
            });
             // Mettre à jour la modale si ouverte et contient une image supprimée ?
             if (modalOverlay.style.display === 'flex') { // Vérifie si la modale est ouverte
                const currentModalImgData = getCurrentModalImage();
                if (currentModalImgData && imageIdsToDelete.includes(currentModalImgData.id)) {
                    closeModal(); // closeModal de app.js, qui appelle closeModalFromManager
                    updateStatus("Modifications enregistrées. L'image affichée dans la modale a été supprimée.", 'info');
                }
            }
        }
    } catch (error) {
        console.error("app.js: Erreur lors de l'enregistrement via n8n:", error);
        updateStatus(`Erreur enregistrement: ${error.message}`, 'error');
    } finally {
        if(saveChangesButton) saveChangesButton.disabled = false;
        hideLoading();
        console.log('app.js: handleSaveChanges finished.');
    }
};

// --- Logique de la Modal (Mise à jour pour Swiper) ---


// Dans app.js
function closeModal() {
    console.log('app.js: closeModal called.');
    closeModalFromManager(); // Pour overlay et Swiper

    // Si un recadrage était en cours, il faut aussi l'annuler proprement via le manager
    if (isCropperActive()) { // Utilise la fonction de cropperManager
        console.log("app.js: closeModal - Recadrage actif détecté, annulation via cropperManager.");
        cancelCropperFromManager(); // Cela nettoiera l'instance cropper dans le manager
    }
    // currentCroppingImage est maintenant géré par le manager, pas besoin de le nullifier ici
    // console.log("app.js: Modal fermée."); // Le log de cropperManager est plus précis pour le crop.
}

// Gestionnaire de Clic pour le bouton Réglages (⚙️) - Appelle openImageModal
function handleSettingsClick(event) {
    const button = event.currentTarget;
    const imageId = button.dataset.imageId; 
    console.log(`app.js: Clic sur Réglages pour Image ID: ${imageId}`);
//     openImageModal(imageId); // ANCIEN APPEL
    openImageModalFromManager(imageId, allImageData); // NOUVEL APPEL
}

// Gère le clic sur le bouton "Guide des tailles" dans la modale
function handleSizeGuideToggle(event) { // L'événement vient maintenant du bouton
    console.log('app.js: handleSizeGuideToggle called.');
    const button = event.currentTarget;
    const imageId = button.dataset.currentImageId;

    if (!imageId) {
        console.error("app.js: Impossible de trouver l'ID de l'image associée au bouton Guide des tailles.");
        return;
    }
    const imageIdNum = parseInt(imageId, 10);

    // Déterminer si on active ou désactive (basé sur la présence de la classe 'active-size-guide')
    const wasActive = button.classList.contains('active-size-guide');
    const newActiveState = !wasActive;

    console.log(`app.js: Toggle Guide des Tailles pour ID ${imageIdNum}. Nouveau statut actif: ${newActiveState}`);

    // Mettre à jour allImageData (logique pour UN SEUL guide des tailles)
    let previousSizeGuideId = null;
    allImageData.forEach(imgData => {
        const uses = imgData.uses || [];
        const isCurrentlySizeGuide = uses.includes('size_guide');
        const idMatches = imgData.id === imageIdNum;

        if (newActiveState) { // Si on vient d'activer pour imageIdNum
            if (idMatches) {
                if (!isCurrentlySizeGuide) {
                    imgData.uses = [...uses, 'size_guide'];
                }
            } else if (isCurrentlySizeGuide) {
                previousSizeGuideId = imgData.id;
                imgData.uses = uses.filter(use => use !== 'size_guide');
            }
        } else { // Si on vient de désactiver pour imageIdNum
            if (idMatches && isCurrentlySizeGuide) {
                imgData.uses = uses.filter(use => use !== 'size_guide');
            }
        }
    });

    // Mettre à jour l'apparence du bouton cliqué
    if (newActiveState) {
        button.classList.add('active-size-guide');
    } else {
        button.classList.remove('active-size-guide');
    }

    // Mettre à jour les icônes visuelles sur les miniatures/carousel
    updateSizeGuideIcon(imageIdNum, newActiveState);
    if (previousSizeGuideId !== null) {
        updateSizeGuideIcon(previousSizeGuideId, false);
    }

    // Mettre à jour l'affichage des infos dans la modale (si on y affichait les rôles, plus le cas)
    // const currentImageInData = allImageData.find(img => img.id === imageIdNum);
    // if (modalImageRoles && currentImageInData) { // modalImageRoles n'existe plus
    //      modalImageRoles.textContent = currentImageInData.uses.join(', ') || 'Aucun';
    // }

    updateStatus("Statut 'Guide des tailles' mis à jour localement.", "info");
}

// Gère le clic sur le bouton "DEL" dans le carrousel OU l'appel direct depuis la modale
function handleMarkForDeletionClick(eventOrButton, directImageId = null) {
    console.log('app.js: handleMarkForDeletionClick called.');
    let imageId;
    let container; // Conteneur de l'image dans le carrousel

    if (directImageId) {
        imageId = directImageId;
        // Essayer de trouver le conteneur dans le carrousel pour la synchro visuelle si possible
        if (imageCarousel) { // Assurez-vous que imageCarousel est défini et accessible
             container = imageCarousel.querySelector(`.carousel-image-container[data-image-id="${imageId}"]`);
        }
    } else { // Vient d'un événement de clic
        const button = eventOrButton.currentTarget;
        imageId = button.dataset.imageId;
        container = button.closest('.carousel-image-container');
    }

    if (!imageId) {
        console.error("app.js: Impossible de trouver l'ID pour marquer pour suppression.");
        return;
    }

    const imageIdNum = parseInt(imageId, 10);
    const imageIndex = allImageData.findIndex(img => img.id === imageIdNum);

    if (imageIndex === -1) {
        console.error(`app.js: Image ID ${imageIdNum} non trouvée dans allImageData.`);
        return;
    }

    allImageData[imageIndex].markedForDeletion = !allImageData[imageIndex].markedForDeletion;
    const isMarked = allImageData[imageIndex].markedForDeletion;

    console.log(`app.js: Image ID ${imageIdNum} marquée pour suppression: ${isMarked}`);

    // Mettre à jour l'apparence visuelle du carrousel SI l'élément y est
    if (container) {
        const delButtonInCarousel = container.querySelector('.del-btn');
        if (isMarked) {
            container.classList.add('marked-for-deletion');
            if (delButtonInCarousel) delButtonInCarousel.title = 'Annuler le marquage pour suppression';
        } else {
            container.classList.remove('marked-for-deletion');
            if (delButtonInCarousel) delButtonInCarousel.title = 'Marquer pour suppression définitive';
        }
    } else if (directImageId) {
        console.log(`app.js: Image ${directImageId} (appel direct) marquée/démarquée. Pas de conteneur carrousel trouvé pour màj visuelle immédiate.`);
    }

    // Mettre à jour l'apparence du bouton dans la modale si elle est ouverte et concerne cette image
    // On utilise getCurrentModalImage() qui est importé depuis modalManager.js
    const currentModalImgForButton = getCurrentModalImage(); 
    if (modalOverlay && modalOverlay.style.display === 'flex' && modalMarkForDeletionBtn && currentModalImgForButton?.id === imageIdNum) {
        if (isMarked) {
            modalMarkForDeletionBtn.textContent = 'UNDO';
            modalMarkForDeletionBtn.classList.add('marked');
        } else {
            modalMarkForDeletionBtn.textContent = 'DEL';
            modalMarkForDeletionBtn.classList.remove('marked');
        }
    }

    if (modalOverlay.style.display === 'flex') {
        refreshCurrentModalViewDataFromManager(allImageData);
    }

    updateStatus(`Image ${imageIdNum} ${isMarked ? 'marquée pour suppression' : 'ne sera plus supprimée'}. Enregistrez pour appliquer.`, 'info');
}

// --- NOUVELLE Logique de Recadrage (Cropper.js) ---

function startCropping() { // Cette fonction reste dans app.js pour orchestrer
    console.log('app.js: startCropping called.');
    const imageToEdit = getCurrentModalImage(); // Utilise la fonction de modalManager
    if (!imageToEdit) {
        updateStatus("Aucune image sélectionnée pour le recadrage.", "error");
        console.error("app.js: startCropping - Aucune image obtenue de getCurrentModalImage.");
        return;
    }

    // Définir les callbacks pour le cropperManager
    const handleValidation = (originalImageData, cropEventData) => {
        console.log("app.js: Cropping validated. Image:", originalImageData, "Crop data:", cropEventData);
        // Ici, on appelle la logique qui était dans l'ancien validateCropping pour montrer la confirmation
        // L'ancien validateCropping() sera refactorisé bientôt.
        // Pour l'instant, on va juste simuler la partie contexte :
        currentEditActionContext = { // currentEditActionContext est toujours global dans app.js
            type: 'crop',
            imageData: originalImageData,
            payloadData: { 
                crop: {
                    x: Math.round(cropEventData.x),
                    y: Math.round(cropEventData.y),
                    width: Math.round(cropEventData.width),
                    height: Math.round(cropEventData.height)
                }
            }
        };
        showEditActionConfirmation(); // showEditActionConfirmation est toujours dans app.js
    };

    const handleCancellation = () => {
        console.log("app.js: Cropping cancelled by manager.");
        resetModalToActionView(); // resetModalToActionView est dans uiUtils.js
    };

    startCropper(imageToEdit, handleValidation, handleCancellation); // Appel au manager
}

// Annule l'opération de recadrage
// Dans app.js
function cancelCropping() { // Cette fonction reste dans app.js pour orchestrer
    console.log("app.js: Demande d'annulation du recadrage.");
    // cropperManager.js appellera le onCancellationCallback que nous avons fourni à startCropper,
    // qui s'occupe de resetModalToActionView.
    // Donc, un appel direct à cancelCropperFromManager() suffit si on veut juste annuler.
    // Si on a déjà défini un onCancellationCallback dans startCropper, il sera appelé.
    // On pourrait aussi ne pas avoir cette fonction cancelCropping dans app.js
    // et laisser le bouton "Annuler Recadrage" appeler directement cancelCropperFromManager
    // SI on passe resetModalToActionView comme onCancellationCallback.
    // Pour l'instant, gardons-la pour la clarté.

    // Si cropperManager a besoin d'une méthode pour être annulé "de force" :
    cancelCropperFromManager(); // Appelle la fonction du manager
    // La fonction onCancellationCallback (qui contient resetModalToActionView) sera appelée par le manager
}

// Dans app.js (vérifiez cette fonction, elle devrait déjà être comme ça ou similaire)
function updateImageAfterCrop(imageIdStr, newImageUrl) { // Notez imageIdStr
    console.log(`app.js: Mise à jour URL pour Image ID ${imageIdStr} vers ${newImageUrl}`);

    const imageIndexInData = allImageData.findIndex(img => img.id.toString() === imageIdStr);
    if (imageIndexInData !== -1) {
        allImageData[imageIndexInData].url = newImageUrl;
        allImageData[imageIndexInData].src = newImageUrl; // Assurez-vous que 'src' est aussi mis à jour si utilisé
    }

    const carouselItemContainer = imageCarousel.querySelector(`.carousel-image-container[data-image-id="${imageIdStr}"]`);
    if (carouselItemContainer) {
        const imgInCarousel = carouselItemContainer.querySelector('img');
        if (imgInCarousel) imgInCarousel.src = newImageUrl;
        carouselItemContainer.dataset.imageUrl = newImageUrl;
    }

    document.querySelectorAll(`.thumbnail-wrapper[data-image-id="${imageIdStr}"]`).forEach(wrapper => {
        const imgInZone = wrapper.querySelector('.img-thumbnail');
        if (imgInZone) imgInZone.src = newImageUrl;
        wrapper.dataset.imageUrl = newImageUrl;
    });

    if (modalOverlay && modalOverlay.style.display === 'flex') {
        updateImageInSwiper(imageIdStr, newImageUrl); // Assurez-vous que updateImageInSwiper prend un ID string
    }
    console.log(`app.js: Toutes les instances de l'image ${imageIdStr} mises à jour avec la nouvelle URL.`);
}

// Valide le recadrage : stocke le contexte, puis affiche la confirmation.
async function validateCropping() { // Cette fonction reste dans app.js pour l'instant
    console.log('app.js: validateCropping called.');
    if (!isCropperActive()) { // Utilise la fonction de cropperManager
         console.error("app.js: validateCropping - Aucune instance Cropper active.");
         updateStatus("Erreur : Aucune image ou recadrage actif pour valider.", "error");
         return;
    }
    console.log("app.js: Bouton 'Valider Recadrage' cliqué. Appel à validateCropDataFromManager.");
    validateCropDataFromManager(); // Demande au manager de valider et d'appeler le onValidationCallback
    // Le onValidationCallback (défini dans startCropping d'app.js)
    // s'occupera de currentEditActionContext et showEditActionConfirmation.
}

// Gère la demande de retrait de watermark : stocke le contexte, puis affiche la confirmation.
async function handleRemoveWatermark() {
    console.log('app.js: handleRemoveWatermark called.');
    // Déterminer l'image à traiter : celle du mode recadrage (currentCroppingImage)
    // ou, si pas en mode recadrage, celle actuellement affichée dans la modale Swiper (modalImageList[currentModalIndex]).
    // const imageToProcess = cropperInstance ? currentCroppingImage : modalImageList[currentModalIndex]; // ANCIENNE LIGNE
    //const imageToProcess = cropperInstance ? currentCroppingImage : getCurrentModalImage(); // NOUVELLE LIGNE
    const imageToProcess = getCurrentModalImage();

    if (!imageToProcess || !imageToProcess.id || !imageToProcess.url) {
        updateStatus("Données de l'image invalides ou aucune image sélectionnée pour retirer le watermark.", "error");
        console.error("app.js: handleRemoveWatermark: imageToProcess invalide ou manquante.", imageToProcess);
        return;
    }

    console.log(`app.js: Préparation pour retrait du watermark (ID: ${imageToProcess.id}). Affichage confirmation...`);

    // Stocker le contexte de l'action
    currentEditActionContext = {
        type: 'removeWatermark', // Identifie le type d'opération
        imageData: imageToProcess, // L'objet image sur lequel on travaille
        payloadData: {} // Pas de données supplémentaires spécifiques pour cette action pour l'instant
                        // (l'URL et l'ID de l'image sont déjà dans imageData)
    };

    // Afficher la sous-modale de confirmation.
    showEditActionConfirmation();
    // L'ancien code qui faisait le fetch vers N8N_REMOVE_WATERMARK_WEBHOOK_URL
    // sera déplacé dans la nouvelle fonction executeConfirmedAction().
}

// Gère le clic sur le bouton "Générer Mockup"
async function handleGenerateMockup() {
    console.log('app.js: handleGenerateMockup called.');
    const imageToProcess = getCurrentModalImage();
    if (!imageToProcess || !imageToProcess.id || !imageToProcess.url) {
        updateStatus("Aucune image sélectionnée pour générer le mockup (ou recadrage en cours).", "error");
        console.error("app.js: handleGenerateMockup: imageToProcess invalide ou manquante.", imageToProcess);
        return;
    }

    console.log(`app.js: Préparation pour la génération du mockup (ID Image Produit: ${imageToProcess.id}).`);

    currentEditActionContext = { // currentEditActionContext est toujours dans app.js
        type: 'generateMockup',
        imageData: imageToProcess,
        payloadData: {}
    };

    console.log('[APP.JS] handleGenerateMockup - Context DÉFINI:', JSON.parse(JSON.stringify(currentEditActionContext))); // AJOUTER CETTE LIGNE
    // Appel direct à la version orchestrée avec gestion UI
    await callExecuteConfirmedActionWithUiManagement('new');
}

async function handleReplaceBackground() {
    console.log('app.js: handleReplaceBackground called.');
    const imageToProcess = getCurrentModalImage(); // Fonction de modalManager.js
    if (!imageToProcess || !imageToProcess.id || !imageToProcess.url) {
        updateStatus("Aucune image sélectionnée pour remplacer le fond.", "error");
        console.error("app.js: handleReplaceBackground: imageToProcess invalide ou manquante.", imageToProcess);
        return;
    }

    console.log(`app.js: Préparation pour le remplacement du fond (ID Image Produit: ${imageToProcess.id}).`);

    currentEditActionContext = { // currentEditActionContext est global dans app.js
        type: 'replaceBackground', // Nouveau type d'action
        imageData: imageToProcess,
        payloadData: {} // Pas de données spécifiques au payload ici, N8N s'occupera du reste
    };

    console.log('[APP.JS] handleReplaceBackground - Context DÉFINI:', JSON.parse(JSON.stringify(currentEditActionContext)));
    // Appel direct à la version orchestrée avec gestion UI, en mode 'new'
    await callExecuteConfirmedActionWithUiManagement('new');
}

async function handleUpscaleImage() {
    console.log('app.js: handleUpscaleImage called.');
    const imageToProcess = getCurrentModalImage(); // Fonction de modalManager.js
    if (!imageToProcess || !imageToProcess.id || !imageToProcess.url) {
        updateStatus("Aucune image sélectionnée pour l'upscale.", "error");
        console.error("app.js: handleUpscaleImage: imageToProcess invalide ou manquante.", imageToProcess);
        return;
    }

    console.log(`app.js: Préparation pour l'upscale de l'image (ID: ${imageToProcess.id}).`);

    currentEditActionContext = { // currentEditActionContext est global dans app.js
        type: 'upscaleImage', // Nouveau type d'action
        imageData: imageToProcess,
        payloadData: {} 
    };

    console.log('[APP.JS] handleUpscaleImage - Context DÉFINI:', JSON.parse(JSON.stringify(currentEditActionContext)));
    await callExecuteConfirmedActionWithUiManagement('new'); // Mode 'new' par défaut
}

function showEditActionConfirmation() {
    console.log('app.js: showEditActionConfirmation called.');
    if (editActionConfirmationOverlay) editActionConfirmationOverlay.style.display = 'flex';
    // Optionnel: cacher les boutons d'action principaux de la modale pendant ce choix
    if (modalActions) modalActions.style.display = 'none';
    if (modalCropValidateBtn) modalCropValidateBtn.style.display = 'none'; // Cacher si visible
    if (modalCropCancelBtn) modalCropCancelBtn.style.display = 'none';   // Cacher si visible
    if (cropperDataDisplay) cropperDataDisplay.style.display = 'none';
    if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'none';
}

// Dans app.js
function hideEditActionConfirmation() {
    console.log('app.js: hideEditActionConfirmation called.');
    if (editActionConfirmationOverlay) editActionConfirmationOverlay.style.display = 'none';
    currentEditActionContext = null; // Réinitialiser le contexte

    // Remplacer la vérification de cropperInstance par isCropperActive()
    if (isCropperActive()) { // <<< MODIFIÉ ICI
        // Réafficher les bons boutons si on était en mode crop
        if (modalCropValidateBtn) modalCropValidateBtn.style.display = 'inline-block';
        if (modalCropCancelBtn) modalCropCancelBtn.style.display = 'inline-block';
        if (cropperDataDisplay) cropperDataDisplay.style.display = 'block';
        if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'flex';
    } else { // Sinon, réafficher les actions principales de la modale
        if (modalActions) modalActions.style.display = 'flex'; 
    }
}

/**
 * Appelle actionsManager.executeConfirmedAction et gère l'UI (loading, status, reset view).
 * @param {string} editMode - 'replace' ou 'new'
 */
async function callExecuteConfirmedActionWithUiManagement(editMode) {
    console.log(`[APP.JS] callExecuteConfirmedActionWithUiManagement - Entrée. Mode: ${editMode}.`);
    console.log(`[APP.JS] Valeur de currentEditActionContext (GLOBAL) au DÉBUT:`, JSON.parse(JSON.stringify(currentEditActionContext || {})));

    if (!currentEditActionContext) {
        console.error("app.js: ERREUR - currentEditActionContext est null/undefined AU DÉBUT de callExecuteConfirmedActionWithUiManagement.");
        updateStatus("Erreur critique : Contexte d'action manquant initialement.", "error");
        if (isCropperActive()) {
            cancelCropperFromManager();
        } else {
            resetModalToActionView();
        }
        // Pas besoin de hideLoading() ici car il n'a pas été montré
        // Pas besoin de nullifier currentEditActionContext car il est déjà null
        return; // Quitter la fonction
    }

    // ** CRUCIAL : Copier la référence du contexte dans une variable locale **
    // ** AVANT d'appeler toute autre fonction qui pourrait avoir des effets de bord **
    const contextePourCetteAction = currentEditActionContext;

    console.log(`[APP.JS] contextePourCetteAction (LOCAL) copié AVANT hideEditActionConfirmation:`, JSON.parse(JSON.stringify(contextePourCetteAction || {})));

    // Gérer l'UI de la (sous-)modale de confirmation.
    // Cette fonction ne devrait pas modifier currentEditActionContext globalement.
    hideEditActionConfirmation();

    console.log(`[APP.JS] Valeur de currentEditActionContext (GLOBAL) APRÈS hideEditActionConfirmation:`, JSON.parse(JSON.stringify(currentEditActionContext || {})));
    console.log(`[APP.JS] Valeur de contextePourCetteAction (LOCAL) APRÈS hideEditActionConfirmation:`, JSON.parse(JSON.stringify(contextePourCetteAction || {})));

    // Vérification finale avant l'appel à actionsManager
    if (!contextePourCetteAction) {
        console.error("app.js: ERREUR CRITIQUE - contextePourCetteAction (copie locale) est null/undefined avant l'appel à actionsManager. Cela ne devrait jamais arriver si la logique est correcte.");
        updateStatus("Erreur interne : Perte de contexte d'action.", "error");
        if (isCropperActive()) {
            cancelCropperFromManager();
        } else {
            resetModalToActionView();
        }
        hideLoading(); // Si jamais showLoading a été appelé avant cette erreur.
        currentEditActionContext = null; // Assurer la nullification de la globale.
        return; // Quitter la fonction
    }
    
    console.log('[APP.JS] Contexte sur le point d\'être envoyé à actionsManager (depuis contextePourCetteAction):', JSON.parse(JSON.stringify(contextePourCetteAction)));

    try {
        await actionsManager.executeConfirmedAction(
            editMode,
            contextePourCetteAction, // <<<< UTILISER LA COPIE LOCALE
            currentProductId,
            allImageData,
            updateImageAfterCrop
        );
    } catch (error) {
        console.error(`app.js: Erreur retournée par actionsManager.executeConfirmedAction. Mode '${editMode}'. Type d'action: '${contextePourCetteAction?.type || 'inconnu'}'. Erreur:`, error);
        updateStatus(`Erreur (action ${contextePourCetteAction?.type || 'inconnue'}, mode ${editMode}): ${error.message}`, 'error');
        
        // La logique de restauration de la vue est principalement dans le finally,
        // mais une action immédiate peut être nécessaire si l'erreur est précoce.
        if (isCropperActive()) {
            cancelCropperFromManager();
        } else {
            resetModalToActionView();
        }
    } finally {
        hideLoading(); // S'assurer que le loading est masqué
        
        const typeActionEffectuee = contextePourCetteAction?.type; // Utiliser le type du contexte local qui a été traité

        // Logique de nettoyage de l'UI basée sur l'action effectuée
        if (typeActionEffectuee === 'crop' && isCropperActive()) {
            console.log(`[APP.JS] finally: Action était crop, appel de cancelCropperFromManager.`);
            cancelCropperFromManager(); 
        } else if (typeActionEffectuee && (typeActionEffectuee === 'removeWatermark' || typeActionEffectuee === 'generateMockup')) {
            // Pour removeWatermark ou generateMockup, la modale devrait revenir à la vue d'action normale.
            // Si cropper était actif (ne devrait pas l'être pour ces actions car les boutons sont cachés), on le cancel.
            // Sinon, on reset la vue.
            if (isCropperActive()) { // Cas de sécurité, ne devrait pas arriver
                console.warn(`[APP.JS] finally: Cropper actif pour ${typeActionEffectuee}, annulation.`);
                cancelCropperFromManager();
            } else {
                console.log(`[APP.JS] finally: Action ${typeActionEffectuee}, appel de resetModalToActionView.`);
                resetModalToActionView();
            }
        } else if (isCropperActive()) { // Si une action inconnue ou contexte perdu, mais cropper actif
             console.log(`[APP.JS] finally: Contexte perdu ou type inconnu, mais cropper actif. Appel de cancelCropperFromManager.`);
             cancelCropperFromManager();
        } else { // Contexte perdu ou type inconnu, pas de crop actif
            console.log(`[APP.JS] finally: Contexte perdu ou type inconnu, pas de crop. Appel de resetModalToActionView.`);
            resetModalToActionView();
        }

        // Toujours nullifier la variable globale après l'action.
        currentEditActionContext = null;
        console.log(`[APP.JS] callExecuteConfirmedActionWithUiManagement - FIN. Mode: '${editMode}'. currentEditActionContext global nullifié.`);
    }
}

// --- Mannequin Selection Modal Logic ---
async function openMannequinSelectionModal() {
    console.log('app.js: openMannequinSelectionModal called.');
    if (mannequinSelectionModal) {
        mannequinSelectionModal.style.display = 'flex';
        updateStatus('Chargement des mannequins...', 'info');
        showLoading('Chargement des mannequins...');

        try {
            let fetchedData = await fetchMannequinsAPI();
            // NOUVELLE LOGIQUE : Assurez-vous que fetchedData est un tableau
            if (!Array.isArray(fetchedData)) {
                console.warn('app.js: Fetched mannequin data is not an array, wrapping it in an array.', fetchedData);
                fetchedData = [fetchedData]; // Wrap single object in an array
            }
            allMannequinsData = fetchedData;
            console.log('app.js: Mannequins fetched (processed to array):', allMannequinsData);
            renderMannequinList(allMannequinsData, 'all'); // Initial filter to 'all'
            // Ensure filter buttons are reset visually
            mannequinFilterAll.classList.add('active-filter');
            mannequinFilterHomme.classList.remove('active-filter');
            mannequinFilterFemme.classList.remove('active-filter');
            updateStatus('Mannequins chargés.', 'success');
        } catch (error) {
            console.error('app.js: Failed to fetch mannequins:', error);
            updateStatus(`Erreur chargement mannequins: ${error.message}`, 'error');
            if (mannequinListContainer) {
                mannequinListContainer.innerHTML = '<p>Erreur lors du chargement des mannequins.</p>';
            }
        } finally {
            hideLoading();
        }
    }
}

function closeMannequinSelectionModal() {
    console.log('app.js: closeMannequinSelectionModal called.');
    if (mannequinSelectionModal) {
        mannequinSelectionModal.style.display = 'none';
        // Reset selected mannequin in the modal UI
        const currentlySelectedItem = mannequinListContainer.querySelector('.mannequin-item.selected');
        if (currentlySelectedItem) {
            currentlySelectedItem.classList.remove('selected');
        }
        // Do NOT reset selectedMannequinId here, it holds the product's assigned mannequin.
        // It only gets updated when user clicks 'Valider la sélection'.

        if (mannequinSelectBtn) mannequinSelectBtn.disabled = true;
        // Reset filter active states
        if (mannequinFilterAll) mannequinFilterAll.classList.add('active-filter');
        if (mannequinFilterHomme) mannequinFilterHomme.classList.remove('active-filter');
        if (mannequinFilterFemme) mannequinFilterFemme.classList.remove('active-filter');
        // Optionally clear the list to show loading message next time, or keep for faster re-open
        // mannequinListContainer.innerHTML = '<p>Chargement des mannequins...</p>';
    }
}

// This function will render the list of mannequins based on filters and pre-select if applicable
function renderMannequinList(mannequins, filterGender = 'all') {
    console.log(`app.js: renderMannequinList called with filter: ${filterGender}. Mannequin count: ${mannequins.length}`);
    if (!mannequinListContainer) return;

    mannequinListContainer.innerHTML = ''; // Clear previous content
    let filteredMannequins = mannequins;

    if (filterGender !== 'all') {
        filteredMannequins = mannequins.filter(m => m.gender === filterGender);
    }

    // IMPORTANT: Ensure filteredMannequins is truly an array before calling forEach
    if (!Array.isArray(filteredMannequins)) {
        console.error('app.js: filteredMannequins is not an array, cannot render list.', filteredMannequins);
        mannequinListContainer.innerHTML = '<p>Erreur: Format de données de mannequins invalide.</p>';
        if (mannequinSelectBtn) mannequinSelectBtn.disabled = true;
        return;
    }


    if (filteredMannequins.length === 0) {
        mannequinListContainer.innerHTML = '<p>Aucun mannequin trouvé pour ce filtre.</p>';
        if (mannequinSelectBtn) mannequinSelectBtn.disabled = true; // Disable if no mannequins to select
        return;
    }

    // Reset select button state
    if (mannequinSelectBtn) {
        mannequinSelectBtn.disabled = true;
    }

    filteredMannequins.forEach(mannequin => {
        const mannequinItem = document.createElement('div');
        mannequinItem.className = 'mannequin-item';
        mannequinItem.dataset.mannequinId = mannequin.id;

        const img = document.createElement('img');
        img.src = mannequin.portrait_url || 'https://via.placeholder.com/80?text=Mannequin'; // Placeholder if no image
        img.alt = mannequin.full_name || 'Mannequin'; // Fallback for alt text
        mannequinItem.appendChild(img);

        const name = document.createElement('p');
        name.className = 'name';
        name.textContent = mannequin.full_name || 'Nom Inconnu';
        mannequinItem.appendChild(name);

        const gender = document.createElement('p');
        gender.className = 'gender';
        gender.textContent = mannequin.gender === 'homme' ? 'Homme' : (mannequin.gender === 'femme' ? 'Femme' : 'Non spécifié');
        mannequinItem.appendChild(gender);

        // Add click event listener for selection
        mannequinItem.addEventListener('click', () => {
            console.log(`app.js: Mannequin ID ${mannequin.id} clicked for selection.`);
            // Remove 'selected' class from all other items
            document.querySelectorAll('#mannequin-list-container .mannequin-item').forEach(item => {
                item.classList.remove('selected');
            });
            // Add 'selected' class to the clicked item
            mannequinItem.classList.add('selected');
            // Enable the validation button and store the ID for the temporary selection
            if (mannequinSelectBtn) mannequinSelectBtn.disabled = false;
        });

        mannequinListContainer.appendChild(mannequinItem);
    });
    console.log(`app.js: ${filteredMannequins.length} mannequins rendered.`);

    // After rendering all items, apply the 'selected' class if selectedMannequinId matches
    if (selectedMannequinId !== null) {
        const preSelectedMannequinItem = mannequinListContainer.querySelector(`.mannequin-item[data-mannequin-id="${selectedMannequinId}"]`);
        if (preSelectedMannequinItem) {
            preSelectedMannequinItem.classList.add('selected');
            if (mannequinSelectBtn) mannequinSelectBtn.disabled = false; // Enable button if there's a pre-selection
        }
    }
}


// --- Récupération Initiale des Données ---
const fetchProductData = async () => {
    updateStatus("Récupération des données produit...", 'info');
    if (productNameElement) productNameElement.textContent = 'Chargement...';
    
    // Vider le carousel et les conteneurs de vignettes avant de re-peupler
    // Cette partie peut rester ici ou être faite aussi au début de initializeSortableManager.
    // La version dans sortableManager est plus complète car elle cible aussi les .thumbnail-container.
    // Pour éviter double travail, nous laissons sortableManager s'en charger.
    if (imageCarousel) imageCarousel.innerHTML = '<p>Chargement...</p>'; // Message temporaire
    // Supprimons le nettoyage des .thumbnail-container ici car sortableManager le fait.
    // document.querySelectorAll('.dropzone .thumbnail-container').forEach(container => container.innerHTML = ''); 

    allImageData = []; // Vider les données stockées

    try {
        const data = await fetchProductDataAPI(currentProductId); 
        
        console.log('app.js: Parsed JSON data:', data);
        updateStatus("Données reçues. Affichage...", 'info');

        if (productNameElement) productNameElement.textContent = data.productName || 'Non trouvé';

        // Set selectedMannequinId from product data if available
        // Make sure to parse to int, or set to null if 0 or empty string
        selectedMannequinId = data.linked_mannequin_id ? parseInt(data.linked_mannequin_id, 10) : null;
        if (selectedMannequinId === 0) selectedMannequinId = null; // Treat 0 as no selection
        console.log(`app.js: Initial linked_mannequin_id from product data: ${selectedMannequinId}`);


        if (data.images && Array.isArray(data.images)) {
            allImageData = data.images; // Stocker

            // --- MISE A JOUR DU BOUTON STATUT TRAITEMENT IMAGES ---
            if (productStatusToggleBtn) {
                // On attend une valeur numérique 0 ou 1. Par défaut, 0 (non terminé).
                const status = data.image_processing_status || 0; 
                productStatusToggleBtn.dataset.status = status.toString(); // Doit être une chaîne dans dataset
    
                if (parseInt(status) === 1) { // Traitement terminé
                    productStatusToggleBtn.textContent = '✅';
                    productStatusToggleBtn.classList.remove('status-inactive');
                    productStatusToggleBtn.classList.add('status-active');
                } else { // Traitement non terminé ou en cours
                    productStatusToggleBtn.textContent = '❌';
                    productStatusToggleBtn.classList.remove('status-active');
                    productStatusToggleBtn.classList.add('status-inactive');
                }
            }
            // --- FIN MISE A JOUR ---
            
            // Préparer les données pour variantManager
            let parsedVariantColorAttributes = [];
            if (data.variantColorAttributes) {
                if (typeof data.variantColorAttributes === 'string') {
                    try {
                        parsedVariantColorAttributes = JSON.parse(data.variantColorAttributes);
                        console.log('app.js: variantColorAttributes (string) parsed successfully:', parsedVariantColorAttributes);
                    } catch (e) {
                        console.error('app.js: Failed to parse variantColorAttributes string:', e);
                        updateStatus('Erreur format données couleurs variantes.', 'error');
                        // Vous pourriez vouloir cacher la section des couleurs ici ou afficher un message spécifique
                        if (variantManager.variantColorAssignmentContainer) { // Accès direct au DOM element via dom.js si exporté ou via variantManager
                            const container = document.getElementById('variant-color-assignment-container');
                            if(container) container.style.display = 'none';
                        }
                    }
                } else if (Array.isArray(data.variantColorAttributes)) {
                    parsedVariantColorAttributes = data.variantColorAttributes;
                    console.log('app.js: variantColorAttributes is already an array:', parsedVariantColorAttributes);
                } else {
                    console.warn('app.js: variantColorAttributes is neither a string nor an array. Type:', typeof data.variantColorAttributes);
                     if (variantManager.variantColorAssignmentContainer) {
                         const container = document.getElementById('variant-color-assignment-container');
                         if(container) container.style.display = 'none';
                     }
                }
            } else {
                console.log('app.js: No variantColorAttributes found in data.');
                 if (variantManager.variantColorAssignmentContainer) {
                     const container = document.getElementById('variant-color-assignment-container');
                     if(container) container.style.display = 'none';
                 }
            }
            
            // Initialiser SortableJS pour les images AVANT, pour que les placeholders soient créés
            initializeSortableManager(
                allImageData, 
                handleSettingsClick, 
                handleMarkForDeletionClick,
                variantManager.refreshIndicatorForImage // Passer la fonction en callback
            );

            // Stocker le slug du premier attribut de couleur trouvé (s'il y en a un)
            if (parsedVariantColorAttributes && parsedVariantColorAttributes.length > 0 && parsedVariantColorAttributes[0].attribute_slug) {
                currentSystemColorAttributeSlug = parsedVariantColorAttributes[0].attribute_slug;
                console.log('app.js: Slug de l\'attribut de couleur système stocké :', currentSystemColorAttributeSlug);
            } else {
                currentSystemColorAttributeSlug = null; // Assurer qu'il est null s'il n'est pas trouvé
                console.log('app.js: Aucun slug d\'attribut de couleur système trouvé/stocké.');
            }
            
            // Appeler l'initialisation du gestionnaire de variantes ENSUITE
            variantManager.initVariantColorSwatches(parsedVariantColorAttributes, allImageData);

            updateStatus("Images affichées. Glissez pour assigner/réassigner.", 'success');
        } else { // Ce else est pour if (data.images && Array.isArray(data.images))
            console.error("app.js: Format de données invalide : 'images' manquant ou n'est pas un tableau.");
            if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur format données.</p>';
            updateStatus("Erreur format données images.", 'error');
            // S'assurer qu'on essaie quand même d'initialiser Sortable pour avoir une base, même vide.
            initializeSortableManager([], handleSettingsClick, handleMarkForDeletionClick); 
        }
    } catch (error) {
        console.error("app.js: Erreur fetchProductData:", error);
        updateStatus(`Erreur chargement: ${error.message}`, 'error');
        if (productNameElement) productNameElement.textContent = 'Erreur';
        if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur chargement.</p>';
        // Initialiser Sortable même en cas d'erreur pour que l'UI de base soit là
        initializeSortableManager([], handleSettingsClick, handleMarkForDeletionClick); 
    }
};

// --- Initialisation de l'application ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('app.js: DOMContentLoaded event fired.');
    // Initialise le SDK Telegram SI il est disponible
    if (window.Telegram && window.Telegram.WebApp) {
        console.log("app.js: SDK Telegram WebApp détecté. Initialisation...");
        Telegram.WebApp.ready(); // Indique à Telegram que la WebApp est chargée et prête
        Telegram.WebApp.expand(); // Demande à la WebApp de s'agrandir à sa hauteur maximale
        // Optionnel : Activer la confirmation avant de fermer la WebApp
        // Telegram.WebApp.enableClosingConfirmation();
    } else {
        console.warn("app.js: SDK Telegram WebApp non détecté. Fonctionnement hors Telegram?");
    }

    //Initialiser les éléments DOM via le module dom.js
    initDomElements();
    console.log('app.js: initDomElements() called.');
    
    // ... (Récupération productId - inchangé) ...
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');
     if (!currentProductId) { 
        console.error('app.js: Product ID not found in URL. Cannot proceed.');
        updateStatus("Erreur: ID produit manquant dans l'URL.", "error");
        return; 
    }
    if (productIdElement) productIdElement.textContent = currentProductId;
    console.log('app.js: currentProductId set to:', currentProductId);


    // --- Attacher les écouteurs d'événements ---
    // Modal Fermer
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (event) => {
        // Condition pour fermer la modale :
        // 1. Le clic doit être directement sur l'overlay (le fond).
        // 2. L'instance de Cropper ne doit PAS être active (c'est-à-dire, cropperInstance doit être null).
        if (event.target === modalOverlay && !isCropperActive()) {
            closeModal();
        } else if (event.target === modalOverlay && isCropperActive()) {
            console.log("app.js: Clic extérieur détecté pendant le recadrage, fermeture de la modale empêchée.");
            // Optionnel: donner un feedback visuel à l'utilisateur, comme un léger "shake" de la modale
            // ou un message bref, mais pour l'instant on empêche juste la fermeture.
        }
    });
    if (modalDissociateColorBtn) {
        modalDissociateColorBtn.addEventListener('click', (event) => {
            console.log('app.js: Dissociate Color button clicked.');
            const imageId = event.currentTarget.dataset.imageId;
            const colorSlug = event.currentTarget.dataset.colorSlug;
    
            if (!imageId || !colorSlug) {
                console.error("app.js: Missing imageId or colorSlug on dissociate button.");
                return;
            }
    
            console.log(`app.js: Clicked dissociate for imageId: ${imageId}, colorSlug: ${colorSlug}`);
    
            // Récupérer la référence à productVariantColorData stockée dans variantManager
            // Cela suppose que variantManager expose ou a stocké cette donnée de manière accessible
            // ou que app.js la stocke aussi. Pour l'instant, on va la passer.
            // Il faudrait que variantManager.js stocke productVariantColorData dans une variable de module
            // et ait un getter ou le passe à dissociateColorFromImage.
            // La fonction dissociateColorFromImage a été définie pour prendre productVariantDataRef.
    
            // Accéder à la variable productVariantColorData de variantManager.
            // Pour cela, il faudrait que variantManager l'expose ou que app.js la garde.
            // Simplifions : variantManager.js utilise sa propre variable de module productVariantColorData.
            const dissociationSuccess = variantManager.dissociateColorFromImage(
                imageId, 
                colorSlug, 
                allImageData, // app.js a la référence à allImageData
                variantManager.getProductVariantData() // Supposons que variantManager a une fonction pour retourner productVariantColorData
            );
    
            if (dissociationSuccess) {
                // Rafraîchir l'affichage de la modale pour l'image actuelle
                // updateModalInfoFromManager prend (index, currentAllImageData)
                // Nous avons besoin de l'index actuel de la modale. getCurrentModalImage ne donne pas l'index.
                // modalManager doit exposer son moduleCurrentModalIndex ou une fonction de rafraîchissement direct.
    
                // Option 1: Si modalManager expose l'index (pas idéal)
                // const currentIndex = modalManager.getCurrentModalIndex(); // Fonction hypothétique
                // if (currentIndex !== null) {
                // updateModalInfoFromManager(currentIndex, allImageData);
                // }
    
                // Option 2 (préférable): modalManager a une fonction pour rafraîchir sa vue actuelle
                // ou refreshCurrentModalViewDataFromManager (que nous avons déjà) fait l'affaire.
                refreshCurrentModalViewDataFromManager(allImageData); 
                // Cette fonction appelle updateModalInfo avec l'index courant et allImageData.
                // Elle mettra à jour l'affichage de la couleur (qui devrait être "Aucune" maintenant)
                // et cachera le bouton de dissociation.
            }
        });
    }

    // Bouton Sauver (rôles)
    if (saveChangesButton) saveChangesButton.addEventListener('click', handleSaveChanges);
    // Bouton Recadrer (Action principale)
    if (modalCropBtn) modalCropBtn.addEventListener('click', startCropping);
    // Attacher les écouteurs d'événements aux boutons de ratio
    if (cropperAspectRatioButtonsContainer) {
        const ratioButtons = cropperAspectRatioButtonsContainer.querySelectorAll('.aspect-btn');
        ratioButtons.forEach(button => {
            button.addEventListener('click', () => {
                    const ratioString = button.dataset.ratio;
                    setCropperAspectRatio(ratioString);                
            });
        });
    }

    if (modalCropValidateBtn) {
        modalCropValidateBtn.addEventListener('click', validateCropping);
    }
    if (modalCropCancelBtn) {
        modalCropCancelBtn.addEventListener('click', cancelCropping);
    }
    
    if (modalRemoveWatermarkBtn) {
        modalRemoveWatermarkBtn.addEventListener('click', handleRemoveWatermark);
    }
    // Écouteur pour la case à cocher Guide des Tailles
    // if (modalToggleSizeGuide) modalToggleSizeGuide.addEventListener('change', handleSizeGuideToggle); 
    if (modalToggleSizeGuideBtn) modalToggleSizeGuideBtn.addEventListener('click', handleSizeGuideToggle); // NOUVELLE LIGNE
    // Bouton Mockup (Action principale)
    // if (modalMockupBtn) modalMockupBtn.addEventListener('click', startMockupGeneration);

    //if (confirmActionReplaceBtn) confirmActionReplaceBtn.addEventListener('click', () => executeConfirmedAction('replace'));
    //if (confirmActionNewBtn) confirmActionNewBtn.addEventListener('click', () => executeConfirmedAction('new'));
    if (confirmActionReplaceBtn) {
        confirmActionReplaceBtn.addEventListener('click', () => {
            callExecuteConfirmedActionWithUiManagement('replace');
        });
    }
    if (confirmActionNewBtn) {
        confirmActionNewBtn.addEventListener('click', () => {
            callExecuteConfirmedActionWithUiManagement('new');
        });
    }

    
    if (confirmActionCancelBtn) confirmActionCancelBtn.addEventListener('click', () => {
        hideEditActionConfirmation();
        currentEditActionContext = null; // <<<<<<<<<<<< ICI ON NULLIFIE currentEditActionContext
    });
    if (modalGenerateMockupBtn) modalGenerateMockupBtn.addEventListener('click', handleGenerateMockup); // <-- NOUVELLE LIGNE
    if (modalReplaceBackgroundBtn) modalReplaceBackgroundBtn.addEventListener('click', handleReplaceBackground);
    if (modalUpscaleBtn) modalUpscaleBtn.addEventListener('click', handleUpscaleImage);
    
    if (modalMarkForDeletionBtn) {
        modalMarkForDeletionBtn.addEventListener('click', (event) => {
            const imageId = event.currentTarget.dataset.imageId;
            if (imageId) {
                // Le premier argument est 'eventOrButton', on peut passer null ou l'event
                // Le deuxième est 'directImageId'
                handleMarkForDeletionClick(event, imageId); 
            } else {
                console.warn("app.js: Clic sur DEL modal, mais aucun data-image-id trouvé sur le bouton.");
            }
        });
    }

    // Écouteur pour le bouton de statut de traitement des images
    if (productStatusToggleBtn) {
        productStatusToggleBtn.addEventListener('click', () => {
            console.log('app.js: productStatusToggleBtn clicked.');
            const currentStatus = productStatusToggleBtn.dataset.status; // Sera '0' ou '1'
            const newStatus = currentStatus === '1' ? '0' : '1';
            
            productStatusToggleBtn.dataset.status = newStatus;
            
            if (newStatus === '1') {
                productStatusToggleBtn.textContent = '✅';
                productStatusToggleBtn.classList.remove('status-inactive');
                productStatusToggleBtn.classList.add('status-active');
                updateStatus("Statut du traitement des images : Terminé. Enregistrez pour appliquer.", 'info');
            } else {
                productStatusToggleBtn.textContent = '❌';
                productStatusToggleBtn.classList.remove('status-active');
                productStatusToggleBtn.classList.add('status-inactive');
                updateStatus("Statut du traitement des images : Non Terminé. Enregistrez pour appliquer.", 'info');
            }
        });
    }

    // --- NOUVEAUX ÉCOUTEURS D'ÉVÉNEMENTS POUR LA SÉLECTION DES MANNEQUINS ---
    if (mannequinChoiceBtn) {
        mannequinChoiceBtn.addEventListener('click', openMannequinSelectionModal);
        console.log('app.js: Mannequin Choice button event listener attached.');
    }
    if (mannequinModalCloseBtn) {
        mannequinModalCloseBtn.addEventListener('click', closeMannequinSelectionModal);
        console.log('app.js: Mannequin Modal Close button event listener attached.');
    }
    if (mannequinCancelBtn) {
        mannequinCancelBtn.addEventListener('click', closeMannequinSelectionModal);
        console.log('app.js: Mannequin Modal Cancel button event listener attached.');
    }
    if (mannequinSelectBtn) {
        mannequinSelectBtn.addEventListener('click', () => {
            // Get the ID of the currently selected mannequin in the modal
            const currentlySelectedItem = mannequinListContainer.querySelector('.mannequin-item.selected');
            if (currentlySelectedItem) {
                selectedMannequinId = parseInt(currentlySelectedItem.dataset.mannequinId, 10);
                console.log(`app.js: Mannequin selected with ID: ${selectedMannequinId}. Closing modal.`);
                updateStatus(`Mannequin ID ${selectedMannequinId} sélectionné. Enregistrez pour appliquer.`, 'success');
            } else {
                // If no item is selected but user clicks validate (e.g., they unselected something)
                // We should clear the linked mannequin ID
                selectedMannequinId = null;
                console.log('app.js: No mannequin selected. Clearing linked mannequin ID. Closing modal.');
                updateStatus('Mannequin dissocié. Enregistrez pour appliquer.', 'info');
            }
            closeMannequinSelectionModal();
        });
        console.log('app.js: Mannequin Select button event listener attached.');
    }
    // Filter buttons event listeners
    if (mannequinFilterAll) {
        mannequinFilterAll.addEventListener('click', () => {
            console.log('app.js: Mannequin Filter All clicked.');
            renderMannequinList(allMannequinsData, 'all');
            mannequinFilterAll.classList.add('active-filter');
            mannequinFilterHomme.classList.remove('active-filter');
            mannequinFilterFemme.classList.remove('active-filter');
        });
    }
    if (mannequinFilterHomme) {
        mannequinFilterHomme.addEventListener('click', () => {
            console.log('app.js: Mannequin Filter Homme clicked.');
            renderMannequinList(allMannequinsData, 'homme');
            mannequinFilterHomme.classList.add('active-filter');
            mannequinFilterAll.classList.remove('active-filter');
            mannequinFilterFemme.classList.remove('active-filter');
        });
    }
    if (mannequinFilterFemme) {
        mannequinFilterFemme.addEventListener('click', () => {
            console.log('app.js: Mannequin Filter Femme clicked.');
            renderMannequinList(allMannequinsData, 'femme');
            mannequinFilterFemme.classList.add('active-filter');
            mannequinFilterAll.classList.remove('active-filter');
            mannequinFilterHomme.classList.remove('active-filter');
        });
    }


    // Récupérer les données initiales
    fetchProductData();
    console.log('app.js: fetchProductData() called.');

}); // Fin de DOMContentLoaded