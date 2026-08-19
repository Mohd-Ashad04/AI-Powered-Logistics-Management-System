const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routingController');

router.post('/estimate', routingController.estimate);

module.exports = router;
