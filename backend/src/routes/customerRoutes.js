const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, isAdminOrSubAdmin } = require('../middleware/auth');

router.use(authenticate, isAdminOrSubAdmin);

// Customer Management Routes
router.get('/', customerController.getAllCustomers);
router.post('/', customerController.createCustomer);

// Search
router.get('/search/query', customerController.searchCustomers);

router.get('/:customerId', customerController.getCustomer);
router.put('/:customerId', customerController.updateCustomer);

// Address Management
router.post('/:customerId/addresses', customerController.addCustomerAddress);
router.put('/:customerId/addresses/:addressId', customerController.updateCustomerAddress);
router.delete('/:customerId/addresses/:addressId', customerController.deleteCustomerAddress);

// Customer Orders
router.get('/:customerId/orders', customerController.getCustomerOrders);

// Customer Analytics
router.get('/:customerId/analytics', customerController.getCustomerAnalytics);

module.exports = router;
