require('dotenv').config();
const mongoose = require('mongoose');
const { DeliveryAgent } = require('./src/models/Delivery');
const Customer = require('./src/models/Customer');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ailogitrack';

async function seedAgent() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const agentEmail = 'agent@example.com';
    const agentUsername = 'demoagent';
    const agentPassword = 'password123';

    await Customer.deleteOne({ email: agentEmail });
    await DeliveryAgent.deleteOne({ email: agentEmail });

    const deliveryAgent = new DeliveryAgent({
      agentId: 'DEMO-AGENT-1',
      name: 'Demo Delivery Agent',
      phone: '9999999999',
      email: agentEmail,
      hubId: 'MH-MUM-WEST',
      area: 'WEST',
      vehicleType: 'BIKE'
    });

    await deliveryAgent.save();
    console.log('✅ DeliveryAgent created with _id:', deliveryAgent._id.toString());

    const customerAgent = new Customer({
      name: 'Demo Delivery Agent',
      username: agentUsername,
      email: agentEmail,
      password: agentPassword,
      phone: '9999999999',
      role: 'delivery-agent',
      linkedAgentId: deliveryAgent._id
    });

    await customerAgent.save();
    console.log('✅ Agent Auth Identity (Customer) created successfully.');
    console.log(`🔑 Login: ${agentEmail} / ${agentPassword}`);

  } catch (error) {
    console.error('Error seeding agent:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedAgent();
