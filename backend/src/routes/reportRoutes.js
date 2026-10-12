/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/routes/reportRoutes.js
 * Deskripsi: Rute API untuk Monitoring, Pelaporan, Ekspor, dan Audit Trail.
 *            Dikhususkan untuk peran Dosen dan Admin.
 * ============================================================================
 */

import { Router } from 'express';
import { 
  getRealtimeRecap, 
  exportAttendanceExcel, 
  exportAttendancePDF, 
  getAuditLogs 
} from '../controllers/reportController.js';
import { verifyToken, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

// Seluruh rute laporan diproteksi JWT
router.use(verifyToken);

// Mendapatkan data rekapitulasi kehadiran real-time dan evaluasi syarat ujian
router.get('/recap', authorizeRoles('DOSEN', 'ADMIN'), getRealtimeRecap);

// Ekspor data rekapitulasi ke file Excel / CSV
router.get('/export/excel', authorizeRoles('DOSEN', 'ADMIN'), exportAttendanceExcel);

// Ekspor data rekapitulasi siap cetak PDF
router.get('/export/pdf', authorizeRoles('DOSEN', 'ADMIN'), exportAttendancePDF);

// Melihat log audit trail percobaan absensi dan sistem (Khusus Admin)
router.get('/audit-logs', authorizeRoles('ADMIN'), getAuditLogs);

export default router;
