const mongoose = require('mongoose');

// We must load config AFTER ensuring the environment is right, but config itself validates
// environment. So we do basic checks, load config, and do further checks.
require('dotenv').config();

const config = require('../../src/utils/config');

jest.setTimeout(600000); // 10 minutes

beforeAll(async () => {
  // Safety checks
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests must be run with NODE_ENV=test');
  }
  
  if (!process.env.TEST_DATABASE_URI) {
    throw new Error('TEST_DATABASE_URI is required for tests');
  }

  if (process.env.TEST_DATABASE_URI === process.env.MONGO_URI) {
    throw new Error('TEST_DATABASE_URI cannot be identical to MONGO_URI (Safety constraint)');
  }

  if (!process.env.TEST_DATABASE_URI.includes('logistics_test_db')) {
    throw new Error('TEST_DATABASE_URI must target logistics_test_db to avoid data destruction');
  }

  const uri = process.env.TEST_DATABASE_URI;
  
  // Override config URI so the app uses the test database directly
  config.MONGO_URI = uri;

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  // Clean database before starting test suite to ensure clean state
  if (mongoose.connection.readyState === 1) {
    const dbName = mongoose.connection.client.s.options.dbName;
    if (dbName !== 'logistics_test_db') {
        throw new Error('Connected to wrong database! Aborting tests.');
    }
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
    await mongoose.connection.close();
  }
});

afterEach(async () => {
  // Clean up collections after each test to ensure test isolation
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
});
