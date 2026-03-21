const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    const mongoUri = config.mongodbUri;
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✓ MongoDB Connected Successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('✗ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('✓ MongoDB Disconnected');
  } catch (error) {
    console.error('✗ MongoDB Disconnection Error:', error.message);
    process.exit(1);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
