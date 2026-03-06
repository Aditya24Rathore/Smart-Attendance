import jwt
import json
import hashlib
import time
from datetime import datetime, timezone, timedelta
from cryptography.fernet import Fernet
import base64
import os


class QRService:
    def __init__(self, jwt_secret, encryption_key=None):
        self.jwt_secret = jwt_secret
        if encryption_key:
            # Derive a valid Fernet key from the provided key
            key_bytes = hashlib.sha256(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key).digest()
            self.fernet = Fernet(base64.urlsafe_b64encode(key_bytes))
        else:
            self.fernet = Fernet(Fernet.generate_key())

    def generate_qr_token(self, student_id, roll_number, session_id=None, device_fingerprint=None):
        """Generate a JWT token for QR code with 30-second expiration."""
        now = datetime.now(timezone.utc)
        payload = {
            'student_id': student_id,
            'roll_number': roll_number,
            'session_id': session_id,
            'device_fp': device_fingerprint,
            'iat': now,
            'exp': now + timedelta(seconds=30),
            'nonce': hashlib.sha256(os.urandom(16)).hexdigest()[:16],
            'ts': int(time.time()),
        }
        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')

        # Encrypt the token for additional security
        encrypted = self.fernet.encrypt(token.encode())
        return encrypted.decode()

    def verify_qr_token(self, encrypted_token):
        """Verify and decode a QR token."""
        try:
            # Decrypt the token
            token = self.fernet.decrypt(encrypted_token.encode()).decode()

            # Decode JWT
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            return {
                'valid': True,
                'student_id': payload['student_id'],
                'roll_number': payload['roll_number'],
                'session_id': payload.get('session_id'),
                'device_fp': payload.get('device_fp'),
                'timestamp': payload.get('ts'),
            }
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'error': 'QR code has expired. Please refresh.'}
        except jwt.InvalidTokenError:
            return {'valid': False, 'error': 'Invalid QR code token.'}
        except Exception:
            return {'valid': False, 'error': 'QR code verification failed.'}

    @staticmethod
    def generate_device_fingerprint(user_agent, screen_info=None):
        """Generate a device fingerprint from browser/device information."""
        fp_data = user_agent or ''
        if screen_info:
            fp_data += str(screen_info)
        return hashlib.sha256(fp_data.encode()).hexdigest()[:32]
