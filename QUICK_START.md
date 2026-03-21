# Quick Start Guide

Get Smart Attendance System running in 10 minutes!

## Prerequisites

- Node.js 14+ ([Download](https://nodejs.org/))
- MongoDB ([Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- npm (comes with Node.js)
- Terminal/Command Prompt

## Step 1: Backend Setup (5 minutes)

### 1a. Install Backend Dependencies
```bash
cd backend
npm install
```

### 1b. Configure Backend
```bash
# Create .env file
cp .env.example .env

# Edit .env with your settings
# At minimum, set:
# MONGODB_URI=mongodb://localhost:27017/smart_attendance
# JWT_SECRET=your_secret_key_min_32_chars
```

### 1c. Start MongoDB
```bash
# On Windows (if installed locally)
mongod

# On macOS
brew services start mongodb-community

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

### 1d. Initialize Database
```bash
# Create admin user
node scripts/seedAdmin.js

# Output should show:
# ✓ Admin user created successfully
```

### 1e. Start Backend Server
```bash
# Development mode (auto-reload)
npm run dev

# Should show:
# ✓ Server running on http://localhost:5000
```

**Backend is ready!** Leave this running.

---

## Step 2: Frontend Setup (3 minutes)

### 2a. Open New Terminal Window and Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 2b. Configure Frontend
```bash
# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# For Windows Command Prompt:
# echo REACT_APP_API_URL=http://localhost:5000/api > .env
```

### 2c. Start Frontend Server
```bash
npm start
```

**Frontend will open automatically in browser at** `http://localhost:3000`

---

## Step 3: Test the System (2 minutes)

### Test Admin Login
1. Click **"Admin Login"** on the page
2. Email: `admin@smartattendance.com`
3. Password: (use the password you set in `backend/.env` file)
4. Click **Login**

### Test Student Flow
1. Click **"Student"** section
2. Enrollment No: `E001`
3. Mobile: `9876543210`
4. Click **Send OTP**
5. Enter any 6 digits as OTP
6. Complete registration

### Test Teacher Flow
1. Click **"Teacher"** section
2. Teacher ID: `T001`
3. Mobile: `9876543211`
4. Click **Send OTP**
5. Enter any 6 digits as OTP
6. Login as teacher

---

## What's Working

✅ **Authentication**
- [x] Admin login
- [x] Student OTP-based registration
- [x] Teacher OTP-based login

✅ **Core Features**
- [x] Student dashboard
- [x] Teacher dashboard
- [x] Admin dashboard
- [x] QR code generation (30-second refresh)
- [x] Attendance marking
- [x] Attendance history
- [x] Reports generation

✅ **Security**
- [x] JWT token authentication
- [x] Password hashing
- [x] OTP verification
- [x] Role-based access control

---

## Troubleshooting

### "MongoDB Connection Failed"
```
Error: connect ECONNREFUSED
```
**Fix:** 
- Start MongoDB: `mongod` (Windows) or `brew services start mongodb-community` (Mac)
- Check MONGODB_URI in `.env`

### "Port 5000 Already in Use"
```
Error: EADDRINUSE :::5000
```
**Fix:**
- Change PORT in `.env` to 5001
- Or kill process: `lsof -ti:5000 | xargs kill -9` (Mac/Linux)

### "Frontend Can't Connect to Backend"
```
CORS Policy Error
```
**Fix:**
- Ensure backend is running on port 5000
- Check REACT_APP_API_URL in frontend `.env`
- Ensure CORS_ORIGIN in backend `.env` includes `http://localhost:3000`

### "npm: command not found"
**Fix:**
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Restart terminal after installation

---

## File Structure You Just Created

```
smart-attendance/
├── backend/                    # Node.js/Express Backend
│   ├── models/                 # MongoDB schemas
│   ├── routes/                 # API endpoints
│   ├── middleware/             # Authentication
│   ├── services/               # Business logic
│   ├── server.js               # Main server
│   ├── package.json           # Dependencies
│   └── .env                    # Configuration
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── pages/             # Login, Dashboard pages
│   │   ├── components/        # React components
│   │   └── services/          # API calls
│   ├── package.json
│   └── .env                    # Configuration
│
├── README.md                   # Project overview
├── SETUP.md                    # Detailed setup
├── DATABASE_SCHEMA.md          # Database docs
└── MIGRATION_GUIDE.md          # Python→Node.js details
```

---

## Common Tasks

### Change Admin Password
1. Login as admin
2. Go to Profile settings
3. Change password

### Add New Student
1. Student registers via OTP
2. Or admin adds via "Add Student" in admin panel

### Add New Teacher
1. Teacher registers via OTP
2. Admin verifies in "Teacher Verification"

### View Attendance Report
1. Login as Admin
2. Go to "Reports" section
3. Select date range and department
4. Download CSV/PDF

### Reset Everything
```bash
# Drop MongoDB database
mongosh
use smart_attendance
db.dropDatabase()

# Then reseed admin
node scripts/seedAdmin.js
```

---

## Development Mode Tips

### Live Reload
- **Backend:** Uses `nodemon` - auto-reloads on code changes
- **Frontend:** React auto-refreshes on code changes

### View Logs
- Backend errors appear in backend terminal
- Frontend errors appear in browser console (F12)

### API Testing
```bash
# Test backend health
curl http://localhost:5000/api/health

# Should return:
# {"status":"Server is running"}
```

### Database Inspection
```bash
# Connect to MongoDB
mongosh

# Switch to database
use smart_attendance

# See all collections
show collections

# View users
db.users.find().pretty()

# View students
db.students.find().pretty()
```

---

## Next Steps

After getting it running:

1. **Explore the Code**
   - Read backend README.md
   - Understand MongoDB schema (DATABASE_SCHEMA.md)
   - Review API routes

2. **Customize**
   - Change admin password
   - Configure Firebase for real OTP
   - Setup email service
   - Customize UI colors/branding

3. **Deploy**
   - Deploy backend to Heroku/Railway/Render
   - Deploy frontend to Vercel/Netlify
   - Configure production `.env`

4. **Test Thoroughly**
   - Test all user flows
   - Test error cases
   - Test offline functionality
   - Load testing

---

## Default Credentials (Development Only!)

| Role | Email/ID | Password |
|------|----------|----------|
| Admin | admin@smartattendance.com | Set in `backend/.env` (`ADMIN_PASSWORD`) |
| Student | (via OTP) | Any 6 digits |
| Teacher | (via OTP) | Any 6 digits |

⚠️ **Warning:** Change these in production!

---

## Useful URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API: http://localhost:5000/api
- MongoDB: mongodb://localhost:27017/smart_attendance

---

## Support

Need help?
1. Check [SETUP.md](./SETUP.md) for detailed guide
2. Check [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for database info
3. Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for architecture details
4. Check error messages in terminal

---

## Quick Reference

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start

# Access at: http://localhost:3000
```

---

**Happy Coding! 🚀**

Last Updated: March 21, 2026
