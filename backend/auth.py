import jwt
import functools
from flask import request, jsonify, current_app, session
from models import User


def login_required(f):
    """Decorator to require authentication via session."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        user = User.query.get(user_id)
        if not user or not user.is_active:
            session.clear()
            return jsonify({'error': 'Invalid session'}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Decorator to require specific user roles."""
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'error': 'Authentication required'}), 401
            user = User.query.get(user_id)
            if not user or not user.is_active:
                session.clear()
                return jsonify({'error': 'Invalid session'}), 401
            if user.role not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            request.current_user = user
            return f(*args, **kwargs)
        return decorated
    return decorator
