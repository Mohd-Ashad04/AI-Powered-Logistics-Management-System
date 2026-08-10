const Order = require('../models/Order');
const Customer = require('../models/Customer');
const { DeliveryHub, DeliveryAgent, DeliveryVehicle } = require('../models/Delivery');
const aiService = require('./aiService');

class LogisticsService {
  
  async createOrder(orderData) {
    try {
      // Get or create customer
      let customer = await Customer.findById(orderData.customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Generate unique seller order ID if not provided
      if (!orderData.sellerOrderId) {
        orderData.sellerOrderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      }

      // Calculate volumetric weight if not provided
      if (!orderData.packageDetails.volumetricWeight_kg) {
        const { length, width, height } = orderData.packageDetails.dimensions_cm;
        orderData.packageDetails.volumetricWeight_kg = (length * width * height) / 5000; // Standard formula
      }

      // Get AI-driven pricing
      const pricingData = await aiService.generatePricing(orderData);
      
      // Get delivery time estimation
      const timeEstimation = await aiService.estimateDeliveryTime(orderData);
      
      // Get route optimization
      const routeOptimization = await aiService.generateRouteOptimization(orderData);

      // Create order with AI insights
      const order = new Order({
        ...orderData,
        shippingDetails: {
          ...orderData.shippingDetails,
          rate: {
            chargedToSeller_inr: pricingData.totalCost,
            courierCost_inr: pricingData.courierPartnerCost,
            fuelSurcharge: pricingData.fuelSurcharge,
            handlingCharges: pricingData.handlingCharges,
            codCharges: pricingData.codCharges
          },
          estimatedDeliveryDate: new Date(timeEstimation.estimatedDeliveryDate)
        },
        routeOptimization: {
          transitRoute: routeOptimization.transitRoute.map(route => ({
            hub: route.hub,
            state: route.state,
            city: route.city,
            area: route.area,
            estimatedArrival: new Date(route.estimatedArrival),
            status: 'PENDING'
          })),
          assignedVehicle: {
            vehicleType: routeOptimization.recommendedVehicle?.type || routeOptimization.recommendedVehicle || 'MINI_TRUCK',
            vehicleId: `VH-${Date.now()}`,
            driverName: 'Auto Assigned',
            driverPhone: '+91-AUTO-ASSIGN'
          }
        },
        aiInsights: {
          riskScore: this._calculateRiskScore(orderData, timeEstimation),
          deliveryPrediction: {
            confidence: timeEstimation.confidence,
            factors: timeEstimation.factors
          },
          pricingFactors: {
            distance: pricingData.distanceCharges,
            weight: pricingData.weightCharges,
            volume: orderData.packageDetails.volumetricWeight_kg,
            urgency: pricingData.orderTypeSurcharge,
            special_handling: pricingData.handlingCharges
          }
        },
        trackingHistory: [{
          timestamp: new Date(),
          status: 'Order Created',
          location: `${orderData?.pickupAddress?.city || 'Unknown'}, ${orderData?.pickupAddress?.state || 'Unknown'}`,
          remarks: 'Order placed successfully with AI-optimized routing'
        }]
      });

      const savedOrder = await order.save();

      // Update customer order history
      await Customer.findByIdAndUpdate(
        orderData.customerId,
        { $push: { orderHistory: savedOrder._id } }
      );

      // Assign to delivery network
      await this._assignToDeliveryNetwork(savedOrder);

      return {
        order: savedOrder,
        pricing: pricingData,
        timeEstimation: timeEstimation,
        route: routeOptimization
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async updateOrderStatus(orderId, status, location, remarks) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status
      order.status = status;
      
      // Add to tracking history
      order.trackingHistory.push({
        timestamp: new Date(),
        status: status,
        location: location,
        remarks: remarks
      });

      // Update specific timestamps based on status
      if (status === 'PICKED_UP' && !order.shippingDetails.shippedAt) {
        order.shippingDetails.shippedAt = new Date();
      }
      
      if (status === 'DELIVERED' && !order.shippingDetails.deliveredAt) {
        order.shippingDetails.deliveredAt = new Date();
        order.shippingDetails.actualDeliveryDate = new Date();
      }

      await order.save();
      return order;
    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  async optimizeDeliveryRoute(hubId, date = new Date()) {
    try {
      // Get pending orders for the hub
      const orders = await Order.find({
        'routeOptimization.transitRoute.hub': hubId,
        status: { $in: ['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT'] }
      });

      // Get available delivery agents in the hub area
      const agents = await DeliveryAgent.find({
        hubId: hubId,
        status: 'AVAILABLE',
        isActive: true
      });

      // AI-driven route optimization for each agent
      const optimizedRoutes = await this._optimizeAgentRoutes(orders, agents);

      return optimizedRoutes;
    } catch (error) {
      throw new Error(`Failed to optimize delivery route: ${error.message}`);
    }
  }

  async getOrderTracking(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('customerId', 'name email phone')
        .lean();

      if (!order) {
        throw new Error('Order not found');
      }

      // Calculate current progress
      const progress = this._calculateDeliveryProgress(order.status);
      
      // Get real-time location updates if available
      const currentLocation = await this._getCurrentOrderLocation(order);

      return {
        order: order,
        progress: progress,
        currentLocation: currentLocation,
        estimatedDelivery: order.shippingDetails.estimatedDeliveryDate,
        trackingHistory: order.trackingHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      };
    } catch (error) {
      throw new Error(`Failed to get order tracking: ${error.message}`);
    }
  }

  async getPricingEstimate(pricingRequest) {
    try {
      // Create a temporary order object for pricing
      const tempOrder = {
        pickupAddress: pricingRequest.pickupAddress,
        recipientDetails: { address: pricingRequest.deliveryAddress },
        packageDetails: pricingRequest.packageDetails,
        paymentDetails: pricingRequest.paymentDetails,
        orderType: pricingRequest.orderType || 'NORMAL'
      };

      // Get AI pricing
      const pricingData = await aiService.generatePricing(tempOrder);
      
      // Get time estimation
      const timeEstimation = await aiService.estimateDeliveryTime(tempOrder);

      return {
        pricing: pricingData,
        deliveryEstimation: timeEstimation,
        serviceRecommendations: this._getServiceRecommendations(tempOrder, pricingData)
      };
    } catch (error) {
      throw new Error(`Failed to get pricing estimate: ${error.message}`);
    }
  }

  // Private helper methods
  async _assignToDeliveryNetwork(order) {
    try {
      // Find appropriate delivery hub based on pickup location
      const pickupHub = await this._findNearestHub(
        order?.pickupAddress?.city || 'Unknown',
        order?.pickupAddress?.state || 'Unknown'
      );

      // Find delivery hub based on destination
      const deliveryHub = await this._findNearestHub(
        order?.recipientDetails?.address?.city || 'Unknown',
        order?.recipientDetails?.address?.state || 'Unknown'
      );

      // Assign interstate vehicle if needed
      if (pickupHub.state !== deliveryHub.state) {
        const vehicle = await this._assignStateVehicle(pickupHub.state, deliveryHub.state);
        if (vehicle) {
          order.routeOptimization.assignedVehicle = {
            type: vehicle.type,
            vehicleId: vehicle.vehicleId,
            driverName: vehicle.driver.name,
            driverPhone: vehicle.driver.phone
          };
        }
      }

      // Assign local delivery agent
      const deliveryAgent = await this._assignDeliveryAgent(
        deliveryHub.hubId,
        order.routeOptimization.deliveryArea || 'NORTH'
      );

      if (deliveryAgent) {
        order.routeOptimization.deliveryAgent = {
          agentId: deliveryAgent.agentId,
          name: deliveryAgent.name,
          phone: deliveryAgent.phone,
          area: deliveryAgent.area
        };
      }

      await order.save();
    } catch (error) {
      console.error('Error assigning to delivery network:', error);
    }
  }

  async _findNearestHub(city, state) {
    // Try to find hub in the same city first
    let hub = await DeliveryHub.findOne({
      city: city.toLowerCase(),
      state: state,
      isActive: true
    });

    // If not found, find any hub in the same state
    if (!hub) {
      hub = await DeliveryHub.findOne({
        state: state,
        isActive: true
      });
    }

    // Create a default hub if none exists
    if (!hub) {
      hub = await DeliveryHub.create({
        hubId: `HUB-${state.replace(/\s+/g, '').toUpperCase()}-${city.replace(/\s+/g, '').toUpperCase()}`,
        state: state,
        city: city,
        area: 'NORTH', // Default area
        serviceAreas: ['000000'] // Default service area
      });
    }

    return hub;
  }

  async _assignStateVehicle(fromState, toState) {
    return await DeliveryVehicle.findOne({
      'route.serviceStates': { $in: [fromState, toState] },
      status: 'AVAILABLE',
      isActive: true
    });
  }

  async _assignDeliveryAgent(hubId, area) {
    // Find agents with available capacity using aggregation
    const agents = await DeliveryAgent.aggregate([
      {
        $match: {
          hubId: hubId,
          area: area,
          status: 'AVAILABLE',
          isActive: true
        }
      },
      {
        $addFields: {
          hasCapacity: {
            $lt: ['$currentCapacity.currentOrders', '$currentCapacity.maxOrders']
          }
        }
      },
      {
        $match: {
          hasCapacity: true
        }
      },
      {
        $limit: 1
      }
    ]);

    return agents.length > 0 ? agents[0] : null;
  }

  _calculateRiskScore(orderData, timeEstimation) {
    let risk = 0;
    
    // High value orders
    if (orderData.paymentDetails.totalValue > 10000) risk += 20;
    
    // COD orders
    if (orderData.paymentDetails.method === 'COD') risk += 15;
    
    // Heavy packages
    if (orderData.packageDetails.deadWeight_kg > 10) risk += 10;
    
    // Fragile items
    if (orderData.packageDetails.fragile) risk += 25;
    
    // Remote locations (basic heuristic)
    if (timeEstimation.estimatedDays > 5) risk += 20;
    
    // Low confidence predictions
    if (timeEstimation.confidence < 70) risk += 10;

    return Math.min(risk, 100);
  }

  _calculateDeliveryProgress(status) {
    const statusProgress = {
      'PENDING': 10,
      'CONFIRMED': 20,
      'PICKED_UP': 40,
      'IN_TRANSIT': 60,
      'OUT_FOR_DELIVERY': 80,
      'DELIVERED': 100,
      'CANCELLED': 0,
      'RETURNED': 0
    };
    
    return statusProgress[status] || 0;
  }

  async _getCurrentOrderLocation(order) {
    // This would integrate with courier partner APIs for real-time tracking
    // For now, return estimated location based on route
    const currentRoute = order.routeOptimization.transitRoute.find(
      route => route.status === 'IN_PROGRESS' || !route.actualArrival
    );
    
    return currentRoute ? {
      city: currentRoute.city,
      state: currentRoute.state,
      estimatedArrival: currentRoute.estimatedArrival
    } : null;
  }

  async _optimizeAgentRoutes(orders, agents) {
    // Simple route optimization logic
    // In production, this would use advanced algorithms
    const routes = [];
    
    for (const agent of agents) {
      const assignableOrders = orders.filter(order => 
        order.routeOptimization.deliveryAgent?.area === agent.area ||
        !order.routeOptimization.deliveryAgent
      ).slice(0, agent.currentCapacity.maxOrders - agent.currentCapacity.currentOrders);
      
      if (assignableOrders.length > 0) {
        routes.push({
          agentId: agent.agentId,
          agentName: agent.name,
          assignedOrders: assignableOrders.map(order => ({
            orderId: order._id,
            address: order.recipientDetails.address,
            priority: order.priority
          })),
          estimatedTime: assignableOrders.length * 45, // 45 minutes per delivery
          optimizedSequence: assignableOrders.sort((a, b) => 
            a.recipientDetails.address.pincode.localeCompare(b.recipientDetails.address.pincode)
          )
        });
      }
    }
    
    return routes;
  }

  _getServiceRecommendations(orderData, pricingData) {
    const recommendations = [];
    
    if (orderData.paymentDetails.method === 'COD') {
      recommendations.push({
        type: 'COST_SAVING',
        message: `Switch to prepaid and save ₹${pricingData.codCharges} in COD charges`,
        savings: pricingData.codCharges
      });
    }
    
    if (orderData.packageDetails.deadWeight_kg < orderData.packageDetails.volumetricWeight_kg) {
      recommendations.push({
        type: 'PACKAGING',
        message: 'Consider smaller packaging to reduce volumetric weight charges',
        potentialSavings: (orderData.packageDetails.volumetricWeight_kg - orderData.packageDetails.deadWeight_kg) * 10
      });
    }
    
    if (orderData.orderType === 'BY_AIR') {
      recommendations.push({
        type: 'SERVICE',
        message: 'Air delivery selected. Ensure pickup location has airport connectivity',
        note: 'May require ground transport to nearest airport'
      });
    }
    
    return recommendations;
  }
}

module.exports = new LogisticsService();
