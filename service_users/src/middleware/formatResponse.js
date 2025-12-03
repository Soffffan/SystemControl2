const formatResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && typeof data === 'object' && data.success !== undefined) {
      return originalJson.call(this, data);
    }
    
    if (data && data.error) {
      return originalJson.call(this, {
        success: false,
        error: {
          code: data.error.code || 'INTERNAL_ERROR',
          message: data.error.message || 'Внутренняя ошибка сервера'
        },
        data: null
      });
    }
    
    return originalJson.call(this, {
      success: true,
      data: data || null,
      error: null
    });
  };
  
  next();
};

module.exports = formatResponse;