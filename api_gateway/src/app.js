const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const pinoHttp = require('pino-http');

const rateLimiter = require('./middleware/rateLimiter');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const formatResponse = require('./middleware/formatResponse');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes/index');
const healthRouter = require('./routes/health');

const app = express();

//Логирование
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

const pinoMiddleware = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || require('crypto').randomUUID(),
  customProps: (req, res) => ({
    service: 'api-gateway'
  })
});

//Middleware
app.use(pinoMiddleware);
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

//Rate limiting
app.use(rateLimiter);

//Форматирование ответов
app.use(formatResponse);

//Маршруты
app.use('/v1', routes);
app.use('/health', healthRouter);


//Обработчики ошибок
app.use(errorHandler.notFound);
app.use(errorHandler.internal);

module.exports = { app, logger };