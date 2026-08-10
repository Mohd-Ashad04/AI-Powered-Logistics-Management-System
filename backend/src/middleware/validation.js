const validateOrderData = (req, res, next) => {
  const { 
    customerId, 
    pickupAddress, 
    recipientDetails, 
    packageDetails, 
    paymentDetails 
  } = req.body;

  const errors = [];

  // Validate customer ID
  if (!customerId) {
    errors.push('Customer ID is required');
  }

  // Validate pickup address
  if (!pickupAddress) {
    errors.push('Pickup address is required');
  } else {
    if (!pickupAddress.city) errors.push('Pickup city is required');
    if (!pickupAddress.state) errors.push('Pickup state is required');
    if (!pickupAddress.pincode) errors.push('Pickup pincode is required');
  }

  // Validate recipient details
  if (!recipientDetails) {
    errors.push('Recipient details are required');
  } else {
    if (!recipientDetails.name) errors.push('Recipient name is required');
    if (!recipientDetails.phone) errors.push('Recipient phone is required');
    if (!recipientDetails.address) {
      errors.push('Recipient address is required');
    } else {
      if (!recipientDetails.address.city) errors.push('Recipient city is required');
      if (!recipientDetails.address.state) errors.push('Recipient state is required');
      if (!recipientDetails.address.pincode) errors.push('Recipient pincode is required');
    }
  }

  // Validate package details
  if (!packageDetails) {
    errors.push('Package details are required');
  } else {
    if (!packageDetails.items || !Array.isArray(packageDetails.items) || packageDetails.items.length === 0) {
      errors.push('Package items are required');
    }
    if (!packageDetails.deadWeight_kg || packageDetails.deadWeight_kg <= 0) {
      errors.push('Package weight is required and must be greater than 0');
    }
    if (!packageDetails.dimensions_cm) {
      errors.push('Package dimensions are required');
    } else {
      const { length, width, height } = packageDetails.dimensions_cm;
      if (!length || !width || !height) {
        errors.push('All package dimensions (length, width, height) are required');
      }
    }
  }

  // Validate payment details
  if (!paymentDetails) {
    errors.push('Payment details are required');
  } else {
    if (!paymentDetails.method) errors.push('Payment method is required');
    if (!paymentDetails.totalValue || paymentDetails.totalValue <= 0) {
      errors.push('Total value is required and must be greater than 0');
    }
    if (paymentDetails.method === 'COD' && !paymentDetails.codAmount) {
      errors.push('COD amount is required for COD orders');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
};

const validatePricingRequest = (req, res, next) => {
  const { 
    pickupAddress, 
    deliveryAddress, 
    packageDetails, 
    paymentDetails 
  } = req.body;

  const errors = [];

  if (!pickupAddress || !pickupAddress.pincode) {
    errors.push('Pickup address with pincode is required');
  }

  if (!deliveryAddress || !deliveryAddress.pincode) {
    errors.push('Delivery address with pincode is required');
  }

  if (!packageDetails || !packageDetails.deadWeight_kg) {
    errors.push('Package weight is required');
  }

  if (!paymentDetails || !paymentDetails.method) {
    errors.push('Payment method is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
};

const validateCustomerData = (req, res, next) => {
  const { name, email, phone } = req.body;

  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email is required');
  }

  if (!phone || !isValidPhone(phone)) {
    errors.push('Valid phone number is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
};

const validateDeliveryHubData = (req, res, next) => {
  const { hubId, state, city, area } = req.body;

  const errors = [];
  const validAreas = ['NORTH', 'SOUTH', 'EAST', 'WEST'];

  if (!hubId) errors.push('Hub ID is required');
  if (!state) errors.push('State is required');
  if (!city) errors.push('City is required');
  if (!area || !validAreas.includes(area)) {
    errors.push('Valid area is required (NORTH, SOUTH, EAST, WEST)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
};

const validateDeliveryAgentData = (req, res, next) => {
  const { agentId, name, phone, hubId, area } = req.body;

  const errors = [];
  const validAreas = ['NORTH', 'SOUTH', 'EAST', 'WEST'];

  if (!agentId) errors.push('Agent ID is required');
  if (!name) errors.push('Agent name is required');
  if (!phone || !isValidPhone(phone)) errors.push('Valid phone number is required');
  if (!hubId) errors.push('Hub ID is required');
  if (!area || !validAreas.includes(area)) {
    errors.push('Valid area is required (NORTH, SOUTH, EAST, WEST)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
};

const validateDeliveryVehicleData = (req, res, next) => {
  const { vehicleId, type, registrationNumber, capacity } = req.body;

  const errors = [];
  const validTypes = ['MINI_TRUCK', 'TRUCK', 'TEMPO', 'CONTAINER'];

  if (!vehicleId) errors.push('Vehicle ID is required');
  if (!type || !validTypes.includes(type)) {
    errors.push('Valid vehicle type is required (MINI_TRUCK, TRUCK, TEMPO, CONTAINER)');
  }
  if (!registrationNumber) errors.push('Registration number is required');
  if (!capacity || !capacity.maxWeight_kg || !capacity.maxVolume_cbm) {
    errors.push('Vehicle capacity (weight and volume) is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
};

// Helper functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/; // Indian phone number format
  return phoneRegex.test(phone);
};

module.exports = {
  validateOrderData,
  validatePricingRequest,
  validateCustomerData,
  validateDeliveryHubData,
  validateDeliveryAgentData,
  validateDeliveryVehicleData
};
