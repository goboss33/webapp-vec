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
    // Condition plus flexible pour accepter soit 'value' soit 'colorSlug' pour le slug,
    // et soit 'name' soit 'termName' pour le nom.
    const slug = colorData.value || colorData.colorSlug;
    const name = colorData.name || colorData.termName;
    const hex = colorData.hex || colorData.colorHex; // Accepter aussi colorHex

    if (!hex || !slug) { // On a besoin au moins du hex et du slug (qui sert pour dataset)
        console.error('[variantManager] Invalid colorData for renderColorSwatchIndicator. HEX and (value/colorSlug) are required.', JSON.parse(JSON.stringify(colorData)));
        // Retirer tout indicateur existant si les données sont invalides pour éviter un état incohérent
        removeColorSwatchIndicator(imageId);
        return;
    }

    // Utiliser le nom disponible, sinon le slug comme fallback pour le titre
    const displayName = name || slug;

    console.log(`[variantManager] Rendering indicator for image ${imageId}, color <span class="math-inline">\{displayName\} \(</span>{hex}), slug ${slug}`);

    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);

    if (placeholders.length === 0) {
        // Ce log est utile s'il se produit de manière inattendue après l'initialisation.
        // console.warn(`[variantManager] No placeholder found for image ID ${imageId} to render color indicator.`);
        return;
    }

    placeholders.forEach(placeholder => {
        placeholder.innerHTML = ''; 
        placeholder.style.backgroundColor = hex;
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
    console.log('[variantManager] Configuring SortableJS for COLOR SWATCH SOURCE ONLY.');

    if (!availableColorSwatchesContainer) {
        console.error('[variantManager] availableColorSwatchesContainer is not available. Cannot init SortableJS for swatches.');
        return;
    }

    if (sortableAvailableSwatches) {
        sortableAvailableSwatches.destroy();
    }

    sortableAvailableSwatches = new Sortable(availableColorSwatchesContainer, {
        group: {
            name: 'color-swatches',
            pull: 'clone', // On clone la pastille quand on la tire
            put: false     // On ne peut pas déposer dans cette liste source
        },
        animation: 150,
        sort: false,      // Pas de tri dans la liste source
        filter: '.no-swatches-message',
        
        onStart: function(evt) {
            console.log('[variantManager] Swatch drag started:', evt.item.dataset.colorSlug);
            // On pourrait ajouter une classe au body pour styler les cibles potentielles
            document.body.classList.add('dragging-color-swatch');
        },

        onEnd: function (/**Event*/evt) {
            document.body.classList.remove('dragging-color-swatch');
            const draggedSwatchElement = evt.item; // L'élément original qui a été cloné (ou le clone si pull n'est pas 'clone')
            const clone = evt.clone; // Le clone qui a été inséré dans le DOM si pull: 'clone'
            
            // Si le clone existe et a un parent, cela signifie qu'il a été déposé quelque part (même si ce n'est pas une cible valide)
            // ou qu'il n'a pas été correctement retiré par SortableJS s'il a été lâché hors d'une zone de réception.
            // Avec pull:'clone', Sortable retire le clone si non déposé dans une zone réceptrice configurée pour 'put'.
            // Ici, nos images cibles NE SONT PAS des zones Sortable réceptrices pour ce groupe.
            // Donc, on doit trouver la cible via l'événement souris et gérer manuellement.

            if (clone && clone.parentElement) { // Si le clone a été inséré quelque part par SortableJS
                clone.remove(); // On retire toujours le clone créé par SortableJS car on gère l'effet manuellement.
            }
            
            // Vérifier si l'élément a été déposé en dehors de sa liste d'origine
            // (avec pull:'clone', evt.to sera null ou le conteneur parent si lâché sur un non-sortable,
            // et evt.from sera availableColorSwatchesContainer).
            // L'important est de trouver la cible sous la souris.

            let actualTargetElement = evt.originalEvent ? evt.originalEvent.target : null;
            if (!actualTargetElement) {
                console.log('[variantManager] onEnd: No originalEvent.target found.');
                // draggedSwatchElement.remove(); // S'il n'est pas cloné et qu'il a été sorti
                return;
            }

            let targetImageElement = actualTargetElement.closest('.carousel-image-container, .thumbnail-wrapper');

            if (targetImageElement && targetImageElement.dataset.imageId) {
                // C'est une cible d'image valide !
                const targetImageId = targetImageElement.dataset.imageId;
                const newColorData = { 
                    colorSlug: draggedSwatchElement.dataset.colorSlug, // Utiliser l'original pour les data
                    colorHex: draggedSwatchElement.dataset.colorHex,
                    termId: draggedSwatchElement.dataset.termId,
                    termName: draggedSwatchElement.dataset.termName
                };

                console.log(`[variantManager] onEnd: Swatch ${newColorData.termName} dropped on image ID ${targetImageId}`);

                // --- Début de la logique d'assignation (similaire à l'ancien onAdd) ---
                let oldColorDataForTargetImage = null;
                if (currentImageColorMappings.has(targetImageId)) {
                    oldColorDataForTargetImage = currentImageColorMappings.get(targetImageId);
                }

                let oldImageIdForNewColor = null;
                for (const [imgId, colorMap] of currentImageColorMappings.entries()) {
                    if (colorMap.colorSlug === newColorData.colorSlug) {
                        oldImageIdForNewColor = imgId;
                        break;
                    }
                }
                
                if (oldColorDataForTargetImage && oldColorDataForTargetImage.colorSlug === newColorData.colorSlug) {
                    console.log(`[variantManager] Color ${newColorData.termName} is already assigned to image ${targetImageId}. No change.`);
                    updateStatus(`La couleur ${newColorData.termName} est déjà sur cette image.`, 'info');
                    // La pastille originale reste dans la source (comportement de 'clone'), ce qui est bien.
                    return;
                }

                if (oldColorDataForTargetImage && oldColorDataForTargetImage.colorSlug !== newColorData.colorSlug) {
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
                }

                renderColorSwatchIndicator(targetImageId, newColorData); 
                availableColorTerms = availableColorTerms.filter(term => term.value !== newColorData.colorSlug);
                renderAvailableSwatches(); // Rafraîchir la liste des pastilles sources

                console.log('[variantManager] Updated currentImageColorMappings:', currentImageColorMappings);
                console.log('[variantManager] Updated availableColorTerms:', availableColorTerms.map(t => t.value)); 
                updateStatus(`Couleur ${newColorData.termName} assignée à l'image ID ${targetImageId}.`, 'success');
                // --- Fin de la logique d'assignation ---

            } else {
                console.log('[variantManager] onEnd: Swatch dropped, but not on a valid image target.');
                // La pastille clonée a déjà été retirée. La pastille originale est toujours dans la source.
                // Rien de plus à faire.
            }
        }
    });
    console.log('[variantManager] SortableJS initialized for SWATCH SOURCE CONTAINER ONLY.');

    // Supprimer l'initialisation des cibles d'images par variantManager
    // La boucle imageTargetContainers.forEach(...) est retirée.
}
