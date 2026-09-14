import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/authController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';

const router: Router = Router();

// Routes protégées par Rate Limiter + Validation Zod
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Déconnexion et renouvellement
router.post('/logout', logout);
router.post('/refresh', refresh);

export default router;

