/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/server.js
 * Deskripsi: Server Utama Node.js / Express.
 *            Mengonfigurasi middleware, rute API, port server, dan
 *            menginisialisasi data awal database.
 * ============================================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/db.js';

// Import Rute-rute API
import authRoutes from './routes/authRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

// Muat variabel environment
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Global
app.use(cors({ origin: '*' })); // Mengizinkan akses lintas domain dari frontend React
app.use(express.json({ limit: '10mb' })); // Parser payload JSON (cukup untuk vektor embedding)
app.use(express.urlencoded({ extended: true }));

// Rute Tes Kesehatan Server
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Sistem Absensi Face Recognition USINDO API',
    timestamp: new Date().toISOString()
  });
});

// Pemasangan (Mounting) Rute API Modular
app.use('/api/auth', authRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

// Penanganan Rute Tidak Ditemukan (404 Handler)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rute '${req.method} ${req.url}' tidak ditemukan pada server API USINDO.`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
    error: err.message
  });
});

// Inisialisasi Database dan Menjalankan Server
const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Server Backend USINDO berjalan pada port: ${PORT}`);
      console.log(`🌐 Endpoint Health: http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('❌ Gagal menyalakan server backend:', error);
    process.exit(1);
  }
};

startServer();
