const logisticsService = require('../services/logisticsService');
const Order = require('../models/Order');
const { DeliveryHub, DeliveryAgent, DeliveryVehicle } = require('../models/Delivery');
const mongoose = require('mongoose');

class OrderController {

  async getAllOrders(req, res) {
    try {
      const { status, customerId, deliveryType, priority, limit = 20, page = 1 } = req.query;

      // Build filter object
      const filter = {};
      if (status) filter.status = status;
      if (deliveryType) filter.deliveryType = deliveryType;
      if (priority) filter.priority = priority;

      // M1-A Customer Ownership Verification
      if (req.customer.role === 'customer') {
        filter.customerId = req.customer._id;
      } else if (customerId) {
        filter.customerId = customerId;
      }

      const skip = (page - 1) * limit;

      const orders = await Order.find(filter)
        .populate('customerId', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Order.countDocuments(filter);

      res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving orders',
        error: error.message
      });
    }
  }

  async createOrder(req, res) {
    try {
      const orderData = req.body;

      // Get customer ID from authenticated user if not provided
      if (!orderData.customerId && req.customer) {
        orderData.customerId = req.customer._id;
        console.log('📋 Using authenticated customer ID for order creation');
      }

      // Validate required fields
      if (!orderData.customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      const result = await logisticsService.createOrder(orderData);

      // Email service removed - no notifications will be sent
      console.log('📧 Order created successfully - email notifications disabled');

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: result
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getOrder(req, res) {
    try {
      const { orderId } = req.params;

      const order = await Order.findById(orderId)
        .populate('customerId', 'name email phone')
        .lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // M1-A Customer Ownership Verification
      if (req.customer.role === 'customer') {
        if (order.customerId._id.toString() !== req.customer._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own orders.'
          });
        }
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getOrderByTrackingId(req, res) {
    try {
      const { trackingId } = req.params;

      const trackingQuery = [
        { sellerOrderId: trackingId },
        { 'shippingDetails.awb': trackingId }
      ];

      if (mongoose.Types.ObjectId.isValid(trackingId)) {
        trackingQuery.push({ _id: trackingId });
      }

      const order = await Order.findOne({ $or: trackingQuery }).select('_id');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found for the provided tracking ID'
        });
      }

      const trackingData = await logisticsService.getOrderTracking(order._id);

      res.status(200).json({
        success: true,
        message: 'Order tracking details retrieved successfully',
        data: trackingData
      });
    } catch (error) {
      console.error('Get order by tracking ID error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, location, remarks } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const updatedOrder = await logisticsService.updateOrderStatus(
        orderId,
        status,
        location,
        remarks
      );

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async trackOrder(req, res) {
    try {
      const { orderId } = req.params;

      const trackingData = await logisticsService.getOrderTracking(orderId);

      res.json({
        success: true,
        data: trackingData
      });
    } catch (error) {
      console.error('Track order error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCustomerOrders(req, res) {
    try {
      const { customerId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      // M1-A Customer Ownership Verification
      if (req.customer.role === 'customer' && customerId !== req.customer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own orders.'
        });
      }

      const query = { customerId };
      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('customerId', 'name email')
        .lean();

      const total = await Order.countDocuments(query);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error('Get customer orders error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async bulkUpdateOrders(req, res) {
    try {
      const { orderIds, status, location, remarks } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order IDs array is required'
        });
      }

      const updatePromises = orderIds.map(orderId =>
        logisticsService.updateOrderStatus(orderId, status, location, remarks)
      );

      const results = await Promise.allSettled(updatePromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      res.json({
        success: true,
        message: `Bulk update completed. ${successful} successful, ${failed} failed.`,
        data: {
          successful,
          failed,
          results: failed > 0 ? results.filter(r => r.status === 'rejected').map(r => r.reason.message) : []
        }
      });
    } catch (error) {
      console.error('Bulk update orders error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getOrderAnalytics(req, res) {
    try {
      const { startDate, endDate, status } = req.query;

      let matchStage = {};

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      if (status) {
        matchStage.status = status;
      }

      const analytics = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalValue: { $sum: '$paymentDetails.totalValue' },
            avgDeliveryTime: {
              $avg: {
                $divide: [
                  { $subtract: ['$shippingDetails.deliveredAt', '$createdAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              }
            },
            ordersByStatus: {
              $push: {
                status: '$status',
                count: 1
              }
            },
            ordersByType: {
              $push: {
                type: '$orderType',
                count: 1
              }
            }
          }
        }
      ]);

      // Get status distribution
      const statusDistribution = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get daily order trends
      const dailyTrends = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$paymentDetails.totalValue' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      res.json({
        success: true,
        data: {
          summary: analytics[0] || {},
          statusDistribution,
          dailyTrends
        }
      });
    } catch (error) {
      console.error('Get order analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  async deleteOrder(req, res) {
    try {
      const { orderId } = req.params;

      const order = await Order.findByIdAndDelete(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Restore resource availability
      if (order.routeOptimization) {
        if (order.routeOptimization.transitRoute?.[0]?.hub) {
          await DeliveryHub.findOneAndUpdate({ hubId: order.routeOptimization.transitRoute[0].hub }, { $inc: { 'capacity.currentLoad': -1 } });
        }
        if (order.routeOptimization.assignedVehicle?.vehicleId) {
          await DeliveryVehicle.findOneAndUpdate({ vehicleId: order.routeOptimization.assignedVehicle.vehicleId }, { $inc: { 'capacity.currentLoad': -1 }, status: 'AVAILABLE' });
        }
        if (order.routeOptimization.deliveryAgent?.agentId) {
          await DeliveryAgent.findOneAndUpdate({ agentId: order.routeOptimization.deliveryAgent.agentId }, { $inc: { 'currentCapacity.currentOrders': -1 }, status: 'AVAILABLE' });
        }
      }

      res.json({
        success: true,
        message: 'Order deleted successfully',
        data: { _id: orderId }
      });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  async assignResource(req, res) {
    try {
      const { orderId } = req.params;
      const { type, entityId, entityName } = req.body;
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      if (!order.routeOptimization) order.routeOptimization = {};

      if (type === 'HUB') {
        if (!order.routeOptimization.transitRoute) order.routeOptimization.transitRoute = [];
        if (order.routeOptimization.transitRoute.length === 0) {
          order.routeOptimization.transitRoute.push({ hub: entityId, status: 'PENDING' });
        } else {
          order.routeOptimization.transitRoute[0].hub = entityId;
        }
        await DeliveryHub.findOneAndUpdate({ hubId: entityId }, { $inc: { 'capacity.currentLoad': 1 } });
      } else if (type === 'VEHICLE') {
        order.routeOptimization.assignedVehicle = {
          vehicleId: entityId,
          type: entityName || 'Truck'
        };
        await DeliveryVehicle.findOneAndUpdate({ vehicleId: entityId }, { $inc: { 'capacity.currentLoad': 1 }, status: 'IN_TRANSIT' });
      } else if (type === 'AGENT') {
        order.routeOptimization.deliveryAgent = {
          agentId: entityId,
          name: entityName || 'Agent'
        };
        await DeliveryAgent.findOneAndUpdate({ agentId: entityId }, { $inc: { 'currentCapacity.currentOrders': 1 }, status: 'ON_DELIVERY' });
      } else {
        return res.status(400).json({ success: false, message: 'Invalid assignment type' });
      }

      await order.save();
      res.json({ success: true, message: `Successfully assigned ${type}`, data: order });
    } catch (error) {
      console.error('Assign resource error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new OrderController();
