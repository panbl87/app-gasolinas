/**
 * Middleware de Manejo de Errores
 * ==============================
 * Captura y formatea errores para respuestas consistentes
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/helpers';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

/**
 * Clase personalizada para errores de API
 */
export class AppError extends Error {
  constructor(
    public statusCode: number = 500,
    public message: string = 'Error interno del servidor',
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de manejo de errores (debe ser el último)
 */
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let code = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err instanceof Error) {
    message = err.message;
    logger.error('Error no manejado:', err);
  }

  // Log del error
  logger.error(`[${req.method}] ${req.path}`, {
    statusCode,
    message,
    code,
    url: req.originalUrl,
  });

  // Respuesta
  res.status(statusCode).json({
    success: false,
    error: code,
    message: message,
  });
};

/**
 * Middleware para rutas no encontradas
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `La ruta ${req.method} ${req.path} no existe`,
  });
};

/**
 * Wrapper para async routes (maneja excepciones automáticamente)
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
