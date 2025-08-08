// js/variantAttributeManager.js

import {
    variantAssignmentContainer,
    availableTermsContainer,
    variantAttributeNameElement,
    imageCarousel,
    dropzoneMain,
    dropzoneGallery,
    dropzoneCustom
} from './dom.js';
import { updateStatus } from './uiUtils.js';

console.log('variantAttributeManager.js module loaded');

// --- État du module ---
let productVariantAttribute = null;
let currentImageTermMappings = new Map(); // Map<imageId, Array<termData>>
let availableTerms = [];
let sortableAvailableTerms = null;
let temporaryImageDropZoneInstances = [];

// --- Fonctions de création d'éléments (pour le retour au carrousel) ---
function createCarouselItem(image) {
    const container = document.createElement('div');
    container.className = 'carousel-image-container';
    container.dataset.imageId = image.id;
    container.dataset.imageUrl = image.url;
    const img = document.createElement('img');
    img.src = image.url;
    container.appendChild(img);
    return container;
}

/**
 * Initialise le système de gestion des variantes.
 * @param {Object} variantAttribute - L'objet variantAttribute de l'API.
 * @param {Array} allImageData - Le tableau global 'allImageData'.
 * @param {Function} onRefreshIndicatorCallback - Callback pour rafraîchir les indicateurs sur les images
 */
export function initVariantHandler(variantAttribute, allImageData, onRefreshIndicatorCallback) {
    console.log('[variantAttributeManager] initVariantHandler START');
    productVariantAttribute = variantAttribute;

    if (!variantAttribute || !variantAttribute.terms || variantAttribute.terms.length === 0) {
        console.warn('[variantAttributeManager] No variant attribute found for this product.');
        if (variantAssignmentContainer) variantAssignmentContainer.style.display = 'none';
        return;
    }

    if (variantAttributeNameElement) {
        variantAttributeNameElement.textContent = productVariantAttribute.attribute_name;
    }
    if (variantAssignmentContainer) {
        variantAssignmentContainer.style.display = 'block';
    }

    currentImageTermMappings.clear();
    availableTerms = [...productVariantAttribute.terms];

    allImageData.forEach(img => {
        currentImageTermMappings.set(img.id.toString(), []);
        img.assigned_terms = []; 
    });

    productVariantAttribute.terms.forEach(term => {
        if (term.current_image_id) {
            const imageIdStr = term.current_image_id.toString();
            const imageToUpdate = allImageData.find(img => img.id.toString() === imageIdStr);
            
            if (imageToUpdate) {
                const termData = {
                    termSlug: term.value,
                    termName: term.name,
                    termId: term.term_id,
                    hex: term.hex,
                };

                const termsForImage = currentImageTermMappings.get(imageIdStr);
                if (termsForImage) {
                    termsForImage.push(termData);
                    imageToUpdate.assigned_terms.push(termData);
                }
            }
        }
    });

    renderAvailableTerms();
    configureSortableForTerms(allImageData, onRefreshIndicatorCallback);
    
    currentImageTermMappings.forEach((terms, imageId) => {
        if (terms.length > 0) {
            onRefreshIndicatorCallback(imageId);
        }
    });

    console.log('[variantAttributeManager] initVariantHandler END');
}

function renderAvailableTerms() {
    if (!availableTermsContainer) return;

    const existingTerms = availableTermsContainer.querySelectorAll('.term-draggable, .no-swatches-message');
    existingTerms.forEach(term => term.remove());

    if (availableTerms.length === 0) {
        const message = document.createElement('p');
        message.className = 'no-swatches-message';
        message.textContent = 'Aucune variante disponible.';
        availableTermsContainer.appendChild(message);
        return;
    }

    availableTerms.forEach(term => {
        const termElement = document.createElement('div');
        termElement.className = 'term-draggable';
		termElement.draggable = true;
		
        termElement.title = term.name;
        termElement.dataset.termSlug = term.value;
        termElement.dataset.termName = term.name;
        termElement.dataset.termId = term.term_id;
        if (productVariantAttribute.display_type === 'color' && term.hex) {
            termElement.classList.add('color-swatch-draggable');
            termElement.style.backgroundColor = term.hex;
            termElement.dataset.hex = term.hex;
        } else {
            termElement.classList.add('term-button-draggable');
            termElement.textContent = term.name;
        }
        availableTermsContainer.appendChild(termElement);
    });
}

export function renderTermIndicator(imageId, termsDataArray) {
    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);
    if (!placeholders.length) return;

    placeholders.forEach(placeholder => {
        placeholder.innerHTML = '';
        placeholder.className = 'image-color-indicator-placeholder'; 

        if (!termsDataArray || termsDataArray.length === 0) {
            placeholder.classList.remove('active-indicator');
            return;
        }
        
        placeholder.classList.add('active-indicator');
        const indicatorWrapper = document.createElement('div');
        indicatorWrapper.className = 'multi-indicator-wrapper';

        termsDataArray.forEach(termData => {
            const indicator = document.createElement('span');
            indicator.className = 'single-indicator';
            indicator.title = `Variante: ${termData.termName}`;
            
            if (productVariantAttribute.display_type === 'color' && termData.hex) {
                indicator.classList.add('is-color-indicator');
                indicator.style.backgroundColor = termData.hex;
            } else {
                indicator.classList.add('is-button-indicator');
                indicator.textContent = termData.termName.substring(0, 1);
            }
            indicatorWrapper.appendChild(indicator);
        });
        placeholder.appendChild(indicatorWrapper);
    });
}

export function removeTermIndicator(imageId) {
    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);
    placeholders.forEach(placeholder => {
        placeholder.innerHTML = '';
        placeholder.className = 'image-color-indicator-placeholder';
        placeholder.classList.remove('active-indicator');
    });
}


export function dissociateTermFromImage(imageId, termSlug, allImageDataRef) {
    const imageIdStr = imageId.toString();
    const termsForImage = currentImageTermMappings.get(imageIdStr);
    if (!termsForImage || termsForImage.length === 0) return false;

    const termIndex = termsForImage.findIndex(t => t.termSlug === termSlug);
    if (termIndex === -1) return false;

    const termName = termsForImage[termIndex].termName;
    termsForImage.splice(termIndex, 1);

    const imageInData = allImageDataRef.find(img => img.id.toString() === imageIdStr);
    if (imageInData && imageInData.assigned_terms) {
        imageInData.assigned_terms = imageInData.assigned_terms.filter(t => t.termSlug !== termSlug);
    }
    
    refreshIndicatorForImage(imageId);

    updateStatus(`Variante '${termName}' dissociée.`, 'info');
    return true;
}

export function dissociateAllTerms(allImageDataRef) {
    let hadAssignments = false;
    currentImageTermMappings.forEach(terms => {
        if (terms.length > 0) hadAssignments = true;
    });

    if (!hadAssignments) {
        updateStatus("Aucune variation n'est actuellement assignée.", "info");
        return false;
    }

    currentImageTermMappings.forEach((terms, imageId) => {
        terms.length = 0;
        const imageInData = allImageDataRef.find(img => img.id.toString() === imageId);
        if (imageInData) {
            imageInData.assigned_terms = [];
        }
        removeTermIndicator(imageId);
    });

    updateStatus("Toutes les associations de variantes ont été réinitialisées.", "success");
    return true;
}

export function getAvailableTermsCount() {
    return availableTerms.length;
}

export function hasVariations() {
    return productVariantAttribute !== null && productVariantAttribute.terms && productVariantAttribute.terms.length > 0;
}

export function getVariantMappings() {
    const mappings = [];
    currentImageTermMappings.forEach((terms, imageId) => {
        terms.forEach(term => {
            mappings.push({ imageId, termSlug: term.termSlug });
        });
    });
    return mappings;
}

export function getVariantAttributeData() {
    return productVariantAttribute;
}

export function refreshIndicatorForImage(imageId) {
    if (!imageId) return;
    const imageIdStr = imageId.toString();
    const termsData = currentImageTermMappings.get(imageIdStr);
    if (termsData) {
        renderTermIndicator(imageIdStr, termsData);
    } else {
        removeTermIndicator(imageIdStr);
    }
}

function configureSortableForTerms(allImageDataRef, onRefreshIndicatorCallback) {
    if (!availableTermsContainer) return;
    if (sortableAvailableTerms) sortableAvailableTerms.destroy();

    sortableAvailableTerms = new Sortable(availableTermsContainer, {
        group: { name: 'terms-shared', pull: 'clone', put: false },
        animation: 150,
        sort: false,
		filter: '#reset-variants-btn', 
        
        onStart: function(evt) {
            document.body.classList.add('dragging-color-swatch');
            temporaryImageDropZoneInstances.forEach(instance => instance.destroy());
            temporaryImageDropZoneInstances = [];
            const imageElements = document.querySelectorAll('.carousel-image-container, .thumbnail-wrapper');
            
            imageElements.forEach(imgElContainer => {
                if (!imgElContainer.dataset.imageId) return;
                const instance = new Sortable(imgElContainer, {
                    group: { name: 'terms-shared', put: true },
                    animation: 0, 
                    ghostClass: 'color-drop-target-ghost',
                    onAdd: function(addEvt) {
                        const targetImageElement = this.el;
                        const droppedTermElement = addEvt.item;
                        const targetImageId = targetImageElement.dataset.imageId;

                        if (droppedTermElement.parentElement) {
                            droppedTermElement.parentElement.removeChild(droppedTermElement);
                        }
                        
                        const newTermData = {
                            termSlug: droppedTermElement.dataset.termSlug,
                            termName: droppedTermElement.dataset.termName,
                            termId: droppedTermElement.dataset.termId,
                            hex: droppedTermElement.dataset.hex || null
                        };

                        // --- DEBUT DE LA NOUVELLE LOGIQUE ---
                        // 1. Vérifier si cette variante est déjà assignée ailleurs
                        let oldImageId = null;
                        currentImageTermMappings.forEach((terms, imageId) => {
                            if (imageId !== targetImageId) {
                                if (terms.some(t => t.termSlug === newTermData.termSlug)) {
                                    oldImageId = imageId;
                                }
                            }
                        });

                        // 2. Si elle est assignée ailleurs, la retirer de l'ancienne image
                        if (oldImageId) {
                            dissociateTermFromImage(oldImageId, newTermData.termSlug, allImageDataRef);
                            updateStatus(`Variante '${newTermData.termName}' déplacée.`, 'info');
                        }
                        // --- FIN DE LA NOUVELLE LOGIQUE ---


                        const termsForImage = currentImageTermMappings.get(targetImageId);
                        
                        if (termsForImage && termsForImage.some(t => t.termSlug === newTermData.termSlug)) {
                            updateStatus(`La variante '${newTermData.termName}' est déjà assignée à cette image.`, 'warn');
                            return;
                        }

                        if (termsForImage) {
                            termsForImage.push(newTermData);
                        }

                        const targetImgInAllData = allImageDataRef.find(img => img.id.toString() === targetImageId);
                        if (targetImgInAllData) {
                            if (!targetImgInAllData.assigned_terms) {
                                targetImgInAllData.assigned_terms = [];
                            }
                            targetImgInAllData.assigned_terms.push(newTermData);
                        }
                        
                        onRefreshIndicatorCallback(targetImageId);
                        
                        updateStatus(`'${newTermData.termName}' assigné à l'image ID ${targetImageId}.`, 'success');
                    }
                });
                temporaryImageDropZoneInstances.push(instance);
            });
        },
        onEnd: function(evt) {
            document.body.classList.remove('dragging-color-swatch');
            temporaryImageDropZoneInstances.forEach(instance => instance.destroy());
            temporaryImageDropZoneInstances = [];
        }
    });
}