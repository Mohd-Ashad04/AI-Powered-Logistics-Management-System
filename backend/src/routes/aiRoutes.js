/**
 * 🗺️ AI Route Optimization Routes
 * Testing endpoints for Gemini-powered route optimization and time estimation
 */

const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { DeliveryHub } = require('../models/Delivery');
const { authenticate } = require('../middleware/auth');

// 🗺️ Test Route Optimization
router.post('/optimize-route', authenticate, async (req, res) => {
  try {
    const { pickupLocation, deliveryLocation, waypoints } = req.body;

    console.log('🗺️ Processing route optimization request...');
    
    // Validate input
    if (!pickupLocation || !deliveryLocation) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and delivery locations are required'
      });
    }

    // Call AI service for route optimization
    const routeOptimization = await aiService.optimizeRoute(
      pickupLocation, 
      deliveryLocation, 
      waypoints || []
    );

    console.log('✅ Route optimization completed successfully');

    res.json({
      success: true,
      message: 'Route optimization completed',
      data: {
        pickup: pickupLocation,
        delivery: deliveryLocation,
        waypoints: waypoints || [],
        optimization: routeOptimization,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Route optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Route optimization failed',
      error: error.message
    });
  }
});

// 🚛 Test Multi-Hub Route Planning
router.post('/plan-multi-hub-route', authenticate, async (req, res) => {
  try {
    const { orderData } = req.body;

    console.log('🚛 Processing multi-hub route planning...');

    // Validate input
    if (!orderData || !orderData.pickupAddress || !orderData.recipientDetails) {
      return res.status(400).json({
        success: false,
        message: 'Complete order data with pickup and delivery addresses required'
      });
    }

    // Get available hub network
    const hubNetwork = await DeliveryHub.find({ isActive: true })
      .select('hubId hubName city state capacity')
      .limit(20);

    if (hubNetwork.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active delivery hubs found'
      });
    }

    // Call AI service for multi-hub route planning
    const routePlan = await aiService.planMultiHubRoute(orderData, hubNetwork);

    console.log('✅ Multi-hub route planning completed successfully');

    res.json({
      success: true,
      message: 'Multi-hub route planning completed',
      data: {
        orderDetails: {
          pickup: orderData.pickupAddress,
          delivery: orderData.recipientDetails.address,
          weight: orderData.packageDetails?.deadWeight_kg,
          priority: orderData.priority
        },
        availableHubs: hubNetwork.length,
        routePlan: routePlan,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Multi-hub route planning error:', error);
    res.status(500).json({
      success: false,
      message: 'Multi-hub route planning failed',
      error: error.message
    });
  }
});

// ⏱️ Test Enhanced Time Estimation
router.post('/estimate-delivery-time', authenticate, async (req, res) => {
  try {
    const { orderData } = req.body;

    console.log('⏱️ Processing enhanced delivery time estimation...');

    // Validate input
    if (!orderData) {
      return res.status(400).json({
        success: false,
        message: 'Order data is required'
      });
    }

    // Call AI service for time estimation
    const timeEstimation = await aiService.estimateDeliveryTime(orderData);

    console.log('✅ Enhanced time estimation completed successfully');

    res.json({
      success: true,
      message: 'Enhanced delivery time estimation completed',
      data: {
        orderSummary: {
          route: `${orderData.pickupAddress?.city} → ${orderData.recipientDetails?.address?.city}`,
          weight: orderData.packageDetails?.deadWeight_kg,
          type: orderData.orderType,
          priority: orderData.priority
        },
        timeEstimation: timeEstimation,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Time estimation error:', error);
    res.status(500).json({
      success: false,
      message: 'Time estimation failed',
      error: error.message
    });
  }
});

// 🧪 Test All AI Features
router.post('/test-all-ai-features', authenticate, async (req, res) => {
  try {
    const { orderData } = req.body;

    console.log('🧪 Testing all AI features...');

    // Validate input
    if (!orderData) {
      return res.status(400).json({
        success: false,
        message: 'Order data is required for comprehensive testing'
      });
    }

    const results = {};

    // Test 1: AI Pricing
    console.log('1️⃣ Testing AI pricing...');
    try {
      results.pricing = await aiService.generatePricing(orderData);
      results.pricing.status = 'SUCCESS';
    } catch (error) {
      results.pricing = { status: 'FAILED', error: error.message };
    }

    // Test 2: Time Estimation
    console.log('2️⃣ Testing time estimation...');
    try {
      results.timeEstimation = await aiService.estimateDeliveryTime(orderData);
      results.timeEstimation.status = 'SUCCESS';
    } catch (error) {
      results.timeEstimation = { status: 'FAILED', error: error.message };
    }

    // Test 3: Route Optimization
    console.log('3️⃣ Testing route optimization...');
    try {
      results.routeOptimization = await aiService.optimizeRoute(
        orderData.pickupAddress,
        orderData.recipientDetails.address
      );
      results.routeOptimization.status = 'SUCCESS';
    } catch (error) {
      results.routeOptimization = { status: 'FAILED', error: error.message };
    }

    // Test 4: Multi-Hub Planning
    console.log('4️⃣ Testing multi-hub planning...');
    try {
      const hubNetwork = await DeliveryHub.find({ isActive: true }).limit(10);
      results.multiHubPlanning = await aiService.planMultiHubRoute(orderData, hubNetwork);
      results.multiHubPlanning.status = 'SUCCESS';
    } catch (error) {
      results.multiHubPlanning = { status: 'FAILED', error: error.message };
    }

    // Calculate success rate
    const totalTests = 4;
    const successfulTests = Object.values(results).filter(r => r.status === 'SUCCESS').length;
    const successRate = (successfulTests / totalTests * 100).toFixed(1);

    console.log(`✅ AI feature testing completed: ${successfulTests}/${totalTests} tests passed (${successRate}%)`);

    res.json({
      success: true,
      message: 'Comprehensive AI feature testing completed',
      data: {
        summary: {
          totalTests,
          successfulTests,
          failedTests: totalTests - successfulTests,
          successRate: `${successRate}%`
        },
        results,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Comprehensive AI testing error:', error);
    res.status(500).json({
      success: false,
      message: 'Comprehensive AI testing failed',
      error: error.message
    });
  }
});

module.exports = router;
