/**
 * JWT Configuration
 *
 * Centralizes all JWT-related settings.
 * Values are read from environment variables with sensible defaults.
 */

module.exports = {
  secret: process.env.JWT_SECRET || 'default-dev-secret-change-me',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};
