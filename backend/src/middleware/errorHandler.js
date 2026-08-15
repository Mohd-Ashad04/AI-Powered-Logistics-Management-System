/**
 * @Mohd Ashad
 * 2026-08-12
 * Global Error Handler
 * this looks like it is written in production grade form
 */

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.code = err.code || 'INTERNAL_ERROR';
  
  const statusCode = err.statusCode || 500;
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }
  
  // Mongoose duplicate key
  if (err.code === 11000) {
    error = new AppError('Duplicate field value entered', 400, 'DUPLICATE_ERROR');
  }
  
  // Joi validation error
  if (err.isJoi) {
    error = new AppError(err.details.map(d => d.message).join(', '), 400, 'VALIDATION_ERROR');
  }
  
  // Log the error
  if (statusCode >= 500) {
    logger.error('Unexpected Server Error', { 
      error: err,
      requestId: req.id,
      path: req.path,
      method: req.method
    });
  } else {
    logger.warn('Operational Error', {
      message: error.message,
      code: error.code,
      requestId: req.id,
      path: req.path,
      method: req.method
    });
  }
  
  // Send consistent response
  res.status(statusCode).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: (error.isOperational || statusCode < 500) ? error.message : 'Something went wrong'
    },
    requestId: req.id
  });
};

module.exports = errorHandler;
