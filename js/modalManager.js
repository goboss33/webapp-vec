// js/modalManager.js
import {
    modalOverlay,
    modalSwiperWrapper,
    modalImageId,
    modalImageDimensions,
    modalMarkForDeletionBtn,
    modalToggleSizeGuideBtn,
    dropzoneMain,
    dropzoneGallery,
    dropzoneCustom,
    // --- NOMS DE VARIABLES MIS À JOUR ---
    modalImageAssignedTermIndicatorElement,
    modalImageAssignedTermNameElement,
    modalDissociateTermBtn
} from './dom.js';
import { resetModalToActionView, updateStatus } from './uiUtils.js';

console.log('modalManager.js module loaded');

let moduleModalSwiperInstance = null;
let moduleModalImageList = [];
let moduleCurrentModalIndex = 0;

/**
 * Met à jour les informations affichées dans la modale.
 * @param {number} index - L'index de l'image actuelle
 * @param {Array} currentAllImageData - La liste complète des données d'images
 */
export function updateModalInfo(index, currentAllImageData) {
    if (index < 0 || index >= moduleModalImageList.length) return;
    
    const imageData = moduleModalImageList[index];
    if (!imageData) {
        console.error(`modalManager.js: Aucune donnée d'image à l'index ${index}.`);
        return;
    }
    
    moduleCurrentModalIndex = index;
    if (modalImageId) modalImageId.textContent = imageData.id;

    // Mise à jour des dimensions de l'image
    if (modalImageDimensions) {
        modalImageDimensions.textContent = 'Chargement...';
        const img = new Image();
        img.onload = function() {
            if (moduleModalImageList[moduleCurrentModalIndex]?.id === imageData.id) {
                modalImageDimensions.textContent = `${this.naturalWidth}x${this.naturalHeight}`;
            }
        };
        img.src = imageData.url;
    }

    // --- NOUVELLE LOGIQUE DE VARIANTE GÉNÉRIQUE ---
    const imageFullData = currentAllImageData.find(img => img.id === imageData.id);
    const variantAttributeData = window.variantAttributeManager.getVariantAttributeData(); // Accès au manager

    if (imageFullData && imageFullData.assigned_term_slug && variantAttributeData) {
        // Afficher l'indicateur
        if (modalImageAssignedTermIndicatorElement) {
            modalImageAssignedTermIndicatorElement.textContent = ''; // Reset
            modalImageAssignedTermIndicatorElement.className = 'modal-term-indicator-inline'; // Reset classes
            
            if (variantAttributeData.display_type === 'color' && imageFullData.assigned_term_hex) {
                modalImageAssignedTermIndicatorElement.classList.add('is-color');
                modalImageAssignedTermIndicatorElement.style.backgroundColor = imageFullData.assigned_term_hex;
            } else {
                modalImageAssignedTermIndicatorElement.classList.add('is-button');
                modalImageAssignedTermIndicatorElement.textContent = imageFullData.assigned_term_name;
                modalImageAssignedTermIndicatorElement.style.backgroundColor = ''; // Reset
            }
        }
        // Afficher le nom du terme
        if (modalImageAssignedTermNameElement) {
            modalImageAssignedTermNameElement.textContent = imageFullData.assigned_term_name;
        }
        // Afficher et configurer le bouton de dissociation
        if (modalDissociateTermBtn) {
            modalDissociateTermBtn.style.display = 'inline-block';
            modalDissociateTermBtn.dataset.imageId = imageData.id.toString();
            modalDissociateTermBtn.dataset.termSlug = imageFullData.assigned_term_slug;
        }
    } else {
        // Cacher les informations de variante si aucune n'est assignée
        if (modalImageAssignedTermIndicatorElement) modalImageAssignedTermIndicatorElement.textContent = '';
        if (modalImageAssignedTermNameElement) modalImageAssignedTermNameElement.textContent = 'Aucune';
        if (modalDissociateTermBtn) modalDissociateTermBtn.style.display = 'none';
    }
    // --- FIN DE LA NOUVELLE LOGIQUE ---


    // Logique pour le guide des tailles et la suppression (inchangée)
    if (modalToggleSizeGuideBtn) {
        const imageInAllData = currentAllImageData.find(imgData => imgData.id === imageData.id);
        if (imageInAllData && imageInAllData.uses && imageInAllData.uses.includes('size_guide')) {
            modalToggleSizeGuideBtn.classList.add('active-size-guide');
        } else {
            modalToggleSizeGuideBtn.classList.remove('active-size-guide');
        }
        modalToggleSizeGuideBtn.dataset.currentImageId = imageData.id;
    }

    if (modalMarkForDeletionBtn) {
        const imageInAllData = currentAllImageData.find(imgData => imgData.id === imageData.id);
        const isAssigned = document.querySelector(`.thumbnail-wrapper[data-image-id="${imageData.id}"]`);
        const currentSlideElement = moduleModalSwiperInstance?.slides[moduleCurrentModalIndex];

        if (!isAssigned && imageInAllData) {
            modalMarkForDeletionBtn.style.display = 'inline-block';
            modalMarkForDeletionBtn.dataset.imageId = imageData.id;
            
            if (imageInAllData.markedForDeletion) {
                modalMarkForDeletionBtn.textContent = 'UNDO';
                modalMarkForDeletionBtn.classList.add('marked');
                if (currentSlideElement) currentSlideElement.classList.add('marked-for-deletion-slide');
            } else {
                modalMarkForDeletionBtn.textContent = 'DEL';
                modalMarkForDeletionBtn.classList.remove('marked');
                if (currentSlideElement) currentSlideElement.classList.remove('marked-for-deletion-slide');
            }
        } else {
            modalMarkForDeletionBtn.style.display = 'none';
            if (currentSlideElement) currentSlideElement.classList.remove('marked-for-deletion-slide');
        }
    }
}


// Les autres fonctions du fichier (openModal, closeModal, etc.) restent fonctionnelles
// et n'ont pas besoin de modifications majeures pour cette étape.
// Je les inclus pour que vous puissiez remplacer tout le fichier.

export function openModal(imageId, currentAllImageData) {
    console.log(`modalManager.js: Ouverture modal pour image ID: ${imageId}`);

    // Construire la liste d'images pour la modale
    const orderedImages = [];
    const encounteredIds = new Set();
    const addImageToOrderedList = (img) => {
        if (img && !encounteredIds.has(img.id)) {
            orderedImages.push(img);
            encounteredIds.add(img.id);
        }
    };

    const mainImageThumb = dropzoneMain?.querySelector('.thumbnail-wrapper');
    if (mainImageThumb) {
        addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === mainImageThumb.dataset.imageId));
    }
    dropzoneCustom?.querySelectorAll('.thumbnail-wrapper').forEach(thumb => {
        addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === thumb.dataset.imageId));
    });
    dropzoneGallery?.querySelectorAll('.thumbnail-wrapper').forEach(thumb => {
        addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === thumb.dataset.imageId));
    });
    currentAllImageData.forEach(img => {
        if (!img.markedForDeletion) addImageToOrderedList(img);
    });

    moduleModalImageList = orderedImages;
    const initialIndex = moduleModalImageList.findIndex(img => img.id.toString() === imageId);

    if (initialIndex === -1) {
        console.error(`modalManager.js: Image ID ${imageId} non trouvée.`);
        return;
    }
    
    if (modalSwiperWrapper) {
        modalSwiperWrapper.innerHTML = ''; 
        moduleModalImageList.forEach(imageData => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            const img = document.createElement('img');
            img.src = imageData.url;
            img.loading = 'lazy';
            slide.appendChild(img);
            modalSwiperWrapper.appendChild(slide);
        });
    }

    if (moduleModalSwiperInstance) moduleModalSwiperInstance.destroy(true, true);

    moduleModalSwiperInstance = new Swiper('.modal-swiper', {
        initialSlide: initialIndex,
        navigation: {
            nextEl: '#modal-next-btn',
            prevEl: '#modal-prev-btn',
        },
        keyboard: { enabled: true },
        on: {
            slideChange: function() {
                updateModalInfo(this.realIndex, currentAllImageData);
            },
            init: function() {
                updateModalInfo(this.realIndex, currentAllImageData);
            }
        },
    });

    resetModalToActionView();
    if (modalOverlay) modalOverlay.style.display = 'flex';
}

export function closeModal() {
    if (modalOverlay) modalOverlay.style.display = 'none';
    if (moduleModalSwiperInstance) {
        moduleModalSwiperInstance.destroy(true, true);
        moduleModalSwiperInstance = null;
    }
}

export function getCurrentModalImage() {
    if (moduleModalImageList.length > 0 && moduleCurrentModalIndex >= 0 && moduleCurrentModalIndex < moduleModalImageList.length) {
        return moduleModalImageList[moduleCurrentModalIndex];
    }
    return null;
}

export function addImageToModalSwiper(newImageObject) {
    if (!moduleModalSwiperInstance) return;
    moduleModalImageList.push(newImageObject);
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    const img = document.createElement('img');
    img.src = newImageObject.url;
    slide.appendChild(img);
    moduleModalSwiperInstance.appendSlide(slide);
    moduleModalSwiperInstance.update();
}

export function updateImageInSwiper(imageId, newImageUrl) {
    if (!moduleModalSwiperInstance) return;
    const slideIndex = moduleModalImageList.findIndex(img => img.id.toString() === imageId.toString());
    if (slideIndex !== -1) {
        moduleModalImageList[slideIndex].url = newImageUrl;
        const imgElementInSlide = moduleModalSwiperInstance.slides[slideIndex]?.querySelector('img');
        if (imgElementInSlide) imgElementInSlide.src = newImageUrl;
    }
}

export function refreshCurrentModalViewData(currentAllImageData) {
    if (moduleModalSwiperInstance && moduleModalSwiperInstance.initialized) {
        updateModalInfo(moduleModalSwiperInstance.realIndex, currentAllImageData);
    }
}