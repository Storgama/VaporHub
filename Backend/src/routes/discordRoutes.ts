import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { alertConfigSchema, updateAlertConfigSchema } from '../validators/discordValidator.js';
import * as discordController from '../controllers/discordController.js';

const router: Router = Router();

// Multi-Alertes CRUD
router.get('/configs', requireAuth, discordController.listAlertConfigs);
router.post('/configs', requireAuth, validate(alertConfigSchema), discordController.createAlertConfig);
router.put('/configs/:id', requireAuth, validate(updateAlertConfigSchema), discordController.updateAlertConfig);
router.delete('/configs/:id', requireAuth, discordController.deleteAlertConfig);

// Statut de connexion et Heartbeat du Bot Discord
router.get('/status', discordController.getBotConnectionStatus);
router.post('/heartbeat', discordController.postBotHeartbeat);

// Legacy routes pour compatibilité
router.get('/config', requireAuth, discordController.getAlertConfig);
router.post('/config', requireAuth, validate(alertConfigSchema), discordController.saveAlertConfig);

export default router;
