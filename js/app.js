// js/app.js - V11.1: Assignation Exclusive & Retour au Carousel

// --- URLs N8N ---
const N8N_GET_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/get-product-data';
const N8N_UPDATE_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/update-product';

const N8N_CROP_IMAGE_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/crop-n-replace-img';
const N8N_REMOVE_WATERMARK_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/remove-watermark';

// --- Variables Globales ---
let currentProductId = null;
let allImageData = [];
let sortableCarousel = null;
let sortableZones = {};
let modalSwiperInstance = null;
let modalImageList = [];
let currentModalIndex = 0;
let cropperInstance = null; // Instance Cropper.js active
let currentCroppingImage = null; // Données de l'image en cours de recadrage
let currentEditActionContext = null;

// --- Références aux Éléments DOM ---
let productIdElement, productNameElement, saveChangesButton, statusElement;
let dropzoneMain, dropzoneGallery, dropzoneCustom;
let imageCarouselContainer, imageCarousel;
let modalOverlay, modalCloseBtn, modalImageContainer, modalSwiperWrapper, modalImageId, modalImageRoles, modalPrevBtn, modalNextBtn, modalActions, modalImageInfo; // Ajout swiper wrapper & actions
let modalCropperContainer, imageToCropElement, modalCropBtn, modalMockupBtn, modalCropValidateBtn, modalCropCancelBtn;
let cropperDataDisplay, cropDataX, cropDataY, cropDataWidth, cropDataHeight, cropperAspectRatioButtonsContainer; 
let modalRemoveWatermarkBtn;
let editActionConfirmationOverlay, confirmActionReplaceBtn, confirmActionNewBtn, confirmActionCancelBtn;
let loadingOverlay;

// --- Fonctions Utilitaires ---

// Met à jour le message de statut
const updateStatus = (message, type = 'info') => {
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
    } else {
        console.error("statusElement non trouvé.");
    }
};

// Crée un élément pour le carousel (pour SortableJS)
function createCarouselItem(image) {
    const container = document.createElement('div');
    container.className = 'carousel-image-container';
    container.dataset.imageId = image.id;
    container.dataset.imageUrl = image.url;
    container.dataset.initialUses = image.uses.join(',');

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Image ID ${image.id}`;

    const info = document.createElement('p');
    info.textContent = `ID: ${image.id}`;

    // --- Ajout du bouton Réglages ---
    const settingsBtn = document.createElement('button');
    settingsBtn.innerHTML = '&#9881;'; // Icône engrenage ⚙️
    settingsBtn.className = 'settings-btn';
    settingsBtn.title = 'Réglages pour cette image';
    settingsBtn.dataset.imageId = image.id; // Stocke l'ID pour le retrouver facilement
    settingsBtn.onclick = handleSettingsClick; // On ajoute le handler
    // --- Fin Ajout ---

    container.appendChild(img);
    container.appendChild(info);
    container.appendChild(settingsBtn); // Ajoute le bouton

    // Pas besoin de D&D listeners ici, SortableJS gère le container
    return container;
}

// Crée une miniature (wrapper avec image + bouton 'x') pour les zones de dépôt
function createThumbnail(image, targetRole) {
    const container = document.createElement('div');
    container.className = 'thumbnail-wrapper';
    container.dataset.imageId = image.id;
    container.dataset.imageUrl = image.url; // Ajoutons l'URL ici aussi

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Vignette ID ${image.id}`;
    img.className = 'img-thumbnail';
    img.title = `ID: ${image.id}\nAssigné à: ${targetRole}`;

    // Bouton supprimer 'x'
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-thumbnail-btn';
    removeBtn.title = `Retirer de ${targetRole}`;
    removeBtn.onclick = handleThumbnailRemoveClick;

     // --- Ajout du bouton Réglages ---
     const settingsBtn = document.createElement('button');
     settingsBtn.innerHTML = '&#9881;'; // Icône engrenage ⚙️
     settingsBtn.className = 'settings-btn thumbnail-settings-btn'; // Classe additionnelle pour styling si besoin
     settingsBtn.title = 'Réglages pour cette image';
     settingsBtn.dataset.imageId = image.id;
     settingsBtn.onclick = handleSettingsClick;
     // --- Fin Ajout ---

    container.appendChild(img);
    container.appendChild(removeBtn);
    container.appendChild(settingsBtn); // Ajoute le bouton Réglages

    return container;
}

// --- Gestion du Retrait de Miniature (Clic sur 'x') ---
function handleThumbnailRemoveClick(event) {
    const wrapper = event.currentTarget.closest('.thumbnail-wrapper');
    if (!wrapper) return;

    const imageId = wrapper.dataset.imageId;
    const zone = wrapper.closest('.dropzone');
    const role = zone ? zone.dataset.role : 'unknown';

    console.log(`Tentative de retrait (clic) ID=${imageId} de la zone=${role}`);

    // 1. Trouver les données originales de l'image
    const originalImageData = allImageData.find(img => img.id.toString() === imageId);

    if (!originalImageData) {
        console.error(`Impossible de retrouver les données originales pour l'image ID=${imageId}`);
        // En fallback, on retire juste du DOM
        wrapper.remove();
        updateStatus(`Image ${imageId} retirée de la zone ${role} (données originales non trouvées).`, 'warn');
        return;
    }

    // 2. Retirer la vignette (wrapper) de la zone de dépôt
    wrapper.remove();
    updateStatus(`Image ${imageId} retirée de la zone ${role}.`, 'info');

    // 3. Recréer l'élément correspondant et le remettre dans le carousel
    if (imageCarousel) {
        // Vérifier si l'image n'est pas déjà revenue dans le carousel (sécurité)
        if (!imageCarousel.querySelector(`.carousel-image-container[data-image-id="${imageId}"]`)) {
            const carouselItem = createCarouselItem(originalImageData);
            imageCarousel.appendChild(carouselItem);
            console.log(`Image ID=${imageId} retournée au carousel.`);
            // Pas besoin de réinitialiser SortableJS normalement ici
        } else {
             console.log(`Image ID=${imageId} déjà présente dans le carousel.`);
        }
    } else {
        console.error("Carousel element non trouvé, ne peut pas retourner l'image.");
    }

    // !!! TODO: Mettre à jour l'état interne si on en ajoute un plus tard !!!
}

// --- Initialisation de SortableJS ---
function initializeSortable() {
    if (!Sortable) {
        console.error("SortableJS n'est pas chargé !");
        updateStatus("Erreur: Bibliothèque SortableJS manquante.", "error");
        return;
    }
    console.log("Initialisation de SortableJS...");

    // Détruire les anciennes instances si elles existent (pour éviter doublons si fetchProductData est appelé plusieurs fois)
    if (sortableCarousel) sortableCarousel.destroy();
    Object.values(sortableZones).forEach(instance => instance.destroy());
    sortableZones = {}; // Réinitialiser l'objet

    // Config du Carousel: On peut en SORTIR des items (ils sont déplacés), mais pas en déposer dedans.
    sortableCarousel = new Sortable(imageCarousel, {
        group: {
            name: 'shared',
            pull: true, // Important: 'true' signifie DÉPLACER (pas 'clone')
            put: false // On ne peut pas déposer dans le carousel
        },
        sort: false, // Pas de réorganisation du carousel par l'utilisateur
        animation: 150,
        // filter: '.image-in-zone', // Pourrait être utilisé si on ne veut pas pouvoir drag des images déjà assignées? Non, on gère au drop.
        onStart: function(evt) {
            console.log(`Drag démarré depuis le carousel: Item ID ${evt.item.dataset.imageId}`);
             // Optionnel : ajouter une classe au body pour changer le curseur partout?
             // document.body.classList.add('grabbing');
        },
        onEnd: function(evt) { // Se déclenche après onAdd ou si le drag est annulé
            console.log(`Drag terminé depuis carousel: Item ID ${evt.item.dataset.imageId}, déposé dans une zone? ${evt.to !== evt.from}`);
             // document.body.classList.remove('grabbing');
             // Si l'item n'a pas été déposé dans une zone valide (evt.to === evt.from), SortableJS le remet automatiquement.
        }

    });

    // Config des Zones de Dépôt: Reçoivent des items, et on peut en sortir des items.
    const dropZoneElements = [dropzoneMain, dropzoneGallery, dropzoneCustom];
    dropZoneElements.forEach(zoneElement => {
        if (zoneElement) {
            const container = zoneElement.querySelector('.thumbnail-container');
            const role = zoneElement.dataset.role;
            const maxImages = parseInt(zoneElement.dataset.maxImages) || 999; // Limite max (surtout pour custom)

            sortableZones[role] = new Sortable(container, {
                group: 'shared', // Fait partie du même groupe
                pull: true,      // Important: Permet de glisser HORS de cette zone (vers une autre zone ou pour supprimer->retour carousel)
                animation: 150,
                onAdd: function (evt) { // Quand un élément est AJOUTÉ (déposé)
                    const itemEl = evt.item; // L'élément déposé (soit du carousel, soit d'une autre zone)
                    const droppedImageId = itemEl.dataset.imageId;
                    const droppedImageUrl = itemEl.dataset.imageUrl || allImageData.find(img => img.id.toString() === droppedImageId)?.url; // Récupère l'URL si besoin
                    const targetContainer = evt.to; // Le conteneur où on a déposé (.thumbnail-container)

                    console.log(`onAdd Event: Image ID ${droppedImageId} déposée dans la zone ${role}`);

                    // Règle 1: Doublons dans la zone cible?
                    // Il faut vérifier les autres éléments déjà présents *avant* cet ajout
                    let duplicate = false;
                    Array.from(targetContainer.children).forEach(child => {
                         if (child !== itemEl && child.dataset.imageId === droppedImageId) {
                             duplicate = true;
                         }
                     });
                    if (duplicate) {
                        console.log("Doublon détecté, annulation.");
                        itemEl.remove(); // Supprime l'élément qui vient d'être ajouté
                        updateStatus(`Image ${droppedImageId} déjà dans la zone ${role}.`, 'info');
                        // Remettre l'original dans le carousel si besoin? Non, SortableJS devrait gérer le retour à la source si on annule ici.
                        return;
                    }

                    // Règle 2: Zone Principale - une seule image
                    if (role === 'main' && targetContainer.children.length > 1) {
                        console.log("Zone Principale limitée à 1. Retrait des anciennes.");
                         Array.from(targetContainer.children).forEach(child => {
                             if (child !== itemEl) { // Ne pas supprimer celui qu'on vient d'ajouter
                                // !!! Avant de supprimer, il faut remettre l'ancienne image principale dans le carousel !!!
                                const oldImageId = child.dataset.imageId;
                                const oldImageData = allImageData.find(img => img.id.toString() === oldImageId);
                                if (oldImageData && imageCarousel && !imageCarousel.querySelector(`.carousel-image-container[data-image-id="${oldImageId}"]`)) {
                                    imageCarousel.appendChild(createCarouselItem(oldImageData));
                                }
                                child.remove();
                             }
                         });
                         updateStatus(`Ancienne image principale retournée au carousel. ${droppedImageId} est la nouvelle.`, 'info');
                    }

                    // Règle 3: Zone Custom - limite max
                    if (role === 'custom' && targetContainer.children.length > maxImages) {
                        console.log(`Limite (${maxImages}) atteinte pour Custom. Annulation.`);
                        itemEl.remove();
                        updateStatus(`Limite de ${maxImages} images atteinte pour galerie custom.`, 'warn');
                        // Remettre l'original dans le carousel si besoin?
                        const originalImageData = allImageData.find(img => img.id.toString() === droppedImageId);
                         if (originalImageData && imageCarousel && !imageCarousel.querySelector(`.carousel-image-container[data-image-id="${droppedImageId}"]`)) {
                             imageCarousel.appendChild(createCarouselItem(originalImageData));
                         }
                        return;
                    }

                    // Transformation en Vignette (si l'élément vient du carousel)
                    // Si l'élément vient d'une autre zone, il est déjà une vignette (.thumbnail-wrapper)
                    if (itemEl.classList.contains('carousel-image-container')) {
                         console.log("Transformation du clone de carousel en vignette.");
                        const thumbnailWrapper = createThumbnail({ id: droppedImageId, url: droppedImageUrl }, role);
                        targetContainer.replaceChild(thumbnailWrapper, itemEl); // Remplace le clone par la vignette
                        updateStatus(`Image ${droppedImageId} ajoutée à la zone ${role}.`, 'success');
                    } else {
                        // L'élément vient d'une autre zone, il est déjà une vignette. Juste confirmer.
                         updateStatus(`Image ${droppedImageId} déplacée vers la zone ${role}.`, 'success');
                         // Mettre à jour son title ?
                         const thumbImg = itemEl.querySelector('.img-thumbnail');
                         if(thumbImg) thumbImg.title = `ID: ${droppedImageId}\nAssigné à: ${role}`;
                         const removeBtn = itemEl.querySelector('.remove-thumbnail-btn');
                          if(removeBtn) removeBtn.title = `Retirer de ${role}`;
                    }

                    // !!! TODO: Mettre à jour l'état interne JS !!!
                },
                onRemove: function(evt) { // Quand un élément est SORTI (par drag vers une autre zone OU supprimé par clic->remove)
                    // Note: Cet event se déclenche AUSSI quand on clique sur 'x', car on fait wrapper.remove()
                    const itemEl = evt.item;
                    const removedImageId = itemEl.dataset.imageId;
                    console.log(`onRemove Event: Image ID ${removedImageId} retirée de la zone ${role}`);
                    // On gère le retour au carousel uniquement lors du clic sur 'x' (handleThumbnailRemoveClick)
                    // Si c'est un drag vers une autre zone, onAdd de l'autre zone s'en occupe.
                }
            });
        }
    });
     console.log("Initialisation de SortableJS terminée.");
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

    const payload = {
        productId: currentProductId,
        mainImageId: mainImageId,
        galleryImageIds: galleryImageIds,
        customGalleryImageIds: customGalleryImageIds
    };
    console.log("Données envoyées à n8n:", payload);

    try {
        const response = await fetch(N8N_UPDATE_DATA_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            let errorMsg = `Erreur serveur n8n: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || JSON.stringify(errorData);
            } catch (e) { console.warn("Impossible de parser la réponse d'erreur JSON de n8n."); }
            throw new Error(errorMsg);
        }
        const result = await response.json();
        console.log("Réponse de n8n (Mise à jour):", result);
        updateStatus(result.message || "Modifications enregistrées avec succès !", 'success');
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
        if (modalImageRoles) modalImageRoles.textContent = imageData.uses.join(', ') || 'Aucun';
        currentModalIndex = index; // Met à jour l'index courant
        console.log(`Modal info mise à jour pour slide ${index}, ID: ${imageData.id}`);

        // TODO: Mettre à jour l'état des boutons d'action si besoin
        // (par ex, désactiver "Générer Mockup" si déjà fait)
    }
}

// Ouvre la modal et initialise Swiper
function openImageModal(imageId) {
    console.log(`Ouverture modal pour image ID: ${imageId}`);
    // 1. Déterminer la liste d'images à afficher
    // Pour l'instant, on affiche TOUTES les images du produit
    // TODO: Plus tard, on pourrait affiner pour n'afficher que celles de la zone cliquée + carousel ?
    modalImageList = [...allImageData]; // Copie de toutes les images

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
             // loop: modalImageList.length > 1, // Boucle si plus d'une image?
             // observer: true, // Met à jour Swiper si le DOM change (utile?)
             // observeParents: true,

             // Événement quand le slide change
             on: {
                 slideChange: function () {
                     console.log(`Slide changé vers index: ${this.activeIndex}`);
                     updateModalInfo(this.activeIndex); // Met à jour les infos (ID, Rôles)
                 },
                  init: function() {
                      // Met à jour les infos pour le slide initial juste après l'init
                      updateModalInfo(this.activeIndex);
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

// --- Indicateur de Chargement ---
function showLoading(message = "Traitement en cours...") {
    if (loadingOverlay) {
        const p = loadingOverlay.querySelector('p');
        if (p) p.textContent = message;
        loadingOverlay.style.display = 'flex';
    }
    // Désactiver les boutons principaux pour éviter double-clic
    if(saveChangesButton) saveChangesButton.disabled = true;
    if(modalCropValidateBtn) modalCropValidateBtn.disabled = true; // Désactiver si visible
    if(modalCropCancelBtn) modalCropCancelBtn.disabled = true; // Désactiver si visible
    console.log("Affichage indicateur chargement.");
}
function hideLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    // Réactiver les boutons
    if(saveChangesButton) saveChangesButton.disabled = false;
     if(modalCropValidateBtn) modalCropValidateBtn.disabled = false;
     if(modalCropCancelBtn) modalCropCancelBtn.disabled = false;
     console.log("Masquage indicateur chargement.");
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
    if (modalMockupBtn) modalMockupBtn.style.display = 'none';
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
    let webhookUrl = '';
    const basePayload = {
        productId: currentProductId,
        imageId: imageData.id, // L'ID de l'image originale (pour remplacement ou comme référence)
        imageUrl: imageData.url.split('?')[0], // Envoyer l'URL de base
        editMode: editMode // 'replace' ou 'new' -> sera utilisé par n8n
    };

    // Si editMode est 'new', nous devons envoyer l'état actuel de la galerie standard
    // pour que n8n puisse y ajouter la nouvelle image sans écraser les modifs locales.
    if (editMode === 'new') {
        const currentGalleryThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper') : [];
        const currentGalleryImageIds = Array.from(currentGalleryThumbs).map(wrapper => wrapper.dataset.imageId);
        basePayload.currentGalleryImageIds = currentGalleryImageIds; // Ajoute les IDs actuels de la galerie au payload
    }

    // Fusionner payloadData (spécifique à l'action, ex: données de crop) avec basePayload
    const finalPayload = { ...basePayload, ...payloadData };

    console.log(`Exécution de l'action: ${type}, Mode: ${editMode}, Payload:`, finalPayload);
    showLoading(`Traitement de l'image (${type}, Mode: ${editMode})...`);
    updateStatus(`Traitement (${type}, Mode: ${editMode}) en cours...`, 'info');
    hideEditActionConfirmation(); // Cacher la sous-modale de confirmation maintenant que l'action est lancée

    if (type === 'crop') {
        webhookUrl = N8N_CROP_IMAGE_WEBHOOK_URL;
    } else if (type === 'removeWatermark') {
        webhookUrl = N8N_REMOVE_WATERMARK_WEBHOOK_URL;
    }
    // Bientôt: else if (type === 'mockup') { webhookUrl = N8N_MOCKUP_WEBHOOK_URL; }
    else {
        console.error(`Type d'action inconnu lors de l'exécution: ${type}`);
        hideLoading();
        updateStatus(`Erreur: Type d'action inconnu '${type}'.`, 'error');
        if (cropperInstance) cancelCropping(); else resetModalToActionView();
        return;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload)
        });

        // Gestion complète de l'erreur HTTP
        if (!response.ok) {
            let errorMsg = `Erreur serveur n8n (${type}, ${editMode}): ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                // Si errorData.message existe, l'utiliser, sinon une sérialisation de l'erreur.
                errorMsg = errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
            } catch (e) {
                // Si le corps de la réponse d'erreur n'est pas du JSON valide ou est vide
                console.warn(`Impossible de parser la réponse d'erreur JSON de n8n pour ${type} (${response.status}). Corps de la réponse:`, await response.text().catch(() => '[corps illisible]'));
                // errorMsg reste tel que défini au-dessus (status + statusText)
            }
            throw new Error(errorMsg); // Lance une erreur qui sera attrapée par le bloc catch plus bas
        }

        const result = await response.json();
        console.log(`Réponse du workflow n8n (${type}, ${editMode}):`, result);

        // Vérifier si la réponse contient bien ce qu'on attend
        if (!result || result.status !== 'success' || !result.newImageUrl) {
            throw new Error(result.message || `Réponse invalide du workflow n8n pour '${type}' en mode '${editMode}'. 'newImageUrl' manquant ou statut incorrect.`);
        }

        // Le traitement de la réponse est différent si c'est une nouvelle image ou un remplacement
        if (editMode === 'replace') {
            updateImageAfterCrop(imageData.id.toString(), result.newImageUrl);
            updateStatus(`Image (ID: ${imageData.id}) remplacée avec succès via '${type}' !`, 'success');
        } else { // editMode === 'new'
            if (!result.newImageId) {
                 throw new Error("L'ID de la nouvelle image ('newImageId') est manquant dans la réponse n8n pour le mode 'new'.");
            }
            // n8n a ajouté la nouvelle image à la galerie (basée sur currentGalleryImageIds + la nouvelle)
            // et a mis à jour le produit dans WordPress.
            // Enhanced_Product_Image_History a été mis à jour par les endpoints WP.
            // La Web App doit maintenant refléter l'ajout de cette nouvelle image.

            const newImageObject = {
                id: result.newImageId,
                url: result.newImageUrl,
                status: 'current',
                uses: ['gallery'] // Par défaut, car on l'ajoute à la galerie
            };
            allImageData.push(newImageObject);

            // Ajouter visuellement la nouvelle image à la *zone de galerie* dans l'UI
            if (dropzoneGallery) {
                const galleryContainer = dropzoneGallery.querySelector('.thumbnail-container');
                if (galleryContainer) {
                    // Vérifier si l'image n'y est pas déjà par une autre manip (peu probable ici)
                    if (!galleryContainer.querySelector(`.thumbnail-wrapper[data-image-id="${newImageObject.id}"]`)) {
                        const thumbnail = createThumbnail(newImageObject, 'gallery'); // 'gallery' est le rôle
                        galleryContainer.appendChild(thumbnail);
                    }
                }
            }

            // Mettre à jour aussi la modale Swiper si elle est ouverte
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

        // Quitter proprement le mode recadrage si l'action était 'crop'
        if (type === 'crop' && cropperInstance) {
            cancelCropping(); // cancelCropping appelle resetModalToActionView
        } else if (type === 'removeWatermark' || (type === 'mockup' && !cropperInstance) ) { // Si ce n'était pas une action de crop ou si le crop était déjà fermé
            resetModalToActionView(); // Assurer que la modale est dans un état propre et les boutons réactivés
        }

    } catch (error) {
        console.error(`Échec de l'action '${type}' en mode '${editMode}':`, error);
        updateStatus(`Erreur (${type}, ${editMode}): ${error.message}`, 'error');
        // En cas d'erreur, s'assurer de restaurer l'état correct des boutons de la modale principale
        if (cropperInstance) { // Si l'erreur s'est produite alors qu'on était en mode recadrage
            cancelCropping();
        } else { // Sinon, réinitialiser la vue modale standard
            resetModalToActionView();
        }
    } finally {
        hideLoading(); // Toujours cacher l'indicateur de chargement à la fin
        // La réactivation des boutons d'action de la modale (Recadrer, Retirer Watermark, etc.)
        // est gérée par cancelCropping() ou resetModalToActionView() qui sont appelés dans le try/catch.
        // Il n'est normalement pas nécessaire de les réactiver manuellement ici en plus.
        console.log(`Fin du traitement pour action '${type}', mode '${editMode}'.`);
    }
}

// Réinitialise la modal à son état initial (vue Swiper, boutons actions standards)
// et s'assure que les overlays/confirmations spécifiques sont cachés.
function resetModalToActionView() {
    console.log("Réinitialisation de la vue de la modale aux actions standard.");

    // 1. Cacher tous les éléments spécifiques au mode recadrage
    if (modalCropperContainer) modalCropperContainer.style.display = 'none';
    if (modalCropValidateBtn) {
        modalCropValidateBtn.style.display = 'none';
        modalCropValidateBtn.disabled = true; // Désactiver par sécurité
    }
    if (modalCropCancelBtn) {
        modalCropCancelBtn.style.display = 'none';
        modalCropCancelBtn.disabled = true; // Désactiver par sécurité
    }
    if (cropperDataDisplay) cropperDataDisplay.style.display = 'none';
    if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'none';
    // if (finalCanvasSettings) finalCanvasSettings.style.display = 'none'; // Si vous aviez ajouté cela

    // 2. Cacher l'overlay de confirmation d'action (au cas où)
    if (editActionConfirmationOverlay) editActionConfirmationOverlay.style.display = 'none';
    // currentEditActionContext est typiquement remis à null par hideEditActionConfirmation ou après exécution

    // 3. Afficher les éléments de la vue "normale" de la modale (Swiper et actions principales)
    if (modalSwiperContainer) modalSwiperContainer.style.display = 'block';
    if (modalPrevBtn) modalPrevBtn.style.display = 'block'; // Leur état activé/désactivé est géré par Swiper
    if (modalNextBtn) modalNextBtn.style.display = 'block';
    if (modalImageInfo) modalImageInfo.style.display = 'block'; // Infos de l'image (ID, Rôles)

    // 4. Afficher le conteneur des boutons d'action principaux et réactiver les boutons
    if (modalActions) modalActions.style.display = 'flex'; // Ou 'block', selon votre CSS pour l'alignement de ces boutons

    if (modalCropBtn) {
        modalCropBtn.style.display = 'inline-block';
        modalCropBtn.disabled = false;
    }
    if (modalRemoveWatermarkBtn) {
        modalRemoveWatermarkBtn.style.display = 'inline-block';
        modalRemoveWatermarkBtn.disabled = false;
    }
    if (modalMockupBtn) { // Si vous avez un bouton mockup
        modalMockupBtn.style.display = 'inline-block';
        // Laissez son état 'disabled' tel quel s'il est géré ailleurs (par exemple, s'il est toujours désactivé)
        // Sinon, si son activation dépend de l'état de la modale :
        // modalMockupBtn.disabled = false;
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
        const urlToFetch = `${N8N_GET_DATA_WEBHOOK_URL}?productId=${currentProductId}`;
        const response = await fetch(urlToFetch);
        if (!response.ok) throw new Error(`Erreur serveur n8n: ${response.status}`);
        const data = await response.json();
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

    // Récupérer TOUS les éléments DOM
    productIdElement = document.getElementById('productId');
    productNameElement = document.getElementById('productName');
    saveChangesButton = document.getElementById('saveChangesButton');
    statusElement = document.getElementById('status');
    dropzoneMain = document.getElementById('dropzone-main');
    dropzoneGallery = document.getElementById('dropzone-gallery');
    dropzoneCustom = document.getElementById('dropzone-custom');
    imageCarouselContainer = document.getElementById('image-carousel-container');
    imageCarousel = document.getElementById('image-carousel');
    modalOverlay = document.getElementById('image-modal');
    modalCloseBtn = document.getElementById('modal-close-btn');
    modalSwiperContainer = document.querySelector('.modal-swiper'); // Le conteneur de Swiper
    modalSwiperWrapper = document.getElementById('modal-swiper-wrapper');
    modalImageId = document.getElementById('modal-image-id');
    modalImageRoles = document.getElementById('modal-image-roles');
    modalPrevBtn = document.getElementById('modal-prev-btn');
    modalNextBtn = document.getElementById('modal-next-btn');
    modalActions = document.getElementById('modal-actions');
    modalImageInfo = document.getElementById('modal-image-info');
    // Éléments pour Cropper
    modalCropperContainer = document.getElementById('modal-cropper-container');
    imageToCropElement = document.getElementById('image-to-crop');
    modalCropBtn = document.getElementById('modal-crop-btn');
    modalMockupBtn = document.getElementById('modal-mockup-btn');
    modalCropValidateBtn = document.getElementById('modal-crop-validate-btn');
    modalCropCancelBtn = document.getElementById('modal-crop-cancel-btn');
    cropperDataDisplay = document.getElementById('cropper-data-display');
    cropDataX = document.getElementById('crop-data-x');
    cropDataY = document.getElementById('crop-data-y');
    cropDataWidth = document.getElementById('crop-data-width');
    cropDataHeight = document.getElementById('crop-data-height');
    cropperAspectRatioButtonsContainer = document.getElementById('cropper-aspect-ratio-buttons');        
    loadingOverlay = document.getElementById('loading-overlay');
    modalRemoveWatermarkBtn = document.getElementById('modal-remove-watermark-btn');
    editActionConfirmationOverlay = document.getElementById('edit-action-confirmation');
    confirmActionReplaceBtn = document.getElementById('confirm-action-replace');
    confirmActionNewBtn = document.getElementById('confirm-action-new');
    confirmActionCancelBtn = document.getElementById('confirm-action-cancel');
    
    // ... (Récupération productId - inchangé) ...
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');
     if (!currentProductId) { /* ... gestion erreur ... */ return; }
    if (productIdElement) productIdElement.textContent = currentProductId;

    // --- Attacher les écouteurs d'événements ---
    // Modal Fermer (Peuvent rester directs, moins sujets aux problèmes)
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) closeModal(); });

    // Bouton Sauver (rôles) (Peut rester direct)
    if (saveChangesButton) saveChangesButton.addEventListener('click', handleSaveChanges);

    // --- Attacher les écouteurs d'événements ---
    // Modal Fermer
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) closeModal(); });

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
    // Bouton Mockup (Action principale)
    // if (modalMockupBtn) modalMockupBtn.addEventListener('click', startMockupGeneration);

    if (confirmActionReplaceBtn) confirmActionReplaceBtn.addEventListener('click', () => executeConfirmedAction('replace'));
    if (confirmActionNewBtn) confirmActionNewBtn.addEventListener('click', () => executeConfirmedAction('new'));
    if (confirmActionCancelBtn) confirmActionCancelBtn.addEventListener('click', hideEditActionConfirmation);
    
    // Récupérer les données initiales
    fetchProductData();

}); // Fin de DOMContentLoaded
