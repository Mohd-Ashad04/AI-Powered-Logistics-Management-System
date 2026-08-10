const Customer = require('../models/Customer');
const Order = require('../models/Order');

class CustomerController {
  
  async getAllCustomers(req, res) {
    try {
      const customers = await Customer.find()
        .populate('orderHistory', 'orderId status createdAt')
        .sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        message: 'Customers retrieved successfully',
        data: customers,
        count: customers.length
      });
    } catch (error) {
      console.error('Get all customers error:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving customers',
        error: error.message
      });
    }
  }
  
  async createCustomer(req, res) {
    try {
      const customerData = req.body;
      
      // Check if customer already exists
      const existingCustomer = await Customer.findOne({ email: customerData.email });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this email already exists'
        });
      }

      const customer = new Customer(customerData);
      await customer.save();
      
      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCustomer(req, res) {
    try {
      const { customerId } = req.params;
      
      const customer = await Customer.findById(customerId)
        .populate({
          path: 'orderHistory',
          select: 'sellerOrderId status paymentDetails.totalValue createdAt',
          options: { limit: 10, sort: { createdAt: -1 } }
        });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const updateData = req.body;
      
      const customer = await Customer.findByIdAndUpdate(
        customerId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Customer updated successfully',
        data: customer
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async addCustomerAddress(req, res) {
    try {
      const { customerId } = req.params;
      const addressData = req.body;
      
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // If this is the first address or marked as default, make it default
      if (customer.addresses.length === 0 || addressData.isDefault) {
        customer.addresses.forEach(addr => addr.isDefault = false);
        addressData.isDefault = true;
      }

      customer.addresses.push(addressData);
      await customer.save();
      
      res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: customer
      });
    } catch (error) {
      console.error('Add customer address error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateCustomerAddress(req, res) {
    try {
      const { customerId, addressId } = req.params;
      const updateData = req.body;
      
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const address = customer.addresses.id(addressId);
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // If setting as default, unset other defaults
      if (updateData.isDefault) {
        customer.addresses.forEach(addr => {
          if (addr._id.toString() !== addressId) {
            addr.isDefault = false;
          }
        });
      }

      Object.assign(address, updateData);
      await customer.save();
      
      res.json({
        success: true,
        message: 'Address updated successfully',
        data: customer
      });
    } catch (error) {
      console.error('Update customer address error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteCustomerAddress(req, res) {
    try {
      const { customerId, addressId } = req.params;
      
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const addressIndex = customer.addresses.findIndex(addr => addr._id.toString() === addressId);
      if (addressIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      const wasDefault = customer.addresses[addressIndex].isDefault;
      customer.addresses.splice(addressIndex, 1);

      // If deleted address was default, make first remaining address default
      if (wasDefault && customer.addresses.length > 0) {
        customer.addresses[0].isDefault = true;
      }

      await customer.save();
      
      res.json({
        success: true,
        message: 'Address deleted successfully',
        data: customer
      });
    } catch (error) {
      console.error('Delete customer address error:', error);
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
      
      const query = { customerId };
      if (status) {
        query.status = status;
      }
      
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('sellerOrderId status paymentDetails shippingDetails timestamps trackingHistory')
        .lean();
      
      const total = await Order.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            current: parseInt(page),
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

  async getCustomerAnalytics(req, res) {
    try {
      const { customerId } = req.params;
      
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Get order analytics
      const orderStats = await Order.aggregate([
        { $match: { customerId: customer._id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$paymentDetails.totalValue' },
            avgOrderValue: { $avg: '$paymentDetails.totalValue' },
            ordersByStatus: {
              $push: {
                status: '$status',
                value: '$paymentDetails.totalValue'
              }
            }
          }
        }
      ]);

      // Get monthly order trends
      const monthlyTrends = await Order.aggregate([
        { $match: { customerId: customer._id } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            orders: { $sum: 1 },
            spent: { $sum: '$paymentDetails.totalValue' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]);

      // Calculate loyalty tier
      const totalSpent = orderStats[0]?.totalSpent || 0;
      const loyaltyTier = this._calculateLoyaltyTier(totalSpent);

      res.json({
        success: true,
        data: {
          customer: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
            joinDate: customer.createdAt,
            loyaltyPoints: customer.loyaltyPoints,
            loyaltyTier
          },
          orderSummary: orderStats[0] || {
            totalOrders: 0,
            totalSpent: 0,
            avgOrderValue: 0,
            ordersByStatus: []
          },
          monthlyTrends: monthlyTrends.reverse(),
          insights: this._generateCustomerInsights(orderStats[0], monthlyTrends, customer)
        }
      });
    } catch (error) {
      console.error('Get customer analytics error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async searchCustomers(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const searchRegex = new RegExp(q, 'i');
      const query = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ]
      };
      
      const customers = await Customer.find(query)
        .select('name email phone loyaltyPoints createdAt')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      
      const total = await Customer.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          customers,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error('Search customers error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Private helper methods
  _calculateLoyaltyTier(totalSpent) {
    if (totalSpent >= 50000) return 'PLATINUM';
    if (totalSpent >= 20000) return 'GOLD';
    if (totalSpent >= 5000) return 'SILVER';
    return 'BRONZE';
  }

  _generateCustomerInsights(orderStats, monthlyTrends, customer) {
    const insights = [];
    
    if (orderStats && orderStats.totalOrders === 0) {
      insights.push({
        type: 'NEW_CUSTOMER',
        message: 'New customer - consider offering welcome discount',
        action: 'OFFER_DISCOUNT'
      });
    }
    
    if (orderStats && orderStats.avgOrderValue > 2000) {
      insights.push({
        type: 'HIGH_VALUE',
        message: 'High-value customer - eligible for premium services',
        action: 'UPGRADE_SERVICE'
      });
    }
    
    if (monthlyTrends.length > 1) {
      const lastMonth = monthlyTrends[monthlyTrends.length - 1];
      const previousMonth = monthlyTrends[monthlyTrends.length - 2];
      
      if (lastMonth.orders < previousMonth.orders) {
        insights.push({
          type: 'DECLINING_ACTIVITY',
          message: 'Order frequency has decreased - consider re-engagement campaign',
          action: 'SEND_OFFER'
        });
      }
    }
    
    const daysSinceJoined = (new Date() - new Date(customer.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceJoined > 365 && orderStats && orderStats.totalOrders > 10) {
      insights.push({
        type: 'LOYAL_CUSTOMER',
        message: 'Long-term loyal customer - consider loyalty rewards',
        action: 'REWARD_LOYALTY'
      });
    }
    
    return insights;
  }
}

module.exports = new CustomerController();
