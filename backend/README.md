# Smart Attendance Backend

## Technology Stack

- **Node.js & Express.js** - Backend framework
- **MongoDB** - Database
- **Firebase** - OTP Authentication
- **JWT** - Token-based authentication
- **QR Code** - Dynamic QR codes for attendance (refreshes every 30 seconds)

## Project Structure

```
backend/
├── models/           # MongoDB Mongoose schemas
├── routes/           # API route handlers
├── middleware/       # Authentication & authorization
├── services/         # Business logic (QR, OTP)
├── server.js         # Main application file
├── db.js             # MongoDB connection
├── config.js         # Configuration management
└── package.json      # Dependencies
```

## Installation

```bash
# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Configure your MongoDB and Firebase credentials in .env
```

## Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### Student Routes
- `POST /student/send-otp` - Send OTP for student registration
- `POST /student/verify-otp` - Verify OTP and login/register

#### Teacher Routes
- `POST /teacher/send-otp` - Send OTP for teacher login
- `POST /teacher/verify-otp` - Verify OTP and login

#### Admin/HOD Routes
- `POST /admin/login` - Login with credentials

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
- `GET /dashboard` - Admin dashboard
- `GET /students` - List all students
- `GET /teachers` - List all teachers
- `POST /verify-teacher/:teacherId` - Verify teacher
- `GET /reports/attendance` - Generate attendance reports
- `POST /bulk-update-attendance` - Bulk update attendance

## QR Code System

- QR codes are generated dynamically and refresh every **30 seconds**
- Each QR code is encrypted and contains:
  - Teacher ID
  - Class/Session ID
  - Timestamp
  - Random unique value
- QR codes are **non-shareable** - cannot be screenshotted or shared
- Prevents proxy attendance

## Security Features

- **JWT Token-based authentication**
- **OTP verification** for students and teachers
- **Role-based access control** (Student, Teacher, Admin/HOD)
- **Encrypted QR codes** using AES-256
- **Rate limiting** to prevent brute force attacks
- **CORS** configured for frontend integration
- **HTTPS recommended** in production

## Environment Variables

See `.env.example` for all configuration options.

## Database Schema

### Users
- username, passwordHash, role, fullName, email, phone, isActive, isVerified

### Students
- userId, enrollmentNo, department, course, semester, year, profilePhoto, mobileNumber

### Teachers
- userId, teacherId, department, branch, semester, designaton, assignedSubjects

### Attendance
- studentId, teacherId, enrollmentNo, qrCodeHash, scannedAt, attendanceStatus

### QRCodes
- teacherId, qrHash, qrData, qrImage, generatedAt, expiresAt, usageCount

### OTP
- userId, phoneNumber, email, otpCode, purpose, isUsed, expiryTime

## Development Notes

- MongoDB must be running before starting the server
- Configure Firebase Admin SDK for OTP delivery
- Update `.env` with your actual credentials before deployment
