// js/app.js - V3: Logique de Dépôt + Retrait Vignette

// --- URLs N8N --- (Vérifie qu'elles sont toujours bonnes)
const N8N_GET_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/get-product-data';
const N8N_UPDATE_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/update-product';

// --- Variables Globales ---
let currentProductId = null;
let allImageData = []; // Stocke les données des images reçues
let draggedItemId = null; // ID de l'image en cours de drag
let draggedItemUrl = null; // URL de l'image en cours de drag

// --- Références aux Éléments DOM (assignées dans DOMContentLoaded) ---
let productIdElement, productNameElement, saveChangesButton, statusElement;
let dropzoneMain, dropzoneGallery, dropzoneCustom;
let imageCarousel;

// --- Fonctions Utilitaires ---

// Met à jour le message de statut
const updateStatus = (message, type = 'info') => {
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
    } else {
        console.error("statusElement non trouvé. Ne peut pas mettre à jour le statut:", message);
    }
};

// Crée un élément pour le carousel (rendu draggable)
function createCarouselItem(image) {
    const container = document.createElement('div');
    container.className = 'carousel-image-container';
    container.draggable = true; // Rend tout le conteneur draggable
    container.dataset.imageId = image.id;
    container.dataset.imageUrl = image.url; // Stocke l'URL aussi

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Image ID ${image.id}`;
    // Empêche le drag natif sur l'image elle-même qui peut interférer
    img.ondragstart = (event) => event.preventDefault();

    const info = document.createElement('p');
    info.textContent = `ID: ${image.id} (${image.uses.join(', ') || 'libre'})`; // Affiche rôles initiaux

    container.appendChild(img);
    container.appendChild(info);

    // Écouteurs pour le drag & drop sur le conteneur
    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('dragend', handleDragEnd);

    return container;
}

// Crée une miniature pour les zones de dépôt (avec clic pour retirer)
function createThumbnail(image, targetRole) { // Ajout de targetRole pour le title
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Vignette ID ${image.id}`;
    img.className = 'img-thumbnail';
    img.dataset.imageId = image.id;

    // Ajoute le listener pour pouvoir cliquer et retirer
    img.addEventListener('click', handleThumbnailClickToRemove);

    // Info au survol
    img.title = `ID: ${image.id}\nAssigné à: ${targetRole}\n(Cliquer pour retirer)`;

    return img;
}

// --- Gestion du Retrait de Miniature ---
function handleThumbnailClickToRemove(event) {
    const thumbnail = event.currentTarget;
    const imageId = thumbnail.dataset.imageId;
    const container = thumbnail.closest('.thumbnail-container');
    const zone = thumbnail.closest('.dropzone');
    const role = zone ? zone.dataset.role : 'unknown';

    if (container && zone) {
        thumbnail.remove(); // Retire l'élément du DOM
        console.log(`Vignette retirée ID=${imageId} de la zone=${role}`);
        updateStatus(`Image ${imageId} retirée de la zone ${role}.`, 'info');
        // !!! TODO: Mettre à jour l'état interne (variables JS) qui suit les assignations
    } else {
        console.error("Impossible de trouver le conteneur/zone parent pour retirer la vignette.");
    }
}


// --- Gestionnaires d'Événements Drag & Drop ---

function handleDragStart(event) {
    // Applique un style à l'élément déplacé
    event.currentTarget.classList.add('dragging');
    // Stocke les infos de l'élément déplacé
    draggedItemId = event.currentTarget.dataset.imageId;
    draggedItemUrl = event.currentTarget.dataset.imageUrl;
    // Nécessaire pour Firefox et pour indiquer le type de données
    event.dataTransfer.setData('text/plain', draggedItemId);
    event.dataTransfer.effectAllowed = 'move';
    console.log(`Drag Start: ID=${draggedItemId}`);
}

function handleDragEnd(event) {
    // Retire le style de l'élément quand le drag se termine
    event.currentTarget.classList.remove('dragging');
    console.log(`Drag End: ID=${draggedItemId}`);
     // Optionnel : vérifier ici si le drop a réussi avant de reset ?
    // Reset les variables globales du drag
    draggedItemId = null;
    draggedItemUrl = null;
}

function handleDragOver(event) {
    event.preventDefault(); // Indispensable pour autoriser le drop
    event.dataTransfer.dropEffect = 'move';
    // Ajoute un style à la zone survolée pour feedback visuel
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    // Retire le style de la zone quand on quitte
    event.currentTarget.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault(); // Empêche le navigateur d'ouvrir l'image, etc.
    const targetZone = event.currentTarget; // La zone où on a déposé
    targetZone.classList.remove('drag-over'); // Retire le style de survol
    const targetRole = targetZone.dataset.role; // Récupère le rôle ('main', 'gallery', 'custom')
    const targetThumbContainer = targetZone.querySelector('.thumbnail-container'); // Le div où mettre la vignette
    const maxImages = parseInt(targetZone.dataset.maxImages) || 999; // Limite max (pour custom)

    console.log(`Drop Event: Tentative dépôt Image ID=${draggedItemId} -> Zone=${targetRole}`);

    // Vérifie si on a bien les infos de l'image déplacée et la zone cible
    if (!draggedItemId || !draggedItemUrl || !targetThumbContainer) {
        console.error("Drop Erreur: Données image ou conteneur cible manquant.");
        // Reset au cas où dragend n'aurait pas fonctionné
        draggedItemId = null;
        draggedItemUrl = null;
        return;
    }

    // Vérifie si l'image est déjà dans CETTE zone cible
    const existingThumb = targetThumbContainer.querySelector(`.img-thumbnail[data-image-id="${draggedItemId}"]`);
    if (existingThumb) {
        console.log(`Image ${draggedItemId} déjà présente dans la zone ${targetRole}.`);
        updateStatus(`Image ${draggedItemId} déjà dans la zone ${targetRole}.`, 'info');
        return; // On ne fait rien si elle y est déjà
    }

    // --- Logique Spécifique à chaque Zone ---

    // 1. Zone Principale ('main')
    if (targetRole === 'main') {
        // Une seule image autorisée: on vide la zone avant d'ajouter
        targetThumbContainer.innerHTML = '';
        // Crée et ajoute la nouvelle vignette
        const thumbnail = createThumbnail({ id: draggedItemId, url: draggedItemUrl }, targetRole);
        targetThumbContainer.appendChild(thumbnail);
        updateStatus(`Image ${draggedItemId} définie comme principale.`, 'success');
        // Optionnel : Si une image devient principale, faut-il la retirer des autres zones?
        // removeThumbnailFromOtherZones(draggedItemId, 'main'); // Fonction à créer si besoin
    }

    // 2. Zone Galerie ('gallery')
    else if (targetRole === 'gallery') {
        // Pas de limite spécifiée, on ajoute simplement
        const thumbnail = createThumbnail({ id: draggedItemId, url: draggedItemUrl }, targetRole);
        targetThumbContainer.appendChild(thumbnail);
        updateStatus(`Image ${draggedItemId} ajoutée à la galerie.`, 'success');
    }

    // 3. Zone Custom ('custom')
    else if (targetRole === 'custom') {
        const currentCount = targetThumbContainer.querySelectorAll('.img-thumbnail').length;
        if (currentCount < maxImages) {
            // Limite non atteinte, on ajoute
            const thumbnail = createThumbnail({ id: draggedItemId, url: draggedItemUrl }, targetRole);
            targetThumbContainer.appendChild(thumbnail);
            updateStatus(`Image ${draggedItemId} ajoutée à galerie custom (${currentCount + 1}/${maxImages}).`, 'success');
        } else {
            // Limite atteinte
            console.log(`Limite (${maxImages}) atteinte pour la galerie custom.`);
            updateStatus(`Limite de ${maxImages} images atteinte pour galerie custom.`, 'warn');
        }
    }

    // !!! TODO: Mettre à jour l'état interne (variables JS) qui suit les assignations
}


// --- Récupération Initiale des Données ---
const fetchProductData = async () => {
    updateStatus("Récupération des données produit...", 'info');

    // Nettoyage de l'interface avant chargement
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

        // Afficher le nom du produit
        if (productNameElement) {
          productNameElement.textContent = data.productName || 'Non trouvé';
        }

        // Traiter les images (en vérifiant la clé 'images' maintenant)
        if (data.images && Array.isArray(data.images)) {
            allImageData = data.images; // Stocker les données globalement

            if (allImageData.length > 0) {
                imageCarousel.innerHTML = ''; // Vider le message "Chargement..."

                // Peupler le Carousel et Pré-remplir les Zones de Dépôt
                allImageData.forEach(image => {
                    // 1. Ajouter l'élément au Carousel
                    const carouselItem = createCarouselItem(image);
                    imageCarousel.appendChild(carouselItem);

                    // 2. Ajouter les vignettes initiales dans les zones selon 'uses'
                    if (image.uses.includes('main') && dropzoneMain) {
                         dropzoneMain.querySelector('.thumbnail-container').appendChild(createThumbnail(image, 'main'));
                    }
                    if (image.uses.includes('gallery') && dropzoneGallery) {
                         dropzoneGallery.querySelector('.thumbnail-container').appendChild(createThumbnail(image, 'gallery'));
                    }
                    if (image.uses.includes('custom') && dropzoneCustom) {
                         // Vérifier la limite même au chargement initial? Normalement non.
                         dropzoneCustom.querySelector('.thumbnail-container').appendChild(createThumbnail(image, 'custom'));
                    }
                });
                 updateStatus("Images affichées. Glissez-les pour assigner les rôles.", 'success');

            } else {
                // Cas où le produit n'a pas d'images
                imageCarousel.innerHTML = '<p>Aucune image disponible pour ce produit.</p>';
                updateStatus("Aucune image trouvée.", 'info');
            }
        } else {
            // Cas où le format reçu n'est pas bon
            console.error("Format de données invalide : 'images' manquant ou n'est pas un tableau.");
            imageCarousel.innerHTML = '<p>Erreur de format des données d\'images.</p>';
            updateStatus("Erreur format données images.", 'error');
        }

    } catch (error) {
        // Gestion des erreurs réseau ou JSON
        console.error("Erreur détaillée fetchProductData:", error);
        let uiErrorMessage = `Erreur récupération données: ${error.message || error.toString()}`;
        updateStatus(uiErrorMessage, 'error');
        if (productNameElement) productNameElement.textContent = 'Erreur';
        if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur lors du chargement.</p>';
    }
};


// --- Enregistrement des Modifications ---
const handleSaveChanges = async () => {
    updateStatus("Enregistrement des modifications...", 'info');
    if(saveChangesButton) saveChangesButton.disabled = true;

    // --- Collecter l'état actuel depuis le DOM ---
    // Image Principale (devrait y en avoir 0 ou 1)
    const mainImageThumb = dropzoneMain ? dropzoneMain.querySelector('.img-thumbnail') : null;
    const mainImageId = mainImageThumb ? mainImageThumb.dataset.imageId : null;

    // Images Galerie
    const galleryImageThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.img-thumbnail') : [];
    const galleryImageIds = Array.from(galleryImageThumbs).map(thumb => thumb.dataset.imageId);

    // Images Galerie Custom
    const customGalleryThumbs = dropzoneCustom ? dropzoneCustom.querySelectorAll('.img-thumbnail') : [];
    const customGalleryImageIds = Array.from(customGalleryThumbs).map(thumb => thumb.dataset.imageId);

    // Log pour vérifier ce qu'on enverrait
    console.log("Données à envoyer (Simulation):", { productId: currentProductId, mainImageId, galleryImageIds, customGalleryImageIds });

    // --- Appeler le Webhook N8N (Partie à implémenter) ---
    try {
        /* // Décommenter et adapter pour l'appel réel
        const payload = {
            productId: currentProductId,
            mainImageId: mainImageId,
            galleryImageIds: galleryImageIds, // Envoyer le tableau
            customGalleryImageIds: customGalleryImageIds // Envoyer le tableau
        };

        const response = await fetch(N8N_UPDATE_DATA_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             // Essayer de lire le message d'erreur de n8n
             const errorData = await response.json().catch(() => ({ message: `Erreur serveur ${response.status}` }));
             throw new Error(errorData.message || `Erreur serveur n8n: ${response.status}`);
        }

        const result = await response.json(); // Lire la réponse succès de n8n
        console.log("Réponse de n8n (Mise à jour):", result);
        updateStatus("Modifications enregistrées avec succès !", 'success');
        */

         // Simulation pour l'instant
         await new Promise(resolve => setTimeout(resolve, 1000)); // Simule l'attente réseau
         updateStatus("Modifications enregistrées (Simulation)!", 'success');
         // Optionnel: recharger les données après succès ? Ou juste laisser l'utilisateur fermer.
         // setTimeout(fetchProductData, 1500);

    } catch (error) {
        console.error("Erreur lors de l'enregistrement:", error);
        updateStatus(`Erreur enregistrement: ${error.message}`, 'error');
    } finally {
        if(saveChangesButton) saveChangesButton.disabled = false;
    }
};


// --- Initialisation de l'application ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialise le SDK Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }

    // Récupère les références aux éléments DOM importants
    productIdElement = document.getElementById('productId');
    productNameElement = document.getElementById('productName');
    saveChangesButton = document.getElementById('saveChangesButton');
    statusElement = document.getElementById('status');
    dropzoneMain = document.getElementById('dropzone-main');
    dropzoneGallery = document.getElementById('dropzone-gallery');
    dropzoneCustom = document.getElementById('dropzone-custom');
    imageCarousel = document.getElementById('image-carousel');

    // Récupère l'ID produit depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');

    // Vérifie si l'ID est présent
    if (!currentProductId) {
        updateStatus("Erreur: Product ID manquant dans l'URL.", 'error');
        if(saveChangesButton) saveChangesButton.disabled = true; // Désactive le bouton si pas d'ID
        return; // Arrête l'exécution si pas d'ID
    }
    if (productIdElement) productIdElement.textContent = currentProductId;

    // --- Attache les écouteurs d'événements ---

    // Pour les zones de dépôt
     const dropzones = [dropzoneMain, dropzoneGallery, dropzoneCustom];
     dropzones.forEach(zone => {
         if (zone) { // Vérifie si l'élément existe avant d'ajouter l'écouteur
             zone.addEventListener('dragover', handleDragOver);
             zone.addEventListener('dragleave', handleDragLeave);
             zone.addEventListener('drop', handleDrop);
         } else {
             console.warn(`Dropzone non trouvée pour attacher les écouteurs.`);
         }
     });

    // Pour le bouton Enregistrer
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', handleSaveChanges);
    } else {
        console.error("Bouton 'Enregistrer Modifications' non trouvé!");
    }

    // Lance la récupération initiale des données produit
    fetchProductData();

}); // Fin de DOMContentLoaded
