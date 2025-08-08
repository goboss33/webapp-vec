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
// MODIFICATION CLÉ : on passe d'une association simple à un tableau de variantes par image.
let currentImageTermMappings = new Map(); // La clé est imageId, la valeur est maintenant un ARRAY de mappings { termSlug, termName, ... }
let availableTerms = [];
let sortableAvailableTerms = null;
let temporaryImageDropZoneInstances = [];

// --- Fonctions de création d'éléments ---
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
    availableTerms = [];

    // MODIFICATION : Logique pour peupler la map avec des tableaux de variantes
    productVariantAttribute.terms.forEach(term => {
        if (term.current_image_id) {
            const imageIdStr = term.current_image_id.toString();
            const imageToUpdate = allImageData.find(img => img.id.toString() === imageIdStr);
            
            if (imageToUpdate) {
                // On s'assure que les champs pour l'assignation multiple existent sur l'objet image
                if (!Array.isArray(imageToUpdate.assigned_terms)) {
                    imageToUpdate.assigned_terms = [];
                }
                const termInfo = {
                    slug: term.value,
                    name: term.name,
                    hex: term.hex
                };
                imageToUpdate.assigned_terms.push(termInfo);
                
                // On peuple notre map interne
                if (!currentImageTermMappings.has(imageIdStr)) {
                    currentImageTermMappings.set(imageIdStr, []);
                }
                currentImageTermMappings.get(imageIdStr).push({
                    termSlug: term.value,
                    termName: term.name,
                    termId: term.term_id,
                    hex: term.hex,
                });
            }
        }
    });

    const assignedTermSlugs = new Set(
        Array.from(currentImageTermMappings.values()).flat().map(m => m.termSlug)
    );
    availableTerms = productVariantAttribute.terms.filter(term => !assignedTermSlugs.has(term.value));

    renderAvailableTerms();
    configureSortableForTerms(allImageData, onRefreshIndicatorCallback);
    
    allImageData.forEach(image => {
        if (image.assigned_terms && image.assigned_terms.length > 0) {
            onRefreshIndicatorCallback(image.id);
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
        message.textContent = '✅ Toutes les variantes sont assignées';
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

// MODIFICATION : Affiche plusieurs indicateurs de variantes
export function renderTermIndicator(imageId, termsDataArray) {
    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);
    if (!placeholders.length) return;

    placeholders.forEach(placeholder => {
        placeholder.innerHTML = ''; // Nettoyer les anciens indicateurs
        placeholder.className = 'image-color-indicator-placeholder'; // Reset classes
        placeholder.classList.add('multiple-indicators'); // Classe pour gérer le layout de plusieurs pastilles
        
        if (!termsDataArray || termsDataArray.length === 0) {
            removeTermIndicator(imageId);
            return;
        }
        
        termsDataArray.forEach(termData => {
            const indicator = document.createElement('span');
            indicator.className = 'term-indicator-item';
            indicator.title = `Variante: ${termData.termName}`;
            indicator.dataset.assignedTermSlug = termData.termSlug;

            if (productVariantAttribute.display_type === 'color' && termData.hex) {
                indicator.classList.add('is-color-indicator');
                indicator.style.backgroundColor = termData.hex;
            } else {
                indicator.classList.add('is-button-indicator');
                indicator.textContent = termData.termName;
            }
            placeholder.appendChild(indicator);
        });
        placeholder.classList.add('active-indicator');
    });
}

export function removeTermIndicator(imageId) {
    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);
    placeholders.forEach(placeholder => {
        placeholder.innerHTML = '';
        placeholder.style.cssText = '';
        placeholder.title = '';
        placeholder.className = 'image-color-indicator-placeholder'; // Reset complet
        placeholder.classList.remove('active-indicator');
    });
}

// MODIFICATION : Dissocie une seule variante d'une image
export function dissociateTermFromImage(imageId, termSlug, allImageDataRef) {
    const imageIdStr = imageId.toString();
    if (!currentImageTermMappings.has(imageIdStr)) return false;

    const termsForImage = currentImageTermMappings.get(imageIdStr);
    const termIndex = termsForImage.findIndex(t => t.termSlug === termSlug);
    
    if (termIndex === -1) return false;

    // Retirer la variante de la liste pour cette image
    const [removedTerm] = termsForImage.splice(termIndex, 1);
    
    // Si la liste est vide, on retire l'entrée de la map
    if (termsForImage.length === 0) {
        currentImageTermMappings.delete(imageIdStr);
    }

    // Mettre à jour allImageData
    const imageInData = allImageDataRef.find(img => img.id.toString() === imageIdStr);
    if (imageInData && Array.isArray(imageInData.assigned_terms)) {
        imageInData.assigned_terms = imageInData.assigned_terms.filter(t => t.slug !== termSlug);
        if (imageInData.assigned_terms.length === 0) {
            delete imageInData.assigned_terms;
        }
    }

    // Rafraîchir l'indicateur
    refreshIndicatorForImage(imageIdStr);

    // Remettre la variante dans la liste des disponibles
    const termObject = productVariantAttribute.terms.find(term => term.value === termSlug);
    if (termObject && !availableTerms.some(t => t.value === termSlug)) {
        availableTerms.push(termObject);
    }

    renderAvailableTerms();
    updateStatus(`Variante '${removedTerm.termName}' dissociée.`, 'info');
    return true;
}

export function dissociateAllTerms(allImageDataRef) {
    if (currentImageTermMappings.size === 0) {
        updateStatus("Aucune variation n'est actuellement assignée.", "info");
        return false;
    }

    productVariantAttribute.terms.forEach(term => {
        if (!availableTerms.some(t => t.value === term.value)) {
            availableTerms.push(term);
        }
    });

    currentImageTermMappings.clear();

    allImageDataRef.forEach(image => {
        if (image.assigned_terms) {
            delete image.assigned_terms;
            removeTermIndicator(image.id);
        }
    });

    renderAvailableTerms();
    updateStatus("Toutes les associations de variantes ont été réinitialisées.", "success");
    return true;
}

export function getAvailableTermsCount() {
    return availableTerms.length;
}

export function hasVariations() {
    return productVariantAttribute !== null && productVariantAttribute.terms && productVariantAttribute.terms.length > 0;
}

// MODIFICATION : Retourne un format adapté pour l'API (tableau plat)
export function getVariantMappings() {
    const mappings = [];
    for (const [imageId, terms] of currentImageTermMappings.entries()) {
        terms.forEach(term => {
            mappings.push({ imageId: imageId, termSlug: term.termSlug });
        });
    }
    return mappings;
}

export function getVariantAttributeData() {
    return productVariantAttribute;
}

// MODIFICATION : Rafraîchit l'indicateur pour afficher une ou plusieurs variantes
export function refreshIndicatorForImage(imageId) {
    if (!imageId) return;
    const imageIdStr = imageId.toString();
    if (currentImageTermMappings.has(imageIdStr) && currentImageTermMappings.get(imageIdStr).length > 0) {
        const termsData = currentImageTermMappings.get(imageIdStr);
        renderTermIndicator(imageIdStr, termsData);
    } else {
        removeTermIndicator(imageIdStr);
    }
}

// MODIFICATION : La logique d'assignation `onAdd` est mise à jour en profondeur
function configureSortableForTerms(allImageDataRef, onRefreshIndicatorCallback) {
    if (!availableTermsContainer) return;
    if (sortableAvailableTerms) sortableAvailableTerms.destroy();

    sortableAvailableTerms = new Sortable(availableTermsContainer, {
        group: { name: 'terms-shared', pull: true, put: true },
        animation: 150,
        sort: false,
        filter: '#reset-variants-btn',
        onStart: function(evt) {
            document.body.classList.add('dragging-color-swatch');
            temporaryImageDropZoneInstances.forEach(instance => instance.destroy());
            temporaryImageDropZoneInstances = [];
            const imageElements = document.querySelectorAll('.carousel-image-container, .thumbnail-wrapper');
            
            imageElements.forEach(imgElContainer => {
                const instance = new Sortable(imgElContainer, {
                    group: { name: 'terms-shared', put: true },
                    animation: 0, 
                    ghostClass: 'color-drop-target-ghost',
                    onAdd: function(addEvt) {
                        const targetImageElement = this.el;
                        const droppedTermElement = addEvt.item;
                        const targetImageId = targetImageElement.dataset.imageId;

                        if (droppedTermElement.parentElement === targetImageElement) {
                            targetImageElement.removeChild(droppedTermElement);
                        }
                        
                        const newTermData = {
                            termSlug: droppedTermElement.dataset.termSlug,
                            termName: droppedTermElement.dataset.termName,
                            termId: droppedTermElement.dataset.termId,
                            hex: droppedTermElement.dataset.hex || null
                        };

                        // 1. Un variant ne peut être assigné qu'à UNE SEULE image.
                        // On doit d'abord le retirer de son ancienne image s'il y en a une.
                        currentImageTermMappings.forEach((terms, imgId) => {
                            const termIndex = terms.findIndex(t => t.termSlug === newTermData.termSlug);
                            if (termIndex > -1 && imgId !== targetImageId) {
                                terms.splice(termIndex, 1); // Retirer
                                if (terms.length === 0) currentImageTermMappings.delete(imgId);
                                onRefreshIndicatorCallback(imgId); // Rafraîchir l'ancienne image
                            }
                        });

                        // 2. On ajoute la variante à la nouvelle image.
                        if (!currentImageTermMappings.has(targetImageId)) {
                            currentImageTermMappings.set(targetImageId, []);
                        }
                        const termsForTargetImage = currentImageTermMappings.get(targetImageId);
                        
                        // Empêcher d'ajouter deux fois la même variante à la même image
                        if (termsForTargetImage.some(t => t.termSlug === newTermData.termSlug)) {
                             updateStatus(`Cette variante est déjà sur cette image.`, 'warn');
                             return; // On arrête ici
                        }

                        termsForTargetImage.push(newTermData);
                        
                        const targetImgInAllData = allImageDataRef.find(img => img.id.toString() === targetImageId);
                        if (targetImgInAllData) {
                            if (!Array.isArray(targetImgInAllData.assigned_terms)) {
                                targetImgInAllData.assigned_terms = [];
                            }
                            // Assurer de ne pas avoir de doublon dans les données de l'image aussi
                            targetImgInAllData.assigned_terms = targetImgInAllData.assigned_terms.filter(t => t.slug !== newTermData.termSlug);
                            targetImgInAllData.assigned_terms.push({
                                slug: newTermData.termSlug,
                                name: newTermData.termName,
                                hex: newTermData.hex
                            });
                        }
                        
                        onRefreshIndicatorCallback(targetImageId);
                        
                        availableTerms = availableTerms.filter(term => term.value !== newTermData.termSlug);
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

            const termSlug = evt.item.dataset.termSlug;
            // Vérifier si le terme a bien été assigné à une image
            let wasAssigned = false;
            for (const terms of currentImageTermMappings.values()) {
                if (terms.some(t => t.termSlug === termSlug)) {
                    wasAssigned = true;
                    break;
                }
            }
            
            if (wasAssigned) {
                if (evt.item.parentElement) evt.item.remove();
            } else {
                 if (!availableTerms.some(term => term.value === termSlug)) {
                    const termObject = productVariantAttribute.terms.find(t => t.value === termSlug);
                    if (termObject) availableTerms.push(termObject);
                }
            }
            renderAvailableTerms();
        }
    });
}