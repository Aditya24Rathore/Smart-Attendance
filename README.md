# Smart Attendance System

A web-based Smart Attendance System using QR codes for colleges. Students display individually generated, time-sensitive QR codes that teachers scan for instant attendance marking.

## Features

- **Student Self-Registration** — Students register via the web portal with personal & academic details
- **30-Second QR Codes** — Each student gets a unique, auto-refreshing QR code with JWT + AES-256 encryption
- **Teacher QR Scanning** — Mobile-optimized camera scanner for marking attendance instantly
- **Real-Time Attendance** — WebSocket-powered live attendance updates during class sessions
- **Admin/HOD Portal** — College-wide analytics, manual overrides, student/teacher management
- **Excel Reports** — Auto-generated reports with attendance percentages and daily records (two sheets)
- **Anti-Proxy Security** — Device fingerprinting, session binding, ultra-short token expiry
- **Role-Based Access** — Student, Teacher, Admin, HOD roles with appropriate permissions
- **PWA Support** — Installable web app with offline QR generation capability

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (PWA), QR Scanner (html5-qrcode), QR Display (qrcode.react) |
| Backend | Python Flask, Flask-SocketIO, Flask-SQLAlchemy |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | Session-based with Werkzeug password hashing |
| QR Security | JWT tokens (30s expiry) + AES-256 (Fernet) encryption |
| Reports | openpyxl for Excel generation |
| Real-time | WebSocket via Socket.IO |

## Project Structure

```
Smart Attendance/
├── backend/
│   ├── app.py                  # Main Flask application
│   ├── config.py               # Configuration settings
│   ├── models.py               # Database models (User, Student, Teacher, Subject, Attendance, etc.)
│   ├── auth.py                 # Authentication decorators
│   ├── qr_service.py           # QR token generation & verification (JWT + AES)
│   ├── requirements.txt        # Python dependencies
│   ├── routes/
│   │   ├── auth_routes.py      # Login, Register, Profile endpoints
│   │   ├── student.py          # Student QR generation, attendance history
│   │   ├── teacher.py          # Session management, QR scanning, attendance
│   │   └── admin.py            # Admin dashboard, reports, management
│   └── utils/
│       └── excel_reports.py    # Excel report generation (2 sheets)
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json       # PWA manifest
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
