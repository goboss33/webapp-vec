// js/dom.js
console.log('dom.js module loaded');

// Déclarations des variables pour les éléments DOM
// Elles seront exportées et initialisées par initDomElements
export let productIdElement, productNameElement, saveChangesButton, statusElement;
export let dropzoneMain, dropzoneGallery, dropzoneCustom;
export let imageCarouselContainer, imageCarousel;
export let modalOverlay, modalCloseBtn, modalImageContainer, modalSwiperContainer, modalSwiperWrapper, modalImageId, modalImageDimensions, modalPrevBtn, modalNextBtn, modalActions, modalImageInfo;
export let modalCropperContainer, imageToCropElement, modalCropBtn, modalCropValidateBtn, modalCropCancelBtn;
export let cropperDataDisplay, cropDataX, cropDataY, cropDataWidth, cropDataHeight, cropperAspectRatioButtonsContainer;
export let modalRemoveWatermarkBtn, modalGenerateMockupBtn, modalMarkForDeletionBtn;
export let editActionConfirmationOverlay, confirmActionReplaceBtn, confirmActionNewBtn, confirmActionCancelBtn;
export let loadingOverlay;
export let modalToggleSizeGuideBtn;
export let variantColorAssignmentContainer, availableColorSwatchesContainer, variantColorAttributeNameElement;
export let modalImageAssignedColorIndicatorElement, modalImageAssignedColorNameElement, modalDissociateColorBtn;
export let modalReplaceBackgroundBtn;
export let modalUpscaleBtn;
export let productStatusToggleBtn;
export let mannequinImageSelectionModal, mannequinImageSwiperWrapper, mannequinImageModalCloseBtn, mannequinImageValidateBtn, mannequinImageCancelBtn;

// NOUVEAUX ÉLÉMENTS DOM POUR LA SÉLECTION DES MANNEQUINS
export let mannequinChoiceBtn, mannequinSelectionModal, mannequinModalCloseBtn, mannequinFilterAll, mannequinFilterHomme, mannequinFilterFemme, mannequinListContainer, mannequinSelectBtn, mannequinCancelBtn, mannequinFilterGreen, mannequinFilterOrange, mannequinFilterRed;
// NOUVEAUX ÉLÉMENTS DOM POUR L'AFFICHAGE DANS LE BOUTON PRINCIPAL
export let mannequinDisplayPortrait, mannequinDisplayName;


// Fonction pour initialiser toutes les références DOM
export function initDomElements() {
    console.log('dom.js: Initializing DOM elements...');

    productIdElement = document.getElementById('productId');
    productNameElement = document.getElementById('productName');
    saveChangesButton = document.getElementById('saveChangesButton');
    statusElement = document.getElementById('status');

    dropzoneMain = document.getElementById('dropzone-main');
    dropzoneGallery = document.getElementById('dropzone-gallery');
    dropzoneCustom = document.getElementById('dropzone-custom');

    imageCarouselContainer = document.getElementById('image-carousel-container');
    imageCarousel = document.getElementById('image-carousel');

    modalOverlay = document.getElementById('image-modal');
    modalCloseBtn = document.getElementById('modal-close-btn');
    modalImageContainer = document.getElementById('modal-image-container'); // Vous l'aviez, je le remets au cas où. Sinon, supprimez si non utilisé.
    modalSwiperContainer = document.querySelector('.modal-swiper');
    modalSwiperWrapper = document.getElementById('modal-swiper-wrapper');
    modalImageId = document.getElementById('modal-image-id');
    modalImageDimensions = document.getElementById('modal-image-dimensions');
    modalPrevBtn = document.getElementById('modal-prev-btn');
    modalNextBtn = document.getElementById('modal-next-btn');
    modalActions = document.getElementById('modal-actions');
    modalImageInfo = document.getElementById('modal-image-info');

    modalCropperContainer = document.getElementById('modal-cropper-container');
    imageToCropElement = document.getElementById('image-to-crop');
    modalCropBtn = document.getElementById('modal-crop-btn');
    // modalMockupBtn = document.getElementById('modal-mockup-btn'); // Ce bouton est assigné plus bas, commenté ici pour éviter double assignation si l'ID a changé.
    modalCropValidateBtn = document.getElementById('modal-crop-validate-btn');
    modalCropCancelBtn = document.getElementById('modal-crop-cancel-btn');

    cropperDataDisplay = document.getElementById('cropper-data-display');
    cropDataX = document.getElementById('crop-data-x');
    cropDataY = document.getElementById('crop-data-y');
    cropDataWidth = document.getElementById('crop-data-width');
    cropDataHeight = document.getElementById('crop-data-height');
    cropperAspectRatioButtonsContainer = document.getElementById('cropper-aspect-ratio-buttons');

    loadingOverlay = document.getElementById('loading-overlay');
    modalToggleSizeGuideBtn = document.getElementById('modal-toggle-size-guide-btn');
    modalRemoveWatermarkBtn = document.getElementById('modal-remove-watermark-btn');
    modalGenerateMockupBtn = document.getElementById('modal-generate-mockup-btn');
    modalMarkForDeletionBtn = document.getElementById('modal-mark-for-deletion-btn');


    editActionConfirmationOverlay = document.getElementById('edit-action-confirmation');
    confirmActionReplaceBtn = document.getElementById('confirm-action-replace');
    confirmActionNewBtn = document.getElementById('confirm-action-new');
    confirmActionCancelBtn = document.getElementById('confirm-action-cancel');

    variantColorAssignmentContainer = document.getElementById('variant-color-assignment-container');
    availableColorSwatchesContainer = document.getElementById('available-color-swatches');
    variantColorAttributeNameElement = document.getElementById('variant-color-attribute-name');

    modalImageAssignedColorIndicatorElement = document.getElementById('modal-image-assigned-color-indicator');
    modalImageAssignedColorNameElement = document.getElementById('modal-image-assigned-color-name');
    modalDissociateColorBtn = document.getElementById('modal-dissociate-color-btn');
    modalReplaceBackgroundBtn = document.getElementById('modal-replace-background-btn');
    modalUpscaleBtn = document.getElementById('modal-upscale-btn'); 

    productStatusToggleBtn = document.getElementById('product-status-toggle');

    // Initialisation des nouveaux éléments DOM pour la sélection des mannequins
    mannequinChoiceBtn = document.getElementById('mannequin-choice-btn');
    mannequinSelectionModal = document.getElementById('mannequin-selection-modal');
    mannequinModalCloseBtn = document.getElementById('mannequin-modal-close-btn');
    mannequinFilterAll = document.getElementById('mannequin-filter-all');
    mannequinFilterHomme = document.getElementById('mannequin-filter-homme');
    mannequinFilterFemme = document.getElementById('mannequin-filter-femme');
    mannequinListContainer = document.getElementById('mannequin-list-container');
    mannequinSelectBtn = document.getElementById('mannequin-select-btn');
    mannequinCancelBtn = document.getElementById('mannequin-cancel-btn');
	
    // NOUVELLES INITIALISATIONS POUR L'AFFICHAGE DANS LE BOUTON PRINCIPAL
    mannequinDisplayPortrait = document.getElementById('mannequin-display-portrait');
    mannequinDisplayName = document.getElementById('mannequin-display-name');
    
    // NOUVELLES INITIALISATIONS POUR LA SOUS-MODALE D'IMAGE MANNEQUIN
	mannequinImageSelectionModal = document.getElementById('mannequin-image-selection-modal');
	mannequinImageSwiperWrapper = document.getElementById('mannequin-image-swiper-wrapper');
	mannequinImageModalCloseBtn = document.getElementById('mannequin-image-modal-close-btn');
	mannequinImageValidateBtn = document.getElementById('mannequin-image-validate-btn');
	mannequinImageCancelBtn = document.getElementById('mannequin-image-cancel-btn');
	// AJOUTER CES LIGNES À LA FIN DE LA FONCTION initDomElements()
	mannequinFilterGreen = document.getElementById('mannequin-filter-green');
	mannequinFilterOrange = document.getElementById('mannequin-filter-orange');
	mannequinFilterRed = document.getElementById('mannequin-filter-red');

	console.log('dom.js: Mannequin image selection modal elements initialized.');
}