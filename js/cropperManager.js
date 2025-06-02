// js/cropperManager.js
import {
    modalSwiperContainer, modalPrevBtn, modalNextBtn, modalImageInfo,
    modalCropBtn, modalRemoveWatermarkBtn, modalGenerateMockupBtn,
    modalMarkForDeletionBtn, modalToggleSizeGuideBtn,
    modalCropperContainer, imageToCropElement,
    modalCropValidateBtn, modalCropCancelBtn,
    cropperDataDisplay, cropDataX, cropDataY, cropDataWidth, cropDataHeight,
    cropperAspectRatioButtonsContainer,
    modalReplaceBackgroundBtn, 
    modalUpscaleBtn            
} from './dom.js';
import { updateStatus } from './uiUtils.js';
// getCurrentModalImage sera importé par app.js et passé à startCropping si nécessaire
// ou l'image à recadrer sera passée directement.

console.log('cropperManager.js module loaded');

let moduleCropperInstance = null;
let moduleCurrentCroppingImage = null; // Données de l'image originale en cours de recadrage

// Callbacks pour communiquer avec l'extérieur
let onValidationCallback = null; // Sera appelé avec les données du crop
let onCancellationCallback = null; // Sera appelé lors de l'annulation

// Fonction interne pour valider le recadrage
function handleInternalCropValidation() {
    if (!moduleCropperInstance || !moduleCurrentCroppingImage) {
        console.error("cropperManager.js: Aucune instance Cropper ou image pour valider.");
        updateStatus("Erreur : Aucune image ou recadrage actif.", "error");
        return;
    }
    const cropData = moduleCropperInstance.getData(true); // true pour arrondir
    console.log("cropperManager.js: Données de recadrage prêtes :", cropData);
    if (onValidationCallback) {
        onValidationCallback(moduleCurrentCroppingImage, cropData);
    }
    // Le reste (comme showEditActionConfirmation) est géré par le module appelant
}

// Fonction interne pour annuler le recadrage
function handleInternalCropCancellation() {
    console.log("cropperManager.js: Annulation du recadrage.");
    if (moduleCropperInstance) {
        moduleCropperInstance.destroy();
        moduleCropperInstance = null;
    }
    moduleCurrentCroppingImage = null;

    // Cacher les éléments spécifiques à Cropper
    if (modalCropperContainer) modalCropperContainer.style.display = 'none';
    if (cropperDataDisplay) cropperDataDisplay.style.display = 'none';
    if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'none';
    if (modalCropValidateBtn) modalCropValidateBtn.style.display = 'none';
    if (modalCropCancelBtn) modalCropCancelBtn.style.display = 'none';

    if (onCancellationCallback) {
        onCancellationCallback(); // Notifie l'appelant (qui appellera resetModalToActionView)
    }
    updateStatus("Recadrage annulé.", "info");
}


// Initialise l'interface de recadrage (exportée)
export function startCropper(imageToEdit, validationCb, cancellationCb) {
    if (!imageToEdit || !imageToEdit.id || !imageToEdit.url) {
        console.error("cropperManager.js: Données de l'image à recadrer invalides.", imageToEdit);
        updateStatus("Erreur: Impossible de charger l'image pour le recadrage.", "error");
        if (cancellationCb) cancellationCb(); // Appelle le callback d'annulation pour restaurer la vue
        return;
    }
    moduleCurrentCroppingImage = imageToEdit;
    onValidationCallback = validationCb;
    onCancellationCallback = cancellationCb;

    console.log(`cropperManager.js: Démarrage recadrage pour Image ID: ${moduleCurrentCroppingImage.id}`);

    // Cacher les éléments de la modale Swiper/actions
    if (modalSwiperContainer) modalSwiperContainer.style.display = 'none';
    if (modalPrevBtn) modalPrevBtn.style.display = 'none';
    if (modalNextBtn) modalNextBtn.style.display = 'none';
    if (modalImageInfo) modalImageInfo.style.display = 'none';
    if (modalCropBtn) modalCropBtn.style.display = 'none';
    if (modalRemoveWatermarkBtn) modalRemoveWatermarkBtn.style.display = 'none';
    if (modalGenerateMockupBtn) modalGenerateMockupBtn.style.display = 'none';
    if (modalMarkForDeletionBtn) modalMarkForDeletionBtn.style.display = 'none';
    if (modalToggleSizeGuideBtn) modalToggleSizeGuideBtn.style.display = 'none';
    if (modalReplaceBackgroundBtn) modalReplaceBackgroundBtn.style.display = 'none'; 
    if (modalUpscaleBtn) modalUpscaleBtn.style.display = 'none';

    // Préparer l'image et le conteneur pour Cropper
    if (modalCropperContainer && imageToCropElement) {
        if (moduleCropperInstance) {
            moduleCropperInstance.destroy();
            moduleCropperInstance = null;
        }
        imageToCropElement.src = ""; // Vider pour re-déclencher onload
        imageToCropElement.style.opacity = '0';
        imageToCropElement.classList.remove('loaded');
        modalCropperContainer.style.display = 'block';

        imageToCropElement.onload = () => {
            imageToCropElement.style.opacity = '1';
            imageToCropElement.classList.add('loaded');
            try {
                moduleCropperInstance = new Cropper(imageToCropElement, {
                    viewMode: 1, dragMode: 'move', autoCropArea: 0.85,
                    movable: true, rotatable: false, scalable: true, zoomable: true,
                    zoomOnWheel: true, guides: true, background: true, responsive: true,
                    crop(event) {
                        if (cropDataX) cropDataX.textContent = Math.round(event.detail.x);
                        if (cropDataY) cropDataY.textContent = Math.round(event.detail.y);
                        if (cropDataWidth) cropDataWidth.textContent = Math.round(event.detail.width);
                        if (cropDataHeight) cropDataHeight.textContent = Math.round(event.detail.height);
                    },
                    ready() {
                        console.log("cropperManager.js: Cropper.js est prêt!");
                        if (modalCropValidateBtn) {
                            modalCropValidateBtn.style.display = 'inline-block';
                            modalCropValidateBtn.disabled = false;
                            // L'écouteur est assigné une seule fois dans app.js, ici on gère juste l'affichage
                        }
                        if (modalCropCancelBtn) {
                            modalCropCancelBtn.style.display = 'inline-block';
                            modalCropCancelBtn.disabled = false;
                        }
                        if (cropperDataDisplay) cropperDataDisplay.style.display = 'block';
                        if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'flex';

                        const initialCropData = moduleCropperInstance.getData(true);
                        if (cropDataX) cropDataX.textContent = initialCropData.x;
                        if (cropDataY) cropDataY.textContent = initialCropData.y;
                        if (cropDataWidth) cropDataWidth.textContent = initialCropData.width;
                        if (cropDataHeight) cropDataHeight.textContent = initialCropData.height;

                        // Appliquer un ratio par défaut (Carré) et mettre en évidence le bouton
                        if (cropperAspectRatioButtonsContainer) {
                            const defaultRatioButton = cropperAspectRatioButtonsContainer.querySelector('.aspect-btn[data-ratio="1/1"]');
                            if (defaultRatioButton && typeof defaultRatioButton.click === 'function') {
                                defaultRatioButton.click();
                            } else {
                                moduleCropperInstance.setAspectRatio(NaN); // Fallback libre
                            }
                        }
                        updateStatus("Ajustez le cadre et le ratio de recadrage.", "info");
                    }
                });
            } catch(e) {
                console.error("cropperManager.js: Erreur initialisation Cropper.js:", e);
                updateStatus("Erreur initialisation Recadrage.", "error");
                handleInternalCropCancellation(); // Annuler si Cropper échoue
            }
        };
        imageToCropElement.onerror = () => {
            console.error(`cropperManager.js: Erreur chargement image pour Cropper: ${moduleCurrentCroppingImage.url}`);
            updateStatus("Erreur: Impossible de charger l'image pour le recadrage.", "error");
            handleInternalCropCancellation();
        };
        imageToCropElement.src = moduleCurrentCroppingImage.url;
    } else {
        console.error("cropperManager.js: Éléments DOM pour Cropper non trouvés.");
        if (onCancellationCallback) onCancellationCallback(); // Restaure la vue
    }
}

// Fonction pour annuler explicitement de l'extérieur (si nécessaire, ou utiliser le callback)
export function cancelCropper() {
    handleInternalCropCancellation();
}

// Fonction pour valider explicitement de l'extérieur
export function validateCropData() {
    handleInternalCropValidation();
}

// Gère le changement de ratio d'aspect (appelé par les écouteurs dans app.js)
export function setCropperAspectRatio(ratioString) {
    if (moduleCropperInstance) {
        let newRatio;
        if (ratioString === "NaN" || ratioString === "null" || ratioString === "") {
            newRatio = NaN;
        } else {
            const parts = ratioString.split('/');
            if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1])) && parseFloat(parts[1]) !== 0) {
                newRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
            } else {
                console.warn(`cropperManager.js: Ratio invalide: ${ratioString}. Passage en mode libre.`);
                newRatio = NaN;
            }
        }
        console.log(`cropperManager.js: Application du ratio: ${newRatio}`);
        moduleCropperInstance.setAspectRatio(newRatio);

        // Mise en évidence du bouton actif (le style est dans le CSS)
        if (cropperAspectRatioButtonsContainer) {
            const ratioButtons = cropperAspectRatioButtonsContainer.querySelectorAll('.aspect-btn');
            ratioButtons.forEach(btn => btn.classList.remove('active-ratio'));
            const activeButton = cropperAspectRatioButtonsContainer.querySelector(`.aspect-btn[data-ratio="${ratioString}"]`);
            if (activeButton) activeButton.classList.add('active-ratio');
        }
    }
}

// Exporte une fonction pour vérifier si une instance Cropper est active
export function isCropperActive() {
    return !!moduleCropperInstance;
}
