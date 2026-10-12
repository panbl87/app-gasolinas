/**
 * Servidor Principal - App Gasolinas Ecuador
 * ==========================================
 * Inicializa Express, conecta Supabase, y monta las rutas
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Importar configuración
dotenv.config();

import { logger } from './utils/helpers';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Importar rutas
import gasolinerasRoutes from './routes/gasolineras';
import preciosRoutes from './routes/precios';
import usuariosRoutes from './routes/usuarios';
import geocodingRoutes from './routes/geocoding';
import adminRoutes from './routes/admin';

// ===== CONFIGURACIÓN =====
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ===== INICIALIZAR EXPRESS =====
const app = express();

// ===== MIDDLEWARE GLOBAL =====
app.use(helmet()); // Seguridad básica

// Configurar CORS para permitir acceso desde cualquier origen en desarrollo
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir sin origin (como Postman, mobile apps)
    if (!origin) return callback(null, true);

    // En desarrollo, permitir todos los orígenes
    if (NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // En producción, validar contra CORS_ORIGIN
      const allowedOrigins = CORS_ORIGIN.split(',').map((o) => o.trim());
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limitar tamaño de uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ===== LOGGING DE REQUESTS =====
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, { query: req.query });
  next();
});

// ===== RUTAS DE SALUD =====
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// ===== RUTAS API =====
/**
 * Documentación de endpoints:
 *
 * GASOLINERAS:
 *   GET    /api/gasolineras                - Obtener todas
 *   GET    /api/gasolineras/:id            - Obtener por ID
 *   GET    /api/gasolineras/cercanas       - Gasolineras cercanas
 *   POST   /api/gasolineras                - Crear
 *   PUT    /api/gasolineras/:id            - Actualizar
 *   DELETE /api/gasolineras/:id            - Desactivar
 *
 * PRECIOS:
 *   GET    /api/precios/gasolinera/:id     - Precios de gasolinera
 *   POST   /api/precios/reportar           - Reportar precio
 *   PUT    /api/precios/:id/verificar      - Verificar
 *   PUT    /api/precios/:id/incorrecto     - Marcar incorrecto
 *   GET    /api/precios/promedio/:ciudad   - Promedio por ciudad
 *
 * USUARIOS:
 *   GET    /api/usuarios                   - Ranking
 *   GET    /api/usuarios/:id               - Perfil
 *   POST   /api/usuarios                   - Crear
 *   PUT    /api/usuarios/:id/puntos        - Agregar puntos
 *   PUT    /api/usuarios/:id/badge         - Otorgar badge
 *   GET    /api/usuarios/:id/badges        - Obtener badges
 *   PUT    /api/usuarios/:id/rating        - Actualizar rating
 *
 * ADMIN (requiere Authorization: Bearer <ADMIN_TOKEN>):
 *   GET    /api/admin/reportes/pendientes   - Reportes sin verificar
 *   PUT    /api/admin/reportes/:id/aprobar  - Validar reporte
 *   PUT    /api/admin/reportes/:id/rechazar - Rechazar reporte
 *   POST   /api/admin/precios/manual        - Crear precio manual
 */

app.use('/api/gasolineras', gasolinerasRoutes);
app.use('/api/precios', preciosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/admin', adminRoutes);

// ===== RUTAS NO ENCONTRADAS =====
app.use(notFoundHandler);

// ===== MANEJO DE ERRORES (debe ser el último) =====
app.use(errorHandler);

// ===== INICIAR SERVIDOR =====
app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(
    `
    ╔════════════════════════════════════════╗
    ║   APP GASOLINAS ECUADOR - BACKEND      ║
    ╠════════════════════════════════════════╣
    ║ 🚀 Servidor corriendo en puerto ${PORT}       ║
    ║ 🌍 Ambiente: ${NODE_ENV.toUpperCase().padEnd(28)} ║
    ║ 🖥️  Local: http://localhost:${PORT}        ║
    ║ 📱 Red: http://192.168.10.133:${PORT}       ║
    ║ 💚 Health: http://localhost:${PORT}/health   ║
    ╚════════════════════════════════════════╝
    `
  );
});

export default app;
