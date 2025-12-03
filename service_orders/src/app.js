const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pino = require('pino');
const pinoHttp = require('pino-http');

const { authenticateToken } = require('./middleware/auth');
const formatResponse = require('./middleware/formatResponse');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes/index');

const app = express();

// Логирование
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
    service: 'orders-service'
  })
});

// Middleware
app.use(pinoMiddleware);
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-User-ID', 'X-User-Role'],
  credentials: true
}));
app.use(express.json());

app.use(formatResponse);

app.use('/', routes);

app.use(errorHandler.notFound);
app.use(errorHandler.internal);

module.exports = { app, logger };