# 💳 FinTech Wallet Microservices

![NestJS](https://img.shields.io/badge/NestJS-v11-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![Microservices](https://img.shields.io/badge/Architecture-TCP%20Microservices-purple)

A NestJS microservices-based FinTech backend demonstrating authentication, wallet operations, transaction management, and simulated AEPS flow.

---

# 📑 Table of Contents

- Overview
- Architecture
- Features
- Tech Stack
- Installation
- Environment Variables
- MongoDB Setup
- Running the Services
- Service Ports
- Request Flow
- API Documentation
- Future Improvements

---

# 🚀 Overview

Services:

- API Gateway
- Auth Service
- Wallet Service
- Transaction Service

Communication between services uses **NestJS TCP Microservices**.

---

# 🏗 Architecture

```text
                Client
                   |
                   v
           API Gateway :3000
                   |
        -------------------------
        |                       |
        v                       v
 Auth Service:3001      Wallet Service:3002
                                 |
                                 v
                    Transaction Service:3003
                                 |
                                 v
                              MongoDB
```

---

# ✨ Features

- JWT Authentication
- Register/Login
- Refresh Token
- Change Password
- Wallet Management
- Add Money
- Withdraw Money
- Transfer Money
- Transaction History
- Rollback Transaction
- AEPS Balance (Simulation)
- AEPS Withdraw (Simulation)
- Callback API
- TCP Microservices

---

# 🛠 Tech Stack

- NestJS
- TypeScript
- MongoDB + Mongoose
- Passport JWT
- TCP Microservices

---

# 📦 Installation

```bash
git clone https://github.com/YOUR_USERNAME/fintech-wallet-microservices.git
cd fintech-wallet-microservices
npm install
```

---

# ⚙️ Environment Variables

Create `.env`

```env
MONGO_URI=mongodb://127.0.0.1:27017/fintech?replicaSet=rs0
JWT_SECRET=YOUR_SECRET_KEY
JWT_EXPIRE=1d
```

---

# 🗄 MongoDB

Run MongoDB locally with replica set enabled.

```text
mongodb://127.0.0.1:27017/fintech?replicaSet=rs0
```

---

# ▶ Running the Project

Open four terminals.

```bash
npm run start:dev api-gateway
```

```bash
npm run start:dev auth-service
```

```bash
npm run start:dev wallet-service
```

```bash
npm run start:dev transaction-service
```

---

# 🌐 Service Ports

| Service             | Port |
| ------------------- | ---: |
| API Gateway         | 3000 |
| Auth Service        | 3001 |
| Wallet Service      | 3002 |
| Transaction Service | 3003 |

---

# 🔄 Request Flow

```text
Client
   │
   ▼
API Gateway
   │
 TCP
   │
Auth / Wallet Service
   │
Transaction Service
   │
MongoDB
```

---

# 📡 API Documentation

**Base URL**

```text
http://localhost:3000
```

For protected APIs use:

```text
Authorization: Bearer <JWT_TOKEN>
```

| Feature                  | Method | Endpoint                                           | Auth |
| ------------------------ | ------ | -------------------------------------------------- | :--: |
| Register                 | POST   | /auth/register                                     |  ❌  |
| Login                    | POST   | /auth/login                                        |  ❌  |
| Change Password          | PATCH  | /auth/change-password                              |  ✅  |
| Refresh Token            | POST   | /auth/refresh                                      |  ❌  |
| Logout                   | POST   | /auth/logout                                       |  ✅  |
| My Wallet                | GET    | /wallet                                            |  ✅  |
| Wallet Transactions      | GET    | /wallet/transactions?page=1&limit=10&type=&status= |  ✅  |
| Wallet Balance           | POST   | /wallet/balance                                    |  ✅  |
| Add Money                | POST   | /wallet/add-money                                  |  ✅  |
| Withdraw Money           | POST   | /wallet/withdraw                                   |  ✅  |
| Transfer Money           | POST   | /wallet/transfer                                   |  ✅  |
| Transaction by Reference | GET    | /wallet/transaction/:referenceId                   |  ✅  |
| Rollback                 | POST   | /wallet/rollback/:referenceId                      |  ✅  |
| Callback                 | POST   | /wallet/callback                                   |  ✅  |
| AEPS Withdraw            | POST   | /wallet/aeps/withdraw                              |  ✅  |
| AEPS Balance             | POST   | /wallet/aeps/balance                               |  ✅  |

## Sample Requests

### Register

```json
{
  "name": "sham",
  "email": "sham@gmail.com",
  "password": "123456"
}
```

### Login

```json
{
  "email": "anubhav@gmail.com",
  "password": "123456"
}
```

### Change Password

```json
{
  "currentPassword": "123456",
  "newPassword": "abcdef"
}
```

### Refresh Token

```json
{
  "refreshToken": "<refresh_token>"
}
```

### Add Money

```json
{
  "amount": 505
}
```

### Withdraw Money

```json
{
  "amount": 500
}
```

### Transfer Money

```json
{
  "receiverEmail": "ram@gmail.com",
  "amount": 500
}
```

### Callback

```json
{
  "referenceId": "TXN20260720548323",
  "status": "SUCCESS"
}
```

### AEPS Withdraw

```json
{
  "aadhaarNumber": "123412341234",
  "bankName": "State Bank of India",
  "amount": 500
}
```

### AEPS Balance

```json
{
  "aadhaarNumber": "123412341234",
  "bankName": "State Bank of India"
}
```

---

# 🧪 Testing

Use Postman, Thunder Client or Insomnia.

---

# 📈 Future Improvements

- Payment Service
- Commission Service
- Notification Service
- DMT
- Swagger
- Docker
- RabbitMQ
- Redis
- Unit Tests

---

# 👨‍💻 Author

**Anubhav Kumar**

Backend Developer

Tech: NestJS • Node.js • TypeScript • MongoDB • JWT • Microservices
