const logisticsService = require('../services/logisticsService');
const aiService = require('../services/aiService');

class PricingController {
  
  async calculatePricing(req, res) {
    try {
      let { items, pickupPincode, dropPincode, deliveryType, orderType, priority } = req.body;
      
      // Handle test data format transformation
      if (!items && req.body.packageDetails) {
        const orderData = req.body;
        items = orderData.packageDetails.items || [
          {
            name: orderData.packageDetails.description || 'Package',
            weight: orderData.packageDetails.deadWeight_kg || 1,
            dimensions: orderData.packageDetails.dimensions || {
              length: 30, width: 20, height: 15
            },
            value: 1000,
            quantity: 1
          }
        ];
        pickupPincode = orderData.pickupAddress?.pincode;
        dropPincode = orderData.recipientDetails?.address?.pincode;
        orderType = orderData.orderType || 'standard';
        priority = orderData.priority || 'medium';

        console.log('📦 Transformed test data format for pricing calculation');
        
        // Use AI service for better pricing with full order data
        try {
          const aiPricing = await aiService.generatePricing(orderData);
          return res.status(200).json({
            success: true,
            message: 'AI-powered pricing calculated successfully',
            data: aiPricing,
            source: 'ai_service'
          });
        } catch (aiError) {
          console.log('⚠️  AI pricing failed, falling back to standard calculation');
        }
      }
      
      // Validate required fields
      if (!items || !pickupPincode || !dropPincode) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: items, pickupPincode, dropPincode'
        });
      }

      // Calculate basic pricing
      let basePrice = 0;
      let weightCharge = 0;
      let volumeCharge = 0;
      let valueCharge = 0;
      
      items.forEach(item => {
        basePrice += 50; // Base price per item
        weightCharge += (item.weight || 1) * 15; // ₹15 per kg
        
        const volume = (item.dimensions?.length || 10) * (item.dimensions?.width || 10) * (item.dimensions?.height || 10) / 1000;
        volumeCharge += volume * 5; // ₹5 per cubic unit
        
        valueCharge += (item.value || 0) * 0.001; // 0.1% of item value
      });
      
      // Distance calculation (simplified)
      const distance = Math.abs(parseInt(pickupPincode) - parseInt(dropPincode)) / 1000;
      const distanceCharge = Math.max(distance * 2, 50);
      
      // Priority charges
      let priorityMultiplier = 1;
      if (priority === 'high') priorityMultiplier = 1.5;
      if (priority === 'critical') priorityMultiplier = 2;
      
      // Delivery type charges
      let deliveryMultiplier = 1;
      if (deliveryType === 'express') deliveryMultiplier = 1.5;
      if (deliveryType === 'scheduled') deliveryMultiplier = 1.2;
      
      // Order type charges
      let orderTypeCharge = 0;
      if (orderType === 'handle_with_care') orderTypeCharge = 100;
      if (orderType === 'by_air') orderTypeCharge = 200;
      
      const subtotal = (basePrice + weightCharge + volumeCharge + valueCharge + distanceCharge) * priorityMultiplier * deliveryMultiplier + orderTypeCharge;
      const gst = subtotal * 0.18; // 18% GST
      const totalPrice = subtotal + gst;
      
      // Estimated delivery time
      let estimatedHours = 24; // Base 24 hours
      if (deliveryType === 'express') estimatedHours = 12;
      if (priority === 'critical') estimatedHours = Math.floor(estimatedHours / 2);
      
      const estimatedDelivery = new Date(Date.now() + estimatedHours * 60 * 60 * 1000);
      
      res.json({
        success: true,
        message: 'Pricing calculated successfully',
        data: {
          pricing: {
            basePrice: Math.round(basePrice),
            weightCharge: Math.round(weightCharge),
            volumeCharge: Math.round(volumeCharge),
            valueCharge: Math.round(valueCharge),
            distanceCharge: Math.round(distanceCharge),
            orderTypeCharge,
            priorityMultiplier,
            deliveryMultiplier,
            subtotal: Math.round(subtotal),
            gst: Math.round(gst),
            totalPrice: Math.round(totalPrice)
          },
          estimation: {
            estimatedDeliveryTime: `${estimatedHours} hours`,
            estimatedDeliveryDate: estimatedDelivery,
            distance: `${Math.round(distance)} km`
          },
          breakdown: {
            items: items.length,
            totalWeight: items.reduce((sum, item) => sum + (item.weight || 1), 0),
            totalValue: items.reduce((sum, item) => sum + (item.value || 0), 0),
            pickupPincode,
            dropPincode,
            deliveryType,
            orderType,
            priority
          }
        }
      });
    } catch (error) {
      console.error('Calculate pricing error:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating pricing',
        error: error.message
      });
    }
  }
  
  async getPricingEstimate(req, res) {
    try {
      const pricingRequest = req.body;
      
      // Validate required fields
      const requiredFields = ['pickupAddress', 'deliveryAddress', 'packageDetails', 'paymentDetails'];
      const missingFields = requiredFields.filter(field => !pricingRequest[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      const result = await logisticsService.getPricingEstimate(pricingRequest);
      
      res.json({
        success: true,
        message: 'Pricing estimate generated successfully',
        data: result
      });
    } catch (error) {
      console.error('Pricing estimate error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async comparePricingOptions(req, res) {
    try {
      const pricingRequest = req.body;
      
      // Generate pricing for different order types
      const orderTypes = ['NORMAL', 'HANDLE_WITH_CARE', 'BY_AIR', 'BY_ROAD'];
      const comparisons = [];

      for (const orderType of orderTypes) {
        try {
          const request = { ...pricingRequest, orderType };
          const result = await logisticsService.getPricingEstimate(request);
          
          comparisons.push({
            orderType,
            pricing: result.pricing,
            deliveryEstimation: result.deliveryEstimation,
            recommendations: result.serviceRecommendations
          });
        } catch (error) {
          console.error(`Error getting pricing for ${orderType}:`, error);
        }
      }

      // Sort by total cost
      comparisons.sort((a, b) => a.pricing.totalCost - b.pricing.totalCost);

      res.json({
        success: true,
        message: 'Pricing comparison generated successfully',
        data: {
          comparisons,
          recommendation: comparisons[0], // Cheapest option
          premiumOption: comparisons.find(c => c.orderType === 'BY_AIR') || comparisons[comparisons.length - 1]
        }
      });
    } catch (error) {
      console.error('Pricing comparison error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getBulkPricingEstimate(req, res) {
    try {
      const { orders } = req.body;
      
      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Orders array is required'
        });
      }

      const pricingPromises = orders.map(async (order, index) => {
        try {
          const result = await logisticsService.getPricingEstimate(order);
          return {
            index,
            success: true,
            ...result
          };
        } catch (error) {
          return {
            index,
            success: false,
            error: error.message
          };
        }
      });

      const results = await Promise.all(pricingPromises);
      
      // Calculate bulk pricing summary
      const successful = results.filter(r => r.success);
      const totalCost = successful.reduce((sum, r) => sum + r.pricing.totalCost, 0);
      const avgDeliveryDays = successful.reduce((sum, r) => sum + r.deliveryEstimation.estimatedDays, 0) / successful.length;

      res.json({
        success: true,
        message: 'Bulk pricing estimate completed',
        data: {
          results,
          summary: {
            totalOrders: orders.length,
            successfulEstimates: successful.length,
            failedEstimates: results.length - successful.length,
            totalCost: totalCost,
            averageDeliveryDays: Math.round(avgDeliveryDays * 10) / 10,
            bulkDiscount: totalCost > 10000 ? totalCost * 0.05 : 0 // 5% bulk discount for orders > ₹10,000
          }
        }
      });
    } catch (error) {
      console.error('Bulk pricing estimate error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getPricingTrends(req, res) {
    try {
      const { 
        fromState, 
        toState, 
        orderType = 'NORMAL',
        days = 30 
      } = req.query;

      // This would typically pull from historical data
      // For demo purposes, generating sample trends
      const trends = [];
      const basePrice = 65;
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Simulate price fluctuations based on various factors
        const seasonalFactor = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.1 + 1;
        const randomFactor = (Math.random() - 0.5) * 0.2 + 1;
        const weekendFactor = [0, 6].includes(date.getDay()) ? 0.9 : 1; // Lower prices on weekends
        
        const price = Math.round(basePrice * seasonalFactor * randomFactor * weekendFactor);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          price: price,
          fuelSurcharge: Math.round(price * 0.15),
          demand: Math.floor(Math.random() * 100) + 20 // 20-120 orders
        });
      }

      res.json({
        success: true,
        data: {
          route: `${fromState} → ${toState}`,
          orderType,
          period: `${days} days`,
          trends,
          insights: {
            avgPrice: Math.round(trends.reduce((sum, t) => sum + t.price, 0) / trends.length),
            minPrice: Math.min(...trends.map(t => t.price)),
            maxPrice: Math.max(...trends.map(t => t.price)),
            recommendation: "Prices tend to be lower on weekends and during off-peak seasons"
          }
        }
      });
    } catch (error) {
      console.error('Pricing trends error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getZonalPricing(req, res) {
    try {
      const { fromPincode, toPincode } = req.query;
      
      if (!fromPincode || !toPincode) {
        return res.status(400).json({
          success: false,
          message: 'From and to pincodes are required'
        });
      }

      // Zone classification based on pincode patterns
      const zones = {
        metro: ['110', '400', '560', '600', '700', '500'], // Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad
        tier1: ['380', '411', '462', '452', '641'], // Ahmedabad, Pune, Bhopal, Indore, Coimbatore
        tier2: ['395', '302', '226', '321', '143'], // Surat, Jaipur, Lucknow, Bharatpur, Amritsar
        remote: [] // All others
      };

      const getZoneType = (pincode) => {
        const prefix = pincode.substring(0, 3);
        for (const [zone, prefixes] of Object.entries(zones)) {
          if (prefixes.includes(prefix)) return zone;
        }
        return 'remote';
      };

      const fromZone = getZoneType(fromPincode);
      const toZone = getZoneType(toPincode);

      // Zonal pricing matrix
      const zonalRates = {
        'metro-metro': { base: 45, multiplier: 1.0 },
        'metro-tier1': { base: 55, multiplier: 1.1 },
        'metro-tier2': { base: 65, multiplier: 1.2 },
        'metro-remote': { base: 85, multiplier: 1.4 },
        'tier1-tier1': { base: 50, multiplier: 1.0 },
        'tier1-tier2': { base: 60, multiplier: 1.1 },
        'tier1-remote': { base: 75, multiplier: 1.3 },
        'tier2-tier2': { base: 55, multiplier: 1.0 },
        'tier2-remote': { base: 70, multiplier: 1.2 },
        'remote-remote': { base: 65, multiplier: 1.1 }
      };

      const routeKey = `${fromZone}-${toZone}`;
      const reverseRouteKey = `${toZone}-${fromZone}`;
      const pricing = zonalRates[routeKey] || zonalRates[reverseRouteKey] || zonalRates['remote-remote'];

      res.json({
        success: true,
        data: {
          route: {
            from: { pincode: fromPincode, zone: fromZone },
            to: { pincode: toPincode, zone: toZone }
          },
          pricing: {
            baseRate: pricing.base,
            multiplier: pricing.multiplier,
            estimatedCost: pricing.base * pricing.multiplier
          },
          serviceFeatures: {
            deliveryTime: fromZone === 'metro' && toZone === 'metro' ? '1-2 days' : 
                         fromZone !== 'remote' && toZone !== 'remote' ? '2-4 days' : '4-7 days',
            trackingAvailable: true,
            codAvailable: true,
            insuranceAvailable: fromZone !== 'remote' && toZone !== 'remote'
          }
        }
      });
    } catch (error) {
      console.error('Zonal pricing error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new PricingController();
