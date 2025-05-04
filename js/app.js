// js/app.js - V4: Intégration de SortableJS pour Drag & Drop

// --- URLs N8N ---
const N8N_GET_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/get-product-data';
const N8N_UPDATE_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/update-product';

// --- Variables Globales ---
let currentProductId = null;
let allImageData = []; // Stocke les données des images reçues
let sortableCarousel = null; // Instance Sortable pour le carousel
let sortableZones = {}; // Stockera les instances Sortable pour les zones {main: instance, gallery: instance, ...}

// --- Références aux Éléments DOM ---
let productIdElement, productNameElement, saveChangesButton, statusElement;
let dropzoneMain, dropzoneGallery, dropzoneCustom;
let imageCarouselContainer, imageCarousel; // Ajout container carousel

// --- Fonctions Utilitaires ---
const updateStatus = (message, type = 'info') => {
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
    } else {
        console.error("statusElement non trouvé.");
    }
};

// Crée un élément pour le carousel (pour SortableJS)
// Note: On met les données dans le dataset de l'élément qui sera cloné/déplacé par SortableJS
function createCarouselItem(image) {
    const container = document.createElement('div');
    container.className = 'carousel-image-container';
    // Stocke les données nécessaires directement sur l'élément
    container.dataset.imageId = image.id;
    container.dataset.imageUrl = image.url;
     // Ajoute les rôles initiaux pour info, mais non essentiel pour le drag
    container.dataset.initialUses = image.uses.join(',');

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Image ID ${image.id}`;

    const info = document.createElement('p');
    info.textContent = `ID: ${image.id}`; // Simplifié, rôle affiché dans la zone

    container.appendChild(img);
    container.appendChild(info);

    // PAS D'ECOUTEUR DRAGSTART ICI - SortableJS s'en charge

    return container;
}

// Crée une miniature pour les zones de dépôt (avec clic pour retirer)
function createThumbnail(image, targetRole) {
    const container = document.createElement('div'); // Utiliser un conteneur pour la miniature + bouton
    container.className = 'thumbnail-wrapper';
    container.dataset.imageId = image.id; // Garde l'ID sur le wrapper

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = `Vignette ID ${image.id}`;
    img.className = 'img-thumbnail'; // Garde cette classe pour le style
    img.title = `ID: ${image.id}\nAssigné à: ${targetRole}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×'; // Croix pour supprimer
    removeBtn.className = 'remove-thumbnail-btn';
    removeBtn.title = `Retirer de ${targetRole}`;
    removeBtn.onclick = handleThumbnailRemoveClick; // Utilise un seul handler

    container.appendChild(img);
    container.appendChild(removeBtn);

    return container; // Retourne le wrapper complet
}

// Handler pour le clic sur le bouton 'x' des miniatures
function handleThumbnailRemoveClick(event) {
    const wrapper = event.currentTarget.closest('.thumbnail-wrapper');
    const imageId = wrapper.dataset.imageId;
    const zone = wrapper.closest('.dropzone');
    const role = zone ? zone.dataset.role : 'unknown';

    if (wrapper) {
        wrapper.remove(); // Retire le wrapper (image + bouton)
        console.log(`Vignette retirée (clic) ID=${imageId} de la zone=${role}`);
        updateStatus(`Image ${imageId} retirée de la zone ${role}.`, 'info');
        // Mettre à jour l'état interne si nécessaire
    }
}


// --- Initialisation de SortableJS ---
function initializeSortable() {
    if (!Sortable) {
        console.error("SortableJS n'est pas chargé !");
        updateStatus("Erreur: Bibliothèque SortableJS manquante.", "error");
        return;
    }

    // Rendre les éléments du carousel déplaçables (Source)
    // On clone les éléments pour ne pas vider le carousel
    sortableCarousel = new Sortable(imageCarousel, {
        group: {
            name: 'shared',
            pull: 'clone', // On clone l'élément quand on le sort du carousel
            put: false // On ne peut pas déposer DANS le carousel
        },
        sort: false, // On ne veut pas réorganiser le carousel lui-même
        animation: 150,
        onClone: (evt) => {
             // Optionnel: ajouter une classe CSS pendant le clonage/drag
             evt.clone.classList.add("dragging-clone");
        },
        // Note: Pas besoin de onStart/onEnd ici si on gère via les zones
    });

    // Rendre les zones de dépôt réceptives (Destinations)
    const dropZoneElements = [dropzoneMain, dropzoneGallery, dropzoneCustom];
    dropZoneElements.forEach(zoneElement => {
        if (zoneElement) {
            const container = zoneElement.querySelector('.thumbnail-container');
            const role = zoneElement.dataset.role;
            const maxImages = parseInt(zoneElement.dataset.maxImages) || 999;

            sortableZones[role] = new Sortable(container, {
                group: 'shared', // Permet de recevoir depuis le carousel (et potentiellement d'autres zones)
                animation: 150,
                onAdd: function (evt) { // Fonction déclenchée quand un élément est AJOUTÉ à cette zone
                    const itemEl = evt.item; // L'élément qui a été déposé (c'est notre .carousel-image-container cloné)
                    const droppedImageId = itemEl.dataset.imageId;
                    const droppedImageUrl = itemEl.dataset.imageUrl;
                    const targetContainer = evt.to; // Le .thumbnail-container où on a déposé

                    console.log(`onAdd Event: Image ID ${droppedImageId} ajoutée à la zone ${role}`);

                    // Règle 1: Vérifier doublons dans la zone cible
                    const existing = Array.from(targetContainer.querySelectorAll('.thumbnail-wrapper'))
                                         .find(wrapper => wrapper.dataset.imageId === droppedImageId);
                    if (existing) {
                        console.log("Doublon détecté, annulation de l'ajout.");
                        itemEl.remove(); // Supprime l'élément cloné qui vient d'être ajouté
                        updateStatus(`Image ${droppedImageId} déjà dans la zone ${role}.`, 'info');
                        return;
                    }

                    // Règle 2: Zone Principale - une seule image
                    if (role === 'main' && targetContainer.children.length > 1) { // > 1 car itemEl est déjà ajouté à ce stade
                        console.log("Zone Principale ne peut contenir qu'une image. Retrait de l'ancienne.");
                        // Supprime tous les enfants SAUF le nouvel élément 'itemEl'
                         Array.from(targetContainer.children).forEach(child => {
                             if (child !== itemEl) child.remove();
                         });
                         updateStatus(`Ancienne image principale remplacée par ${droppedImageId}.`, 'info');
                    }

                    // Règle 3: Zone Custom - limite max
                    if (role === 'custom' && targetContainer.children.length > maxImages) {
                        console.log(`Limite (${maxImages}) atteinte pour Custom. Annulation.`);
                        itemEl.remove(); // Supprime l'élément ajouté en trop
                        updateStatus(`Limite de ${maxImages} images atteinte pour galerie custom.`, 'warn');
                        return;
                    }

                    // --- Transformation du Clone en Vignette ---
                    // Si on arrive ici, l'ajout est valide (ou c'est la galerie sans limite)
                    // On remplace le clone du carousel par une vraie vignette cliquable
                    const thumbnailWrapper = createThumbnail({ id: droppedImageId, url: droppedImageUrl }, role);
                    targetContainer.replaceChild(thumbnailWrapper, itemEl); // Remplace le clone par la vignette

                    updateStatus(`Image ${droppedImageId} ajoutée à la zone ${role}.`, 'success');

                    // TODO: Mettre à jour l'état interne JS
                },
                 onRemove: function(evt) { // Quand un élément est retiré (soit par drag ailleurs, soit par clic->remove)
                     const itemEl = evt.item; // L'élément retiré (thumbnail-wrapper)
                     const removedImageId = itemEl.dataset.imageId;
                     console.log(`onRemove Event: Image ID ${removedImageId} retirée de la zone ${role}`);
                      updateStatus(`Image ${removedImageId} retirée de la zone ${role}.`, 'info');
                     // TODO: Mettre à jour l'état interne JS
                 }
            });
        }
    });
}


// --- Récupération Initiale des Données ---
const fetchProductData = async () => {
    updateStatus("Récupération des données produit...", 'info');
    if (productNameElement) productNameElement.textContent = 'Chargement...';
    // Vider le carousel et les conteneurs de vignettes avant de re-peupler
    if (imageCarousel) imageCarousel.innerHTML = '<p>Chargement...</p>';
    document.querySelectorAll('.dropzone .thumbnail-container').forEach(container => container.innerHTML = '');

    try {
        const urlToFetch = `${N8N_GET_DATA_WEBHOOK_URL}?productId=${currentProductId}`;
        const response = await fetch(urlToFetch);
        if (!response.ok) throw new Error(`Erreur serveur n8n: ${response.status}`);
        const data = await response.json();
        console.log('Parsed JSON data:', data);
        updateStatus("Données reçues. Affichage...", 'info');

        if (productNameElement) productNameElement.textContent = data.productName || 'Non trouvé';

        // Utiliser 'data.images' comme clé (confirmé dans le dernier debug)
        if (data.images && Array.isArray(data.images)) {
            allImageData = data.images;

            if (allImageData.length > 0) {
                imageCarousel.innerHTML = ''; // Vider le message de chargement

                // Peupler le carousel et pré-remplir les zones
                allImageData.forEach(image => {
                    // 1. Ajouter au Carousel
                    imageCarousel.appendChild(createCarouselItem(image));
                    // 2. Pré-remplir les zones selon 'uses'
                    if (image.uses.includes('main') && dropzoneMain) {
                         dropzoneMain.querySelector('.thumbnail-container').appendChild(createThumbnail(image, 'main'));
                    }
                    if (image.uses.includes('gallery') && dropzoneGallery) {
                         dropzoneGallery.querySelector('.thumbnail-container').appendChild(createThumbnail(image, 'gallery'));
                    }
                    if (image.uses.includes('custom') && dropzoneCustom) {
                         dropzoneCustom.querySelector('.thumbnail-container').appendChild(createThumbnail(image, 'custom'));
                    }
                });

                // Initialiser SortableJS APRÈS avoir peuplé le DOM
                initializeSortable();

                updateStatus("Images affichées. Glissez-les pour assigner les rôles.", 'success');
            } else {
                imageCarousel.innerHTML = '<p>Aucune image disponible.</p>';
                updateStatus("Aucune image trouvée.", 'info');
            }
        } else {
            console.error("Format de données invalide : 'images' manquant ou n'est pas un tableau.");
            imageCarousel.innerHTML = '<p>Erreur format données.</p>';
            updateStatus("Erreur format données images.", 'error');
        }
    } catch (error) {
        console.error("Erreur fetchProductData:", error);
        updateStatus(`Erreur chargement: ${error.message}`, 'error');
        if (productNameElement) productNameElement.textContent = 'Erreur';
        if (imageCarousel) imageCarousel.innerHTML = '<p>Erreur chargement.</p>';
    }
};


// --- Enregistrement des Modifications ---
const handleSaveChanges = async () => {
    updateStatus("Enregistrement des modifications...", 'info');
    if (saveChangesButton) saveChangesButton.disabled = true; // Désactive le bouton pendant l'enregistrement

    // --- Collecter l'état actuel depuis les vignettes dans le DOM ---
    const mainImageThumb = dropzoneMain ? dropzoneMain.querySelector('.thumbnail-wrapper') : null;
    // Récupère l'ID de l'image principale, ou null si aucune n'est dans la zone
    const mainImageId = mainImageThumb ? mainImageThumb.dataset.imageId : null;

    // Récupère les IDs des images dans la zone Galerie
    const galleryImageThumbs = dropzoneGallery ? dropzoneGallery.querySelectorAll('.thumbnail-wrapper') : [];
    const galleryImageIds = Array.from(galleryImageThumbs).map(wrapper => wrapper.dataset.imageId);

    // Récupère les IDs des images dans la zone Custom Galerie
    const customGalleryThumbs = dropzoneCustom ? dropzoneCustom.querySelectorAll('.thumbnail-wrapper') : [];
    const customGalleryImageIds = Array.from(customGalleryThumbs).map(wrapper => wrapper.dataset.imageId);

    // Prépare le corps de la requête (payload) pour n8n
    const payload = {
        productId: currentProductId, // ID du produit actuel
        mainImageId: mainImageId, // ID de l'image principale (ou null)
        galleryImageIds: galleryImageIds, // Tableau des IDs galerie standard
        customGalleryImageIds: customGalleryImageIds // Tableau des IDs galerie custom
    };

    console.log("Données envoyées à n8n:", payload); // Log pour déboguer ce qui est envoyé

    // --- Appeler le Webhook N8N ---
    try {
        // Envoie les données au webhook de mise à jour
        const response = await fetch(N8N_UPDATE_DATA_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Ajouter d'autres headers si ton webhook n8n le nécessite
            },
            body: JSON.stringify(payload) // Convertit l'objet JS en chaîne JSON
        });

        // Vérifie si la requête vers n8n a réussi (status HTTP 2xx)
        if (!response.ok) {
            // Si erreur HTTP, essaie de lire le message d'erreur renvoyé par n8n
            let errorMsg = `Erreur serveur n8n: ${response.status}`;
            try {
                // n8n renvoie souvent les erreurs en JSON avec une clé 'message'
                const errorData = await response.json();
                errorMsg = errorData.message || JSON.stringify(errorData);
            } catch (e) {
                console.warn("Impossible de parser la réponse d'erreur JSON de n8n.");
                // Si le corps n'est pas du JSON, utilise le statut texte
                errorMsg = `Erreur serveur n8n: ${response.status} ${response.statusText}`;
            }
            // Lance une erreur JS pour être attrapée par le 'catch'
            throw new Error(errorMsg);
        }

        // Si la requête a réussi, lire la réponse succès de n8n
        const result = await response.json();
        console.log("Réponse de n8n (Mise à jour):", result);
        // Affiche le message de succès (venant de n8n si possible, sinon un message par défaut)
        updateStatus(result.message || "Modifications enregistrées avec succès !", 'success');

        // Que faire après succès ?
        // Option 1: Recharger les données pour être sûr à 100% de l'état serveur
        // setTimeout(fetchProductData, 1500);

        // Option 2: Ne rien faire de plus, l'interface reflète déjà les choix.
        // L'utilisateur peut fermer la Web App. C'est peut-être moins déroutant.
        // On choisit Option 2 pour l'instant.

    } catch (error) {
        // Gère les erreurs (réseau ou erreur renvoyée par n8n)
        console.error("Erreur lors de l'enregistrement via n8n:", error);
        updateStatus(`Erreur enregistrement: ${error.message}`, 'error');
    } finally {
        // Réactive le bouton dans tous les cas (succès ou échec)
        if (saveChangesButton) saveChangesButton.disabled = false;
    }
};


// --- Initialisation de l'application ---
document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }

    // Récupérer les éléments DOM
    productIdElement = document.getElementById('productId');
    productNameElement = document.getElementById('productName');
    saveChangesButton = document.getElementById('saveChangesButton');
    statusElement = document.getElementById('status');
    dropzoneMain = document.getElementById('dropzone-main');
    dropzoneGallery = document.getElementById('dropzone-gallery');
    dropzoneCustom = document.getElementById('dropzone-custom');
    imageCarouselContainer = document.getElementById('image-carousel-container'); // Container global
    imageCarousel = document.getElementById('image-carousel'); // Le div interne pour SortableJS

    // Récupérer Product ID
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');
    if (!currentProductId) {
        updateStatus("Erreur: Product ID manquant.", 'error');
        if(saveChangesButton) saveChangesButton.disabled = true;
        return;
    }
    if (productIdElement) productIdElement.textContent = currentProductId;

    // Attacher l'écouteur au bouton Enregistrer
    if (saveChangesButton) {
        saveChangesButton.addEventListener('click', handleSaveChanges);
    } else {
        console.error("Bouton 'Enregistrer Modifications' non trouvé!");
    }

    // Récupérer les données initiales (ce qui déclenchera aussi initializeSortable)
    fetchProductData();

}); // Fin de DOMContentLoaded
