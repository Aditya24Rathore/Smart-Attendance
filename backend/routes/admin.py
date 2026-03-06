from flask import Blueprint, request, jsonify, send_file
from models import db, User, Student, Teacher, Subject, Attendance, ClassSession, AuditLog
from auth import role_required
from datetime import datetime, timezone
import re

admin_bp = Blueprint('admin', __name__)

USERNAME_RE = re.compile(r'^[a-zA-Z0-9_]{3,30}$')


@admin_bp.route('/api/admin/dashboard', methods=['GET'])
@role_required('admin', 'hod')
def admin_dashboard():
    """Get admin dashboard overview."""
    total_students = Student.query.count()
    total_teachers = Teacher.query.count()
    total_subjects = Subject.query.count()
    active_sessions = ClassSession.query.filter_by(is_active=True).count()

    today = datetime.now(timezone.utc).date()
    today_sessions = ClassSession.query.filter_by(date=today).count()
    today_attendance = Attendance.query.join(ClassSession).filter(
        ClassSession.date == today, Attendance.status == 'present'
    ).count()

    recent_logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(20).all()

    return jsonify({
        'stats': {
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_subjects': total_subjects,
            'active_sessions': active_sessions,
            'today_sessions': today_sessions,
            'today_attendance': today_attendance,
        },
        'recent_logs': [{
            'action': log.action,
            'details': log.details,
            'timestamp': log.timestamp.isoformat() if log.timestamp else None,
        } for log in recent_logs],
    }), 200


@admin_bp.route('/api/admin/students', methods=['GET'])
@role_required('admin', 'hod')
def list_students():
    """List all students with optional filters."""
    department = request.args.get('department')
    semester = request.args.get('semester', type=int)
    search = request.args.get('search', '').strip()

    query = Student.query.join(User)
    if department:
        query = query.filter(Student.department == department)
    if semester:
        query = query.filter(Student.semester == semester)
    if search:
        query = query.filter(
            db.or_(
                User.full_name.ilike(f'%{search}%'),
                Student.roll_number.ilike(f'%{search}%'),
            )
        )

    students = query.order_by(Student.roll_number).all()
    return jsonify({'students': [s.to_dict() for s in students]}), 200


@admin_bp.route('/api/admin/teachers', methods=['GET'])
@role_required('admin', 'hod')
def list_teachers():
    """List all teachers."""
    teachers = Teacher.query.join(User).order_by(User.full_name).all()
    return jsonify({'teachers': [t.to_dict() for t in teachers]}), 200


@admin_bp.route('/api/admin/create-teacher', methods=['POST'])
@role_required('admin')
def create_teacher():
    """Create a new teacher account."""
    data = request.get_json()
    required = ['username', 'password', 'full_name', 'employee_id', 'department']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    username = data['username'].strip()
    if not USERNAME_RE.match(username):
        return jsonify({'error': 'Username must be 3-30 characters (letters, numbers, underscores)'}), 400

    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    if Teacher.query.filter_by(employee_id=data['employee_id'].strip()).first():
        return jsonify({'error': 'Employee ID already exists'}), 409

    user = User(
        username=username,
        role='teacher',
        full_name=data['full_name'].strip(),
        phone=data.get('phone', '').strip(),
        email=data.get('email', '').strip(),
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()

    teacher = Teacher(
        user_id=user.id,
        employee_id=data['employee_id'].strip(),
        department=data['department'].strip(),
        designation=data.get('designation', '').strip(),
    )
    db.session.add(teacher)

    audit = AuditLog(user_id=request.current_user.id, action='create_teacher',
                     details=f'Created teacher: {data["employee_id"]}',
                     ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()

    return jsonify({'message': 'Teacher created', 'teacher': teacher.to_dict()}), 201


@admin_bp.route('/api/admin/create-subject', methods=['POST'])
@role_required('admin', 'hod')
def create_subject():
    """Create a new subject."""
    data = request.get_json()
    required = ['name', 'code', 'department', 'semester']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    if Subject.query.filter_by(code=data['code'].strip()).first():
        return jsonify({'error': 'Subject code already exists'}), 409

    subject = Subject(
        name=data['name'].strip(),
        code=data['code'].strip(),
        department=data['department'].strip(),
        semester=int(data['semester']),
        teacher_id=data.get('teacher_id'),
    )
    db.session.add(subject)
    db.session.commit()

    return jsonify({'message': 'Subject created', 'subject': subject.to_dict()}), 201


@admin_bp.route('/api/admin/subjects', methods=['GET'])
@role_required('admin', 'hod', 'teacher')
def list_subjects():
    """List all subjects."""
    department = request.args.get('department')
    query = Subject.query
    if department:
        query = query.filter_by(department=department)
    subjects = query.order_by(Subject.code).all()
    return jsonify({'subjects': [s.to_dict() for s in subjects]}), 200


@admin_bp.route('/api/admin/override-attendance', methods=['POST'])
@role_required('admin', 'hod')
def override_attendance():
    """Manual override of attendance records (admin/HOD only)."""
    data = request.get_json()
    if not data or not data.get('student_id') or not data.get('session_id') or not data.get('status'):
        return jsonify({'error': 'student_id, session_id, and status required'}), 400

    if data['status'] not in ('present', 'absent', 'late'):
        return jsonify({'error': 'Invalid status'}), 400

    student = Student.query.get(data['student_id'])
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    session_obj = ClassSession.query.get(data['session_id'])
    if not session_obj:
        return jsonify({'error': 'Session not found'}), 404

    existing = Attendance.query.filter_by(
        student_id=student.id, session_id=session_obj.id
    ).first()

    if existing:
        existing.status = data['status']
        existing.override_by = request.current_user.id
        existing.override_reason = data.get('reason', '')
        existing.marked_by = 'manual_override'
    else:
        attendance = Attendance(
            student_id=student.id,
            session_id=session_obj.id,
            subject_id=session_obj.subject_id,
            status=data['status'],
            marked_by='manual_override',
            override_by=request.current_user.id,
            override_reason=data.get('reason', ''),
        )
        db.session.add(attendance)

    audit = AuditLog(user_id=request.current_user.id, action='override_attendance',
                     details=f'Override: {student.roll_number} to {data["status"]} (reason: {data.get("reason", "N/A")})',
                     ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()

    return jsonify({'message': 'Attendance overridden successfully'}), 200


@admin_bp.route('/api/admin/attendance-report', methods=['GET'])
@role_required('admin', 'hod', 'teacher')
def attendance_report():
    """Get attendance report with filters."""
    department = request.args.get('department')
    subject_id = request.args.get('subject_id', type=int)
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = Attendance.query.join(ClassSession).join(Student)

    if department:
        query = query.filter(ClassSession.department == department)
    if subject_id:
        query = query.filter(Attendance.subject_id == subject_id)
    if date_from:
        query = query.filter(ClassSession.date >= date_from)
    if date_to:
        query = query.filter(ClassSession.date <= date_to)

    records = query.order_by(Attendance.marked_at.desc()).limit(500).all()

    return jsonify({'records': [r.to_dict() for r in records]}), 200


@admin_bp.route('/api/admin/departments', methods=['GET'])
@role_required('admin', 'hod', 'teacher')
def list_departments():
    """Get list of distinct departments."""
    depts = db.session.query(Student.department).distinct().all()
    return jsonify({'departments': [d[0] for d in depts]}), 200


@admin_bp.route('/api/admin/export-excel', methods=['GET'])
@role_required('admin', 'hod')
def export_excel():
    """Export attendance report as Excel file."""
    from utils.excel_reports import generate_attendance_excel

    department = request.args.get('department')
    subject_id = request.args.get('subject_id', type=int)
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    filepath = generate_attendance_excel(department, subject_id, date_from, date_to)
    return send_file(filepath, as_attachment=True,
                     download_name=f'attendance_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx')


@admin_bp.route('/api/admin/defaulters', methods=['GET'])
@role_required('admin', 'hod', 'teacher')
def get_defaulters():
    """Get students below minimum attendance percentage."""
    min_pct = request.args.get('min_percentage', 75, type=float)
    department = request.args.get('department')

    query = Student.query
    if department:
        query = query.filter_by(department=department)

    students = query.all()
    defaulters = []

    for student in students:
        subjects = Subject.query.filter_by(
            department=student.department, semester=student.semester
        ).all()

        total_sessions = 0
        total_present = 0
        for subject in subjects:
            sessions = ClassSession.query.filter_by(
                subject_id=subject.id, is_active=False
            ).count()
            present = Attendance.query.filter_by(
                student_id=student.id, subject_id=subject.id
            ).filter(Attendance.status.in_(['present', 'late'])).count()
            total_sessions += sessions
            total_present += present

        pct = round((total_present / total_sessions * 100), 2) if total_sessions > 0 else 0

        if pct < min_pct and total_sessions > 0:
            defaulters.append({
                'student': student.to_dict(),
                'percentage': pct,
                'total_sessions': total_sessions,
                'attended': total_present,
            })

    defaulters.sort(key=lambda x: x['percentage'])
    return jsonify({'defaulters': defaulters, 'threshold': min_pct}), 200


@admin_bp.route('/api/admin/toggle-user/<int:user_id>', methods=['POST'])
@role_required('admin')
def toggle_user(user_id):
    """Activate or deactivate a user account."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.id == request.current_user.id:
        return jsonify({'error': 'Cannot modify your own account'}), 400

    user.is_active = not user.is_active
    audit = AuditLog(user_id=request.current_user.id, action='toggle_user',
                     details=f'User {user.username} {"activated" if user.is_active else "deactivated"}',
                     ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()

    return jsonify({'message': f'User {"activated" if user.is_active else "deactivated"}',
                    'user': user.to_dict()}), 200
