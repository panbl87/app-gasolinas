/**
 * Rutas de Administración
 * =======================
 * Todas requieren header: X-Admin-Token: <ADMIN_TOKEN>  (o Authorization: Bearer <ADMIN_TOKEN>)
 *
 * GET    /api/admin/reportes/pendientes      - Reportes sin verificar (?tipo=Super&limit=50)
 * GET    /api/admin/reportes                 - Reportes por estado (?estado=PENDIENTE|VALIDADO&tipo=&limit=)
 *                                              Con estado=VALIDADO incluye stats: { hoy, semana }
 * POST   /api/admin/reportes/:id/validar     - Validar reporte (marca como verificado)
 * POST   /api/admin/reportes/:id/rechazar    - Rechazar reporte (body: { razon }) — lo elimina
 * POST   /api/admin/reportes/crear-manual    - Crear precio manual ya verificado
 *                                              (body: { gasolinera_id, tipo_combustible?, precio })
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

// Ecuador continental: UTC-5 todo el año (sin horario de verano)
const ECUADOR_OFFSET_MS = -5 * 60 * 60 * 1000;

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
 * Inicio del día y de la semana (lunes) en hora de Ecuador, como ISO UTC
 */
const inicioHoyYSemana = () => {
  const ahoraEc = new Date(Date.now() + ECUADOR_OFFSET_MS);
  const hoyEc = Date.UTC(ahoraEc.getUTCFullYear(), ahoraEc.getUTCMonth(), ahoraEc.getUTCDate());
  const diasDesdeLunes = (ahoraEc.getUTCDay() + 6) % 7;
  const semanaEc = hoyEc - diasDesdeLunes * 24 * 60 * 60 * 1000;

  return {
    hoy: new Date(hoyEc - ECUADOR_OFFSET_MS).toISOString(),
    semana: new Date(semanaEc - ECUADOR_OFFSET_MS).toISOString(),
  };
};

/**
 * Contar reportes validados desde una fecha (usa updated_at como fecha de validación)
 */
const contarValidadosDesde = async (desde: string): Promise<number> => {
  const { count, error } = await supabaseAdmin
    .from('precios')
    .select('id', { count: 'exact', head: true })
    .eq('es_verificado', true)
    .gte('updated_at', desde);

  if (error) {
    logger.error('Error al contar validados:', error);
    throw new AppError(500, 'Error al obtener estadísticas', 'DB_ERROR');
  }
  return count || 0;
};

/**
 * Listar reportes por estado de verificación
 */
const listarReportes = async (verificado: boolean, tipo: string | undefined, limitParam: unknown) => {
  const limit = Math.min(parseInt(limitParam as string) || 50, 200);

  if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
    throw new AppError(400, 'Tipo de combustible inválido', 'INVALID_FUEL_TYPE');
  }

  let query = supabaseAdmin
    .from('precios')
    .select('*, gasolineras(nombre, marca, ciudad, direccion)')
    .eq('es_verificado', verificado)
    .order(verificado ? 'updated_at' : 'created_at', { ascending: false })
    .limit(limit);

  if (tipo) query = query.eq('tipo_combustible', tipo);

  const { data, error } = await query;
  if (error) {
    logger.error('Error al listar reportes:', error);
    throw new AppError(500, 'Error al obtener reportes', 'DB_ERROR');
  }
  return data || [];
};

/**
 * GET /api/admin/reportes/pendientes
 * Listar reportes de precios aún no verificados (más recientes primero)
 */
router.get(
  '/reportes/pendientes',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await listarReportes(false, req.query.tipo as string | undefined, req.query.limit);
    res.json({ success: true, data, total: data.length });
  })
);

/**
 * GET /api/admin/reportes?estado=PENDIENTE|VALIDADO
 * Listar reportes por estado. Con VALIDADO devuelve también cuántos se validaron hoy y esta semana.
 */
router.get(
  '/reportes',
  asyncHandler(async (req: Request, res: Response) => {
    const estado = ((req.query.estado as string) || 'PENDIENTE').toUpperCase();
    if (estado !== 'PENDIENTE' && estado !== 'VALIDADO') {
      throw new AppError(400, 'estado debe ser PENDIENTE o VALIDADO', 'INVALID_STATE');
    }

    const verificado = estado === 'VALIDADO';
    const data = await listarReportes(verificado, req.query.tipo as string | undefined, req.query.limit);

    if (!verificado) {
      res.json({ success: true, data, total: data.length });
      return;
    }

    const desde = inicioHoyYSemana();
    const [hoy, semana] = await Promise.all([
      contarValidadosDesde(desde.hoy),
      contarValidadosDesde(desde.semana),
    ]);

    res.json({ success: true, data, total: data.length, stats: { hoy, semana } });
  })
);

/**
 * POST /api/admin/reportes/:id/validar
 * Validar un reporte manualmente
 */
router.post(
  '/reportes/:id/validar',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('precios')
      .update({ es_verificado: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error('Error al validar reporte:', error);
      throw new AppError(500, 'Error al validar reporte', 'DB_ERROR');
    }
    if (!data) throw new AppError(404, 'Reporte no encontrado', 'NOT_FOUND');

    logger.info(`[ADMIN] Reporte validado: ${id}`);

    res.json({ success: true, data, message: 'Reporte validado' });
  })
);

/**
 * POST /api/admin/reportes/:id/rechazar
 * Rechazar un reporte (se elimina). Body: { razon }
 * La razón se guarda en la tabla auditoria si existe; si no, queda en el log.
 */
router.post(
  '/reportes/:id/rechazar',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const razon = typeof req.body.razon === 'string' ? req.body.razon.trim() : '';

    if (!razon) {
      throw new AppError(400, 'Falta la razón del rechazo', 'MISSING_FIELDS');
    }

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

    const { error: auditError } = await supabaseAdmin.from('auditoria').insert({
      tabla: 'precios',
      operacion: 'DELETE',
      registro_id: id,
      datos_anteriores: data,
      datos_nuevos: { motivo: 'RECHAZADO_ADMIN', razon },
      usuario_id: ADMIN_USER_ID,
    });
    if (auditError) {
      logger.warn('No se pudo registrar el rechazo en auditoria:', auditError);
    }

    logger.info(`[ADMIN] Reporte rechazado y eliminado: ${id} — razón: ${razon}`);

    res.json({ success: true, message: 'Reporte rechazado' });
  })
);

/**
 * POST /api/admin/reportes/crear-manual
 * Crear un precio manual ya verificado
 * Body: { gasolinera_id, tipo_combustible?, precio }   (tipo_combustible por defecto: Super)
 */
router.post(
  '/reportes/crear-manual',
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
