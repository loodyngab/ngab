/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/controllers/attendanceController.js
 * Deskripsi: Controller Absensi Harian (Recognition).
 *            Mengimplementasikan:
 *            1. Pemilihan jadwal aktif
 *            2. Validasi Liveness Detection (Kedip/Senyum)
 *            3. Pencocokan Embedding Wajah (Ambang Batas >85%)
 *            4. Validasi Geofencing (Radius lokasi) & Waktu (Hadir/Terlambat)
 *            5. Pencatatan absensi harian dan Audit Trail
 * ============================================================================
 */

import { db } from '../config/db.js';
import { matchFaceWithEnrolledPoses } from '../utils/faceMatcher.js';
import { validateGeofence } from '../utils/geofence.js';
import { recordAuditLog } from '../middlewares/auditTrail.js';

const SIMILARITY_THRESHOLD = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.85');
const TOLERANSI_TERLAMBAT_MENIT = parseInt(process.env.TOLERANSI_TERLAMBAT_MENIT || '15', 10);

/**
 * Controller: Mendapatkan Daftar Jadwal Aktif Hari Ini
 * Route: GET /api/attendance/schedules
 */
export const getActiveSchedules = async (req, res) => {
  try {
    // Mengembalikan daftar jadwal yang tersedia untuk absensi
    return res.status(200).json({
      success: true,
      data: db.schedules
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar jadwal.',
      error: error.message
    });
  }
};

/**
 * Controller: Proses Verifikasi dan Pencatatan Absensi Wajah
 * Route: POST /api/attendance/recognize
 * Body: {
 *   scheduleId: string,
 *   liveEmbedding: number[],
 *   livenessVerified: boolean,
 *   latitude?: number,
 *   longitude?: number
 * }
 */
export const submitAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { scheduleId, liveEmbedding, livenessVerified, latitude, longitude } = req.body;

    // 1. Validasi input penting
    if (!scheduleId || !liveEmbedding || !Array.isArray(liveEmbedding)) {
      return res.status(400).json({
        success: false,
        message: 'Jadwal kuliah dan vektor wajah live wajib disertakan.'
      });
    }

    // 2. Cek apakah pengguna sudah melakukan enrollment wajah
    const user = db.users.find((u) => u.id === userId);
    const enrolledPoses = db.faceEmbeddings.filter((e) => e.userId === userId);

    if (!user?.isEnrolled || enrolledPoses.length === 0) {
      recordAuditLog(req, userId, 'ABSENSI_ATTEMPT', 'FAILED', 'Wajah belum didaftarkan di sistem.');
      return res.status(400).json({
        success: false,
        message: 'Wajah Anda belum terdaftar. Silakan lakukan proses Pendaftaran Wajah (Enrollment) terlebih dahulu.'
      });
    }

    // 3. Validasi jadwal yang dipilih
    const schedule = db.schedules.find((s) => s.id === scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal perkuliahan tidak ditemukan.'
      });
    }

    // 4. Validasi Liveness Detection (Kedip / Senyum)
    if (!livenessVerified) {
      recordAuditLog(req, userId, 'ABSENSI_ATTEMPT', 'FAILED', 'Uji liveness (kedip/senyum) gagal atau terindikasi manipulasi/spoofing.');
      return res.status(400).json({
        success: false,
        message: 'Verifikasi Liveness gagal. Pastikan Anda berkedip/tersenyum ke kamera untuk membuktikan kehadiran fisik nyata.'
      });
    }

    // 5. Validasi Lokasi (Geofencing Kampus USINDO)
    let geofenceResult = { isInside: true, distanceMeters: 0 };
    if (latitude !== undefined && longitude !== undefined) {
      geofenceResult = validateGeofence(
        latitude,
        longitude,
        schedule.latitude,
        schedule.longitude,
        schedule.radiusMeters
      );

      if (!geofenceResult.isInside) {
        recordAuditLog(
          req,
          userId,
          'ABSENSI_ATTEMPT',
          'FAILED',
          `Di luar area kelas: jarak ${geofenceResult.distanceMeters}m (maks ${schedule.radiusMeters}m)`
        );
        return res.status(403).json({
          success: false,
          message: `Gagal absensi: Anda berada di luar radius lokasi kelas (${geofenceResult.distanceMeters} meter dari lokasi yang ditentukan).`,
          distanceMeters: geofenceResult.distanceMeters
        });
      }
    }

    // 6. Pencocokan Embedding Wajah (Face Recognition Matcher)
    //    Membandingkan live embedding dengan pose terdaftar (Depan, Kiri, Kanan)
    const matchResult = matchFaceWithEnrolledPoses(liveEmbedding, enrolledPoses, SIMILARITY_THRESHOLD);

    // Jika kemiripan di bawah ambang batas (contoh < 85%) -> GAGAL
    if (!matchResult.isMatch) {
      const errMsg = matchResult.error || `Wajah tidak cocok (${matchResult.percentage}). Pastikan wajah Anda berada di dalam bingkai kamera dan coba lagi.`;
      recordAuditLog(
        req,
        userId,
        'ABSENSI_ATTEMPT',
        'FAILED',
        `Pencocokan gagal: ${errMsg}`
      );
      return res.status(401).json({
        success: false,
        message: errMsg,
        similarityScore: matchResult.bestScore,
        similarityPercentage: matchResult.percentage
      });
    }

    // 7. Cek apakah mahasiswa sudah pernah absensi di jadwal ini pada tanggal hari ini
    const todayDateString = new Date().toISOString().split('T')[0];
    const existingAttendance = db.attendances.find(
      (a) => a.userId === userId && a.scheduleId === scheduleId && a.date === todayDateString
    );

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: `Anda sudah melakukan absensi untuk mata kuliah ini hari ini (Status: ${existingAttendance.status} pada ${existingAttendance.time}).`
      });
    }

    // 8. Penentuan status kehadiran (Hadir vs Terlambat berdasarkan toleransi waktu)
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    const [schedHours, schedMins] = schedule.startTime.split(':').map(Number);
    const scheduleStartTimeInMinutes = schedHours * 60 + schedMins;

    // Status default: HADIR
    // Jika lewat dari jam mulai + toleransi (misal 15 menit), ditandai TERLAMBAT
    let attendanceStatus = 'HADIR';
    if (currentTimeInMinutes > scheduleStartTimeInMinutes + TOLERANSI_TERLAMBAT_MENIT) {
      attendanceStatus = 'TERLAMBAT';
    }

    // 9. Simpan catatan absensi ke database
    const attendanceRecord = {
      id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      nim: user.nim,
      studentName: user.name,
      scheduleId: schedule.id,
      subjectName: schedule.subjectName,
      date: todayDateString,
      time: now.toTimeString().split(' ')[0],
      status: attendanceStatus, // HADIR | TERLAMBAT
      similarityScore: matchResult.bestScore,
      similarityPercentage: matchResult.percentage,
      matchedPose: matchResult.matchedPose,
      livenessVerified: true,
      distanceMeters: geofenceResult.distanceMeters,
      createdAt: now.toISOString()
    };

    db.attendances.unshift(attendanceRecord);

    // 10. Catat Audit Log Keberhasilan
    recordAuditLog(
      req,
      userId,
      'ABSENSI_HARIAN',
      'SUCCESS',
      `Absensi berhasil: ${attendanceStatus} pada mata kuliah ${schedule.subjectName}. Kemiripan: ${matchResult.percentage}`
    );

    // 11. Respon Berhasil (JSON Sukses)
    return res.status(200).json({
      success: true,
      message: `Absensi berhasil dicatat! Status: ${attendanceStatus}`,
      data: attendanceRecord
    });
  } catch (error) {
    console.error('Error saat submit absensi:', error);
    recordAuditLog(req, req.user?.id, 'ABSENSI_HARIAN', 'FAILED', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses absensi.',
      error: error.message
    });
  }
};

/**
 * Controller: Mendapatkan Riwayat Absensi Pribadi Mahasiswa
 * Route: GET /api/attendance/history
 */
export const getMyAttendanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = db.attendances.filter((a) => a.userId === userId);

    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat riwayat absensi.',
      error: error.message
    });
  }
};
