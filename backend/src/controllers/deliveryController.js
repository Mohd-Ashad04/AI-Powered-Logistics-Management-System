const { DeliveryHub, DeliveryAgent, DeliveryVehicle } = require('../models/Delivery');
const logisticsService = require('../services/logisticsService');
const Order = require('../models/Order');

class DeliveryController {
  
  // Delivery Hub Management
  async createDeliveryHub(req, res) {
    try {
      const hubData = req.body;
      
      const hub = new DeliveryHub(hubData);
      await hub.save();
      
      res.status(201).json({
        success: true,
        message: 'Delivery hub created successfully',
        data: hub
      });
    } catch (error) {
      console.error('Create delivery hub error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getDeliveryHubs(req, res) {
    try {
      const { state, city, area, isActive } = req.query;
      
      const query = { isActive: isActive === 'false' ? false : true };
      if (state) query.state = new RegExp(state, 'i');
      if (city) query.city = new RegExp(city, 'i');
      if (area) query.area = area;
      
      const hubs = await DeliveryHub.find(query).sort({ state: 1, city: 1, area: 1 });
      
      res.json({
        success: true,
        data: hubs
      });
    } catch (error) {
      console.error('Get delivery hubs error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateDeliveryHub(req, res) {
    try {
      const { hubId } = req.params;
      const updateData = req.body;
      
      const hub = await DeliveryHub.findOneAndUpdate(
        { hubId },
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!hub) {
        return res.status(404).json({
          success: false,
          message: 'Delivery hub not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Delivery hub updated successfully',
        data: hub
      });
    } catch (error) {
      console.error('Update delivery hub error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delivery Agent Management
  async createDeliveryAgent(req, res) {
    try {
      const agentData = req.body;
      
      const agent = new DeliveryAgent(agentData);
      await agent.save();
      
      res.status(201).json({
        success: true,
        message: 'Delivery agent created successfully',
        data: agent
      });
    } catch (error) {
      console.error('Create delivery agent error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getDeliveryAgents(req, res) {
    try {
      const { hubId, area, status, isActive } = req.query;
      
      const query = { isActive: isActive === 'false' ? false : true };
      if (hubId) query.hubId = hubId;
      if (area) query.area = area;
      if (status) query.status = status;
      
      const agents = await DeliveryAgent.find(query)
        .populate('assignedOrders.orderId', 'sellerOrderId recipientDetails.address status')
        .sort({ name: 1 });
      
      res.json({
        success: true,
        data: agents
      });
    } catch (error) {
      console.error('Get delivery agents error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateDeliveryAgent(req, res) {
    try {
      const { agentId } = req.params;
      const updateData = req.body;
      
      const agent = await DeliveryAgent.findOneAndUpdate(
        { agentId },
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Delivery agent not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Delivery agent updated successfully',
        data: agent
      });
    } catch (error) {
      console.error('Update delivery agent error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async assignOrderToAgent(req, res) {
    try {
      const { agentId } = req.params;
      const { orderIds, priority = 'MEDIUM' } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds)) {
        return res.status(400).json({
          success: false,
          message: 'Order IDs array is required'
        });
      }

      const agent = await DeliveryAgent.findOne({ agentId });
      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Delivery agent not found'
        });
      }

      // Check agent capacity
      const newOrderCount = agent.currentCapacity.currentOrders + orderIds.length;
      if (newOrderCount > agent.currentCapacity.maxOrders) {
        return res.status(400).json({
          success: false,
          message: `Agent capacity exceeded. Can only handle ${agent.currentCapacity.maxOrders - agent.currentCapacity.currentOrders} more orders`
        });
      }

      // Assign orders to agent
      const newAssignments = orderIds.map(orderId => ({
        orderId,
        assignedAt: new Date(),
        priority
      }));

      agent.assignedOrders.push(...newAssignments);
      agent.currentCapacity.currentOrders = newOrderCount;
      agent.status = 'ON_DELIVERY';

      await agent.save();

      // Update orders with agent assignment
      await Order.updateMany(
        { _id: { $in: orderIds } },
        {
          $set: {
            'routeOptimization.deliveryAgent': {
              agentId: agent.agentId,
              name: agent.name,
              phone: agent.phone,
              area: agent.area
            },
            status: 'OUT_FOR_DELIVERY'
          },
          $push: {
            trackingHistory: {
              timestamp: new Date(),
              status: 'Out for Delivery',
              location: `${agent.area} Area`,
              remarks: `Assigned to delivery agent ${agent.name}`
            }
          }
        }
      );

      res.json({
        success: true,
        message: 'Orders assigned to agent successfully',
        data: {
          agent: agent,
          assignedOrderCount: orderIds.length
        }
      });
    } catch (error) {
      console.error('Assign order to agent error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delivery Vehicle Management
  async createDeliveryVehicle(req, res) {
    try {
      const vehicleData = req.body;
      
      const vehicle = new DeliveryVehicle(vehicleData);
      await vehicle.save();
      
      res.status(201).json({
        success: true,
        message: 'Delivery vehicle created successfully',
        data: vehicle
      });
    } catch (error) {
      console.error('Create delivery vehicle error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getDeliveryVehicles(req, res) {
    try {
      const { type, status, fromState, toState, isActive } = req.query;
      
      const query = { isActive: isActive === 'false' ? false : true };
      if (type) query.type = type;
      if (status) query.status = status;
      if (fromState) query['route.fromState'] = fromState;
      if (toState) query['route.toState'] = toState;
      
      const vehicles = await DeliveryVehicle.find(query)
        .populate('assignedOrders.orderId', 'sellerOrderId pickupAddress recipientDetails.address')
        .sort({ 'driver.name': 1 });
      
      res.json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      console.error('Get delivery vehicles error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async assignOrderToVehicle(req, res) {
    try {
      const { vehicleId } = req.params;
      const { orderIds, priority = 'MEDIUM' } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds)) {
        return res.status(400).json({
          success: false,
          message: 'Order IDs array is required'
        });
      }

      const vehicle = await DeliveryVehicle.findOne({ vehicleId });
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Delivery vehicle not found'
        });
      }

      // Check vehicle capacity
      const newOrderCount = vehicle.assignedOrders.length + orderIds.length;
      if (newOrderCount > vehicle.capacity.maxOrders) {
        return res.status(400).json({
          success: false,
          message: `Vehicle capacity exceeded. Can only handle ${vehicle.capacity.maxOrders - vehicle.assignedOrders.length} more orders`
        });
      }

      // Assign orders to vehicle
      const newAssignments = orderIds.map(orderId => ({
        orderId,
        loadedAt: new Date(),
        priority
      }));

      vehicle.assignedOrders.push(...newAssignments);
      vehicle.status = 'IN_TRANSIT';

      await vehicle.save();

      // Update orders with vehicle assignment
      await Order.updateMany(
        { _id: { $in: orderIds } },
        {
          $set: {
            'routeOptimization.assignedVehicle': {
              type: vehicle.type,
              vehicleId: vehicle.vehicleId,
              driverName: vehicle.driver.name,
              driverPhone: vehicle.driver.phone
            },
            status: 'IN_TRANSIT'
          },
          $push: {
            trackingHistory: {
              timestamp: new Date(),
              status: 'In Transit',
              location: vehicle.currentLocation.state || 'Loading Hub',
              remarks: `Loaded in ${vehicle.type} - ${vehicle.registrationNumber}`
            }
          }
        }
      );

      res.json({
        success: true,
        message: 'Orders assigned to vehicle successfully',
        data: {
          vehicle: vehicle,
          assignedOrderCount: orderIds.length
        }
      });
    } catch (error) {
      console.error('Assign order to vehicle error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Route Optimization
  async optimizeDeliveryRoutes(req, res) {
    try {
      const { hubId, date } = req.body;
      
      if (!hubId) {
        return res.status(400).json({
          success: false,
          message: 'Hub ID is required'
        });
      }

      const optimizedRoutes = await logisticsService.optimizeDeliveryRoute(
        hubId,
        date ? new Date(date) : new Date()
      );
      
      res.json({
        success: true,
        message: 'Delivery routes optimized successfully',
        data: optimizedRoutes
      });
    } catch (error) {
      console.error('Optimize delivery routes error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delivery Performance Analytics
  async getDeliveryAnalytics(req, res) {
    try {
      const { hubId, agentId, startDate, endDate } = req.query;
      
      let matchStage = {};
      
      if (hubId) {
        const agents = await DeliveryAgent.find({ hubId }).select('agentId');
        const agentIds = agents.map(a => a.agentId);
        matchStage['routeOptimization.deliveryAgent.agentId'] = { $in: agentIds };
      }
      
      if (agentId) {
        matchStage['routeOptimization.deliveryAgent.agentId'] = agentId;
      }
      
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      // Overall delivery metrics
      const deliveryMetrics = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalDeliveries: {
              $sum: {
                $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0]
              }
            },
            totalAttempts: { $sum: '$shippingDetails.deliveryAttempts' },
            avgDeliveryTime: {
              $avg: {
                $divide: [
                  { $subtract: ['$shippingDetails.deliveredAt', '$shippingDetails.shippedAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              }
            },
            onTimeDeliveries: {
              $sum: {
                $cond: [
                  { $lte: ['$shippingDetails.deliveredAt', '$shippingDetails.estimatedDeliveryDate'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      // Agent performance
      const agentPerformance = await Order.aggregate([
        { $match: { ...matchStage, 'routeOptimization.deliveryAgent.agentId': { $exists: true } } },
        {
          $group: {
            _id: '$routeOptimization.deliveryAgent.agentId',
            agentName: { $first: '$routeOptimization.deliveryAgent.name' },
            totalDeliveries: {
              $sum: {
                $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0]
              }
            },
            successfulDeliveries: {
              $sum: {
                $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0]
              }
            },
            avgDeliveryTime: {
              $avg: {
                $divide: [
                  { $subtract: ['$shippingDetails.deliveredAt', '$shippingDetails.shippedAt'] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        },
        { $sort: { totalDeliveries: -1 } },
        { $limit: 10 }
      ]);

      // Daily delivery trends
      const dailyTrends = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$shippingDetails.deliveredAt' }
            },
            deliveries: {
              $sum: {
                $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0]
              }
            },
            attempts: { $sum: '$shippingDetails.deliveryAttempts' }
          }
        },
        { $match: { '_id': { $ne: null } } },
        { $sort: { '_id': 1 } }
      ]);

      const metrics = deliveryMetrics[0] || {};
      const onTimePercentage = metrics.totalDeliveries > 0 
        ? Math.round((metrics.onTimeDeliveries / metrics.totalDeliveries) * 100)
        : 0;

      res.json({
        success: true,
        data: {
          summary: {
            totalDeliveries: metrics.totalDeliveries || 0,
            avgDeliveryTime: Math.round((metrics.avgDeliveryTime || 0) * 10) / 10,
            onTimeDeliveryRate: onTimePercentage,
            firstAttemptSuccessRate: metrics.totalAttempts > 0 
              ? Math.round((metrics.totalDeliveries / metrics.totalAttempts) * 100)
              : 0
          },
          agentPerformance,
          dailyTrends,
          insights: this._generateDeliveryInsights(metrics, agentPerformance)
        }
      });
    } catch (error) {
      console.error('Get delivery analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Initialize delivery network for a new region
  async initializeDeliveryNetwork(req, res) {
    try {
      const { state, cities } = req.body;
      
      if (!state || !cities || !Array.isArray(cities)) {
        return res.status(400).json({
          success: false,
          message: 'State and cities array are required'
        });
      }

      const createdResources = {
        hubs: [],
        agents: [],
        vehicles: []
      };

      // Create hubs for each city with 4 areas each
      const areas = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
      
      for (const city of cities) {
        for (const area of areas) {
          const hub = await DeliveryHub.create({
            hubId: `${state.replace(/\s+/g, '').toUpperCase()}-${city.replace(/\s+/g, '').toUpperCase()}-${area}`,
            state,
            city,
            area,
            serviceAreas: [`${city.toLowerCase()}_${area.toLowerCase()}`]
          });
          createdResources.hubs.push(hub);

          // Create 4 delivery agents per area
          for (let i = 1; i <= 4; i++) {
            const agent = await DeliveryAgent.create({
              agentId: `${hub.hubId}-AGENT-${i}`,
              name: `Agent ${i} - ${area}`,
              phone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
              hubId: hub.hubId,
              area,
              vehicleType: i <= 2 ? 'BIKE' : 'SCOOTER'
            });
            createdResources.agents.push(agent);
          }
        }
      }

      // Create interstate vehicles (one for each state pair)
      const vehicleTypes = ['MINI_TRUCK', 'TRUCK', 'TEMPO'];
      for (let i = 0; i < 3; i++) {
        const vehicle = await DeliveryVehicle.create({
          vehicleId: `${state.replace(/\s+/g, '').toUpperCase()}-VH-${i + 1}`,
          type: vehicleTypes[i],
          registrationNumber: `${state.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 90) + 10}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9000) + 1000}`,
          capacity: {
            maxWeight_kg: vehicleTypes[i] === 'TRUCK' ? 5000 : vehicleTypes[i] === 'MINI_TRUCK' ? 1500 : 1000,
            maxVolume_cbm: vehicleTypes[i] === 'TRUCK' ? 25 : vehicleTypes[i] === 'MINI_TRUCK' ? 8 : 6,
            maxOrders: vehicleTypes[i] === 'TRUCK' ? 500 : 300
          },
          route: {
            fromState: state,
            serviceStates: [state]
          },
          driver: {
            name: `Driver ${i + 1}`,
            phone: `8${Math.floor(Math.random() * 900000000) + 100000000}`,
            licenseNumber: `DL${Math.floor(Math.random() * 9000000000000) + 1000000000000}`
          }
        });
        createdResources.vehicles.push(vehicle);
      }

      res.status(201).json({
        success: true,
        message: `Delivery network initialized for ${state}`,
        data: {
          summary: {
            state,
            cities: cities.length,
            hubsCreated: createdResources.hubs.length,
            agentsCreated: createdResources.agents.length,
            vehiclesCreated: createdResources.vehicles.length
          },
          resources: createdResources
        }
      });
    } catch (error) {
      console.error('Initialize delivery network error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Private helper methods
  _generateDeliveryInsights(metrics, agentPerformance) {
    const insights = [];
    
    if (metrics.avgDeliveryTime > 3) {
      insights.push({
        type: 'PERFORMANCE_ISSUE',
        message: 'Average delivery time is above target (3 days)',
        recommendation: 'Review route optimization and agent allocation'
      });
    }
    
    const onTimeRate = metrics.totalDeliveries > 0 
      ? (metrics.onTimeDeliveries / metrics.totalDeliveries) * 100
      : 0;
    
    if (onTimeRate < 80) {
      insights.push({
        type: 'ON_TIME_ISSUE',
        message: `On-time delivery rate is ${Math.round(onTimeRate)}% (target: 80%+)`,
        recommendation: 'Improve delivery time estimates and agent training'
      });
    }
    
    if (agentPerformance.length > 0) {
      const topPerformer = agentPerformance[0];
      const lowPerformer = agentPerformance[agentPerformance.length - 1];
      
      if (topPerformer.totalDeliveries > lowPerformer.totalDeliveries * 2) {
        insights.push({
          type: 'PERFORMANCE_GAP',
          message: 'Significant performance gap between agents',
          recommendation: 'Provide additional training for underperforming agents'
        });
      }
    }
    
    return insights;
  }
}

module.exports = new DeliveryController();
