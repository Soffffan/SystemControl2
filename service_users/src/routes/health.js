const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  const health = {
    status: 'healthy',
    service: 'users-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    usersCount: require('../services/userService').prototype.users?.size || 0
  };
  req.log.debug(health, 'Health check');
  res.json({
    success: true,
    data: health,
    error: null
  });
});

module.exports = router;