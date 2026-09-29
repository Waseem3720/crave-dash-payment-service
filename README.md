# Payment Service

Payment microservice for multi-tenant restaurant SaaS.

---

## 1. Running Locally

### Prerequisites
- Node.js (v18 or v20+)
- MongoDB (v6 or v7) running locally (replica set recommended for transactions)
- npm

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Configuration
Create a `.env` file from the example:
```bash
cp .env.example .env
```
Ensure your `.env` contains valid values:
```env
PORT=4004
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/payment_service
JWT_SECRET=your_jwt_secret_here
ORDER_SERVICE_URL=http://localhost:4003
PLATFORM_SERVICE_URL=http://localhost:4002
AUTH_SERVICE_URL=http://localhost:4001
```

### Step 3: Run the Application

#### Option A: Development Mode (Hot-Reload)
```bash
npm run dev
```

#### Option B: Production Build
```bash
# Compile TypeScript to JavaScript
npm run build

# Start the compiled server
npm start
```

### Step 4: Verify Service Health
```bash
curl http://localhost:4004/health
```
Expected response:
```json
{"success":true,"service":"payment-service","status":"ok"}
```

---

## 2. Running on Server with Docker

### Prerequisites
- Docker Engine (v20.10+)
- Docker Compose (v2.0+)

### Method A: Using Docker Compose (Recommended)

This runs the Payment Service alongside a MongoDB 7.0 container pre-configured with a replica set (`rs0`) for transaction support.

#### Step 1: Prepare Environment File
```bash
cp .env.example .env
```
Set your server-specific variables in `.env` (such as `JWT_SECRET`, microservice URLs).

#### Step 2: Build and Start Containers
```bash
docker compose up -d --build
```

#### Step 3: Check Logs & Status
```bash
# View logs in real-time
docker compose logs -f payment-service

# Check container status
docker compose ps
```

#### Step 4: Stop Containers
```bash
docker compose down
```

---

### Method B: Standalone Docker Container

If your MongoDB is hosted externally (e.g., MongoDB Atlas or a dedicated database cluster):

#### Step 1: Build Docker Image
```bash
docker build -t payment-service:latest .
```

#### Step 2: Run Docker Container
```bash
docker run -d \
  --name payment-service \
  --restart unless-stopped \
  -p 4004:4004 \
  --env-file .env \
  payment-service:latest
```

#### Step 3: Verify Healthcheck
```bash
docker ps --filter "name=payment-service"
curl http://localhost:4004/health
```

---

## 3. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4004` | Service HTTP port |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `MONGODB_URI` | `mongodb://localhost:27017/payment_service` | MongoDB connection string |
| `JWT_SECRET` | `changeme` | Shared secret for decoding incoming JWTs |
| `ORDER_SERVICE_URL` | `http://localhost:4003` | URL of the Order Service |
| `PLATFORM_SERVICE_URL` | `http://localhost:4002` | URL of the Platform Service |
| `AUTH_SERVICE_URL` | `http://localhost:4001` | URL of the Auth Service |
