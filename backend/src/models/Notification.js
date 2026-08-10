const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ['AGENT', 'HUB_MANAGER', 'CUSTOMER', 'ADMIN'],
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    enum: ['DeliveryAgent', 'DeliveryHub', 'Customer', 'User'],
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  type: {
    type: String,
    enum: [
      'PICKUP_ASSIGNED',
      'PICKUP_READY',
      'PICKUP_COMPLETED',
      'DELIVERY_ASSIGNED',
      'DELIVERY_READY',
      'DELIVERY_COMPLETED',
      'HUB_RECEIVED',
      'HUB_DISPATCHED',
      'INCOMING_PACKAGE',
      'STATUS_UPDATE',
      'DELAY_ALERT',
      'DELIVERY_ATTEMPT_FAILED'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    orderId: String,
    sellerOrderId: String,
    customerName: String,
    pickupAddress: String,
    deliveryAddress: String,
    priority: String,
    expectedTime: Date,
    actionUrl: String
  },
  channels: {
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ'],
    default: 'PENDING'
  },
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  attempts: {
    type: Number,
    default: 0
  },
  lastAttemptAt: Date,
  errorMessage: String,
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ orderId: 1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Methods
notificationSchema.methods.markAsRead = function() {
  this.status = 'READ';
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsSent = function() {
  this.status = 'SENT';
  this.sentAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsDelivered = function() {
  this.status = 'DELIVERED';
  this.deliveredAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'FAILED';
  this.errorMessage = errorMessage;
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  return this.save();
};

// Static methods
notificationSchema.statics.createPickupNotification = function(order, agent) {
  return this.create({
    recipientType: 'AGENT',
    recipientId: agent._id,
    recipientModel: 'DeliveryAgent',
    orderId: order._id,
    type: 'PICKUP_ASSIGNED',
    title: 'New Pickup Assigned',
    message: `You have been assigned a new pickup: ${order.sellerOrderId}`,
    data: {
      orderId: order._id.toString(),
      sellerOrderId: order.sellerOrderId,
      customerName: order.recipientDetails.name,
      pickupAddress: `${order.pickupAddress.addressLine1}, ${order.pickupAddress.city}`,
      priority: order.priority,
      actionUrl: `/agent/pickup/${order._id}`
    },
    channels: {
      push: true,
      sms: agent.notifications?.sms || false
    }
  });
};

notificationSchema.statics.createDeliveryNotification = function(order, agent) {
  return this.create({
    recipientType: 'AGENT',
    recipientId: agent._id,
    recipientModel: 'DeliveryAgent',
    orderId: order._id,
    type: 'DELIVERY_ASSIGNED',
    title: 'New Delivery Assigned',
    message: `You have been assigned a new delivery: ${order.sellerOrderId}`,
    data: {
      orderId: order._id.toString(),
      sellerOrderId: order.sellerOrderId,
      customerName: order.recipientDetails.name,
      deliveryAddress: `${order.recipientDetails.address.addressLine1}, ${order.recipientDetails.address.city}`,
      priority: order.priority,
      actionUrl: `/agent/delivery/${order._id}`
    },
    channels: {
      push: true,
      sms: agent.notifications?.sms || false
    }
  });
};

notificationSchema.statics.createStatusUpdateNotification = function(order, status, location) {
  // Notify customer about status update
  return this.create({
    recipientType: 'CUSTOMER',
    recipientId: order.customerId,
    recipientModel: 'Customer',
    orderId: order._id,
    type: 'STATUS_UPDATE',
    title: 'Order Status Update',
    message: `Your order ${order.sellerOrderId} is now ${status.toLowerCase().replace('_', ' ')}`,
    data: {
      orderId: order._id.toString(),
      sellerOrderId: order.sellerOrderId,
      status: status,
      location: location,
      actionUrl: `/track/${order._id}`
    },
    channels: {
      push: true,
      sms: true
    }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
