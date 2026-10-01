import express from 'express';
import ExtensionsController from '../controllers/ExtensionsController.js';

const router = express.Router();

router.get('/', ExtensionsController.listExtensions);
router.get('/themes', ExtensionsController.getThemes);
router.get('/typography', ExtensionsController.getTypographyPacks);
router.get('/layouts', ExtensionsController.getLayoutPacks);

router.post('/:id/install', ExtensionsController.installExtension);
router.post('/:id/uninstall', ExtensionsController.uninstallExtension);
router.post('/:id/toggle', ExtensionsController.toggleExtension);
router.get('/:id/settings', ExtensionsController.getSettings);
router.put('/:id/settings', ExtensionsController.updateSettings);

export default router;
