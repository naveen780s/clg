const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Global test setup
beforeAll(async () => {
  try {
    // Set test environment variables first
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-and-should-be-long-enough';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';
    process.env.RATE_LIMIT_WINDOW_MS = '900000'; // 15 minutes
    process.env.RATE_LIMIT_MAX = '1000'; // Higher for tests
    
    // Start in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    // Connect to test database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Close database connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    // Stop in-memory MongoDB instance
    if (mongod) {
      await mongod.stop();
    }
    
    console.log('✅ Test cleanup completed');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('Test cleanup error:', error);
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection in tests:', err);
});

// Increase timeout for async operations
jest.setTimeout(60000);