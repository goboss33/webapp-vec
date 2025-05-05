// js/app.js - V5: Assignation Exclusive & Retour au Carousel

// --- URLs N8N --- (Vérifie qu'elles sont toujours bonnes)
const N8N_GET_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/get-product-data';
const N8N_UPDATE_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/update-product';

// --- Variables Globales ---
let currentProductId = null;
let allImageData = [];
let sortableCarousel = null;
let sortableZones = {};
let modalSwiperInstance = null; // Instance Swiper pour la modale
let modalImageList = []; // Liste des images affichées dans la modale
let currentModalIndex = 0; // Index de l'image affichée dans la modale

// --- Références aux Éléments DOM ---
let productIdElement, productNameElement, saveChangesButton, statusElement;
let dropzoneMain, dropzoneGallery, dropzoneCustom;
let imageCarouselContainer, imageCarousel;
let modalOverlay, modalCloseBtn, modalImageContainer, modalSwiperWrapper, modalImageId, modalImageRoles, modalPrevBtn, modalNextBtn, modalActions; // Ajout swiper wrapper & actions

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
const handleSaveChanges = async () => { /* ... Code précédent inchangé ... */
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
     console.log("Modal fermée.");
}

// Gestionnaire de Clic pour le bouton Réglages (⚙️) - Appelle openImageModal
function handleSettingsClick(event) {
    const button = event.currentTarget;
    const imageId = button.dataset.imageId; // Récupère l'ID depuis le bouton
    console.log(`Clic sur Réglages pour Image ID: ${imageId}`);
    openImageModal(imageId); // Ouvre la modal pour cette image
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

    // Récupère les références aux éléments DOM (y compris ceux de la modal)
    productIdElement = document.getElementById('productId');
    productNameElement = document.getElementById('productName');
    saveChangesButton = document.getElementById('saveChangesButton');
    statusElement = document.getElementById('status');
    dropzoneMain = document.getElementById('dropzone-main');
    dropzoneGallery = document.getElementById('dropzone-gallery');
    dropzoneCustom = document.getElementById('dropzone-custom');
    imageCarouselContainer = document.getElementById('image-carousel-container');
    imageCarousel = document.getElementById('image-carousel');
    // Éléments de la modal
    modalOverlay = document.getElementById('image-modal');
    modalCloseBtn = document.getElementById('modal-close-btn');
    modalImage = document.getElementById('modal-image');
    modalImageId = document.getElementById('modal-image-id');
    modalImageRoles = document.getElementById('modal-image-roles');
    modalPrevBtn = document.getElementById('modal-prev-btn');
    modalNextBtn = document.getElementById('modal-next-btn');

    // ... (Récupération productId - inchangé) ...
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');
     if (!currentProductId) { /* ... gestion erreur ... */ return; }
    if (productIdElement) productIdElement.textContent = currentProductId;

    // --- Attacher les NOUVEAUX écouteurs pour la modal ---
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    } else { console.error("Bouton Fermer Modal non trouvé!"); }

    if (modalOverlay) {
        // Ferme si on clique sur le fond noir (l'overlay lui-même)
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) {
                closeModal();
            }
        });
    } else { console.error("Overlay Modal non trouvé!"); }

    // --- Attacher les écouteurs existants ---
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', handleSaveChanges);
    } else { /* ... erreur ... */ }

    // Note: Les listeners pour SortableJS sont ajoutés dans initializeSortable
    // Note: Les listeners pour les boutons 'x' et '⚙️' sont ajoutés dans createThumbnail/createCarouselItem

    // Récupérer les données initiales
    fetchProductData();

}); // Fin de DOMContentLoaded
