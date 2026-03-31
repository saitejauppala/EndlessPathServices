const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

class AuthService {
  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      config.jwtAccessSecret,
      { expiresIn: config.jwtAccessExpiresIn }
    );
    const refreshToken = jwt.sign(
      { userId },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );
    return { accessToken, refreshToken };
  }

  async register(name, email, password) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User already exists with this email');
      error.statusCode = 409;
      throw error;
    }

    const user = new User({ name, email, passwordHash: password });
    await user.save();

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user: this.sanitizeUser(user), tokens };
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user: this.sanitizeUser(user), tokens };
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      const error = new Error('Refresh token required');
      error.statusCode = 401;
      throw error;
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      const error = new Error('Invalid refresh token');
      error.statusCode = 401;
      throw error;
    }

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { tokens };
  }

  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return { user: this.sanitizeUser(user) };
  }

  sanitizeUser(user) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}

module.exports = new AuthService();
