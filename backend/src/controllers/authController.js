/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/controllers/authController.js
 * Deskripsi: Controller Autentikasi Pengguna.
 *            Menangani login dengan NIM & Kata Sandi, verifikasi hash bcrypt,
 *            pembuatan token JWT, serta pencatatan audit log.
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { recordAuditLog } from '../middlewares/auditTrail.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_kunci_jwt_usindo_face_recog_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Controller: Login Mahasiswa / Dosen / Admin
 * Route: POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { nim, password } = req.body;

    // 1. Validasi input kelengkapan parameter
    if (!nim || !password) {
      return res.status(400).json({
        success: false,
        message: 'NIM dan kata sandi wajib diisi.'
      });
    }

    // 2. Cari pengguna berdasarkan NIM
    const user = db.users.find((u) => u.nim.toLowerCase() === nim.trim().toLowerCase());

    if (!user) {
      recordAuditLog(req, null, 'LOGIN_ATTEMPT', 'FAILED', `NIM tidak ditemukan: ${nim}`);
      return res.status(401).json({
        success: false,
        message: 'NIM atau kata sandi tidak sesuai.'
      });
    }

    // 3. Verifikasi kata sandi dengan hash bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      recordAuditLog(req, user.id, 'LOGIN_ATTEMPT', 'FAILED', 'Kata sandi salah.');
      return res.status(401).json({
        success: false,
        message: 'NIM atau kata sandi tidak sesuai.'
      });
    }

    // 4. Buat token otentikasi JWT
    const payload = {
      id: user.id,
      nim: user.nim,
      name: user.name,
      role: user.role,
      isEnrolled: user.isEnrolled || false
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 5. Catat audit log berhasil login
    recordAuditLog(req, user.id, 'LOGIN_SUCCESS', 'SUCCESS', `User login dengan peran: ${user.role}`);

    // 6. Respon sukses ke klien
    return res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        nim: user.nim,
        name: user.name,
        role: user.role,
        isEnrolled: user.isEnrolled || false
      }
    });
  } catch (error) {
    console.error('Error saat login:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat proses autentikasi.',
      error: error.message
    });
  }
};

/**
 * Controller: Mendapatkan profil pengguna yang sedang login
 * Route: GET /api/auth/profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = db.users.find((u) => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Data pengguna tidak ditemukan.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        nim: user.nim,
        name: user.name,
        role: user.role,
        isEnrolled: user.isEnrolled || false
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat profil pengguna.',
      error: error.message
    });
  }
};
