const express = require('express');
const { authorizeRoles } = require('../middleware/auth');
const usersProxy = require('../proxy/usersProxy');
const ordersProxy = require('../proxy/ordersProxy');

const router = express.Router();

router.use('/users', usersProxy);

router.use('/orders', ordersProxy);

router.get('/status', authorizeRoles('admin'), (req, res) => {
  const status = {
    service: 'api-gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    activeConnections: req.socket.server._connections
  };
  
  res.json({
    success: true,
    data: status,
    error: null
  });
});

module.exports = router;