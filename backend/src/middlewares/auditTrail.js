/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/middlewares/auditTrail.js
 * Deskripsi: Modul Audit Trail untuk mencatat setiap aktivitas penting sistem,
 *            khususnya percobaan absensi (berhasil/gagal), login, dan enrollment,
 *            lengkap dengan IP address klien, user-agent, dan stempel waktu.
 * ============================================================================
 */

import { db } from '../config/db.js';

/**
 * Mencatat entri audit keamanan ke dalam database.
 * 
 * @param {Object} req - Objek Request Express untuk mengambil IP dan User-Agent
 * @param {string} userId - ID Pengguna (atau 'ANONYMOUS' jika belum login)
 * @param {string} action - Nama aktivitas (e.g. 'LOGIN', 'ENROLLMENT', 'ABSENSI_HARIAN')
 * @param {string} status - Status aktivitas ('SUCCESS' atau 'FAILED')
 * @param {string} details - Catatan detail hasil eksekusi (misal: nilai similarity, alasan gagal)
 */
export const recordAuditLog = (req, userId, action, status, details = '') => {
  // Mengambil alamat IP klien (memeriksa proxy header atau socket remote address)
  const clientIp = 
    req.headers['x-forwarded-for'] || 
    req.socket?.remoteAddress || 
    req.ip || 
    '127.0.0.1';

  const userAgent = req.headers['user-agent'] || 'Unknown Browser';

  const logEntry = {
    id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: userId || 'ANONYMOUS',
    action,
    status, // SUCCESS | FAILED
    clientIp,
    userAgent,
    details,
    timestamp: new Date().toISOString()
  };

  // Simpan log ke database audit
  db.auditLogs.unshift(logEntry);

  console.log(`🛡️ [AUDIT] [${logEntry.timestamp}] [${clientIp}] ${action} - ${status} (${details})`);
  return logEntry;
};
