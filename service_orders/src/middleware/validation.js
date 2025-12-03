const { z } = require('zod');

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, 'ID товара обязателен'),
    name: z.string().min(1, 'Название товара обязательно'),
    quantity: z.number().int().positive('Количество должно быть положительным числом'),
    price: z.number().positive('Цена должна быть положительной')
  })).min(1, 'Заказ должен содержать хотя бы один товар'),
  totalAmount: z.number().positive('Итоговая сумма должна быть положительной')
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['created', 'in_progress', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Неверный статус. Допустимые значения: created, in_progress, completed, cancelled' })
  })
});

const validate = (schema) => (req, res, next) => {
  try {
    const validatedData = schema.parse(req.body);
    req.validatedData = validatedData;
    next();
  } catch (error) {
    req.log.warn({ validationError: error.errors }, 'Validation failed');
    
    const errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации',
        details: errors
      },
      data: null
    });
  }
};

module.exports = {
  validate,
  createOrderSchema,
  updateOrderStatusSchema
};