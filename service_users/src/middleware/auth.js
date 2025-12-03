const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  // Публичные маршруты - ВСЕ варианты
  const publicRoutes = [
    '/register',
    '/login',
    '/health',
    '/health/',
    '/v1/register/',
    '/v1/login/'
  ];

  // Добавьте логирование для отладки
  console.log(`[Users Auth] Path: "${req.path}", Public routes check...`);
  
  // Проверяем несколькими способами
  const isPublic = publicRoutes.some(route => {
    const result = req.path === route || req.path.startsWith(route);
    if (result) {
      console.log(`[Users Auth] Matched public route: "${route}" for path "${req.path}"`);
    }
    return result;
  });

  // Также пропускаем все пути, содержащие health
  if (isPublic || req.path.includes('health')) {
    console.log(`[Users Auth] Allowing public access to: ${req.path}`);
    return next();
  }
  
  console.log(`[Users Auth] Protected route: ${req.path}, checking token...`);

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log(`[Users Auth] No token for: ${req.path}`);
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
    console.log(`[Users Auth] User authenticated: ${decoded.userId}`);
    next();
  } catch (error) {
    console.log(`[Users Auth] Token error: ${error.message}`);
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Недействительный токен'
      }
    });
  }
};


const authorizeRoles = (allowedRoles) => {
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

    const userRoles = req.user.role || '';
    //const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (userRoles != allowedRoles) {
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

const authorizeSelfOrAdmin = (userIdParam = 'userId') => {
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

    const requestedUserId = req.params[userIdParam] || req.body.userId;
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.includes('admin');
    const isSelf = req.user.userId === requestedUserId;

    if (!isSelf && !isAdmin) {
      req.log.warn({
        userId: req.user.userId,
        requestedUserId,
        userRoles
      }, 'Access denied - not self and not admin');
      
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

module.exports = { authenticateToken, authorizeRoles, authorizeSelfOrAdmin };