/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/controllers/reportController.js
 * Deskripsi: Controller Monitoring, Pelaporan & Rekapitulasi Kehadiran.
 *            Fitur:
 *            1. Rekap kehadiran real-time
 *            2. Persentase kehadiran otomatis
 *            3. Evaluasi kelayakan ujian (Syarat Ujian: Minimal 75% Kehadiran)
 *            4. Ekspor laporan dalam format CSV (kompatibel Excel) & Dokumen PDF
 *            5. Log audit trail pemantauan
 * ============================================================================
 */

import { db } from '../config/db.js';

// Batas minimal persentase kehadiran untuk syarat mengikuti ujian (75%)
const MIN_EXAM_ATTENDANCE_PERCENTAGE = 75;
const TOTAL_PERTEMUAN_SEMESTER = 16; // Standar 16 pertemuan kuliah

/**
 * Controller: Rekapitulasi Kehadiran Real-time & Evaluasi Syarat Ujian
 * Route: GET /api/reports/recap
 * Akses: Dosen & Admin
 */
export const getRealtimeRecap = async (req, res) => {
  try {
    const { scheduleId } = req.query;

    // Filter absensi berdasarkan jadwal tertentu jika disediakan
    let filteredAttendances = db.attendances;
    if (scheduleId) {
      filteredAttendances = filteredAttendances.filter((a) => a.scheduleId === scheduleId);
    }

    // Ambil daftar mahasiswa
    const students = db.users.filter((u) => u.role === 'MAHASISWA');

    // Hitung persentase kehadiran dan kelayakan ujian untuk setiap mahasiswa
    const studentSummaries = students.map((student) => {
      const studentRecords = filteredAttendances.filter((a) => a.userId === student.id);
      
      const totalHadir = studentRecords.filter((r) => r.status === 'HADIR').length;
      const totalTerlambat = studentRecords.filter((r) => r.status === 'TERLAMBAT').length;
      const totalKehadiranEfektif = totalHadir + totalTerlambat;

      // Hitung persentase terhadap total pertemuan
      const percentage = Number(((totalKehadiranEfektif / TOTAL_PERTEMUAN_SEMESTER) * 100).toFixed(1));

      // Evaluasi syarat mengikuti ujian (minimal 75%)
      const isEligibleForExam = percentage >= MIN_EXAM_ATTENDANCE_PERCENTAGE;

      return {
        userId: student.id,
        nim: student.nim,
        name: student.name,
        isEnrolled: student.isEnrolled || false,
        totalHadir,
        totalTerlambat,
        totalKehadiran: totalKehadiranEfektif,
        totalPertemuan: TOTAL_PERTEMUAN_SEMESTER,
        attendancePercentage: `${percentage}%`,
        rawPercentage: percentage,
        isEligibleForExam,
        examStatus: isEligibleForExam ? 'BERHAK IKUT UJIAN' : 'TIDAK BERHAK (KEHADIRAN < 75%)'
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        totalRecords: filteredAttendances.length,
        attendances: filteredAttendances,
        studentSummaries,
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat rekap kehadiran real-time.',
      error: error.message
    });
  }
};

/**
 * Controller: Ekspor Rekap Kehadiran ke Format CSV / Excel
 * Route: GET /api/reports/export/excel
 * Akses: Dosen & Admin
 */
export const exportAttendanceExcel = async (req, res) => {
  try {
    const students = db.users.filter((u) => u.role === 'MAHASISWA');

    // Buat header CSV
    let csvContent = 'NIM,NAMA MAHASISWA,TOTAL HADIR,TOTAL TERLAMBAT,PERSENTASE,SYARAT UJIAN\n';

    students.forEach((student) => {
      const studentRecords = db.attendances.filter((a) => a.userId === student.id);
      const totalHadir = studentRecords.filter((r) => r.status === 'HADIR').length;
      const totalTerlambat = studentRecords.filter((r) => r.status === 'TERLAMBAT').length;
      const totalEfektif = totalHadir + totalTerlambat;
      const percentage = ((totalEfektif / TOTAL_PERTEMUAN_SEMESTER) * 100).toFixed(1);
      const eligible = Number(percentage) >= MIN_EXAM_ATTENDANCE_PERCENTAGE ? 'MEMENUHI SYARAT' : 'TIDAK MEMENUHI';

      csvContent += `"${student.nim}","${student.name}",${totalHadir},${totalTerlambat},"${percentage}%","${eligible}"\n`;
    });

    // Set header HTTP response untuk mendownload file CSV/Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Rekap_Absensi_USINDO.csv"');
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengekspor data absensi ke Excel/CSV.',
      error: error.message
    });
  }
};

/**
 * Controller: Ekspor Rekap Kehadiran ke Format Dokumen Laporan (PDF-ready format)
 * Route: GET /api/reports/export/pdf
 * Akses: Dosen & Admin
 */
export const exportAttendancePDF = async (req, res) => {
  try {
    const students = db.users.filter((u) => u.role === 'MAHASISWA');
    const records = db.attendances;

    // Menyusun representasi data cetak PDF
    const printPayload = {
      title: 'LAPORAN REKAPITULASI ABSENSI FACE RECOGNITION USINDO',
      generatedAt: new Date().toLocaleString('id-ID'),
      minAttendanceThreshold: `${MIN_EXAM_ATTENDANCE_PERCENTAGE}%`,
      recordsCount: records.length,
      data: students.map((s) => {
        const studentRecords = records.filter((r) => r.userId === s.id);
        const count = studentRecords.length;
        const pct = ((count / TOTAL_PERTEMUAN_SEMESTER) * 100).toFixed(1);
        return {
          nim: s.nim,
          name: s.name,
          kehadiran: `${count}/${TOTAL_PERTEMUAN_SEMESTER}`,
          persentase: `${pct}%`,
          statusUjian: Number(pct) >= MIN_EXAM_ATTENDANCE_PERCENTAGE ? 'LULUS SYARAT' : 'DITOLAK'
        };
      })
    };

    return res.status(200).json({
      success: true,
      message: 'Data laporan PDF siap dicetak.',
      data: printPayload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat laporan PDF.',
      error: error.message
    });
  }
};

/**
 * Controller: Mengambil Daftar Log Audit Trail Keamanan
 * Route: GET /api/reports/audit-logs
 * Akses: Khusus Admin
 */
export const getAuditLogs = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      total: db.auditLogs.length,
      data: db.auditLogs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat catatan audit trail.',
      error: error.message
    });
  }
};
