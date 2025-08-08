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

import { 
    initDomElements, productIdElement, productNameElement, saveChangesButton, statusElement, 
    dropzoneMain, dropzoneGallery, dropzoneCustom, imageCarouselContainer, imageCarousel, 
    modalOverlay, modalCloseBtn, modalSwiperContainer, modalSwiperWrapper, modalImageId, 
    modalImageDimensions, modalPrevBtn, modalNextBtn, modalActions, modalImageInfo, 
    modalCropperContainer, imageToCropElement, modalCropBtn, modalCropValidateBtn, 
    modalCropCancelBtn, cropperDataDisplay, cropDataX, cropDataY, cropDataWidth, cropDataHeight, 
    cropperAspectRatioButtonsContainer, modalRemoveWatermarkBtn, modalGenerateMockupBtn, 
    modalMarkForDeletionBtn, editActionConfirmationOverlay, confirmActionReplaceBtn, 
    confirmActionNewBtn, confirmActionCancelBtn, loadingOverlay, modalToggleSizeGuideBtn, 
    modalImageAssignedTermIndicatorElement, modalImageAssignedTermNameElement, modalDissociateTermBtn,
    modalReplaceBackgroundBtn, modalUpscaleBtn, productStatusToggleBtn,
    mannequinChoiceBtn, mannequinSelectionModal, mannequinModalCloseBtn, mannequinFilterAll, 
    mannequinFilterHomme, mannequinFilterFemme, mannequinListContainer, mannequinSelectBtn, mannequinCancelBtn,
	mannequinFilterGreen, mannequinFilterOrange, mannequinFilterRed,
    mannequinDisplayPortrait, mannequinDisplayName,
    mannequinImageSelectionModal, mannequinImageSwiperWrapper, mannequinImageModalCloseBtn, 
    mannequinImageValidateBtn, mannequinImageCancelBtn,

    // --- AJOUTEZ CES DEUX VARIABLES À LA LISTE ---
    resetVariantsBtn,
    noVariantsMessage,
    aliexpressLinkElement,
	checklistModal, checklistModalCloseBtn, checklistItemCustomImages,
    checklistItemGalleryCount,
    checklistItemMannequin,
    checklistItemVariantsAssigned,
    checklistItemSizeGuide,
    sizeGuideNaBtn
    
} from './dom.js';
console.log('app.js: DOM element variables and init function imported.');

import { updateStatus, showLoading, hideLoading, resetModalToActionView, registerOnStatusUpdateCallback } from './uiUtils.js';
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

import * as variantAttributeManager from './variantAttributeManager.js';
console.log('app.js: Variant manager functions imported.');

// --- Variables Globales ---
let currentProductId = null;
let allImageData = [];
let currentEditActionContext = null;
let currentAttributeSlug = null;
let allMannequinsData = []; // Nouvelle variable globale pour stocker les mannequins
let selectedMannequinId = null; // Nouvelle variable globale pour le mannequin sélectionné
let mannequinImageSwiperInstance = null; // <-- NOUVELLE LIGNE

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
// REMPLACEZ VOTRE FONCTION handleSaveChanges EXISTANTE PAR CELLE-CI

const handleSaveChanges = async () => {
    console.log('app.js: handleSaveChanges started.');
    showLoading("Sauvegarde des modifications...");
    updateStatus("Enregistrement des modifications...", 'info');
    if (saveChangesButton) saveChangesButton.disabled = true;

    const mainImageThumb = dropzoneMain ? dropzoneMain.querySelector('.thumbnail-wrapper') : null;
    const mainImageId = mainImageThumb ? mainImageThumb.dataset.imageId : null;

    const galleryImageThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper') : [];
    const galleryImageIds = Array.from(galleryImageThumbs).map(wrapper => wrapper.dataset.imageId);

    const customGalleryThumbs = dropzoneCustom ? dropzoneCustom.querySelectorAll('.thumbnail-wrapper') : [];
    const customGalleryImageIds = Array.from(customGalleryThumbs).map(wrapper => wrapper.dataset.imageId);

    const sizeGuideEntry = allImageData.find(imgData => imgData.uses && imgData.uses.includes('size_guide'));
    const sizeGuideImageId = sizeGuideEntry ? sizeGuideEntry.id : null;

    const imageIdsToDelete = allImageData
        .filter(imgData => imgData.markedForDeletion === true)
        .map(imgData => imgData.id);

    const imageProcessingStatus = parseInt(productStatusToggleBtn ? productStatusToggleBtn.dataset.status : '0', 10);

    // --- NOUVELLE LOGIQUE DE GESTION DES VARIANTES ---
    const variantMappings = variantAttributeManager.getVariantMappings(); // Appel au nouveau manager
    
    const payload = {
        productId: currentProductId,
        image_processing_status: imageProcessingStatus,
        mainImageId: mainImageId,
        galleryImageIds: galleryImageIds,
        customGalleryImageIds: customGalleryImageIds,
        sizeGuideImageId: sizeGuideImageId,
        imageIdsToDelete: imageIdsToDelete,
        variantMappings: variantMappings,           // Nom de clé générique
        attributeSlug: currentAttributeSlug,        // Nom de clé générique
        linked_mannequin_id: selectedMannequinId
    };
    // --- FIN DE LA NOUVELLE LOGIQUE ---

    console.log("app.js: Données envoyées à n8n:", payload);

    try {
        const result = await saveChangesAPI(payload);
        console.log("app.js: Réponse de n8n (Mise à jour):", result);
        updateStatus(result.message || "Modifications enregistrées avec succès !", 'success');

        if (imageIdsToDelete.length > 0) {
            allImageData = allImageData.filter(imgData => !imageIdsToDelete.includes(imgData.id));
            imageIdsToDelete.forEach(deletedId => {
                const itemToRemove = imageCarousel.querySelector(`.carousel-image-container[data-image-id="${deletedId}"]`);
                if (itemToRemove) itemToRemove.remove();
            });
            if (modalOverlay.style.display === 'flex') {
                const currentModalImgData = getCurrentModalImage();
                if (currentModalImgData && imageIdsToDelete.includes(currentModalImgData.id)) {
                    closeModal();
                    updateStatus("Modifications enregistrées. L'image affichée a été supprimée.", 'info');
                }
            }
        }
    } catch (error) {
        console.error("app.js: Erreur lors de l'enregistrement via n8n:", error);
        updateStatus(`Erreur enregistrement: ${error.message}`, 'error');
    } finally {
        if (saveChangesButton) saveChangesButton.disabled = false;
        hideLoading();
        console.log('app.js: handleSaveChanges finished.');
    }
};

// DANS js/app.js

// --- NOUVELLES FONCTIONS POUR LA CHECKLIST DE VALIDATION ---

let validationCriteria = {
    customImages: false,
    galleryCount: false, // <-- AJOUTER
    mannequinSelected: false, // <-- AJOUTER
    variantsAssigned: false, // <-- AJOUTER
	sizeGuide: false
};

// DANS js/app.js

/** Met à jour la checklist dans la modale et l'état global des critères */
function runAllValidationChecks() {
    // --- Critère 1: Nombre d'images "Custom" ---
    const customImageCount = dropzoneCustom ? dropzoneCustom.querySelectorAll('.thumbnail-wrapper').length : 0;
    validationCriteria.customImages = (customImageCount === 3);
    
    // --- Critère 2: Nombre d'images "Galerie" ---
    const galleryImageCount = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper').length : 0;
    validationCriteria.galleryCount = (galleryImageCount >= 3);

    // --- Critère 3: Mannequin sélectionné ---
    validationCriteria.mannequinSelected = (selectedMannequinId !== null && selectedMannequinId > 0);

    // --- Critère 4: Toutes les variations assignées ---
    const unassignedTermsCount = variantAttributeManager.getAvailableTermsCount();
    const mappings = variantAttributeManager.getVariantMappings();
    const assignedImageIds = mappings.map(m => m.imageId);
	
	// --- Critère 5: guide des taille choisi ---
	// On ne met à jour ce critère que s'il n'est pas manuellement mis en N/A
    if (validationCriteria.sizeGuide !== 'na') {
        const hasSizeGuideAssigned = allImageData.some(img => img.uses?.includes('size_guide'));
        validationCriteria.sizeGuide = hasSizeGuideAssigned;
    }
	
    const dropzoneImageIds = [
        ...(dropzoneMain ? Array.from(dropzoneMain.querySelectorAll('.thumbnail-wrapper')).map(t => t.dataset.imageId) : []),
        ...(dropzoneCustom ? Array.from(dropzoneCustom.querySelectorAll('.thumbnail-wrapper')).map(t => t.dataset.imageId) : []),
        ...(dropzoneGallery ? Array.from(dropzoneGallery.querySelectorAll('.thumbnail-wrapper')).map(t => t.dataset.imageId) : [])
    ];
    
    const allAssignedImagesInDropzones = assignedImageIds.every(id => dropzoneImageIds.includes(id));
    
    validationCriteria.variantsAssigned = (unassignedTermsCount === 0 && allAssignedImagesInDropzones && mappings.length > 0);


    // --- Mise à jour de l'interface utilisateur de la checklist ---
    const updateChecklistItemUI = (element, status) => {
        if (element) {
            element.classList.toggle('is-valid', status === true);
            element.classList.toggle('is-invalid', status === false);
            element.classList.toggle('is-na', status === 'na');
        }
    };

    updateChecklistItemUI(checklistItemCustomImages, validationCriteria.customImages);
    updateChecklistItemUI(checklistItemGalleryCount, validationCriteria.galleryCount);
    updateChecklistItemUI(checklistItemMannequin, validationCriteria.mannequinSelected);
    updateChecklistItemUI(checklistItemVariantsAssigned, validationCriteria.variantsAssigned);
	updateChecklistItemUI(checklistItemSizeGuide, validationCriteria.sizeGuide);

    // Mettre à jour le bouton de statut principal
    updateMainStatusButton();
}

/** Met à jour l'icône du bouton de statut principal (✅/❌) */
function updateMainStatusButton() {
    const allValid = Object.values(validationCriteria).every(status => status === true || status === 'na');

    if (productStatusToggleBtn) {
        productStatusToggleBtn.dataset.status = allValid ? '1' : '0';
        if (allValid) {
            productStatusToggleBtn.textContent = '✅';
            productStatusToggleBtn.classList.add('status-active');
            productStatusToggleBtn.classList.remove('status-inactive');
        } else {
            productStatusToggleBtn.textContent = '❌';
            productStatusToggleBtn.classList.add('status-inactive');
            productStatusToggleBtn.classList.remove('status-active');
        }
    }
}

/** Ouvre la modale de la checklist */
function openChecklistModal() {
    if (checklistModal) {
        runAllValidationChecks(); // S'assure que l'affichage est à jour avant d'ouvrir
        checklistModal.style.display = 'flex';
    }
}

/** Ferme la modale de la checklist */
function closeChecklistModal() {
    if (checklistModal) {
        checklistModal.style.display = 'none';
    }
}

// --- Logique de la Modal (Mise à jour pour Swiper) ---


// --- Logique de la Modal ---

function closeModal() {
    console.log('app.js: closeModal called.');
    closeModalFromManager();

    if (isCropperActive()) {
        console.log("app.js: closeModal - Recadrage actif détecté, annulation via cropperManager.");
        cancelCropperFromManager();
    }
}

// Gestionnaire de Clic pour le bouton Réglages (⚙️) - Appelle openImageModal
function handleSettingsClick(event) {
    const button = event.currentTarget;
    const imageId = button.dataset.imageId;
    console.log(`app.js: Clic sur Réglages pour Image ID: ${imageId}`);

    // On récupère les données de la variante depuis notre manager
    const variantAttributeData = variantAttributeManager.getVariantAttributeData();
    
    // On passe ces données à la modale lors de son ouverture
    openImageModalFromManager(imageId, allImageData, variantAttributeData);
}

// Gère le clic sur le bouton "Guide des tailles" dans la modale
function handleSizeGuideToggle(event) {
    // ... (Cette fonction reste inchangée, vous pouvez la garder telle quelle)
    console.log('app.js: handleSizeGuideToggle called.');
    const button = event.currentTarget;
    const imageId = button.dataset.currentImageId;
    if (!imageId) return;
    const imageIdNum = parseInt(imageId, 10);
    const wasActive = button.classList.contains('active-size-guide');
    const newActiveState = !wasActive;
    let previousSizeGuideId = null;
    allImageData.forEach(imgData => {
        const uses = imgData.uses || [];
        const isCurrentlySizeGuide = uses.includes('size_guide');
        const idMatches = imgData.id === imageIdNum;
        if (newActiveState) {
            if (idMatches) {
                if (!isCurrentlySizeGuide) imgData.uses = [...uses, 'size_guide'];
            } else if (isCurrentlySizeGuide) {
                previousSizeGuideId = imgData.id;
                imgData.uses = uses.filter(use => use !== 'size_guide');
            }
        } else {
            if (idMatches && isCurrentlySizeGuide) {
                imgData.uses = uses.filter(use => use !== 'size_guide');
            }
        }
    });
    if (newActiveState) button.classList.add('active-size-guide');
    else button.classList.remove('active-size-guide');
    updateSizeGuideIcon(imageIdNum, newActiveState);
    if (previousSizeGuideId !== null) updateSizeGuideIcon(previousSizeGuideId, false);
    updateStatus("Statut 'Guide des tailles' mis à jour localement.", "info");
}

// Gère le clic sur le bouton "DEL" dans le carrousel OU l'appel direct depuis la modale
function handleMarkForDeletionClick(eventOrButton, directImageId = null) {
    // ... (Cette fonction reste inchangée, vous pouvez la garder telle quelle)
    let imageId, container;
    if (directImageId) {
        imageId = directImageId;
        if (imageCarousel) container = imageCarousel.querySelector(`.carousel-image-container[data-image-id="${imageId}"]`);
    } else {
        const button = eventOrButton.currentTarget;
        imageId = button.dataset.imageId;
        container = button.closest('.carousel-image-container');
    }
    if (!imageId) return;
    const imageIdNum = parseInt(imageId, 10);
    const imageIndex = allImageData.findIndex(img => img.id === imageIdNum);
    if (imageIndex === -1) return;
    allImageData[imageIndex].markedForDeletion = !allImageData[imageIndex].markedForDeletion;
    const isMarked = allImageData[imageIndex].markedForDeletion;
    if (container) {
        const delButtonInCarousel = container.querySelector('.del-btn');
        if (isMarked) {
            container.classList.add('marked-for-deletion');
            if (delButtonInCarousel) delButtonInCarousel.title = 'Annuler le marquage';
        } else {
            container.classList.remove('marked-for-deletion');
            if (delButtonInCarousel) delButtonInCarousel.title = 'Marquer pour suppression';
        }
    }
    const currentModalImgForButton = getCurrentModalImage();
    if (modalOverlay.style.display === 'flex' && modalMarkForDeletionBtn && currentModalImgForButton?.id === imageIdNum) {
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
    updateStatus(`Image ${imageIdNum} ${isMarked ? 'marquée pour suppression' : 'ne sera plus supprimée'}.`, 'info');
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

// Remplacez l'ancienne fonction handleGenerateMockup par celle-ci
async function handleGenerateMockup() {
    console.log('app.js: handleGenerateMockup called, preparing to open image selection.');
    
    if (!selectedMannequinId) {
        updateStatus("Aucun mannequin n'est associé à ce produit.", "error");
        return;
    }

    showLoading("Chargement des images du mannequin...");

    try {
        // Fetcher les données du mannequin spécifique
        const mannequinDataArray = await fetchMannequinsAPI(selectedMannequinId);
        const mannequinData = mannequinDataArray[0]; // L'API renvoie un tableau même pour un seul ID

        if (!mannequinData || !mannequinData.gallery_urls || mannequinData.gallery_urls.length === 0) {
            updateStatus("Aucune image de galerie trouvée pour ce mannequin.", "error");
            hideLoading();
            return;
        }
        
        // Vider le conteneur du swiper
        mannequinImageSwiperWrapper.innerHTML = '';
        
        // Peupler le swiper avec les images de la galerie
        mannequinData.gallery_urls.forEach(url => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Image du mannequin";
            slide.appendChild(img);
            mannequinImageSwiperWrapper.appendChild(slide);
        });

        // Initialiser ou mettre à jour Swiper pour la sous-modale
        if (mannequinImageSwiperInstance) {
            mannequinImageSwiperInstance.destroy(true, true);
        }
        mannequinImageSwiperInstance = new Swiper('.mannequin-image-swiper', {
            loop: mannequinData.gallery_urls.length > 1,
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });

        // Afficher la sous-modale
        mannequinImageSelectionModal.style.display = 'flex';
        
    } catch (error) {
        updateStatus(`Erreur: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
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
    } // ... (suite du try...catch...finally)
    catch (error) {
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

/**
 * Calcule et assigne un tier d'utilisation (vert, orange, rouge) aux mannequins
 * en se basant sur leur product_count, séparément pour les hommes et les femmes.
 * @param {Array<Object>} mannequins - La liste complète des mannequins.
 * @returns {Array<Object>} La liste des mannequins enrichie avec la propriété `usage_tier`.
 */
function calculateUsageTiers(mannequins) {
    const setTiers = (arr) => {
        if (arr.length === 0) return;

        // Trier par nombre de produits, du plus petit au plus grand
        arr.sort((a, b) => a.product_count - b.product_count);

        const third = Math.ceil(arr.length / 3);
        const twoThirds = Math.ceil(arr.length * 2 / 3);

        arr.forEach((m, index) => {
            if (index < third) {
                m.usage_tier = 'green';
            } else if (index < twoThirds) {
                m.usage_tier = 'orange';
            } else {
                m.usage_tier = 'red';
            }
        });
    };

    const hommes = mannequins.filter(m => m.gender === 'homme');
    const femmes = mannequins.filter(m => m.gender === 'femme');

    setTiers(hommes);
    setTiers(femmes);

    return [...hommes, ...femmes];
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
            allMannequinsData = calculateUsageTiers(fetchedData);
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
        // Call to update the main button display when modal closes
        updateMannequinButtonDisplay(); 
    }
}

// This function will render the list of mannequins based on filters and pre-select if applicable
// REMPLACEZ L'ANCIENNE FONCTION renderMannequinList PAR CELLE-CI :
function renderMannequinList(mannequins, filterGender = 'all', filterTier = 'all') {
	console.log(`app.js: renderMannequinList called with filterGender: ${filterGender}, filterTier: ${filterTier}.`);
	if (!mannequinListContainer) return;

	mannequinListContainer.innerHTML = ''; 

	let filteredMannequins = mannequins;

	// Étape 1: Filtrer par genre
	if (filterGender !== 'all') {
		filteredMannequins = filteredMannequins.filter(m => m.gender === filterGender);
	}
	
	// Étape 2: Filtrer par tier d'utilisation
	if (filterTier !== 'all') {
		filteredMannequins = filteredMannequins.filter(m => m.usage_tier === filterTier);
	}

	// NOUVELLE LOGIQUE : Tri et Limitation
	// Étape 3: Trier la liste filtrée par nombre de produits (croissant)
	filteredMannequins.sort((a, b) => a.product_count - b.product_count);

	// Étape 4: Limiter les résultats à 10 SI un filtre de tier est actif
	if (filterTier !== 'all') {
		filteredMannequins = filteredMannequins.slice(0, 10);
		console.log(`app.js: Filtered list limited to 10 mannequins for tier '${filterTier}'.`);
	}
	// FIN DE LA NOUVELLE LOGIQUE

	if (!Array.isArray(filteredMannequins) || filteredMannequins.length === 0) {
		mannequinListContainer.innerHTML = '<p>Aucun mannequin trouvé pour ces filtres.</p>';
		if (mannequinSelectBtn) mannequinSelectBtn.disabled = true;
		return;
	}

	if (mannequinSelectBtn) {
		mannequinSelectBtn.disabled = true;
	}

	filteredMannequins.forEach(mannequin => {
		const mannequinItem = document.createElement('div');
		mannequinItem.className = 'mannequin-item';
		mannequinItem.dataset.mannequinId = mannequin.id;

		const usageIndicator = document.createElement('div');
		usageIndicator.className = `usage-indicator tier-${mannequin.usage_tier}`;
		usageIndicator.textContent = mannequin.product_count;
		usageIndicator.title = `${mannequin.product_count} produits associés`;
		mannequinItem.appendChild(usageIndicator);

		const img = document.createElement('img');
		img.src = mannequin.portrait_url || 'https://via.placeholder.com/80?text=Mannequin';
		img.alt = mannequin.full_name || 'Mannequin';
		mannequinItem.appendChild(img);

		const name = document.createElement('p');
		name.className = 'name';
		name.textContent = mannequin.full_name || 'Nom Inconnu';
		mannequinItem.appendChild(name);

		const gender = document.createElement('p');
		gender.className = 'gender';
		gender.textContent = mannequin.gender === 'homme' ? 'Homme' : (mannequin.gender === 'femme' ? 'Femme' : 'Non spécifié');
		mannequinItem.appendChild(gender);

		mannequinItem.addEventListener('click', () => {
			console.log(`app.js: Mannequin ID ${mannequin.id} clicked for selection.`);
			document.querySelectorAll('#mannequin-list-container .mannequin-item').forEach(item => {
				item.classList.remove('selected');
			});
			mannequinItem.classList.add('selected');
			if (mannequinSelectBtn) mannequinSelectBtn.disabled = false;
		});

		mannequinListContainer.appendChild(mannequinItem);
	});
	
	console.log(`app.js: ${filteredMannequins.length} mannequins rendered.`);

	if (selectedMannequinId !== null) {
		const preSelectedMannequinItem = mannequinListContainer.querySelector(`.mannequin-item[data-mannequin-id="${selectedMannequinId}"]`);
		if (preSelectedMannequinItem) {
			preSelectedMannequinItem.classList.add('selected');
			if (mannequinSelectBtn) mannequinSelectBtn.disabled = false;
		}
	}
}

// --- NOUVELLE FONCTION : Met à jour l'affichage du bouton "Mannequin" sur la page principale ---
function updateMannequinButtonDisplay() {
    console.log('app.js: updateMannequinButtonDisplay called.');
    if (!mannequinChoiceBtn || !mannequinDisplayPortrait || !mannequinDisplayName) {
        console.warn('app.js: Mannequin display button elements not found.');
        return;
    }

    if (selectedMannequinId === null || selectedMannequinId === 0) {
        console.log('app.js: No mannequin selected. Displaying "Aucun mannequin".');
        mannequinChoiceBtn.classList.add('no-mannequin');
        mannequinDisplayPortrait.style.display = 'none'; // Hide image
        mannequinDisplayPortrait.src = ''; // Clear image source
        mannequinDisplayName.textContent = 'Aucun mannequin';
    } else {
        const selectedMannequin = allMannequinsData.find(m => m.id === selectedMannequinId);
        if (selectedMannequin) {
            console.log(`app.js: Mannequin ID ${selectedMannequinId} selected. Displaying portrait and name.`);
            mannequinChoiceBtn.classList.remove('no-mannequin');
            mannequinDisplayPortrait.src = selectedMannequin.portrait_url || 'https://via.placeholder.com/30?text=NA';
            mannequinDisplayPortrait.style.display = 'inline-block'; // Show image
            mannequinDisplayName.textContent = selectedMannequin.full_name || `${selectedMannequin.first_name} ${selectedMannequin.last_name}`;
        } else {
            console.warn(`app.js: Selected Mannequin ID ${selectedMannequinId} not found in allMannequinsData. Displaying "Chargement..." or "Inconnu".`);
            mannequinChoiceBtn.classList.add('no-mannequin');
            mannequinDisplayPortrait.style.display = 'none';
            mannequinDisplayPortrait.src = '';
            mannequinDisplayName.textContent = 'Mannequin inconnu'; // Fallback if data not found
        }
    }
}


// DANS js/app.js, REMPLACEZ LA FONCTION fetchProductData EXISTANTE PAR CELLE-CI :

const fetchProductData = async () => {
    updateStatus("Récupération des données produit...", 'info');
    if (productNameElement) productNameElement.textContent = 'Chargement...';
    
    if (imageCarousel) imageCarousel.innerHTML = '<p>Chargement...</p>';
    allImageData = [];

    try {
        const data = await fetchProductDataAPI(currentProductId);
        console.log('app.js: Parsed JSON data:', data);
        updateStatus("Données reçues. Affichage...", 'info');

        // --- Logique du titre et du lien (corrigée et intégrée) ---
        if (productNameElement) {
            const fullTitle = data.productName || 'Non trouvé';
            if (fullTitle.length > 45) {
                productNameElement.textContent = fullTitle.substring(0, 45) + '...';
            } else {
                productNameElement.textContent = fullTitle;
            }
        }
        if (aliexpressLinkElement) {
            // Note: j'utilise la clé 'aliexpress-link' comme vous l'avez mentionné.
            if (data['aliexpress-link']) { 
                aliexpressLinkElement.href = data['aliexpress-link'];
                aliexpressLinkElement.style.display = 'inline-block';
            } else {
                aliexpressLinkElement.style.display = 'none';
            }
        }
        // --- Fin de la logique du titre ---

        selectedMannequinId = data.linked_mannequin_id ? parseInt(data.linked_mannequin_id, 10) : null;
        if (selectedMannequinId === 0) selectedMannequinId = null;
        
        try {
            let fetchedMannequins = await fetchMannequinsAPI();
            if (!Array.isArray(fetchedMannequins)) {
                fetchedMannequins = [fetchedMannequins];
            }
            allMannequinsData = fetchedMannequins;
        } catch (mannequinError) {
            console.error('app.js: Error fetching all mannequins for initial button display:', mannequinError);
            allMannequinsData = [];
        }
        
        updateMannequinButtonDisplay();

        if (data.images && Array.isArray(data.images)) {
            allImageData = data.images;

            if (productStatusToggleBtn) {
                const status = data.image_processing_status || 0;
                productStatusToggleBtn.dataset.status = status.toString();
                if (parseInt(status) === 1) {
                    productStatusToggleBtn.textContent = '✅';
                    productStatusToggleBtn.classList.remove('status-inactive');
                    productStatusToggleBtn.classList.add('status-active');
                } else {
                    productStatusToggleBtn.textContent = '❌';
                    productStatusToggleBtn.classList.remove('status-active');
                    productStatusToggleBtn.classList.add('status-inactive');
                }
            }

            initializeSortableManager(
                allImageData,
                handleSettingsClick,
                handleMarkForDeletionClick,
                variantAttributeManager.refreshIndicatorForImage,
            );

            if (data.variantAttribute && data.variantAttribute.attribute_slug) {
				currentAttributeSlug = data.variantAttribute.attribute_slug;
				variantAttributeManager.initVariantHandler(data.variantAttribute, allImageData, variantAttributeManager.refreshIndicatorForImage);
				if(resetVariantsBtn) resetVariantsBtn.style.display = 'inline-block';
				if(noVariantsMessage) noVariantsMessage.style.display = 'none';
			} else {
				const variantContainer = document.getElementById('variant-assignment-container');
				if(variantContainer) variantContainer.style.display = 'block';
				if(resetVariantsBtn) resetVariantsBtn.style.display = 'none';
				if(noVariantsMessage) noVariantsMessage.style.display = 'block';
				const availableTermsContainer = document.getElementById('available-terms-container'); // Correction : définir la variable avant de l'utiliser
				if(availableTermsContainer) availableTermsContainer.style.display = 'none';
			}

            updateStatus("Images affichées. Glissez pour assigner/réassigner.", 'success');
        } else {
            console.error("app.js: Format de données invalide : 'images' manquant ou n'est pas un tableau.");
            if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur format données.</p>';
            updateStatus("Erreur format données images.", 'error');
            initializeSortableManager([], handleSettingsClick, handleMarkForDeletionClick, variantAttributeManager.refreshIndicatorForImage);
        }
    } catch (error) {
        console.error("app.js: Erreur fetchProductData:", error);
        updateStatus(`Erreur chargement: ${error.message}`, 'error');
        if (productNameElement) productNameElement.textContent = 'Erreur';
        if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur chargement.</p>';
        initializeSortableManager([], handleSettingsClick, handleMarkForDeletionClick, variantAttributeManager.refreshIndicatorForImage);
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
    if (modalDissociateTermBtn) {
        modalDissociateTermBtn.addEventListener('click', (event) => {
            console.log('app.js: Dissociate Term button clicked.');
            const imageId = event.currentTarget.dataset.imageId;
            const termSlug = event.currentTarget.dataset.termSlug;

            if (!imageId || !termSlug) {
                console.error("app.js: Missing imageId or termSlug on dissociate button.");
                return;
            }

            // Appel à la fonction générique du nouveau manager
            const success = variantAttributeManager.dissociateTermFromImage(imageId, termSlug, allImageData);

            if (success) {
                // Rafraîchir la modale pour refléter la dissociation
                refreshCurrentModalViewDataFromManager(allImageData);
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
	
	registerOnStatusUpdateCallback(runAllValidationChecks);
    // Écouteur pour le bouton de statut de traitement des images
    if (productStatusToggleBtn) {
        productStatusToggleBtn.addEventListener('click', () => {
            console.log('app.js: productStatusToggleBtn clicked. Opening checklist modal.');
            // L'ancienne logique de toggle est remplacée par l'ouverture de la modale
            openChecklistModal();
        });
    }
	if (checklistModalCloseBtn) {
        checklistModalCloseBtn.addEventListener('click', closeChecklistModal);
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
            closeMannequinSelectionModal(); // This will also call updateMannequinButtonDisplay
        });
        console.log('app.js: Mannequin Select button event listener attached.');
    }
    // --- Gestion des filtres de la modale mannequin ---
    const updateFilters = () => {
        // Trouve quel filtre de genre est actif
        const activeGenderFilter = document.querySelector('.mannequin-filters .action-btn[data-gender].active-filter');
        // Trouve quel filtre de couleur est actif (s'il y en a un)
        const activeTierFilter = document.querySelector('.mannequin-filters .tier-filter-btn.active-filter');

        // Récupère les valeurs des filtres actifs, ou 'all' par défaut
        const gender = activeGenderFilter ? activeGenderFilter.dataset.gender : 'all';
        const tier = activeTierFilter ? activeTierFilter.dataset.tier : 'all';
        
        // Appelle la fonction de rendu avec les deux filtres
        renderMannequinList(allMannequinsData, gender, tier);
    };

    const handleGenderFilterClick = (event) => {
        // Gère le clic sur les filtres de genre (Tous, Homme, Femme)
        document.querySelectorAll('.mannequin-filters .action-btn[data-gender]').forEach(btn => btn.classList.remove('active-filter'));
        event.currentTarget.classList.add('active-filter');
        updateFilters(); // Met à jour la liste
    };

    const handleTierFilterClick = (event) => {
        // Gère le clic sur les filtres de couleur (vert, orange, rouge)
        const clickedButton = event.currentTarget;
        
        // Si on clique sur un bouton déjà actif, on le désactive (revient à 'tous')
        if (clickedButton.classList.contains('active-filter')) {
            clickedButton.classList.remove('active-filter');
        } else {
            // Sinon, on active le bouton cliqué et on désactive les autres filtres de couleur
            document.querySelectorAll('.mannequin-filters .tier-filter-btn').forEach(btn => btn.classList.remove('active-filter'));
            clickedButton.classList.add('active-filter');
        }
        updateFilters(); // Met à jour la liste
    };
    
    // On attache les bonnes fonctions aux bons boutons
    if (mannequinFilterAll) mannequinFilterAll.addEventListener('click', handleGenderFilterClick);
    if (mannequinFilterHomme) mannequinFilterHomme.addEventListener('click', handleGenderFilterClick);
    if (mannequinFilterFemme) mannequinFilterFemme.addEventListener('click', handleGenderFilterClick);
    
    if (mannequinFilterGreen) mannequinFilterGreen.addEventListener('click', handleTierFilterClick);
    if (mannequinFilterOrange) mannequinFilterOrange.addEventListener('click', handleTierFilterClick);
    if (mannequinFilterRed) mannequinFilterRed.addEventListener('click', handleTierFilterClick);
	
	// --- NOUVEAUX ÉCOUTEURS POUR LA SOUS-MODALE D'IMAGE MANNEQUIN ---
    if (mannequinImageModalCloseBtn) {
        mannequinImageModalCloseBtn.addEventListener('click', () => {
            mannequinImageSelectionModal.style.display = 'none';
        });
    }

    if (mannequinImageCancelBtn) {
        mannequinImageCancelBtn.addEventListener('click', () => {
            mannequinImageSelectionModal.style.display = 'none';
        });
    }

    if (mannequinImageValidateBtn) {
        mannequinImageValidateBtn.addEventListener('click', () => {
            console.log("Validation de l'image mannequin cliquée.");
            // Récupérer l'image source du slide actif dans le swiper
            const activeSlide = mannequinImageSwiperInstance.slides[mannequinImageSwiperInstance.activeIndex];
            const selectedMannequinImageUrl = activeSlide.querySelector('img').src;

            if (!selectedMannequinImageUrl) {
                updateStatus("Erreur: Impossible de récupérer l'URL de l'image sélectionnée.", "error");
                return;
            }

            mannequinImageSelectionModal.style.display = 'none';
            
            // Préparer le contexte pour actionsManager, comme avant
            const imageToProcess = getCurrentModalImage(); // Image du produit, de la modale principale
            currentEditActionContext = {
                type: 'generateMockup',
                imageData: imageToProcess,
                payloadData: {
                    linked_mannequin_id: selectedMannequinId,
                    mannequinImageUrl: selectedMannequinImageUrl // <-- On ajoute l'URL de l'image choisie
                }
            };
            
            // Lancer l'action
            callExecuteConfirmedActionWithUiManagement('new');
        });
    }
	
	// AJOUTEZ CET ÉCOUTEUR
    if (resetVariantsBtn) {
        resetVariantsBtn.addEventListener('click', () => {
            // Demande de confirmation
            if (confirm("Êtes-vous sûr de vouloir réinitialiser TOUTES les associations de variantes ?")) {
                variantAttributeManager.dissociateAllTerms(allImageData);
            }
        });
    }
	
	if (sizeGuideNaBtn) {
        sizeGuideNaBtn.addEventListener('click', () => {
            // Bascule entre 'non applicable' et 'invalide'
            validationCriteria.sizeGuide = (validationCriteria.sizeGuide === 'na' ? false : 'na');
            runAllValidationChecks(); // Met à jour l'UI
        });
    }

    // Récupérer les données initiales
    fetchProductData();
    console.log('app.js: fetchProductData() called.');

}); // Fin de DOMContentLoaded