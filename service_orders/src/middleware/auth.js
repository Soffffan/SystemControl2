const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const publicRoutes = ['/health', '/health/'];

  console.log(`[Orders Auth] Path: "${req.path}"`);

  if (publicRoutes.some(route => req.path.includes(route))) {
    console.log(`[Orders Auth] Public route: ${req.path}`);
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log(`[Orders Auth] No token for: ${req.path}`);
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
    
    console.log(`[Orders Auth] User authenticated: ${decoded.userId}, role: ${decoded.role}`);
    next();
  } catch (error) {
    console.log(`[Orders Auth] Token error: ${error.message}`);
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

    const userRole = req.user.role;
    const hasRole = allowedRoles.includes(userRole);

    if (!hasRole) {
      req.log.warn({
        userId: req.user.userId,
        userRole,
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