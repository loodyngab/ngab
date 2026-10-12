/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/routes/enrollmentRoutes.js
 * Deskripsi: Rute API untuk Pendaftaran Wajah (Enrollment).
 *            Memerlukan token JWT dengan peran MAHASISWA atau ADMIN.
 * ============================================================================
 */

import { Router } from 'express';
import { enrollFace, checkEnrollmentStatus } from '../controllers/enrollmentController.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

// Wajib otentikasi JWT untuk semua rute enrollment
router.use(verifyToken);

// Cek status pendaftaran wajah mahasiswa
router.get('/status', checkEnrollmentStatus);

// Mendaftarkan 3 sampel pose embedding wajah (Depan, Kiri, Kanan)
router.post('/', authorizeRoles('MAHASISWA', 'ADMIN'), enrollFace);

export default router;
