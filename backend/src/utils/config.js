/**
 * 🔧 Simple Environment Configuration
 * Just extracts environment variables for the application
 */

require('dotenv').config();

const config = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SECRET_KEY: process.env.SECRET_KEY || 'your-secret-key',

  // Database
  MONGO_URI: process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URI : (process.env.MONGO_URI || 'mongodb://localhost:27017/logistics_db'),
  TEST_DATABASE_URI: process.env.TEST_DATABASE_URI,

  // AI Service
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  // External APIs
  OPENROUTESERVICE_API_KEY: process.env.OPENROUTESERVICE_API_KEY,

  // URLs
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:2000',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:2001',

  // Payment - Stripe only
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISH_KEY: process.env.STRIPE_PUBLISH_KEY
};

// Simple validation
if (!config.GEMINI_API_KEY || config.GEMINI_API_KEY === 'your_gemini_api_key') {
  console.warn('⚠️  Gemini API key not configured - using fallback mode');
}

if (config.NODE_ENV === 'production' && config.SECRET_KEY === 'your-secret-key') {
  throw new Error('SECRET_KEY must be set in production');
}

if (config.NODE_ENV === 'test') {
  if (!config.TEST_DATABASE_URI) {
    throw new Error('TEST_DATABASE_URI must be provided in test environment');
  }
  if (config.TEST_DATABASE_URI === process.env.MONGO_URI) {
    throw new Error('TEST_DATABASE_URI cannot be identical to MONGO_URI (Safety constraint)');
  }
}

console.log('✅ Configuration loaded successfully');
console.log(`🌐 Environment: ${config.NODE_ENV}`);
console.log(`📍 Server Port: ${config.PORT}`);

module.exports = config;
