const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string()
    .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
    .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру'),
  name: z.string()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно превышать 50 символов'),
  role: z.enum(['user', 'engineer'], {
    errorMap: () => ({ message: 'Роль должна быть "user" или "engineer"' })
  }).optional().default('user')
});

const loginSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(1, 'Пароль обязателен')
});

const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не должно превышать 50 символов')
    .optional(),
  email: z.string().email('Некорректный email адрес').optional()
}).refine(data => data.name || data.email, {
  message: 'Необходимо указать хотя бы одно поле для обновления'
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
  registerSchema,
  loginSchema,
  updateProfileSchema
};