/**
 * Servicio de Usuarios
 * ===================
 * Gestión de perfiles, gamificación, badges
 */

import { supabaseClient } from '../config/supabase';
import { Usuario } from '../models/types';
import { generateId, logger } from '../utils/helpers';
import { AppError } from '../middleware/errorHandler';

/**
 * Crear nuevo usuario
 */
export const crearUsuario = async (email: string, nombre: string): Promise<Usuario> => {
  try {
    const id = generateId();
    const now = new Date().toISOString();

    const { data, error } = await supabaseClient
      .from('usuarios')
      .insert({
        id,
        email,
        nombre,
        reportes_totales: 0,
        verificaciones_totales: 0,
        rating: 5, // Comienza con rating alto
        puntos: 0,
        badges: [],
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Usuario creado: ${email} (${id})`);
    return data as Usuario;
  } catch (error) {
    logger.error('Error al crear usuario:', error);
    throw new AppError(500, 'Error al crear usuario', 'DB_ERROR');
  }
};

/**
 * Obtener usuario por ID
 */
export const obtenerUsuarioById = async (id: string): Promise<Usuario> => {
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new AppError(404, 'Usuario no encontrado', 'NOT_FOUND');
    }

    return data as Usuario;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error al obtener usuario:', error);
    throw new AppError(500, 'Error al obtener usuario', 'DB_ERROR');
  }
};

/**
 * Obtener usuario por email
 */
export const obtenerUsuarioByEmail = async (email: string): Promise<Usuario | null> => {
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error al buscar usuario por email:', error);
      throw error;
    }

    return data as Usuario | null;
  } catch (error) {
    logger.error('Error en obtenerUsuarioByEmail:', error);
    return null;
  }
};

/**
 * Incrementar contador de reportes del usuario
 */
export const incrementarReportes = async (usuarioId: string): Promise<void> => {
  try {
    const usuario = await obtenerUsuarioById(usuarioId);

    await supabaseClient
      .from('usuarios')
      .update({
        reportes_totales: usuario.reportes_totales + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', usuarioId);

    logger.debug(`Reportes incrementados para ${usuarioId}`);
  } catch (error) {
    logger.error('Error al incrementar reportes:', error);
  }
};

/**
 * Agregar puntos al usuario (gamificación)
 */
export const agregarPuntos = async (usuarioId: string, puntos: number): Promise<number> => {
  try {
    const usuario = await obtenerUsuarioById(usuarioId);
    const nuevosPuntos = usuario.puntos + puntos;

    const { data, error } = await supabaseClient
      .from('usuarios')
      .update({
        puntos: nuevosPuntos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', usuarioId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Puntos agregados a ${usuarioId}: +${puntos} (total: ${nuevosPuntos})`);
    return nuevosPuntos;
  } catch (error) {
    logger.error('Error al agregar puntos:', error);
    throw new AppError(500, 'Error al agregar puntos', 'DB_ERROR');
  }
};

/**
 * Otorgar badge al usuario
 */
export const otorgarBadge = async (usuarioId: string, badge: string): Promise<string[]> => {
  try {
    const usuario = await obtenerUsuarioById(usuarioId);

    // Evitar duplicados
    if (usuario.badges.includes(badge)) {
      return usuario.badges;
    }

    const nuevosBadges = [...usuario.badges, badge];

    const { data, error } = await supabaseClient
      .from('usuarios')
      .update({
        badges: nuevosBadges,
        updated_at: new Date().toISOString(),
      })
      .eq('id', usuarioId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Badge otorgado a ${usuarioId}: ${badge}`);
    return nuevosBadges;
  } catch (error) {
    logger.error('Error al otorgar badge:', error);
    throw new AppError(500, 'Error al otorgar badge', 'DB_ERROR');
  }
};

/**
 * Actualizar rating del usuario (por comentarios/validaciones)
 */
export const actualizarRating = async (usuarioId: string, nuevoRating: number): Promise<number> => {
  try {
    // Validar que esté entre 1 y 5
    const ratingValidado = Math.max(1, Math.min(5, nuevoRating));

    const { data, error } = await supabaseClient
      .from('usuarios')
      .update({
        rating: ratingValidado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', usuarioId)
      .select()
      .single();

    if (error) throw error;

    logger.info(`Rating actualizado para ${usuarioId}: ${ratingValidado} estrellas`);
    return ratingValidado;
  } catch (error) {
    logger.error('Error al actualizar rating:', error);
    throw new AppError(500, 'Error al actualizar rating', 'DB_ERROR');
  }
};

/**
 * Obtener ranking de usuarios (top reporters)
 */
export const obtenerRanking = async (limite: number = 10): Promise<Usuario[]> => {
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .order('reportes_totales', { ascending: false })
      .limit(limite);

    if (error) throw error;

    return data as Usuario[];
  } catch (error) {
    logger.error('Error al obtener ranking:', error);
    throw new AppError(500, 'Error al obtener ranking', 'DB_ERROR');
  }
};
