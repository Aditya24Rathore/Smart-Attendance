from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')  # student, teacher, admin, hod
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    roll_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    department = db.Column(db.String(100), nullable=False)
    course = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    profile_photo = db.Column(db.String(256))
    device_fingerprint = db.Column(db.String(256))
    registered_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('student', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'roll_number': self.roll_number,
            'department': self.department,
            'course': self.course,
            'semester': self.semester,
            'year': self.year,
            'profile_photo': self.profile_photo,
            'full_name': self.user.full_name if self.user else None,
            'username': self.user.username if self.user else None,
            'phone': self.user.phone if self.user else None,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None,
        }


class Teacher(db.Model):
    __tablename__ = 'teachers'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    employee_id = db.Column(db.String(50), unique=True, nullable=False)
    department = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(100))

    user = db.relationship('User', backref=db.backref('teacher', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'employee_id': self.employee_id,
            'department': self.department,
            'designation': self.designation,
            'full_name': self.user.full_name if self.user else None,
        }


class Subject(db.Model):
    __tablename__ = 'subjects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'))

    teacher = db.relationship('Teacher', backref='subjects')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'department': self.department,
            'semester': self.semester,
            'teacher_id': self.teacher_id,
            'teacher_name': self.teacher.user.full_name if self.teacher and self.teacher.user else None,
        }


class ClassSession(db.Model):
    __tablename__ = 'class_sessions'

    id = db.Column(db.Integer, primary_key=True)
    session_token = db.Column(db.String(256), unique=True, nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    date = db.Column(db.Date, nullable=False, default=lambda: datetime.now(timezone.utc).date())
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    subject = db.relationship('Subject', backref='sessions')
    teacher = db.relationship('Teacher', backref='sessions')

    def to_dict(self):
        return {
            'id': self.id,
            'session_token': self.session_token,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'subject_code': self.subject.code if self.subject else None,
            'teacher_id': self.teacher_id,
            'teacher_name': self.teacher.user.full_name if self.teacher and self.teacher.user else None,
            'department': self.department,
            'semester': self.semester,
            'date': self.date.isoformat() if self.date else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'is_active': self.is_active,
        }


class Attendance(db.Model):
    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey('class_sessions.id'), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False, index=True)
    status = db.Column(db.String(10), nullable=False, default='present')  # present, absent, late
    marked_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    marked_by = db.Column(db.String(50))  # 'qr_scan', 'manual_override'
    device_info = db.Column(db.String(256))
    override_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    override_reason = db.Column(db.String(256))

    student = db.relationship('Student', backref='attendances')
    session = db.relationship('ClassSession', backref='attendances')
    subject = db.relationship('Subject', backref='attendances')

    __table_args__ = (
        db.UniqueConstraint('student_id', 'session_id', name='unique_student_session'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.user.full_name if self.student and self.student.user else None,
            'roll_number': self.student.roll_number if self.student else None,
            'session_id': self.session_id,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'status': self.status,
            'marked_at': self.marked_at.isoformat() if self.marked_at else None,
            'marked_by': self.marked_by,
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref='audit_logs')
