# Technology Migration: Python/Flask → Node.js/Express

## Overview

The Smart Attendance backend has been completely rewritten from Python/Flask to Node.js/Express with MongoDB, aligning with the technical architecture specified in the project requirements.

## Why This Change?

### Before (Python/Flask)
- ❌ Monolithic Flask application
- ❌ SQL-based (SQLite/PostgreSQL)
- ❌ Session-based authentication
- ❌ Limited scalability

### After (Node.js/Express)
- ✅ Modular Express.js framework
- ✅ MongoDB (NoSQL) for scalability
- ✅ JWT token-based authentication
- ✅ Better async/await support
- ✅ Faster I/O operations
- ✅ Easier real-time features (Socket.io)

## Component Mapping

### Authentication
| Python/Flask | Node.js/Express | Change |
|-------|-----------|--------|
| Flask-Login (session) | JWT tokens | Stateless auth |
| Werkzeug password hash | bcryptjs | Industry standard |
| `@login_required` decorator | Middleware `verifyToken()` | More flexible |
| Manual role check | `requireRole()` middleware | Centralized |

### Database
| Python/Flask | Node.js/Express | Change |
|-------|-----------|--------|
| SQLAlchemy ORM | Mongoose ODM | Better MongoDB support |
| SQLite/PostgreSQL | MongoDB | Flexible schema |
| db.Model classes | Mongoose schemas | Cleaner syntax |
| db.ForeignKey | ref in schema | Better relationships |

### QR Code System
| Python/Flask | Node.js/Express | Change |
|-------|-----------|--------|
| `QRService` class | `QRService.js` module | Same logic |
| PyJWT | jsonwebtoken | No breaking changes |
| cryptography | crypto (Node.js built-in) | Simpler encryption |
| qrcode library | qrcode npm package | Same API |

### OTP Service
| Python/Flask | Node.js/Express | Change |
|-------|-----------|--------|
| `OTPService` class | `OTPService.js` module | Same logic |
| Manual OTP generation | Extracted to service | Better organization |
| Email via Flask-Mail | Nodemailer | More flexible |
| Firebase (optional) | Firebase Admin SDK | Same as before |

### File Structure

**Python/Flask Structure:**
```
backend/
├── app.py
├── models.py
├── auth.py
├── qr_service.py
├── routes/
│   ├── auth_routes.py
│   ├── student.py
│   ├── teacher.py
│   └── admin.py
└── utils/
    └── excel_reports.py
```

**Node.js/Express Structure:**
```
backend/
├── server.js
├── config.js
├── db.js
├── models/
│   ├── User.js
│   ├── Student.js
│   ├── Teacher.js
│   ├── Attendance.js
│   ├── Subject.js
│   └── OTP.js
├── routes/
│   ├── auth.js
│   ├── student.js
│   ├── teacher.js
│   └── admin.js
├── services/
│   ├── QRService.js
│   ├── OTPService.js
│   └── EmailService.js
├── middleware/
│   └── auth.js
└── scripts/
    ├── seedAdmin.js
    └── clearExpiredOTPs.js
```

## API Endpoint Mapping

### Student Routes
| Old Flask Route | New Express Route | Method | Change |
|-------|-----------|--------|--------|
| `/api/student/qr-display` | `/api/student/qr-code` | GET | Renamed - Gets personal QR |
| `/api/student/attendance` | `/api/student/attendance-history` | GET | Renamed |
| `/api/student/dashboard` | `/api/student/dashboard` | GET | Same |

### Teacher Routes
| Old Flask Route | New Express Route | Method | Change |
|-------|-----------|--------|--------|
| `/api/teacher/start-session` | `/api/teacher/start-session` | POST | Same, initiates session |
| `/api/teacher/scan-code` | `/api/teacher/scan-qr` | POST | Scans student QR code |
| `/api/teacher/attendance-records` | `/api/teacher/attendance-records` | GET | Same |

### Admin Routes
| Old Flask Route | New Express Route | Method | Change |
|-------|-----------|--------|--------|
| `/api/admin/students` | `/api/admin/students` | GET | Same |
| `/api/admin/teachers` | `/api/admin/teachers` | GET | Same |
| `/api/admin/attendance-report` | `/api/admin/reports/attendance` | GET | Renamed |
| `/api/admin/override-attendance` | `/api/admin/bulk-update-attendance` | POST | Renamed |

## Database Model Changes

### Users Table → Users Collection
**Added:**
- `verificationToken` - For email verification
- `verificationTokenExpiry` - Token expiry

**Changed:**
- `password_hash` → `passwordHash` (camelCase)
- Timestamps now use MongoDB default

### Students Table → Students Collection
**Changed:**
- All column names to camelCase
- `user_id` → `userId`
- `profile_photo` → `profilePhoto`
- `device_fingerprint` → `deviceFingerprint`

**Relationships:**
- Uses MongoDB `ref` instead of ForeignKey

### Attendance Table → Attendance Collection
**Same structure** but:
- All names converted to camelCase
- Compound indexes added for performance
- TTL for automatic cleanup (future feature)

### New Models
- **OTP** - Dedicated OTP storage with TTL

## Key Differences in Implementation

### 1. Authentication
**Before (Flask):**
```python
@app.route('/login', methods=['POST'])
def login():
    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        session['user_id'] = user.id
        return jsonify({'success': True})
```

**After (Express):**
```javascript
router.post('/login', async (req, res) => {
  const user = await User.findOne({ username });
  if (user && await user.checkPassword(password)) {
    const token = generateToken(user._id);
    res.json({ token, user });
  }
});
```

### 2. OTP Service
**Before:**
```python
class OTPService:
    @staticmethod
    def send_otp(phone):
        otp = str(random.randint(100000, 999999))
        # Send via SMS
```

**After:**
```javascript
async createOTP(phoneNumber, email, purpose) {
  const otpCode = this.generateOTP();
  const otp = new OTP({ phoneNumber, otpCode, expiryTime });
  await otp.save();
  await this.sendOTPviaSMS(phoneNumber, otpCode);
}
```

### 3. QR Code Generation and Encryption
**Behavior: Same, Implementation: Different**

**Before (Python):**
```python
from cryptography.fernet import Fernet

def encrypt_qr(data):
    cipher = Fernet(key)
    return cipher.encrypt(data)
```

**After (Node.js):**
```javascript
encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  // Implementation
}
```

## Migration Checklist for Development

- [x] Create Node.js/Express backend structure
- [x] Setup MongoDB connection
- [x] Implement Mongoose schemas
- [x] Convert authentication logic
- [x] Implement OTP service
- [x] Implement QR code service
- [x] Create API routes
- [x] Add middleware (auth, error handling)
- [x] Update frontend API service
- [x] Environment configuration
- [x] Documentation
- [ ] Frontend component updates (if needed)
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Deployment setup

## Dependencies Comparison

### Python/Flask
```
Flask>=3.0
Flask-SQLAlchemy>=3.1
Flask-CORS>=4.0
PyJWT>=2.8
qrcode>=7.4
```

### Node.js/Express
```
express>=4.18.2
mongoose>=7.5.0
jsonwebtoken>=9.1.0
qrcode>=1.5.3
bcryptjs>=2.4.3
```

**Benefits:**
- Fewer dependencies needed
- Better maintained npm packages
- Native crypto support
- Excellent async/await support

## Performance Improvements

1. **Request Handling:** Express handles concurrent requests better than Flask
2. **Database Queries:** Mongoose indexes optimize MongoDB queries
3. **Encryption:** Node.js crypto module is optimized
4. **Scalability:** Easier to scale with Node.js clustering

## Breaking Changes for Frontend

### API Base URL
```javascript
// Before
const API_BASE = 'http://localhost:5000'
api.post('/api/auth/login', data)

// After
const API_BASE = 'http://localhost:5000/api'
api.post('/auth/student/verify-otp', data) // Note: /api is in BASE now
```

### Authentication Headers
```javascript
// Before - Session-based
browser automatically sends cookie

// After - JWT Token-based
headers: { 'Authorization': 'Bearer ' + token }
```

### Response Format
Response structure remains the same, so minimal frontend changes needed.

## What Stayed the Same

1. **QR Code Logic** - Enrollment-based static student QR codes
2. **OTP Concept** - Same SMS/Email delivery approach
3. **Role-Based Access** - Same student/teacher/admin roles
4. **Attendance Tracking** - Same marking and reporting logic
5. **API Response Format** - Same JSON structure

## What's New

1. **Mongoose ODM** - Better MongoDB integration
2. **JWT Tokens** - Stateless authentication
3. **Service Classes** - Better code organization
4. **Middleware Pattern** - Cleaner authentication flow
5. **Script Automation** - Admin seeding, OTP cleanup

## Troubleshooting Migration Issues

### Old Routes Not Found
**Solution:** Update frontend API calls with new route paths

### Authentication Errors
**Solution:** Ensure JWT token is being sent in Authorization header

### CORS Errors
**Solution:** Check CORS_ORIGIN in backend .env matches frontend URL

### Database Connection Issues
**Solution:** Verify MongoDB URI and credentials in .env

## Next Steps

1. ✅ Install dependencies (`npm install` in backend & frontend)
2. ✅ Configure `.env` files
3. ✅ Start MongoDB
4. ✅ Seed admin user with `node scripts/seedAdmin.js`
5. ✅ Start backend: `npm run dev`
6. ✅ Start frontend: `npm start`
7. ⏭️ Test all features end-to-end
8. ⏭️ Deploy to production

## Rollback Plan

If issues arise:
1. Keep Python/Flask code as backup
2. Database: Export MongoDB data before migration
3. Frontend: Keep old API service as fallback

---

**Migration Date:** March 21, 2026
**From:** Python 3.9 + Flask 3.0
**To:** Node.js 18+ + Express.js 4.18
**Database:** SQLite/PostgreSQL → MongoDB 4.4+
**Status:** ✅ Complete
