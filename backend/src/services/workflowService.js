const Order = require('../models/Order');
const { DeliveryHub, DeliveryAgent, DeliveryVehicle } = require('../models/Delivery');

class WorkflowService {
  
  // Step 1: Create order and assign pickup agent
  async createOrderAndAssignPickup(orderData) {
    try {
      // Validate required fields
      if (!orderData.pickupAddress || !orderData.pickupAddress.pincode) {
        throw new Error('Pickup address with pincode is required');
      }
      
      // Find the origin hub based on pickup pincode
      const originHub = await this.findNearestHub(orderData.pickupAddress.pincode);
      if (!originHub) {
        throw new Error('No delivery hub found for pickup location');
      }
      
      // Find available pickup agent in the area
      const pickupAgent = await this.findAvailableAgent(originHub.hubId, 'PICKUP');
      if (!pickupAgent) {
        throw new Error('No pickup agent available in the area');
      }
      
      // Create order with complete data and workflow tracking
      const orderWithWorkflow = {
        ...orderData,
        workflowTracking: {
          pickupAgent: pickupAgent._id,
          originHub: originHub._id,
          currentLocation: {
            hubId: originHub._id,
            lastUpdated: new Date()
          },
          statusHistory: [{
            status: 'PENDING',
            timestamp: new Date(),
            location: `${originHub.city}, ${originHub.state}`,
            remarks: 'Order created and assigned for pickup'
          }]
        }
      };
      
      // Create the order
      const order = new Order(orderWithWorkflow);
      await order.save();
      
      // Update agent availability
      await this.updateAgentCapacity(pickupAgent._id, 1);
      
      // Notification service removed - logging only
      console.log('📧 Pickup notification would be sent to:', pickupAgent.name);
      
      // Update order status to assigned pickup
      await this.updateOrderStatus(order._id, 'ASSIGNED_PICKUP', `Assigned to ${pickupAgent.name}`);
      
      return {
        order,
        pickupAgent,
        originHub,
        message: 'Order created and pickup assigned successfully'
      };
      
    } catch (error) {
      console.error('Error in createOrderAndAssignPickup:', error);
      throw error;
    }
  }
  
  // Step 2: Agent completes pickup
  async completePickup(orderId, agentId, pickupData = {}) {
    try {
      const order = await Order.findById(orderId).populate('workflowTracking.pickupAgent');
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.workflowTracking.pickupAgent._id.toString() !== agentId) {
        throw new Error('Unauthorized: You are not assigned to this pickup');
      }
      
      if (order.status !== 'ASSIGNED_PICKUP') {
        throw new Error(`Cannot complete pickup. Current status: ${order.status}`);
      }
      
      // Update order status and add to status history
      await this.updateOrderStatus(orderId, 'PICKED_UP', 'Package picked up by agent', agentId);
      
      // Update order location
      await Order.findByIdAndUpdate(orderId, {
        'workflowTracking.currentLocation.agentId': agentId,
        'workflowTracking.currentLocation.lastUpdated': new Date()
      });
      
      // Release agent capacity for next pickup
      await this.updateAgentCapacity(agentId, -1);
      
      // Notification service removed - logging only
      const originHub = await DeliveryHub.findById(order.workflowTracking.originHub);
      console.log('📧 Hub notification would be sent to:', originHub.hubName);
      
      return {
        success: true,
        message: 'Pickup completed successfully',
        nextStep: 'Deliver package to origin hub'
      };
      
    } catch (error) {
      console.error('Error in completePickup:', error);
      throw error;
    }
  }
  
  // Step 3: Package reaches origin hub
  async receiveAtOriginHub(orderId, hubManagerId) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.status !== 'PICKED_UP') {
        throw new Error(`Cannot receive at hub. Current status: ${order.status}`);
      }
      
      // Update order status
      await this.updateOrderStatus(orderId, 'AT_ORIGIN_HUB', 'Package received at origin hub', null, hubManagerId);
      
      // Update current location to hub
      await Order.findByIdAndUpdate(orderId, {
        'workflowTracking.currentLocation': {
          hubId: order.workflowTracking.originHub,
          lastUpdated: new Date()
        }
      });
      
      // Find destination hub
      const destinationHub = await this.findNearestHub(order.recipientDetails.address.pincode);
      if (!destinationHub) {
        throw new Error('No destination hub found for delivery location');
      }
      
      // Update destination hub in order
      await Order.findByIdAndUpdate(orderId, {
        'workflowTracking.destinationHub': destinationHub._id
      });
      
      return {
        success: true,
        message: 'Package received at origin hub',
        destinationHub: destinationHub,
        nextStep: 'Process for interstate transfer'
      };
      
    } catch (error) {
      console.error('Error in receiveAtOriginHub:', error);
      throw error;
    }
  }
  
  // Step 4: Dispatch from origin hub to destination
  async dispatchFromOriginHub(orderId, hubManagerId) {
    try {
      const order = await Order.findById(orderId).populate('workflowTracking.destinationHub');
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.status !== 'AT_ORIGIN_HUB') {
        throw new Error(`Cannot dispatch. Current status: ${order.status}`);
      }
      
      if (!order.workflowTracking.destinationHub) {
        throw new Error('Destination hub not found in order workflow');
      }
      
      // Update order status
      await this.updateOrderStatus(orderId, 'DISPATCHED_FROM_ORIGIN', 
        `Dispatched to ${order.workflowTracking.destinationHub.city}`, null, hubManagerId);
      
      // Set status to in transit
      setTimeout(async () => {
        await this.updateOrderStatus(orderId, 'IN_TRANSIT', 
          `En route to ${order.workflowTracking.destinationHub.city}`);
      }, 1000);
      
      return {
        success: true,
        message: 'Package dispatched from origin hub',
        destination: order.workflowTracking.destinationHub,
        nextStep: 'Package in transit to destination hub'
      };
      
    } catch (error) {
      console.error('Error in dispatchFromOriginHub:', error);
      throw error;
    }
  }
  
  // Step 5: Package reaches destination hub
  async receiveAtDestinationHub(orderId, hubManagerId) {
    try {
      const order = await Order.findById(orderId).populate('workflowTracking.destinationHub');
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.status !== 'IN_TRANSIT') {
        throw new Error(`Cannot receive at destination hub. Current status: ${order.status}`);
      }
      
      // Find available delivery agent
      const deliveryAgent = await this.findAvailableAgent(order.workflowTracking.destinationHub.hubId, 'DELIVERY');
      
      if (!deliveryAgent) {
        throw new Error('No delivery agent available');
      }
      
      // Update order with delivery agent
      await Order.findByIdAndUpdate(orderId, {
        'workflowTracking.deliveryAgent': deliveryAgent._id
      });
      
      // Update order status
      await this.updateOrderStatus(orderId, 'AT_DESTINATION_HUB', 
        'Package received at destination hub', null, hubManagerId);
      
      // Update agent capacity
      await this.updateAgentCapacity(deliveryAgent._id, 1);
      
      // Notification service removed - logging only
      console.log('📧 Delivery notification would be sent to:', deliveryAgent.name);
      
      return {
        success: true,
        message: 'Package received at destination hub and assigned for delivery',
        deliveryAgent: deliveryAgent,
        nextStep: 'Package ready for final delivery'
      };
      
    } catch (error) {
      console.error('Error in receiveAtDestinationHub:', error);
      throw error;
    }
  }
  
  // Step 6: Assign for delivery
  async assignForDelivery(orderId, hubManagerId) {
    try {
      const order = await Order.findById(orderId).populate('workflowTracking.deliveryAgent');
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.status !== 'AT_DESTINATION_HUB') {
        throw new Error(`Cannot assign for delivery. Current status: ${order.status}`);
      }
      
      // Update order status
      await this.updateOrderStatus(orderId, 'OUT_FOR_DELIVERY', 
        `Assigned to ${order.workflowTracking.deliveryAgent.name} for delivery`, 
        order.workflowTracking.deliveryAgent._id, hubManagerId);
      
      return {
        success: true,
        message: 'Package assigned for delivery',
        deliveryAgent: order.workflowTracking.deliveryAgent,
        nextStep: 'Agent will deliver the package'
      };
      
    } catch (error) {
      console.error('Error in assignForDelivery:', error);
      throw error;
    }
  }
  
  // Step 7: Complete delivery
  async completeDelivery(orderId, agentId, deliveryData = {}) {
    try {
      const order = await Order.findById(orderId).populate('workflowTracking.deliveryAgent');
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.workflowTracking.deliveryAgent._id.toString() !== agentId) {
        throw new Error('Unauthorized: You are not assigned to this delivery');
      }
      
      if (order.status !== 'OUT_FOR_DELIVERY') {
        throw new Error(`Cannot complete delivery. Current status: ${order.status}`);
      }
      
      // Update order status
      await this.updateOrderStatus(orderId, 'DELIVERED', 
        'Package delivered successfully', agentId);
      
      // Release agent capacity
      await this.updateAgentCapacity(agentId, -1);
      
      // Update delivery date
      await Order.findByIdAndUpdate(orderId, {
        'shippingDetails.actualDeliveryDate': new Date()
      });
      
      return {
        success: true,
        message: 'Delivery completed successfully',
        completedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error in completeDelivery:', error);
      throw error;
    }
  }
  
  // Helper methods
  async findNearestHub(pincode) {
    // Simplified hub finding logic - in real implementation, use geospatial queries
    const hub = await DeliveryHub.findOne({
      serviceAreas: { $in: [pincode] }
    });
    
    if (!hub) {
      // Fallback to state-based matching
      const stateHub = await DeliveryHub.findOne({
        isStateHub: true,
        'address.pincode': { $regex: `^${pincode.substring(0, 2)}` }
      });
      return stateHub;
    }
    
    return hub;
  }
  
  async findAvailableAgent(hubId, type = 'PICKUP') {
    const agent = await DeliveryAgent.findOne({
      hubId: hubId,
      status: 'AVAILABLE',
      isActive: true
    }).sort({ 'currentCapacity.currentOrders': 1 });
    
    // Check capacity manually if agent found
    if (agent && agent.currentCapacity.currentOrders >= agent.currentCapacity.maxOrders) {
      return null;
    }
    
    return agent;
  }
  
  async updateAgentCapacity(agentId, change) {
    await DeliveryAgent.findByIdAndUpdate(agentId, {
      $inc: { 'currentCapacity.currentOrders': change }
    });
  }
  
  async updateOrderStatus(orderId, status, remarks = '', agentId = null, hubManagerId = null) {
    const updateData = {
      status: status,
      $push: {
        'workflowTracking.statusHistory': {
          status: status,
          timestamp: new Date(),
          remarks: remarks,
          handledBy: agentId || hubManagerId || 'SYSTEM'
        }
      }
    };
    
    await Order.findByIdAndUpdate(orderId, updateData);
    
    // Notification service removed - logging only
    const order = await Order.findById(orderId);
    console.log('📧 Status update notification would be sent for order:', order.sellerOrderId);
  }
  
  async createHubNotification(order, hub, type) {
    // Notification service removed - logging only
    console.log('📧 Hub notification would be created:', {
      hubId: hub._id,
      orderId: order._id,
      type: type,
      title: type === 'INCOMING_PACKAGE' ? 'Package Incoming' : 'Hub Notification'
    });
  }
  
  // Get order workflow status
  async getOrderWorkflowStatus(orderId) {
    const order = await Order.findById(orderId)
      .populate('workflowTracking.pickupAgent')
      .populate('workflowTracking.deliveryAgent')
      .populate('workflowTracking.originHub')
      .populate('workflowTracking.destinationHub')
      .populate('workflowTracking.currentLocation.hubId')
      .populate('workflowTracking.currentLocation.agentId');
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    return {
      orderId: order._id,
      sellerOrderId: order.sellerOrderId,
      currentStatus: order.status,
      workflowTracking: order.workflowTracking,
      statusHistory: order.workflowTracking.statusHistory,
      currentLocation: order.workflowTracking.currentLocation
    };
  }
}

module.exports = new WorkflowService();
