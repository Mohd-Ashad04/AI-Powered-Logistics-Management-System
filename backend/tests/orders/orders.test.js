const request = require('supertest');
const app = require('../../server');
const { createTestCustomer, generateToken, validAddress, validPackageDetails, validPaymentDetails, createTestOrder } = require('../setup/factories');
const Order = require('../../src/models/Order');

describe('Orders', () => {
  let customer, token;

  beforeEach(async () => {
    customer = await createTestCustomer();
    token = generateToken(customer);
  });

  it('should successfully create a valid order deterministically without AI or Stripe dependencies', async () => {
    const orderData = {
      customerId: customer._id,
      pickupAddress: validAddress,
      recipientDetails: {
        name: 'Recipient',
        phone: '9876543211',
        address: validAddress
      },
      packageDetails: validPackageDetails,
      paymentDetails: {
        method: 'COD',
        totalValue: 500,
        codAmount: 500
      },
      deliveryType: 'standard'
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    
    // Check deterministic pricing is stored
    expect(res.body.data.pricing).toBeDefined();
    expect(res.body.data.pricing.totalCost).toBeDefined();

    // Check deterministic ETA is stored
    expect(res.body.data.timeEstimation).toBeDefined();
    expect(res.body.data.timeEstimation.estimatedDeliveryDate).toBeDefined();
    
    const savedOrder = await Order.findById(res.body.data.order._id);
    expect(savedOrder.shippingDetails.rate.chargedToSeller_inr).toBe(res.body.data.pricing.totalCost);

    // Verify addressLine1 persistence
    expect(savedOrder.pickupAddress.addressLine1).toBe(orderData.pickupAddress.addressLine1);
    expect(savedOrder.recipientDetails.address.addressLine1).toBe(orderData.recipientDetails.address.addressLine1);
  });

  it('should reject invalid order input', async () => {
    const invalidOrder = {
      customerId: customer._id,
      // missing pickupAddress, recipientDetails, packageDetails, paymentDetails
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidOrder);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject unauthorized order creation (missing JWT)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({});
    expect(res.status).toBe(401);
  });

  it('should enforce customer ownership on order retrieval', async () => {
    const otherCustomer = await createTestCustomer();
    const otherOrder = await createTestOrder(otherCustomer);

    const res = await request(app)
      .get(`/api/orders/${otherOrder._id}`)
      .set('Authorization', `Bearer ${token}`); // token is for 'customer'
      
    expect(res.status).toBe(403);
  });
});
