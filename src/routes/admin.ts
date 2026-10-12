/**
 * Rutas de Administración
 * =======================
 * Todas requieren header: Authorization: Bearer <ADMIN_TOKEN>  (o X-Admin-Token: <ADMIN_TOKEN>)
 *
 * GET    /api/admin/reportes/pendientes     - Listar reportes sin verificar (?tipo=Super&limit=50)
 * PUT    /api/admin/reportes/:id/aprobar    - Validar reporte (marca como verificado)
 * PUT    /api/admin/reportes/:id/rechazar   - Rechazar reporte (lo elimina)
 * POST   /api/admin/precios/manual          - Crear precio manual (ya verificado)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { generateId, formatearPrecio, logger } from '../utils/helpers';

const router = Router();

const TIPOS_VALIDOS = ['Extra', 'Super', 'Diesel', 'Ecopaís'];

// Rangos reales Ecuador (mismos que /api/precios/reportar)
const RANGOS_PRECIO: Record<string, [number, number]> = {
  'Extra': [2.50, 4.00],
  'Super': [4.00, 5.50],
  'Diesel': [2.50, 4.00],
  'Ecopaís': [3.50, 5.00],
};

// UUID fijo para precios creados por el administrador (reportado_por es NOT NULL)
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Middleware: valida el token de administrador
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return next(new AppError(503, 'ADMIN_TOKEN no configurado en el servidor', 'ADMIN_DISABLED'));
  }

  const authHeader = req.headers.authorization || '';
  const provided =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '') ||
    (req.headers['x-admin-token'] as string | undefined) ||
    '';

  const a = Buffer.from(provided);
  const b = Buffer.from(adminToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return next(new AppError(401, 'Token de administrador inválido', 'UNAUTHORIZED'));
  }

  next();
};

router.use(requireAdmin);

/**
 * GET /api/admin/reportes/pendientes
 * Listar reportes de precios aún no verificados (más recientes primero)
 */
router.get(
  '/reportes/pendientes',
  asyncHandler(async (req: Request, res: Response) => {
    const tipo = req.query.tipo as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      throw new AppError(400, 'Tipo de combustible inválido', 'INVALID_FUEL_TYPE');
    }

    let query = supabaseAdmin
      .from('precios')
      .select('*, gasolineras(nombre, marca, ciudad, direccion)')
      .eq('es_verificado', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (tipo) query = query.eq('tipo_combustible', tipo);

    const { data, error } = await query;
    if (error) {
      logger.error('Error al listar reportes pendientes:', error);
      throw new AppError(500, 'Error al obtener reportes pendientes', 'DB_ERROR');
    }

    res.json({
      success: true,
      data,
      total: data?.length || 0,
    });
  })
);

/**
 * PUT /api/admin/reportes/:id/aprobar
 * Validar un reporte manualmente
 */
router.put(
  '/reportes/:id/aprobar',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('precios')
      .update({ es_verificado: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Error al aprobar reporte:', error);
      throw new AppError(500, 'Error al aprobar reporte', 'DB_ERROR');
    }
    if (!data) throw new AppError(404, 'Reporte no encontrado', 'NOT_FOUND');

    logger.info(`[ADMIN] Reporte aprobado: ${id}`);

    res.json({ success: true, data, message: 'Reporte validado' });
  })
);

/**
 * PUT /api/admin/reportes/:id/rechazar
 * Rechazar un reporte (se elimina)
 */
router.put(
  '/reportes/:id/rechazar',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('precios')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Error al rechazar reporte:', error);
      throw new AppError(500, 'Error al rechazar reporte', 'DB_ERROR');
    }
    if (!data) throw new AppError(404, 'Reporte no encontrado', 'NOT_FOUND');

    logger.info(`[ADMIN] Reporte rechazado y eliminado: ${id}`);

    res.json({ success: true, message: 'Reporte rechazado' });
  })
);

/**
 * POST /api/admin/precios/manual
 * Crear un precio manual ya verificado
 * Body: { gasolinera_id, tipo_combustible?, precio }   (tipo_combustible por defecto: Super)
 */
router.post(
  '/precios/manual',
  asyncHandler(async (req: Request, res: Response) => {
    const { gasolinera_id, precio } = req.body;
    const tipo_combustible = req.body.tipo_combustible || 'Super';

    if (!gasolinera_id || precio === undefined) {
      throw new AppError(400, 'Faltan campos: gasolinera_id, precio', 'MISSING_FIELDS');
    }

    if (!TIPOS_VALIDOS.includes(tipo_combustible)) {
      throw new AppError(400, 'Tipo de combustible inválido', 'INVALID_FUEL_TYPE');
    }

    const [precioMin, precioMax] = RANGOS_PRECIO[tipo_combustible];
    if (typeof precio !== 'number' || precio < precioMin || precio > precioMax) {
      throw new AppError(
        400,
        `Precio de ${tipo_combustible} debe estar entre $${precioMin} y $${precioMax}`,
        'INVALID_PRICE'
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('precios')
      .insert({
        id: generateId(),
        gasolinera_id,
        tipo_combustible,
        precio: formatearPrecio(precio),
        moneda: 'USD',
        reportado_por: ADMIN_USER_ID,
        tiene_foto: false,
        es_verificado: true,
        verificaciones: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error al crear precio manual:', error);
      throw new AppError(500, 'Error al crear precio manual', 'DB_ERROR');
    }

    logger.info(`[ADMIN] Precio manual: ${gasolinera_id} - ${tipo_combustible} - $${precio}`);

    res.status(201).json({ success: true, data, message: 'Precio manual creado' });
  })
);

export default router;
