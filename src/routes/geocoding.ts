/**
 * Rutas de Geocoding
 * =================
 * POST   /api/geocoding/search   - Buscar coordenadas de una dirección
 */

import { Router, Request, Response } from 'express'
import { buscarCoordenadas } from '../services/geocodingService'
import { asyncHandler, AppError } from '../middleware/errorHandler'

const router = Router()

/**
 * POST /api/geocoding/search
 * Buscar coordenadas de una dirección
 * Body: { direccion, ciudad? (default: Quito) }
 */
router.post(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const { direccion, ciudad = 'Quito' } = req.body

    if (!direccion) {
      throw new AppError(400, 'La dirección es requerida', 'MISSING_FIELD')
    }

    const resultado = await buscarCoordenadas(direccion, ciudad)

    res.json({
      success: true,
      data: resultado,
      message: 'Geocoding exitoso'
    })
  })
)

export default router
