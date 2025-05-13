import {
    N8N_GET_DATA_WEBHOOK_URL,
    N8N_UPDATE_DATA_WEBHOOK_URL,
    N8N_CROP_IMAGE_WEBHOOK_URL,
    N8N_REMOVE_WATERMARK_WEBHOOK_URL,
    N8N_GENERATE_MOCKUP_WEBHOOK_URL
} from './config.js';
console.log('app.js main script loaded, N8N URLs imported.');

import { initDomElements, productIdElement, productNameElement, saveChangesButton, statusElement, dropzoneMain, dropzoneGallery, dropzoneCustom, imageCarouselContainer, imageCarousel, modalOverlay, modalCloseBtn, /* modalImageContainer, */ modalSwiperContainer, modalSwiperWrapper, modalImageId, modalImageDimensions, modalPrevBtn, modalNextBtn, modalActions, modalImageInfo, modalCropperContainer, imageToCropElement, modalCropBtn, modalCropValidateBtn, modalCropCancelBtn, cropperDataDisplay, cropDataX, cropDataY, cropDataWidth, cropDataHeight, cropperAspectRatioButtonsContainer, modalRemoveWatermarkBtn, modalGenerateMockupBtn, modalMarkForDeletionBtn, editActionConfirmationOverlay, confirmActionReplaceBtn, confirmActionNewBtn, confirmActionCancelBtn, loadingOverlay, modalToggleSizeGuideBtn } from './dom.js';
console.log('app.js: DOM element variables and init function imported.');

import { updateStatus, showLoading, hideLoading, resetModalToActionView } from './uiUtils.js';
console.log('app.js: UI utility functions imported.');

import { fetchProductDataAPI, saveChangesAPI, executeImageActionAPI } from './apiService.js';
console.log('app.js: API service functions imported.');

import { initializeSortableManager } from './sortableManager.js';
console.log('app.js: Sortable manager function imported.');

// --- Variables Globales ---
let currentProductId = null;
let allImageData = [];
// let sortableCarousel = null; // <<< À SUPPRIMER
// let sortableZones = {};    // <<< À SUPPRIMER
let modalSwiperInstance = null;
let modalImageList = [];
let currentModalIndex = 0;
let cropperInstance = null; // Instance Cropper.js active
let currentCroppingImage = null; // Données de l'image en cours de recadrage
let currentEditActionContext = null;

// --- Fonctions Utilitaires ---

// Met à jour l'affichage de l'icône Guide des Tailles sur une miniature ou un item de carrousel
function updateSizeGuideIcon(imageId, isSizeGuide) {
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
    console.log(`Icône Guide des Tailles mise à jour pour ID ${imageId}: ${isSizeGuide}`);
}

// --- Enregistrement des Modifications ---
// Elle collecte toujours les IDs depuis les .thumbnail-wrapper présents dans les zones au moment du clic.
const handleSaveChanges = async () => {
    showLoading("Sauvegarde des rôles...");
    updateStatus("Enregistrement des modifications...", 'info');
    if(saveChangesButton) saveChangesButton.disabled = true;

    const mainImageThumb = dropzoneMain ? dropzoneMain.querySelector('.thumbnail-wrapper') : null;
    const mainImageId = mainImageThumb ? mainImageThumb.dataset.imageId : null;

    const galleryImageThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper') : [];
    const galleryImageIds = Array.from(galleryImageThumbs).map(wrapper => wrapper.dataset.imageId);

    const customGalleryThumbs = dropzoneCustom ? dropzoneCustom.querySelectorAll('.thumbnail-wrapper') : [];
    const customGalleryImageIds = Array.from(customGalleryThumbs).map(wrapper => wrapper.dataset.imageId);

    // Trouver l'ID de l'image désignée comme guide des tailles (ou null)
    const sizeGuideEntry = allImageData.find(imgData => imgData.uses && imgData.uses.includes('size_guide'));
    const sizeGuideImageId = sizeGuideEntry ? sizeGuideEntry.id : null;
    console.log(`Image Guide des Tailles sélectionnée pour sauvegarde: ID ${sizeGuideImageId}`);

    // **** AJOUT : Collecter les IDs des images marquées pour suppression ****
    const imageIdsToDelete = allImageData
        .filter(imgData => imgData.markedForDeletion === true)
        .map(imgData => imgData.id);
    console.log(`Images marquées pour suppression (IDs): ${imageIdsToDelete.join(', ') || 'Aucune'}`);
    // **** FIN AJOUT ****
    
    const payload = {
        productId: currentProductId,
        mainImageId: mainImageId,
        galleryImageIds: galleryImageIds,
        customGalleryImageIds: customGalleryImageIds,
        sizeGuideImageId: sizeGuideImageId, // **** AJOUTER CETTE LIGNE ****
        imageIdsToDelete: imageIdsToDelete // **** AJOUTER CE CHAMP AU PAYLOAD ****
    };
    console.log("Données envoyées à n8n:", payload);

    try {
        //const response = await fetch(N8N_UPDATE_DATA_WEBHOOK_URL, {
        //    method: 'POST',
        //    headers: { 'Content-Type': 'application/json' },
        //    body: JSON.stringify(payload)
        //});
        //if (!response.ok) {
        //    let errorMsg = `Erreur serveur n8n: ${response.status}`;
        //    try {
        //        const errorData = await response.json();
        //        errorMsg = errorData.message || JSON.stringify(errorData);
        //    } catch (e) { console.warn("Impossible de parser la réponse d'erreur JSON de n8n."); }
        //   throw new Error(errorMsg);
        //}
        //const result = await response.json();

        // NOUVELLE LIGNE : Appel à la fonction API
        const result = await saveChangesAPI(payload);
        
        console.log("Réponse de n8n (Mise à jour):", result);
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
             if (modalSwiperInstance) {
                  // Il faudrait reconstruire modalImageList ou la filtrer et update Swiper
                  // Pour l'instant, on peut simplement fermer la modale si l'image active a été supprimée
                  const currentModalImageId = modalImageList[currentModalIndex]?.id;
                  if (currentModalImageId && imageIdsToDelete.includes(currentModalImageId)) {
                      closeModal();
                      updateStatus("Modifications enregistrées. L'image affichée a été supprimée.", 'info');
                  }
             }
        }
    } catch (error) {
        console.error("Erreur lors de l'enregistrement via n8n:", error);
        updateStatus(`Erreur enregistrement: ${error.message}`, 'error');
    } finally {
        if(saveChangesButton) saveChangesButton.disabled = false;
        hideLoading();
    }
};

// --- Logique de la Modal (Mise à jour pour Swiper) ---

// Met à jour les infos affichées sous l'image dans la modale
function updateModalInfo(index) {
    if (index >= 0 && index < modalImageList.length) {
        const imageData = modalImageList[index];
        if (modalImageId) modalImageId.textContent = imageData.id;
        // if (modalImageRoles) modalImageRoles.textContent = imageData.uses.join(', ') || 'Aucun'; // ANCIENNE LIGNE
        currentModalIndex = index;
        console.log(`Modal info mise à jour pour slide ${index}, ID: ${imageData.id}`);

        // Afficher les dimensions de l'image
        if (modalImageDimensions) {
            modalImageDimensions.textContent = 'Chargement...'; // Message temporaire
            const img = new Image();
            img.onload = function() {
                // Vérifier si on est toujours sur la même image (au cas où l'utilisateur swipe rapidement)
                if (modalImageList[currentModalIndex]?.id === imageData.id) {
                    modalImageDimensions.textContent = `${this.naturalWidth}x${this.naturalHeight}`;
                    // modalImageDimensions.textContent = `<span class="math-inline">\{this\.naturalWidth\}x</span>{this.naturalHeight}`;
                    // modalImageDimensions.textContent = `<span class="math-inline">\{this\.naturalWidth\}x</span>{this.naturalHeight}`;
                }
            };
            img.onerror = function() {
                if (modalImageList[currentModalIndex]?.id === imageData.id) {
                    modalImageDimensions.textContent = 'N/A';
                }
            };
            img.src = imageData.url; // L'URL de l'image actuelle
        }

        if (modalToggleSizeGuideBtn) {
            const imageInAllData = allImageData.find(imgData => imgData.id === imageData.id);
            if (imageInAllData && imageInAllData.uses && imageInAllData.uses.includes('size_guide')) {
                modalToggleSizeGuideBtn.classList.add('active-size-guide');
            } else {
                modalToggleSizeGuideBtn.classList.remove('active-size-guide');
            }
            // Stocker l'ID de l'image actuelle sur le bouton pour l'event listener
            modalToggleSizeGuideBtn.dataset.currentImageId = imageData.id;
        }
        
        // Gérer la visibilité et l'état du bouton "DEL" dans la modale (logique existante)
        if (modalMarkForDeletionBtn) {
            const imageInAllData = allImageData.find(imgData => imgData.id === imageData.id);
            const isMain = dropzoneMain?.querySelector(`.thumbnail-wrapper[data-image-id="${imageData.id}"]`);
            const isGallery = dropzoneGallery?.querySelector(`.thumbnail-wrapper[data-image-id="${imageData.id}"]`);
            const isCustom = dropzoneCustom?.querySelector(`.thumbnail-wrapper[data-image-id="${imageData.id}"]`);
            const isAssigned = isMain || isGallery || isCustom;
            const currentSlideElement = modalSwiperInstance?.slides[currentModalIndex];


            if (!isAssigned && imageInAllData) {
                modalMarkForDeletionBtn.style.display = 'inline-block';
                modalMarkForDeletionBtn.onclick = () => {
                    handleMarkForDeletionClick({ currentTarget: modalMarkForDeletionBtn }, imageData.id.toString());
                    // Le reste de la logique de mise à jour du bouton DEL est maintenant dans handleMarkForDeletionClick
                };

                if (imageInAllData.markedForDeletion) {
                    modalMarkForDeletionBtn.textContent = 'UNDO';
                    modalMarkForDeletionBtn.classList.add('marked');
                    if (currentSlideElement) currentSlideElement.classList.add('marked-for-deletion-slide');
                } else {
                    modalMarkForDeletionBtn.textContent = 'DEL';
                    modalMarkForDeletionBtn.classList.remove('marked');
                    if (currentSlideElement) currentSlideElement.classList.remove('marked-for-deletion-slide');
                }
            } else {
                modalMarkForDeletionBtn.style.display = 'none';
                modalMarkForDeletionBtn.onclick = null;
                // S'assurer de retirer le style de suppression du slide si l'image est assignée
                if (currentSlideElement) currentSlideElement.classList.remove('marked-for-deletion-slide');
            }
        }
    }
}

// Ouvre la modal et initialise Swiper
function openImageModal(imageId) {
    console.log(`Ouverture modal pour image ID: ${imageId}`);
    // 1. Déterminer la liste d'images à afficher
    // Pour l'instant, on affiche TOUTES les images du produit
    // TODO: Plus tard, on pourrait affiner pour n'afficher que celles de la zone cliquée + carousel ?
    //modalImageList = [...allImageData]; // Copie de toutes les images
    // Construire modalImageList dans l'ordre souhaité
    const orderedImages = [];
    const encounteredIds = new Set(); // Pour éviter les doublons dans Swiper si une image avait plusieurs rôles (peu probable mais sécurisant)

    // Fonction utilitaire pour ajouter une image si pas déjà rencontrée
    const addImageToOrderedList = (img) => {
        if (img && !encounteredIds.has(img.id)) {
            orderedImages.push(img);
            encounteredIds.add(img.id);
        }
    };

    // 1.1 Image Principale
    const mainImageThumb = dropzoneMain ? dropzoneMain.querySelector('.thumbnail-wrapper') : null;
    if (mainImageThumb) {
        const mainImgId = mainImageThumb.dataset.imageId;
        const mainImgData = allImageData.find(img => img.id.toString() === mainImgId);
        addImageToOrderedList(mainImgData);
    }

    // 1.2. Images Custom
    const customGalleryThumbs = dropzoneCustom ? dropzoneCustom.querySelectorAll('.thumbnail-wrapper') : [];
    Array.from(customGalleryThumbs).forEach(thumb => {
        const customImgId = thumb.dataset.imageId;
        const customImgData = allImageData.find(img => img.id.toString() === customImgId);
        addImageToOrderedList(customImgData);
    });

    // 1.3. Images Galerie Standard
    const galleryImageThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper') : [];
    Array.from(galleryImageThumbs).forEach(thumb => {
        const galleryImgId = thumb.dataset.imageId;
        const galleryImgData = allImageData.find(img => img.id.toString() === galleryImgId);
        addImageToOrderedList(galleryImgData);
    });

    // 1.4. Images Disponibles (celles dans le carrousel #image-carousel)
    // Celles-ci sont dans allImageData mais PAS dans encounteredIds
    allImageData.forEach(img => {
        if (!encounteredIds.has(img.id) && !img.markedForDeletion) { // On ajoute celles non marquées pour suppression
            addImageToOrderedList(img);
        }
    });
    
    // Si aucune image n'a été spécifiquement assignée et qu'il n'y a que des images dans allImageData (carrousel)
    // et que orderedImages est vide, alors on remplit avec allImageData.
    // Cela peut arriver si on ouvre la modale depuis une image du carrousel avant toute assignation.
    if (orderedImages.length === 0 && allImageData.length > 0) {
        allImageData.forEach(img => {
            if (!img.markedForDeletion) { // On ajoute celles non marquées pour suppression
                 addImageToOrderedList(img);
            }
        });
    }


    modalImageList = orderedImages;
    console.log('Modal Image List (ordered):', modalImageList.map(img => img.id));
    
    // La suite de la fonction openImageModal (trouver initialIndex, peupler Swiper, etc.) reste la même.
    
    // 2. Trouver l'index de départ
    const initialIndex = modalImageList.findIndex(img => img.id.toString() === imageId);
    if (initialIndex === -1) {
        console.error(`Image ID ${imageId} non trouvée dans modalImageList.`);
        updateStatus(`Erreur: image ${imageId} non trouvée.`, 'error');
        return;
    }
    currentModalIndex = initialIndex;
    console.log(`Index initial: ${initialIndex}`);
    
    // 3. Peupler le wrapper Swiper dynamiquement
    if (modalSwiperWrapper) {
        modalSwiperWrapper.innerHTML = ''; // Vider les anciens slides
        modalImageList.forEach(imageData => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            const img = document.createElement('img');
            img.src = imageData.url;
            img.alt = `Image ID ${imageData.id}`;
            // Lazy loading natif ou Swiper ? Swiper a des options pour ça.
             img.loading = 'lazy'; // Ajout lazy loading simple
            slide.appendChild(img);
            modalSwiperWrapper.appendChild(slide);
        });
        console.log(`${modalImageList.length} slides créés pour Swiper.`);
    } else {
         console.error("Wrapper Swiper (#modal-swiper-wrapper) non trouvé !");
         return;
    }

    // 4. Détruire l'ancienne instance Swiper si elle existe
    if (modalSwiperInstance) {
        modalSwiperInstance.destroy(true, true);
        modalSwiperInstance = null;
         console.log("Ancienne instance Swiper détruite.");
    }

    // 5. Initialiser Swiper
    try {
         modalSwiperInstance = new Swiper('.modal-swiper', {
             // Options Swiper
             initialSlide: initialIndex, // Commence sur l'image cliquée
             spaceBetween: 10, // Espace entre slides (si visibles)
             // Navigation avec nos boutons personnalisés
             navigation: {
               nextEl: '#modal-next-btn',
               prevEl: '#modal-prev-btn',
             },
              // Optionnel: autres modules utiles
              keyboard: { // Contrôle clavier
                enabled: true,
              },
             // lazy: true, // Chargement lazy des images géré par Swiper
             loop: modalImageList.length > 1, // Boucle si plus d'une image?
             observer: true, // Met à jour Swiper si le DOM change (utile?)
             observeParents: true,

             // Événement quand le slide change
             on: {
                 slideChange: function () {
                     console.log(`Slide changé vers index: ${this.activeIndex}`);
                     updateModalInfo(this.activeIndex); // Met à jour les infos (ID, Dimensions, et l'état du bouton Guide des Tailles)
                     
                     // La logique de mise à jour du bouton modalToggleSizeGuideBtn
                     // est maintenant gérée DANS updateModalInfo().
                     // Donc, plus besoin de la dupliquer ici.
                 },
                  init: function() {
                      // Met à jour les infos pour le slide initial juste après l'init
                      updateModalInfo(this.activeIndex); // Ceci va aussi régler l'état initial du bouton Guide des tailles
                       console.log("Swiper initialisé.");
                  }
             },
         });
    } catch (e) {
         console.error("Erreur lors de l'initialisation de Swiper:", e);
         updateStatus("Erreur initialisation Swiper.", 'error');
         return; // Ne pas afficher la modal si Swiper échoue
    }

    // Assurer l'état initial des boutons d'action et du cropper
    resetModalToActionView(); // Réinitialise l'affichage (cache cropper, montre actions)

    // 6. Afficher la modal
    if (modalOverlay) modalOverlay.style.display = 'flex';
}

// Ferme la modal et détruit Swiper
function closeModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
    // Détruire l'instance Swiper pour libérer la mémoire et éviter conflits
    if (modalSwiperInstance) {
        modalSwiperInstance.destroy(true, true); // true, true nettoie tout (listeners, styles)
        modalSwiperInstance = null;
         console.log("Instance Swiper détruite.");
    }
     if (cropperInstance) { // Détruit Cropper s'il était actif
        cropperInstance.destroy();
        cropperInstance = null;
    }
    currentCroppingImage = null; // Oublie l'image en cours de recadrage
    console.log("Modal fermée et instances nettoyées.");
}

// Gestionnaire de Clic pour le bouton Réglages (⚙️) - Appelle openImageModal
function handleSettingsClick(event) {
    const button = event.currentTarget;
    const imageId = button.dataset.imageId; // Récupère l'ID depuis le bouton
    console.log(`Clic sur Réglages pour Image ID: ${imageId}`);
    openImageModal(imageId); // Ouvre la modal pour cette image
}

// Gère le clic sur le bouton "Guide des tailles" dans la modale
function handleSizeGuideToggle(event) { // L'événement vient maintenant du bouton
    const button = event.currentTarget;
    const imageId = button.dataset.currentImageId;

    if (!imageId) {
        console.error("Impossible de trouver l'ID de l'image associée au bouton Guide des tailles.");
        return;
    }
    const imageIdNum = parseInt(imageId, 10);

    // Déterminer si on active ou désactive (basé sur la présence de la classe 'active-size-guide')
    const wasActive = button.classList.contains('active-size-guide');
    const newActiveState = !wasActive;

    console.log(`Toggle Guide des Tailles pour ID ${imageIdNum}. Nouveau statut actif: ${newActiveState}`);

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
    let imageId;
    let container; // Conteneur de l'image dans le carrousel

    if (directImageId) {
        imageId = directImageId;
        // Essayer de trouver le conteneur dans le carrousel pour la synchro visuelle si possible
        container = imageCarousel.querySelector(`.carousel-image-container[data-image-id="${imageId}"]`);
    } else { // Vient d'un événement de clic
        const button = eventOrButton.currentTarget;
        imageId = button.dataset.imageId;
        container = button.closest('.carousel-image-container');
    }


    if (!imageId) { // || (!container && !directImageId) enlevé car container peut être null si appelé directement pour une image non dans le carousel
        console.error("Impossible de trouver l'ID pour marquer pour suppression.");
        return;
    }

    const imageIdNum = parseInt(imageId, 10);
    const imageIndex = allImageData.findIndex(img => img.id === imageIdNum);

    if (imageIndex === -1) {
        console.error(`Image ID ${imageIdNum} non trouvée dans allImageData.`);
        return;
    }

    allImageData[imageIndex].markedForDeletion = !allImageData[imageIndex].markedForDeletion;
    const isMarked = allImageData[imageIndex].markedForDeletion;

    console.log(`Image ID ${imageIdNum} marquée pour suppression: ${isMarked}`);

    // Mettre à jour l'apparence visuelle du carrousel SI l'élément y est
    if (container) {
        const delButtonInCarousel = container.querySelector('.del-btn'); // Le bouton DEL du carrousel
        if (isMarked) {
            container.classList.add('marked-for-deletion');
            if (delButtonInCarousel) delButtonInCarousel.title = 'Annuler le marquage pour suppression';
        } else {
            container.classList.remove('marked-for-deletion');
            if (delButtonInCarousel) delButtonInCarousel.title = 'Marquer pour suppression définitive';
        }
    } else if (directImageId) {
        console.log(`Image ${directImageId} (appel direct) marquée/démarquée. Pas de conteneur carrousel trouvé pour màj visuelle immédiate (normal si elle n'y est plus).`);
    }


    // Mettre à jour l'apparence du bouton dans la modale si elle est ouverte et concerne cette image
    if (modalOverlay.style.display === 'flex' && modalMarkForDeletionBtn && modalImageList[currentModalIndex]?.id === imageIdNum) {
        if (isMarked) {
            modalMarkForDeletionBtn.textContent = 'UNDO';
            modalMarkForDeletionBtn.classList.add('marked');
        } else {
            modalMarkForDeletionBtn.textContent = 'DEL';
            modalMarkForDeletionBtn.classList.remove('marked');
        }
    }

    // Mettre aussi à jour l'apparence du slide Swiper si l'image est actuellement affichée
    const currentSlideElementInModal = modalSwiperInstance?.slides[currentModalIndex];
    if (currentSlideElementInModal && modalImageList[currentModalIndex]?.id === imageIdNum) {
        if (isMarked) {
            currentSlideElementInModal.classList.add('marked-for-deletion-slide');
        } else {
            currentSlideElementInModal.classList.remove('marked-for-deletion-slide');
        }
    }

    updateStatus(`Image ${imageIdNum} ${isMarked ? 'marquée pour suppression' : 'ne sera plus supprimée'}. Enregistrez pour appliquer.`, 'info');
}

// --- NOUVELLE Logique de Recadrage (Cropper.js) ---

// Initialise l'interface de recadrage
function startCropping() {
    if (currentModalIndex < 0 || currentModalIndex >= modalImageList.length) {
        console.error("Index modal invalide.");
        return;
    }
    currentCroppingImage = modalImageList[currentModalIndex];
    console.log(`Démarrage recadrage pour Image ID: ${currentCroppingImage.id}`);

    // 1. Préparer l'interface visuelle
    if (modalSwiperContainer) modalSwiperContainer.style.display = 'none';
    if (modalPrevBtn) modalPrevBtn.style.display = 'none';
    if (modalNextBtn) modalNextBtn.style.display = 'none';
    if (modalImageInfo) modalImageInfo.style.display = 'none';
    if (modalCropBtn) modalCropBtn.style.display = 'none';
    if (modalRemoveWatermarkBtn) modalRemoveWatermarkBtn.style.display = 'none';
    if (modalGenerateMockupBtn) modalGenerateMockupBtn.style.display = 'none';
    if (modalMarkForDeletionBtn) modalMarkForDeletionBtn.style.display = 'none';
    if (modalToggleSizeGuideBtn) modalToggleSizeGuideBtn.style.display = 'none'; // <-- NOUVELLE LIGNE
    if (modalCropValidateBtn) modalCropValidateBtn.style.display = 'none';
    if (modalCropCancelBtn) modalCropCancelBtn.style.display = 'none';

    // 2. Préparer l'image et le conteneur pour Cropper
    if (modalCropperContainer && imageToCropElement) {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
            console.log("Ancienne instance Cropper détruite.");
        }
        imageToCropElement.src = ""; // Vider src pour assurer que onload se redéclenche
        imageToCropElement.style.opacity = '0';
        imageToCropElement.classList.remove('loaded');
        modalCropperContainer.style.display = 'block'; // Afficher conteneur

        // Définir les gestionnaires d'événements AVANT de définir le src
        imageToCropElement.onload = () => {
            console.log("Image chargée dans le conteneur Cropper.");
            imageToCropElement.style.opacity = '1';
            imageToCropElement.classList.add('loaded');

            // Initialiser Cropper.js MAINTENANT
            try {
                 cropperInstance = new Cropper(imageToCropElement, {
                    viewMode: 1,
                    dragMode: 'move',
                    //aspectRatio: 1 / 1,
                    autoCropArea: 0.85,
                    movable: true,
                    rotatable: false,
                    scalable: true,
                    zoomable: true,
                    zoomOnWheel: true,
                    guides: true,
                    background: true,
                    responsive: true,
                    crop(event) {
                        if (cropDataX) cropDataX.textContent = Math.round(event.detail.x);
                        if (cropDataY) cropDataY.textContent = Math.round(event.detail.y);
                        if (cropDataWidth) cropDataWidth.textContent = Math.round(event.detail.width);
                        if (cropDataHeight) cropDataHeight.textContent = Math.round(event.detail.height);
                    },
                    ready() {
                        console.log("Cropper.js est prêt (ready event)!");
                    
                        // VOTRE CODE ORIGINAL - à conserver pour les boutons Valider/Annuler
                        if (modalCropValidateBtn) {
                            modalCropValidateBtn.style.display = 'inline-block';
                            modalCropValidateBtn.disabled = false;
                            modalCropValidateBtn.onclick = validateCropping; // Assurez-vous que validateCropping est bien défini
                        }
                        if (modalCropCancelBtn) {
                            modalCropCancelBtn.style.display = 'inline-block';
                            modalCropCancelBtn.disabled = false;
                            modalCropCancelBtn.onclick = cancelCropping; // Assurez-vous que cancelCropping est bien défini
                        }
                    
                        // AJOUTS POUR LES DIMENSIONS ET LES BOUTONS DE RATIO
                        // Afficher le conteneur des données de recadrage (dimensions en px)
                        if (cropperDataDisplay) {
                            cropperDataDisplay.style.display = 'block';
                        }
                    
                        // Afficher le conteneur des boutons de ratio d'aspect
                        if (cropperAspectRatioButtonsContainer) {
                            cropperAspectRatioButtonsContainer.style.display = 'flex'; // Ou 'block' selon votre CSS
                        }
                    
                        // Mettre à jour les données de dimensions une première fois
                        const initialCropData = cropperInstance.getData(true); // true pour arrondir
                        if (cropDataX) cropDataX.textContent = initialCropData.x;
                        if (cropDataY) cropDataY.textContent = initialCropData.y;
                        if (cropDataWidth) cropDataWidth.textContent = initialCropData.width;
                        if (cropDataHeight) cropDataHeight.textContent = initialCropData.height;
                    
                        // Appliquer un ratio par défaut (par exemple, Carré)
                        // et mettre en évidence le bouton correspondant
                        if (cropperAspectRatioButtonsContainer && cropperInstance) {
                            const defaultRatioButton = cropperAspectRatioButtonsContainer.querySelector('.aspect-btn[data-ratio="1/1"]'); // Cible le bouton Carré
                            if (defaultRatioButton) {
                                defaultRatioButton.click(); // Simule un clic pour appliquer le ratio et le style actif
                            } else {
                                cropperInstance.setAspectRatio(NaN); // Fallback: Ratio libre si aucun bouton "Carré" n'est trouvé
                                // Si vous avez un bouton "Libre" et que vous voulez qu'il soit le défaut s'il n'y a pas de "Carré":
                                // const freeRatioButton = cropperAspectRatioButtonsContainer.querySelector('.aspect-btn[data-ratio="NaN"]');
                                // if (freeRatioButton) freeRatioButton.click();
                            }
                        }
                    
                        updateStatus("Ajustez le cadre et le ratio de recadrage.", "info");
                    }
                 });
                 console.log("Instance Cropper.js créée (appel new Cropper).");
                 // // Alternative : Afficher les boutons ici au lieu de dans ready()
                 // if (modalCropValidateBtn) { modalCropValidateBtn.style.display = 'inline-block'; modalCropValidateBtn.disabled = false; }
                 // if (modalCropCancelBtn) { modalCropCancelBtn.style.display = 'inline-block'; modalCropCancelBtn.disabled = false; }
                 // updateStatus("Ajustez le cadre de recadrage.", "info");

             } catch(e) {
                 console.error("Erreur initialisation Cropper.js:", e);
                 updateStatus("Erreur initialisation Recadrage.", "error");
                 cancelCropping(); // Annuler si Cropper échoue
             }
        }; // Fin de onload

        imageToCropElement.onerror = () => {
            console.error(`Erreur de chargement de l'image pour Cropper: ${currentCroppingImage.url}`);
            updateStatus("Erreur: Impossible de charger l'image pour le recadrage.", "error");
            cancelCropping(); // Annuler si l'image ne charge pas
        }; // Fin de onerror

        // Définir la source de l'image MAINTENANT (après avoir défini onload/onerror)
        console.log(`Chargement de ${currentCroppingImage.url} pour Cropper...`);
        imageToCropElement.src = currentCroppingImage.url;

    } else { // Ce else est maintenant correct
        console.error("Éléments DOM #modal-cropper-container ou #image-to-crop non trouvés.");
        resetModalToActionView(); // Revenir à l'état normal
    }
}


// Annule l'opération de recadrage
function cancelCropping() {
    console.log("Annulation du recadrage.");
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    currentCroppingImage = null; // Oublier l'image qui était en cours de recadrage

    // Détacher les écouteurs spécifiques aux boutons de validation/annulation du recadrage
    if (modalCropValidateBtn) modalCropValidateBtn.onclick = null;
    if (modalCropCancelBtn) modalCropCancelBtn.onclick = null;

    // Cacher les éléments spécifiques à l'interface de recadrage
    if (cropperDataDisplay) cropperDataDisplay.style.display = 'none';
    if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'none';
    // if (finalCanvasSettings) finalCanvasSettings.style.display = 'none'; // Si vous aviez ajouté cela

    // Cacher aussi l'overlay de confirmation d'action s'il était visible
    if (editActionConfirmationOverlay) editActionConfirmationOverlay.style.display = 'none';
    currentEditActionContext = null; // Réinitialiser le contexte au cas où

    // Réinitialiser la vue de la modale à son état d'affichage Swiper / actions principales
    resetModalToActionView();

    updateStatus("Recadrage annulé.", "info");
}

// Met à jour l'URL d'une image partout dans l'UI et dans les données
function updateImageAfterCrop(imageId, newImageUrl) {
    console.log(`Mise à jour URL pour Image ID ${imageId} vers ${newImageUrl}`);
    
    // 1. Mettre à jour dans notre tableau de données global
    const imageIndexInData = allImageData.findIndex(img => img.id.toString() === imageId);
    if (imageIndexInData !== -1) {
        allImageData[imageIndexInData].url = newImageUrl;
        // Si l'image avait aussi une URL de thumbnail différente (peu probable ici), on la mettrait aussi à jour
    }

    // 2. Mettre à jour dans le carousel principal
    const carouselItemContainer = imageCarousel.querySelector(`.carousel-image-container[data-image-id="${imageId}"]`);
    if (carouselItemContainer) {
        const imgInCarousel = carouselItemContainer.querySelector('img');
        if (imgInCarousel) imgInCarousel.src = newImageUrl;
        carouselItemContainer.dataset.imageUrl = newImageUrl; // Met à jour l'URL stockée aussi
    }

    // 3. Mettre à jour dans les zones de dépôt (toutes)
    document.querySelectorAll(`.thumbnail-wrapper[data-image-id="${imageId}"]`).forEach(wrapper => {
        const imgInZone = wrapper.querySelector('.img-thumbnail');
        if (imgInZone) imgInZone.src = newImageUrl;
        wrapper.dataset.imageUrl = newImageUrl; // Met à jour l'URL stockée aussi
    });

    // 4. Mettre à jour dans la modale Swiper (si elle est ouverte ou rouverte)
    // Il faut trouver le bon slide et changer le src de l'image dedans
    // Swiper peut nécessiter une mise à jour pour voir le changement si on ne le détruit pas
    if (modalSwiperInstance && modalSwiperWrapper) {
        const slideIndex = modalImageList.findIndex(img => img.id.toString() === imageId);
        if (slideIndex !== -1 && modalSwiperInstance.slides[slideIndex]) {
             const imgInSlide = modalSwiperInstance.slides[slideIndex].querySelector('img');
             if (imgInSlide) imgInSlide.src = newImageUrl;
             console.log(`URL mise à jour dans Swiper slide index ${slideIndex}`);
             //modalSwiperInstance.update(); // Peut être nécessaire si Swiper ne refresh pas auto
        }
         // Mettre aussi à jour l'image si c'est celle affichée actuellement HORS Swiper (si on changeait le DOM)
         // Mais comme on revient à la vue Swiper, c'est géré au dessus.
    }
    console.log(`Toutes les instances de l'image ${imageId} mises à jour avec la nouvelle URL.`);
}

// Fonction qui appelle le workflow n8n pour le recadrage
async function triggerCropWorkflow(imageData, cropData) {
    console.log(`Appel du workflow N8N pour recadrer l'image ID: ${imageData.id}`);
    showLoading(`Recadrage image ${imageData.id}...`); // Affiche indicateur + désactive boutons
    updateStatus(`Recadrage image ${imageData.id} en cours...`, 'info');

    const payload = {
        productId: currentProductId, // Peut être utile pour nommer/classer côté WP
        imageId: imageData.id,
        imageUrl: imageData.url, // URL originale
        crop: { // Coordonnées (entières)
            x: Math.round(cropData.x),
            y: Math.round(cropData.y),
            width: Math.round(cropData.width),
            height: Math.round(cropData.height)
        }
        // Ajouter targetWidth/Height ici si on veut un recadrage à taille fixe (ex: 1024)
        //targetWidth: 1024,
        //targetHeight: 1024
    };

    // Vérifie si l'URL du webhook est définie
    if (!N8N_CROP_IMAGE_WEBHOOK_URL || N8N_CROP_IMAGE_WEBHOOK_URL === 'YOUR_CROP_IMAGE_WEBHOOK_URL_HERE') {
        console.error("URL du webhook de recadrage non configurée !");
        updateStatus("Erreur: URL du webhook de recadrage manquante.", "error");
        return { status: 'error', message: 'URL du webhook de recadrage non configurée.' };
    }

    try {
         // --- Appel Fetch Réel
        const response = await fetch(N8N_CROP_IMAGE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            let errorMsg = `Erreur serveur n8n (crop): ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || JSON.stringify(errorData);
            } catch (e) { console.warn("Impossible de parser l'erreur JSON n8n (crop)."); }
            throw new Error(errorMsg);
        }
        const result = await response.json(); // Ex: { status: 'success', newImageUrl: '...', message: '...' }
        console.log("Réponse du workflow recadrage:", result);
        if (!result || result.status !== 'success' || !result.newImageUrl) {
            throw new Error(result.message || "La réponse du workflow de recadrage est invalide.");
        }
        return result; // Renvoyer le résultat (contenant newImageUrl)
     } catch (error) {
          console.error("Erreur dans fetch triggerCropWorkflow :", error);
          // Renvoyer un objet d'erreur standardisé
          return { status: 'error', message: error.message };
     }
}

// Valide le recadrage : stocke le contexte, puis affiche la confirmation.
async function validateCropping() {
    if (!cropperInstance || !currentCroppingImage) {
        console.error("Aucune instance Cropper ou image pour valider.");
        updateStatus("Erreur : Aucune image ou recadrage actif.", "error");
        return;
    }

    // Récupère les données du recadrage (arrondies)
    const cropData = cropperInstance.getData(true); // true pour arrondir les valeurs
    console.log("Données de Recadrage prêtes pour confirmation:", cropData);
    console.log("Image Originale concernée:", currentCroppingImage);

    // Stocker le contexte de l'action pour une utilisation ultérieure
    // après que l'utilisateur ait fait son choix (remplacer ou nouveau).
    currentEditActionContext = {
        type: 'crop', // Identifie le type d'opération
        imageData: currentCroppingImage, // L'objet image sur lequel on travaille
        payloadData: { // Données spécifiques à l'action de recadrage
            crop: { // Les coordonnées et dimensions du recadrage
                x: Math.round(cropData.x),
                y: Math.round(cropData.y),
                width: Math.round(cropData.width),
                height: Math.round(cropData.height)
            }
            // Note: Si vous aviez des options de toile finale (targetCanvasWidth, etc.),
            // vous les ajouteriez aussi ici dans payloadData.canvas par exemple.
        }
    };

    // Afficher la sous-modale de confirmation au lieu de lancer le workflow directement.
    showEditActionConfirmation();
    // Le reste de l'ancien code (try/catch/finally et appel à triggerCropWorkflow)
    // sera déplacé dans la nouvelle fonction executeConfirmedAction().
}

// Gère la demande de retrait de watermark : stocke le contexte, puis affiche la confirmation.
async function handleRemoveWatermark() {
    // Déterminer l'image à traiter : celle du mode recadrage (currentCroppingImage)
    // ou, si pas en mode recadrage, celle actuellement affichée dans la modale Swiper (modalImageList[currentModalIndex]).
    const imageToProcess = cropperInstance ? currentCroppingImage : modalImageList[currentModalIndex];

    if (!imageToProcess || !imageToProcess.id || !imageToProcess.url) {
        updateStatus("Données de l'image invalides ou aucune image sélectionnée pour retirer le watermark.", "error");
        console.error("handleRemoveWatermark: imageToProcess invalide ou manquante.", imageToProcess);
        return;
    }

    console.log(`Préparation pour retrait du watermark (ID: ${imageToProcess.id}). Affichage confirmation...`);

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
    const imageToProcess = cropperInstance ? currentCroppingImage : modalImageList[currentModalIndex];

    if (!imageToProcess || !imageToProcess.id || !imageToProcess.url) {
        updateStatus("Données de l'image invalides ou aucune image sélectionnée pour générer le mockup.", "error");
        console.error("handleGenerateMockup: imageToProcess invalide ou manquante.", imageToProcess);
        return;
    }

    console.log(`Préparation pour la génération du mockup (ID Image Produit: ${imageToProcess.id}).`);

    // Pour la génération de mockup, editMode est toujours 'new'
    // et nous n'avons pas besoin de la sous-modale de confirmation (Remplacer/Nouveau).
    // Nous appelons directement une version adaptée de executeConfirmedAction ou une nouvelle fonction dédiée.

    // Nous allons réutiliser la structure de currentEditActionContext
    // et appeler directement executeConfirmedAction avec editMode = 'new'.
    currentEditActionContext = {
        type: 'generateMockup', // Nouveau type d'action
        imageData: imageToProcess,
        payloadData: {} // Pas de données de payload spécifiques autres que celles de base pour l'instant
    };

    // Appel direct à executeConfirmedAction avec 'new'
    // car un mockup est toujours une nouvelle image.
    await executeConfirmedAction('new');
}

function showEditActionConfirmation() {
    if (editActionConfirmationOverlay) editActionConfirmationOverlay.style.display = 'flex';
    // Optionnel: cacher les boutons d'action principaux de la modale pendant ce choix
    if (modalActions) modalActions.style.display = 'none';
    if (modalCropValidateBtn) modalCropValidateBtn.style.display = 'none'; // Cacher si visible
    if (modalCropCancelBtn) modalCropCancelBtn.style.display = 'none';   // Cacher si visible
    if (cropperDataDisplay) cropperDataDisplay.style.display = 'none';
    if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'none';
}

function hideEditActionConfirmation() {
    if (editActionConfirmationOverlay) editActionConfirmationOverlay.style.display = 'none';
    currentEditActionContext = null; // Réinitialiser le contexte
    // Réafficher les bons boutons selon si on était en mode crop ou non
    if (cropperInstance) { // Si on était en mode crop, réafficher les boutons de crop
        if (modalCropValidateBtn) modalCropValidateBtn.style.display = 'inline-block';
        if (modalCropCancelBtn) modalCropCancelBtn.style.display = 'inline-block';
        if (cropperDataDisplay) cropperDataDisplay.style.display = 'block';
        if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'flex';
    } else { // Sinon, réafficher les actions principales de la modale
        if (modalActions) modalActions.style.display = 'flex'; // ou 'block'
    }
}

// Nouvelle fonction pour exécuter l'action après confirmation (remplacer ou nouvelle image)
async function executeConfirmedAction(editMode) { // editMode sera 'replace' ou 'new'
    if (!currentEditActionContext) {
        console.error("Aucun contexte d'action d'édition trouvé pour exécuter.");
        updateStatus("Erreur : Contexte d'action manquant.", "error");
        hideEditActionConfirmation(); // S'assurer de cacher la sous-modale
        // Restaurer l'état de la modale principale
        if (cropperInstance) { // Si on était en mode crop, annuler proprement
            cancelCropping();
        } else { // Sinon, réinitialiser la vue modale standard
            resetModalToActionView();
        }
        return;
    }

    const { type, imageData, payloadData } = currentEditActionContext;
    let webhookUrl = ''; // <<< CETTE PARTIE RESTE INCHANGÉE
    const basePayload = {
        productId: currentProductId,
        imageId: imageData.id, 
        imageUrl: imageData.url.split('?')[0], 
        editMode: editMode 
    };

    if (editMode === 'new') {
        const currentGalleryThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper') : [];
        const currentGalleryImageIds = Array.from(currentGalleryThumbs).map(wrapper => wrapper.dataset.imageId);
        basePayload.currentGalleryImageIds = currentGalleryImageIds; 
    }

    const finalPayload = { ...basePayload, ...payloadData };

    // --- La détermination de webhookUrl RESTE ICI dans app.js ---
    if (type === 'crop') {
        webhookUrl = N8N_CROP_IMAGE_WEBHOOK_URL;
    } else if (type === 'removeWatermark') {
        webhookUrl = N8N_REMOVE_WATERMARK_WEBHOOK_URL;
    } else if (type === 'generateMockup') { 
        webhookUrl = N8N_GENERATE_MOCKUP_WEBHOOK_URL; 
    } else {
        console.error(`Type d'action inconnu lors de l'exécution: ${type}`);
        hideLoading();
        updateStatus(`Erreur: Type d'action inconnu '${type}'.`, 'error');
        if (cropperInstance) cancelCropping(); else resetModalToActionView();
        return;
    }
    // --- Fin de la détermination de webhookUrl ---

    // Ces lignes restent également ici
    console.log(`Exécution de l'action: ${type}, Mode: ${editMode}, Webhook: ${webhookUrl}, Payload:`, finalPayload);
    showLoading(`Traitement de l'image (${type}, Mode: ${editMode})...`);
    updateStatus(`Traitement (${type}, Mode: ${editMode}) en cours...`, 'info');
    hideEditActionConfirmation(); 

    // --- C'est le bloc try...catch...finally suivant que nous allons modifier ---
    try {
        // ANCIEN CODE (celui que vous avez actuellement) :
        // const response = await fetch(webhookUrl, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(finalPayload)
        // });
        // 
        // // Gestion complète de l'erreur HTTP
        // if (!response.ok) {
        //     let errorMsg = `Erreur serveur n8n (${type}, ${editMode}): ${response.status} ${response.statusText}`;
        //     try {
        //         const errorData = await response.json();
        //         errorMsg = errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
        //     } catch (e) {
        //         console.warn(`Impossible de parser la réponse d'erreur JSON de n8n pour ${type} (${response.status}). Corps de la réponse:`, await response.text().catch(() => '[corps illisible]'));
        //     }
        //     throw new Error(errorMsg); 
        // }
        // const result = await response.json();

        // NOUVEAU CODE à mettre à la place du bloc fetch ci-dessus :
        const result = await executeImageActionAPI(webhookUrl, finalPayload);
        // Le reste de la fonction (après la récupération de 'result') est identique

        console.log(`Réponse du workflow n8n (${type}, ${editMode}):`, result);

        if (!result || result.status !== 'success' || !result.newImageUrl) {
            throw new Error(result.message || `Réponse invalide du workflow n8n pour '${type}' en mode '${editMode}'. 'newImageUrl' manquant ou statut incorrect.`);
        }

        if (editMode === 'replace') {
            updateImageAfterCrop(imageData.id.toString(), result.newImageUrl);
            updateStatus(`Image (ID: ${imageData.id}) remplacée avec succès via '${type}' !`, 'success');
        } else { // editMode === 'new'
            if (!result.newImageId) {
                throw new Error("L'ID de la nouvelle image ('newImageId') est manquant dans la réponse n8n pour le mode 'new'.");
            }
            const newImageObject = {
                id: result.newImageId,
                url: result.newImageUrl,
                status: 'current',
                uses: ['gallery'] 
            };
            allImageData.push(newImageObject);

            if (dropzoneGallery) {
                const galleryContainer = dropzoneGallery.querySelector('.thumbnail-container');
                if (galleryContainer) {
                    if (!galleryContainer.querySelector(`.thumbnail-wrapper[data-image-id="${newImageObject.id}"]`)) {
                        const thumbnail = createThumbnail(newImageObject, 'gallery'); 
                        galleryContainer.appendChild(thumbnail);
                    }
                }
            }

            if (modalSwiperInstance && modalSwiperWrapper) {
                modalImageList.push(newImageObject);
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                const img = document.createElement('img');
                img.src = newImageObject.url;
                img.alt = `Image ID ${newImageObject.id}`;
                img.loading = 'lazy';
                slide.appendChild(img);
                modalSwiperWrapper.appendChild(slide);
                modalSwiperInstance.update();
            }
            updateStatus(`Nouvelle image (ID: ${newImageObject.id}) ajoutée à la galerie via '${type}' !`, 'success');
        }

        if (type === 'crop' && cropperInstance) {
            cancelCropping(); 
        } else if (type === 'removeWatermark' || (type === 'generateMockup' && !cropperInstance) ) { 
            resetModalToActionView(); 
        }

    } catch (error) {
        console.error(`Échec de l'action '${type}' en mode '${editMode}':`, error);
        updateStatus(`Erreur (${type}, ${editMode}): ${error.message}`, 'error');
        if (cropperInstance) { 
            cancelCropping();
        } else { 
            resetModalToActionView();
        }
    } finally {
        hideLoading(); 
        console.log(`Fin du traitement pour action '${type}', mode '${editMode}'.`);
    }
}

// --- Récupération Initiale des Données ---
const fetchProductData = async () => {
    updateStatus("Récupération des données produit...", 'info');
    if (productNameElement) productNameElement.textContent = 'Chargement...';
    // Vider le carousel et les conteneurs de vignettes avant de re-peupler
    if (imageCarousel) imageCarousel.innerHTML = '<p>Chargement...</p>';
    document.querySelectorAll('.dropzone .thumbnail-container').forEach(container => container.innerHTML = '');
     // Vider aussi les instances Sortable précédentes
     if (sortableCarousel) sortableCarousel.destroy();
     Object.values(sortableZones).forEach(instance => instance.destroy());
     sortableZones = {};
     allImageData = []; // Vider les données stockées


    try {
        //const urlToFetch = `${N8N_GET_DATA_WEBHOOK_URL}?productId=${currentProductId}`;
        //const response = await fetch(urlToFetch);
        //if (!response.ok) throw new Error(`Erreur serveur n8n: ${response.status}`);
        //const data = await response.json();

        // NOUVELLE LIGNE : Appel à la fonction API
        const data = await fetchProductDataAPI(currentProductId); 
        
        console.log('Parsed JSON data:', data);
        updateStatus("Données reçues. Affichage...", 'info');

        if (productNameElement) productNameElement.textContent = data.productName || 'Non trouvé';

        // Utiliser 'data.images'
        if (data.images && Array.isArray(data.images)) {
            allImageData = data.images; // Stocker

            if (allImageData.length > 0) {
                imageCarousel.innerHTML = ''; // Vider "Chargement..."

                // Priorité pour placement initial
                const rolePriority = ['main', 'gallery', 'custom'];

                allImageData.forEach(image => {
                    let placed = false;
                    for (const role of rolePriority) {
                        if (image.uses.includes(role)) {
                            const targetZone = document.getElementById(`dropzone-${role}`);
                            if (targetZone) {
                                const container = targetZone.querySelector('.thumbnail-container');
                                const maxImages = parseInt(targetZone.dataset.maxImages) || 999;
                                let canPlace = true;

                                // Vérif spéciale pour 'main' (1 seul)
                                if (role === 'main' && container.children.length >= 1) {
                                     console.warn(`Image ${image.id} marquée aussi 'main', mais zone déjà remplie.`);
                                     canPlace = false;
                                }
                                // Vérif pour 'custom' (limite max)
                                else if (role === 'custom' && container.children.length >= maxImages) {
                                     console.warn(`Zone ${role} (max ${maxImages}) pleine, ne peut placer initialement ${image.id}`);
                                     canPlace = false;
                                }

                                if (canPlace && container) {
                                     container.appendChild(createThumbnail(image, role));
                                     placed = true;
                                     break; // Placé dans la zone prioritaire, on arrête
                                }
                            }
                        }
                    }
                    // Si non placé dans une zone, mettre dans le carousel
                    if (!placed) {
                        imageCarousel.appendChild(createCarouselItem(image));
                    }
                });

                // Initialiser SortableJS seulement APRÈS avoir mis les éléments dans le DOM
                initializeSortable();

                updateStatus("Images affichées. Glissez pour assigner/réassigner.", 'success');
            } else {
                imageCarousel.innerHTML = '<p>Aucune image disponible.</p>';
                updateStatus("Aucune image trouvée.", 'info');
            }
        } else {
            console.error("Format de données invalide : 'images' manquant ou n'est pas un tableau.");
            imageCarousel.innerHTML = '<p>Erreur format données.</p>';
            updateStatus("Erreur format données images.", 'error');
        }
    } catch (error) {
        console.error("Erreur fetchProductData:", error);
        updateStatus(`Erreur chargement: ${error.message}`, 'error');
        if (productNameElement) productNameElement.textContent = 'Erreur';
        if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur chargement.</p>';
    }
};

// --- Initialisation de l'application ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialise le SDK Telegram SI il est disponible
    if (window.Telegram && window.Telegram.WebApp) {
        console.log("SDK Telegram WebApp détecté. Initialisation...");
        Telegram.WebApp.ready(); // Indique à Telegram que la WebApp est chargée et prête
        Telegram.WebApp.expand(); // Demande à la WebApp de s'agrandir à sa hauteur maximale
        // Optionnel : Activer la confirmation avant de fermer la WebApp
        // Telegram.WebApp.enableClosingConfirmation();
    } else {
        console.warn("SDK Telegram WebApp non détecté. Fonctionnement hors Telegram?");
    }

    //Initialiser les éléments DOM via le module dom.js
    initDomElements();
    console.log('app.js: initDomElements() called.');
    
    // ... (Récupération productId - inchangé) ...
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');
     if (!currentProductId) { /* ... gestion erreur ... */ return; }
    if (productIdElement) productIdElement.textContent = currentProductId;

    // --- Attacher les écouteurs d'événements ---
    // Modal Fermer
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (event) => {
        // Condition pour fermer la modale :
        // 1. Le clic doit être directement sur l'overlay (le fond).
        // 2. L'instance de Cropper ne doit PAS être active (c'est-à-dire, cropperInstance doit être null).
        if (event.target === modalOverlay && cropperInstance === null) {
            closeModal();
        } else if (event.target === modalOverlay && cropperInstance !== null) {
            console.log("Clic extérieur détecté pendant le recadrage, fermeture de la modale empêchée.");
            // Optionnel: donner un feedback visuel à l'utilisateur, comme un léger "shake" de la modale
            // ou un message bref, mais pour l'instant on empêche juste la fermeture.
        }
    });

    // Bouton Sauver (rôles)
    if (saveChangesButton) saveChangesButton.addEventListener('click', handleSaveChanges);
    // Bouton Recadrer (Action principale)
    if (modalCropBtn) modalCropBtn.addEventListener('click', startCropping);
    // Attacher les écouteurs d'événements aux boutons de ratio
    if (cropperAspectRatioButtonsContainer) {
        const ratioButtons = cropperAspectRatioButtonsContainer.querySelectorAll('.aspect-btn');
        ratioButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (cropperInstance) {
                    const ratioString = button.dataset.ratio;
                    let newRatio;

                    if (ratioString === "NaN" || ratioString === "null" || ratioString === "") { // Gérer 'NaN' et autres pour "libre"
                        newRatio = NaN; // Cropper.js comprend NaN pour un ratio libre
                    } else {
                        const parts = ratioString.split('/');
                        if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1])) && parseFloat(parts[1]) !== 0) {
                            newRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
                        } else {
                            console.warn(`Ratio invalide: ${ratioString}. Passage en mode libre.`);
                            newRatio = NaN; // Fallback en mode libre si le ratio est mal formé
                        }
                    }
                    console.log(`Application du ratio: ${newRatio}`);
                    cropperInstance.setAspectRatio(newRatio);

                    // Mettre en évidence le bouton actif (styling optionnel)
                    ratioButtons.forEach(btn => btn.classList.remove('active-ratio')); // 'active-ratio' est une classe CSS que vous pouvez définir
                    button.classList.add('active-ratio');
                }
            });
        });
    }

    if (modalRemoveWatermarkBtn) {
        modalRemoveWatermarkBtn.addEventListener('click', handleRemoveWatermark);
    }
    // Écouteur pour la case à cocher Guide des Tailles
    // if (modalToggleSizeGuide) modalToggleSizeGuide.addEventListener('change', handleSizeGuideToggle); 
    if (modalToggleSizeGuideBtn) modalToggleSizeGuideBtn.addEventListener('click', handleSizeGuideToggle); // NOUVELLE LIGNE
    // Bouton Mockup (Action principale)
    // if (modalMockupBtn) modalMockupBtn.addEventListener('click', startMockupGeneration);

    if (confirmActionReplaceBtn) confirmActionReplaceBtn.addEventListener('click', () => executeConfirmedAction('replace'));
    if (confirmActionNewBtn) confirmActionNewBtn.addEventListener('click', () => executeConfirmedAction('new'));
    if (confirmActionCancelBtn) confirmActionCancelBtn.addEventListener('click', hideEditActionConfirmation);
    if (modalGenerateMockupBtn) modalGenerateMockupBtn.addEventListener('click', handleGenerateMockup); // <-- NOUVELLE LIGNE
    
    // Récupérer les données initiales
    fetchProductData();

}); // Fin de DOMContentLoaded
