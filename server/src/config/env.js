require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

function secret(name) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`${name} must be set when NODE_ENV=production`);
  console.warn(`[config] ${name} is not set. Using an insecure development default.`);
  return `dev-insecure-${name.toLowerCase()}`;
}

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nymble',
  jwtSecret: secret('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  nymbleSecret: secret('NYMBLE_SECRET'),
  tokenTtlMinutes: Number(process.env.TOKEN_TTL_MINUTES) || 60,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
