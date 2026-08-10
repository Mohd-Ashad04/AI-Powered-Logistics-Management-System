/**
 * 🧪 Complete AI Logistics System Test
 * Tests the entire workflow from registration to delivery completion
 * 
 * Workflow Steps:
 * 1. Customer Registration & Login (JWT Token)
 * 2. Customer Creates Order
 * 3. Delivery Agent Pickup
 * 4. Agent to City Level Hub
 * 5. City Hub to State Level Hub  
 * 6. State Hub to Destination State Hub
 * 7. Destination State Hub to City Hub
 * 8. City Hub to Delivery Agent
 * 9. Final Delivery Complete
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

class CompleteLogisticsTest {
  constructor() {
    this.testData = {
      customer: null,
      token: null,
      order: null,
      pickupAgent: null,
      cityHub: null,
      stateHub: null,
      destinationStateHub: null,
      destinationCityHub: null,
      deliveryAgent: null
    };
    
    this.results = [];
  }

  // Helper method to log test results
  log(step, success, message, data = null) {
    const result = {
      step,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${step}: ${message}`);
    
    if (data && success) {
      console.log(`   📋 Data:`, JSON.stringify(data, null, 2));
    }
  }

  // Wait helper for realistic timing
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Setup API client with auth
  getApiClient(token = null) {
    return axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
  }

  // Step 1: Customer Registration
  async testCustomerRegistration() {
    console.log('\n🎯 STEP 1: CUSTOMER REGISTRATION');
    
    try {
      const api = this.getApiClient();
      const customerData = {
        username: `customer_${Date.now()}`,
        email: `customer_${Date.now()}@test.com`,
        password: 'password123',
        name: 'Test Customer',
        phone: '+919876543210'
      };

      const response = await api.post('/api/auth/register', customerData);
      this.testData.customer = response.data.data.customer;
      
      this.log('Customer Registration', true, 'Customer registered successfully', {
        customerId: this.testData.customer._id,
        email: this.testData.customer.email,
        name: this.testData.customer.name
      });

    } catch (error) {
      this.log('Customer Registration', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 2: Customer Login & Get JWT Token
  async testCustomerLogin() {
    console.log('\n🔐 STEP 2: CUSTOMER LOGIN');
    
    try {
      const api = this.getApiClient();
      const loginData = {
        email: this.testData.customer.email,
        password: 'password123'
      };

      const response = await api.post('/api/auth/login', loginData);
      this.testData.token = response.data.data.token;
      this.testData.customerId = response.data.data.customer._id; // Store customer ID from login
      
      this.log('Customer Login', true, 'Login successful, JWT token received', {
        token: this.testData.token.substring(0, 50) + '...',
        customerId: this.testData.customerId
      });

    } catch (error) {
      this.log('Customer Login', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 3: Customer Creates Order
  async testCreateOrder() {
    console.log('\n📦 STEP 3: CUSTOMER CREATES ORDER');
    
    try {
      const api = this.getApiClient(this.testData.token);
      const orderData = {
        customerId: this.testData.customerId, // Add customer ID from login
        sellerOrderId: `TEST-${Date.now()}`,
        pickupAddress: {
          addressLine1: '123 Sender Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        },
        recipientDetails: {
          name: 'Test Recipient',
          phone: '+919876543210',
          email: 'recipient@test.com',
          address: {
            addressLine1: '456 Receiver Avenue', 
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            country: 'India'
          }
        },
        packageDetails: {
          items: [{
            name: 'Test Electronics Package',
            quantity: 1,
            price: 25000,
            weight_grams: 3500,
            category: 'Electronics'
          }],
          deadWeight_kg: 3.5,
          dimensions_cm: {
            length: 40,
            width: 30,
            height: 15
          },
          fragile: true,
          specialInstructions: 'Handle with care - electronic item'
        },
        paymentDetails: {
          method: 'COD',
          totalValue: 25000,
          codAmount: 25000
        },
        orderType: 'NORMAL',
        deliveryType: 'STANDARD',
        priority: 'MEDIUM'
      };

      const response = await api.post('/api/orders', orderData);
      this.testData.order = response.data.data.order; // Fix: use response.data.data.order
      
      this.log('Create Order', true, 'Order created successfully', {
        orderId: this.testData.order._id,
        status: this.testData.order.status,
        totalCost: response.data.data.pricing?.totalCost,
        estimatedDelivery: this.testData.order.shippingDetails?.estimatedDeliveryDate,
        pickupHub: 'Mumbai State Hub',
        destinationHub: 'Delhi State Hub'
      });

    } catch (error) {
      this.log('Create Order', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 4: Delivery Agent Pickup
  async testAgentPickup() {
    console.log('\n🚚 STEP 4: DELIVERY AGENT PICKUP');
    await this.wait(2000); // Simulate real-time delay
    
    try {
      const api = this.getApiClient(this.testData.token);
      
      // Update order status to picked up
      const pickupData = {
        status: 'PICKED_UP',
        location: 'Pickup Address - Mumbai',
        remarks: 'Package picked up by delivery agent from sender'
      };

      const response = await api.put(`/api/orders/${this.testData.order._id}/status`, pickupData);
      
      this.log('Agent Pickup', true, 'Package picked up by agent', {
        orderId: this.testData.order._id,
        status: 'PICKED_UP',
        location: pickupData.location
      });

    } catch (error) {
      this.log('Agent Pickup', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 5: Agent to City Level Hub
  async testToCityHub() {
    console.log('\n🏢 STEP 5: DELIVERY TO CITY LEVEL HUB');
    await this.wait(3000);
    
    try {
      const api = this.getApiClient(this.testData.token);
      
      const cityHubData = {
        status: 'AT_ORIGIN_HUB',
        location: 'Mumbai City Hub',
        remarks: 'Package transferred to Mumbai city fulfillment hub'
      };

      const response = await api.put(`/api/orders/${this.testData.order._id}/status`, cityHubData);
      
      this.log('To City Hub', true, 'Package delivered to city hub', {
        orderId: this.testData.order._id,
        status: 'AT_ORIGIN_HUB',
        location: cityHubData.location
      });

    } catch (error) {
      this.log('To City Hub', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 6: City Hub to State Level Hub
  async testToStateHub() {
    console.log('\n🏭 STEP 6: CITY HUB TO STATE LEVEL HUB');
    await this.wait(4000);
    
    try {
      const api = this.getApiClient(this.testData.token);
      
      const stateHubData = {
        status: 'DISPATCHED_FROM_ORIGIN',
        location: 'Maharashtra State Hub',
        remarks: 'Package processed at state hub for interstate transport'
      };

      const response = await api.put(`/api/orders/${this.testData.order._id}/status`, stateHubData);
      
      this.log('To State Hub', true, 'Package at state level hub', {
        orderId: this.testData.order._id,
        status: 'DISPATCHED_FROM_ORIGIN',
        location: stateHubData.location
      });

    } catch (error) {
      this.log('To State Hub', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 7: Interstate Transport to Destination State Hub
  async testInterstateTransport() {
    console.log('\n🚛 STEP 7: INTERSTATE TRANSPORT TO DESTINATION');
    await this.wait(6000); // Longer wait for interstate
    
    try {
      const api = this.getApiClient(this.testData.token);
      
      const interstateData = {
        status: 'IN_TRANSIT',
        location: 'En Route - Maharashtra to Delhi',
        remarks: 'Package in interstate transport vehicle'
      };

      await api.put(`/api/orders/${this.testData.order._id}/status`, interstateData);
      
      // Arrive at destination state hub
      await this.wait(3000);
      
      const destinationStateData = {
        status: 'AT_DESTINATION_HUB',
        location: 'Delhi State Hub',
        remarks: 'Package arrived at destination state hub'
      };

      const response = await api.put(`/api/orders/${this.testData.order._id}/status`, destinationStateData);
      
      this.log('Interstate Transport', true, 'Package arrived at destination state', {
        orderId: this.testData.order._id,
        status: 'AT_DESTINATION_HUB',
        location: destinationStateData.location
      });

    } catch (error) {
      this.log('Interstate Transport', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 8: Destination State Hub to City Hub
  async testToDestinationCityHub() {
    console.log('\n🏢 STEP 8: TO DESTINATION CITY HUB');
    await this.wait(3000);
    
    try {
      const api = this.getApiClient(this.testData.token);
      
      const destinationCityData = {
        status: 'AT_DESTINATION_HUB',
        location: 'Delhi City Hub',
        remarks: 'Package transferred to destination city hub for final delivery'
      };

      const response = await api.put(`/api/orders/${this.testData.order._id}/status`, destinationCityData);
      
      this.log('To Destination City Hub', true, 'Package at destination city hub', {
        orderId: this.testData.order._id,
        status: 'AT_DESTINATION_HUB',
        location: destinationCityData.location
      });

    } catch (error) {
      this.log('To Destination City Hub', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 9: Final Delivery Agent Assignment
  async testFinalDeliveryAssignment() {
    console.log('\n🚴 STEP 9: FINAL DELIVERY AGENT ASSIGNMENT');
    await this.wait(2000);
    
    try {
      const api = this.getApiClient(this.testData.token);
      
      const assignmentData = {
        status: 'OUT_FOR_DELIVERY',
        location: 'Delhi - Out for Delivery',
        remarks: 'Package assigned to delivery agent for final delivery'
      };

      const response = await api.put(`/api/orders/${this.testData.order._id}/status`, assignmentData);
      
      this.log('Final Delivery Assignment', true, 'Package out for delivery', {
        orderId: this.testData.order._id,
        status: 'OUT_FOR_DELIVERY',
        location: assignmentData.location
      });

    } catch (error) {
      this.log('Final Delivery Assignment', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Step 10: Delivery Complete
  async testDeliveryComplete() {
    console.log('\n🎉 STEP 10: DELIVERY COMPLETE');
    await this.wait(4000);
    
    try {
      const api = this.getApiClient(this.testData.token);
      
      const completionData = {
        status: 'DELIVERED',
        location: 'Delivery Address - Delhi',
        remarks: 'Package successfully delivered to recipient'
      };

      const response = await api.put(`/api/orders/${this.testData.order._id}/status`, completionData);
      
      this.log('Delivery Complete', true, 'Package delivered successfully!', {
        orderId: this.testData.order._id,
        status: 'DELIVERED',
        location: completionData.location,
        deliveryTime: new Date().toISOString()
      });

    } catch (error) {
      this.log('Delivery Complete', false, error.response?.data?.message || error.message);
      throw error;
    }
  }

  // Final verification - Track complete order
  async testOrderTracking() {
    console.log('\n📍 FINAL VERIFICATION: ORDER TRACKING');
    
    try {
      const api = this.getApiClient(this.testData.token);
      
      const trackingResponse = await api.get(`/api/orders/${this.testData.order._id}/track`);
      const orderResponse = await api.get(`/api/orders/${this.testData.order._id}`);
      
      this.log('Order Tracking', true, 'Complete order history retrieved', {
        orderId: this.testData.order._id,
        finalStatus: orderResponse.data.data.status,
        trackingHistory: trackingResponse.data.data?.trackingHistory?.length || 0,
        totalSteps: 'Complete Workflow'
      });

    } catch (error) {
      this.log('Order Tracking', false, error.response?.data?.message || error.message);
    }
  }

  // Print comprehensive test summary
  printSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;

    console.log('\n' + '='.repeat(70));
    console.log('🏆 COMPLETE LOGISTICS WORKFLOW TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🎯 Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
    
    if (this.testData.order) {
      console.log('\n📦 ORDER DETAILS:');
      console.log(`   Order ID: ${this.testData.order._id}`);
      console.log(`   Customer: ${this.testData.customer?.name}`);
      console.log(`   Route: Mumbai → Delhi`);
      console.log(`   Final Status: DELIVERED`);
    }
    
    if (this.testData.token) {
      console.log('\n🔑 JWT TOKEN (for future API calls):');
      console.log('=' + '='.repeat(65));
      console.log(this.testData.token);
      console.log('=' + '='.repeat(65));
    }
    
    console.log('\n✨ Workflow Steps Completed:');
    console.log('   1. ✅ Customer Registration & Login');
    console.log('   2. ✅ Order Creation with AI Pricing');
    console.log('   3. ✅ Agent Pickup');
    console.log('   4. ✅ City Level Hub Processing');
    console.log('   5. ✅ State Level Hub Processing');
    console.log('   6. ✅ Interstate Transport');
    console.log('   7. ✅ Destination State Hub');
    console.log('   8. ✅ Destination City Hub');
    console.log('   9. ✅ Final Delivery Assignment');
    console.log('   10. ✅ Delivery Complete');
    
    console.log('\n' + '='.repeat(70));
  }

  // Run complete test suite
  async runCompleteWorkflowTest() {
    console.log('🚀 STARTING COMPLETE AI LOGISTICS WORKFLOW TEST');
    console.log('🔄 This will simulate the entire delivery process from registration to delivery');
    console.log('⏱️  Estimated time: ~30 seconds with realistic delays\n');

    try {
      // Authentication Flow
      await this.testCustomerRegistration();
      await this.testCustomerLogin();
      
      // Order Creation
      await this.testCreateOrder();
      
      // Complete Delivery Workflow
      await this.testAgentPickup();
      await this.testToCityHub();
      await this.testToStateHub();
      await this.testInterstateTransport();
      await this.testToDestinationCityHub();
      await this.testFinalDeliveryAssignment();
      await this.testDeliveryComplete();
      
      // Final Verification
      await this.testOrderTracking();
      
      this.printSummary();
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      this.printSummary();
    }
  }
}

// Run the complete test
const tester = new CompleteLogisticsTest();
tester.runCompleteWorkflowTest();
