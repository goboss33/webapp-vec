// PROJET/webapp-vec-main/js/variantManager.js

import {
    // DOM Elements specific to variant colors that we will need
    variantColorAssignmentContainer, // Le conteneur global que nous avons ajouté
    availableColorSwatchesContainer, // Le conteneur pour les pastilles disponibles
    variantColorAttributeNameElement, // Le span pour le nom de l'attribut (ex: "Couleur")
    // Other DOM elements if needed, e.g., from dom.js
    imageCarousel, // Pour trouver les miniatures d'images
    dropzoneMain, dropzoneGallery, dropzoneCustom // Pour trouver les miniatures d'images
} from './dom.js';

import { updateStatus } from './uiUtils.js';

console.log('variantManager.js module loaded');

// Module-level state if necessary (e.g., to keep track of color data or mappings)
let productVariantColorData = null; // To store the raw variantColorAttributes data
let currentImageColorMappings = new Map(); // Map: imageId => {colorSlug, colorHex, termId, etc.}
let availableColorTerms = []; // Array of color term objects that are not yet assigned
let sortableAvailableSwatches = null;
const sortableImageTargetElements = []; // Pourrait stocker les instances ou juste les éléments


/**
 * Initializes the variant color management system.
 * - Stores the variant color data.
 * - Renders the available color swatches.
 * - Applies existing color assignments to image thumbnails.
 * @param {Array} variantColorAttributes - The 'variantColorAttributes' array from the product data.
 * Example: [{"attribute_id":9,"attribute_name":"Couleur","attribute_slug":"pa_couleur-v","terms":[...]}]
 * @param {Array} allImageData - The global 'allImageData' array from app.js.
 */
export function initVariantColorSwatches(variantColorAttributes, allImageData) {
    console.log('[variantManager] initVariantColorSwatches START');
    console.log('[variantManager] Received variantColorAttributes:', JSON.parse(JSON.stringify(variantColorAttributes)));
    console.log('[variantManager] Received allImageData:', JSON.parse(JSON.stringify(allImageData)));

    if (!variantColorAttributes || variantColorAttributes.length === 0) {
        console.warn('[variantManager] No variant color attributes found for this product.');
        if (variantColorAssignmentContainer) {
            variantColorAssignmentContainer.style.display = 'none'; // Hide the whole section
        }
        updateStatus('Aucun attribut de couleur de variante configuré pour ce produit.', 'info');
        return;
    }

    // For now, assume only one color attribute is managed this way.
    const colorAttribute = variantColorAttributes[0];
    productVariantColorData = colorAttribute; // Store it

    if (variantColorAttributeNameElement && colorAttribute.attribute_name) {
        variantColorAttributeNameElement.textContent = colorAttribute.attribute_name;
    } else if (variantColorAttributeNameElement) {
        variantColorAttributeNameElement.textContent = 'Couleurs'; // Fallback
    }

    if (variantColorAssignmentContainer) {
        variantColorAssignmentContainer.style.display = 'block'; // Ensure it's visible
    }

    // Reset internal states
    currentImageColorMappings.clear();
    availableColorTerms = [];

    // 1. Process existing assignments from allImageData
    // Each image in allImageData has `assigned_variant_color_slug`
    allImageData.forEach(image => {
        if (image.assigned_variant_color_slug) {
            const term = colorAttribute.terms.find(t => t.value === image.assigned_variant_color_slug);
            if (term) {
                currentImageColorMappings.set(image.id.toString(), { // Store by image ID string
                    colorSlug: term.value,
                    colorHex: term.hex,
                    termId: term.term_id,
                    termName: term.name
                });
                renderColorSwatchIndicator(image.id, term); // Render on the image
            } else {
                console.warn(`[variantManager] Image ID ${image.id} is assigned to color slug '${image.assigned_variant_color_slug}', but this term was not found in variantColorAttributes.`);
            }
        }
    });
    console.log('[variantManager] Initial currentImageColorMappings:', currentImageColorMappings);


    // 2. Determine available (unassigned) color terms
    const assignedColorSlugs = new Set(Array.from(currentImageColorMappings.values()).map(mapping => mapping.colorSlug));
    availableColorTerms = colorAttribute.terms.filter(term => !assignedColorSlugs.has(term.value));
    
    console.log('[variantManager] Available color terms for swatches:', JSON.parse(JSON.stringify(availableColorTerms)));

    // 3. Render draggable swatches for available colors
    renderAvailableSwatches();

    // 4. Configure SortableJS for swatches and image targets
    configureSortableForColorSwatches(allImageData); // Pass the allImageData reference
    
    console.log('[variantManager] initVariantColorSwatches END');
} // Fin de initVariantColorSwatches

/**
 * Renders the draggable color swatches for unassigned colors.
 */
function renderAvailableSwatches() {
    if (!availableColorSwatchesContainer) {
        console.error('[variantManager] availableColorSwatchesContainer DOM element not found.');
        return;
    }
    availableColorSwatchesContainer.innerHTML = ''; // Clear previous swatches

    if (availableColorTerms.length === 0) {
        availableColorSwatchesContainer.innerHTML = '<p class="no-swatches-message">Toutes les couleurs sont assignées ou aucune couleur disponible.</p>';
        return;
    }

    availableColorTerms.forEach(term => {
        if (!term.hex) {
            console.warn(`[variantManager] Term ${term.name} (slug: ${term.value}) is missing a HEX color. Skipping swatch.`);
            return;
        }
        const swatchElement = document.createElement('div');
        swatchElement.className = 'color-swatch-draggable';
        swatchElement.style.backgroundColor = term.hex;
        swatchElement.title = term.name;
        swatchElement.dataset.colorSlug = term.value;
        swatchElement.dataset.colorHex = term.hex;
        swatchElement.dataset.termId = term.term_id;
        swatchElement.dataset.termName = term.name;
        // Add a small inner element for better text contrast if needed, or for a more complex design
        // const innerCircle = document.createElement('span');
        // innerCircle.textContent = term.name.substring(0,1).toUpperCase(); // e.g., First letter
        // swatchElement.appendChild(innerCircle);

        availableColorSwatchesContainer.appendChild(swatchElement);
    });
    console.log(`[variantManager] Rendered ${availableColorTerms.length} swatches.`);
}

/**
 * Renders a color indicator on a given image thumbnail or carousel item.
 * @param {string|number} imageId - The ID of the image element.
 * @param {Object} colorData - The color term object (must include hex, value, name).
 */
export function renderColorSwatchIndicator(imageId, colorData) {
    if (!colorData || !colorData.hex || !colorData.value) {
        console.error('[variantManager] Invalid colorData for renderColorSwatchIndicator. HEX and value are required.', colorData);
        return;
    }
    console.log(`[variantManager] Rendering indicator for image ${imageId}, color ${colorData.name} (${colorData.hex})`);

    // Find all placeholders for this image ID (one in carousel, one in a dropzone if present)
    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);

    if (placeholders.length === 0) {
        console.warn(`[variantManager] No placeholder found for image ID ${imageId} to render color indicator.`);
        return;
    }

    placeholders.forEach(placeholder => {
        placeholder.innerHTML = ''; // Clear any existing indicator
        placeholder.style.backgroundColor = colorData.hex;
        placeholder.title = `Couleur: ${colorData.name}`;
        placeholder.dataset.assignedColorSlug = colorData.value; // Store slug for easy removal/check
        placeholder.classList.add('active-indicator'); // Add class to make it visible (styling via CSS)
    });
}

/**
 * Removes the color indicator from a given image thumbnail or carousel item.
 * @param {string|number} imageId - The ID of the image element.
 */
export function removeColorSwatchIndicator(imageId) {
    console.log(`[variantManager] Removing indicator from image ${imageId}`);
    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);
    placeholders.forEach(placeholder => {
        placeholder.innerHTML = '';
        placeholder.style.backgroundColor = 'transparent'; // Or remove style
        placeholder.title = '';
        delete placeholder.dataset.assignedColorSlug;
        placeholder.classList.remove('active-indicator');
    });
}

/**
 * Configures SortableJS for dragging color swatches onto image thumbnails.
 * This function should be called once after initVariantColorSwatches.
 * It assumes `allImageData` is accessible or can be passed if needed for updates.
 * (For now, we'll rely on module-level `currentImageColorMappings` and `availableColorTerms`
 * and `productVariantColorData` being up-to-date from initVariantColorSwatches)
 */
function configureSortableForColorSwatches(allImageDataRef) { // Pass allImageData reference
    console.log('[variantManager] Configuring SortableJS for color swatches and image targets.');

    if (!availableColorSwatchesContainer) {
        console.error('[variantManager] availableColorSwatchesContainer is not available. Cannot init SortableJS for swatches.');
        return;
    }

    // 1. Initialize Sortable for the source list of color swatches
    if (sortableAvailableSwatches) {
        sortableAvailableSwatches.destroy();
    }
    sortableAvailableSwatches = new Sortable(availableColorSwatchesContainer, {
        group: {
            name: 'color-swatches',
            pull: 'clone', // Clone the item when dragging out
            put: false     // Do not allow items to be dropped back into this list directly by Sortable
        },
        animation: 150,
        sort: false, // Do not allow sorting within the source list
        filter: '.no-swatches-message', // Ignore clicks on the placeholder message
        onClone: function (/**Event*/evt) {
            const origEl = evt.item;
            console.log('[variantManager] Swatch cloned:', origEl.dataset.colorSlug);
        },
        onEnd: function (/**Event*/evt) {
            // If a clone was made but not dropped into a valid Sortable target,
            // SortableJS with pull:'clone' usually removes the clone.
            // We primarily handle logic in the onAdd of the target lists.
            console.log('[variantManager] Drag ended for swatch. Target:', evt.to);
             if (evt.to === availableColorSwatchesContainer || evt.pullMode === 'clone' && !evt.item.parentElement) {
                // If it's back in the original container OR if clone was pulled but not dropped (and removed by Sortable)
                // No action needed here for a clone, it's usually removed if not dropped in a compatible target.
             }
        }
    });
    console.log('[variantManager] SortableJS initialized for availableColorSwatchesContainer.');

    // 2. Define image containers as Sortable targets
    const imageTargetContainers = [];
    if (imageCarousel) imageTargetContainers.push(imageCarousel); // Entire carousel
    if (dropzoneMain) imageTargetContainers.push(dropzoneMain.querySelector('.thumbnail-container'));
    if (dropzoneGallery) imageTargetContainers.push(dropzoneGallery.querySelector('.thumbnail-container'));
    if (dropzoneCustom) imageTargetContainers.push(dropzoneCustom.querySelector('.thumbnail-container'));

    sortableImageTargetElements.forEach(instance => instance.destroy()); // Clear previous instances if any
    sortableImageTargetElements.length = 0; // Clear the array

    imageTargetContainers.filter(Boolean).forEach(containerElement => {
        if (!containerElement) return;

        const instance = new Sortable(containerElement, {
            group: {
                name: 'image-targets', // Common group for all image targets
                put: function (to, from, dragEl, event) {
                    // Accepter le dépôt seulement si l'élément glissé est une pastille de couleur
                    const isColorSwatch = dragEl.classList.contains('color-swatch-draggable');
                    if (isColorSwatch) {
                        console.log('[variantManager] Group Put Function: Allowing drop of color swatch:', dragEl);
                        return true; // Autoriser le dépôt de la pastille
                    } else {
                        console.log('[variantManager] Group Put Function: Preventing drop of non-color swatch (likely an image):', dragEl);
                        return false; // Empêcher le dépôt si ce n'est pas une pastille de couleur
                    }
                } // Accept items from 'color-swatches' group
            },
            animation: 150,
            draggable: '.carousel-image-container, .thumbnail-wrapper', // Specify what can be sorted *within* these lists (image reordering)
                                                                     // This might conflict if we only want to drop swatches.
                                                                     // Let's refine this: these targets are NOT for sorting their own items,
                                                                     // only for RECEIVING swatches.
                                                                     // So, sort: false is better for the swatch drop logic.
            sort: false, // Prevent re-sorting of images within these lists BY THIS Sortable instance. Image sorting is handled by sortableManager.js

            onAdd: function (/**Event*/evt) {
                const droppedElement = evt.item; // L'élément qui a été glissé et déposé
                const targetDomContainer = evt.to; // Le conteneur DOM où il a été déposé (ex: .thumbnail-container)
                // evt.from est le conteneur d'origine
            
                // --- IDENTIFICATION DE L'ÉLÉMENT DÉPOSÉ ---
                if (!droppedElement.classList.contains('color-swatch-draggable')) {
                    console.log('[variantManager] onAdd: Item dropped is NOT a color swatch. Assuming image drag by sortableManager. Item:', droppedElement);
                    // Si ce n'est pas une pastille de couleur, cette instance Sortable (variantManager)
                    // ne doit pas interférer avec le travail de sortableManager.js.
                    // Normalement, si les groupes sont bien définis, sortableManager devrait gérer ce cas.
                    // On ne retire PAS l'élément ici, car il a pu être légitimement ajouté par sortableManager.
                    // On s'assure juste que CETTE fonction onAdd ne le traite pas comme une pastille.
                    return;
                }
            
                // Si on arrive ici, droppedElement EST une pastille de couleur draggable
                const droppedSwatchElement = droppedElement;
                console.log('[variantManager] onAdd: Detected a COLOR SWATCH drop.');
            
                // --- IDENTIFICATION DE L'IMAGE CIBLE ---
                let targetImageElement = evt.originalEvent ? evt.originalEvent.target : null; // L'élément HTML réel sous la souris lors du drop
                
                // Si evt.originalEvent.target n'est pas directement l'image (ça peut être un enfant), on remonte.
                if (targetImageElement && !targetImageElement.matches('.carousel-image-container, .thumbnail-wrapper')) {
                    targetImageElement = targetImageElement.closest('.carousel-image-container, .thumbnail-wrapper');
                }
                
                console.log('[variantManager] onAdd - Processing dropped swatch:', droppedSwatchElement, 'Attempted target image element:', targetImageElement);
            
                if (!targetImageElement || !targetImageElement.dataset.imageId) {
                    console.error('[variantManager] Could not determine target image for the dropped swatch. Original target:', evt.originalEvent ? evt.originalEvent.target : 'N/A');
                    // La pastille clonée doit être retirée car elle n'a pas été déposée sur une cible image valide.
                    droppedSwatchElement.remove(); 
                    updateStatus('Couleur non assignée : déposez directement sur une miniature d\'image.', 'warn');
                    // Il n'est pas nécessaire de rappeller renderAvailableSwatches() ici car la pastille originale est toujours là (grâce à pull: 'clone').
                    return;
                }
            
                const targetImageId = targetImageElement.dataset.imageId;
                const newColorData = { 
                    colorSlug: droppedSwatchElement.dataset.colorSlug,
                    colorHex: droppedSwatchElement.dataset.colorHex,
                    termId: droppedSwatchElement.dataset.termId,
                    termName: droppedSwatchElement.dataset.termName
                };
            
                console.log(`[variantManager] Assigning color ${newColorData.termName} (slug: ${newColorData.colorSlug}) to image ID ${targetImageId}`);
            
                // --- LOGIQUE DE CONFLIT ET MISE À JOUR D'ÉTAT ---
            
                // 1. Quelle couleur était précédemment assignée à targetImageId ?
                let oldColorDataForTargetImage = null;
                if (currentImageColorMappings.has(targetImageId)) {
                    oldColorDataForTargetImage = currentImageColorMappings.get(targetImageId);
                }
            
                // 2. À quelle image (si une) newColorData.colorSlug était-elle précédemment assignée ?
                let oldImageIdForNewColor = null;
                for (const [imgId, colorMap] of currentImageColorMappings.entries()) {
                    if (colorMap.colorSlug === newColorData.colorSlug) {
                        oldImageIdForNewColor = imgId;
                        break;
                    }
                }
                
                // --- Exécution des mises à jour ---
            
                // A. Si targetImageId était précédemment assignée à une AUTRE couleur (oldColorDataForTargetImage)
                if (oldColorDataForTargetImage && oldColorDataForTargetImage.colorSlug !== newColorData.colorSlug) {
                    console.log(`[variantManager] Image ${targetImageId} was previously ${oldColorDataForTargetImage.termName}. Dissociating old color.`);
                    // La mapping sera écrasée, mais il faut remettre l'ancienne couleur dans la liste des disponibles.
                    const oldTermObject = productVariantColorData.terms.find(t => t.value === oldColorDataForTargetImage.colorSlug);
                    if (oldTermObject && !availableColorTerms.some(t => t.value === oldTermObject.value)) {
                        availableColorTerms.push(oldTermObject);
                    }
                    // Mettre à jour allImageDataRef (la référence au tableau de app.js)
                    const imgInAllData = allImageDataRef.find(img => img.id.toString() === targetImageId);
                    if (imgInAllData) { // L'image elle-même n'a plus cette ancienne couleur.
                        // Si on ne stocke que le nouveau slug, pas besoin de nullifier explicitement ici,
                        // car la nouvelle affectation va écraser.
                    }
                    // L'indicateur sur targetImageId sera mis à jour avec la nouvelle couleur ci-dessous.
                }
            
                // B. Si newColorData.colorSlug était précédemment assignée à une AUTRE image (oldImageIdForNewColor)
                if (oldImageIdForNewColor && oldImageIdForNewColor !== targetImageId) {
                    console.log(`[variantManager] Color ${newColorData.termName} was previously on image ${oldImageIdForNewColor}. Dissociating from old image.`);
                    currentImageColorMappings.delete(oldImageIdForNewColor); // Supprimer l'ancienne association pour cette couleur
                    removeColorSwatchIndicator(oldImageIdForNewColor); // Retirer l'indicateur de l'ancienne image
                    // Mettre à jour allImageDataRef pour l'ancienne image
                    const oldImgInAllData = allImageDataRef.find(img => img.id.toString() === oldImageIdForNewColor);
                    if (oldImgInAllData) {
                        oldImgInAllData.assigned_variant_color_slug = null;
                    }
                }
            
                // C. Établir la nouvelle assignation
                currentImageColorMappings.set(targetImageId, { // Stocker toutes les infos pertinentes
                    colorSlug: newColorData.colorSlug,
                    colorHex: newColorData.colorHex,
                    termId: newColorData.termId,
                    termName: newColorData.termName
                });
                
                // Mettre à jour allImageDataRef pour l'image cible
                const targetImgInAllData = allImageDataRef.find(img => img.id.toString() === targetImageId);
                if (targetImgInAllData) {
                    targetImgInAllData.assigned_variant_color_slug = newColorData.colorSlug;
                }
            
                renderColorSwatchIndicator(targetImageId, newColorData); // Afficher le nouvel indicateur
            
                // D. Mettre à jour la liste des pastilles disponibles (retirer celle qui vient d'être assignée)
                availableColorTerms = availableColorTerms.filter(term => term.value !== newColorData.colorSlug);
            
                // E. Rafraîchir l'affichage des pastilles disponibles
                renderAvailableSwatches();
            
                // F. Supprimer l'élément pastille cloné du DOM (puisque pull: 'clone')
                droppedSwatchElement.remove(); 
            
                console.log('[variantManager] Updated currentImageColorMappings:', currentImageColorMappings);
                console.log('[variantManager] Updated availableColorTerms:', availableColorTerms.map(t => t.value)); // Log des slugs pour la concision
                updateStatus(`Couleur ${newColorData.termName} assignée à l'image ID ${targetImageId}.`, 'success');
            }
        });
        sortableImageTargetElements.push(instance);
        console.log(`[variantManager] SortableJS target initialized for container:`, containerElement);
    });
    console.log('[variantManager] SortableJS configuration for image targets complete.');
}
