const express = require('express');
const { registerDriver, loginDriver } = require('../controllers/driverController');
const router = express.Router();

router.post('/register', registerDriver);
router.post('/login', loginDriver);

module.exports = router;
