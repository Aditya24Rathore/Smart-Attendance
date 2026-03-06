from flask import Blueprint, request, jsonify, session, current_app
from models import db, Student, Attendance, ClassSession, Subject
from auth import login_required, role_required

student_bp = Blueprint('student', __name__)


@student_bp.route('/api/student/qr-token', methods=['POST'])
@role_required('student')
def generate_qr_token():
    """Generate a new QR token for the student (30-second validity)."""
    user = request.current_user
    student = user.student
    if not student:
        return jsonify({'error': 'Student profile not found'}), 404

    data = request.get_json() or {}
    device_fp = data.get('device_fingerprint')
    session_id = data.get('session_id')

    qr_service = current_app.config.get('QR_SERVICE')
    token = qr_service.generate_qr_token(
        student_id=student.id,
        roll_number=student.roll_number,
        session_id=session_id,
        device_fingerprint=device_fp,
    )

    return jsonify({
        'qr_token': token,
        'expires_in': 30,
        'student_name': user.full_name,
        'roll_number': student.roll_number,
    }), 200


@student_bp.route('/api/student/attendance', methods=['GET'])
@role_required('student')
def get_attendance():
    """Get student's attendance records."""
    student = request.current_user.student
    if not student:
        return jsonify({'error': 'Student profile not found'}), 404

    subject_id = request.args.get('subject_id', type=int)
    query = Attendance.query.filter_by(student_id=student.id)
    if subject_id:
        query = query.filter_by(subject_id=subject_id)

    records = query.order_by(Attendance.marked_at.desc()).all()
    return jsonify({'attendance': [r.to_dict() for r in records]}), 200


@student_bp.route('/api/student/attendance-summary', methods=['GET'])
@role_required('student')
def get_attendance_summary():
    """Get attendance summary with percentages per subject."""
    student = request.current_user.student
    if not student:
        return jsonify({'error': 'Student profile not found'}), 404

    subjects = Subject.query.filter_by(
        department=student.department,
        semester=student.semester
    ).all()

    summary = []
    for subject in subjects:
        total_sessions = ClassSession.query.filter_by(
            subject_id=subject.id, is_active=False
        ).count()
        attended = Attendance.query.filter_by(
            student_id=student.id, subject_id=subject.id, status='present'
        ).count()
        late = Attendance.query.filter_by(
            student_id=student.id, subject_id=subject.id, status='late'
        ).count()

        percentage = round(((attended + late) / total_sessions * 100), 2) if total_sessions > 0 else 0

        summary.append({
            'subject_id': subject.id,
            'subject_name': subject.name,
            'subject_code': subject.code,
            'total_sessions': total_sessions,
            'present': attended,
            'late': late,
            'absent': total_sessions - attended - late,
            'percentage': percentage,
        })

    overall_total = sum(s['total_sessions'] for s in summary)
    overall_present = sum(s['present'] + s['late'] for s in summary)
    overall_pct = round((overall_present / overall_total * 100), 2) if overall_total > 0 else 0

    return jsonify({
        'summary': summary,
        'overall_percentage': overall_pct,
        'student': student.to_dict(),
    }), 200


@student_bp.route('/api/student/active-sessions', methods=['GET'])
@role_required('student')
def get_active_sessions():
    """Get currently active class sessions for the student's dept/semester."""
    student = request.current_user.student
    if not student:
        return jsonify({'error': 'Student profile not found'}), 404

    sessions = ClassSession.query.filter_by(
        department=student.department,
        semester=student.semester,
        is_active=True,
    ).all()

    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200


@student_bp.route('/api/student/register-device', methods=['POST'])
@role_required('student')
def register_device():
    """Register device fingerprint for the student."""
    student = request.current_user.student
    if not student:
        return jsonify({'error': 'Student profile not found'}), 404

    data = request.get_json()
    if not data or not data.get('device_fingerprint'):
        return jsonify({'error': 'Device fingerprint required'}), 400

    student.device_fingerprint = data['device_fingerprint']
    db.session.commit()

    return jsonify({'message': 'Device registered successfully'}), 200
