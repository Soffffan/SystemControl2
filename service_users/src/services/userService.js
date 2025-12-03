const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class UserService {
  constructor(logger) {
    this.logger = logger;
    this.users = new Map();
    this.initializeAdminUser();
  }

  async initializeAdminUser() {
    try {
      const adminEmail = 'admin@example.com';
      const adminPassword = 'Admin123!';
      
      const existingAdmin = await this.findByEmail(adminEmail);
      if (!existingAdmin) {
        const adminUser = {
          userId: uuidv4(),
          email: adminEmail,
          passwordHash: await bcrypt.hash(adminPassword, 10),
          name: 'Администратор',
          role: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.users.set(adminUser.userId, adminUser);
        this.logger.info('Admin user initialized');
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize admin user');
    }
  }

  async register(userData) {
    const { email, password, name, role } = userData;
    //Проверка существования пользователя
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw {
        code: 'USER_EXISTS',
        message: 'Пользователь с таким email уже существует'
      };
    }

    //Проверка допустимости роли при регистрации
    if (!role || (role.toString() !== 'user' && role.toString() !== 'engineer')) {
      throw {
        code: 'INVALID_ROLE',
        message: 'Недопустимая роль при регистрации. Допустимые роли: user, engineer'
      };
    }

    //Хэширование пароля
    const passwordHash = await bcrypt.hash(password, 10);
    
    //Создание пользователя
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const user = {
      userId,
      email,
      passwordHash,
      name,
      role,
      createdAt: now,
      updatedAt: now
    };

    this.users.set(userId, user);
    
    this.logger.info({ userId, email, role }, 'User registered successfully');
    
    //Генерация JWT токена
    const token = this.generateToken(user);
    
    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  async login(email, password) {
    const user = await this.findByEmail(email);
    
    if (!user) {
      throw {
        code: 'INVALID_CREDENTIALS',
        message: 'Неверный email или пароль'
      };
    }

    //Проверка пароля
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      throw {
        code: 'INVALID_CREDENTIALS',
        message: 'Неверный email или пароль'
      };
    }

    //Генерация JWT токена
    const token = this.generateToken(user);
    
    this.logger.info({ userId: user.userId, role: user.role }, 'User logged in successfully');
    
    return {
      user: this.sanitizeUser(user),
      token
    };
  }

  async getProfile(userId) {
    const user = this.users.get(userId);
    
    if (!user) {
      throw {
        code: 'USER_NOT_FOUND',
        message: 'Пользователь не найден'
      };
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId, updates) {
    const user = this.users.get(userId);
    
    if (!user) {
      throw {
        code: 'USER_NOT_FOUND',
        message: 'Пользователь не найден'
      };
    }

    //Обновление полей
    if (updates.name) user.name = updates.name;
    if (updates.email) {
      //Проверка, что email не занят другим пользователем
      const existingUser = await this.findByEmail(updates.email);
      if (existingUser && existingUser.userId !== userId) {
        throw {
          code: 'EMAIL_EXISTS',
          message: 'Email уже используется другим пользователем'
        };
      }
      user.email = updates.email;
    }
    
    user.updatedAt = new Date().toISOString();
    
    this.users.set(userId, user);
    
    this.logger.info({ userId }, 'User profile updated');
    
    return this.sanitizeUser(user);
  }

  async listUsers(filters = {}, pagination = {}) {
    let users = Array.from(this.users.values());
    
    //Фильтрация по роли
    if (filters.role) {
      users = users.filter(user => user.role === filters.role);
    }
    
    //Фильтрация по email/имени
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(user => 
        user.email.toLowerCase().includes(search) || 
        user.name.toLowerCase().includes(search)
      );
    }
    
    //Сортировка
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    
    users.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortOrder;
      if (a[sortField] > b[sortField]) return 1 * sortOrder;
      return 0;
    });
    
    //Пагинация
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;
    
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    
    users = users.slice(skip, skip + limit);
    
    return {
      users: users.map(user => this.sanitizeUser(user)),
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

  async findByEmail(email) {
    return Array.from(this.users.values()).find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  generateToken(user) {
    const payload = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role
    };

    const secret = process.env.JWT_SECRET || 'secret-key';
    
    return jwt.sign(
      payload,
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  sanitizeUser(user) {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async deleteUser(userId, requesterId) {
    const user = this.users.get(userId);
    
    if (!user) {
      throw {
        code: 'USER_NOT_FOUND',
        message: 'Пользователь не найден'
      };
    }

    //Проверка, что пользователь не удаляет себя
    const requester = this.users.get(requesterId);
    const isAdmin = requester?.role === 'admin';
    
    if (userId === requesterId && !isAdmin) {
      throw {
        code: 'SELF_DELETE_NOT_ALLOWED',
        message: 'Нельзя удалить свой аккаунт'
      };
    }

    this.users.delete(userId);
    
    this.logger.info({ userId, deletedBy: requesterId }, 'User deleted');
    
    return { message: 'Пользователь успешно удален' };
  }

  async checkUserRole(userId, requiredRole) {
    const user = this.users.get(userId);
    
    if (!user) {
      return false;
    }

    return user.role === requiredRole;
  }
}

module.exports = UserService;