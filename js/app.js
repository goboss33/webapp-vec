// js/app.js - MVP

// !!! IMPORTANT: Remplacez ces URLs par les URLs de VOS webhooks n8n (Production) !!!
const N8N_GET_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/get-product-data';
const N8N_UPDATE_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/update-product';
// !!! ------------------------------------------------------------------------- !!!

let currentProductId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialisation SDK Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }

    // Récupérer les éléments du DOM
    const productIdElement = document.getElementById('productId');
    const productNameElement = document.getElementById('productName');
    // const mainImageUrlElement = document.getElementById('mainImageUrl'); // On ne l'utilise plus directement
    const imagePreviewContainer = document.getElementById('imagePreview'); // Container pour TOUTES les images
    const finishButton = document.getElementById('finishButton');
    const statusElement = document.getElementById('status');

    // Fonction pour mettre à jour le statut (inchangée)
    const updateStatus = (message, type = 'info') => {
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
    };

    // Récupérer productId de l'URL (inchangé)
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');

    if (!currentProductId) {
        updateStatus("Erreur: Product ID manquant dans l'URL.", 'error');
        finishButton.disabled = true;
        return;
    }
    productIdElement.textContent = currentProductId;

    // --- MODIFIED fetchProductData ---
    const fetchProductData = async () => {
        updateStatus("Récupération des données produit...", 'info');
        // Assure-toi que productNameElement et imagePreviewContainer sont définis
        const productNameElement = document.getElementById('productName');
        const imagePreviewContainer = document.getElementById('imagePreview');

        // Vider l'affichage précédent
        if (productNameElement) productNameElement.textContent = 'Chargement...';
        if (imagePreviewContainer) imagePreviewContainer.innerHTML = ''; // Vider les anciennes images

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
             console.log('Type of data.images:', typeof data.images);
             console.log('Is data.images an Array?', Array.isArray(data.images));

            updateStatus("Données récupérées. Traitement...", 'info');

            // Mettre à jour le nom du produit
            if (productNameElement) {
              productNameElement.textContent = data.productName || 'Non trouvé';
            }

            // Traiter le tableau d'images
            if (imagePreviewContainer && data.images && Array.isArray(data.images) && data.images.length > 0) {
                data.images.forEach(image => {
                    // Créer un conteneur pour chaque image et ses infos
                    const imageDiv = document.createElement('div');
                    imageDiv.style.border = '1px solid #eee';
                    imageDiv.style.marginBottom = '10px';
                    imageDiv.style.padding = '5px';
                    imageDiv.style.textAlign = 'center';

                    // Créer l'élément image
                    const imgElement = document.createElement('img');
                    imgElement.src = image.url;
                    imgElement.alt = `Image ID ${image.id}`;
                    imgElement.style.maxWidth = '150px'; // Augmenter un peu la taille max ?
                    imgElement.style.maxHeight = '150px';
                    imgElement.style.display = 'block';
                    imgElement.style.margin = '5px auto';

                    // Ajouter l'image au conteneur div
                    imageDiv.appendChild(imgElement);

                    // Ajouter des infos textuelles (ID, Uses)
                    const infoP = document.createElement('p');
                    infoP.style.fontSize = '0.8em';
                    infoP.style.wordBreak = 'break-all';
                    infoP.textContent = `ID: ${image.id} | Rôles: ${image.uses.join(', ') || 'aucun'}`; // Affiche les rôles
                    imageDiv.appendChild(infoP);

                    // Mettre en évidence l'image principale
                    if (image.uses.includes('main')) {
                        imageDiv.style.borderColor = 'var(--tg-theme-button-color, green)'; // Utilise une couleur Telegram si possible
                        imageDiv.style.borderWidth = '2px';
                        const mainLabel = document.createElement('p');
                        mainLabel.textContent = '⭐ Principale ⭐';
                        mainLabel.style.fontWeight = 'bold';
                        mainLabel.style.color = 'var(--tg-theme-button-color, green)';
                        imageDiv.insertBefore(mainLabel, infoP); // Ajoute avant les infos ID/Rôles
                    }

                     // (Plus tard: Ajouter des boutons/checkbox pour modifier les rôles ici)

                    // Ajouter le conteneur de cette image au conteneur principal
                    imagePreviewContainer.appendChild(imageDiv);
                });
                 updateStatus("Données affichées.", 'success');

            } else if (imagePreviewContainer) {
                // Si pas d'images ou si data.images n'est pas un tableau correct
                imagePreviewContainer.textContent = 'Aucune image associée trouvée.';
                 updateStatus("Aucune image à afficher.", 'info');
            }

        } catch (error) {
            console.error("Erreur détaillée fetchProductData:", error);
            let uiErrorMessage = `Erreur récupération données: ${error.message || error.toString()}`;
             // ... (gestion des erreurs comme avant) ...
            updateStatus(uiErrorMessage, 'error');
            if (productNameElement) productNameElement.textContent = 'Erreur';
            if (imagePreviewContainer) imagePreviewContainer.innerHTML = 'Erreur lors du chargement.';
        }
    };

    // Fonction pour simuler la mise à jour (via n8n)
    const updateProduct = async () => {
        updateStatus("Envoi de la mise à jour (simulation)...", 'info');
        finishButton.disabled = true;
        try {
            // Pour l'instant, on envoie juste l'ID
            const payload = {
                productId: currentProductId,
                // Plus tard: on ajoutera ici les données modifiées
                modifiedData: { message: "Ceci est une simulation de mise à jour." }
            };

            const response = await fetch(N8N_UPDATE_DATA_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Erreur serveur n8n (Update Data): ${response.status}`);
            }
             // Optionnel: lire la réponse si le webhook renvoie qqchose
            const result = await response.json().catch(() => ({})); // Gère si pas de JSON

            updateStatus("Mise à jour simulée avec succès!", 'success');

             // Fermer la webapp après un délai
            setTimeout(() => {
                if (window.Telegram && window.Telegram.WebApp) {
                    Telegram.WebApp.close();
                }
            }, 1500);

        } catch (error) {
            console.error("Erreur updateProduct:", error);
            updateStatus(`Erreur mise à jour: ${error.message}`, 'error');
            finishButton.disabled = false; // Réactiver en cas d'erreur
        }
    };

    // Lancer la récupération des données au chargement
    fetchProductData();

    // Ajouter l'événement au bouton "Terminé"
    finishButton.addEventListener('click', updateProduct);
});
