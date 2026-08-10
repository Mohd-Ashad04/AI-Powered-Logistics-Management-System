const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  sellerOrderId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: [
      'PENDING',           // Order created
      'ASSIGNED_PICKUP',   // Assigned to pickup agent
      'PICKED_UP',         // Picked up by agent
      'AT_ORIGIN_HUB',     // At origin city hub
      'DISPATCHED_FROM_ORIGIN', // Sent from origin hub
      'IN_TRANSIT',        // Moving between states
      'AT_DESTINATION_HUB', // Reached destination city hub
      'OUT_FOR_DELIVERY',  // Assigned to delivery agent
      'DELIVERED',         // Successfully delivered
      'CANCELLED',
      'RETURNED'
    ],
    default: 'PENDING'
  },
  orderType: {
    type: String,
    enum: ['NORMAL', 'HANDLE_WITH_CARE', 'BY_AIR', 'BY_ROAD'],
    default: 'NORMAL'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  pickupAddress: {
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    phone: String
  },
  recipientDetails: {
    name: { type: String, required: true },
    email: String,
    phone: { type: String, required: true },
    address: {
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' }
    }
  },
  packageDetails: {
    items: [{
      sku: String,
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
      weight_grams: Number,
      category: String
    }],
    deadWeight_kg: { type: Number, required: true },
    dimensions_cm: {
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true }
    },
    volumetricWeight_kg: Number,
    specialInstructions: String,
    fragile: { type: Boolean, default: false },
    perishable: { type: Boolean, default: false }
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['COD', 'PREPAID', 'CREDIT'],
      required: true
    },
    totalValue: { type: Number, required: true },
    codAmount: Number,
    taxes: {
      gst: Number,
      serviceTax: Number
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING'
    },
    transactionId: String,
    paidAt: Date,
    refundedAt: Date,
    stripePaymentIntentId: String
  },
  shippingDetails: {
    courierPartner: String,
    awb: String,
    shippingLabelUrl: String,
    manifestUrl: String,
    rate: {
      chargedToSeller_inr: Number,
      courierCost_inr: Number,
      fuelSurcharge: Number,
      handlingCharges: Number,
      codCharges: Number
    },
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    deliveryAttempts: { type: Number, default: 0 },
    shippedAt: Date,
    deliveredAt: Date
  },
  workflowTracking: {
    pickupAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAgent'
    },
    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAgent'
    },
    originHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryHub'
    },
    destinationHub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryHub'
    },
    currentLocation: {
      hubId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryHub'
      },
      agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryAgent'
      },
      lastUpdated: { type: Date, default: Date.now }
    },
    notifications: [{
      recipient: {
        type: String,
        enum: ['PICKUP_AGENT', 'DELIVERY_AGENT', 'HUB_MANAGER', 'CUSTOMER']
      },
      message: String,
      sentAt: { type: Date, default: Date.now },
      status: {
        type: String,
        enum: ['SENT', 'DELIVERED', 'FAILED'],
        default: 'SENT'
      }
    }],
    statusHistory: [{
      status: String,
      timestamp: { type: Date, default: Date.now },
      location: String,
      handledBy: {
        type: String, // Agent ID or Hub ID
        agentName: String
      },
      remarks: String
    }]
  },
  routeOptimization: {
    transitRoute: [{
      hub: String,
      state: String,
      city: String,
      area: String,
      estimatedArrival: Date,
      actualArrival: Date,
      status: String
    }],
    assignedVehicle: {
      vehicleType: String,
      vehicleId: String,
      driverName: String,
      driverPhone: String
    },
    deliveryAgent: {
      agentId: String,
      name: String,
      phone: String,
      area: {
        type: String,
        enum: ['NORTH', 'SOUTH', 'EAST', 'WEST']
      }
    }
  },
  trackingHistory: [{
    timestamp: { type: Date, default: Date.now },
    status: String,
    location: String,
    remarks: String,
    updatedBy: String
  }],
  aiInsights: {
    riskScore: { type: Number, min: 0, max: 100 },
    deliveryPrediction: {
      confidence: Number,
      factors: [String]
    },
    pricingFactors: {
      distance: Number,
      weight: Number,
      volume: Number,
      urgency: Number,
      special_handling: Number
    }
  }
}, {
  timestamps: true
});

// Pre-save middleware
orderSchema.pre('save', function(next) {
  next();
});

// Index for better query performance
orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ 'pickupAddress.pincode': 1, 'recipientDetails.address.pincode': 1 });
orderSchema.index({ sellerOrderId: 1 });
orderSchema.index({ 'shippingDetails.awb': 1 });

module.exports = mongoose.model('Order', orderSchema);
