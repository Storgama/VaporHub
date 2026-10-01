import type { Request, Response, NextFunction } from 'express';
import * as discordService from '../services/discordService.js';
import * as botStatusService from '../services/botStatusService.js';

interface RequestWithUser extends Request {
    user?: {
        userId: string;
        username?: string;
        email?: string;
    };
}

type NextHandler = ((err?: unknown) => void) | NextFunction | unknown;

function callNext(next: NextHandler, error: unknown): void {
    if (typeof next === 'function') {
        (next as (err?: unknown) => void)(error);
    }
}

export async function listAlertConfigs(
    req: Request,
    res: Response,
    next: NextHandler
): Promise<void | Response> {
    try {
        const userId = (req as RequestWithUser).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const configs = await discordService.getAlertConfigs(userId);
        return res.json({
            success: true,
            configs
        });
    } catch (error) {
        callNext(next, error);
    }
}

export async function getAlertConfig(
    req: Request,
    res: Response,
    next: NextHandler
): Promise<void | Response> {
    try {
        const userId = (req as RequestWithUser).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const config = await discordService.getAlertConfig(userId);
        return res.json({
            success: true,
            config
        });
    } catch (error) {
        callNext(next, error);
    }
}

export async function createAlertConfig(
    req: Request,
    res: Response,
    next: NextHandler
): Promise<void | Response> {
    try {
        const userId = (req as RequestWithUser).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const config = await discordService.createAlertConfig(userId, req.body);
        return res.status(201).json({
            success: true,
            config
        });
    } catch (error) {
        callNext(next, error);
    }
}

export async function updateAlertConfig(
    req: Request,
    res: Response,
    next: NextHandler
): Promise<void | Response> {
    try {
        const userId = (req as RequestWithUser).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const rawId = req.params?.id;
        const alertId = typeof rawId === 'string' ? rawId : (Array.isArray(rawId) ? rawId[0] : '');
        if (!alertId) {
            return res.status(400).json({ error: 'Identifiant d\'alerte requis' });
        }

        const config = await discordService.updateAlertConfig(userId, alertId, req.body);
        if (!config) {
            return res.status(404).json({ error: 'Alerte introuvable' });
        }

        return res.json({
            success: true,
            message: 'Configuration mise à jour avec succès',
            config
        });
    } catch (error) {
        callNext(next, error);
    }
}

export async function deleteAlertConfig(
    req: Request,
    res: Response,
    next: NextHandler
): Promise<void | Response> {
    try {
        const userId = (req as RequestWithUser).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const rawId = req.params?.id;
        const alertId = typeof rawId === 'string' ? rawId : (Array.isArray(rawId) ? rawId[0] : '');
        if (!alertId) {
            return res.status(400).json({ error: 'Identifiant d\'alerte requis' });
        }

        const deleted = await discordService.deleteAlertConfig(userId, alertId);
        if (!deleted) {
            return res.status(404).json({ error: 'Alerte introuvable' });
        }

        return res.json({
            success: true,
            message: 'Alerte supprimée avec succès'
        });
    } catch (error) {
        callNext(next, error);
    }
}

export async function saveAlertConfig(
    req: Request,
    res: Response,
    next: NextHandler
): Promise<void | Response> {
    try {
        const userId = (req as RequestWithUser).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const config = await discordService.saveAlertConfig(userId, req.body);
        return res.json({
            success: true,
            message: 'Configuration d\'alerte Discord enregistrée avec succès',
            config
        });
    } catch (error) {
        callNext(next, error);
    }
}

export async function getBotConnectionStatus(
    _req: Request,
    res: Response
): Promise<void | Response> {
    const status = botStatusService.getBotStatus();
    return res.json({
        success: true,
        ...status
    });
}

export async function postBotHeartbeat(
    req: Request,
    res: Response
): Promise<void | Response> {
    botStatusService.recordHeartbeat(req.body);
    return res.json({
        success: true,
        message: 'Heartbeat reçu avec succès'
    });
}

