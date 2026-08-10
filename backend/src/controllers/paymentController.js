const config = require('../utils/config');
const stripe = require('stripe')(config.STRIPE_SECRET_KEY || 'dummy_key_for_development');
const Order = require('../models/Order');

// Check if Stripe is properly configured
const isStripeConfigured = () => {
  return config.STRIPE_SECRET_KEY && config.STRIPE_SECRET_KEY !== 'dummy_key_for_development';
};

// Create Payment Intent
exports.createPaymentIntent = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please contact administrator.'
      });
    }

    const { orderId, amount, currency = 'inr' } = req.body;
    const customerId = req.customer._id;

    // Verify order belongs to customer
    const order = await Order.findOne({ _id: orderId, customerId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in paise/cents
      currency,
      metadata: {
        orderId: orderId.toString(),
        customerId: customerId.toString()
      }
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

// Confirm Payment
exports.confirmPayment = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please contact administrator.'
      });
    }

    const { paymentIntentId, orderId } = req.body;
    const customerId = req.customer._id;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update order payment status
      const order = await Order.findOneAndUpdate(
        { _id: orderId, customerId },
        { 
          'paymentDetails.paymentStatus': 'PAID',
          'paymentDetails.transactionId': paymentIntentId,
          'paymentDetails.paidAt': new Date()
        },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: { order }
      });

    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not successful',
        status: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment confirmation failed',
      error: error.message
    });
  }
};

// Get Payment Status
exports.getPaymentStatus = async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please contact administrator.'
      });
    }

    const { paymentIntentId } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.status(200).json({
      success: true,
      data: {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back from paise/cents
        currency: paymentIntent.currency
      }
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};

// Webhook handler for Stripe events (disabled - no webhook secret configured)
exports.stripeWebhook = async (req, res) => {
  console.log('⚠️  Stripe webhook called but webhook secret not configured');
  
  // Just acknowledge the webhook without processing
  res.status(200).json({
    success: true,
    message: 'Webhook received but not processed (webhook secret not configured)'
  });
};
