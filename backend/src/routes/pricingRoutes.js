/**
 * @Mohd Ashad
 * 2026-08-12
 * Pricing Routes
 * this looks like it is written in production grade form
 */

const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { authenticate, isAdminOrSubAdmin } = require('../middleware/auth');
const { validatePricingRequest } = require('../middleware/validation');

router.use(authenticate);

// Pricing Estimate Routes
router.post('/calculate', pricingController.calculatePricing);
router.post('/estimate', validatePricingRequest, pricingController.getPricingEstimate);
router.post('/compare', validatePricingRequest, pricingController.comparePricingOptions);
router.post('/bulk-estimate', authenticate, isAdminOrSubAdmin, pricingController.getBulkPricingEstimate);

// Pricing Analytics
router.get('/trends', authenticate, isAdminOrSubAdmin, pricingController.getPricingTrends);
router.get('/zonal', pricingController.getZonalPricing);

module.exports = router;
