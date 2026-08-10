const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticate, isAdminOrSubAdmin } = require('../middleware/auth');

router.use(authenticate, isAdminOrSubAdmin);

// Delivery Hub Management
router.post('/hubs', deliveryController.createDeliveryHub);
router.get('/hubs', deliveryController.getDeliveryHubs);
router.put('/hubs/:hubId', deliveryController.updateDeliveryHub);

// Delivery Agent Management
router.post('/agents', deliveryController.createDeliveryAgent);
router.get('/agents', deliveryController.getDeliveryAgents);
router.put('/agents/:agentId', deliveryController.updateDeliveryAgent);
router.post('/agents/:agentId/assign-orders', deliveryController.assignOrderToAgent);

// Delivery Vehicle Management
router.post('/vehicles', deliveryController.createDeliveryVehicle);
router.get('/vehicles', deliveryController.getDeliveryVehicles);
router.post('/vehicles/:vehicleId/assign-orders', deliveryController.assignOrderToVehicle);

// Route Optimization
router.post('/optimize-routes', deliveryController.optimizeDeliveryRoutes);

// Analytics
router.get('/analytics', deliveryController.getDeliveryAnalytics);

// Network Initialization
router.post('/initialize-network', deliveryController.initializeDeliveryNetwork);

module.exports = router;
