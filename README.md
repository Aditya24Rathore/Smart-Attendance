# Smart Attendance System

A modern QR-code based attendance system for educational institutions using Node.js/Express, MongoDB, and React.

## Project Overview

This system implements an automated attendance marking system with:
- **Dynamic QR Codes** - Generated every 30 seconds, preventing screenshots/sharing
- **OTP Authentication** - Secure login via SMS/Email OTP
- **Real-time QR Scanning** - Students scan QR codes to mark attendance
- **Role-Based Access** - Student, Teacher, Admin/HOD roles with different permissions
- **Analytics & Reports** - Attendance tracking and trend analysis
- **Offline Support** - Attendance cached locally with auto-sync
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
- 📝 Manage attendance manually if needed
- 🔐 Teacher device acts as scanner only

### Admin/HOD Features
- 👨‍💼 Manage users (students, teachers)
- ✅ Verify teacher accounts
- 📊 Generate attendance reports
- 📥 Download reports (CSV/PDF)
- 🔍 Filter attendance by department/semester
- ✏️ Bulk edit attendance records
- 📈 Identify disengaged students

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
MONGODB_URI=mongodb://user:password@localhost:27017/smart_attendance
JWT_SECRET=your_32_char_secret_key
QR_ENCRYPTION_KEY=your_32_char_hex_key
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

## Contributing

This project was developed by **Neural Ninjas** for Smart India Hackathon 2025.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Last Updated:** March 21, 2026
**Version:** 1.0.0
│   │   └── sw.js               # Service worker
│   ├── src/
│   │   ├── App.js              # Main app with routing & auth context
│   │   ├── index.js            # Entry point
│   │   ├── services/api.js     # API service layer (axios)
│   │   ├── components/
│   │   │   ├── Navbar.js       # Navigation bar
│   │   │   ├── QRCodeDisplay.js  # QR code with 30s auto-refresh
│   │   │   └── QRScanner.js    # Camera-based QR scanner
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── StudentDashboard.js
│   │   │   ├── TeacherDashboard.js
│   │   │   └── AdminDashboard.js
│   │   └── styles/
│   │       └── index.css       # Complete responsive CSS
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

The backend starts at **http://localhost:5000**

A default admin account is auto-created:
- **Username:** `admin`
- **Password:** `admin123`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend starts at **http://localhost:3000**

## User Roles & Default Login

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| Admin | admin | admin123 | Auto-created on first run |
| Teacher | (created by admin) | — | Admin creates via dashboard |
| Student | (self-registration) | — | Students register themselves |

## How It Works

### Student Workflow
1. Register at `/register` with personal and academic details
2. Login and view auto-generating QR code (refreshes every 30 seconds)
3. Show QR code to teacher during class for scanning
4. Track attendance history and percentages in dashboard

### Teacher Workflow
1. Login and select a subject to **Start Session**
2. Switch to **Scan QR** tab and point camera at each student's QR code
3. System verifies token validity (30s window), student identity, and class enrollment
4. View live attendance list updating in real-time
5. Use manual override for any technical issues
6. **End Session** — all unscanned students are auto-marked absent

### Admin/HOD Workflow
1. Login with admin credentials
2. **Overview** — See college-wide statistics and activity logs
3. **Students** — View/search/filter all registered students
4. **Teachers** — Create teacher accounts and assign subjects
5. **Subjects** — Create subjects and assign to teachers
6. **Defaulters** — View students below 75% attendance
7. **Reports** — Export Excel reports with attendance percentages and daily records

## QR Code Security

Each QR code contains an encrypted JWT token with:
- Student ID & roll number
- 30-second expiration timestamp
- Unique nonce (prevents replay attacks)
- Device fingerprint (prevents sharing)
- Session binding (class-specific)
- AES-256 encryption layer (Fernet)

## Excel Reports

Generated reports include **two sheets**:
1. **Attendance Summary** — Student-wise percentage per subject with color-coded cells (green ≥75%, yellow ≥50%, red <50%)
2. **Daily Records** — Individual attendance records with date, subject, status, and timestamp

## API Endpoints

### Authentication
- `POST /api/auth/register` — Student self-registration
- `POST /api/auth/login` — Login (all roles)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user info
- `PUT /api/auth/update-profile` — Update profile

### Student
- `POST /api/student/qr-token` — Generate QR token
- `GET /api/student/attendance` — Attendance records
- `GET /api/student/attendance-summary` — Percentage summary
- `GET /api/student/active-sessions` — Current active sessions

### Teacher
- `POST /api/teacher/start-session` — Start class session
- `POST /api/teacher/end-session/:id` — End session
- `POST /api/teacher/scan-qr` — Verify QR and mark attendance
- `GET /api/teacher/session-attendance/:id` — Session attendance list
- `GET /api/teacher/subjects` — Assigned subjects
- `POST /api/teacher/manual-attendance` — Manual override

### Admin
- `GET /api/admin/dashboard` — Dashboard statistics
- `GET /api/admin/students` — List students
- `POST /api/admin/create-teacher` — Create teacher account
- `POST /api/admin/create-subject` — Create subject
- `POST /api/admin/override-attendance` — Override attendance
- `GET /api/admin/export-excel` — Download Excel report
- `GET /api/admin/defaulters` — Defaulter list

## Environment Variables (Optional)

```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
QR_ENCRYPTION_KEY=your-encryption-key
DATABASE_URL=postgresql://user:pass@localhost/smart_attendance
FLASK_ENV=production
```

## License

This project is for educational purposes.
