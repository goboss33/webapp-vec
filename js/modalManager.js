// js/modalManager.js
import {
    modalOverlay, modalCloseBtn, modalSwiperContainer, modalSwiperWrapper,
    modalImageId, modalImageDimensions, modalPrevBtn, modalNextBtn, modalImageInfo,
    modalMarkForDeletionBtn, modalToggleSizeGuideBtn,
    modalImageAssignedColorIndicatorElement, 
    modalImageAssignedColorNameElement, 
    modalDissociateColorBtn,
    dropzoneMain, dropzoneGallery, dropzoneCustom // Pour construire modalImageList
} from './dom.js';
import { resetModalToActionView, updateStatus } from './uiUtils.js'; // resetModalToActionView est appelé par openImageModal

console.log('modalManager.js module loaded');

let moduleModalSwiperInstance = null;
let moduleModalImageList = []; // Liste des images pour la modale actuelle
let moduleCurrentModalIndex = 0; // Index de l'image actuelle dans la modale

// Référence globale à allImageData (sera mise à jour par setGlobalImageData)
// C'est une simplification temporaire; idéalement, on éviterait une référence globale comme ça.
// Pour l'instant, on la passe aux fonctions qui en ont besoin.
// let currentGlobalAllImageData = [];

// export function setGlobalImageDataRef(allImageDataRef) {
//     currentGlobalAllImageData = allImageDataRef;
// }

// Met à jour les infos affichées sous l'image dans la modale
// Doit recevoir allImageData pour vérifier le statut de suppression et 'size_guide'
export function updateModalInfo(index, currentAllImageData) {
    if (index >= 0 && index < moduleModalImageList.length) {
        const imageData = moduleModalImageList[index];
        if (!imageData) {
            console.error(`modalManager.js: Aucune donnée d'image à l'index ${index} de moduleModalImageList.`);
            return;
        }

        if (modalImageId) modalImageId.textContent = imageData.id;
        moduleCurrentModalIndex = index; // Important de mettre à jour l'index interne au module
        console.log(`modalManager.js: Modal info mise à jour pour slide ${index}, ID: ${imageData.id}`);

        if (modalImageDimensions) {
            modalImageDimensions.textContent = 'Chargement...';
            const img = new Image();
            img.onload = function() {
                if (moduleModalImageList[moduleCurrentModalIndex]?.id === imageData.id) {
                    modalImageDimensions.innerHTML = `${this.naturalWidth}x${this.naturalHeight}`; // <<<< UTILISEZ CECI
                }
            };
            img.onerror = function() {
                if (moduleModalImageList[moduleCurrentModalIndex]?.id === imageData.id) {
                    modalImageDimensions.textContent = 'N/A';
                }
            };
            img.src = imageData.url;
        }

        // --- DÉBUT DE LA NOUVELLE LOGIQUE POUR LA COULEUR ASSOCIEE ---
        const imageFullData = currentAllImageData.find(img => img.id === imageData.id);
        let assignedColorInfo = null;

        if (imageFullData && imageFullData.assigned_variant_color_slug) {
            // Trouver les détails de la couleur (hex, nom) depuis une source.
            // Pour l'instant, on suppose que currentImageColorMappings de variantManager est la source de vérité,
            // mais modalManager ne devrait pas y accéder directement.
            // On va se baser sur assigned_variant_color_slug et essayer de trouver le terme dans variantColorAttributes
            // que app.js pourrait nous passer, ou on stocke le hex/nom directement dans allImageData si possible.
            // Pour l'instant, nous n'avons que le slug dans imageFullData.assigned_variant_color_slug.
            // Il nous faut un moyen d'obtenir le HEX et le NOM à partir du slug.
            //
            // SOLUTION TEMPORAIRE (si app.js peut fournir productVariantColorData, ou si on stocke plus d'infos dans allImageData)
            // Si vous avez accès à productVariantColorData (la structure complète des attributs couleurs) ici:
            // const mainColorAttribute = productVariantColorData?.[0]; // Supposons le premier attribut couleur
            // if (mainColorAttribute && mainColorAttribute.terms) {
            // const termData = mainColorAttribute.terms.find(t => t.value === imageFullData.assigned_variant_color_slug);
            // if (termData) {
            // assignedColorInfo = { name: termData.name, hex: termData.hex, slug: termData.value };
            // }
            // }
            //
            // Pour l'instant, on va juste afficher le slug et mettre un placeholder pour le hex.
            // Idéalement, app.js, en appelant updateModalInfo, devrait fournir le nom et le hex de la couleur
            // en se basant sur currentImageColorMappings de variantManager.
            //
            // SIMPLIFICATION POUR L'INSTANT: On suppose qu'on n'a que le slug.
            // La logique pour obtenir hex/nom sera ajoutée quand app.js orchestrera mieux.
            // On va juste simuler pour voir les éléments s'afficher/se cacher.
            // Vous devrez enrichir `imageData` ou `imageFullData` avec le nom et le hex de la couleur associée.
            // Pour ce test, on va essayer de reconstruire l'info si on a accès à `currentImageColorMappings` via une astuce
            // (NON RECOMMANDÉ EN PROD, mais pour avancer)
            // C'est mieux si app.js passe cette info.
            // ** Pour cette étape, on va supposer que `imageFullData` contient `assigned_color_name` et `assigned_color_hex` **
            // ** Vous devrez les ajouter dans `variantManager` quand une couleur est assignée/dissociée à `allImageDataRef` **

            assignedColorInfo = {
                name: imageFullData.assigned_color_name || imageFullData.assigned_variant_color_slug, // Fallback au slug
                hex: imageFullData.assigned_color_hex || '#ccc', // Fallback gris
                slug: imageFullData.assigned_variant_color_slug
            };
        }


        if (assignedColorInfo && assignedColorInfo.slug) {
            if (modalImageAssignedColorIndicatorElement) {
                modalImageAssignedColorIndicatorElement.style.backgroundColor = assignedColorInfo.hex;
                modalImageAssignedColorIndicatorElement.style.display = 'inline-block';
            }
            if (modalImageAssignedColorNameElement) {
                modalImageAssignedColorNameElement.textContent = assignedColorInfo.name;
            }
            if (modalDissociateColorBtn) {
                modalDissociateColorBtn.style.display = 'inline-block';
                modalDissociateColorBtn.dataset.imageId = imageData.id.toString(); // imageId pour la dissociation
                modalDissociateColorBtn.dataset.colorSlug = assignedColorInfo.slug; // slug pour la dissociation
            }
        } else {
            if (modalImageAssignedColorIndicatorElement) {
                modalImageAssignedColorIndicatorElement.style.backgroundColor = 'transparent';
                modalImageAssignedColorIndicatorElement.style.display = 'none';
            }
            if (modalImageAssignedColorNameElement) {
                modalImageAssignedColorNameElement.textContent = 'Aucune';
            }
            if (modalDissociateColorBtn) {
                modalDissociateColorBtn.style.display = 'none';
                modalDissociateColorBtn.removeAttribute('data-image-id');
                modalDissociateColorBtn.removeAttribute('data-color-slug');
            }
        }
        // --- FIN DE LA NOUVELLE LOGIQUE POUR LA COULEUR ASSOCIEE ---

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
            const isMain = dropzoneMain?.querySelector(`.thumbnail-wrapper[data-image-id="${imageData.id}"]`);
            const isGallery = dropzoneGallery?.querySelector(`.thumbnail-wrapper[data-image-id="${imageData.id}"]`);
            const isCustom = dropzoneCustom?.querySelector(`.thumbnail-wrapper[data-image-id="${imageData.id}"]`);
            const isAssigned = isMain || isGallery || isCustom;
            const currentSlideElement = moduleModalSwiperInstance?.slides[moduleCurrentModalIndex];

            if (!isAssigned && imageInAllData) {
                modalMarkForDeletionBtn.style.display = 'inline-block';
                modalMarkForDeletionBtn.dataset.imageId = imageData.id;
                
                // L'événement onclick est toujours géré par app.js pour l'instant
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
                modalMarkForDeletionBtn.removeAttribute('data-image-id');
                if (currentSlideElement) currentSlideElement.classList.remove('marked-for-deletion-slide');
            }
        }
    }
}

// Ouvre la modal et initialise Swiper
// Doit recevoir allImageData pour construire la liste et pour updateModalInfo
export function openModal(imageId, currentAllImageData) {
    console.log(`modalManager.js: Ouverture modal pour image ID: ${imageId}`);

    const orderedImages = [];
    const encounteredIds = new Set();
    const addImageToOrderedList = (img) => {
        if (img && !encounteredIds.has(img.id)) {
            orderedImages.push(img);
            encounteredIds.add(img.id);
        }
    };

    const mainImageThumb = dropzoneMain ? dropzoneMain.querySelector('.thumbnail-wrapper') : null;
    if (mainImageThumb) {
        const mainImgId = mainImageThumb.dataset.imageId;
        addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === mainImgId));
    }
    const customGalleryThumbs = dropzoneCustom ? dropzoneCustom.querySelectorAll('.thumbnail-wrapper') : [];
    Array.from(customGalleryThumbs).forEach(thumb => {
        addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === thumb.dataset.imageId));
    });
    const galleryImageThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper') : [];
    Array.from(galleryImageThumbs).forEach(thumb => {
        addImageToOrderedList(currentAllImageData.find(img => img.id.toString() === thumb.dataset.imageId));
    });
    currentAllImageData.forEach(img => {
        if (!img.markedForDeletion) { 
            addImageToOrderedList(img);
        }
    });
    if (orderedImages.length === 0 && currentAllImageData.length > 0) {
        currentAllImageData.forEach(img => {
            if (!img.markedForDeletion) {
                addImageToOrderedList(img);
            }
        });
    }

    moduleModalImageList = orderedImages;
    console.log('modalManager.js: Modal Image List (ordered):', moduleModalImageList.map(img => img.id));

    const initialIndex = moduleModalImageList.findIndex(img => img.id.toString() === imageId);
    if (initialIndex === -1) {
        console.error(`modalManager.js: Image ID ${imageId} non trouvée dans moduleModalImageList.`);
        updateStatus(`Erreur: image ${imageId} non trouvée pour la modale.`, 'error');
        return;
    }
    moduleCurrentModalIndex = initialIndex;
    console.log(`modalManager.js: Index initial: ${initialIndex}`);

    if (modalSwiperWrapper) {
        modalSwiperWrapper.innerHTML = ''; 
        moduleModalImageList.forEach(imageData => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            const img = document.createElement('img');
            img.src = imageData.url;
            img.alt = `Image ID ${imageData.id}`;
            img.loading = 'lazy'; 
            slide.appendChild(img);
            modalSwiperWrapper.appendChild(slide);
        });
        console.log(`modalManager.js: ${moduleModalImageList.length} slides créés pour Swiper.`);
    } else {
        console.error("modalManager.js: Wrapper Swiper (#modal-swiper-wrapper) non trouvé !");
        return;
    }

    if (moduleModalSwiperInstance) {
        moduleModalSwiperInstance.destroy(true, true);
        moduleModalSwiperInstance = null;
        console.log("modalManager.js: Ancienne instance Swiper détruite.");
    }

    try {
        moduleModalSwiperInstance = new Swiper('.modal-swiper', { // Utilise le sélecteur de classe global
            initialSlide: initialIndex,
            spaceBetween: 10,
            navigation: {
                nextEl: '#modal-next-btn', // Utilise les IDs globaux pour les boutons
                prevEl: '#modal-prev-btn',
            },
            keyboard: { 
                enabled: true,
            },
            loop: moduleModalImageList.length > 1,
            observer: true, 
            observeParents: true,
            on: {
                slideChange: function () {
                    console.log(`modalManager.js: Swiper slide changé vers index: ${this.activeIndex}`);
                    // Passe currentAllImageData à updateModalInfo
                    updateModalInfo(this.activeIndex, currentAllImageData); 
                },
                init: function() {
                    // Passe currentAllImageData à updateModalInfo
                    updateModalInfo(this.activeIndex, currentAllImageData); 
                    console.log("modalManager.js: Swiper initialisé.");
                }
            },
        });
    } catch (e) {
        console.error("modalManager.js: Erreur lors de l'initialisation de Swiper:", e);
        updateStatus("Erreur initialisation Swiper.", 'error');
        return; 
    }

    resetModalToActionView(); // Assure que Cropper est caché, etc.
    if (modalOverlay) modalOverlay.style.display = 'flex';
}

// Ferme la modal et détruit Swiper
// closeModal doit aussi s'assurer de détruire une instance Cropper si elle est active.
// Pour l'instant, la logique de Cropper est encore dans app.js, donc on va juste gérer Swiper ici.
// Le cropperInstance.destroy() sera appelé par la fonction closeModal d'app.js pour le moment.
export function closeModal() {
    console.log("modalManager.js: Tentative de fermeture de la modale.");
    if (modalOverlay) modalOverlay.style.display = 'none';
    if (moduleModalSwiperInstance) {
        moduleModalSwiperInstance.destroy(true, true); 
        moduleModalSwiperInstance = null;
        console.log("modalManager.js: Instance Swiper détruite.");
    }
    // La destruction de CropperInstance sera gérée par la fonction closeModal qui reste dans app.js pour l'instant,
    // ou par cancelCropping si le recadrage est annulé.
}

// Fonction utilitaire pour que d'autres modules (comme cropperManager) puissent accéder à l'image actuelle de la modale
export function getCurrentModalImage() {
    if (moduleModalImageList.length > 0 && moduleCurrentModalIndex >= 0 && moduleCurrentModalIndex < moduleModalImageList.length) {
        return moduleModalImageList[moduleCurrentModalIndex];
    }
    return null;
}

export function addImageToModalSwiper(newImageObject) {
    if (!moduleModalSwiperInstance || !modalSwiperWrapper) {
        console.warn("modalManager.js: Instance Swiper ou wrapper non disponible pour ajouter une image.");
        return;
    }

    // Ajoute à la liste interne
    moduleModalImageList.push(newImageObject);

    // Crée et ajoute le slide
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    const img = document.createElement('img');
    img.src = newImageObject.url;
    img.alt = `Image ID ${newImageObject.id}`;
    img.loading = 'lazy';
    slide.appendChild(img);
    modalSwiperWrapper.appendChild(slide);

    // Met à jour Swiper pour qu'il reconnaisse le nouveau slide
    moduleModalSwiperInstance.update();
    console.log(`modalManager.js: Image ID ${newImageObject.id} ajoutée à Swiper. Total slides: ${moduleModalSwiperInstance.slides.length}`);
}

export function updateImageInSwiper(imageId, newImageUrl) {
    if (!moduleModalSwiperInstance) {
        console.warn("modalManager.js: Instance Swiper non disponible pour mettre à jour une image.");
        return;
    }

    const slideIndex = moduleModalImageList.findIndex(img => img.id.toString() === imageId.toString());
    if (slideIndex !== -1) {
        // Mettre à jour l'URL dans la liste de données de la modale
        if (moduleModalImageList[slideIndex]) {
            moduleModalImageList[slideIndex].url = newImageUrl;
        }

        // Mettre à jour l'image dans le slide Swiper correspondant
        if (moduleModalSwiperInstance.slides[slideIndex]) {
            const imgElementInSlide = moduleModalSwiperInstance.slides[slideIndex].querySelector('img');
            if (imgElementInSlide) {
                imgElementInSlide.src = newImageUrl;
                console.log(`modalManager.js: URL de l'image ID ${imageId} mise à jour dans Swiper slide index ${slideIndex}`);
            }
        }
        // Swiper devrait se mettre à jour visuellement. Si ce n'est pas le cas :
        // moduleModalSwiperInstance.update(); 
    } else {
        console.warn(`modalManager.js: Image ID ${imageId} non trouvée dans moduleModalImageList pour mise à jour Swiper.`);
    }
}

export function refreshCurrentModalViewData(currentAllImageData) {
    if (moduleModalSwiperInstance && moduleModalSwiperInstance.initialized && moduleCurrentModalIndex !== -1) {
        console.log("modalManager.js: Rafraîchissement manuel de la vue pour le slide actuel:", moduleCurrentModalIndex);
        updateModalInfo(moduleCurrentModalIndex, currentAllImageData);
    }
}
