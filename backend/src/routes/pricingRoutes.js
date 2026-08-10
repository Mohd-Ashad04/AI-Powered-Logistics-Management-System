const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { authenticate, isAdminOrSubAdmin } = require('../middleware/auth');

router.use(authenticate);

// Pricing Estimate Routes
router.post('/calculate', pricingController.calculatePricing);
router.post('/estimate', pricingController.getPricingEstimate);
router.post('/compare', pricingController.comparePricingOptions);
router.post('/bulk-estimate', authenticate, isAdminOrSubAdmin, pricingController.getBulkPricingEstimate);

// Pricing Analytics
router.get('/trends', authenticate, isAdminOrSubAdmin, pricingController.getPricingTrends);
router.get('/zonal', pricingController.getZonalPricing);

module.exports = router;
