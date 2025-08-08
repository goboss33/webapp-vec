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

let onRefreshIndicatorCallback = () => {};


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
	img.addEventListener('contextmenu', (e) => e.preventDefault());

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

    const colorIndicatorPlaceholder = document.createElement('div');
    colorIndicatorPlaceholder.className = 'image-color-indicator-placeholder';
    // Cet attribut aidera à cibler le placeholder pour une image spécifique si besoin
    colorIndicatorPlaceholder.dataset.indicatorForImageId = image.id;
    container.appendChild(colorIndicatorPlaceholder);

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
	img.addEventListener('contextmenu', (e) => e.preventDefault());

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

    const colorIndicatorPlaceholder = document.createElement('div');
    colorIndicatorPlaceholder.className = 'image-color-indicator-placeholder';
    colorIndicatorPlaceholder.dataset.indicatorForImageId = image.id;
    container.appendChild(colorIndicatorPlaceholder);
    
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

export function addGalleryImageToDOM(imageObject) {
    if (!dropzoneGallery) {
        console.error("sortableManager.js: dropzoneGallery n'est pas défini pour ajouter une image.");
        return;
    }
    const galleryContainer = dropzoneGallery.querySelector('.thumbnail-container');
    if (galleryContainer) {
        // Vérifier si l'image n'y est pas déjà (sécurité)
        if (!galleryContainer.querySelector(`.thumbnail-wrapper[data-image-id="${imageObject.id}"]`)) {
            const thumbnail = createThumbnail(imageObject, 'gallery'); // Utilise le createThumbnail interne
            galleryContainer.appendChild(thumbnail);
            console.log(`sortableManager.js: Image ID ${imageObject.id} ajoutée à la galerie DOM.`);
        }
    } else {
        console.error("sortableManager.js: Conteneur de la galerie non trouvé pour ajouter l'image.");
    }
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
            if (typeof onRefreshIndicatorCallback === 'function') {
                onRefreshIndicatorCallback(originalImageData.id);
            }
            console.log(`sortableManager.js: Image ID=${imageId} retournée au carousel.`);
        } else {
            console.log(`sortableManager.js: Image ID=${imageId} déjà présente dans le carousel.`);
        }
    } else {
        console.error("sortableManager.js: Carousel element non trouvé.");
    }
}


// --- Initialisation de SortableJS (Fonction exportée principale) ---
export function initializeSortableManager(imageData, settingsClickHandler, markForDeletionClickHandler, refreshIndicatorCb) {
    currentAllImageData = imageData; // Met à jour la référence aux données des images
    onClickSettingsCallback = settingsClickHandler;
    onClickMarkForDeletionCallback = markForDeletionClickHandler;
    onRefreshIndicatorCallback = refreshIndicatorCb;

    console.log("sortableManager.js: Initializing with new image data. Count:", currentAllImageData.length);

    // 1. Vider les conteneurs avant de re-peupler
    if (imageCarousel) {
        imageCarousel.innerHTML = ''; // Vider le carrousel principal
    } else {
        console.error("sortableManager.js: imageCarousel (DOM element) non trouvé pour le nettoyage.");
    }
    // Vider les conteneurs des zones de dépôt
    [dropzoneMain, dropzoneGallery, dropzoneCustom].forEach(zoneEl => {
        if (zoneEl) {
            const container = zoneEl.querySelector('.thumbnail-container');
            if (container) {
                container.innerHTML = '';
            }
        }
    });

    // 2. Peupler le carrousel et les zones de dépôt avec les images initiales
    if (imageCarousel && currentAllImageData.length > 0) {
        const rolePriority = ['main', 'gallery', 'custom'];
        currentAllImageData.forEach(image => {
            let placed = false;
            for (const role of rolePriority) {
                if (image.uses && image.uses.includes(role)) {
                    const targetZoneElement = role === 'main' ? dropzoneMain : (role === 'gallery' ? dropzoneGallery : dropzoneCustom);
                    if (targetZoneElement) {
                        const container = targetZoneElement.querySelector('.thumbnail-container');
                        const maxImages = parseInt(targetZoneElement.dataset.maxImages) || 999;
                        let canPlace = true;

                        if (role === 'main' && container && container.children.length >= 1) {
                            console.warn(`sortableManager.js: Image ${image.id} marquée 'main', mais zone déjà remplie lors du peuplement initial.`);
                            canPlace = false;
                        } else if (role === 'custom' && container && container.children.length >= maxImages) {
                            console.warn(`sortableManager.js: Zone ${role} (max ${maxImages}) pleine, ne peut placer initialement ${image.id}.`);
                            canPlace = false;
                        }

                        if (canPlace && container) {
                            container.appendChild(createThumbnail(image, role)); // Utilise le createThumbnail interne
                            placed = true;
                            break; 
                        }
                    }
                }
            }
            if (!placed) {
                // Si l'image n'a pas été placée dans une dropzone, elle va dans le carrousel
                // Sauf si elle est marquée pour suppression et ne devrait pas y être du tout initialement
                // (Normalement, la logique de filtrage de 'markedForDeletion' se fait avant d'envoyer à initializeSortableManager si besoin)
                imageCarousel.appendChild(createCarouselItem(image)); // Utilise le createCarouselItem interne
            }
        });
        console.log("sortableManager.js: Initial population of items complete.");
    } else if (currentAllImageData.length === 0 && imageCarousel) {
        imageCarousel.innerHTML = '<p>Aucune image disponible.</p>'; // Afficher si pas d'images
    }


    // 3. Initialiser SortableJS (le reste de la fonction est similaire à avant)
    if (!Sortable) {
        console.error("sortableManager.js: SortableJS n'est pas chargé !");
        updateStatus("Erreur: Bibliothèque SortableJS manquante.", "error");
        return;
    }
    console.log("sortableManager.js: Initialisation de SortableJS...");

    if (moduleSortableCarousel) moduleSortableCarousel.destroy();
    Object.values(moduleSortableZones).forEach(instance => instance.destroy());
    moduleSortableZones = {};

    if (!imageCarousel) { // Vérification redondante mais sûre
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

        // --- AJOUTEZ CES DEUX LIGNES ---
        delay: 200, // Délai en ms avant que le drag ne commence
        delayOnTouchOnly: true, // Le délai ne s'applique que sur les écrans tactiles
        // --- FIN DE L'AJOUT ---

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

    const dropZoneElements = [dropzoneMain, dropzoneGallery, dropzoneCustom].filter(el => el); 

    dropZoneElements.forEach(zoneElement => {
        // ... (le reste de la configuration des dropzones dans la boucle forEach reste INCHANGÉ) ...
        // ... (y compris toute la logique complexe de onAdd et onRemove) ...
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
			// --- AJOUTEZ CES DEUX LIGNES ---
            delay: 200, // Délai en ms avant que le drag ne commence
            delayOnTouchOnly: true, // Le délai ne s'applique que sur les écrans tactiles
            // --- FIN DE L'AJOUT ---
            // Dans sortableManager.js, dans la boucle dropZoneElements.forEach(...)
            // Remplacez l'intégralité de la fonction onAdd existante par celle-ci :
            onAdd: function (evt) {
                const itemEl = evt.item; // L'élément glissé, ex: .carousel-image-container
                const droppedImageId = itemEl.dataset.imageId;
                const targetContainer = evt.to; // Le .thumbnail-container de la zone de dépôt
                const currentRole = role; // 'role' est de la portée externe (main, gallery, custom)
                const currentMaxImages = maxImages; // 'maxImages' aussi
            
                console.log(`sortableManager.js [onAdd ${currentRole}] ID ${droppedImageId} déposé. Enfants avant modif: ${targetContainer.children.length}`);
            
                // evt.item est l'élément DOM qui a été ajouté à targetContainer par SortableJS.
                // Il est déjà physiquement dans targetContainer à ce stade.
                let addedElementInDom = itemEl; 
            
                // Vérification de doublon (basée sur l'ID de l'image)
                let duplicateCount = 0;
                Array.from(targetContainer.children).forEach(child => {
                    // On compte combien d'enfants (y compris celui qu'on vient d'ajouter) ont cet ID.
                    // Si addedElementInDom est bien celui qui vient d'être ajouté, on s'attend à duplicateCount >= 1.
                    if (child.dataset.imageId === droppedImageId) {
                        duplicateCount++;
                    }
                });
            
                if (duplicateCount > 1) { // Si > 1, cela signifie qu'il était déjà là AVANT cet ajout
                    console.log(`sortableManager.js -> Doublon détecté pour ID ${droppedImageId} dans ${currentRole}. Retrait de l'élément ajouté.`);
                    addedElementInDom.remove(); // Retirer l'élément qui vient d'être ajouté en double
                    updateStatus(`Image ${droppedImageId} déjà présente dans la zone ${currentRole}.`, 'warn');
                    // Pas besoin de remettre dans le carrousel ici, car l'original y est toujours (si pull: 'clone' pour carrousel)
                    // ou si l'utilisateur l'a pris d'une autre zone, il y est toujours.
                    // Si le carrousel n'est pas en mode clone, il faudrait le recréer ici.
                    // Le carrousel est en mode pull:true, put:false (pas clone). Donc l'item est retiré du carrousel.
                    // Il faut le recréer dans le carrousel si le drop est invalide ici.
                    const originalImageDataForDup = currentAllImageData.find(img => img.id.toString() === droppedImageId);
                    if (originalImageDataForDup && imageCarousel && !imageCarousel.querySelector(`.carousel-image-container[data-image-id="${droppedImageId}"]`)) {
                        const carouselItem = createCarouselItem(originalImageDataForDup);
                        imageCarousel.appendChild(carouselItem);
                        if (typeof onRefreshIndicatorCallback === 'function') { // Rafraîchir l'indicateur sur le nouvel item du carrousel
                            onRefreshIndicatorCallback(originalImageDataForDup.id);
                        }
                    }
                    return; 
                }
            
                // Logique Spécifique au Rôle et Transformation
                let thumbnailWrapper = null;
                const originalImageData = currentAllImageData.find(img => img.id.toString() === droppedImageId);
            
                if (!originalImageData) {
                    console.error(`sortableManager.js [onAdd ${currentRole}] Données image originales non trouvées pour ID ${droppedImageId}. Retrait.`);
                    addedElementInDom.remove();
                    updateStatus(`Erreur données image ${droppedImageId}.`, 'error');
                    return;
                }
            
                if (currentRole === 'main') {
                    console.log("sortableManager.js -> Logique 'main': Nettoyage et remplacement.");
                    // Retirer tous les autres enfants du conteneur 'main'
                    Array.from(targetContainer.children).forEach(child => {
                        if (child !== addedElementInDom) { // Ne pas se retirer soi-même pour l'instant
                            const childImageId = child.dataset.imageId;
                            console.log(`sortableManager.js     -> Nettoyage: Retrait ID ${childImageId} de la zone 'main'.`);
                            const oldImageData = currentAllImageData.find(img => img.id.toString() === childImageId);
                            if (oldImageData && imageCarousel && !imageCarousel.querySelector(`.carousel-image-container[data-image-id="${childImageId}"]`)) {
                                const carouselItem = createCarouselItem(oldImageData);
                                imageCarousel.appendChild(carouselItem);
                                if (typeof onRefreshIndicatorCallback === 'function') {
                                    onRefreshIndicatorCallback(oldImageData.id);
                                }
                            }
                            child.remove();
                        }
                    });
                    // Maintenant, targetContainer ne contient que addedElementInDom (ou est vide si addedElementInDom a été retiré par le nettoyage)
                    // Il faut s'assurer que addedElementInDom est bien le .carousel-image-container
                    if (addedElementInDom.classList.contains('carousel-image-container')) {
                        thumbnailWrapper = createThumbnail(originalImageData, currentRole);
                        targetContainer.replaceChild(thumbnailWrapper, addedElementInDom);
                    } else { // Si ce n'est pas un item du carrousel (ex: déjà une vignette d'une autre zone)
                        thumbnailWrapper = addedElementInDom; // C'est déjà une vignette, on la garde
                        // Mettre à jour son titre si elle vient d'une autre zone
                        const thumbImg = thumbnailWrapper.querySelector('.img-thumbnail');
                        if(thumbImg) thumbImg.title = `ID: ${droppedImageId}\nAssigné à: ${currentRole}`;
                        const removeBtn = thumbnailWrapper.querySelector('.remove-thumbnail-btn');
                        if(removeBtn) removeBtn.title = `Retirer de ${currentRole}`;
                    }
                    updateStatus(`Image ${droppedImageId} définie comme principale.`, 'success');
            
                } else if (currentRole === 'custom') {
                    console.log("sortableManager.js -> Logique 'custom'.");
                    // Le nombre d'enfants est vérifié APRÈS l'ajout par SortableJS.
                    // Si addedElementInDom est celui qui fait dépasser, targetContainer.children.length sera > currentMaxImages.
                    if (targetContainer.children.length > currentMaxImages) {
                        console.log(`sortableManager.js   -> Limite (${currentMaxImages}) atteinte pour 'custom'. Retrait de ID ${droppedImageId}.`);
                        addedElementInDom.remove(); 
                        updateStatus(`Limite de ${currentMaxImages} images atteinte pour galerie custom.`, 'warn');
                        
                        // Remettre l'item dans le carrousel
                        if (originalImageData && imageCarousel && !imageCarousel.querySelector(`.carousel-image-container[data-image-id="${droppedImageId}"]`)) {
                            const carouselItem = createCarouselItem(originalImageData);
                            imageCarousel.appendChild(carouselItem);
                            if (typeof onRefreshIndicatorCallback === 'function') {
                                onRefreshIndicatorCallback(originalImageData.id);
                            }
                            console.log(`sortableManager.js     -> Image ID ${droppedImageId} retournée au carrousel.`);
                        }
                        return; 
                    } else {
                        if (addedElementInDom.classList.contains('carousel-image-container')) {
                            thumbnailWrapper = createThumbnail(originalImageData, currentRole);
                            targetContainer.replaceChild(thumbnailWrapper, addedElementInDom);
                        } else { // Déjà une vignette
                            thumbnailWrapper = addedElementInDom;
                             const thumbImg = thumbnailWrapper.querySelector('.img-thumbnail');
                             if(thumbImg) thumbImg.title = `ID: ${droppedImageId}\nAssigné à: ${currentRole}`;
                             const removeBtn = thumbnailWrapper.querySelector('.remove-thumbnail-btn');
                             if(removeBtn) removeBtn.title = `Retirer de ${currentRole}`;
                        }
                        updateStatus(`Image ${droppedImageId} ajoutée à la zone ${currentRole}.`, 'success');
                    }
                } else { // currentRole === 'gallery'
                    console.log("sortableManager.js -> Logique 'gallery'.");
                    if (addedElementInDom.classList.contains('carousel-image-container')) {
                        thumbnailWrapper = createThumbnail(originalImageData, currentRole);
                        targetContainer.replaceChild(thumbnailWrapper, addedElementInDom);
                    } else { // Déjà une vignette
                        thumbnailWrapper = addedElementInDom;
                        const thumbImg = thumbnailWrapper.querySelector('.img-thumbnail');
                        if(thumbImg) thumbImg.title = `ID: ${droppedImageId}\nAssigné à: ${currentRole}`;
                        const removeBtn = thumbnailWrapper.querySelector('.remove-thumbnail-btn');
                        if(removeBtn) removeBtn.title = `Retirer de ${currentRole}`;
                    }
                    updateStatus(`Image ${droppedImageId} ajoutée à la zone ${currentRole}.`, 'success');
                }
            
                // Appel du callback pour rafraîchir l'indicateur APRÈS que thumbnailWrapper est dans le DOM
                if (thumbnailWrapper && typeof onRefreshIndicatorCallback === 'function') {
                    onRefreshIndicatorCallback(droppedImageId); // ou originalImageData.id
                }
                console.log(`sortableManager.js -> Enfants final dans ${currentRole}: ${targetContainer.children.length}`);
            }, 
            onRemove: function(evt) {
                const itemEl = evt.item;
                const removedImageId = itemEl.dataset.imageId;
                console.log(`sortableManager.js onRemove Event: Image ID ${removedImageId} retirée de la zone ${role}`);
            }
        });
    });
    console.log("sortableManager.js: Initialisation de SortableJS terminée.");
}
