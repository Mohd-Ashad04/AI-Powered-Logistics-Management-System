const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect } = require('../middleware/auth');

// No strong auth required for just resolving a location, as it is needed before login in some flows
// but here we can just leave it open or protect it. The pricing route is open for estimation.
router.post('/resolve', locationController.resolve);

module.exports = router;
