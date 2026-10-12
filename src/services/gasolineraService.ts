/**
 * Servicio de Gasolineras
 * ======================
 * Lógica de negocio para CRUD de gasolineras
 */
 
import { supabaseClient } from '../config/supabase';
import { Gasolinera } from '../models/types';
import { generateId, logger } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';
 
/**
 * Obtener todas las gasolineras (solo VERIFICADAS por defecto)
 */
export const obtenerGasolineras = async (ciudad?: string, incluirPendientes: boolean = false): Promise<Gasolinera[]> => {
  try {
    let query = supabaseClient
      .from('gasolineras')
      .select('*')
      .eq('activa', true);

    // Solo mostrar gasolineras verificadas, a menos que se pida incluir pendientes
    if (!incluirPendientes) {
      query = query.or(`estado.eq.VERIFICADA,estado.is.null`); // null para compatibilidad con registros antiguos
    }

    if (ciudad) {
      query = query.eq('ciudad', ciudad);
    }

    const { data, error } = await query;

    if (error) throw error;

    logger.debug(`Obtenidas ${data?.length || 0} gasolineras`);
    return data || [];
  } catch (error) {
    logger.error('Error al obtener gasolineras:', error);
    throw new AppError(500, 'Error al obtener gasolineras', 'DB_ERROR');
  }
};
 
/**
 * Obtener gasolinera por ID
 */
export const obtenerGasolineraById = async (id: string): Promise<Gasolinera> => {
  try {
    const { data, error } = await supabaseClient
      .from('gasolineras')
      .select('*')
      .eq('id', id)
      .single();
 
    if (error || !data) {
      throw new AppError(404, 'Gasolinera no encontrada', 'NOT_FOUND');
    }
 
    return data as Gasolinera;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error al obtener gasolinera:', error);
    throw new AppError(500, 'Error al obtener gasolinera', 'DB_ERROR');
  }
};
 
/**
 * Crear nueva gasolinera
 */
export const crearGasolinera = async (
  gasolinera: Omit<Gasolinera, 'id' | 'created_at' | 'updated_at'>
): Promise<Gasolinera> => {
  try {
    const id = generateId();
    const now = new Date().toISOString();
 
    const { data, error } = await supabaseClient
      .from('gasolineras')
      .insert({
        id,
        ...gasolinera,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
 
    if (error) throw error;
 
    logger.info(`Gasolinera creada: ${gasolinera.nombre} (${id})`);
    return data as Gasolinera;
  } catch (error) {
    logger.error('Error al crear gasolinera:', error);
    throw new AppError(500, 'Error al crear gasolinera', 'DB_ERROR');
  }
};
 
/**
 * Actualizar gasolinera
 */
export const actualizarGasolinera = async (
  id: string,
  updates: Partial<Gasolinera>
): Promise<Gasolinera> => {
  try {
    // Verificar que existe
    await obtenerGasolineraById(id);
 
    const { data, error } = await supabaseClient
      .from('gasolineras')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
 
    if (error) throw error;
 
    logger.info(`Gasolinera actualizada: ${id}`);
    return data as Gasolinera;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error al actualizar gasolinera:', error);
    throw new AppError(500, 'Error al actualizar gasolinera', 'DB_ERROR');
  }
};
 
/**
 * Obtener gasolineras cercanas (por radio en km)
 */
export const obtenerGasolinerasCercanas = async (
  latitud: number,
  longitud: number,
  radioKm: number = 5
): Promise<Gasolinera[]> => {
  try {
    const gasolineras = await obtenerGasolineras();
 
    // Filtrar por distancia (aproximado con SQL después)
    // Por ahora, retornar todas y filtrar en frontend
    return gasolineras.filter((g) => {
      const lat = g.ubicacion_gps.latitud;
      const lon = g.ubicacion_gps.longitud;
 
      // Distancia aproximada en km (fórmula simple)
      const dLat = lat - latitud;
      const dLon = lon - longitud;
      const distance = Math.sqrt(dLat * dLat + dLon * dLon) * 111; // aprox 111 km por grado
 
      return distance <= radioKm;
    });
  } catch (error) {
    logger.error('Error al obtener gasolineras cercanas:', error);
    throw error;
  }
};
 
/**
 * Crear gasolinera pendiente de verificación (desde reporte de usuario)
 */
export const crearGasolinerapendiente = async (
  gasolinera: Omit<Gasolinera, 'id' | 'created_at' | 'updated_at' | 'activa' | 'estado'>
): Promise<Gasolinera> => {
  try {
    const id = generateId();
    const now = new Date().toISOString();

    // Verificar que no exista gasolinera duplicada (mismo nombre + ciudad)
    const { data: existing } = await supabaseClient
      .from('gasolineras')
      .select('id')
      .eq('nombre', gasolinera.nombre)
      .eq('ciudad', gasolinera.ciudad)
      .single();

    if (existing) {
      throw new AppError(
        400,
        `Ya existe una gasolinera llamada "${gasolinera.nombre}" en ${gasolinera.ciudad}`,
        'DUPLICATE_GASOLINERA'
      );
    }

    const { data, error } = await supabaseClient
      .from('gasolineras')
      .insert({
        id,
        ...gasolinera,
        activa: true,
        estado: 'PENDIENTE_VERIFICACION', // Estado pendiente hasta aprobación admin
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Gasolinera pendiente creada: ${gasolinera.nombre} (${id})`);
    return data as Gasolinera;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error al crear gasolinera pendiente:', error);
    throw new AppError(500, 'Error al crear gasolinera', 'DB_ERROR');
  }
};

/**
 * Desactivar gasolinera (soft delete)
 */
export const desactivarGasolinera = async (id: string): Promise<void> => {
  try {
    await obtenerGasolineraById(id);

    const { error } = await supabaseClient
      .from('gasolineras')
      .update({
        activa: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    logger.info(`Gasolinera desactivada: ${id}`);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error al desactivar gasolinera:', error);
    throw new AppError(500, 'Error al desactivar gasolinera', 'DB_ERROR');
  }
};
 
