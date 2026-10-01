import ExtensionService from '../services/extensions/ExtensionService.js';
import { sendSuccess, sendError, APIError } from '../utils/apiUtils.js';

class ExtensionsController {
  async listExtensions(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const extensions = await ExtensionService.listExtensionsForUser(userEmail);
      return sendSuccess(res, { extensions }, 'Extensions retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getActiveState(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const activeState = await ExtensionService.getActiveState(userEmail);
      return sendSuccess(res, activeState, 'Authoritative UI & extension state retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updateActiveState(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const updates = req.body || {};
      const updated = await ExtensionService.updateActiveState(userEmail, updates);
      return sendSuccess(res, updated, 'Authoritative UI & extension state persisted to PostgreSQL');
    } catch (err) {
      next(err);
    }
  }

  async installExtension(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const { id } = req.params;
      const result = await ExtensionService.installExtension(userEmail, id);
      return sendSuccess(res, result, `Extension "${id}" installed successfully`);
    } catch (err) {
      next(err);
    }
  }

  async uninstallExtension(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const { id } = req.params;
      const result = await ExtensionService.uninstallExtension(userEmail, id);
      return sendSuccess(res, result, `Extension "${id}" uninstalled successfully`);
    } catch (err) {
      next(err);
    }
  }

  async toggleExtension(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const { id } = req.params;
      const { enabled } = req.body;
      const result = await ExtensionService.toggleExtension(userEmail, id, enabled);
      return sendSuccess(res, result, `Extension "${id}" state updated`);
    } catch (err) {
      next(err);
    }
  }

  async getSettings(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const { id } = req.params;
      const extensions = await ExtensionService.listExtensionsForUser(userEmail);
      const ext = extensions.find(e => e.id === id);
      return sendSuccess(res, { settings: ext?.settings || {} }, 'Extension settings retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const userEmail = req.user?.email || 'guest@insightlens.edu';
      const { id } = req.params;
      const { settings } = req.body;
      const result = await ExtensionService.updateExtensionSettings(userEmail, id, settings || {});
      return sendSuccess(res, result, 'Extension settings updated');
    } catch (err) {
      next(err);
    }
  }

  async getThemes(req, res, next) {
    try {
      const themes = await ExtensionService.getThemes();
      return sendSuccess(res, { themes }, 'Themes retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getTypographyPacks(req, res, next) {
    try {
      const typographyPacks = await ExtensionService.getTypographyPacks();
      return sendSuccess(res, { typographyPacks }, 'Typography packs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  async getLayoutPacks(req, res, next) {
    try {
      const layoutPacks = await ExtensionService.getLayoutPacks();
      return sendSuccess(res, { layoutPacks }, 'Layout packs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default new ExtensionsController();
