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

    // From the MVP app.js
	const fetchProductData = async () => {
		updateStatus("Récupération des données produit...", 'info');
		// Assure-toi que productNameElement, mainImageUrlElement, imagePreviewContainer sont définis
		const productNameElement = document.getElementById('productName');
		const mainImageUrlElement = document.getElementById('mainImageUrl');
		const imagePreviewContainer = document.getElementById('imagePreview');

		try {
			// Construit l'URL à appeler
			const urlToFetch = `${N8N_GET_DATA_WEBHOOK_URL}?productId=${currentProductId}`;
			console.log(`Workspaceing data from: ${urlToFetch}`); // Log pour débogage

			// Fait l'appel
			const response = await fetch(urlToFetch);
			console.log('Raw response received:', response); // Log pour débogage

			// Vérifie si la réponse HTTP est OK (status 200-299)
			if (!response.ok) {
				// Si non-OK, essaie de lire le corps pour plus de détails avant de lever l'erreur
				const errorBody = await response.text().catch(() => 'Impossible de lire le corps de l\'erreur');
				console.error('Fetch failed:', response.status, response.statusText, errorBody);
				throw new Error(`Erreur serveur n8n (Get Data): ${response.status} ${response.statusText}`);
			}

			// Parse la réponse JSON (devrait fonctionner maintenant)
			const data = await response.json();
			console.log('Parsed JSON data:', data); // Log pour débogage

			// Met à jour l'interface utilisateur avec succès
			updateStatus("Données récupérées.", 'success');
			productNameElement.textContent = data.productName || 'Non trouvé';

			if (data.images && data.images.length > 0 && data.images[0].url) {
				const firstImageUrl = data.images[0].url;
				mainImageUrlElement.textContent = firstImageUrl;
				// Crée ou met à jour l'élément image
				let imgElement = imagePreviewContainer.querySelector('img');
				if (!imgElement) {
					imgElement = document.createElement('img');
					imagePreviewContainer.appendChild(imgElement);
				}
				imgElement.src = firstImageUrl;
				imgElement.alt = `Aperçu pour ${data.productName || currentProductId}`;
			} else {
				mainImageUrlElement.textContent = 'Aucune image trouvée';
				imagePreviewContainer.innerHTML = ''; // Vider l'aperçu s'il n'y a pas d'image
			}

		} catch (error) {
			// Log l'erreur complète dans la console (si accessible)
			console.error("Erreur détaillée fetchProductData:", error);

			// Affiche un message d'erreur dans l'interface
			let uiErrorMessage = `Erreur récupération données: ${error.message || error.toString()}`;
			if (error.name === 'TypeError' && error.message.toLowerCase().includes('failed to fetch')) {
				uiErrorMessage += ' (Vérifiez réseau, CORS, URL)';
			} else if (error.message.toLowerCase().includes('json input')) {
				 uiErrorMessage += ' (La réponse du serveur n\'est pas du JSON valide)';
			}

			updateStatus(uiErrorMessage, 'error');
			// Assure-toi que les éléments existent avant de modifier leur texte
			if (productNameElement) productNameElement.textContent = 'Erreur';
			if (mainImageUrlElement) mainImageUrlElement.textContent = 'Erreur';
			if (imagePreviewContainer) imagePreviewContainer.innerHTML = ''; // Vider en cas d'erreur
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
