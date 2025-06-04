// Configuration for the backend
module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hazri-system',
  JWT_SECRET: process.env.JWT_SECRET || 'hazri-system-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h'
}; 