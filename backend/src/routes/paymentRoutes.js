const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createPaymentIntent,
  confirmPayment,
  getPaymentStatus,
  stripeWebhook
} = require('../controllers/paymentController');

// Stripe webhook (no auth required)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Protected payment routes
router.use(authenticate);

// Create payment intent for an order
router.post('/create-intent', createPaymentIntent);

// Confirm payment
router.post('/confirm', confirmPayment);

// Get payment status
router.get('/status/:paymentIntentId', getPaymentStatus);

module.exports = router;
