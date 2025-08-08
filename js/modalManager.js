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
    modalImageAssignedTermIndicatorElement,
    modalImageAssignedTermNameElement,
    modalDissociateTermBtn
} from './dom.js';
import { resetModalToActionView } from './uiUtils.js';

console.log('modalManager.js module loaded');

let moduleModalSwiperInstance = null;
let moduleModalImageList = [];
let moduleCurrentModalIndex = 0;
let moduleVariantAttributeData = null; 

export function updateModalInfo(index, currentAllImageData) {
    if (index < 0 || index >= moduleModalImageList.length) return;
    
    const imageData = moduleModalImageList[index];
    if (!imageData) return;
    
    moduleCurrentModalIndex = index;
    if (modalImageId) modalImageId.textContent = imageData.id;

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

    const imageFullData = currentAllImageData.find(img => img.id === imageData.id);
    
    // Affichage des variantes multiples
    if (modalImageAssignedTermNameElement.parentElement) {
        // Supprimer les anciens indicateurs
        modalImageAssignedTermNameElement.parentElement.querySelectorAll('.variant-indicator-container').forEach(el => el.remove());

        if (imageFullData && imageFullData.assigned_terms && imageFullData.assigned_terms.length > 0) {
            imageFullData.assigned_terms.forEach(term => {
                const indicatorContainer = document.createElement('span');
                indicatorContainer.className = 'variant-indicator-container';

                const indicator = document.createElement('span');
                indicator.className = 'modal-term-indicator-inline';
                if (moduleVariantAttributeData.display_type === 'color' && term.hex) {
                    indicator.classList.add('is-color');
                    indicator.style.backgroundColor = term.hex;
                } else {
                    indicator.classList.add('is-button');
                    indicator.textContent = term.termName;
                }
                indicatorContainer.appendChild(indicator);

                const dissociateBtn = document.createElement('button');
                dissociateBtn.className = 'modal-action-btn-inline';
                dissociateBtn.title = `Dissocier ${term.termName}`;
                dissociateBtn.textContent = '×';
                dissociateBtn.dataset.imageId = imageData.id.toString();
                dissociateBtn.dataset.termSlug = term.termSlug;
                dissociateBtn.addEventListener('click', (event) => {
                    const imageId = event.currentTarget.dataset.imageId;
                    const termSlug = event.currentTarget.dataset.termSlug;
                    variantAttributeManager.dissociateTermFromImage(imageId, termSlug, currentAllImageData);
                    refreshCurrentModalViewData(currentAllImageData);
                });
                indicatorContainer.appendChild(dissociateBtn);

                modalImageAssignedTermNameElement.parentElement.appendChild(indicatorContainer);
            });
            modalImageAssignedTermNameElement.style.display = 'none';

        } else {
             modalImageAssignedTermNameElement.textContent = 'Aucune';
             modalImageAssignedTermNameElement.style.display = 'inline';
        }
    }

    if (modalToggleSizeGuideBtn) {
        if (imageFullData && imageFullData.uses?.includes('size_guide')) {
            modalToggleSizeGuideBtn.classList.add('active-size-guide');
        } else {
            modalToggleSizeGuideBtn.classList.remove('active-size-guide');
        }
        modalToggleSizeGuideBtn.dataset.currentImageId = imageData.id;
    }

    if (modalMarkForDeletionBtn) {
        const isAssigned = document.querySelector(`.thumbnail-wrapper[data-image-id="${imageData.id}"]`);
        if (!isAssigned && imageFullData) {
            modalMarkForDeletionBtn.style.display = 'inline-block';
            modalMarkForDeletionBtn.dataset.imageId = imageData.id;
            if (imageFullData.markedForDeletion) {
                modalMarkForDeletionBtn.textContent = 'UNDO';
                modalMarkForDeletionBtn.classList.add('marked');
            } else {
                modalMarkForDeletionBtn.textContent = 'DEL';
                modalMarkForDeletionBtn.classList.remove('marked');
            }
        } else {
            modalMarkForDeletionBtn.style.display = 'none';
        }
    }
}


// On ajoute `variantAttributeData` comme paramètre
export function openModal(imageId, currentAllImageData, variantAttributeData) {
    moduleVariantAttributeData = variantAttributeData; // On stocke les données
    
    const orderedImages = [];
    const encounteredIds = new Set();
    const addImageToOrderedList = (img) => {
        if (img && !encounteredIds.has(img.id)) {
            orderedImages.push(img);
            encounteredIds.add(img.id);
        }
    };
    const mainImageThumb = dropzoneMain?.querySelector('.thumbnail-wrapper');
    if (mainImageThumb) addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === mainImageThumb.dataset.imageId));
    dropzoneCustom?.querySelectorAll('.thumbnail-wrapper').forEach(thumb => addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === thumb.dataset.imageId)));
    dropzoneGallery?.querySelectorAll('.thumbnail-wrapper').forEach(thumb => addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === thumb.dataset.imageId)));
    currentAllImageData.forEach(img => { if (!img.markedForDeletion) addImageToOrderedList(img); });

    moduleModalImageList = orderedImages;
    const initialIndex = moduleModalImageList.findIndex(img => img.id.toString() === imageId);
    if (initialIndex === -1) return;
    
    if (modalSwiperWrapper) {
        modalSwiperWrapper.innerHTML = '';
        moduleModalImageList.forEach(imgData => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            const img = document.createElement('img');
            img.src = imgData.url;
            slide.appendChild(img);
            modalSwiperWrapper.appendChild(slide);
        });
    }

    if (moduleModalSwiperInstance) moduleModalSwiperInstance.destroy(true, true);
    moduleModalSwiperInstance = new Swiper('.modal-swiper', {
        initialSlide: initialIndex,
        navigation: { nextEl: '#modal-next-btn', prevEl: '#modal-prev-btn' },
        keyboard: { enabled: true },
        on: {
            slideChange: function () { updateModalInfo(this.realIndex, currentAllImageData); },
            init: function () { updateModalInfo(this.realIndex, currentAllImageData); }
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