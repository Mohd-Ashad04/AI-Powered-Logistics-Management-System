const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { authenticate, isAdminOrSubAdmin } = require('../middleware/auth');

// Order Workflow Routes
router.post('/orders/create-with-workflow', authenticate, workflowController.createOrderWithWorkflow);
router.get('/orders/:orderId/workflow-status', authenticate, workflowController.getWorkflowStatus);

// Agent Workflow Routes
router.get('/agents/:agentId/orders', authenticate, workflowController.getAgentOrders);
router.get('/agents/:agentId/notifications', authenticate, workflowController.getAgentNotifications);
router.put('/notifications/:notificationId/read', authenticate, workflowController.markNotificationRead);

// Pickup Workflow
router.put('/orders/:orderId/complete-pickup', authenticate, workflowController.completePickup);

// Hub Workflow Routes
router.get('/hubs/:hubId/dashboard', authenticate, isAdminOrSubAdmin, workflowController.getHubDashboard);
router.put('/orders/:orderId/receive-at-hub', authenticate, isAdminOrSubAdmin, workflowController.receiveAtHub);
router.put('/orders/:orderId/dispatch-from-hub', authenticate, isAdminOrSubAdmin, workflowController.dispatchFromHub);
router.put('/orders/:orderId/assign-for-delivery', authenticate, isAdminOrSubAdmin, workflowController.assignForDelivery);

// Delivery Workflow
router.put('/orders/:orderId/complete-delivery', authenticate, workflowController.completeDelivery);

module.exports = router;
