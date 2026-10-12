/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/middlewares/auth.js
 * Deskripsi: Middleware Otentikasi JWT dan Otorisasi Berbasis Peran (RBAC).
 *            Memastikan request memiliki token valid dan sesuai dengan peran
 *            (MAHASISWA, DOSEN, ADMIN).
 * ============================================================================
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_kunci_jwt_usindo_face_recog_2026';

/**
 * Middleware untuk memverifikasi keabsahan JSON Web Token (JWT).
 * Mengambil token dari header 'Authorization: Bearer <token>'.
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak: Token otentikasi tidak ditemukan atau format tidak valid.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verifikasi tanda tangan digital token menggunakan secret key
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Simpan payload user hasil dekripsi ke object req untuk controller berikutnya
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token tidak valid atau telah kedaluwarsa.',
      error: error.message
    });
  }
};

/**
 * Middleware Otorisasi Berbasis Peran (Role-Based Access Control / RBAC).
 * Membatasi akses rute hanya untuk peran tertentu.
 * Contoh penggunaan: authorizeRoles('ADMIN', 'DOSEN')
 * 
 * @param  {...string} roles - Daftar peran yang diizinkan
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses dilarang: Peran '${req.user?.role}' tidak memiliki izin untuk fitur ini.`
      });
    }
    next();
  };
};
