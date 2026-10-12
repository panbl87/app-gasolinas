/**
 * Servicio de Geocoding
 * ====================
 * Convierte direcciones a coordenadas GPS usando Google Geocoding API
 */

import axios from 'axios'
import { AppError } from '../middleware/errorHandler'
import { logger } from '../utils/helpers'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

/**
 * Buscar coordenadas de una dirección
 */
export const buscarCoordenadas = async (direccion: string, ciudad: string = 'Quito', pais: string = 'Ecuador'): Promise<{
  latitud: number
  longitud: number
  direccion_completa: string
}> => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new AppError(500, 'API Key de Google Maps no configurada', 'CONFIG_ERROR')
    }

    if (!direccion.trim()) {
      throw new AppError(400, 'La dirección no puede estar vacía', 'INVALID_INPUT')
    }

    // Construir la dirección completa para mejor precisión
    const direccionCompleta = `${direccion}, ${ciudad}, ${pais}`

    const response = await axios.get(GOOGLE_GEOCODING_URL, {
      params: {
        address: direccionCompleta,
        key: GOOGLE_MAPS_API_KEY
      }
    })

    if (response.data.status === 'ZERO_RESULTS') {
      throw new AppError(404, `No se encontró la dirección: ${direccion}`, 'NOT_FOUND')
    }

    if (response.data.status !== 'OK') {
      logger.warn(`Geocoding error: ${response.data.status}`)
      throw new AppError(
        400,
        'No se pudo procesar la búsqueda de dirección. Intenta ser más específico.',
        'GEOCODING_ERROR'
      )
    }

    const resultado = response.data.results[0]
    if (!resultado) {
      throw new AppError(404, 'No se encontraron resultados', 'NOT_FOUND')
    }

    const { lat, lng } = resultado.geometry.location
    const direccionCompleta_resultado = resultado.formatted_address

    logger.info(`Geocoding exitoso: ${direccionCompleta} → (${lat}, ${lng})`)

    return {
      latitud: lat,
      longitud: lng,
      direccion_completa: direccionCompleta_resultado
    }
  } catch (error) {
    if (error instanceof AppError) throw error

    logger.error('Error en geocoding:', error)
    throw new AppError(500, 'Error al buscar coordenadas', 'GEOCODING_ERROR')
  }
}
