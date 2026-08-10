const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const config = require('../utils/config');

// JWT Authentication Middleware
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, config.SECRET_KEY);
    const customer = await Customer.findById(decoded.id);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Customer not found.'
      });
    }

    req.customer = customer;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

exports.isAdminOrSubAdmin = (req, res, next) => {
  if (req.customer && (req.customer.role === 'admin' || req.customer.role === 'sub-admin')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin role required.'
  });
};

exports.isAdmin = exports.isAdminOrSubAdmin;

exports.isCustomer = (req, res, next) => {
  if (req.customer && req.customer.role === 'customer') {
    return next();
  }

  return res.status(403).json({ message: 'Access denied. Customer role required.' });
};
