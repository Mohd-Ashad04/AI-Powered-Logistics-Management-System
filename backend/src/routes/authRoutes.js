const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const { authenticate, isAdmin } = require('../middleware/auth');
const {
  customerRegister,
  customerLogin,
  customerLogout,
  validateUsername,
  validateEmail,
  getCurrentCustomer,
  updateCustomer,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

// Public Routes (No authentication required)
router.post('/register', customerRegister);
router.post('/login', customerLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Validation Routes
router.get('/validate-username/:username', validateUsername);
router.get('/validate-email/:email', validateEmail);

// Protected Routes (Authentication required)
router.use(authenticate); // Apply authentication middleware to all routes below

// Customer Profile Routes
router.get('/me', getCurrentCustomer);
router.put('/me', updateCustomer);
router.post('/logout', customerLogout);

// File Upload Route (for profile pictures, etc.)
router.post('/upload-avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        path: req.file.path
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

module.exports = router;
