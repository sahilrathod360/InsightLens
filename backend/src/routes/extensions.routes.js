import express from 'express';
import ExtensionsController from '../controllers/ExtensionsController.js';

const router = express.Router();

router.get('/', ExtensionsController.listExtensions);
router.get('/active-state', ExtensionsController.getActiveState);
router.put('/active-state', ExtensionsController.updateActiveState);
router.get('/themes', ExtensionsController.getThemes);
router.get('/typography', ExtensionsController.getTypographyPacks);
router.get('/layouts', ExtensionsController.getLayoutPacks);

router.get('/:id/download', ExtensionsController.downloadPackage);
router.post('/:id/install', ExtensionsController.installExtension);
router.post('/:id/enable', ExtensionsController.enableExtension);
router.post('/:id/disable', ExtensionsController.disableExtension);
router.post('/:id/uninstall', ExtensionsController.uninstallExtension);
router.post('/:id/toggle', ExtensionsController.toggleExtension);
router.get('/:id/settings', ExtensionsController.getSettings);
router.put('/:id/settings', ExtensionsController.updateSettings);

export default router;
