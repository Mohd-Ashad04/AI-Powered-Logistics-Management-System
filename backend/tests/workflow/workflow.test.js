const request = require('supertest');
const app = require('../../server');
const { createTestCustomer, createTestAgent, generateToken, createTestOrder, createTestAdmin } = require('../setup/factories');
const Order = require('../../src/models/Order');

describe('Workflow / Shipment Lifecycle', () => {
  let customer, agent, admin, order, tokenAgent, tokenAdmin, tokenCustomer;

  beforeEach(async () => {
    customer = await createTestCustomer();
    agent = await createTestAgent();
    admin = await createTestAdmin();

    tokenAgent = generateToken(agent);
    tokenAdmin = generateToken(admin);
    tokenCustomer = generateToken(customer);

    order = await createTestOrder(customer);
  });

  it('should progress through a meaningful end-to-end shipment lifecycle', async () => {
    // 1. Order is created and initially PENDING
    expect(order.status).toBe('PENDING');

    const DeliveryHub = require('../../src/models/Delivery').DeliveryHub;
    const hub = new DeliveryHub({
      hubId: 'HUB-TEST-123',
      hubName: 'Test Hub',
      address: {
        addressLine1: '123 Test St', city: 'Test City', state: 'Test State', pincode: '110001'
      },
      area: 'NORTH',
      city: 'Test City',
      state: 'Test State',
      isStateHub: true,
      serviceAreas: ['110001']
    });
    await hub.save();

    // M1-B: Order starts with assigned pickup agent via workflowTracking, but let's just 
    // test completing pickup. We need to assign it to agentA.
    order.status = 'ASSIGNED_PICKUP';
    order.workflowTracking = {
      pickupAgent: agent._agentId,
      deliveryAgent: agent._agentId,
      originHub: hub._id, // mock hub ID
      destinationHub: hub._id
    };
    await order.save();

    // 2. Agent picks up the order
    const pickupRes = await request(app)
      .put(`/api/workflow/orders/${order._id}/complete-pickup`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ status: 'IN_TRANSIT' });

    expect(pickupRes.status).toBe(200);
    const inTransitOrder = await Order.findById(order._id);
    expect(inTransitOrder.status).toBe('PICKED_UP'); // The controller sets it to PICKED_UP
    
    // Simulate hub transitions
    inTransitOrder.status = 'OUT_FOR_DELIVERY';
    await inTransitOrder.save();

    // 3. Agent delivers the order
    const deliveryRes = await request(app)
      .put(`/api/workflow/orders/${order._id}/complete-delivery`)
      .set('Authorization', `Bearer ${tokenAgent}`)
      .send({ status: 'DELIVERED', proofOfDelivery: 'sig.png' });

    expect(deliveryRes.status).toBe(200);
    const deliveredOrder = await Order.findById(order._id);
    expect(deliveredOrder.status).toBe('DELIVERED');
    expect(deliveredOrder.workflowTracking.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'DELIVERED' })
      ])
    );
  });
});
