const qrcode = require('qrcode');
const crypto = require('crypto');
const config = require('../config');

class QRService {
  constructor() {
    this.refreshInterval = config.qrRefreshInterval;
    this.encryptionKey = config.qrEncryptionKey;
    
    // Validate encryption key length (AES-256 requires 32 bytes = 64 hex characters)
    if (!this.encryptionKey || this.encryptionKey.length < 64) {
      console.warn('⚠️ QR_ENCRYPTION_KEY is missing or too short. Using default 64-character hex key.');
      this.encryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }
  }

  /**
   * Generate dynamic QR code that refreshes every 30 seconds
   */
  async generateQRCode(teacherId, classId) {
    try {
      const timestamp = Math.floor(Date.now() / this.refreshInterval) * this.refreshInterval;
      const expiryTime = new Date(timestamp + this.refreshInterval);

      // Create QR data
      const qrData = {
        teacherId,
        classId: classId || null,
        timestamp,
        random: crypto.randomBytes(16).toString('hex'),
      };

      // Encrypt QR data
      const encryptedData = this.encryptData(qrData);
      const qrHash = crypto.createHash('sha256').update(encryptedData).digest('hex');

      // Generate QR code image
      const qrImage = await qrcode.toDataURL(encryptedData);

      return {
        qrHash,
        qrData: JSON.stringify(qrData),
        encryptedData,
        qrImage,
        generatedAt: new Date(),
        expiresAt: expiryTime,
      };
    } catch (error) {
      console.error('QR Code Generation Error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify QR code validity
   */
  verifyQRCode(qrHash, generatedAt) {
    try {
      const timestamp = Math.floor(generatedAt.getTime() / this.refreshInterval) * this.refreshInterval;
      const now = Date.now();

      // Check if QR code is within valid time window (30 seconds)
      if (now - timestamp > this.refreshInterval) {
        return {
          isValid: false,
          error: 'QR code has expired',
        };
      }

      return {
        isValid: true,
        message: 'QR code is valid',
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid QR code verification',
      };
    }
  }

  /**
   * Encrypt data using AES-256
   */
  encryptData(data) {
    try {
      const jsonData = JSON.stringify(data);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
      
      let encrypted = cipher.update(jsonData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  decryptData(encryptedData) {
    try {
      const [iv, encrypted] = encryptedData.split(':');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), Buffer.from(iv, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Check if QR code needs refresh
   */
  needsRefresh(generatedAt) {
    const elapsed = Date.now() - generatedAt.getTime();
    return elapsed > this.refreshInterval * 0.8; // Refresh at 80% of interval
  }

  /**
   * Generate student QR code (static, contains enrollment info)
   */
  async generateStudentQRCode(student) {
    try {
      // Create QR data with student identification
      const qrData = {
        type: 'student',
        enrollmentNo: student.enrollmentNo,
        studentId: student._id.toString(),
        fullName: student.fullName || 'Unknown',
        department: student.department,
      };

      // For student QR, we use the enrollment number as the hash (simple and scannable)
      const qrHash = student.enrollmentNo;
      const qrContent = JSON.stringify(qrData);

      // Generate QR code image directly with plaintext data
      const qrImage = await qrcode.toDataURL(qrContent);

      return {
        qrHash,
        qrContent,
        qrImage,
        generatedAt: new Date(),
        expiresAt: null, // Student QR codes don't expire
      };
    } catch (error) {
      console.error('Student QR Code Generation Error:', error);
      throw new Error('Failed to generate student QR code');
    }
  }

  /**
   * Decode student QR data (simple JSON parsing)
   */
  decodeStudentQRData(qrContent) {
    try {
      return JSON.parse(qrContent);
    } catch (error) {
      throw new Error('Invalid student QR data');
    }
  }
}

module.exports = new QRService();
