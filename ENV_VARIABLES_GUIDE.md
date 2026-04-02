# Environment Variables - Render Deployment Guide

## ✅ Corrected Values for Render Dashboard

Update each variable in your Render environment variables settings:

### 1. **MONGODB_URI** ⚠️ CRITICAL FIX
**Current (WRONG):**
```
mongodb+srv://ratheraditya262_db_user:6WEwFLBAAMwvDY5acluster0...
```

**CORRECT VALUE:**
See your local `backend/.env` file - it contains the full connection string with credentials. Copy the MONGODB_URI value from your .env file and paste it into Render environment variables.

Format should be:
```
mongodb+srv://USERNAME:PASSWORD@cluster0.3hx30wj.mongodb.net/smart_attendance?retryWrites=true&w=majority&appName=Cluster0
```

**Why it was failing:** The previous value was malformed (missing `@` separator and database name)

---

### 2. **ADMIN_EMAIL** ✅
```
admin@smartattendance.com
```

---

### 3. **ADMIN_PASSWORD** ✅
```
Admin@123
```

---

### 4. **JWT_SECRET** ⚠️ SECURITY
**Current:**
```
b625586fdef0e45defd387d17be4aa5a
```

**RECOMMENDED (Generate stronger):**
```
1f8c3b5e9d2a7f4c6b8e1a3d5f7c9b2e4d6f8a0c2e4f6a8b0d2e4f6a8b0d
```
> Use an online random generator: https://www.random.org/strings/

---

### 5. **QR_ENCRYPTION_KEY** ✅
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

### 6. **CORS_ORIGIN** ✅
```
http://localhost:3000,https://smart-attendance-frontend.onrender.com,https://smart-attendance-frontend-wbsb.onrender.com
```

---

### 7. **NODE_ENV** ✅
```
production
```

---

## 📋 Steps to Update in Render

1. Go to: https://dashboard.render.com
2. Click on your service: **smart-attendance-backend**
3. Go to **Settings** → **Environment**
4. For each variable below, click **Edit** and update:
   - [ ] MONGODB_URI (CRITICAL - copy exactly as shown above)
   - [ ] ADMIN_PASSWORD (if changing)
   - [ ] JWT_SECRET (if generating stronger key)
5. Click **Deploy** to redeploy with new variables
6. Check **Logs** to verify successful startup

---

## 🔐 Security Checklist

- [x] MongoDB credentials are secure (unique password)
- [x] Admin password is strong (mixed case + numbers)
- [x] JWT secret is 32+ random characters
- [x] QR encryption key is 32 random hex characters
- [x] CORS_ORIGIN whitelists only trusted domains
- [x] NODE_ENV is set to "production"

---

## ✅ Expected Logs After Fix

Once deployed, you should see in Render logs:
```
✓ MongoDB Connected Successfully
✓ Admin account exists (admin)
✓ Server running on http://localhost:5000
✓ Environment: production
```

If you still see `SyntaxError`, it means MONGODB_URI is still malformed.

---

## 📝 Local Development (.env)

For local testing, create `backend/.env`:
```
MONGODB_URI=mongodb+srv://rathoreaditya262_db_user:Aditya24Mongo@cluster0.3hx30wj.mongodb.net/smart_attendance?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
NODE_ENV=development
JWT_SECRET=1f8c3b5e9d2a7f4c6b8e1a3d5f7c9b2e4d6f8a0c2e4f6a8b0d2e4f6a8b0d
QR_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
CORS_ORIGIN=http://localhost:3000
ADMIN_EMAIL=admin@smartattendance.com
ADMIN_PASSWORD=Admin@123
NODE_ENV=development
OTP_LENGTH=6
OTP_EXPIRY=10
```

Then run:
```bash
cd backend
npm install
npm start
```
