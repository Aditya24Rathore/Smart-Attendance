const mongoose = require('mongoose');
const config = require('./config');

const validateMongoUri = (mongoUri) => {
  if (!mongoUri || typeof mongoUri !== 'string') {
    return 'MONGODB_URI is missing. Set it in your deployment environment variables.';
  }

  const normalized = mongoUri.trim();
  if (!normalized) {
    return 'MONGODB_URI is empty. Provide a valid MongoDB connection string.';
  }

  if (normalized.includes('<cluster>') || normalized.includes('<username>') || normalized.includes('<password>')) {
    return 'MONGODB_URI contains placeholders like <cluster>/<username>/<password>. Replace them with real Atlas values.';
  }

  const hasValidPrefix = normalized.startsWith('mongodb://') || normalized.startsWith('mongodb+srv://');
  if (!hasValidPrefix) {
    return 'MONGODB_URI must start with mongodb:// or mongodb+srv://';
  }

  return null;
};

const connectDB = async () => {
  try {
    const mongoUri = config.mongodbUri;
    const uriError = validateMongoUri(mongoUri);

    if (uriError) {
      throw new Error(uriError);
    }
    
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
