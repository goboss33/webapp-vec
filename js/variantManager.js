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
//const sortableImageTargetElements = []; // Pourrait stocker les instances ou juste les éléments


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
                // Enrichir l'objet image dans allImageData pour modalManager
                image.assigned_color_name = term.name; // << NOUVELLE LIGNE
                image.assigned_color_hex = term.hex;   // << NOUVELLE LIGNE
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
// Dans variantManager.js
export function renderColorSwatchIndicator(imageId, colorData) {
    console.log(`[variantManager] renderColorSwatchIndicator CALLED for imageId: ${imageId}. Raw colorData:`, JSON.parse(JSON.stringify(colorData)));

    if (!colorData) {
        console.error(`[variantManager] renderColorSwatchIndicator: colorData is NULL or UNDEFINED for imageId ${imageId}.`);
        removeColorSwatchIndicator(imageId); // Assurer le nettoyage
        return;
    }

    const slug = colorData.value || colorData.colorSlug;
    const name = colorData.name || colorData.termName;
    const hexValue = colorData.hex || colorData.colorHex; // Renommé pour clarté

    // Logs de débogage critiques :
    console.log(`[variantManager] renderColorSwatchIndicator - For imageId ${imageId}:`);
    console.log(`  Attempted slug from colorData.value: "${colorData.value}", from colorData.colorSlug: "${colorData.colorSlug}" -> RESULTING slug: "${slug}"`);
    console.log(`  Attempted hex from colorData.hex: "${colorData.hex}", from colorData.colorHex: "${colorData.colorHex}" -> RESULTING hexValue: "${hexValue}"`);
    console.log(`  Is !hexValue true? ${!hexValue}. Is !slug true? ${!slug}. Combined condition: ${!hexValue || !slug}`);

    if (!hexValue || !slug) {
        console.error(`[variantManager] FINAL CHECK FAILED for imageId ${imageId}: Invalid colorData. hexValue="${hexValue}", slug="${slug}"`, JSON.parse(JSON.stringify(colorData)));
        removeColorSwatchIndicator(imageId);
        return;
    }
    
    const displayName = name || slug;
    // console.log(`[variantManager] Rendering indicator for image ${imageId}, color ${displayName} (${hexValue}), slug ${slug}`); // Ce log est bon, mais peut être redondant si les précédents sont clairs

    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);

    if (placeholders.length === 0) {
        // console.warn(`[variantManager] No placeholder found for image ID ${imageId} during renderColorSwatchIndicator.`);
        return;
    }

    placeholders.forEach(placeholder => {
        placeholder.innerHTML = ''; 
        placeholder.style.backgroundColor = hexValue;
        placeholder.title = `Couleur: ${displayName}`;
        placeholder.dataset.assignedColorSlug = slug; 
        placeholder.classList.add('active-indicator');
    });
}

/**
 * Re-renders the color swatch indicator for a specific image if it has an assigned color.
 * @param {string|number} imageId The ID of the image.
 */
export function refreshIndicatorForImage(imageId) {
    if (!imageId) return;
    const imageIdStr = imageId.toString();

    if (currentImageColorMappings.has(imageIdStr)) {
        const colorData = currentImageColorMappings.get(imageIdStr);
        console.log(`[variantManager] Refreshing indicator for image ${imageIdStr} with color ${colorData.termName}`);
        renderColorSwatchIndicator(imageIdStr, colorData); // renderColorSwatchIndicator s'occupe de trouver les placeholders
    } else {
        // S'assurer qu'aucun indicateur n'est affiché si pas de mapping
        // removeColorSwatchIndicator(imageIdStr); // Déjà fait par renderColorSwatchIndicator qui nettoie avant
        console.log(`[variantManager] No color mapping for image ${imageIdStr}, no indicator to refresh.`);
    }
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

function configureSortableForColorSwatches(allImageDataRef) { // allImageDataRef est la référence à allImageData de app.js
    console.log('[variantManager] Configuring SortableJS for COLOR SWATCH SOURCE ONLY using onEnd.');

    if (!availableColorSwatchesContainer) {
        console.error('[variantManager] availableColorSwatchesContainer is not available.');
        return;
    }

    if (sortableAvailableSwatches) {
        sortableAvailableSwatches.destroy();
    }

    sortableAvailableSwatches = new Sortable(availableColorSwatchesContainer, {
        group: {
            name: 'color-swatches',
            pull: 'clone',
            put: false
        },
        animation: 150,
        sort: false,
        forceFallback: true, // DOIT ÊTRE true pour ce test
        fallbackOnBody: true, // DOIT ÊTRE true pour ce test
        fallbackClass: "custom-color-swatch-fallback", // Vérifiez bien ce nom
        filter: '.no-swatches-message',
        // delay: 0, // Commenté pour l'instant
        // delayOnTouchOnly: true, // Commenté pour l'instant
        // touchStartThreshold: 5, // Commenté pour l'instant
    
        onStart: function(evt) {
            console.log('[variantManager] Swatch drag started:', evt.item.dataset.colorSlug);
            document.body.classList.add('dragging-color-swatch');
            if (evt.clone) { // evt.clone est l'élément original cloné
                console.log('[variantManager] Original item being cloned:', evt.clone);
            }
            // Essayons de trouver le fallback après un court instant
            setTimeout(() => {
                const fallbackElement = document.querySelector('.custom-color-swatch-fallback');
                if (fallbackElement) {
                    console.log('[variantManager] Fallback element found in DOM:', fallbackElement);
                    console.log('[variantManager] Fallback computed style:', window.getComputedStyle(fallbackElement).cssText.substring(0, 500) + "..."); // Log des styles calculés
                } else {
                    console.warn('[variantManager] Fallback element NOT found in DOM shortly after start.');
                }
            }, 0);
        },
        onEnd: function (/**Event*/evt) {
            document.body.classList.remove('dragging-color-swatch');
            const draggedOriginalSwatchElement = evt.item; // L'élément original dans la liste source
            const clone = evt.clone; // Le clone qui a été manipulé

            // Toujours retirer le clone du DOM s'il y a été inséré par SortableJS hors d'une cible configurée
            if (clone && clone.parentElement) {
                clone.remove();
            }
            
            let actualTargetElement = evt.originalEvent ? evt.originalEvent.target : null;
            if (!actualTargetElement) {
                console.log('[variantManager] onEnd: No originalEvent.target found for swatch drop.');
                return;
            }

            let targetImageElement = actualTargetElement.closest('.carousel-image-container, .thumbnail-wrapper');

            if (targetImageElement && targetImageElement.dataset.imageId) {
                const targetImageId = targetImageElement.dataset.imageId;
                // Utiliser les données de l'élément original (draggedOriginalSwatchElement)
                // car le clone pourrait avoir été modifié ou ne pas avoir tous les data attributes.
                const newColorData = { 
                    colorSlug: draggedOriginalSwatchElement.dataset.colorSlug,
                    colorHex: draggedOriginalSwatchElement.dataset.colorHex,
                    termId: draggedOriginalSwatchElement.dataset.termId,
                    termName: draggedOriginalSwatchElement.dataset.termName
                };

                console.log(`[variantManager] onEnd: Swatch ${newColorData.termName} dropped on image ID ${targetImageId}`);

                // --- Logique d'assignation (identique à ce que nous avions dans onAdd) ---
                let oldColorDataForTargetImage = null;
                if (currentImageColorMappings.has(targetImageId)) {
                    oldColorDataForTargetImage = currentImageColorMappings.get(targetImageId);
                }

                if (oldColorDataForTargetImage && oldColorDataForTargetImage.colorSlug === newColorData.colorSlug) {
                    console.log(`[variantManager] Color ${newColorData.termName} is already assigned to image ${targetImageId}. No change.`);
                    updateStatus(`La couleur ${newColorData.termName} est déjà sur cette image.`, 'info');
                    return;
                }
                
                let oldImageIdForNewColor = null;
                for (const [imgId, colorMap] of currentImageColorMappings.entries()) {
                    if (colorMap.colorSlug === newColorData.colorSlug) {
                        oldImageIdForNewColor = imgId;
                        break;
                    }
                }
                
                if (oldColorDataForTargetImage /* && oldColorDataForTargetImage.colorSlug !== newColorData.colorSlug */) { // La 2e condition est implicite si on est ici
                    console.log(`[variantManager] Image ${targetImageId} was previously ${oldColorDataForTargetImage.termName}. Dissociating old color.`);
                    const oldTermObject = productVariantColorData.terms.find(t => t.value === oldColorDataForTargetImage.colorSlug);
                    if (oldTermObject && !availableColorTerms.some(t => t.value === oldTermObject.value)) {
                        availableColorTerms.push(oldTermObject);
                    }
                    const imgInAllData = allImageDataRef.find(img => img.id.toString() === targetImageId);
                     if (imgInAllData) {
                        imgInAllData.assigned_variant_color_slug = null; 
                    }
                }

                if (oldImageIdForNewColor && oldImageIdForNewColor !== targetImageId) {
                    console.log(`[variantManager] Color ${newColorData.termName} was previously on image ${oldImageIdForNewColor}. Dissociating from old image.`);
                    currentImageColorMappings.delete(oldImageIdForNewColor); 
                    removeColorSwatchIndicator(oldImageIdForNewColor); 
                    const oldImgInAllData = allImageDataRef.find(img => img.id.toString() === oldImageIdForNewColor);
                    if (oldImgInAllData) {
                        oldImgInAllData.assigned_variant_color_slug = null;
                    }
                }

                currentImageColorMappings.set(targetImageId, { ...newColorData });
                const targetImgInAllData = allImageDataRef.find(img => img.id.toString() === targetImageId);
                if (targetImgInAllData) {
                    targetImgInAllData.assigned_variant_color_slug = newColorData.colorSlug;
                    targetImgInAllData.assigned_color_name = newColorData.termName; // << NOUVELLE LIGNE
                    targetImgInAllData.assigned_color_hex = newColorData.colorHex;   // << NOUVELLE LIGNE
                }

                renderColorSwatchIndicator(targetImageId, newColorData); 
                availableColorTerms = availableColorTerms.filter(term => term.value !== newColorData.colorSlug);
                renderAvailableSwatches(); 

                console.log('[variantManager] Updated currentImageColorMappings:', currentImageColorMappings);
                console.log('[variantManager] Updated availableColorTerms:', availableColorTerms.map(t => t.value)); 
                updateStatus(`Couleur ${newColorData.termName} assignée à l'image ID ${targetImageId}.`, 'success');
                // --- Fin de la logique d'assignation ---
            } else {
                console.log('[variantManager] onEnd: Swatch dropped, but not on a valid image target (targetImageElement or imageId missing).');
            }
        }
    });
    console.log('[variantManager] SortableJS initialized for SWATCH SOURCE CONTAINER ONLY.');
    // Il n'y a plus de boucle pour initialiser Sortable sur les imageTargetContainers ici.
}

/**
 * Dissociates a color from a specific image.
 * Updates internal state and UI.
 * @param {string|number} imageId The ID of the image to dissociate the color from.
 * @param {string} colorSlugToDissociate The slug of the color to remove from the image.
 * @param {Array} allImageDataRef Reference to the global allImageData array from app.js
 * @param {Object} productVariantDataRef Reference to productVariantColorData (for term details)
 */
export function dissociateColorFromImage(imageId, colorSlugToDissociate, allImageDataRef, productVariantDataRef) {
    const imageIdStr = imageId.toString();
    console.log(`[variantManager] Attempting to dissociate color '${colorSlugToDissociate}' from image ID '${imageIdStr}'`);

    if (!currentImageColorMappings.has(imageIdStr)) {
        console.warn(`[variantManager] Image ID '${imageIdStr}' has no color mapping to dissociate.`);
        return false; // Aucune action si pas de mapping
    }

    const currentMapping = currentImageColorMappings.get(imageIdStr);
    if (currentMapping.colorSlug !== colorSlugToDissociate) {
        console.warn(`[variantManager] Image ID '<span class="math-inline">\{imageIdStr\}' is mapped to '</span>{currentMapping.colorSlug}', not '${colorSlugToDissociate}'. No action taken.`);
        return false;
    }

    // 1. Retirer le mapping
    currentImageColorMappings.delete(imageIdStr);

    // 2. Mettre à jour allImageDataRef
    const imageInData = allImageDataRef.find(img => img.id.toString() === imageIdStr);
    if (imageInData) {
        imageInData.assigned_variant_color_slug = null;
        delete imageInData.assigned_color_name;
        delete imageInData.assigned_color_hex;
    }

    // 3. Retirer l'indicateur visuel de l'image
    removeColorSwatchIndicator(imageIdStr);

    // 4. Remettre la pastille de couleur dans la liste des disponibles
    // (Trouver l'objet terme complet pour le slug dissocié)
    if (productVariantDataRef && productVariantDataRef.terms) {
        const termObject = productVariantDataRef.terms.find(term => term.value === colorSlugToDissociate);
        if (termObject) {
            // S'assurer qu'elle n'y est pas déjà pour éviter les doublons (peu probable ici, mais bonne pratique)
            if (!availableColorTerms.some(t => t.value === termObject.value)) {
                availableColorTerms.push(termObject);
            }
        } else {
            console.warn(`[variantManager] Could not find term object for slug '${colorSlugToDissociate}' to add back to available terms.`);
        }
    } else {
        console.warn(`[variantManager] productVariantColorData.terms not available for dissociation logic.`);
    }

    // 5. Rafraîchir l'affichage des pastilles disponibles
    renderAvailableSwatches();

    updateStatus(`Couleur ${currentMapping.termName || colorSlugToDissociate} dissociée de l'image ID ${imageIdStr}.`, 'info');
    console.log(`[variantManager] Color '${currentMapping.termName || colorSlugToDissociate}' dissociated from image ID '${imageIdStr}'. Mappings:`, currentImageColorMappings, "Available:", availableColorTerms.map(t=>t.value));
    return true; // Succès
}

/**
 * Returns the stored productVariantColorData.
 * @returns {Object|null} The product's main color attribute data.
 */
export function getProductVariantData() {
    return productVariantColorData;
}

/**
 * Retrieves the current image to color slug mappings.
 * @returns {Array<Object>} An array of objects, e.g., [{ imageId: "123", colorSlug: "rouge" }, ...]
 * Returns an empty array if no mappings exist.
 */
export function getVariantColorMappings() {
    const mappings = [];
    if (currentImageColorMappings && currentImageColorMappings.size > 0) {
        currentImageColorMappings.forEach((colorData, imageId) => {
            mappings.push({
                imageId: imageId, // imageId est déjà une chaîne ici
                colorSlug: colorData.colorSlug
            });
        });
    }
    console.log('[variantManager] getVariantColorMappings executed. Mappings to save:', JSON.parse(JSON.stringify(mappings)));
    return mappings;
}
