/**
 * Configuración de Supabase
 * ========================
 * Este archivo configura la conexión a Supabase (PostgreSQL + Auth)
 * Usamos supabase-js como cliente oficial
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL y SUPABASE_ANON_KEY son requeridas en .env');
  process.exit(1);
}

/**
 * Cliente Supabase - Anon (para frontend)
 * Usa permisos de fila (RLS) para seguridad
 */
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Cliente Supabase - Service (para backend)
 * Tiene permisos elevados, usar con cuidado
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

export default supabaseClient;
