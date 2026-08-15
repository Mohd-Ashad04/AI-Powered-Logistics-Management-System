/**
 * @Mohd Ashad
 * 2026-08-12
 * Custom AppError for consistent error handling
 * this looks like it is written in production grade form
 */

class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
