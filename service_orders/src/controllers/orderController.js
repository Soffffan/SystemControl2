class OrderController {
  constructor(orderService, logger) {
    this.orderService = orderService;
    this.logger = logger;
  }

  createOrder = async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const orderData = req.validatedData;
      
      const order = await this.orderService.createOrder(userId, orderData, userRole);
      
      res.status(201).json({
        success: true,
        data: order,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, userId: req.user?.userId }, 'Create order failed');
      
      res.status(400).json({
        success: false,
        error: {
          code: error.code || 'ORDER_CREATION_FAILED',
          message: error.message || 'Ошибка при создании заказа'
        },
        data: null
      });
    }
  };

  getOrder = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      const order = await this.orderService.getOrder(orderId);
      
      // Проверка прав на просмотр
      if (userRole !== 'admin' && order.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Нет прав для просмотра этого заказа'
          },
          data: null
        });
      }
      
      res.json({
        success: true,
        data: order,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, orderId: req.params.orderId }, 'Get order failed');
      
      const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.code || 'GET_ORDER_FAILED',
          message: error.message || 'Ошибка при получении заказа'
        },
        data: null
      });
    }
  };

  getUserOrders = async (req, res) => {
    try {
      const userId = req.user.userId;
      const filters = {
        status: req.query.status,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };
      
      const pagination = {
        page: req.query.page,
        limit: req.query.limit
      };
      
      const result = await this.orderService.getUserOrders(userId, filters, pagination);
      
      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, userId: req.user?.userId }, 'Get user orders failed');
      
      res.status(400).json({
        success: false,
        error: {
          code: error.code || 'GET_ORDERS_FAILED',
          message: error.message || 'Ошибка при получении списка заказов'
        },
        data: null
      });
    }
  };

  updateOrderStatus = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const { status } = req.validatedData;
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      const order = await this.orderService.updateOrderStatus(orderId, status, userId, userRole);
      
      res.json({
        success: true,
        data: order,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, orderId: req.params.orderId }, 'Update order status failed');
      
      const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404 : 
                        error.code === 'FORBIDDEN' ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.code || 'UPDATE_ORDER_FAILED',
          message: error.message || 'Ошибка при обновлении заказа'
        },
        data: null
      });
    }
  };

  deleteOrder = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const userId = req.user.userId;
      const userRole = req.user.role;
      
      const result = await this.orderService.deleteOrder(orderId, userId, userRole);
      
      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, orderId: req.params.orderId }, 'Delete order failed');
      
      const statusCode = error.code === 'ORDER_NOT_FOUND' ? 404 : 
                        error.code === 'FORBIDDEN' ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.code || 'DELETE_ORDER_FAILED',
          message: error.message || 'Ошибка при удалении заказа'
        },
        data: null
      });
    }
  };

  //Метод для администраторов
  getAllOrders = async (req, res) => {
    try {
      const userRole = req.user.role;
      const filters = {
        userId: req.query.userId,
        status: req.query.status,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };
      
      const pagination = {
        page: req.query.page,
        limit: req.query.limit
      };
      
      const result = await this.orderService.getAllOrders(filters, pagination, userRole);
      
      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, userId: req.user?.userId }, 'Get all orders failed');
      
      const statusCode = error.code === 'FORBIDDEN' ? 403 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.code || 'GET_ALL_ORDERS_FAILED',
          message: error.message || 'Ошибка при получении всех заказов'
        },
        data: null
      });
    }
  };
}

module.exports = OrderController;