# Novacrust Wallet Service

A robust, financial-grade wallet system built with **NestJS**, **Sequelize**, and **PostgreSQL**.

## 🚀 Key Features

- **Integer-Based Currency**: All monetary values are stored and processed as **cents** (e.g., $10.50 = 1050) to avoid floating-point errors.
- **Atomic Transactions**: All balance updates happen within database transactions to ensure data integrity.
- **Concurrency Control**: valid `SELECT ... FOR UPDATE` locking prevents race conditions and double-spending during transfers.
- **Idempotency**: Prevents duplicate processing of funding or transfer requests using unique reference keys.
- **Double-Entry Ledger**: Every balance change is recorded as a `Transaction` (FUND, TRANSFER_IN, TRANSFER_OUT).

## 🛠 Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Database**: PostgreSQL
- **ORM**: [Sequelize](https://sequelize.org/) (TypeScript)
- **Validation**: `class-validator`
- **Testing**: Jest

## 📦 Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd novacrust
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_USER=your-db-user
DATABASE_PASSWORD=your-db-password
DATABASE_NAME=postgres
```

### 4. Database Migrations

Run the migrations to create the `Wallets` and `Transactions` tables:

```bash
npx sequelize-cli db:migrate
```

### 5. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

## 📖 API Documentation

### 1. Create Wallet

**POST** `/wallets`

Creates a new empty wallet.

**Request:** `(Empty body)`

**Response:**

```json
{
  "id": "uuid-string",
  "currency": "USD",
  "balance": 0,
  "updatedAt": "...",
  "createdAt": "..."
}
```

---

### 2. Fund Wallet

**POST** `/wallets/:id/fund`

Adds funds to a wallet. Requires a unique `reference` for idempotency.

**Note:**

Here we assume that the payment from the external payment provider(e.g paystack or flutterwave) is successful
and we only need to update the wallet balance

**Request:**

```json
{
  "amount": 1050, // Amount in cents ($10.50)
  "reference": "unique_ref_001"
}
```

**Response:**

```json
{
  "success": true,
  "newBalance": 1050,
  "transactionId": "uuid-tx-id"
}
```

---

### 3. Transfer Funds

**POST** `/wallets/transfer`

Transfers funds securely between two wallets.

**Request:**

```json
{
  "fromWalletId": "sender-uuid",
  "toWalletId": "receiver-uuid",
  "amount": 500, // Amount in cents ($5.00)
  "reference": "transfer_ref_001"
}
```

**Response:**

```json
{
  "success": true,
  "reference": "transfer_ref_001"
}
```

---

### 4. Get Wallet Details

**GET** `/wallets/:id`

Retrieves wallet balance and recent transaction history.

**Response:**

```json
{
  "wallet": {
    "id": "uuid-string",
    "currency": "USD",
    "balance": 1550
  },
  "transactions": [
    {
      "id": "tx-uuid",
      "type": "FUND",
      "amount": 1050,
      "reference": "ref_001",
      "createdAt": "..."
    }
  ]
}
```

## 🧪 Testing

Run the unit tests included in the project:

```bash
npm test
```

The tests cover:

- Wallet creation
- Successful funding
- Idempotency checks (duplicate funding)
- Transfers
- Insufficient balance handling

## 🔒 Security & Integrity Design

- **Locking**: We use pessimistic locking (`LOCK_UPDATE`) on wallet rows during transfers to ensure that `balance` reads are consistent and no other transaction can modify the wallet until the transfer is complete.
- **BigInt**: JavaScript `BigInt` is used for math operations, ensuring we can handle amounts larger than $9 quadrillion safely (though currently cast to `Number` for simple JSON responses, enabling easy integration).
