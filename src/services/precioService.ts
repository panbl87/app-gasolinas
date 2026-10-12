/**
 * Servicio de Precios
 * ==================
 * Lógica de negocio para gestionar precios de combustible
 */

import { supabaseClient } from '../config/supabase';
import { Precio, ReportePrecio } from '../models/types';
import { generateId, formatearPrecio, logger } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

/**
 * Obtener último precio por tipo combustible y gasolinera
 */
export const obtenerUltimoPrecio = async (
  gasolineraId: string,
  tipoCombustible: string
): Promise<Precio | null> => {
  try {
    const { data, error } = await supabaseClient
      .from('precios')
      .select('*')
      .eq('gasolinera_id', gasolineraId)
      .eq('tipo_combustible', tipoCombustible)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      logger.error('Error al obtener precio:', error);
      throw error;
    }

    return data as Precio | null;
  } catch (error) {
    logger.error('Error en obtenerUltimoPrecio:', error);
    return null;
  }
};

/**
 * Obtener todos los precios de una gasolinera
 */
export const obtenerPreciosGasolinera = async (gasolineraId: string): Promise<Precio[]> => {
  try {
    // Obtener el precio más reciente para cada tipo de combustible
    const tipos = ['Extra', 'Super', 'Diesel', 'Ecopaís'];
    const precios: Precio[] = [];

    for (const tipo of tipos) {
      const precio = await obtenerUltimoPrecio(gasolineraId, tipo);
      if (precio) {
        precios.push(precio);
      }
    }

    return precios;
  } catch (error) {
    logger.error('Error al obtener precios de gasolinera:', error);
    throw new AppError(500, 'Error al obtener precios', 'DB_ERROR');
  }
};

/**
 * Reportar nuevo precio (usuario)
 */
export const reportarPrecio = async (reporte: ReportePrecio): Promise<Precio> => {
  try {
    const id = generateId();
    const now = new Date().toISOString();

    // Crear reporte
    const { data, error } = await supabaseClient
      .from('precios')
      .insert({
        id,
        gasolinera_id: reporte.gasolinera_id,
        tipo_combustible: reporte.tipo_combustible,
        precio: formatearPrecio(reporte.precio),
        moneda: 'USD',
        reportado_por: reporte.usuario_id,
        tiene_foto: !!reporte.foto_url,
        foto_url: reporte.foto_url,
        es_verificado: false,
        verificaciones: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Precio reportado: ${reporte.gasolinera_id} - ${reporte.tipo_combustible} - $${reporte.precio}`);

    return data as Precio;
  } catch (error) {
    logger.error('Error al reportar precio:', error);
    throw new AppError(500, 'Error al reportar precio', 'DB_ERROR');
  }
};

/**
 * Verificar precio (usuario confirma que es correcto)
 */
export const verificarPrecio = async (precioId: string): Promise<Precio> => {
  try {
    const { data: precioActual, error: getError } = await supabaseClient
      .from('precios')
      .select('verificaciones')
      .eq('id', precioId)
      .single();

    if (getError) throw getError;

    const nuevasVerificaciones = (precioActual?.verificaciones || 0) + 1;
    const esVerificado = nuevasVerificaciones >= 2; // Con 2 verificaciones, es válido

    const { data, error: updateError } = await supabaseClient
      .from('precios')
      .update({
        verificaciones: nuevasVerificaciones,
        es_verificado: esVerificado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', precioId)
      .select()
      .single();

    if (updateError) throw updateError;

    logger.info(`Precio verificado: ${precioId} (${nuevasVerificaciones} verificaciones)`);

    return data as Precio;
  } catch (error) {
    logger.error('Error al verificar precio:', error);
    throw new AppError(500, 'Error al verificar precio', 'DB_ERROR');
  }
};

/**
 * Obtener precio promedio por tipo de combustible en una ciudad
 */
export const obtenerPromedioPreciosCiudad = async (ciudad: string) => {
  try {
    const { data, error } = await supabaseClient.rpc('promedios_precios_ciudad', {
      ciudad_param: ciudad,
    });

    if (error) {
      logger.warn('RPC no disponible, usando cálculo alternativo');
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error al obtener promedio de precios:', error);
    return null;
  }
};

/**
 * Marcar precio como incorrecto
 */
export const marcarPrecioIncorrecto = async (precioId: string): Promise<void> => {
  try {
    const { error } = await supabaseClient
      .from('precios')
      .update({
        es_verificado: false,
        verificaciones: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', precioId);

    if (error) throw error;

    logger.info(`Precio marcado como incorrecto: ${precioId}`);
  } catch (error) {
    logger.error('Error al marcar precio incorrecto:', error);
    throw new AppError(500, 'Error al marcar precio como incorrecto', 'DB_ERROR');
  }
};
