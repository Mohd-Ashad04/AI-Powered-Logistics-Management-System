/**
 * @Mohd Ashad
 * 2026-08-12
 * Order Routes
 * this looks like it is written in production grade form
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, isAdminOrSubAdmin } = require('../middleware/auth');
const { validateOrderData } = require('../middleware/validation');

// Order Management Routes
router.get('/', authenticate, orderController.getAllOrders);
router.post('/', authenticate, validateOrderData, orderController.createOrder);
router.get('/tracking/:trackingId', orderController.getOrderByTrackingId);

// Analytics
router.get('/analytics/summary', authenticate, isAdminOrSubAdmin, orderController.getOrderAnalytics);

// Bulk Operations
router.put('/bulk/status', authenticate, isAdminOrSubAdmin, orderController.bulkUpdateOrders);

// Customer Orders
router.get('/customer/:customerId', authenticate, orderController.getCustomerOrders);

router.get('/:orderId', authenticate, orderController.getOrder);
router.put('/:orderId/status', authenticate, isAdminOrSubAdmin, orderController.updateOrderStatus);
router.delete('/:orderId', authenticate, isAdminOrSubAdmin, orderController.deleteOrder);
router.post('/:orderId/assign', authenticate, isAdminOrSubAdmin, orderController.assignResource);
router.get('/:orderId/track', authenticate, orderController.trackOrder);

module.exports = router;
