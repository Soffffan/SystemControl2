# SystemControl2

Система управления заказами
Микросервисная система управления пользователями и заказами с ролевой моделью доступа.

Архитектура
API Gateway (порт 8000) - единая точка входа, аутентификация, rate limiting

Сервис пользователей (порт 8001) - регистрация, аутентификация, управление профилями

Сервис заказов (порт 8002) - полный жизненный цикл заказов, ролевой контроль

Технологии
Node.js + Express

JWT аутентификация

Docker + Docker Compose

Zod для валидации

Pino для логирования

PostgreSQL (заготовка)

Быстрый старт
bash
# Клонирование
git clone <репозиторий>
cd system-control

# Настройка окружения
cp api_gateway/.env.example api_gateway/.env
cp service_users/.env.example service_users/.env
cp service_orders/.env.example service_orders/.env

# Запуск
docker-compose up --build
Роли пользователей
user - создание и отмена своих заказов

engineer - изменение статусов заказов

admin - полный доступ ко всем функциям

Основные эндпоинты
Пользователи
POST /v1/users/register - регистрация

POST /v1/users/login - вход

GET /v1/users/profile - профиль

GET /v1/users/users - список (только admin)

Заказы
POST /v1/orders - создание заказа

GET /v1/orders - мои заказы

PUT /v1/orders/{id}/status - обновление статуса

DELETE /v1/orders/{id} - удаление

Health checks
GET /health - статус шлюза

GET /v1/users/health - статус сервиса пользователей

GET /v1/orders/health - статус сервиса заказов

Статусы заказов
created - создан

in_progress - в работе

completed - выполнен

cancelled - отменен

Переменные окружения
В каждом сервисе создайте .env файл из .env.example и укажите:

JWT_SECRET - секретный ключ для JWT

PORT - порт сервиса

NODE_ENV - окружение (development/production)

Разработка
bash
# Установка зависимостей
cd api_gateway && npm install
cd ../service_users && npm install  
cd ../service_orders && npm install

# Запуск в режиме разработки
cd api_gateway && npm run dev
cd ../service_users && npm run dev
cd ../service_orders && npm run dev
Тестирование
Используйте Postman для тестирования API. Все запросы к API Gateway на порту 8000.

Формат ответов:

json
{
  "success": true/false,
  "data": {...},
  "error": null/{code, message}
}
Аутентификация:

text
authorization: Bearer <JWT_TOKEN>

Настройте reverse proxy (Nginx/Apache)

Настройте SSL сертификаты
