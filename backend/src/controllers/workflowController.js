const workflowService = require('../services/workflowService');
const { DeliveryAgent } = require('../models/Delivery');
const Order = require('../models/Order');

class WorkflowController {

  // Helper to resolve agent identity from authenticated customer
  async getAgentIdentity(req) {
    if (!req.customer) return null;
    
    if (req.customer.role === 'admin' || req.customer.role === 'sub-admin') {
      return { isAdmin: true };
    }
    
    const agent = await DeliveryAgent.findOne({ email: req.customer.email });
    if (!agent) {
      return null;
    }
    return { isAdmin: false, agentId: agent._id.toString() };
  }

  // Create order with automatic pickup assignment
  async createOrderWithWorkflow(req, res) {
    try {
      const orderData = req.body;

      const result = await workflowService.createOrderAndAssignPickup(orderData);

      res.status(201).json({
        success: true,
        message: 'Order created and workflow initiated',
        data: result
      });

    } catch (error) {
      console.error('Error creating order with workflow:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Agent completes pickup
  async completePickup(req, res) {
    try {
      const { orderId } = req.params;
      let agentId = req.body.agentId; 
      
      const identity = await this.getAgentIdentity(req);
      if (!identity) {
        return res.status(403).json({ success: false, message: 'Access denied. Agent profile not found.' });
      }
      
      if (!identity.isAdmin) {
        agentId = identity.agentId; // force to authenticated agent
      } else if (!agentId) {
        return res.status(400).json({ success: false, message: 'agentId required for admin operations' });
      }

      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      
      if (!identity.isAdmin && order.workflowTracking?.pickupAgent?.toString() !== agentId) {
         return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to pickup this order.' });
      }

      const pickupData = req.body;
      const result = await workflowService.completePickup(orderId, agentId, pickupData);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error completing pickup:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Hub receives package
  async receiveAtHub(req, res) {
    try {
      const { orderId } = req.params;
      const { hubManagerId, hubType } = req.body; // origin or destination

      let result;
      if (hubType === 'origin') {
        result = await workflowService.receiveAtOriginHub(orderId, hubManagerId);
      } else {
        result = await workflowService.receiveAtDestinationHub(orderId, hubManagerId);
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error receiving at hub:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Dispatch from origin hub
  async dispatchFromHub(req, res) {
    try {
      const { orderId } = req.params;
      const { hubManagerId } = req.body;

      const result = await workflowService.dispatchFromOriginHub(orderId, hubManagerId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error dispatching from hub:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Assign for delivery
  async assignForDelivery(req, res) {
    try {
      const { orderId } = req.params;
      const { hubManagerId } = req.body;

      const result = await workflowService.assignForDelivery(orderId, hubManagerId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error assigning for delivery:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Agent completes delivery
  async completeDelivery(req, res) {
    try {
      const { orderId } = req.params;
      let agentId = req.body.agentId;
      
      const identity = await this.getAgentIdentity(req);
      if (!identity) {
        return res.status(403).json({ success: false, message: 'Access denied. Agent profile not found.' });
      }
      
      if (!identity.isAdmin) {
        agentId = identity.agentId;
      } else if (!agentId) {
        return res.status(400).json({ success: false, message: 'agentId required for admin operations' });
      }

      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      
      if (!identity.isAdmin && order.workflowTracking?.deliveryAgent?.toString() !== agentId) {
         return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to deliver this order.' });
      }

      const deliveryData = req.body;
      const result = await workflowService.completeDelivery(orderId, agentId, deliveryData);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error completing delivery:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get order workflow status
  async getWorkflowStatus(req, res) {
    try {
      const { orderId } = req.params;

      const status = await workflowService.getOrderWorkflowStatus(orderId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error getting workflow status:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get agent's assigned orders (pickup or delivery)
  async getAgentOrders(req, res) {
    try {
      const { agentId } = req.params;
      const { type = 'all', status } = req.query; // type: pickup, delivery, all
      
      const identity = await this.getAgentIdentity(req);
      if (!identity) {
        return res.status(403).json({ success: false, message: 'Access denied. Agent profile not found.' });
      }
      
      if (!identity.isAdmin && identity.agentId !== agentId) {
         return res.status(403).json({ success: false, message: 'Access denied. Cannot access another agent orders.' });
      }

      let filter = {};

      if (type === 'pickup') {
        filter = { 'workflowTracking.pickupAgent': agentId };
        if (status) {
          filter.status = status;
        } else {
          filter.status = { $in: ['ASSIGNED_PICKUP', 'PICKED_UP'] };
        }
      } else if (type === 'delivery') {
        filter = { 'workflowTracking.deliveryAgent': agentId };
        if (status) {
          filter.status = status;
        } else {
          filter.status = { $in: ['OUT_FOR_DELIVERY'] };
        }
      } else {
        filter = {
          $or: [
            { 'workflowTracking.pickupAgent': agentId },
            { 'workflowTracking.deliveryAgent': agentId }
          ]
        };
        if (status) {
          filter.status = status;
        }
      }

      const orders = await Order.find(filter)
        .populate('customerId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({
        success: true,
        data: {
          orders,
          count: orders.length,
          type
        }
      });

    } catch (error) {
      console.error('Error getting agent orders:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get hub dashboard data
  async getHubDashboard(req, res) {
    try {
      const { hubId } = req.params;

      // Get orders at this hub
      const ordersAtHub = await Order.find({
        $or: [
          { 'workflowTracking.originHub': hubId, status: { $in: ['AT_ORIGIN_HUB', 'DISPATCHED_FROM_ORIGIN'] } },
          { 'workflowTracking.destinationHub': hubId, status: { $in: ['AT_DESTINATION_HUB', 'OUT_FOR_DELIVERY'] } }
        ]
      }).populate('customerId', 'name phone');

      // Get statistics
      const stats = {
        totalOrders: ordersAtHub.length,
        pendingDispatch: ordersAtHub.filter(o => o.status === 'AT_ORIGIN_HUB').length,
        pendingDelivery: ordersAtHub.filter(o => o.status === 'AT_DESTINATION_HUB').length,
        outForDelivery: ordersAtHub.filter(o => o.status === 'OUT_FOR_DELIVERY').length
      };

      res.json({
        success: true,
        data: {
          orders: ordersAtHub,
          statistics: stats
        }
      });

    } catch (error) {
      console.error('Error getting hub dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get agent notifications
  async getAgentNotifications(req, res) {
    try {
      const { agentId } = req.params;
      const identity = await this.getAgentIdentity(req);
      
      if (!identity) {
        return res.status(403).json({ success: false, message: 'Access denied. Agent profile not found.' });
      }
      
      if (!identity.isAdmin && identity.agentId !== agentId) {
         return res.status(403).json({ success: false, message: 'Access denied. Cannot access another agent notifications.' });
      }
      
      console.log('Notification service disabled - no notifications available');
      res.json({
        success: true,
        data: {
          notifications: [],
          totalCount: 0,
          unreadCount: 0,
          page: 1,
          totalPages: 0
        }
      });
    } catch (error) {
      console.error('Error getting agent notifications:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Mark notification as read
  async markNotificationRead(req, res) {
    try {
      // In a real app we would check if the notification's recipient matches the authenticated agent.
      // Since it's disabled, we'll just return a success payload.
      const identity = await this.getAgentIdentity(req);
      if (!identity) {
        return res.status(403).json({ success: false, message: 'Access denied. Agent profile not found.' });
      }
      
      console.log('Notification service disabled - cannot mark notification as read');
      res.json({
        success: true,
        data: { message: 'Notification service is disabled' }
      });
    } catch (error) {
      console.error('Error marking notification read:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

// Need to export the instance, but properly bind `this` so methods can call getAgentIdentity
const controller = new WorkflowController();
// Bind all methods to the instance so `this.getAgentIdentity` works
const boundController = {};
for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(controller))) {
  if (key !== 'constructor' && typeof controller[key] === 'function') {
    boundController[key] = controller[key].bind(controller);
  }
}

module.exports = boundController;
