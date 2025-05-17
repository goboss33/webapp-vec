// js/uiUtils.js
import {
    statusElement,
    loadingOverlay,
    saveChangesButton, // Needed for showLoading/hideLoading
    modalCropValidateBtn, // Needed for showLoading/hideLoading & resetModalToActionView
    modalCropCancelBtn, // Needed for showLoading/hideLoading & resetModalToActionView
    modalSwiperContainer, // Needed for resetModalToActionView
    modalPrevBtn, // Needed for resetModalToActionView
    modalNextBtn, // Needed for resetModalToActionView
    modalImageInfo, // Needed for resetModalToActionView
    modalCropperContainer, // Needed for resetModalToActionView
    cropperDataDisplay, // Needed for resetModalToActionView
    cropperAspectRatioButtonsContainer, // Needed for resetModalToActionView
    editActionConfirmationOverlay, // Needed for resetModalToActionView
    modalActions, // Needed for resetModalToActionView
    modalCropBtn, // Needed for resetModalToActionView
    modalRemoveWatermarkBtn, // Needed for resetModalToActionView
    modalGenerateMockupBtn // Needed for resetModalToActionView
    // Ajoutez d'autres éléments DOM importés ici si resetModalToActionView en a besoin de plus
} from './dom.js';

console.log('uiUtils.js module loaded');

// Met à jour le message de statut
export const updateStatus = (message, type = 'info') => {
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
    } else {
        console.error("statusElement non trouvé (dans uiUtils.js).");
    }
};

// --- Indicateur de Chargement ---
export function showLoading(message = "Traitement en cours...") {
    if (loadingOverlay) {
        const p = loadingOverlay.querySelector('p');
        if (p) p.textContent = message;
        loadingOverlay.style.display = 'flex';
    }
    // Désactiver les boutons principaux pour éviter double-clic
    if(saveChangesButton) saveChangesButton.disabled = true;
    if(modalCropValidateBtn) modalCropValidateBtn.disabled = true;
    if(modalCropCancelBtn) modalCropCancelBtn.disabled = true;
    console.log("uiUtils.js: Affichage indicateur chargement.");
}

export function hideLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    // Réactiver les boutons
    if(saveChangesButton) saveChangesButton.disabled = false;
    if(modalCropValidateBtn) modalCropValidateBtn.disabled = false;
    if(modalCropCancelBtn) modalCropCancelBtn.disabled = false;
    console.log("uiUtils.js: Masquage indicateur chargement.");
}

// Réinitialise la modal à son état initial (vue Swiper, boutons actions standards)
export function resetModalToActionView() {
    console.log("uiUtils.js: Réinitialisation de la vue de la modale aux actions standard.");

    // 1. Cacher tous les éléments spécifiques au mode recadrage
    if (modalCropperContainer) modalCropperContainer.style.display = 'none';
    if (modalCropValidateBtn) {
        modalCropValidateBtn.style.display = 'none';
        modalCropValidateBtn.disabled = true;
    }
    if (modalCropCancelBtn) {
        modalCropCancelBtn.style.display = 'none';
        modalCropCancelBtn.disabled = true;
    }
    if (cropperDataDisplay) cropperDataDisplay.style.display = 'none';
    if (cropperAspectRatioButtonsContainer) cropperAspectRatioButtonsContainer.style.display = 'none';

    // 2. Cacher l'overlay de confirmation d'action (au cas où)
    if (editActionConfirmationOverlay) editActionConfirmationOverlay.style.display = 'none';

    // 3. Afficher les éléments de la vue "normale" de la modale (Swiper et actions principales)
    if (modalSwiperContainer) modalSwiperContainer.style.display = 'block';
    if (modalPrevBtn) modalPrevBtn.style.display = 'block';
    if (modalNextBtn) modalNextBtn.style.display = 'block';
    if (modalImageInfo) modalImageInfo.style.display = 'block';

    // 4. Afficher le conteneur des boutons d'action principaux et réactiver les boutons
    if (modalActions) modalActions.style.display = 'flex';

    if (modalCropBtn) {
        modalCropBtn.style.display = 'inline-block';
        modalCropBtn.disabled = false;
    }
    if (modalRemoveWatermarkBtn) {
        modalRemoveWatermarkBtn.style.display = 'inline-block';
        modalRemoveWatermarkBtn.disabled = false;
    }
    if (modalGenerateMockupBtn) {
        modalGenerateMockupBtn.style.display = 'inline-block';
        modalGenerateMockupBtn.disabled = false;
    }
    if (modalToggleSizeGuideBtn) { // <<<< AJOUTER CE BLOC
        modalToggleSizeGuideBtn.style.display = 'inline-block'; // ou 'block' selon son style d'origine
        modalToggleSizeGuideBtn.disabled = false;
    }

    // Note: D'autres boutons comme modalMarkForDeletionBtn, modalToggleSizeGuideBtn
    // sont gérés dynamiquement par updateModalInfo ou des logiques spécifiques
    // et ne sont pas forcément réinitialisés globalement ici à 'inline-block'.
    // resetModalToActionView se concentre sur le switch entre la vue Cropper et la vue Swiper/actions.
}
