const notFound = (req, res) => {
  req.log.warn({ path: req.path, method: req.method }, 'Route not found');
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Маршрут не найден'
    },
    data: null
  });
};

const internal = (err, req, res, next) => {
  req.log.error({
    err: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  }, 'Unhandled error');
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Внутренняя ошибка сервера' 
        : err.message
    },
    data: null
  });
};

module.exports = { notFound, internal };