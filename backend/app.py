import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from config import config_map
from models import db, User, Student, Teacher, Subject
from qr_service import QRService

socketio = SocketIO()


def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_map.get(config_name, config_map['development']))

    # Session config
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

    # Initialize extensions
    CORS(app, supports_credentials=True, origins=['http://localhost:3000', 'http://127.0.0.1:3000'])
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins='*')

    # Initialize QR Service
    qr_svc = QRService(
        jwt_secret=app.config['JWT_SECRET_KEY'],
        encryption_key=app.config.get('QR_ENCRYPTION_KEY'),
    )
    app.config['QR_SERVICE'] = qr_svc

    # Ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Register blueprints
    from routes.auth_routes import auth_bp
    from routes.student import student_bp
    from routes.teacher import teacher_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(admin_bp)

    # Create tables and seed admin
    with app.app_context():
        db.create_all()
        _seed_default_data()

    # WebSocket events for real-time attendance
    @socketio.on('join_session')
    def handle_join(data):
        from flask_socketio import join_room
        join_room(f'session_{data.get("session_id")}')

    @socketio.on('attendance_update')
    def handle_attendance_update(data):
        socketio.emit('attendance_marked', data,
                      room=f'session_{data.get("session_id")}')

    return app


def _seed_default_data():
    """Create default admin account if none exists."""
    if not User.query.filter_by(role='admin').first():
        admin = User(
            username='admin',
            role='admin',
            full_name='System Administrator',
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print('[SEED] Default admin created: admin / admin123')


app = create_app()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
