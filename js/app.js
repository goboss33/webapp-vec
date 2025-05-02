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
    const mainImageUrlElement = document.getElementById('mainImageUrl');
    const imagePreviewContainer = document.getElementById('imagePreview');
    const finishButton = document.getElementById('finishButton');
    const statusElement = document.getElementById('status');

    // Fonction pour mettre à jour le statut
    const updateStatus = (message, type = 'info') => {
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
    };

    // Récupérer productId de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('productId');

    if (!currentProductId) {
        updateStatus("Erreur: Product ID manquant dans l'URL.", 'error');
        finishButton.disabled = true;
        return;
    }
    productIdElement.textContent = currentProductId;

    // Fonction pour récupérer les données du produit (via n8n)
    const fetchProductData = async () => {
        updateStatus("Récupération des données produit...", 'info');
        try {
            const response = await fetch(`<span class="math-inline">\{N8N\_GET\_DATA\_WEBHOOK\_URL\}?productId\=</span>{currentProductId}`);
            if (!response.ok) {
                throw new Error(`Erreur serveur n8n (Get Data): ${response.status}`);
            }
            const data = await response.json();
            updateStatus("Données récupérées.", 'success');
            productNameElement.textContent = data.productName || 'Non trouvé';
            // Afficher la première image (si elle existe dans les données dummy)
            if (data.images && data.images.length > 0) {
                const firstImageUrl = data.images[0].url;
                mainImageUrlElement.textContent = firstImageUrl;
                imagePreviewContainer.innerHTML = `<img src="${firstImageUrl}" alt="Aperçu">`;
            } else {
                 mainImageUrlElement.textContent = 'Aucune';
                 imagePreviewContainer.innerHTML = '';
            }

        } catch (error) {
            console.error("Erreur fetchProductData:", error);
            updateStatus(`Erreur récupération données: ${error.message}`, 'error');
            productNameElement.textContent = 'Erreur';
            mainImageUrlElement.textContent = 'Erreur';
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