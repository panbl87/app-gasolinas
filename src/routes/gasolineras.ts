/**
 * Rutas de Gasolineras
 * ===================
 * GET    /api/gasolineras                      - Obtener todas las gasolineras
 * GET    /api/gasolineras/:id                  - Obtener gasolinera por ID
 * GET    /api/gasolineras/cercanas             - Obtener gasolineras cercanas
 * POST   /api/gasolineras                      - Crear nueva gasolinera (admin)
 * POST   /api/gasolineras/crear-pendiente      - Crear gasolinera pendiente (usuario)
 * PUT    /api/gasolineras/:id                  - Actualizar gasolinera (admin)
 * DELETE /api/gasolineras/:id                  - Desactivar gasolinera (admin)
 */

import { Router, Request, Response } from 'express';
import {
  obtenerGasolineras,
  obtenerGasolineraById,
  crearGasolinera,
  crearGasolinerapendiente,
  actualizarGasolinera,
  desactivarGasolinera,
  obtenerGasolinerasCercanas,
} from '../services/gasolineraService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { validarCoordenadas, logger } from '../utils/helpers';

const router = Router();

/**
 * GET /api/gasolineras
 * Obtener todas las gasolineras (opcionalmente filtrar por ciudad)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const ciudad = req.query.ciudad as string | undefined;

    const gasolineras = await obtenerGasolineras(ciudad);

    res.json({
      success: true,
      data: gasolineras,
      total: gasolineras.length,
    });
  })
);

/**
 * GET /api/gasolineras/cercanas
 * Obtener gasolineras cercanas a una ubicación
 * Query params: lat, lon, radio (en km)
 */
router.get(
  '/cercanas',
  asyncHandler(async (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const radio = parseInt(req.query.radio as string) || 5;

    if (isNaN(lat) || isNaN(lon)) {
      throw new AppError(400, 'Parámetros lat y lon requeridos', 'INVALID_PARAMS');
    }

    if (!validarCoordenadas(lat, lon)) {
      throw new AppError(400, 'Coordenadas GPS inválidas', 'INVALID_COORDS');
    }

    const cercanas = await obtenerGasolinerasCercanas(lat, lon, radio);

    res.json({
      success: true,
      data: cercanas,
      total: cercanas.length,
      parametros: { lat, lon, radio_km: radio },
    });
  })
);

/**
 * GET /api/gasolineras/:id
 * Obtener gasolinera específica
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const gasolinera = await obtenerGasolineraById(id);

    res.json({
      success: true,
      data: gasolinera,
    });
  })
);

/**
 * POST /api/gasolineras
 * Crear nueva gasolinera (requiere autenticación admin)
 * Body: { nombre, marca, ubicacion_gps, direccion, ciudad, telefono?, horario_atencion? }
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { nombre, marca, ubicacion_gps, direccion, ciudad, telefono, horario_atencion } = req.body;

    // Validar datos requeridos
    if (!nombre || !marca || !ubicacion_gps || !direccion || !ciudad) {
      throw new AppError(
        400,
        'Faltan campos requeridos: nombre, marca, ubicacion_gps, direccion, ciudad',
        'MISSING_FIELDS'
      );
    }

    // Validar coordenadas
    const { latitud, longitud } = ubicacion_gps;
    if (!validarCoordenadas(latitud, longitud)) {
      throw new AppError(400, 'Coordenadas GPS inválidas', 'INVALID_COORDS');
    }

    const gasolinera = await crearGasolinera({
      nombre,
      marca,
      ubicacion_gps,
      direccion,
      ciudad,
      telefono,
      horario_atencion,
      activa: true,
    });

    res.status(201).json({
      success: true,
      data: gasolinera,
      message: 'Gasolinera creada exitosamente',
    });
  })
);

/**
 * POST /api/gasolineras/crear-pendiente
 * Crear gasolinera pendiente de verificación (desde reporte de usuario)
 * Body: { nombre, marca, ubicacion_gps, direccion, ciudad }
 * La gasolinera se crea con estado PENDIENTE_VERIFICACION
 */
router.post(
  '/crear-pendiente',
  asyncHandler(async (req: Request, res: Response) => {
    const { nombre, marca, ubicacion_gps, direccion, ciudad } = req.body;

    // Validar datos requeridos
    if (!nombre || !marca || !ubicacion_gps || !direccion || !ciudad) {
      throw new AppError(
        400,
        'Faltan campos requeridos: nombre, marca, ubicacion_gps, direccion, ciudad',
        'MISSING_FIELDS'
      );
    }

    // Validar marca
    const marcasValidas = ['Primax', 'Masgas', 'Petrocomercial', 'Otra'];
    if (!marcasValidas.includes(marca)) {
      throw new AppError(400, 'Marca de gasolinera inválida', 'INVALID_MARCA');
    }

    // Validar ciudad
    const ciudadesValidas = ['Quito', 'Guayaquil', 'Cuenca', 'Otra'];
    if (!ciudadesValidas.includes(ciudad)) {
      throw new AppError(400, 'Ciudad inválida', 'INVALID_CIUDAD');
    }

    // Validar coordenadas
    const { latitud, longitud } = ubicacion_gps;
    if (!validarCoordenadas(latitud, longitud)) {
      throw new AppError(400, 'Coordenadas GPS inválidas', 'INVALID_COORDS');
    }

    // Crear gasolinera pendiente
    const gasolinera = await crearGasolinerapendiente({
      nombre,
      marca,
      ubicacion_gps,
      direccion,
      ciudad,
    });

    res.status(201).json({
      success: true,
      data: gasolinera,
      message: 'Gasolinera creada. Pendiente verificación del administrador.',
    });
  })
);

/**
 * PUT /api/gasolineras/:id
 * Actualizar gasolinera (requiere autenticación admin)
 */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const gasolinera = await actualizarGasolinera(id, updates);

    res.json({
      success: true,
      data: gasolinera,
      message: 'Gasolinera actualizada exitosamente',
    });
  })
);

/**
 * DELETE /api/gasolineras/:id
 * Desactivar gasolinera (soft delete)
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await desactivarGasolinera(id);

    res.json({
      success: true,
      message: 'Gasolinera desactivada exitosamente',
    });
  })
);

export default router;
