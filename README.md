# 💳 FinTech Wallet Microservices

![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-Caching-DC382D?logo=redis)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Events-FF6600?logo=rabbitmq)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![Architecture](https://img.shields.io/badge/Architecture-Microservices-purple)

A production-style **FinTech Wallet Backend** built with **NestJS Microservices** following an event-driven architecture. The project demonstrates authentication, wallet management, transaction processing, commission calculation with Redis caching, RabbitMQ notifications, and admin management.

---

# 🚀 Features

## Authentication

- User Registration
- User Login
- JWT Authentication
- Refresh Token
- Change Password
- Logout
- Role Based Authorization (Admin/User)

---

## Wallet

- Wallet Creation
- Wallet Balance
- Add Money
- Withdraw Money
- Transfer Money
- Wallet Status Validation

---

## Transactions

- Transaction History
- Transaction Details
- Rollback Transaction
- Transaction Status
- Callback API

---

## Commission Service

- Create Commission Rules
- Update Commission Rules
- Delete Commission Rules
- Get Commission Rules
- Automatic Commission Calculation
- Percentage Commission
- Flat Commission
- Redis Caching

---

## Notification Service

Uses RabbitMQ events for notifications.

Current Events:

- Wallet Top-up
- Wallet Withdrawal
- Money Transfer
- Rollback Transaction

---

## AEPS Simulation

- AEPS Balance Enquiry
- AEPS Cash Withdrawal

---

## Admin

- Manage Commission Rules
- View Users
- Block Users
- Unblock Users
- Delete Users

---

# 🏗 Architecture

```text
                           Client
                              │
                              ▼
                    API Gateway (3000)
                              │
                  TCP Microservice Communication
 ┌──────────────────────────────────────────────────────────┐
 │                                                          │
 ▼                ▼                 ▼               ▼
Auth          Wallet          Transaction      Commission
3001           3002             3003             3004
 │               │                 │               │
 │               │                 │               │
 └───────────────┴──────────────┬──┴───────────────┘
                                │
                           MongoDB
                                │
                     Redis (Commission Cache)
                                │
                          RabbitMQ Events
                                │
                                ▼
                    Notification Service (3006)
```

---

# 📂 Microservices

| Service              | Port |
| -------------------- | ---- |
| API Gateway          | 3000 |
| Auth Service         | 3001 |
| Wallet Service       | 3002 |
| Transaction Service  | 3003 |
| Commission Service   | 3004 |
| Notification Service | 3006 |

---

# 🛠 Tech Stack

### Backend

- NestJS
- TypeScript
- Node.js

### Database

- MongoDB
- Mongoose

### Authentication

- JWT
- Custom Guards

### Communication

- TCP Microservices
- RabbitMQ

### Caching

- Redis

### Validation

- class-validator
- class-transformer

---

# 📦 Installation

```bash
git clone https://github.com/anubhav-uchiha/fintech-wallet-microservice.git

cd fintech-wallet-microservice

npm install
```

---

# ⚙ Environment Variables

Create a `.env`

```env
PORT=3000

MONGO_URI=mongodb://127.0.0.1:27017/fintech?replicaSet=rs0

JWT_SECRET=QWERTYUIOP@123456

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

---

# ▶ Running Services

Open six terminals.

### API Gateway

```bash
npm run start:dev api-gateway
```

### Auth Service

```bash
npm run start:dev auth-service
```

### Wallet Service

```bash
npm run start:dev wallet-service
```

### Transaction Service

```bash
npm run start:dev transaction-service
```

### Commission Service

```bash
npm run start:dev commission-service
```

### Notification Service

```bash
npm run start:dev notification-service
```

---

# 🔄 Request Flow

```text
Client

 │

 ▼

API Gateway

 │

 ├──────────────► Auth Service

 │

 ├──────────────► Wallet Service

 │                      │

 │                      ├────► Commission Service

 │                      │

 │                      ├────► Transaction Service

 │                      │

 │                      └────► RabbitMQ

 │                                │

 │                                ▼

 │                     Notification Service

 │

 ▼

MongoDB
```

---

# 📡 API Endpoints

## Authentication

| Method | Endpoint              |
| ------ | --------------------- |
| POST   | /auth/register        |
| POST   | /auth/login           |
| PATCH  | /auth/change-password |
| POST   | /auth/refresh         |
| POST   | /auth/logout          |

---

## Wallet

| Method | Endpoint                         |
| ------ | -------------------------------- |
| GET    | /wallet                          |
| POST   | /wallet/add-money                |
| POST   | /wallet/withdraw                 |
| POST   | /wallet/transfer                 |
| GET    | /wallet/transactions             |
| GET    | /wallet/transaction/:referenceId |
| POST   | /wallet/rollback/:referenceId    |
| POST   | /wallet/callback                 |

---

## AEPS

| Method | Endpoint              |
| ------ | --------------------- |
| POST   | /wallet/aeps/withdraw |
| POST   | /wallet/aeps/balance  |

---

## Admin

| Method | Endpoint                 |
| ------ | ------------------------ |
| POST   | /admin/commission        |
| GET    | /admin/commission        |
| GET    | /admin/commission/:id    |
| PATCH  | /admin/commission/:id    |
| DELETE | /admin/commission/:id    |
| GET    | /admin/users             |
| PATCH  | /admin/users/:id/block   |
| PATCH  | /admin/users/:id/unblock |
| DELETE | /admin/users/:id         |

---

# 📨 RabbitMQ Events

Published Events

- transaction.created
- transaction.rollback

Notification Service consumes these events and logs notifications.

---

# ⚡ Redis Usage

Commission rules are cached using Redis.

Flow:

```text
Wallet Service

      │

      ▼

Commission Service

      │

      ├── Redis (Cache Hit)

      │

      └── MongoDB (Cache Miss)
```

---

# 📌 Sample Transfer Flow

```text
Transfer Request

      │

      ▼

Wallet Service

      │

      ▼

Commission Service

      │

      ▼

Redis Cache

      │

      ▼

MongoDB (if cache miss)

      │

      ▼

Update Wallets

      │

      ▼

Create Transactions

      │

      ▼

Publish RabbitMQ Event

      │

      ▼

Notification Service
```

# 👨‍💻 Author

**Anubhav Kumar**

Backend Developer

### Skills

- NestJS
- Node.js
- TypeScript
- MongoDB
- Redis
- RabbitMQ
- JWT
- Microservices
- REST APIs
- Mongoose
