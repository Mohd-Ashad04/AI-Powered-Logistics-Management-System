const Customer = require('../models/Customer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../utils/config');

// Generate JWT Token
const generateToken = (customerId) => {
  return jwt.sign({ id: customerId }, config.SECRET_KEY, { expiresIn: '7d' });
};

// Email transporter setup (disabled for now - logging instead)
const createEmailTransporter = () => {
  console.log('📧 Email service disabled - using logging instead');
  return null;
};

// Customer Registration
exports.customerRegister = async (req, res) => {
  try {
    const { username, email, password, name, phone } = req.body;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { username }]
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email or username already exists'
      });
    }

    // Create new customer
    const customer = new Customer({
      username,
      email,
      password,
      name,
      phone
    });

    await customer.save();

    // Generate token
    const token = generateToken(customer._id);

    // Email service removed - no notifications will be sent
    console.log('📧 Customer registered successfully - email notifications disabled');

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: {
        customer: customer.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Customer Login
exports.customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find customer
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await customer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(customer._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        customer: customer.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Customer Logout (mainly for session cleanup)
exports.customerLogout = (req, res) => {
  // For JWT, logout is handled client-side by removing the token
  // For session-based auth, destroy session
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Validate Username
exports.validateUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const existingCustomer = await Customer.findOne({ username });

    res.status(200).json({
      success: true,
      available: !existingCustomer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
};

// Validate Email
exports.validateEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const existingCustomer = await Customer.findOne({ email });

    res.status(200).json({
      success: true,
      available: !existingCustomer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
};

// Get Current Customer
exports.getCurrentCustomer = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        customer: req.customer.toJSON()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get customer data',
      error: error.message
    });
  }
};

// Update Customer Profile
exports.updateCustomer = async (req, res) => {
  try {
    const customerId = req.customer._id;
    const allowedFields = ['name', 'phone', 'addresses'];
    const updateData = Object.fromEntries(
      Object.entries(req.body).filter(([field]) => allowedFields.includes(field))
    );

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        customer: updatedCustomer.toJSON()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: error.message
    });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found with this email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    customer.resetPasswordToken = resetToken;
    customer.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await customer.save();

    // Email service disabled - just log the reset token
    console.log('🔑 Password reset requested for:', email);
    console.log('🔑 Reset token (for testing):', resetToken);
    console.log('📧 Email notifications disabled - password reset token logged instead');

    res.status(200).json({
      success: true,
      message: 'Password reset requested - check server logs for token (email service disabled)'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process reset request',
      error: error.message
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const customer = await Customer.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    customer.password = newPassword;
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpires = undefined;

    await customer.save();

    console.log('🔑 Password reset successfully for customer:', customer.email);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
};
