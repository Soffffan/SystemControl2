const { createProxyMiddleware } = require('http-proxy-middleware');

const usersProxy = createProxyMiddleware({
  target: process.env.USERS_SERVICE_URL || 'http://localhost:8001',
  changeOrigin: true,
  pathRewrite: {
    '^/v1/users': '/'
  },
  proxyTimeout: 10000,
  timeout: 10000,
  onProxyReq: (proxyReq, req, res) => {
    console.log('  [PROXY] Forwarding request to users service');
    console.log(`   Path: ${req.path} -> ${proxyReq.path}`);
    
    if (req.body) {
      console.log('   Body detected, setting content...');
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error('   [PROXY] Error:', err.message);
    res.status(503).json({
      success: false,
      error: {
        code: 'PROXY_ERROR',
        message: 'Ошибка проксирования запроса'
      }
    });
  }
});

module.exports = usersProxy;