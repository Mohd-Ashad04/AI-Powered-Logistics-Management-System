const request = require('supertest');
const app = require('../../server');
const mongoose = require('mongoose');
const { createTestCustomer, createTestAgent, createTestAdmin, generateToken, createTestOrder, validAddress } = require('../setup/factories');

describe('Authorization', () => {
  let customerA, customerB, agentA, agentB, admin, orderA, orderB;
  let tokenCustA, tokenCustB, tokenAgentA, tokenAgentB, tokenAdmin;

  beforeEach(async () => {
    customerA = await createTestCustomer();
    customerB = await createTestCustomer();
    agentA = await createTestAgent();
    agentB = await createTestAgent();
    admin = await createTestAdmin();

    tokenCustA = generateToken(customerA);
    tokenCustB = generateToken(customerB);
    tokenAgentA = generateToken(agentA);
    tokenAgentB = generateToken(agentB);
    tokenAdmin = generateToken(admin);

    const DeliveryHub = require('../../src/models/Delivery').DeliveryHub;
    const hub = new DeliveryHub({
      hubId: 'HUB-TEST-123',
      hubName: 'Test Hub',
      address: validAddress,
      area: 'NORTH',
      city: 'Test City',
      state: 'Test State',
      isStateHub: true,
      serviceAreas: ['110001']
    });
    await hub.save();

    orderA = await createTestOrder(customerA, { 
      status: 'ASSIGNED_PICKUP', 
      workflowTracking: { pickupAgent: agentA._agentId, deliveryAgent: agentA._agentId, originHub: hub._id, destinationHub: hub._id }
    });
    orderB = await createTestOrder(customerB, { 
      status: 'ASSIGNED_PICKUP', 
      workflowTracking: { pickupAgent: agentB._agentId, deliveryAgent: agentB._agentId, originHub: hub._id, destinationHub: hub._id }
    });
  });

  describe('Customer Ownership', () => {
    it('should allow customer to access their own order', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderA._id}`)
        .set('Authorization', `Bearer ${tokenCustA}`);
      expect(res.status).toBe(200);
    });

    it('should deny customer access to another customer order', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderB._id}`)
        .set('Authorization', `Bearer ${tokenCustA}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Role Escalation', () => {
    it('should ignore role escalation during profile update', async () => {
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${tokenCustA}`)
        .send({ role: 'admin', name: 'Hacked Name' });
      
      expect(res.status).toBe(200);
      
      const checkRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenCustA}`);
      
      expect(checkRes.body.data.customer.role).toBe('customer'); // Role remains customer
    });
  });

  describe('Delivery Agent Ownership', () => {
    it('should allow agent to complete their assigned pickup', async () => {
      const res = await request(app)
        .put(`/api/workflow/orders/${orderA._id}/complete-pickup`)
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .send({ status: 'IN_TRANSIT' });
      
      // We expect 200 or 400 (validation), but NOT 403
      expect(res.status).not.toBe(403);
    });

    it('should deny agent from completing another agents pickup', async () => {
      const res = await request(app)
        .put(`/api/workflow/orders/${orderB._id}/complete-pickup`)
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .send({ status: 'IN_TRANSIT' });
      
      expect(res.status).toBe(403);
    });

    it('should deny agent from completing another agents delivery', async () => {
      const res = await request(app)
        .put(`/api/workflow/orders/${orderB._id}/complete-delivery`)
        .set('Authorization', `Bearer ${tokenAgentA}`)
        .send({ status: 'DELIVERED', proofOfDelivery: 'sig.png' });
      
      expect(res.status).toBe(403);
    });
  });

  describe('Admin Operations', () => {
    it('should allow admin to perform administrative operations', async () => {
      // E.g. get all orders
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
