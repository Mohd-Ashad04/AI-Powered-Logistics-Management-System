const mongoose = require('mongoose');
const Customer = require('../../src/models/Customer');
const Order = require('../../src/models/Order');
const jwt = require('jsonwebtoken');
const config = require('../../src/utils/config');

const createTestCustomer = async (overrides = {}) => {
  const customer = new Customer({
    name: 'Test Customer',
    username: `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    role: 'customer',
    ...overrides
  });
  await customer.save();
  return customer;
};

const { DeliveryAgent } = require('../../src/models/Delivery');

const createTestAgent = async (overrides = {}) => {
  const agent = new DeliveryAgent({
    agentId: `AGT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: 'Test Agent',
    phone: '9999999999',
    email: `agent-${Date.now()}@example.com`,
    hubId: 'HUB-123',
    area: 'NORTH',
    vehicleType: 'BIKE',
    status: 'AVAILABLE'
  });
  await agent.save();
  
  const customer = await createTestCustomer({
    ...overrides,
    role: 'delivery-agent',
    linkedAgentId: agent._id
  });
  
  // Return the customer because the test needs it for generateToken
  customer._agentId = agent._id;
  customer.agentId = agent.agentId;
  return customer;
};

const createTestAdmin = async (overrides = {}) => {
  return await createTestCustomer({ role: 'admin', ...overrides });
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.SECRET_KEY,
    { expiresIn: '1h' }
  );
};

const validAddress = {
  addressLine1: '123 Test St',
  addressLine2: 'Apt 4B',
  city: 'Test City',
  state: 'Test State',
  pincode: '110001',
  country: 'India'
};

const validPackageDetails = {
  items: [{ name: 'Test Item', weight: 2, price: 500, quantity: 1 }],
  deadWeight_kg: 2,
  dimensions_cm: { length: 10, width: 10, height: 10 }
};

const validPaymentDetails = {
  method: 'PREPAID',
  totalValue: 1000,
  transactionId: 'test_txn_123'
};

const createTestOrder = async (customer, overrides = {}) => {
  const order = new Order({
    customerId: customer._id,
    sellerOrderId: `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    pickupAddress: validAddress,
    recipientDetails: {
      name: 'Recipient Name',
      phone: '9876543211',
      address: validAddress
    },
    packageDetails: validPackageDetails,
    paymentDetails: validPaymentDetails,
    ...overrides
  });
  await order.save();
  return order;
};

module.exports = {
  createTestCustomer,
  createTestAgent,
  createTestAdmin,
  generateToken,
  createTestOrder,
  validAddress,
  validPackageDetails,
  validPaymentDetails
};
