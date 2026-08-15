/**
 * @Mohd Ashad
 * 2026-08-12
 * Joi Validation Middleware
 * this looks like it is written in production grade form
 */

const Joi = require('joi');
const AppError = require('../utils/AppError');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    
    if (error) {
      // Create a unified error message
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR'));
    }
    
    next();
  };
};

// 1. Auth Validation
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
    'string.pattern.base': 'Valid Indian phone number is required'
  }),
  role: Joi.string().valid('customer', 'seller').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// 2. Order Validation
const addressSchema = Joi.object({
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().pattern(/^\d{6}$/).required()
});

const packageItemSchema = Joi.object({
  name: Joi.string().required(),
  weight: Joi.number().positive().required(),
  dimensions: Joi.object({
    length: Joi.number().positive().required(),
    width: Joi.number().positive().required(),
    height: Joi.number().positive().required()
  }).optional(),
  value: Joi.number().positive().optional(),
  quantity: Joi.number().integer().positive().optional()
});

const createOrderSchema = Joi.object({
  customerId: Joi.string().required(),
  pickupAddress: addressSchema.required(),
  recipientDetails: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    address: addressSchema.required()
  }).required(),
  packageDetails: Joi.object({
    items: Joi.array().items(packageItemSchema).min(1).required(),
    deadWeight_kg: Joi.number().positive().required(),
    dimensions_cm: Joi.object({
      length: Joi.number().positive().required(),
      width: Joi.number().positive().required(),
      height: Joi.number().positive().required()
    }).required()
  }).required(),
  paymentDetails: Joi.object({
    method: Joi.string().valid('PREPAID', 'COD').required(),
    totalValue: Joi.number().positive().required(),
    codAmount: Joi.number().when('method', { is: 'COD', then: Joi.required(), otherwise: Joi.optional() })
  }).required(),
  deliveryType: Joi.string().valid('standard', 'express').optional(),
  orderType: Joi.string().optional(),
  priority: Joi.string().optional()
});

// 3. Pricing Request Validation
const pricingRequestSchema = Joi.object({
  pickupAddress: addressSchema.required(),
  deliveryAddress: addressSchema.required(),
  packageDetails: Joi.object({
    items: Joi.array().items(packageItemSchema).optional(),
    deadWeight_kg: Joi.number().positive().required(),
    dimensions_cm: Joi.object({
      length: Joi.number().positive().optional(),
      width: Joi.number().positive().optional(),
      height: Joi.number().positive().optional()
    }).optional()
  }).required(),
  paymentDetails: Joi.object({
    method: Joi.string().valid('PREPAID', 'COD').required(),
  }).required(),
  deliveryType: Joi.string().valid('standard', 'express').optional(),
  orderType: Joi.string().optional(),
  priority: Joi.string().optional()
});

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateOrderData: validate(createOrderSchema),
  validatePricingRequest: validate(pricingRequestSchema)
};
