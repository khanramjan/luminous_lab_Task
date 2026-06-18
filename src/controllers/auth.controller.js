/**
 * Auth Controller
 *
 * Handles user registration, login, token refresh, and logout.
 * Implements JWT access + refresh token pattern.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const jwtConfig = require('../config/jwt');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Generate access and refresh tokens for a user.
 */
function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessExpiry,
  });

  const refreshToken = jwt.sign({ id: user.id }, jwtConfig.secret, {
    expiresIn: jwtConfig.refreshExpiry,
  });

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/register
 * Register a new user account.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check for existing email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    // Create user
    const user = await User.create({ name, email, password, role });

    // Generate tokens
    const tokens = generateTokens(user);

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await user.update({ refreshToken: hashedRefreshToken });

    return ApiResponse.created(res, {
      user: user.toSafeJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return tokens.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Store hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await user.update({ refreshToken: hashedRefreshToken });

    return ApiResponse.success(res, {
      user: user.toSafeJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for new access + refresh tokens.
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, jwtConfig.secret);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.refreshToken) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Compare refresh token with stored hash
    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Generate new tokens (token rotation)
    const tokens = generateTokens(user);

    // Store new hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await user.update({ refreshToken: hashedRefreshToken });

    return ApiResponse.success(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }, 'Tokens refreshed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Invalidate the refresh token.
 */
const logout = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.update({ refreshToken: null });
    }

    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
