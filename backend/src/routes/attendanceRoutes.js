/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/routes/attendanceRoutes.js
 * Deskripsi: Rute API untuk Proses Absensi Harian (Recognition) dan Riwayat.
 * ============================================================================
 */

import { Router } from 'express';
import { 
  getActiveSchedules, 
  submitAttendance, 
  getMyAttendanceHistory 
} from '../controllers/attendanceController.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

// Seluruh endpoint absensi memerlukan verifikasi JWT
router.use(verifyToken);

// Mendapatkan jadwal kuliah aktif yang dapat dipilih
router.get('/schedules', getActiveSchedules);

// Melakukan submit verifikasi absensi wajah (Liveness + Geofence + Matcher)
router.post('/recognize', authorizeRoles('MAHASISWA'), submitAttendance);

// Melihat riwayat absensi mahasiswa yang login
router.get('/history', authorizeRoles('MAHASISWA'), getMyAttendanceHistory);

export default router;
