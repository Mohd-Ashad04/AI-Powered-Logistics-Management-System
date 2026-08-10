const express = require('express');
const router = express.Router();

// API Documentation Endpoint
router.get('/', (req, res) => {
  const apiDocs = {
    title: 'AI-Driven Pan-India Logistics System API',
    version: '2.0.0',
    description: 'Complete automated logistics solution with AI-powered pricing, workflow management, and real-time notifications covering 28 states and 140+ cities across India',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    
    coverage: {
      states: 28,
      cities: '140+',
      deliveryAgents: '308+',
      deliveryHubs: '140+',
      vehicles: 'Interstate fleet available'
    },
    
    features: [
      'End-to-end automated workflow',
      'Real-time agent notifications',
      'AI-powered pricing and routing',
      'Multi-tier delivery network',
      'Complete status tracking',
      'Pan-India coverage'
    ],
    
    mainEndpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: 'Health check endpoint',
        example: `curl ${req.protocol}://${req.get('host')}/health`
      },
      
      // Authentication Endpoints
      customerRegister: {
        method: 'POST',
        path: '/auth/register',
        description: '👤 Register new customer account',
        example: `curl -X POST ${req.protocol}://${req.get('host')}/api/auth/register -H "Content-Type: application/json" -d '{"username":"john_doe","email":"john@example.com","password":"securepass123","name":"John Doe","phone":"+91-9999999999"}'`
      },
      
      customerLogin: {
        method: 'POST',
        path: '/auth/login',
        description: '🔑 Customer login (returns JWT token)',
        example: `curl -X POST ${req.protocol}://${req.get('host')}/api/auth/login -H "Content-Type: application/json" -d '{"email":"john@example.com","password":"securepass123"}'`
      },
      
      createOrderWithWorkflow: {
        method: 'POST',
        path: '/workflow/orders/create-with-workflow',
        description: '🚀 Create order with complete automated workflow - assigns pickup agent automatically (auth optional)',
        example: `curl -X POST ${req.protocol}://${req.get('host')}/api/workflow/orders/create-with-workflow -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_JWT_TOKEN" -d '{"customerId":"CUSTOMER_ID","sellerOrderId":"ORDER-001","pickupAddress":{"addressLine1":"123 Street","city":"Mumbai","state":"Maharashtra","pincode":"240001"},"recipientDetails":{"name":"John Doe","phone":"+91-9999999999","email":"john@example.com","address":{"addressLine1":"456 Street","city":"Delhi","state":"Delhi","pincode":"250001"}},"packageDetails":{"packageType":"DOCUMENT","description":"Documents","dimensions_cm":{"length":30,"width":25,"height":5},"deadWeight_kg":0.5,"fragile":false},"paymentDetails":{"method":"PREPAID","totalValue":150.50},"priority":"MEDIUM"}'`
      },
      
      getWorkflowStatus: {
        method: 'GET',
        path: '/workflow/orders/:orderId/workflow-status',
        description: '📊 Get complete workflow status and history for an order',
        example: `curl ${req.protocol}://${req.get('host')}/api/workflow/orders/ORDER_ID/workflow-status`
      },
      
      agentNotifications: {
        method: 'GET',
        path: '/workflow/agents/:agentId/notifications',
        description: '🔔 Get notifications for delivery agent (pickup/delivery assignments)',
        example: `curl ${req.protocol}://${req.get('host')}/api/workflow/agents/AGENT_ID/notifications`
      },
      
      pricingEstimate: {
        method: 'POST',
        path: '/pricing/estimate',
        description: '🤖 Get AI-powered pricing estimate for delivery',
        example: `curl -X POST ${req.protocol}://${req.get('host')}/api/pricing/estimate -H "Content-Type: application/json" -d '{"pickupAddress":{"city":"Mumbai","state":"Maharashtra","pincode":"240001"},"deliveryAddress":{"city":"Delhi","state":"Delhi","pincode":"250001"},"packageDetails":{"deadWeight_kg":2,"dimensions_cm":{"length":30,"width":25,"height":15}},"paymentDetails":{"method":"COD","totalValue":2500}}'`
      },
      
      createPaymentIntent: {
        method: 'POST',
        path: '/payments/create-intent',
        description: '💳 Create Stripe payment intent for order (requires auth)',
        example: `curl -X POST ${req.protocol}://${req.get('host')}/api/payments/create-intent -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_JWT_TOKEN" -d '{"orderId":"ORDER_ID","amount":150.50}'`
      },
      
      getCurrentCustomer: {
        method: 'GET',
        path: '/auth/me',
        description: '👤 Get current authenticated customer profile',
        example: `curl ${req.protocol}://${req.get('host')}/api/auth/me -H "Authorization: Bearer YOUR_JWT_TOKEN"`
      }
    },
    
    orderStatuses: [
      'PENDING - Order created',
      'ASSIGNED_PICKUP - Pickup agent assigned', 
      'PICKED_UP - Package picked up by agent',
      'AT_ORIGIN_HUB - Package at origin hub',
      'DISPATCHED_FROM_ORIGIN - Dispatched from origin hub',
      'IN_TRANSIT - Package in transit',
      'AT_DESTINATION_HUB - Package at destination hub',
      'OUT_FOR_DELIVERY - Assigned for final delivery',
      'DELIVERED - Successfully delivered'
    ],
    
    workflowSteps: {
      description: '🔄 Complete End-to-End Workflow:',
      step1: 'POST /workflow/orders/create-with-workflow - Creates order and assigns pickup',
      step2: 'GET /workflow/agents/{agentId}/notifications - Agent checks notifications',
      step3: 'PUT /workflow/orders/{orderId}/complete-pickup - Agent completes pickup',
      step4: 'PUT /workflow/orders/{orderId}/receive-at-hub - Hub receives package',
      step5: 'PUT /workflow/orders/{orderId}/dispatch-from-hub - Hub dispatches package',
      step6: 'PUT /workflow/orders/{orderId}/receive-at-hub - Destination hub receives',
      step7: 'PUT /workflow/orders/{orderId}/assign-for-delivery - Assign for delivery',
      step8: 'PUT /workflow/orders/{orderId}/complete-delivery - Complete delivery',
      step9: 'GET /workflow/orders/{orderId}/workflow-status - Check final status'
    },
    
    serviceAreas: {
      totalStates: 28,
      totalCities: '140+',
      sampleCities: [
        'Mumbai, Maharashtra (240001-240003)',
        'Delhi, Delhi (250001-250003)',
        'Bangalore, Karnataka (260001-260003)',
        'Chennai, Tamil Nadu (270001-270003)',
        'Kolkata, West Bengal (280001-280003)',
        'Hyderabad, Telangana (290001-290003)',
        'Pune, Maharashtra (241001-241003)',
        'Ahmedabad, Gujarat (230001-230003)',
        'Surat, Gujarat (231001-231003)',
        'Jaipur, Rajasthan (300001-300003)',
        'Imphal, Manipur',
        '... and 130+ more cities across India'
      ],
      testPincodes: {
        mumbai: '240001-240003',
        delhi: '250001-250003',
        bangalore: '260001-260003',
        note: 'Use these pincodes in API calls for testing'
      }
    },
    
    quickStart: {
      step1: 'Get customer ID: GET /customers',
      step2: 'Create order with workflow: POST /workflow/orders/create-with-workflow',
      step3: 'Get pickup agent ID from response and check notifications',
      step4: 'Follow the workflow steps as shown above',
      step5: 'Track progress: GET /workflow/orders/{orderId}/workflow-status'
    },
    
    allEndpoints: [
      'GET /health - Health check',
      
      // Authentication
      'POST /auth/register - Register customer',
      'POST /auth/login - Customer login',
      'GET /auth/me - Get current customer (auth required)',
      'PUT /auth/me - Update customer profile (auth required)',
      'POST /auth/logout - Customer logout (auth required)',
      'POST /auth/forgot-password - Forgot password',
      'POST /auth/reset-password - Reset password',
      
      // Payment
      'POST /payments/create-intent - Create payment intent (auth required)',
      'POST /payments/confirm - Confirm payment (auth required)',
      'GET /payments/status/:id - Get payment status (auth required)',
      
      // Core Logistics
      'GET /customers - Get all customers',
      'GET /customers/:id - Get customer by ID',
      'GET /customers/:id/orders - Get customer orders',
      'POST /workflow/orders/create-with-workflow - Create order with workflow (auth optional)',
      'GET /workflow/orders/:orderId/workflow-status - Get workflow status',
      'GET /workflow/agents/:agentId/notifications - Get agent notifications',
      'PUT /workflow/orders/:orderId/complete-pickup - Complete pickup',
      'PUT /workflow/orders/:orderId/receive-at-hub - Receive at hub',
      'PUT /workflow/orders/:orderId/dispatch-from-hub - Dispatch from hub',
      'PUT /workflow/orders/:orderId/assign-for-delivery - Assign for delivery',
      'PUT /workflow/orders/:orderId/complete-delivery - Complete delivery',
      'POST /pricing/estimate - Get pricing estimate',
      'GET /delivery/hubs - Get delivery hubs',
      'GET /delivery/agents - Get delivery agents',
      'GET /delivery/vehicles - Get vehicles'
    ],
    
    authenticationGuide: {
      registration: '1. POST /api/auth/register with customer details',
      login: '2. POST /api/auth/login to get JWT token',
      usage: '3. Include "Authorization: Bearer YOUR_JWT_TOKEN" header in authenticated requests',
      profile: '4. GET /api/auth/me to get current customer info',
      orders: '5. Use customerId from auth response in order creation'
    }
  };

  res.json(apiDocs);
});

module.exports = router;
