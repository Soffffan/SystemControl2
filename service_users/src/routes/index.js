const express = require('express');
const UserService = require('../services/userService');
const UserController = require('../controllers/userController');
const { authenticateToken, authorizeRoles, authorizeSelfOrAdmin } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, updateProfileSchema } = require('../middleware/validation');

const router = express.Router();

const userService = new UserService(require('pino')());
const userController = new UserController(userService, require('pino')());

//Публичные маршруты
router.post('/register', validate(registerSchema), userController.register);
router.post('/login', validate(loginSchema), userController.login);
router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

//Защищенные маршруты (требуют аутентификации)
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, validate(updateProfileSchema), userController.updateProfile);

//Маршруты для администраторов
router.get('/users', authenticateToken, authorizeRoles('admin'), userController.listUsers);
router.get('/users/:userId', authenticateToken, authorizeSelfOrAdmin(), userController.getUserById);
router.delete('/users/:userId', authenticateToken, authorizeSelfOrAdmin(), userController.deleteUser);

module.exports = router;