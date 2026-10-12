/**
 * Funciones de Utilidad
 * ====================
 * Helpers reutilizables para toda la app
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generar un UUID
 */
export const generateId = (): string => uuidv4();

/**
 * Calcular distancia entre dos puntos GPS (Fórmula de Haversine)
 * @param lat1 Latitud del punto 1
 * @param lon1 Longitud del punto 1
 * @param lat2 Latitud del punto 2
 * @param lon2 Longitud del punto 2
 * @returns Distancia en km
 */
export const calcularDistancia = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Obtener timestamp ISO actual
 */
export const getCurrentTimestamp = (): string => new Date().toISOString();

/**
 * Validar coordenadas GPS
 */
export const validarCoordenadas = (lat: number, lon: number): boolean => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

/**
 * Formatear precio a 2 decimales
 */
export const formatearPrecio = (precio: number): number => {
  return Math.round(precio * 100) / 100;
};

/**
 * Validar email
 */
export const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitizar entrada de usuario (básico)
 */
export const sanitizar = (input: string): string => {
  return input.trim().substring(0, 255);
};

/**
 * Logger simple (puedes reemplazar con winston/pino después)
 */
export const logger = {
  info: (mensaje: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${mensaje}`, data || '');
  },
  error: (mensaje: string, data?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${mensaje}`, data || '');
  },
  warn: (mensaje: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${mensaje}`, data || '');
  },
  debug: (mensaje: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${mensaje}`, data || '');
    }
  },
};
