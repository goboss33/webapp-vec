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
let currentImageTermMappings = new Map();
let availableTerms = [];
let sortableAvailableTerms = null;
let temporaryImageDropZoneInstances = [];

// --- Fonctions de création d'éléments (pour le retour au carrousel) ---
// Note: Ces fonctions sont simplifiées et ne gèrent pas les callbacks de clic.
// Idéalement, sortableManager devrait exposer ces fonctions de création.
// Pour l'instant, c'est une solution fonctionnelle.
function createCarouselItem(image) {
    const container = document.createElement('div');
    container.className = 'carousel-image-container';
    container.dataset.imageId = image.id;
    container.dataset.imageUrl = image.url;
    const img = document.createElement('img');
    img.src = image.url;
    container.appendChild(img);
    // On n'ajoute pas les boutons ici pour simplifier. L'essentiel est de remettre l'image.
    return container;
}


/**
 * Initialise le système de gestion des variantes.
 * @param {Object} variantAttribute - L'objet variantAttribute de l'API.
 * @param {Array} allImageData - Le tableau global 'allImageData'.
 * @param {Function} onRefreshIndicatorCallback - Callback pour rafraîchir les indicateurs sur les images
 */
// REMPLACEZ VOTRE FONCTION initVariantHandler DANS variantAttributeManager.js PAR CELLE-CI

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

    productVariantAttribute.terms.forEach(term => {
        if (term.current_image_id) {
            const imageIdStr = term.current_image_id.toString();
            const imageToUpdate = allImageData.find(img => img.id.toString() === imageIdStr);
            
            if (imageToUpdate) {
                // --- DÉBUT DE LA CORRECTION ---
                // On utilise `assigned_term_slug` pour être cohérent avec la modale
                imageToUpdate.assigned_term_slug = term.value;
                // --- FIN DE LA CORRECTION ---
                
                imageToUpdate.assigned_term_name = term.name;
                imageToUpdate.assigned_term_hex = term.hex;
                
                const mapping = {
                    termSlug: term.value,
                    termName: term.name,
                    termId: term.term_id,
                    hex: term.hex,
                };
                currentImageTermMappings.set(imageIdStr, mapping);
            }
        }
    });

    const assignedTermSlugs = new Set(Array.from(currentImageTermMappings.values()).map(m => m.termSlug));
    availableTerms = productVariantAttribute.terms.filter(term => !assignedTermSlugs.has(term.value));

    renderAvailableTerms();
    configureSortableForTerms(allImageData, onRefreshIndicatorCallback);
    
    allImageData.forEach(image => {
        // La clé utilisée ici par la modale est maintenant correcte
        if(image.assigned_term_slug) {
            onRefreshIndicatorCallback(image.id);
        }
    });

    console.log('[variantAttributeManager] initVariantHandler END');
}

function renderAvailableTerms() {
    if (!availableTermsContainer) return;
    availableTermsContainer.innerHTML = '';
    if (availableTerms.length === 0) {
        availableTermsContainer.innerHTML = '<p class="no-swatches-message">Toutes les variantes sont assignées.</p>';
        return;
    }
    availableTerms.forEach(term => {
        const termElement = document.createElement('div');
        termElement.className = 'term-draggable';
        
        // --- LA CORRECTION EST ICI ---
        termElement.draggable = true; // Force l'élément à être nativement déplaçable
        // --- FIN DE LA CORRECTION ---

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

// REMPLACEZ la fonction renderTermIndicator existante par celle-ci

export function renderTermIndicator(imageId, termData) {
    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);
    if (!placeholders.length || !termData) return;

    placeholders.forEach(placeholder => {
        // Reset
        placeholder.innerHTML = '';
        placeholder.style.backgroundColor = 'transparent';
        placeholder.className = 'image-color-indicator-placeholder'; // Reset classes

        placeholder.title = `Variante: ${termData.termName}`;
        placeholder.dataset.assignedTermSlug = termData.termSlug;
        
        if (productVariantAttribute.display_type === 'color' && termData.hex) {
            placeholder.classList.add('is-color-indicator');
            placeholder.style.backgroundColor = termData.hex;
        } else {
            placeholder.classList.add('is-button-indicator');
            placeholder.textContent = termData.termName;
        }
        placeholder.classList.add('active-indicator');
    });
}

export function removeTermIndicator(imageId) {
    const placeholders = document.querySelectorAll(`.image-color-indicator-placeholder[data-indicator-for-image-id="${imageId}"]`);
    placeholders.forEach(placeholder => {
        placeholder.innerHTML = '';
        placeholder.style.cssText = '';
        placeholder.title = '';
        delete placeholder.dataset.assignedTermSlug;
        placeholder.classList.remove('active-indicator');
    });
}

export function dissociateTermFromImage(imageId, termSlug, allImageDataRef) {
    const imageIdStr = imageId.toString();
    if (!currentImageTermMappings.has(imageIdStr)) return false;
    const currentMapping = currentImageTermMappings.get(imageIdStr);
    if (currentMapping.termSlug !== termSlug) return false;

    currentImageTermMappings.delete(imageIdStr);

    const imageInData = allImageDataRef.find(img => img.id.toString() === imageIdStr);
    if (imageInData) {
        delete imageInData.assigned_variant_slug;
        delete imageInData.assigned_term_name;
        delete imageInData.assigned_term_hex;
        delete imageInData.assigned_term_slug;
    }

    removeTermIndicator(imageIdStr);

    const termObject = productVariantAttribute.terms.find(term => term.value === termSlug);
    if (termObject && !availableTerms.some(t => t.value === termSlug)) {
        availableTerms.push(termObject);
    }

    renderAvailableTerms();
    updateStatus(`Variante '${currentMapping.termName}' dissociée.`, 'info');
    return true;
}

/**
 * Dissocie toutes les variantes de toutes les images.
 * @param {Array} allImageDataRef - Référence au tableau global d'images.
 */
export function dissociateAllTerms(allImageDataRef) {
    if (currentImageTermMappings.size === 0) {
        updateStatus("Aucune variation n'est actuellement assignée.", "info");
        return false;
    }

    // On remet tous les termes assignés dans la liste des termes disponibles
    productVariantAttribute.terms.forEach(term => {
        if (!availableTerms.some(t => t.value === term.value)) {
            availableTerms.push(term);
        }
    });

    // On vide la carte des assignations
    currentImageTermMappings.clear();

    // On nettoie les données dans allImageData et on retire les indicateurs
    allImageDataRef.forEach(image => {
        if (image.assigned_term_slug) {
            delete image.assigned_term_slug;
            delete image.assigned_term_name;
            delete image.assigned_term_hex;
            removeTermIndicator(image.id);
        }
    });

    // On rafraîchit l'affichage des termes disponibles
    renderAvailableTerms();
    updateStatus("Toutes les associations de variantes ont été réinitialisées.", "success");
    return true;
}

export function getVariantMappings() {
    return Array.from(currentImageTermMappings, ([imageId, data]) => ({ imageId, termSlug: data.termSlug }));
}

export function getVariantAttributeData() {
    return productVariantAttribute;
}

export function refreshIndicatorForImage(imageId) {
    if (!imageId) return;
    const imageIdStr = imageId.toString();
    if (currentImageTermMappings.has(imageIdStr)) {
        const termData = currentImageTermMappings.get(imageIdStr);
        renderTermIndicator(imageIdStr, termData);
    } else {
        removeTermIndicator(imageIdStr);
    }
}



// REMPLACEZ VOTRE FONCTION configureSortableForTerms DANS variantAttributeManager.js PAR CELLE-CI

// --- DÉBUT DU BLOC DE DEBUG ---
// Helper pour afficher les logs à l'écran sur mobile
function logToPanel(message) {
    const panel = document.getElementById('debug-log-panel');
    if (panel) {
        panel.style.display = 'block'; // On le rend visible
        const logEntry = document.createElement('div');
        const time = new Date().toLocaleTimeString();
        logEntry.textContent = `[${time}] ${message}`;
        panel.prepend(logEntry); // Les nouveaux messages apparaissent en haut
    }
}
// --- FIN DU BLOC DE DEBUG ---

function configureSortableForTerms(allImageDataRef, onRefreshIndicatorCallback) {
    if (!availableTermsContainer) return;
    if (sortableAvailableTerms) sortableAvailableTerms.destroy();

    sortableAvailableTerms = new Sortable(availableTermsContainer, {
        group: { name: 'terms-shared', pull: true, put: true },
        animation: 150,
        sort: false,
        
        onStart: function(evt) {
            // --- DÉBUT DU DIAGNOSTIC ---
            // On vérifie si SortableJS a ajouté sa classe de fallback au body.
            // C'est le moyen le plus fiable de savoir quel mode est utilisé.
            const isFallback = document.body.classList.contains('sortable-drag');
            
            logToPanel(`Drag Start. Mode Fallback: ${isFallback}`);
            
            if (isFallback) {
                logToPanel('>>> BUG CONFIRMÉ : Le mode Fallback lent est ACTIF !');
            } else {
                logToPanel('>>> OK : Le mode Natif rapide est ACTIF.');
            }
            // --- FIN DU DIAGNOSTIC ---

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

                        if (droppedTermElement.parentElement === targetImageElement) {
                            targetImageElement.removeChild(droppedTermElement);
                        }
                        
                        const newTermData = {
                            termSlug: droppedTermElement.dataset.termSlug,
                            termName: droppedTermElement.dataset.termName,
                            hex: droppedTermElement.dataset.hex || null
                        };

                        const currentMapping = currentImageTermMappings.get(targetImageId);
                        if (currentMapping && currentMapping.termSlug === newTermData.termSlug) return;
                        
                        if (currentMapping) {
                            const oldTerm = productVariantAttribute.terms.find(t => t.value === currentMapping.termSlug);
                            if (oldTerm && !availableTerms.some(t => t.value === oldTerm.value)) {
                                availableTerms.push(oldTerm);
                            }
                        }
                        
                        currentImageTermMappings.forEach((map, imgId) => {
                            if (map.termSlug === newTermData.termSlug && imgId !== targetImageId) {
                                currentImageTermMappings.delete(imgId);
                                onRefreshIndicatorCallback(imgId);
                                const oldImgInAllData = allImageDataRef.find(i => i.id.toString() === imgId);
                                if (oldImgInAllData) {
                                    delete oldImgInAllData.assigned_term_slug;
                                    delete oldImgInAllData.assigned_term_name;
                                    delete oldImgInAllData.assigned_term_hex;
                                }
                            }
                        });

                        currentImageTermMappings.set(targetImageId, newTermData);
                        
                        const targetImgInAllData = allImageDataRef.find(img => img.id.toString() === targetImageId);
                        if (targetImgInAllData) {
                            targetImgInAllData.assigned_term_slug = newTermData.termSlug;
                            targetImgInAllData.assigned_term_name = newTermData.termName;
                            targetImgInAllData.assigned_term_hex = newTermData.hex;
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
            let wasAssigned = Array.from(currentImageTermMappings.values()).some(m => m.termSlug === termSlug);
            
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