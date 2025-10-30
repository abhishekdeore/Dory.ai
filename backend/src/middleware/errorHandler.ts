import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * Global error handling middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id
  });

  // Don't expose internal errors in production
  const isDevelopment = config.server.nodeEnv === 'development';

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? error.message : undefined,
    stack: isDevelopment ? error.stack : undefined
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
  req: Request,
  res: Response
): void {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.url
  });
}
