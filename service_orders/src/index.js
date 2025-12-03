require('dotenv').config();
const { app, logger } = require('./app');

const PORT = process.env.PORT || 8002;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Orders service запущен на порту ${PORT}`);
  logger.info(`Окружение: ${process.env.NODE_ENV || 'development'}`);
});

const shutdown = () => {
  logger.info('Получен сигнал завершения работы. Завершение работы...');
  server.close(() => {
    logger.info('Сервер завершил работу');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Принудительное завершение работы из-за таймаута');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

module.exports = server;