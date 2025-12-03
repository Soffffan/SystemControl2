const express = require('express');
const OrderService = require('../services/orderService');
const OrderController = require('../controllers/orderController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, createOrderSchema, updateOrderStatusSchema } = require('../middleware/validation');

const router = express.Router();

const orderService = new OrderService(require('pino')());
const orderController = new OrderController(orderService, require('pino')());

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy' } });
});

//Все пользователи могут создавать заказы
router.post('/orders', authenticateToken, validate(createOrderSchema), orderController.createOrder);

//Получение своих заказов
router.get('/orders', authenticateToken, orderController.getUserOrders);

//Получение конкретного заказа (только свой или админ)
router.get('/orders/:orderId', authenticateToken, orderController.getOrder);

//Обновление статуса заказа
router.put('/orders/:orderId/status', authenticateToken, validate(updateOrderStatusSchema), orderController.updateOrderStatus);

//Удаление заказа
router.delete('/orders/:orderId', authenticateToken, orderController.deleteOrder);

//Получение всех заказов (только для админов)
router.get('/admin/orders', authenticateToken, authorizeRoles('admin'), orderController.getAllOrders);

module.exports = router;