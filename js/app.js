// js/app.js - V2: Populate Carousel & Drop Zones

// !!! IMPORTANT: Remplacez ces URLs par les URLs de VOS webhooks n8n (Production) !!!
const N8N_GET_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/get-product-data';
const N8N_UPDATE_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/update-product';
// !!! ------------------------------------------------------ !!!

let currentProductId = null;
let allImageData = []; // Store the fetched image data globally for easier access

// --- DRAG & DROP State (will be used later) ---
let draggedItemId = null;
let draggedItemUrl = null;

// --- DOM Elements --- (Get references once)
let productIdElement, productNameElement, saveChangesButton, statusElement;
let dropzoneMain, dropzoneGallery, dropzoneCustom;
let imageCarousel;

// --- Helper Functions ---

// Creates a draggable item for the carousel
function createCarouselItem(image) {
    const container = document.createElement('div');
    container.className = 'carousel-image-container';
    container.draggable = true;
    container.dataset.imageId = image.id; // Store ID
    container.dataset.imageUrl = image.url; // Store URL

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Image ID ${image.id}`;
    // Prevent default browser drag behavior for the image itself if needed
    img.ondragstart = (event) => event.preventDefault();

    const info = document.createElement('p');
    // Display ID and original roles for info
    info.textContent = `ID: ${image.id} (${image.uses.join(', ') || 'libre'})`;

    container.appendChild(img);
    container.appendChild(info);

    // Add drag start listener to the container
    container.addEventListener('dragstart', handleDragStart);
    // Add drag end listener (useful for removing visual styles)
    container.addEventListener('dragend', handleDragEnd);


    return container;
}

// Creates a thumbnail item for the drop zones
function createThumbnail(image) {
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Thumbnail ID ${image.id}`;
    img.className = 'img-thumbnail';
    img.dataset.imageId = image.id; // Store ID for potential removal later
    // Add click listener to potentially highlight in carousel? (Future enhancement)
    // img.addEventListener('click', () => highlightInCarousel(image.id));
    return img;
}

// --- Drag & Drop Event Handlers (To be implemented) ---

function handleDragStart(event) {
    // Add styling to the dragged element
    event.currentTarget.classList.add('dragging');
    // Store the ID and URL of the item being dragged
    draggedItemId = event.currentTarget.dataset.imageId;
    draggedItemUrl = event.currentTarget.dataset.imageUrl;
    // Set data to be transferred (needed for Firefox)
    event.dataTransfer.setData('text/plain', draggedItemId);
    event.dataTransfer.effectAllowed = 'move';
    console.log(`Drag Start: ID=${draggedItemId}`);
}

function handleDragEnd(event) {
     // Remove styling when drag ends
    event.currentTarget.classList.remove('dragging');
     console.log(`Drag End: ID=${draggedItemId}`);
     // Reset dragged item refs
     draggedItemId = null;
     draggedItemUrl = null;
}

function handleDragOver(event) {
    event.preventDefault(); // Necessary to allow dropping
    event.dataTransfer.dropEffect = 'move';
    // Add visual feedback to the drop zone
    event.currentTarget.classList.add('drag-over');
     // console.log(`Drag Over: ${event.currentTarget.id}`); // Can be noisy
}

function handleDragLeave(event) {
    // Remove visual feedback when dragging leaves
    event.currentTarget.classList.remove('drag-over');
}


function handleDrop(event) {
    event.preventDefault(); // Prevent default drop behavior (like opening link)
    event.currentTarget.classList.remove('drag-over'); // Remove visual feedback
    const targetZone = event.currentTarget;
    const targetRole = targetZone.dataset.role;
    const maxImages = parseInt(targetZone.dataset.maxImages) || 999; // Get max images limit

    console.log(`Drop Event: Item ID=${draggedItemId} -> Zone=${targetZone.id} (Role=${targetRole}, Max=${maxImages})`);

    if (!draggedItemId) {
        console.error("No dragged item ID found.");
        return;
    }

     // --- LOGIC TO ADD THUMBNAIL TO DROPZONE --- (To be implemented in next step)
     // 1. Check if image already exists in this zone? (Prevent duplicates)
     // 2. Check max image limit (especially for 'custom')
     // 3. If checks pass: Create thumbnail using createThumbnail({id: draggedItemId, url: draggedItemUrl})
     // 4. Append thumbnail to targetZone's .thumbnail-container
     // 5. Maybe remove from other zones if logic requires (e.g., main image)?
     // 6. Update internal state (JS variables tracking assignments)

    updateStatus(`Image ${draggedItemId} déposée dans ${targetRole}. (Logique à implémenter)`, 'info');


    // Reset dragged item refs (redundant with dragend, but safe)
    // draggedItemId = null;
    // draggedItemUrl = null;
}

// --- Data Fetching ---
const fetchProductData = async () => {
    updateStatus("Récupération des données produit...", 'info');

    // Clear previous displays
    if (productNameElement) productNameElement.textContent = 'Chargement...';
    if (imageCarousel) imageCarousel.innerHTML = '<p>Chargement...</p>'; // Clear carousel
    // Clear drop zones
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

        // --- PROCESS DATA ---
        updateStatus("Données reçues. Affichage...", 'info');

        // Update product name
        if (productNameElement) {
          productNameElement.textContent = data.productName || 'Non trouvé';
        }

        // Check if images_data exists and is an array
        if (data.images_data && Array.isArray(data.images_data)) {
            allImageData = data.images_data; // Store for later use

            if (allImageData.length > 0) {
                imageCarousel.innerHTML = ''; // Clear loading message

                // Populate Carousel & Pre-fill Drop Zones
                allImageData.forEach(image => {
                    // 1. Add to Carousel
                    const carouselItem = createCarouselItem(image);
                    imageCarousel.appendChild(carouselItem);

                    // 2. Pre-fill Drop Zones based on initial 'uses'
                    if (image.uses.includes('main') && dropzoneMain) {
                         dropzoneMain.querySelector('.thumbnail-container').appendChild(createThumbnail(image));
                    }
                    if (image.uses.includes('gallery') && dropzoneGallery) {
                         dropzoneGallery.querySelector('.thumbnail-container').appendChild(createThumbnail(image));
                    }
                    if (image.uses.includes('custom') && dropzoneCustom) {
                        // Optional: Check max limit here too? Although initial load should be trusted.
                         dropzoneCustom.querySelector('.thumbnail-container').appendChild(createThumbnail(image));
                    }
                });
                 updateStatus("Images affichées.", 'success');

            } else {
                imageCarousel.innerHTML = '<p>Aucune image disponible pour ce produit.</p>';
                 updateStatus("Aucune image trouvée.", 'info');
            }
        } else {
            // Handle case where images_data is missing or not an array
            console.error("Format de données invalide : 'images_data' manquant ou n'est pas un tableau.");
            imageCarousel.innerHTML = '<p>Erreur de format des données d\'images.</p>';
            updateStatus("Erreur format données images.", 'error');
        }

    } catch (error) {
        console.error("Erreur détaillée fetchProductData:", error);
        let uiErrorMessage = `Erreur récupération données: ${error.message || error.toString()}`;
        // ... error handling ...
        updateStatus(uiErrorMessage, 'error');
        if (productNameElement) productNameElement.textContent = 'Erreur';
        if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
};


// --- Save Changes --- (To be implemented)
const handleSaveChanges = async () => {
    updateStatus("Enregistrement des modifications...", 'info');
    saveChangesButton.disabled = true;

    // --- LOGIC TO GATHER ASSIGNMENTS ---
    // 1. Get mainImageId from #dropzone-main's thumbnail(s) dataset
    // 2. Get galleryImageIds (array) from #dropzone-gallery's thumbnails dataset
    // 3. Get customGalleryImageIds (array) from #dropzone-custom's thumbnails dataset

    const mainImageThumb = dropzoneMain.querySelector('.img-thumbnail');
    const mainImageId = mainImageThumb ? mainImageThumb.dataset.imageId : null;

    const galleryImageThumbs = dropzoneGallery.querySelectorAll('.img-thumbnail');
    const galleryImageIds = Array.from(galleryImageThumbs).map(thumb => thumb.dataset.imageId);

    const customGalleryThumbs = dropzoneCustom.querySelectorAll('.img-thumbnail');
    const customGalleryImageIds = Array.from(customGalleryThumbs).map(thumb => thumb.dataset.imageId);


    console.log("Data to send:", { mainImageId, galleryImageIds, customGalleryImageIds });

    // --- CALL N8N WEBHOOK --- (To be implemented)
    try {
         // const payload = { productId: currentProductId, mainImageId, galleryImageIds, customGalleryImageIds };
         // const response = await fetch(N8N_UPDATE_DATA_WEBHOOK_URL, { ... });
         // Handle response...

         // Simulate success for now
         await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
         updateStatus("Modifications enregistrées (Simulation)!", 'success');

         // Reload data to reflect changes
         setTimeout(fetchProductData, 1500); // Reload after showing success message

    } catch (error) {
        console.error("Erreur lors de l'enregistrement:", error);
        updateStatus(`Erreur enregistrement: ${error.message}`, 'error');
    } finally {
        saveChangesButton.disabled = false;
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }

    // Get DOM elements
    productIdElement = document.getElementById('productId');
    productNameElement = document.getElementById('productName');
    saveChangesButton = document.getElementById('saveChangesButton');
    statusElement = document.getElementById('status');
    dropzoneMain = document.getElementById('dropzone-main');
    dropzoneGallery = document.getElementById('dropzone-gallery');
    dropzoneCustom = document.getElementById('dropzone-custom');
    imageCarousel = document.getElementById('image-carousel');


    // Get Product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');

    if (!currentProductId) {
        updateStatus("Erreur: Product ID manquant dans l'URL.", 'error');
        if(saveChangesButton) saveChangesButton.disabled = true;
        return;
    }
    if (productIdElement) productIdElement.textContent = currentProductId;

    // --- Add Drop Zone Listeners ---
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
});
