// js/app.js - V2.1: Verify Scoping

// --- Constants ---
const N8N_GET_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/get-product-data'; // Verified by user
const N8N_UPDATE_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/update-product'; // Verified by user

// --- Global Variables ---
let currentProductId = null;
let allImageData = [];
let draggedItemId = null;
let draggedItemUrl = null;

// --- DOM Element Variables (will be assigned in DOMContentLoaded) ---
let productIdElement, productNameElement, saveChangesButton, statusElement;
let dropzoneMain, dropzoneGallery, dropzoneCustom;
let imageCarousel;

// --- Helper Functions (Defined globally or within DOMContentLoaded before use) ---

// Moved updateStatus outside DOMContentLoaded to ensure global availability if needed elsewhere later
// Although it's only used inside fetchProductData/handleSaveChanges which are called from within DOMContentLoaded scope
const updateStatus = (message, type = 'info') => {
    // Ensure statusElement is available before using it
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
    } else {
        console.error("statusElement not found. Cannot update status:", message);
    }
};


// Creates a draggable item for the carousel
function createCarouselItem(image) {
    // ... (Implementation from previous step - unchanged) ...
        const container = document.createElement('div');
    container.className = 'carousel-image-container';
    container.draggable = true;
    container.dataset.imageId = image.id; // Store ID
    container.dataset.imageUrl = image.url; // Store URL

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Image ID ${image.id}`;
    img.ondragstart = (event) => event.preventDefault();

    const info = document.createElement('p');
    info.textContent = `ID: ${image.id} (${image.uses.join(', ') || 'libre'})`;

    container.appendChild(img);
    container.appendChild(info);

    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('dragend', handleDragEnd);

    return container;
}

// Creates a thumbnail item for the drop zones
function createThumbnail(image) {
    // ... (Implementation from previous step - unchanged) ...
        const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Thumbnail ID ${image.id}`;
    img.className = 'img-thumbnail';
    img.dataset.imageId = image.id; // Store ID for potential removal later
    return img;
}

// --- Drag & Drop Event Handlers (Defined globally or within DOMContentLoaded) ---
function handleDragStart(event) { /* ... unchanged ... */
        event.currentTarget.classList.add('dragging');
    draggedItemId = event.currentTarget.dataset.imageId;
    draggedItemUrl = event.currentTarget.dataset.imageUrl;
    event.dataTransfer.setData('text/plain', draggedItemId);
    event.dataTransfer.effectAllowed = 'move';
    console.log(`Drag Start: ID=${draggedItemId}`);
 }
function handleDragEnd(event) { /* ... unchanged ... */
     event.currentTarget.classList.remove('dragging');
     console.log(`Drag End: ID=${draggedItemId}`);
     draggedItemId = null;
     draggedItemUrl = null;
 }
function handleDragOver(event) { /* ... unchanged ... */
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('drag-over');
}
function handleDragLeave(event) { /* ... unchanged ... */
     event.currentTarget.classList.remove('drag-over');
 }
function handleDrop(event) { /* ... unchanged ... */
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const targetZone = event.currentTarget;
    const targetRole = targetZone.dataset.role;
    const maxImages = parseInt(targetZone.dataset.maxImages) || 999;

    console.log(`Drop Event: Item ID=${draggedItemId} -> Zone=${targetZone.id} (Role=${targetRole}, Max=${maxImages})`);

    if (!draggedItemId) {
        console.error("No dragged item ID found.");
        return;
    }
    updateStatus(`Image ${draggedItemId} déposée dans ${targetRole}. (Logique à implémenter)`, 'info');
 }

// --- Data Fetching (Defined globally or within DOMContentLoaded) ---
const fetchProductData = async () => {
    // Ensure updateStatus is accessible here!
    updateStatus("Récupération des données produit...", 'info'); // LINE 133 approx.

    // ... (Rest of the implementation from previous step - unchanged) ...
        if (productNameElement) productNameElement.textContent = 'Chargement...';
    if (imageCarousel) imageCarousel.innerHTML = '<p>Chargement...</p>';
    document.querySelectorAll('.dropzone .thumbnail-container').forEach(container => container.innerHTML = '');

    try {
        const urlToFetch = `${N8N_GET_DATA_WEBHOOK_URL}?productId=${currentProductId}`;
        console.log(`Workspaceing data from: ${urlToFetch}`);
        const response = await fetch(urlToFetch);
        console.log('Raw response received:', response);

        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Impossible de lire le corps de l\'erreur');
            console.error('Fetch failed:', response.status, response.statusText, errorBody);
            throw new Error(`Erreur serveur n8n (Get Data): ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Parsed JSON data:', data);
        updateStatus("Données reçues. Affichage...", 'info');

        if (productNameElement) {
          productNameElement.textContent = data.productName || 'Non trouvé';
        }

        if (data.images && Array.isArray(data.images)) {
            allImageData = data.images;

            if (allImageData.length > 0) {
                imageCarousel.innerHTML = '';
                allImageData.forEach(image => {
                    const carouselItem = createCarouselItem(image);
                    imageCarousel.appendChild(carouselItem);
                    if (image.uses.includes('main') && dropzoneMain) {
                         dropzoneMain.querySelector('.thumbnail-container').appendChild(createThumbnail(image));
                    }
                    if (image.uses.includes('gallery') && dropzoneGallery) {
                         dropzoneGallery.querySelector('.thumbnail-container').appendChild(createThumbnail(image));
                    }
                    if (image.uses.includes('custom') && dropzoneCustom) {
                         dropzoneCustom.querySelector('.thumbnail-container').appendChild(createThumbnail(image));
                    }
                });
                 updateStatus("Images affichées.", 'success');
            } else {
                imageCarousel.innerHTML = '<p>Aucune image disponible pour ce produit.</p>';
                 updateStatus("Aucune image trouvée.", 'info');
            }
        } else {
            console.error("Format de données invalide : 'images_data' manquant ou n'est pas un tableau.");
            imageCarousel.innerHTML = '<p>Erreur de format des données d\'images.</p>';
            updateStatus("Erreur format données images.", 'error');
        }

    } catch (error) {
        console.error("Erreur détaillée fetchProductData:", error);
        let uiErrorMessage = `Erreur récupération données: ${error.message || error.toString()}`;
        updateStatus(uiErrorMessage, 'error');
        if (productNameElement) productNameElement.textContent = 'Erreur';
        if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
};

// --- Save Changes (Defined globally or within DOMContentLoaded) ---
const handleSaveChanges = async () => {
    // Ensure updateStatus is accessible here!
    updateStatus("Enregistrement des modifications...", 'info');
    // ... (Rest of the implementation from previous step - unchanged) ...
        saveChangesButton.disabled = true;

    const mainImageThumb = dropzoneMain.querySelector('.img-thumbnail');
    const mainImageId = mainImageThumb ? mainImageThumb.dataset.imageId : null;

    const galleryImageThumbs = dropzoneGallery.querySelectorAll('.img-thumbnail');
    const galleryImageIds = Array.from(galleryImageThumbs).map(thumb => thumb.dataset.imageId);

    const customGalleryThumbs = dropzoneCustom.querySelectorAll('.img-thumbnail');
    const customGalleryImageIds = Array.from(customGalleryThumbs).map(thumb => thumb.dataset.imageId);

    console.log("Data to send:", { mainImageId, galleryImageIds, customGalleryImageIds });

    try {
         await new Promise(resolve => setTimeout(resolve, 1000));
         updateStatus("Modifications enregistrées (Simulation)!", 'success');
         setTimeout(fetchProductData, 1500);

    } catch (error) {
        console.error("Erreur lors de l'enregistrement:", error);
        updateStatus(`Erreur enregistrement: ${error.message}`, 'error');
    } finally {
        saveChangesButton.disabled = false;
    }
};


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => { // START OF DOMContentLoaded SCOPE
    // Initialize Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }

    // Assign DOM elements to variables (MUST be done after DOM is loaded)
    productIdElement = document.getElementById('productId');
    productNameElement = document.getElementById('productName');
    saveChangesButton = document.getElementById('saveChangesButton');
    statusElement = document.getElementById('status'); // Assign statusElement here
    dropzoneMain = document.getElementById('dropzone-main');
    dropzoneGallery = document.getElementById('dropzone-gallery');
    dropzoneCustom = document.getElementById('dropzone-custom');
    imageCarousel = document.getElementById('image-carousel');

    // Get Product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');

    if (!currentProductId) {
        updateStatus("Erreur: Product ID manquant dans l'URL.", 'error'); // updateStatus should work now
        if(saveChangesButton) saveChangesButton.disabled = true;
        return;
    }
    if (productIdElement) productIdElement.textContent = currentProductId;

    // Add Drop Zone Listeners
     const dropzones = [dropzoneMain, dropzoneGallery, dropzoneCustom];
     dropzones.forEach(zone => {
         if (zone) {
             zone.addEventListener('dragover', handleDragOver);
             zone.addEventListener('dragleave', handleDragLeave);
             zone.addEventListener('drop', handleDrop);
         }
     });

    // Add Save Button Listener
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', handleSaveChanges);
    } else {
        console.error("Save Changes Button not found!");
    }

    // Initial data fetch
    fetchProductData();

}); // END OF DOMContentLoaded SCOPE
