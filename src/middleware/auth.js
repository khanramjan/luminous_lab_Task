/**
 * Authentication Middleware
 *
 * Verifies JWT access tokens from the Authorization header.
 * On success, attaches the user object to req.user.
 * On failure, returns 401 Unauthorized.
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired');
      }
      throw ApiError.unauthorized('Invalid access token');
    }

    // Find user (exclude soft-deleted)
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
