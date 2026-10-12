/**
 * Rutas de Precios
 * ================
 * GET    /api/precios/gasolinera/:id      - Obtener precios de una gasolinera
 * POST   /api/precios/reportar            - Reportar nuevo precio
 * PUT    /api/precios/:id/verificar       - Verificar precio
 * PUT    /api/precios/:id/incorrecto      - Marcar precio como incorrecto
 * GET    /api/precios/promedio/:ciudad    - Obtener promedio de precios por ciudad
 */

import { Router, Request, Response } from 'express';
import {
  obtenerPreciosGasolinera,
  reportarPrecio,
  verificarPrecio,
  marcarPrecioIncorrecto,
  obtenerPromedioPreciosCiudad,
} from '../services/precioService';
import { incrementarReportes } from '../services/usuarioService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger, validarCoordenadas } from '../utils/helpers';

const router = Router();

/**
 * GET /api/precios/gasolinera/:id
 * Obtener todos los precios actuales de una gasolinera
 */
router.get(
  '/gasolinera/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const precios = await obtenerPreciosGasolinera(id);

    res.json({
      success: true,
      data: precios,
      total: precios.length,
    });
  })
);

/**
 * POST /api/precios/reportar
 * Reportar un nuevo precio (desde usuario)
 * Body: { gasolinera_id, tipo_combustible, precio, usuario_id? (opcional), foto_url?, ubicacion_gps? }
 * FASE 1: usuario_id es opcional para permitir reportes anónimos
 */
router.post(
  '/reportar',
  asyncHandler(async (req: Request, res: Response) => {
    const { gasolinera_id, usuario_id, tipo_combustible, precio, foto_url, ubicacion_gps } = req.body;

    // Validar campos requeridos (usuario_id es OPCIONAL)
    if (!gasolinera_id || !tipo_combustible || precio === undefined) {
      throw new AppError(
        400,
        'Faltan campos: gasolinera_id, tipo_combustible, precio',
        'MISSING_FIELDS'
      );
    }

    // Validar que sea un tipo de combustible válido
    const tiposValidos = ['Extra', 'Super', 'Diesel', 'Ecopaís'];
    if (!tiposValidos.includes(tipo_combustible)) {
      throw new AppError(400, 'Tipo de combustible inválido', 'INVALID_FUEL_TYPE');
    }

    // Validar precio según tipo de combustible (rangos reales Ecuador)
    const rangosPrecio: Record<string, [number, number]> = {
      'Extra': [2.50, 4.00],
      'Super': [4.00, 5.50],
      'Diesel': [2.50, 4.00],
      'Ecopaís': [3.50, 5.00]
    };

    const [precioMin, precioMax] = rangosPrecio[tipo_combustible] || [2.50, 5.50];

    if (typeof precio !== 'number' || precio < precioMin || precio > precioMax) {
      throw new AppError(
        400,
        `Precio de ${tipo_combustible} debe estar entre $${precioMin} y $${precioMax}`,
        'INVALID_PRICE'
      );
    }

    // Validar coordenadas si se proporcionan
    if (ubicacion_gps) {
      const { latitud, longitud } = ubicacion_gps;
      if (!validarCoordenadas(latitud, longitud)) {
        throw new AppError(400, 'Coordenadas GPS inválidas', 'INVALID_COORDS');
      }
    }

    // Crear reporte (usuario_id puede ser null para reportes anónimos)
    const reporte = await reportarPrecio({
      id: '', // Se genera en el servicio
      gasolinera_id,
      usuario_id: usuario_id || null, // Permitir null en FASE 1
      tipo_combustible,
      precio,
      foto_url,
      ubicacion_gps: ubicacion_gps || { latitud: 0, longitud: 0 },
      timestamp: new Date().toISOString(),
      confianza: 50, // Confianza inicial
    });

    // Incrementar contador de reportes del usuario solo si está autenticado
    if (usuario_id) {
      await incrementarReportes(usuario_id);
    }

    res.status(201).json({
      success: true,
      data: reporte,
      message: 'Precio reportado exitosamente. ¡Gracias por contribuir!',
    });
  })
);

/**
 * PUT /api/precios/:id/verificar
 * Verificar que un precio es correcto
 */
router.put(
  '/:id/verificar',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const precioActualizado = await verificarPrecio(id);

    res.json({
      success: true,
      data: precioActualizado,
      message: 'Precio verificado',
    });
  })
);

/**
 * PUT /api/precios/:id/incorrecto
 * Marcar un precio como incorrecto
 */
router.put(
  '/:id/incorrecto',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await marcarPrecioIncorrecto(id);

    res.json({
      success: true,
      message: 'Precio marcado como incorrecto',
    });
  })
);

/**
 * GET /api/precios/promedio/:ciudad
 * Obtener precio promedio por tipo de combustible en una ciudad
 */
router.get(
  '/promedio/:ciudad',
  asyncHandler(async (req: Request, res: Response) => {
    const { ciudad } = req.params;

    const promedios = await obtenerPromedioPreciosCiudad(ciudad);

    if (!promedios) {
      logger.warn(`No se encontraron promedios para ${ciudad}`);
      res.json({
        success: true,
        data: null,
        message: 'No hay suficientes datos para calcular promedios',
      });
      return;
    }

    res.json({
      success: true,
      data: promedios,
      ciudad,
    });
  })
);

export default router;
