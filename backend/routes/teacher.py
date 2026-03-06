from flask import Blueprint, request, jsonify, current_app
from models import db, Student, Teacher, Attendance, ClassSession, Subject, AuditLog
from auth import role_required
from datetime import datetime, timezone
import secrets

teacher_bp = Blueprint('teacher', __name__)


@teacher_bp.route('/api/teacher/start-session', methods=['POST'])
@role_required('teacher')
def start_session():
    """Start a new class session."""
    data = request.get_json()
    if not data or not data.get('subject_id'):
        return jsonify({'error': 'Subject ID required'}), 400

    teacher = request.current_user.teacher
    if not teacher:
        return jsonify({'error': 'Teacher profile not found'}), 404

    subject = Subject.query.get(data['subject_id'])
    if not subject:
        return jsonify({'error': 'Subject not found'}), 404

    # Check for existing active session
    active = ClassSession.query.filter_by(
        teacher_id=teacher.id, is_active=True
    ).first()
    if active:
        return jsonify({'error': 'You already have an active session', 'session': active.to_dict()}), 409

    session_obj = ClassSession(
        session_token=secrets.token_urlsafe(32),
        subject_id=subject.id,
        teacher_id=teacher.id,
        department=subject.department,
        semester=subject.semester,
        start_time=datetime.now(timezone.utc),
    )
    db.session.add(session_obj)

    audit = AuditLog(user_id=request.current_user.id, action='start_session',
                     details=f'Session started for {subject.code}',
                     ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()

    return jsonify({'message': 'Session started', 'session': session_obj.to_dict()}), 201


@teacher_bp.route('/api/teacher/end-session/<int:session_id>', methods=['POST'])
@role_required('teacher')
def end_session(session_id):
    """End an active class session."""
    teacher = request.current_user.teacher
    session_obj = ClassSession.query.filter_by(
        id=session_id, teacher_id=teacher.id, is_active=True
    ).first()

    if not session_obj:
        return jsonify({'error': 'Active session not found'}), 404

    session_obj.is_active = False
    session_obj.end_time = datetime.now(timezone.utc)

    # Mark all students who weren't scanned as absent
    enrolled_students = Student.query.filter_by(
        department=session_obj.department,
        semester=session_obj.semester,
    ).all()

    present_ids = {a.student_id for a in
                   Attendance.query.filter_by(session_id=session_obj.id).all()}

    for student in enrolled_students:
        if student.id not in present_ids:
            absent_record = Attendance(
                student_id=student.id,
                session_id=session_obj.id,
                subject_id=session_obj.subject_id,
                status='absent',
                marked_by='auto',
            )
            db.session.add(absent_record)

    audit = AuditLog(user_id=request.current_user.id, action='end_session',
                     details=f'Session {session_id} ended',
                     ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()

    return jsonify({'message': 'Session ended', 'session': session_obj.to_dict()}), 200


@teacher_bp.route('/api/teacher/scan-qr', methods=['POST'])
@role_required('teacher')
def scan_qr():
    """Verify scanned QR code and mark attendance."""
    data = request.get_json()
    if not data or not data.get('qr_token') or not data.get('session_id'):
        return jsonify({'error': 'QR token and session ID required'}), 400

    teacher = request.current_user.teacher
    session_obj = ClassSession.query.filter_by(
        id=data['session_id'], teacher_id=teacher.id, is_active=True
    ).first()

    if not session_obj:
        return jsonify({'error': 'No active session found'}), 404

    qr_service = current_app.config.get('QR_SERVICE')
    result = qr_service.verify_qr_token(data['qr_token'])

    if not result['valid']:
        return jsonify({'error': result['error']}), 400

    student = Student.query.get(result['student_id'])
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    # Verify student belongs to this class
    if student.department != session_obj.department or student.semester != session_obj.semester:
        return jsonify({'error': 'Student not enrolled in this class'}), 403

    # Check if already marked
    existing = Attendance.query.filter_by(
        student_id=student.id, session_id=session_obj.id
    ).first()

    if existing and existing.status == 'present':
        return jsonify({'message': 'Already marked present', 'attendance': existing.to_dict()}), 200

    if existing:
        existing.status = 'present'
        existing.marked_at = datetime.now(timezone.utc)
        existing.marked_by = 'qr_scan'
    else:
        attendance = Attendance(
            student_id=student.id,
            session_id=session_obj.id,
            subject_id=session_obj.subject_id,
            status='present',
            marked_by='qr_scan',
            device_info=data.get('device_info'),
        )
        db.session.add(attendance)
        existing = attendance

    audit = AuditLog(user_id=request.current_user.id, action='mark_attendance',
                     details=f'QR scan: {student.roll_number} marked present',
                     ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        'message': f'{student.user.full_name} marked present',
        'attendance': existing.to_dict(),
        'student': student.to_dict(),
    }), 200


@teacher_bp.route('/api/teacher/session-attendance/<int:session_id>', methods=['GET'])
@role_required('teacher')
def get_session_attendance(session_id):
    """Get attendance list for a session."""
    teacher = request.current_user.teacher
    session_obj = ClassSession.query.filter_by(
        id=session_id, teacher_id=teacher.id
    ).first()

    if not session_obj:
        return jsonify({'error': 'Session not found'}), 404

    # Get all students for this department/semester
    students = Student.query.filter_by(
        department=session_obj.department,
        semester=session_obj.semester,
    ).all()

    attendance_map = {}
    for a in Attendance.query.filter_by(session_id=session_obj.id).all():
        attendance_map[a.student_id] = a.to_dict()

    student_list = []
    for s in students:
        att = attendance_map.get(s.id)
        student_list.append({
            'student': s.to_dict(),
            'status': att['status'] if att else 'not_marked',
            'marked_at': att['marked_at'] if att else None,
        })

    present_count = sum(1 for s in student_list if s['status'] == 'present')
    total = len(student_list)

    return jsonify({
        'session': session_obj.to_dict(),
        'students': student_list,
        'present_count': present_count,
        'total_students': total,
    }), 200


@teacher_bp.route('/api/teacher/subjects', methods=['GET'])
@role_required('teacher')
def get_teacher_subjects():
    """Get subjects assigned to the teacher."""
    teacher = request.current_user.teacher
    if not teacher:
        return jsonify({'error': 'Teacher profile not found'}), 404

    subjects = Subject.query.filter_by(teacher_id=teacher.id).all()
    return jsonify({'subjects': [s.to_dict() for s in subjects]}), 200


@teacher_bp.route('/api/teacher/sessions', methods=['GET'])
@role_required('teacher')
def get_teacher_sessions():
    """Get all sessions for the teacher."""
    teacher = request.current_user.teacher
    if not teacher:
        return jsonify({'error': 'Teacher profile not found'}), 404

    sessions = ClassSession.query.filter_by(teacher_id=teacher.id)\
        .order_by(ClassSession.created_at.desc()).limit(50).all()
    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200


@teacher_bp.route('/api/teacher/manual-attendance', methods=['POST'])
@role_required('teacher')
def manual_attendance():
    """Manually mark attendance (for technical issues)."""
    data = request.get_json()
    if not data or not data.get('student_id') or not data.get('session_id') or not data.get('status'):
        return jsonify({'error': 'student_id, session_id, and status required'}), 400

    teacher = request.current_user.teacher
    session_obj = ClassSession.query.filter_by(
        id=data['session_id'], teacher_id=teacher.id
    ).first()

    if not session_obj:
        return jsonify({'error': 'Session not found'}), 404

    student = Student.query.get(data['student_id'])
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    if data['status'] not in ('present', 'absent', 'late'):
        return jsonify({'error': 'Invalid status'}), 400

    existing = Attendance.query.filter_by(
        student_id=student.id, session_id=session_obj.id
    ).first()

    if existing:
        existing.status = data['status']
        existing.marked_by = 'manual_teacher'
        existing.marked_at = datetime.now(timezone.utc)
    else:
        attendance = Attendance(
            student_id=student.id,
            session_id=session_obj.id,
            subject_id=session_obj.subject_id,
            status=data['status'],
            marked_by='manual_teacher',
        )
        db.session.add(attendance)

    audit = AuditLog(user_id=request.current_user.id, action='manual_attendance',
                     details=f'Manual: {student.roll_number} marked {data["status"]}',
                     ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()

    return jsonify({'message': f'Attendance updated for {student.user.full_name}'}), 200
