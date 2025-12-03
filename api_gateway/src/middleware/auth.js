const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const publicRoutes = [
    //Health checks
    '/health',
    '/health/',
    '/v1/users/health',
    '/v1/users/health/',
    '/v1/orders/health',
    '/v1/orders/health/',
    
    //Authentication
    '/v1/users/register',
    '/v1/users/register/',
    '/v1/users/login',
    '/v1/users/login/'
  ];

  const isPublicRoute = publicRoutes.some(publicPath => {
    return req.path === publicPath || 
           req.path === publicPath.replace(/\/$/, '') ||
           req.path.startsWith(publicPath + '/');
  });

  if (isPublicRoute || req.path.includes('/health')) {
    req.log.debug(`Public route access: ${req.path}`);
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.log.warn(`No token provided for protected route: ${req.path}`);
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Требуется авторизация'
      }
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'secret-key';
    const decoded = jwt.verify(token, secret);
    
    req.user = decoded;
    
    if (decoded.userId) {
      req.headers['x-user-id'] = decoded.userId;
    }
    if (decoded.roles) {
      req.headers['x-user-roles'] = JSON.stringify(decoded.roles);
    }
    if (decoded.email) {
      req.headers['x-user-email'] = decoded.email;
    }
    
    req.log.debug(`User authenticated: ${decoded.userId} for ${req.path}`);
    next();
  } catch (error) {
    req.log.warn({ error: error.message }, 'JWT verification failed');
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Недействительный токен'
      }
    });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Требуется авторизация'
        }
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      req.log.warn({
        userId: req.user.userId,
        userRoles,
        requiredRoles: allowedRoles
      }, 'Access denied - insufficient permissions');
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Недостаточно прав для выполнения операции'
        }
      });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };