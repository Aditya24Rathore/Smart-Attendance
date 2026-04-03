# Smart Attendance System

A modern QR-code based attendance system for educational institutions using Node.js/Express, MongoDB, and React.

## Project Overview

This system implements an automated attendance marking system with:
- **Static Student QR Codes** - Each student has a unique personal QR code based on their enrollment
- **OTP Authentication** - Secure login via SMS/Email OTP
- **Teacher QR Scanning** - Teachers initiate sessions and scan student QR codes with camera
- **Real-time Attendance** - Attendance marked immediately when valid QR is scanned
- **Role-Based Access** - Student, Teacher, Admin roles with different permissions
- **Analytics & Reports** - Attendance tracking and trend analysis
- **MongoDB Database** - Scalable document-oriented database

## Technology Stack

### Backend
- **Node.js & Express.js** - Server framework
- **MongoDB** - NoSQL database
- **Firebase Admin SDK** - OTP authentication (optional)
- **JWT** - Token-based authentication
- **Mongoose** - MongoDB ODM

### Frontend
- **React** - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **CSS** - Styling

## Project Structure

```
Smart Attendance/
├── backend/                  # Node.js/Express Backend
│   ├── models/              # MongoDB Mongoose schemas
│   │   ├── User.js
│   │   ├── Student.js
│   │   ├── Teacher.js
│   │   ├── Attendance.js
│   │   ├── Subject.js
│   │   └── OTP.js
│   ├── routes/              # API route handlers
│   │   ├── auth.js
│   │   ├── student.js
│   │   ├── teacher.js
│   │   └── admin.js
│   ├── services/            # Business logic
│   │   ├── QRService.js     # QR generation & verification
│   │   ├── OTPService.js    # OTP management
│   │   └── EmailService.js
│   ├── middleware/          # Authentication & validation
│   │   └── auth.js
│   ├── scripts/             # Utility scripts
│   │   ├── seedAdmin.js     # Create admin user
│   │   └── clearExpiredOTPs.js
│   ├── server.js            # Main application
│   ├── db.js                # Database connection
│   ├── config.js            # Configuration
│   ├── package.json
│   └── README.md
│
└── frontend/                # React Frontend
    ├── public/
    ├── src/
    │   ├── components/      # Reusable React components
    │   │   ├── Navbar.js
    │   │   ├── StudentQRDisplay.js   # Display student's personal QR
    │   │   └── StudentQRScanner.js   # Teacher scans student QRs
    │   ├── pages/           # Page components
    │   │   ├── LoginPage.js
    │   │   ├── RegisterPage.js
    │   │   ├── AdminDashboard.js
    │   │   ├── StudentDashboard.js
    │   │   └── TeacherDashboard.js
    │   ├── services/        # API service layer
    │   │   └── api.js
    │   ├── styles/          # CSS styles
    │   ├── App.js
    │   └── index.js
    ├── package.json
    └── .env
```

## Features

### Student Features
- 📱 OTP-based registration and login
- 📸 Generate personal static QR code (enrollment-based)
- 📊 View attendance history
- 📈 Track attendance percentage
- 🔒 Secure authentication with OTP

### Teacher Features
- 📋 Initiate attendance sessions (timestamp-based)
- 📷 Scan student QR codes using camera
- 👥 View attendance records
- 📊 Class attendance analysis
- ⚡ Mark attendance in real-time on scan

### Admin Features
- 👨‍💼 Manage users (students, teachers)
- ✅ Verify teacher accounts
- 📊 Generate attendance reports
- 🔍 Filter attendance by department/semester
- ✏️ Bulk edit attendance records
- 📈 Export reports (Excel, Google Sheets)

## Setup Instructions

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB credentials and JWT secret
   ```

3. **Setup MongoDB**
   ```bash
   # Using MongoDB Atlas or local MongoDB
   # Update MONGODB_URI in .env
   ```

4. **Seed Admin User**
   ```bash
   node scripts/seedAdmin.js
   ```

5. **Start Backend Server**
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API URL**
   ```bash
   cp .env.example .env
   # Update REACT_APP_API_URL if needed
   ```

3. **Start Frontend Development Server**
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication (`/api/auth`)
- `POST /student/send-otp` - Send OTP to student
- `POST /student/verify-otp` - Verify OTP and register/login
- `POST /teacher/send-otp` - Send OTP to teacher
- `POST /teacher/verify-otp` - Verify OTP and login
- `POST /admin/login` - Admin login with credentials
- `POST /login` - Username/password login (frontend compatibility)
- `POST /register` - Student registration (frontend compatibility)
- `GET /me` - Get current authenticated user
- `POST /logout` - Logout acknowledgment (client clears token)

### Student Routes (`/api/student`)
- `GET /dashboard` - Student dashboard
- `GET /generate-qr` - Generate personal QR code
- `GET /attendance-history` - View attendance records

### Teacher Routes (`/api/teacher`)
- `GET /dashboard` - Teacher dashboard
- `GET /subjects` - Get assigned subjects
- `POST /start-session` - Start attendance session
- `POST /scan-student-qr` - Scan student QR code
- `GET /attendance-records` - View attendance records
- `GET /session-attendance/:sessionId` - Get session attendance details
- `POST /mark-attendance-manual` - Mark attendance manually

### Admin Routes (`/api/admin`)
- `GET /dashboard` - System statistics
- `GET /students` - List all students
- `GET /teachers` - List all teachers
- `POST /verify-teacher/:teacherId` - Verify teacher
- `GET /reports/attendance` - Generate reports
- `POST /bulk-update-attendance` - Bulk update attendance

## Security Features

✅ **JWT Token Authentication** - Stateless authentication
✅ **OTP-based Login** - SMS/Email OTP verification
✅ **Encrypted QR Codes** - AES-256 encryption
✅ **Non-shareable QR** - Cannot be screenshotted or shared
✅ **Role-Based Access Control** - Different permissions per role
✅ **Rate Limiting** - Prevent brute force attacks
✅ **CORS Configuration** - Restrict cross-origin requests
✅ **HTTPS Recommended** - For production deployment

## QR Code System

- Each student generates a **static personal QR code** based on their enrollment number
- QR code contains encrypted student identification data
- **Teacher Workflow:** Initiate session → Scan student QR codes → Attendance marked in real-time
- Sessions are identified by timestamp-based IDs
- Uses **AES-256 encryption** for secure QR data
- **No expiry** on personal QR codes (valid throughout enrollment)

## Environment Variables

### Backend (.env)
```
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret_key>
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
ADMIN_EMAIL=admin@smartattendance.com
ADMIN_PASSWORD=<your_secure_password>
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Database Models

### User
- username, passwordHash, role, fullName, email, phone
- isActive, isVerified, createdAt, updatedAt

### Student
- userId, enrollmentNo, rollNumber, department, course
- semester, year, profilePhoto, deviceFingerprint, mobileNumber
- registeredAt, isVerified

### Teacher  
- userId, teacherId, employeeId, department, branch
- semester, designation, assignedSubjects, isVerified

### Attendance
- studentId, enrollmentNo, teacherId, subjectId
- qrCodeHash, qrGeneratedAt, scannedAt, attendanceStatus
- ipAddress, deviceInfo, remarks, isSynced

### OTP
- userId, phoneNumber, email, otpCode, otpHash
- purpose, isUsed, attempts, expiryTime

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running
- Check if port 5000 is available
- Verify MongoDB credentials in .env

### OTP Issues
- Configure Firebase Admin SDK or email service
- Check OTP expiry settings
- Verify phone/email format

### QR Code Issues
- Verify browser camera permissions
- Ensure student has a valid enrollment number
- Check that teacher session is active before scanning

## Development Notes

- MongoDB must be running before starting the backend
- Configure Firebase Admin SDK for OTP delivery
- Update `.env` with your actual credentials before deployment
- Use `npm run dev` for development mode with auto-reload
- Backend runs on port 5000 by default
- Frontend runs on port 3000 by default

## Deployment (Render)

### Frontend on Render
1. In Render, create a Static Site service.
2. Connect your repository.
3. Set **Root Directory** to `frontend`.
4. Build Command: `npm run build`
5. Publish Directory: `build`
6. Add environment variable (after deployment to get URL):
   - `REACT_APP_API_URL=https://<your-backend-service>.onrender.com/api`
7. Redeploy frontend to apply the API URL.

### Backend on Render
1. In Render, create a Web Service using `render.yaml` from repository root.
2. Set required secret env vars in Render dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CORS_ORIGIN` (your Render frontend URL, comma-separated if multiple)
   - `ADMIN_PASSWORD`
3. Keep `NODE_ENV=production`.
4. Deploy and verify health check:
   - `https://<your-backend-service>.onrender.com/api/health`

### Database on Supabase?
Current backend uses **MongoDB (Mongoose)**, while Supabase is **PostgreSQL-first**.

- Recommended with current code: use **MongoDB Atlas**.
- To use Supabase as primary DB, backend must be migrated from Mongoose models to SQL schema/queries.

## Contributing

This project was developed by **Neural Ninjas** for Smart India Hackathon 2025.

## License

MIT License - See LICENSE file for details.

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Last Updated:** March 21, 2026
**Version:** 1.0.0
