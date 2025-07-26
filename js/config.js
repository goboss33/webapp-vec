// js/config.js

console.log('config.js module loaded');

export const N8N_GET_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/get-product-data';
export const N8N_UPDATE_DATA_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/update-product';
export const N8N_CROP_IMAGE_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/crop-n-replace-img';
export const N8N_REMOVE_WATERMARK_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/remove-watermark';
export const N8N_GENERATE_MOCKUP_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/create-mockup';
export const N8N_REPLACE_BACKGROUND_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/replace-background';
export const N8N_UPSCALE_IMAGE_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/webapp/upscale-image';

// NOUVELLE URL POUR LA RÉCUPÉRATION DES MANNEQUINS
export const N8N_GET_MANNEQUINS_WEBHOOK_URL = 'https://n8n.scalableweb.ch/webhook/get-mannequins';
console.log('config.js: N8N_GET_MANNEQUINS_WEBHOOK_URL added:', N8N_GET_MANNEQUINS_WEBHOOK_URL);