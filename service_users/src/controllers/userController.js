class UserController {
  constructor(userService, logger) {
    this.userService = userService;
    this.logger = logger;
  }

  register = async (req, res) => {
    try {
      const { email, password, name, role } = req.validatedData;
      
      const result = await this.userService.register({ email, password, name, role });
      
      res.status(201).json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, email: req.body.email }, 'Registration failed');
      
      res.status(400).json({
        success: false,
        error: {
          code: error.code || 'REGISTRATION_FAILED',
          message: error.message || 'Ошибка при регистрации'
        },
        data: null
      });
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.validatedData;
      
      const result = await this.userService.login(email, password);
      
      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      this.logger.warn({ error, email: req.body.email }, 'Login failed');
      
      res.status(401).json({
        success: false,
        error: {
          code: error.code || 'LOGIN_FAILED',
          message: error.message || 'Ошибка при входе'
        },
        data: null
      });
    }
  };

  getProfile = async (req, res) => {
    try {
      const userId = req.user.userId;
      const profile = await this.userService.getProfile(userId);
      
      res.json({
        success: true,
        data: profile,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, userId: req.user?.userId }, 'Get profile failed');
      
      res.status(404).json({
        success: false,
        error: {
          code: error.code || 'PROFILE_NOT_FOUND',
          message: error.message || 'Профиль не найден'
        },
        data: null
      });
    }
  };

  updateProfile = async (req, res) => {
    try {
      const userId = req.user.userId;
      const updates = req.validatedData;
      
      const updatedProfile = await this.userService.updateProfile(userId, updates);
      
      res.json({
        success: true,
        data: updatedProfile,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, userId: req.user?.userId }, 'Update profile failed');
      
      res.status(400).json({
        success: false,
        error: {
          code: error.code || 'UPDATE_FAILED',
          message: error.message || 'Ошибка при обновлении профиля'
        },
        data: null
      });
    }
  };

  listUsers = async (req, res) => {
    try {
      const filters = {
        role: req.query.role,
        search: req.query.search
      };
      
      const pagination = {
        page: req.query.page,
        limit: req.query.limit
      };
      
      const result = await this.userService.listUsers(filters, pagination);
      
      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, userId: req.user?.userId }, 'List users failed');
      
      res.status(400).json({
        success: false,
        error: {
          code: error.code || 'LIST_FAILED',
          message: error.message || 'Ошибка при получении списка пользователей'
        },
        data: null
      });
    }
  };

  getUserById = async (req, res) => {
    try {
      const userId = req.params.userId;
      const profile = await this.userService.getProfile(userId);
      
      res.json({
        success: true,
        data: profile,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, requestedUserId: req.params.userId }, 'Get user by id failed');
      
      res.status(404).json({
        success: false,
        error: {
          code: error.code || 'USER_NOT_FOUND',
          message: error.message || 'Пользователь не найден'
        },
        data: null
      });
    }
  };

  deleteUser = async (req, res) => {
    try {
      const userId = req.params.userId;
      const requesterId = req.user.userId;
      
      const result = await this.userService.deleteUser(userId, requesterId);
      
      res.json({
        success: true,
        data: result,
        error: null
      });
    } catch (error) {
      this.logger.error({ error, userId: req.params.userId }, 'Delete user failed');
      
      const statusCode = error.code === 'USER_NOT_FOUND' ? 404 : 400;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: error.code || 'DELETE_FAILED',
          message: error.message || 'Ошибка при удалении пользователя'
        },
        data: null
      });
    }
  };
}

module.exports = UserController;