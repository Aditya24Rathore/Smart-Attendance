# Setup Guide - Smart Attendance System

Complete step-by-step instructions to set up and run the Smart Attendance System locally.

## Prerequisites

Make sure you have the following installed:
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **npm** (comes with Node.js)
- **Git** (optional)

## Backend Setup

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages from `package.json`:
- express - Web framework
- mongoose - MongoDB ODM
- jsonwebtoken - JWT authentication
- qrcode - QR code generation
- firebase-admin - OTP service (optional)
- bcryptjs - Password hashing
- cors - Cross-origin resource sharing
- dotenv - Environment variables

### Step 3: Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your settings
nano .env  # or use your preferred editor
```

**Important .env variables:**
```
MONGODB_URI=mongodb://localhost:27017/smart_attendance
JWT_SECRET=your_secret_key_minimum_32_characters_for_better_security
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
OTP_LENGTH=6
OTP_EXPIRY=10
ADMIN_EMAIL=admin@smartattendance.com
ADMIN_PASSWORD=<your_secure_password>
```

### Step 4: Setup MongoDB

**Option A: Local MongoDB**
```bash
# Start MongoDB service (Windows)
mongod

# Start MongoDB service (macOS/Linux)
brew services start mongodb-community

# Or
sudo systemctl start mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. In "Connect" section, select "Connect your application"
5. Copy the connection string (it will look like: `mongodb+srv://...`)
6. Update `MONGODB_URI` in `.env` with your connection string

⚠️ **IMPORTANT:** Never commit your actual MongoDB URI to version control. Keep credentials in `.env` only (which is gitignored).

### Step 5: Initialize Database (Seed Admin User)
```bash
ADMIN_EMAIL=admin@smartattendance.com
ADMIN_PASSWORD=<your_secure_password>

# Then run seed script
node scripts/seedAdmin.js
```

Output:
```
✓ MongoDB Connected Successfully
✓ Admin user created successfully
  Email: admin@smartattendance.com
  Please change this password after first login!
```

### Step 6: Start Backend Server
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

You should see:
```
✓ MongoDB Connected Successfully
✓ Server running on http://localhost:5000
✓ Environment: development
```

The backend is now running! Test it:
```bash
curl http://localhost:5000/api/health
# Response: { "status": "Server is running" }
```

## Frontend Setup

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- react - UI framework
- react-router-dom - Routing
- axios - HTTP client
- And other dependencies

### Step 3: Configure Environment Variables
```bash
# Create .env file in frontend directory
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

Or edit `.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
```

### Step 4: Start Frontend Development Server
```bash
npm start
```

The frontend will automatically open in your browser at `http://localhost:3000`

You should see:
```
Compiled successfully!

You can now view smart-attendance in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

## Verification

### 1. Test Backend API
```bash
# Health check
curl http://localhost:5000/api/health

# Expected response:
# {"status":"Server is running"}
```

### 2. Test Frontend
- Open browser to `http://localhost:3000`
- You should see the Smart Attendance login page

### 3. Test Admin Login
- Open login page at `http://localhost:3000/login`
- Username: `admin`
- Password: (use the password you set in `ADMIN_PASSWORD` in your `.env` file)

## Troubleshooting

### MongoDB Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:**
- Ensure MongoDB is running (run `mongod` command)
- Check MongoDB connection string in `.env`
- For MongoDB Atlas, ensure IP is whitelisted

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
```bash
# Kill process using port 5000 (macOS/Linux)
lsof -ti:5000 | xargs kill -9

# Or change PORT in .env to a different number (e.g., 5001)
```

### CORS Errors in Frontend
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL
- Default: `http://localhost:3000`
- Check base URL in frontend's `api.js`

### Dependencies Installation Failed
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### MongoDB Atlas Connection Issues
- Whitelist your IP in MongoDB Atlas settings
- Use correct username/password
- Ensure database name is correct in connection string

## Development Workflow

### 1. Start in Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 2. Edit Files
- Backend files in `backend/` are auto-reloaded (nodemon)
- Frontend files in `frontend/` are hot-reloaded

### 3. View Logs
- Backend logs appear in Backend terminal
- Frontend errors appear in Frontend terminal and browser console

## Testing Common Features

### 1. Student Registration
- Open `http://localhost:3000/register`
- Fill the registration form with student details
- Create username/password and submit

### 2. Teacher Login
- Open `http://localhost:3000/login`
- Use teacher credentials (teacher account must exist in database)

### 3. Admin Dashboard
- Open `http://localhost:3000/login`
- Login with `admin` username and seeded password
- Access analytics and reports

## Next Steps

1. **Configure Firebase** (for production OTP via SMS)
   - Create Firebase project
   - Add credentials to `.env`

2. **Setup Email Service** (for production OTP via Email)
   - Configure SMTP settings in `.env`
   - Test email sending

3. **Update Security**
   - Set strong `ADMIN_PASSWORD` in `.env`
   - Generate strong `JWT_SECRET`
   - Update CORS_ORIGIN for production

4. **Deploy to Production**
   - See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Useful Commands

### Backend
```bash
# Start in development mode
npm run dev

# Start in production mode
npm start

# Seed admin user
node scripts/seedAdmin.js

# Clear expired OTPs
node scripts/clearExpiredOTPs.js
```

### Frontend
```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### MongoDB
```bash
# Connect to local MongoDB
mongosh

# Show all databases
show dbs

# Switch to smart_attendance database
use smart_attendance

# Show all collections
show collections

# View users
db.users.find()

# View students
db.students.find()
```

## Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review error messages in terminal/console
3. Check `.env` file configuration
4. Ensure all services (MongoDB, Node, NPM) are updated
5. Try clearing cache and reinstalling dependencies

---

**Last Updated:** March 21, 2026
**Version:** 1.0.0
