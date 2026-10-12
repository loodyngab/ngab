/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/routes/authRoutes.js
 * Deskripsi: Rute API untuk Autentikasi Pengguna (Login & Profil).
 * ============================================================================
 */

import { Router } from 'express';
import { login, getProfile } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = Router();

// Endpoint publik: Login dengan NIM dan kata sandi
router.post('/login', login);

// Endpoint terproteksi: Mendapatkan profil data akun yang sedang login
router.get('/profile', verifyToken, getProfile);

export default router;
