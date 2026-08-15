const request = require('supertest');
const app = require('../../server');
const { createTestCustomer, generateToken } = require('../setup/factories');

describe('Authentication', () => {
  let validCustomer;

  beforeEach(async () => {
    validCustomer = await createTestCustomer({ email: 'auth-test@example.com', password: 'password123' });
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@example.com', password: 'password123' });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@example.com', password: 'wrongpassword' });
      
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject access to protected endpoint without JWT', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should reject access to protected endpoint with invalid JWT', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });

  it('should allow public tracking without JWT', async () => {
    // Assuming tracking ID xyz doesn't exist, it should return 404 NOT 401
    const res = await request(app).get('/api/orders/tracking/xyz123');
    expect(res.status).not.toBe(401);
  });
});
