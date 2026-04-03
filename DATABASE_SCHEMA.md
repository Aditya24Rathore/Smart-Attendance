# Database Schema & Relationships

This document describes the MongoDB database schema for the Smart Attendance System.

## Collections Overview

### 1. Users Collection
**Purpose:** Store all user accounts (Students, Teachers, Admins, HODs)

```javascript
{
  _id: ObjectId,
  username: String (unique, index),
  passwordHash: String,
  role: String (enum: ['student', 'teacher', 'admin', 'hod']),
  fullName: String,
  email: String (unique, sparse),
  phone: String,
  isActive: Boolean (default: true),
  isVerified: Boolean (default: false),
  verificationToken: String,
  verificationTokenExpiry: Date,
  createdAt: Date (default: now),
  updatedAt: Date (default: now)
}
```

**Indexes:**
- `username` - Unique, for login
- `email` - Unique, sparse for optional emails

---

### 2. Students Collection
**Purpose:** Student-specific information linked to Users

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique),
  enrollmentNo: String (unique, index),
  rollNumber: String (unique, sparse),
  department: String,
  course: String,
  semester: Number,
  year: Number,
  branch: String,
  profilePhoto: String (URL/path),
  deviceFingerprint: String,
  mobileNumber: String,
  registeredAt: Date (default: now),
  isVerified: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `enrollmentNo` - For quick lookup by enrollment number
- `userId` - For quick user lookup

---

### 3. Teachers Collection
**Purpose:** Teacher-specific information and assignments

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique, required),
  teacherId: String (unique, index, required),
  employeeId: String (unique, sparse),
  department: String (required),
  branch: String (required),
  semester: Number,
  designation: String,
  assignedSubjects: [ObjectId] (ref: Subject),
  isVerified: Boolean (default: false),
  verificationApprovedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `teacherId` - For quick teacher lookup
- `userId` - For quick user lookup

---

### 4. Attendance Collection
**Purpose:** Store attendance records

```javascript
{
  _id: ObjectId,
  studentId: ObjectId (ref: Student, index),
  enrollmentNo: String (index),
  teacherId: ObjectId (ref: Teacher, index),
  subjectId: ObjectId (ref: Subject),
  qrCodeHash: String (index),
  qrGeneratedAt: Date (required),
  scannedAt: Date (index, default: now),
  ipAddress: String,
  deviceInfo: String (User-Agent),
  attendanceStatus: String (enum: ['present', 'absent', 'late', 'excused']),
  remarks: String,
  isSynced: Boolean (default: true),
  syncedAt: Date,
  createdAt: Date (default: now)
}
```

**Indexes:**
- `{ studentId: 1, scannedAt: 1 }` - For efficient student attendance queries
- `{ teacherId: 1, scannedAt: 1 }` - For teacher's class attendance
- `{ enrollmentNo: 1, scannedAt: 1 }` - By enrollment number and date
- `qrCodeHash` - For QR code verification
- `scannedAt` - For date-range queries

---

### 5. Subjects Collection
**Purpose:** Academic subjects and course information

```javascript
{
  _id: ObjectId,
  subjectCode: String (unique, index),
  subjectName: String,
  department: String,
  semester: Number,
  creditHours: Number,
  teacherId: ObjectId (ref: Teacher),
  assignedTeachers: [ObjectId] (ref: Teacher),
  students: [ObjectId] (ref: Student),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `subjectCode` - For quick subject lookup

---

### 6. OTP Collection
**Purpose:** One-Time Password records for authentication

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, sparse),
  phoneNumber: String (index),
  email: String (index, sparse),
  otpCode: String,
  otpHash: String (hashed for security),
  purpose: String (enum: ['registration', 'login', 'verification', 'password_reset']),
  isUsed: Boolean (default: false),
  usedAt: Date,
  attempts: Number (default: 0),
  maxAttempts: Number (default: 5),
  expiryTime: Date (index, TTL: 600 seconds),
  createdAt: Date
}
```

**TTL (Time-To-Live):**
- Documents auto-delete 10 minutes after creation
- MongoDB will remove expired OTP records automatically

---

## Data Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                          USERS                              │
│ (student, teacher, admin, hod)                              │
└─────────────────────────────────────────────────────────────┘
        ↓ (userId)              ↓ (userId)            ↓ (userId)
     ┌──────────┐           ┌──────────┐        ┌──────────┐
     │ STUDENTS │           │ TEACHERS │        │  ADMINS  │
     └──────────┘           └──────────┘        └──────────┘
        ↓ (studentId)          ↓ (teacherId)
     ┌──────────────────────────────────────┐
     │        ATTENDANCE RECORDS            │
     │ (marks presence, QR code used)       │
     └──────────────────────────────────────┘
        ↓ (qrCodeHash)          
     ┌──────────────────────────────────────┐
     │         QR CODE RECORDS              │
     │ (generated by teachers)              │
     └──────────────────────────────────────┘
```

## Query Examples

### Get Student Attendance Summary
```javascript
db.attendance.aggregate([
  { $match: { studentId: ObjectId("...") } },
  { $group: {
      _id: "$attendanceStatus",
      count: { $sum: 1 }
    }
  }
])
```

### Get Teacher's Class Attendance
```javascript
db.attendance.find({
  teacherId: ObjectId("..."),
  scannedAt: { 
    $gte: ISODate("2024-03-21"),
    $lt: ISODate("2024-03-22")
  }
}).populate('studentId')
```

### Get Monthly Attendance Report
```javascript
db.attendance.aggregate([
  { $match: {
      enrollmentNo: "E001",
      scannedAt: {
        $gte: ISODate("2024-03-01"),
        $lt: ISODate("2024-04-01")
      }
    }
  },
  { $group: {
      _id: null,
      presentDays: { $sum: { $cond: [{ $eq: ["$attendanceStatus", "present"] }, 1, 0] } },
      totalDays: { $sum: 1 }
    }
  }
])
```

## Indexing Strategy

### For Performance:
1. **Frequently Queried Fields:**
   - `username` (login)
   - `enrollmentNo` (student lookup)
   - `teacherId` (teacher lookup)

2. **Date Range Queries:**
   - `scannedAt` (attendance history)
   - `createdAt` (general time-based queries)

3. **Compound Indexes:**
   - `{ studentId: 1, scannedAt: 1 }` - For efficient student attendance queries
   - `{ enrollmentNo: 1, scannedAt: 1 }` - By date

### For Foreign Keys:
- All `ref` fields have indexes for JOIN operations

## Data Constraints

### Uniqueness:
- User.username - Must be unique
- User.email - Unique when provided
- Student.enrollmentNo - Must be unique
- Teacher.teacherId - Must be unique
- Subject.subjectCode - Must be unique
- QRCode.qrHash - Must be unique

### Required Fields:
- User: username, passwordHash, role
- Student: userId, enrollmentNo, department, course, semester, year
- Teacher: userId, teacherId, department, branch
- Attendance: studentId, teacherId, qrCodeHash, qrGeneratedAt
- OTP: phoneNumber/email, otpHash, expiryTime
- QRCode: teacherId, qrHash, qrData, qrImage

## Data Validation

### User Password:
- Minimum 8 characters
- Hashed using bcryptjs before storage

### Phone Numbers:
- Format: +91XXXXXXXXXX or XXXXXXXXXX
- Validated in API before storage

### Email:
- Standard email format validation
- Unique constraint if provided

### OTP:
- Default 6 digits
- Hashed before storage
- Auto-expires after 10 minutes

### QR Code:
- Static codes based on student enrollment
- Valid throughout student enrollment (no expiry)
- Encrypted using AES-256
- Non-transferable (tied to enrollment number)

---

**Last Updated:** March 21, 2026
**Version:** 1.0.0
