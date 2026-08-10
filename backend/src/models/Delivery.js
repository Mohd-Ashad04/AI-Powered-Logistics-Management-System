const mongoose = require('mongoose');

const deliveryHubSchema = new mongoose.Schema({
  hubId: {
    type: String,
    required: true,
    unique: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  area: {
    type: String,
    enum: ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL'],
    required: true
  },
  address: {
    addressLine1: String,
    addressLine2: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  capacity: {
    maxOrders: { type: Number, default: 1000 },
    currentLoad: { type: Number, default: 0 },
    maxWeight_kg: { type: Number, default: 10000 }
  },
  operatingHours: {
    start: String, // "09:00"
    end: String,   // "21:00"
    timezone: { type: String, default: 'Asia/Kolkata' }
  },
  serviceAreas: [String], // Array of pincodes this hub serves
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const deliveryAgentSchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: String,
  hubId: {
    type: String,
    required: true
  },
  area: {
    type: String,
    enum: ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL'],
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['BIKE', 'SCOOTER', 'CYCLE', 'VAN'],
    default: 'BIKE'
  },
  vehicleNumber: String,
  currentCapacity: {
    maxOrders: { type: Number, default: 20 },
    currentOrders: { type: Number, default: 0 },
    maxWeight_kg: { type: Number, default: 50 }
  },
  ratings: {
    average: { type: Number, default: 5.0 },
    totalRatings: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'ON_DELIVERY', 'OFF_DUTY', 'BREAK'],
    default: 'AVAILABLE'
  },
  currentLocation: {
    lat: Number,
    lng: Number,
    lastUpdated: Date
  },
  assignedOrders: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    assignedAt: Date,
    priority: String
  }],
  workingHours: {
    start: String,
    end: String
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const deliveryVehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['MINI_TRUCK', 'TRUCK', 'TEMPO', 'CONTAINER'],
    required: true
  },
  registrationNumber: {
    type: String,
    required: true
  },
  capacity: {
    maxWeight_kg: { type: Number, required: true },
    maxVolume_cbm: { type: Number, required: true },
    maxOrders: { type: Number, default: 500 }
  },
  route: {
    fromState: String,
    toState: String,
    serviceStates: [String]
  },
  driver: {
    name: String,
    phone: String,
    licenseNumber: String
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'IN_TRANSIT', 'LOADING', 'MAINTENANCE'],
    default: 'AVAILABLE'
  },
  currentLocation: {
    state: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    lastUpdated: Date
  },
  assignedOrders: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    loadedAt: Date,
    priority: String
  }],
  maintenanceSchedule: {
    lastService: Date,
    nextService: Date,
    kmTravelled: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const DeliveryHub = mongoose.model('DeliveryHub', deliveryHubSchema);
const DeliveryAgent = mongoose.model('DeliveryAgent', deliveryAgentSchema);
const DeliveryVehicle = mongoose.model('DeliveryVehicle', deliveryVehicleSchema);

module.exports = {
  DeliveryHub,
  DeliveryAgent,
  DeliveryVehicle
};
