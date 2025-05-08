const jwt = require('jsonwebtoken');

// Default secrets (for development only)
const DEFAULT_JWT_SECRET = 'default_jwt_secret_for_development_only';
const DEFAULT_REFRESH_SECRET = 'default_refresh_token_secret_for_development_only';

/**
 * Generate a new JWT access token
 * @param {Object} payload - Data to include in token (usually user ID and role)
 * @returns {String} JWT token
 */
exports.generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Generate a refresh token with longer expiry
 * @param {Object} payload - Data to include in token (usually user ID)
 * @returns {String} JWT refresh token
 */
exports.generateRefreshToken = (payload) => {
  const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || DEFAULT_REFRESH_SECRET;
  return jwt.sign(payload, secret, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  });
};

/**
 * Verify a JWT token and return the decoded data
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
exports.verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Verify a refresh token and return the decoded data
 * @param {String} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
exports.verifyRefreshToken = (token) => {
  try {
    const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || DEFAULT_REFRESH_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Create an object with both access and refresh tokens
 * @param {Object} payload - Data to include in tokens
 * @returns {Object} Object containing access token and refresh token
 */
exports.createTokens = (payload) => {
  return {
    accessToken: this.generateToken(payload),
    refreshToken: this.generateRefreshToken(payload),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  };
}; 