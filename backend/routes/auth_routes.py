from flask import Blueprint, request, jsonify, session
from models import db, User, Student, AuditLog
from auth import login_required
import re

auth_bp = Blueprint('auth', __name__)

USERNAME_RE = re.compile(r'^[a-zA-Z0-9_]{3,30}$')


@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    """Student self-registration endpoint."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    required = ['username', 'password', 'full_name', 'roll_number', 'department', 'course', 'semester', 'year', 'phone']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    username = data['username'].strip()
    if not USERNAME_RE.match(username):
        return jsonify({'error': 'Username must be 3-30 characters (letters, numbers, underscores)'}), 400

    password = data['password']
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    if Student.query.filter_by(roll_number=data['roll_number'].strip()).first():
        return jsonify({'error': 'Roll number already registered'}), 409

    try:
        user = User(
            username=username,
            role='student',
            full_name=data['full_name'].strip(),
            phone=data.get('phone', '').strip(),
            email=data.get('email', '').strip(),
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        student = Student(
            user_id=user.id,
            roll_number=data['roll_number'].strip(),
            department=data['department'].strip(),
            course=data['course'].strip(),
            semester=int(data['semester']),
            year=int(data['year']),
        )
        db.session.add(student)

        audit = AuditLog(user_id=user.id, action='student_registration',
                         details=f'Student {data["roll_number"]} registered',
                         ip_address=request.remote_addr)
        db.session.add(audit)
        db.session.commit()

        session['user_id'] = user.id
        session['role'] = user.role

        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict(),
            'student': student.to_dict(),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed. Please try again.'}), 500


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """Login endpoint for all user types."""
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    user = User.query.filter_by(username=data['username'].strip()).first()
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403

    session['user_id'] = user.id
    session['role'] = user.role

    audit = AuditLog(user_id=user.id, action='login',
                     details=f'{user.role} login', ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()

    response = {'message': 'Login successful', 'user': user.to_dict()}

    if user.role == 'student' and user.student:
        response['student'] = user.student.to_dict()
    elif user.role == 'teacher' and user.teacher:
        response['teacher'] = user.teacher.to_dict()

    return jsonify(response), 200


@auth_bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """Logout endpoint."""
    audit = AuditLog(user_id=request.current_user.id, action='logout',
                     ip_address=request.remote_addr)
    db.session.add(audit)
    db.session.commit()
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current logged-in user info."""
    user = request.current_user
    response = {'user': user.to_dict()}
    if user.role == 'student' and user.student:
        response['student'] = user.student.to_dict()
    elif user.role == 'teacher' and user.teacher:
        response['teacher'] = user.teacher.to_dict()
    return jsonify(response), 200


@auth_bp.route('/api/auth/update-profile', methods=['PUT'])
@login_required
def update_profile():
    """Update user profile."""
    data = request.get_json()
    user = request.current_user

    if data.get('full_name'):
        user.full_name = data['full_name'].strip()
    if data.get('phone'):
        user.phone = data['phone'].strip()
    if data.get('email'):
        user.email = data['email'].strip()

    if data.get('new_password'):
        if not data.get('current_password'):
            return jsonify({'error': 'Current password required'}), 400
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password incorrect'}), 400
        if len(data['new_password']) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        user.set_password(data['new_password'])

    db.session.commit()
    return jsonify({'message': 'Profile updated', 'user': user.to_dict()}), 200
