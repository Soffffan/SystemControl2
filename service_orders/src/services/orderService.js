const { v4: uuidv4 } = require('uuid');

class OrderService {
  constructor(logger) {
    this.logger = logger;
    this.orders = new Map();
    this.initializeSampleData();
  }

  initializeSampleData() {
    try {
      const sampleOrders = [
        {
          orderId: uuidv4(),
          userId: 'admin-user-id',
          items: [
            { productId: 'prod-001', name: 'Ноутбук', quantity: 1, price: 150000 },
            { productId: 'prod-002', name: 'Мышь', quantity: 2, price: 2500 }
          ],
          status: 'completed',
          totalAmount: 155000,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          orderId: uuidv4(),
          userId: 'test-user-id',
          items: [
            { productId: 'prod-003', name: 'Книга', quantity: 3, price: 500 },
            { productId: 'prod-004', name: 'Ручка', quantity: 5, price: 50 }
          ],
          status: 'in_progress',
          totalAmount: 1750,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          orderId: uuidv4(),
          userId: 'test-user-id',
          items: [
            { productId: 'prod-005', name: 'Стул', quantity: 1, price: 5000 }
          ],
          status: 'created',
          totalAmount: 5000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      sampleOrders.forEach(order => {
        this.orders.set(order.orderId, order);
      });

      this.logger.info(`${sampleOrders.length} sample orders initialized`);
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize sample orders');
    }
  }

  async createOrder(userId, orderData, userRole) {
    const { items, totalAmount } = orderData;
    
    const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      throw {
        code: 'INVALID_TOTAL',
        message: 'Итоговая сумма не соответствует сумме товаров'
      };
    }

    // Создание заказа
    const orderId = uuidv4();
    const now = new Date().toISOString();
    
    const order = {
      orderId,
      userId,
      items,
      status: 'created',
      totalAmount,
      createdAt: now,
      updatedAt: now
    };

    this.orders.set(orderId, order);
    
    this.logger.info({ orderId, userId, userRole, totalAmount }, 'Order created successfully');
    
    this.publishOrderCreatedEvent(order);
    
    return order;
  }

  async getOrder(orderId) {
    const order = this.orders.get(orderId);
    
    if (!order) {
      throw {
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден'
      };
    }

    return order;
  }

  async getUserOrders(userId, filters = {}, pagination = {}) {
    let orders = Array.from(this.orders.values())
      .filter(order => order.userId === userId);
    
    //Фильтрация по статусу
    if (filters.status) {
      orders = orders.filter(order => order.status === filters.status);
    }
    
    //Сортировка
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    
    orders.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });
    
    //Пагинация
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;
    
    const total = orders.length;
    const totalPages = Math.ceil(total / limit);
    
    const paginatedOrders = orders.slice(skip, skip + limit);
    
    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  async updateOrderStatus(orderId, status, userId, userRole) {
    const order = this.orders.get(orderId);
    
    if (!order) {
      throw {
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден'
      };
    }

    //Проверка прав в зависимости от роли
    this.validateStatusUpdatePermission(order, status, userId, userRole);

    const oldStatus = order.status;
    
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    this.orders.set(orderId, order);
    
    this.logger.info({ 
      orderId, 
      oldStatus, 
      newStatus: status,
      userId,
      userRole 
    }, 'Order status updated');
    
    this.publishOrderStatusUpdatedEvent(order, oldStatus);
    
    return order;
  }

  validateStatusUpdatePermission(order, newStatus, userId, userRole) {
    const { status: currentStatus, userId: orderUserId } = order;
    
    //Админ может все
    if (userRole === 'admin') {
      return;
    }
    
    //Пользователь может отменять только свои заказы
    if (userRole === 'user') {
      if (orderUserId !== userId) {
        throw {
          code: 'FORBIDDEN',
          message: 'Можно изменять только свои заказы'
        };
      }
      
      //Пользователь может отменять только заказы со статусом 'created'
      if (newStatus === 'cancelled' && currentStatus === 'created') {
        return;
      }
      
      throw {
        code: 'INVALID_STATUS_TRANSITION',
        message: `Пользователь может отменять только заказы со статусом "создан"`
      };
    }
    
    //Инженер может менять статусы по специфичным правилам
    if (userRole === 'engineer') {
      const allowedTransitions = {
        'created': ['in_progress'],
        'in_progress': ['completed'],
        'completed': [],
        'cancelled': []
      };
      
      if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
        throw {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Инженер может менять статус с "${currentStatus}" только на "${allowedTransitions[currentStatus]?.join('" или "') || 'ничего'}"`
        };
      }
      
      return;
    }
    
    throw {
      code: 'FORBIDDEN',
      message: 'Недостаточно прав для изменения статуса заказа'
    };
  }

  async deleteOrder(orderId, userId, userRole) {
    const order = this.orders.get(orderId);
    
    if (!order) {
      throw {
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден'
      };
    }

    //Админ может удалять любые заказы
    if (userRole !== 'admin') {
      //Только владелец может удалять
      if (order.userId !== userId) {
        throw {
          code: 'FORBIDDEN',
          message: 'Можно удалять только свои заказы'
        };
      }
      
      //Можно удалять только заказы со статусом created или cancelled
      if (!['created', 'cancelled'].includes(order.status)) {
        throw {
          code: 'CANNOT_DELETE_ORDER',
          message: `Нельзя удалить заказ со статусом "${order.status}"`
        };
      }
    }

    this.orders.delete(orderId);
    
    this.logger.info({ orderId, deletedBy: userId, userRole }, 'Order deleted');
    
    return { message: 'Заказ успешно удален' };
  }

  async getAllOrders(filters = {}, pagination = {}, userRole) {
    //Только админ может видеть все заказы
    if (userRole !== 'admin') {
      throw {
        code: 'FORBIDDEN',
        message: 'Только администратор может просматривать все заказы'
      };
    }
    
    let orders = Array.from(this.orders.values());
    
    //Фильтрация
    if (filters.userId) {
      orders = orders.filter(order => order.userId === filters.userId);
    }
    
    if (filters.status) {
      orders = orders.filter(order => order.status === filters.status);
    }
    
    //Сортировка
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    
    orders.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });
    
    //Пагинация
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;
    
    const total = orders.length;
    const totalPages = Math.ceil(total / limit);
    
    const paginatedOrders = orders.slice(skip, skip + limit);
    
    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  async canUserUpdateOrder(orderId, userId, userRole) {
    const order = this.orders.get(orderId);
    
    if (!order) {
      return false;
    }
    
    if (userRole === 'admin') {
      return true;
    }
    
    if (userRole === 'user') {
      return order.userId === userId;
    }
    
    if (userRole === 'engineer') {
      return true;
    }
    
    return false;
  }

  async getOrdersByStatus(status) {
    const orders = Array.from(this.orders.values())
      .filter(order => order.status === status);
    
    return orders;
  }

  publishOrderCreatedEvent(order) {
    this.logger.info({ 
      event: 'ORDER_CREATED',
      orderId: order.orderId,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount 
    }, 'Domain event: Order created');
  }

  publishOrderStatusUpdatedEvent(order, oldStatus) {
    this.logger.info({ 
      event: 'ORDER_STATUS_UPDATED',
      orderId: order.orderId,
      userId: order.userId,
      oldStatus,
      newStatus: order.status 
    }, 'Domain event: Order status updated');
  }
}

module.exports = OrderService;