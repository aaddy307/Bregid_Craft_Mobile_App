# Bregid Factory ERP - Local Setup & Run Guide

Refer to [AGENTS.md](file:///home/aaddy/Documents/bregid-factory/AGENTS.md) for special Expo versioning guidelines.

## Development Setup

### 1. Database Seeding (Optional)
To seed the MongoDB database with initial footwear product specifications:
```bash
node seed-products.js
```

### 2. Start Next.js Backend (MongoDB API Proxy)
The Next.js backend handles API calls and proxies queries securely to MongoDB.
- **Navigate to backend**: `cd backend`
- **Install dependencies**: `npm install`
- **Run dev server**: `npm run dev` (Starts at `http://localhost:3000`)

### 3. Start Expo Frontend
- **Install dependencies**: `npm install`
- **Run dev server**: `npm run start` (or `npx expo start`)

---

## Environment Variables (.env)
Configured in the root directory:
- `EXPO_PUBLIC_MONGODB_URI`: MongoDB Connection URI.
- `EXPO_PUBLIC_DB_NAME`: Target database name.
- `EXPO_PUBLIC_API_URL`: Backend API endpoint.
  - **Local Web / iOS Simulators**: Set to `http://localhost:3000/api`
  - **Android Emulators**: Set to `http://10.0.2.2:3000/api`
  - **Physical Device**: Set to `http://<your-local-ip-address>:3000/api`
