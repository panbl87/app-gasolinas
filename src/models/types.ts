/**
 * Tipos TypeScript para la app
 * ============================
 * Definiciones de tipos para gasolineras, precios, reportes, usuarios
 */

// ===== GASOLINERAS =====
export interface Gasolinera {
  id: string;
  nombre: string;
  marca: 'Primax' | 'Masgas' | 'Petrocomercial' | 'Otra';
  ubicacion_gps: {
    latitud: number;
    longitud: number;
  };
  direccion: string;
  ciudad: 'Quito' | 'Guayaquil' | 'Cuenca' | 'Otra';
  telefono?: string;
  horario_atencion?: string;
  activa: boolean;
  estado?: 'VERIFICADA' | 'PENDIENTE_VERIFICACION' | 'RECHAZADA'; // Estado de verificación por admin
  created_at: string;
  updated_at: string;
}

// ===== PRECIOS =====
export interface Precio {
  id: string;
  gasolinera_id: string;
  tipo_combustible: 'Extra' | 'Super' | 'Diesel' | 'Ecopaís';
  precio: number; // En dólares
  moneda: 'USD';
  reportado_por: string; // Usuario ID
  tiene_foto: boolean;
  foto_url?: string;
  es_verificado: boolean;
  verificaciones: number; // Cuántos usuarios confirmaron este precio
  created_at: string;
  updated_at: string;
}

// ===== REPORTES DE USUARIOS =====
export interface ReportePrecio {
  id: string;
  gasolinera_id: string;
  usuario_id: string;
  tipo_combustible: 'Extra' | 'Super' | 'Diesel' | 'Ecopaís';
  precio: number;
  foto_url?: string;
  ubicacion_gps: {
    latitud: number;
    longitud: number;
  };
  timestamp: string;
  confianza: number; // 0-100, basado en rating del usuario
}

// ===== USUARIOS =====
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  foto_perfil?: string;
  reportes_totales: number;
  verificaciones_totales: number;
  rating: number; // 0-5 estrellas
  puntos: number; // Para gamificación
  badges: string[]; // Array de badges ganados
  created_at: string;
  updated_at: string;
}

// ===== RESPUESTAS DE API =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
