// js/sortableManager.js
import {
    imageCarousel, // Conteneur du carrousel principal
    dropzoneMain,
    dropzoneGallery,
    dropzoneCustom
} from './dom.js';
import { updateStatus } from './uiUtils.js';

console.log('sortableManager.js module loaded');

// Instances de SortableJS, gérées par ce module
let moduleSortableCarousel = null;
let moduleSortableZones = {};

// Données globales des images, sera passé en argument
let currentAllImageData = [];
// Fonctions de callback pour les actions sur les items
let onClickSettingsCallback = () => {};
let onClickMarkForDeletionCallback = () => {};


// --- Fonctions de création d'éléments (internes au module) ---

function createCarouselItem(image) {
    const container = document.createElement('div');
    container.className = 'carousel-image-container';
    container.dataset.imageId = image.id;
    container.dataset.imageUrl = image.url;
    container.dataset.initialUses = image.uses ? image.uses.join(',') : '';

    if (image.markedForDeletion) {
        container.classList.add('marked-for-deletion');
    }

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Image ID ${image.id}`;
    img.loading = 'lazy';

    const info = document.createElement('p');
    info.textContent = `ID: ${image.id}`;

    const settingsBtn = document.createElement('button');
    settingsBtn.innerHTML = '&#9881;'; // ⚙️
    settingsBtn.className = 'settings-btn';
    settingsBtn.title = 'Réglages pour cette image';
    settingsBtn.dataset.imageId = image.id;
    settingsBtn.onclick = (event) => onClickSettingsCallback(event); // Appel du callback

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'DEL';
    deleteBtn.className = 'del-btn';
    deleteBtn.title = image.markedForDeletion ? 'Annuler le marquage pour suppression' : 'Marquer pour suppression définitive';
    deleteBtn.dataset.imageId = image.id;
    // Assurer que le texte du bouton reflète l'état au moment de la création
    if (image.markedForDeletion) {
        deleteBtn.title = 'Annuler le marquage pour suppression';
        // On pourrait changer le texte aussi : deleteBtn.textContent = 'UNDO';
    }

    deleteBtn.onclick = (event) => onClickMarkForDeletionCallback(event); // Appel du callback

    let sizeGuideIcon = null;
    if (image.uses && image.uses.includes('size_guide')) {
        sizeGuideIcon = document.createElement('span');
        sizeGuideIcon.className = 'eih-item-icon size-guide-icon';
        sizeGuideIcon.textContent = '📏';
        sizeGuideIcon.title = 'Guide des tailles';
        container.classList.add('has-size-guide-icon');
    }

    container.appendChild(img);
    container.appendChild(info);
    const buttonWrapper = document.createElement('div');
    buttonWrapper.style.marginTop = '5px';
    buttonWrapper.appendChild(settingsBtn);
    buttonWrapper.appendChild(deleteBtn);
    container.appendChild(buttonWrapper);

    if (sizeGuideIcon) {
        container.appendChild(sizeGuideIcon);
    }
    return container;
}

function createThumbnail(image, targetRole) {
    const container = document.createElement('div');
    container.className = 'thumbnail-wrapper';
    container.dataset.imageId = image.id;
    container.dataset.imageUrl = image.url;

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Vignette ID ${image.id}`;
    img.className = 'img-thumbnail';
    img.title = `ID: ${image.id}\nAssigné à: ${targetRole}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove-thumbnail-btn';
    removeBtn.title = `Retirer de ${targetRole}`;
    removeBtn.onclick = handleThumbnailRemoveClickInternal; // Appel de la fonction interne au module

    const settingsBtn = document.createElement('button');
    settingsBtn.innerHTML = '&#9881;';
    settingsBtn.className = 'settings-btn thumbnail-settings-btn';
    settingsBtn.title = 'Réglages pour cette image';
    settingsBtn.dataset.imageId = image.id;
    settingsBtn.onclick = (event) => onClickSettingsCallback(event); // Appel du callback

    container.appendChild(img);
    container.appendChild(removeBtn);
    container.appendChild(settingsBtn);

    if (image.uses && image.uses.includes('size_guide')) {
        const icon = document.createElement('span');
        icon.className = 'eih-item-icon size-guide-icon';
        icon.textContent = '📏';
        icon.title = 'Guide des tailles';
        container.appendChild(icon);
        container.classList.add('has-size-guide-icon');
    }
    return container;
}

// --- Gestion du Retrait de Miniature (Interne au module) ---
function handleThumbnailRemoveClickInternal(event) {
    const wrapper = event.currentTarget.closest('.thumbnail-wrapper');
    if (!wrapper) return;

    const imageId = wrapper.dataset.imageId;
    const zone = wrapper.closest('.dropzone');
    const role = zone ? zone.dataset.role : 'unknown';

    console.log(`sortableManager.js: Tentative de retrait (clic) ID=<span class="math-inline">\{imageId\} de la zone\=</span>{role}`);

    const originalImageData = currentAllImageData.find(img => img.id.toString() === imageId);

    if (!originalImageData) {
        console.error(`sortableManager.js: Impossible de retrouver les données originales pour l'image ID=${imageId}`);
        wrapper.remove();
        updateStatus(`Image ${imageId} retirée de la zone ${role} (données originales non trouvées).`, 'warn');
        return;
    }

    wrapper.remove();
    updateStatus(`Image ${imageId} retirée de la zone ${role}.`, 'info');

    if (imageCarousel) {
        if (!imageCarousel.querySelector(`.carousel-image-container[data-image-id="${imageId}"]`)) {
            const carouselItem = createCarouselItem(originalImageData); // Utilise le createCarouselItem interne
            imageCarousel.appendChild(carouselItem);
            console.log(`sortableManager.js: Image ID=${imageId} retournée au carousel.`);
        } else {
            console.log(`sortableManager.js: Image ID=${imageId} déjà présente dans le carousel.`);
        }
    } else {
        console.error("sortableManager.js: Carousel element non trouvé.");
    }
}


// --- Initialisation de SortableJS (Fonction exportée principale) ---
export function initializeSortableManager(imageData, settingsClickHandler, markForDeletionClickHandler) {
    currentAllImageData = imageData; // Met à jour la référence aux données des images
    onClickSettingsCallback = settingsClickHandler;
    onClickMarkForDeletionCallback = markForDeletionClickHandler;

    if (!Sortable) {
        console.error("sortableManager.js: SortableJS n'est pas chargé !");
        updateStatus("Erreur: Bibliothèque SortableJS manquante.", "error");
        return;
    }
    console.log("sortableManager.js: Initialisation de SortableJS...");

    if (moduleSortableCarousel) moduleSortableCarousel.destroy();
    Object.values(moduleSortableZones).forEach(instance => instance.destroy());
    moduleSortableZones = {};

    if (!imageCarousel) {
        console.error("sortableManager.js: imageCarousel (DOM element) non trouvé. Abandon de l'initialisation de SortableJS.");
        return;
    }

    moduleSortableCarousel = new Sortable(imageCarousel, {
        group: {
            name: 'shared',
            pull: true,
            put: false
        },
        sort: false,
        animation: 150,
        filter: '.marked-for-deletion',
        onStart: function(evt) {
            if (evt.item.classList.contains('marked-for-deletion')) {
                return false; 
            }
            console.log(`sortableManager.js: Drag démarré depuis le carousel: Item ID ${evt.item.dataset.imageId}`);
        },
        onEnd: function(evt) {
            console.log(`sortableManager.js: Drag terminé depuis carousel: Item ID ${evt.item.dataset.imageId}, déposé dans une zone? ${evt.to !== evt.from}`);
        }
    });

    const dropZoneElements = [dropzoneMain, dropzoneGallery, dropzoneCustom].filter(el => el); // Filtre les éléments non trouvés

    dropZoneElements.forEach(zoneElement => {
        const container = zoneElement.querySelector('.thumbnail-container');
        if (!container) {
            console.warn(`sortableManager.js: Conteneur de vignettes non trouvé pour la zone ${zoneElement.id}. Skip.`);
            return;
        }
        const role = zoneElement.dataset.role;
        const maxImages = parseInt(zoneElement.dataset.maxImages) || 999;

        moduleSortableZones[role] = new Sortable(container, {
            group: 'shared',
            pull: true,
            animation: 150,
            onAdd: function (evt) {
                const itemEl = evt.item; 
                const droppedImageId = itemEl.dataset.imageId;
                const targetContainer = evt.to; 
                const currentRole = role; 
                const currentMaxImages = maxImages; 

                console.log(`sortableManager.js [onAdd ${currentRole}] ID ${droppedImageId} déposé. Enfants avant modif: ${targetContainer.children.length}`);

                let addedElementInDom = Array.from(targetContainer.children).find(child => child.dataset.imageId === droppedImageId);
                if (!addedElementInDom) {
                    if (itemEl && itemEl.dataset.imageId === droppedImageId){
                        addedElementInDom = itemEl; 
                        console.warn(`sortableManager.js [onAdd ${currentRole}] Impossible de trouver l'élément ajouté comme enfant direct. Utilisation de evt.item.`);
                    } else {
                        console.error(`sortableManager.js [onAdd ${currentRole}] CRITICAL: Impossible de retrouver l'élément DOM ajouté (ID: ${droppedImageId})`);
                        if (itemEl && itemEl.parentNode === targetContainer) itemEl.remove();
                        updateStatus(`Erreur interne lors du dépôt de l'image ${droppedImageId}.`, 'error');
                        return; 
                    }
                }

                let duplicateCount = 0;
                Array.from(targetContainer.children).forEach(child => {
                    if (child.dataset.imageId === droppedImageId) {
                        duplicateCount++;
                    }
                });

                if (duplicateCount > 1) {
                    console.log("sortableManager.js -> Doublon détecté après ajout, retrait de l'élément ajouté.");
                    addedElementInDom.remove(); 
                    updateStatus(`Image ${droppedImageId} déjà présente dans la zone ${currentRole}.`, 'warn');
                    if (itemEl.classList.contains('carousel-image-container')) {
                        const originalImageData = currentAllImageData.find(img => img.id.toString() === droppedImageId);
                        if (originalImageData && imageCarousel && !imageCarousel.querySelector(`.carousel-image-container[data-image-id="${droppedImageId}"]`)) {
                            imageCarousel.appendChild(createCarouselItem(originalImageData));
                        }
                    }
                    return; 
                }

                // Logique Spécifique au Rôle (main, custom, gallery)
                if (currentRole === 'main') {
                    console.log("sortableManager.js -> Logique 'main': Nettoyage et remplacement.");
                    const elementsToRemove = Array.from(targetContainer.children).filter(child => child !== addedElementInDom);
                    elementsToRemove.forEach(child => {
                        const childImageId = child.dataset.imageId;
                        console.log(`sortableManager.js     -> Retrait de l'ID ${childImageId}`);
                        const oldImageData = currentAllImageData.find(img => img.id.toString() === childImageId);
                        if (oldImageData && imageCarousel && !imageCarousel.querySelector(`.carousel-image-container[data-image-id="${childImageId}"]`)) {
                            console.log(`sortableManager.js       -> Retour au carrousel pour ID: ${childImageId}`);
                            imageCarousel.appendChild(createCarouselItem(oldImageData));
                        }
                        child.remove();
                    });

                    if (addedElementInDom.classList.contains('carousel-image-container')) {
                        const originalImageData = currentAllImageData.find(img => img.id.toString() === droppedImageId);
                        if (originalImageData) {
                            const thumbnailWrapper = createThumbnail(originalImageData, currentRole);
                            if (targetContainer.contains(addedElementInDom)) {
                                targetContainer.replaceChild(thumbnailWrapper, addedElementInDom);
                            } else {
                                targetContainer.innerHTML = ''; 
                                targetContainer.appendChild(thumbnailWrapper);
                            }
                        } else { 
                            console.error(`sortableManager.js [onAdd Main] Données image non trouvées pour ID ${droppedImageId}.`);
                            if(addedElementInDom.parentNode === targetContainer) addedElementInDom.remove();
                            updateStatus(`Erreur ajout image ${droppedImageId}.`, 'error');
                        }
                    } else if (addedElementInDom.classList.contains('thumbnail-wrapper')) {
                        const thumbImg = addedElementInDom.querySelector('.img-thumbnail');
                        if(thumbImg) thumbImg.title = `ID: ${droppedImageId}\nAssigné à: ${currentRole}`;
                        const removeBtn = addedElementInDom.querySelector('.remove-thumbnail-btn');
                        if(removeBtn) removeBtn.title = `Retirer de ${currentRole}`;
                    } else {
                         console.warn(`sortableManager.js [onAdd Main] L'élément ajouté (ID ${droppedImageId}) n'est ni du carrousel ni une vignette ?`);
                        const originalImageData = currentAllImageData.find(img => img.id.toString() === droppedImageId);
                        if (originalImageData) {
                            const thumbnailWrapper = createThumbnail(originalImageData, currentRole);
                            targetContainer.innerHTML = ''; 
                            targetContainer.appendChild(thumbnailWrapper);
                        } else {
                            if(addedElementInDom.parentNode === targetContainer) addedElementInDom.remove();
                        }
                    }
                    updateStatus(`Image ${droppedImageId} définie comme principale.`, 'success');

                } else if (currentRole === 'custom') {
                    console.log("sortableManager.js -> Logique 'custom'.");
                    if (targetContainer.children.length > currentMaxImages) {
                        console.log(`sortableManager.js   -> Limite (${currentMaxImages}) atteinte pour 'custom'. Retrait.`);
                        addedElementInDom.remove(); 
                        updateStatus(`Limite de ${currentMaxImages} images atteinte pour galerie custom.`, 'warn');
                        if (itemEl.classList.contains('carousel-image-container')) {
                            const originalImageData = currentAllImageData.find(img => img.id.toString() === droppedImageId);
                            if (originalImageData && imageCarousel && !imageCarousel.querySelector(`.carousel-image-container[data-image-id="${droppedImageId}"]`)) {
                                imageCarousel.appendChild(createCarouselItem(originalImageData));
                            }
                        }
                        return; 
                    } else {
                        if (addedElementInDom.classList.contains('carousel-image-container')) {
                            const originalImageData = currentAllImageData.find(img => img.id.toString() === droppedImageId);
                            if (originalImageData) {
                                const thumbnailWrapper = createThumbnail(originalImageData, currentRole);
                                targetContainer.replaceChild(thumbnailWrapper, addedElementInDom);
                            } else { if(addedElementInDom.parentNode === targetContainer) addedElementInDom.remove(); }
                        } else { 
                            const thumbImg = addedElementInDom.querySelector('.img-thumbnail');
                            if(thumbImg) thumbImg.title = `ID: ${droppedImageId}\nAssigné à: ${currentRole}`;
                            const removeBtn = addedElementInDom.querySelector('.remove-thumbnail-btn');
                            if(removeBtn) removeBtn.title = `Retirer de ${currentRole}`;
                        }
                        updateStatus(`Image ${droppedImageId} ajoutée à la zone ${currentRole}.`, 'success');
                    }
                } else { // currentRole === 'gallery'
                    console.log("sortableManager.js -> Logique 'gallery'.");
                    if (addedElementInDom.classList.contains('carousel-image-container')) {
                        const originalImageData = currentAllImageData.find(img => img.id.toString() === droppedImageId);
                        if (originalImageData) {
                            const thumbnailWrapper = createThumbnail(originalImageData, currentRole);
                            targetContainer.replaceChild(thumbnailWrapper, addedElementInDom);
                        } else { if(addedElementInDom.parentNode === targetContainer) addedElementInDom.remove(); }
                    } else { 
                        const thumbImg = addedElementInDom.querySelector('.img-thumbnail');
                        if(thumbImg) thumbImg.title = `ID: ${droppedImageId}\nAssigné à: ${currentRole}`;
                        const removeBtn = addedElementInDom.querySelector('.remove-thumbnail-btn');
                        if(removeBtn) removeBtn.title = `Retirer de ${currentRole}`;
                    }
                    updateStatus(`Image ${droppedImageId} ajoutée à la zone ${currentRole}.`, 'success');
                }
                console.log(`sortableManager.js -> Enfants final dans ${currentRole}: ${targetContainer.children.length}`);
            }, // --- Fin de la logique onAdd ---
            onRemove: function(evt) {
                const itemEl = evt.item;
                const removedImageId = itemEl.dataset.imageId;
                console.log(`sortableManager.js onRemove Event: Image ID ${removedImageId} retirée de la zone ${role}`);
            }
        });
    });
    console.log("sortableManager.js: Initialisation de SortableJS terminée.");
}
