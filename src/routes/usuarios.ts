/**
 * Rutas de Usuarios
 * =================
 * GET    /api/usuarios/:id              - Obtener perfil de usuario
 * GET    /api/usuarios                  - Obtener ranking de usuarios
 * POST   /api/usuarios                  - Crear nuevo usuario (desde auth)
 * PUT    /api/usuarios/:id/puntos       - Agregar puntos (gamificación)
 * PUT    /api/usuarios/:id/badge        - Otorgar badge
 * GET    /api/usuarios/:id/badges       - Obtener badges del usuario
 */

import { Router, Request, Response } from 'express';
import {
  crearUsuario,
  obtenerUsuarioById,
  obtenerRanking,
  agregarPuntos,
  otorgarBadge,
  actualizarRating,
} from '../services/usuarioService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/helpers';

const router = Router();

/**
 * GET /api/usuarios/:id
 * Obtener perfil del usuario
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const usuario = await obtenerUsuarioById(id);

    res.json({
      success: true,
      data: usuario,
    });
  })
);

/**
 * GET /api/usuarios
 * Obtener ranking de top usuarios (por reportes)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const limite = parseInt(req.query.limit as string) || 10;

    if (limite < 1 || limite > 100) {
      throw new AppError(400, 'Limite debe estar entre 1 y 100', 'INVALID_LIMIT');
    }

    const ranking = await obtenerRanking(limite);

    res.json({
      success: true,
      data: ranking,
      total: ranking.length,
    });
  })
);

/**
 * POST /api/usuarios
 * Crear nuevo usuario (se llama después de autenticación)
 * Body: { email, nombre }
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, nombre } = req.body;

    if (!email || !nombre) {
      throw new AppError(400, 'Email y nombre son requeridos', 'MISSING_FIELDS');
    }

    // Validar email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(400, 'Email inválido', 'INVALID_EMAIL');
    }

    const usuario = await crearUsuario(email, nombre);

    res.status(201).json({
      success: true,
      data: usuario,
      message: 'Usuario creado exitosamente',
    });
  })
);

/**
 * PUT /api/usuarios/:id/puntos
 * Agregar puntos al usuario (gamificación)
 * Body: { puntos }
 */
router.put(
  '/:id/puntos',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { puntos } = req.body;

    if (!puntos || typeof puntos !== 'number' || puntos < 0) {
      throw new AppError(400, 'puntos debe ser un número positivo', 'INVALID_POINTS');
    }

    const totalPuntos = await agregarPuntos(id, puntos);

    res.json({
      success: true,
      data: { usuario_id: id, puntos_agregados: puntos, total_puntos: totalPuntos },
      message: `Se agregaron ${puntos} puntos`,
    });
  })
);

/**
 * PUT /api/usuarios/:id/badge
 * Otorgar badge al usuario
 * Body: { badge }
 */
router.put(
  '/:id/badge',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { badge } = req.body;

    if (!badge || typeof badge !== 'string') {
      throw new AppError(400, 'badge es requerido y debe ser string', 'INVALID_BADGE');
    }

    // Badges válidos
    const badgesValidos = [
      'PRIMER_REPORTE',
      'REPORTERO_DILIGENTE',
      'VERIFICADOR_CONFIABLE',
      'EXPERTO_PRECIOS',
      'ESTRELLA_COMUNITARIA',
      '10_REPORTES',
      '50_REPORTES',
      '100_REPORTES',
    ];

    if (!badgesValidos.includes(badge)) {
      throw new AppError(400, `Badge no válido. Válidos: ${badgesValidos.join(', ')}`, 'INVALID_BADGE');
    }

    const badges = await otorgarBadge(id, badge);

    res.json({
      success: true,
      data: { usuario_id: id, badges },
      message: `Badge "${badge}" otorgado`,
    });
  })
);

/**
 * GET /api/usuarios/:id/badges
 * Obtener todos los badges del usuario
 */
router.get(
  '/:id/badges',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const usuario = await obtenerUsuarioById(id);

    res.json({
      success: true,
      data: {
        usuario_id: id,
        badges: usuario.badges,
        total: usuario.badges.length,
      },
    });
  })
);

/**
 * PUT /api/usuarios/:id/rating
 * Actualizar rating del usuario
 * Body: { rating } (1-5)
 */
router.put(
  '/:id/rating',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new AppError(400, 'Rating debe ser un número entre 1 y 5', 'INVALID_RATING');
    }

    const nuevoRating = await actualizarRating(id, rating);

    res.json({
      success: true,
      data: { usuario_id: id, rating: nuevoRating },
      message: 'Rating actualizado',
    });
  })
);

export default router;
