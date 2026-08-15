/**
 * @Mohd Ashad
 * 2026-08-12
 * Express Server Configuration
 * this looks like it is written in production grade form
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import centralized configuration
const config = require('./src/utils/config');
const logger = require('./src/utils/logger');
const requestIdMiddleware = require('./src/middleware/requestId');
const errorHandler = require('./src/middleware/errorHandler');

// Import routes
const orderRoutes = require('./src/routes/orderRoutes');
const deliveryRoutes = require('./src/routes/deliveryRoutes');
const pricingRoutes = require('./src/routes/pricingRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const docsRoutes = require('./src/routes/docsRoutes');
const workflowRoutes = require('./src/routes/workflowRoutes');
const authRoutes = require('./src/routes/authRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const aiRoutes = require('./src/routes/aiRoutes');

const app = express();
const PORT = config.PORT;

// CORS configuration
app.use(cors({
  origin: [config.FRONTEND_URL, config.ADMIN_URL, config.CLIENT_URL],
  credentials: true
}));

// Request ID Middleware
app.use(requestIdMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB (skip auto-connect in tests, handled by testSetup)
if (config.NODE_ENV !== 'test') {
  mongoose.connect(config.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
    .then(() => {
      logger.info('Connected to MongoDB');
    })
    .catch((error) => {
      logger.error('MongoDB connection error', { error });
      process.exit(1);
    });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/ai', aiRoutes);

// API Documentation
app.use('/api/docs', docsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AI Logistics System is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    },
    requestId: req.id
  });
});

// Error handling middleware
app.use(errorHandler);

if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`API Base URL: http://localhost:${PORT}`);
    logger.info(`Health Check: http://localhost:${PORT}/health`);
    logger.info(`API Documentation: http://localhost:${PORT}/api/docs`);
  });

  const gracefulShutdown = () => {
    logger.info('Received shutdown signal (SIGTERM/SIGINT)');
    logger.info('Closing HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed');
      logger.info('Closing MongoDB connection...');
      mongoose.connection.close(false).then(() => {
        logger.info('MongoDB connection closed cleanly');
        process.exit(0);
      }).catch(err => {
        logger.error('Error during MongoDB connection closure', { error: err });
        process.exit(1);
      });
    });

    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

module.exports = app;
