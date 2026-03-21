# Smart Attendance System

A modern QR-code based attendance system for educational institutions using Node.js/Express, MongoDB, and React.

## Project Overview

This system implements an automated attendance marking system with:
- **Dynamic QR Codes** - Generated every 30 seconds, preventing screenshots/sharing
- **OTP Authentication** - Secure login via SMS/Email OTP
- **Real-time QR Scanning** - Students scan QR codes to mark attendance
- **Role-Based Access** - Student, Teacher, Admin/HOD roles with different permissions
- **Analytics & Reports** - Attendance tracking and trend analysis
- **MongoDB Database** - Scalable document-oriented database

## Technology Stack

### Backend
- **Node.js & Express.js** - Server framework
- **MongoDB** - NoSQL database
- **Firebase Admin SDK** - OTP authentication (optional)
- **JWT** - Token-based authentication
- **QRCode** - Dynamic QR code generation
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
│   │   ├── OTP.js
│   │   └── QRCode.js
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
    │   ├── pages/           # Page components
    │   ├── services/        # API service layer
    │   ├── styles/          # CSS styles
    │   ├── App.js
    │   └── index.js
    ├── package.json
    └── .env
```

## Features

### Student Features
- 📱 OTP-based registration and login
- 📸 Real-time QR code scanning
- 📊 View attendance history
- 📈 Track attendance percentage
- 🔒 Secure authentication with OTP

### Teacher Features
- 📋 Generate dynamic QR codes (30-second refresh)
- 👥 View attendance records
- 📊 Class attendance analysis
- 🔐 Teacher device acts as scanner only

### Admin/HOD Features
- 👨‍💼 Manage users (students, teachers)
- ✅ Verify teacher accounts
- 📊 Generate attendance reports
- 🔍 Filter attendance by department/semester
- ✏️ Bulk edit attendance records

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
- `POST /scan-qr` - Scan QR code for attendance
- `GET /attendance-history` - View attendance records

### Teacher Routes (`/api/teacher`)
- `GET /dashboard` - Teacher dashboard
- `POST /generate-qr` - Generate dynamic QR code
- `GET /qr-status/:qrHash` - Check QR code status
- `GET /attendance-records` - View attendance records

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

- QR codes refresh every **30 seconds**
- Each QR contains:
  - Teacher ID
  - Class/Session ID  
  - Timestamp
  - Random unique value
- Uses **AES-256 encryption**
- **Non-shareable** - Cannot be used if screenshot is detected
- **Time-bound** - Valid for exactly 30 seconds

## Environment Variables

### Backend (.env)
```
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret_key>
QR_ENCRYPTION_KEY=<your_encryption_key>
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
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

### QRCode
- teacherId, classId, qrHash, qrData, qrImage
- encryptedData, isActive, generatedAt, expiresAt
- usageCount, lastScannedAt

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
- Ensure QR_ENCRYPTION_KEY is set and is 32 characters
- Check QR refresh interval setting
- Verify browser camera permissions

## Development Notes

- MongoDB must be running before starting the backend
- Configure Firebase Admin SDK for OTP delivery
- Update `.env` with your actual credentials before deployment
- Use `npm run dev` for development mode with auto-reload
- Backend runs on port 5000 by default
- Frontend runs on port 3000 by default

## Deployment (Vercel + Render)

### Frontend on Vercel
1. Import repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Build settings:
   - Build Command: `npm run build`
   - Output Directory: `build`
4. Add environment variable:
   - `REACT_APP_API_URL=https://<your-render-service>.onrender.com/api`
5. Deploy.

`frontend/vercel.json` is included for SPA route rewrites.

### Backend on Render
1. In Render, create service using `render.yaml` from repository root.
2. Set required secret env vars in Render dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `QR_ENCRYPTION_KEY`
   - `CORS_ORIGIN` (your Vercel URL, comma-separated if multiple)
   - `ADMIN_PASSWORD`
3. Keep `NODE_ENV=production`.
4. Deploy and verify health check:
   - `https://<your-render-service>.onrender.com/api/health`

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
