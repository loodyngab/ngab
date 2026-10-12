/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/config/db.js
 * Deskripsi: Database in-memory terstruktur dengan data seeder awal.
 *            Menyimpan data pengguna, jadwal kuliah, vektor embedding wajah,
 *            catatan absensi harian, dan log audit trail keamanan.
 * ============================================================================
 */

import bcrypt from 'bcryptjs';

// Struktur penyimpanan in-memory database
export const db = {
  // Master data pengguna (Mahasiswa, Dosen, Admin)
  users: [],

  // Vektor referensi embedding wajah mahasiswa (3 pose: depan, kiri, kanan)
  // CATATAN KEAMANAN: Foto mentah TIDAK disimpan; hanya vektor numerik (float array)
  faceEmbeddings: [],

  // Master data jadwal perkuliahan aktif
  schedules: [],

  // Riwayat catatan kehadiran (Absensi harian)
  attendances: [],

  // Log audit trail keamanan (IP, aksi, status, timestamp)
  auditLogs: []
};

/**
 * Fungsi inisialisasi / seeder data default saat server pertama kali berjalan.
 * Menyediakan akun dummy untuk Admin, Dosen, dan Mahasiswa USINDO.
 */
export const initDatabase = async () => {
  // 1. Password default yang di-hash dengan bcrypt (10 salt rounds)
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 2. Seeder data Pengguna (Users)
  db.users = [
    {
      id: 'USR-001',
      nim: 'ADMIN01',
      name: 'Administrator USINDO',
      role: 'ADMIN', // Hak akses: ADMIN
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-002',
      nim: 'DOSEN01',
      name: 'Dr. Hendra Wijaya, M.Kom.',
      role: 'DOSEN', // Hak akses: DOSEN
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-003',
      nim: '202401001',
      name: 'Ahmad Fauzi',
      role: 'MAHASISWA', // Hak akses: MAHASISWA
      passwordHash: defaultPasswordHash,
      isEnrolled: false, // Flag status apakah wajah sudah didaftarkan
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR-004',
      nim: '202401002',
      name: 'Siti Nurhaliza',
      role: 'MAHASISWA',
      passwordHash: defaultPasswordHash,
      isEnrolled: false,
      createdAt: new Date().toISOString()
    }
  ];

  // 3. Seeder data Jadwal Kuliah Aktif (Schedules)
  db.schedules = [
    {
      id: 'SCH-101',
      code: 'CS301',
      subjectName: 'Kecerdasan Buatan (Artificial Intelligence)',
      lecturerName: 'Dr. Hendra Wijaya, M.Kom.',
      day: 'Senin',
      startTime: '08:00', // Jam mulai
      endTime: '10:30',   // Jam selesai
      room: 'Lab Komputer 3 - Gedung A USINDO',
      // Titik referensi geofencing lokasi ruang kelas
      latitude: -6.301979,
      longitude: 107.4186539,
      radiusMeters: 100 // Radius batas absensi (100 meter)
    },
    {
      id: 'SCH-102',
      code: 'CS302',
      subjectName: 'Pengolahan Citra Digital & Visi Komputer',
      lecturerName: 'Dr. Hendra Wijaya, M.Kom.',
      day: 'Rabu',
      startTime: '13:00',
      endTime: '15:30',
      room: 'Ruang Teori 204 - Gedung B USINDO',
      latitude: -6.301979,
      longitude: 107.4186539,
      radiusMeters: 100
    }
  ];

  console.log('✅ [Database] Data awal USINDO berhasil dimuat (Users & Jadwal).');
};
