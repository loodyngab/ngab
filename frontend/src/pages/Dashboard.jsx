/**
 * ============================================================================
 * SISTEM ABSENSI FACE ID USINDO
 * File: frontend/src/pages/Dashboard.jsx
 * Deskripsi: Halaman Utama Dashboard persis sesuai dengan gambar mockup Usindo:
 *            - Kolom Kiri Atas: Deteksi Wajah (Face Camera + Tombol Masuk/Pulang)
 *            - Kolom Kiri Bawah: Riwayat Absensi Hari Ini - Usindo (Tabel)
 *            - Kolom Kanan Atas: Ringkasan Kehadiran Hari Ini (Donut Chart 45 Hadir, 3 Izin, 2 Alfa)
 *            - Kolom Kanan Bawah: Pemberitahuan Terbaru
 * ============================================================================
 */

import React, { useState } from 'react';
import FaceCamera from '../components/FaceCamera';

// Ikon Tong Sampah (Delete Action)
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// Ikon Lonceng Notifikasi
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default function Dashboard({ user, searchQuery = '' }) {
  // Data Tabel Riwayat Absensi Hari Ini Sesuai Gambar
  const [attendanceList, setAttendanceList] = useState([
    { id: 1, name: 'Budi Santoso', time: '18-04-15 08:30', status: 'Hadir' },
    { id: 2, name: 'Siti Aminah', time: '18-04-15 21:50', status: 'Hadir' },
    { id: 3, name: 'Joko Widodo', time: '19-04-19 20:30', status: 'Hadir' },
  ]);

  const [notificationBanner, setNotificationBanner] = useState(null);

  // Filter pencarian tabel dari input Search di Topbar
  const filteredList = attendanceList.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Menangani Tombol Absensi Masuk
  const handleAbsenMasuk = () => {
    const now = new Date();
    const timeStr = `${now.getDate()}-${now.getMonth() + 1}-${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newEntry = {
      id: attendanceList.length + 1,
      name: user?.name || 'Budi Santoso',
      time: timeStr,
      status: 'Hadir'
    };

    setAttendanceList([newEntry, ...attendanceList]);
    setNotificationBanner(`Presensi Masuk berhasil dicatat untuk ${newEntry.name}!`);
    setTimeout(() => setNotificationBanner(null), 3000);
  };

  // Menangani Tombol Absensi Pulang
  const handleAbsenPulang = () => {
    const now = new Date();
    const timeStr = `${now.getDate()}-${now.getMonth() + 1}-${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newEntry = {
      id: attendanceList.length + 1,
      name: user?.name || 'Budi Santoso',
      time: timeStr,
      status: 'Hadir'
    };

    setAttendanceList([newEntry, ...attendanceList]);
    setNotificationBanner(`Presensi Pulang berhasil dicatat untuk ${newEntry.name}!`);
    setTimeout(() => setNotificationBanner(null), 3000);
  };

  // Hapus baris absensi
  const handleDeleteRow = (id) => {
    setAttendanceList(attendanceList.filter((item) => item.id !== id));
  };

  return (
    <div>
      {/* Judul Utama Halaman Sesuai Gambar */}
      <h2 className="page-main-title">Absensi Face ID</h2>

      {/* Pop-up Banner Sukses Masuk/Pulang */}
      {notificationBanner && (
        <div style={{
          padding: '12px 18px',
          background: '#DCFCE7',
          border: '1px solid #22C55E',
          color: '#15803D',
          borderRadius: '10px',
          marginBottom: '20px',
          fontWeight: 600,
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>✓</span> {notificationBanner}
        </div>
      )}

      {/* Tata Letak Grid Sesuai Gambar */}
      <div className="dashboard-grid">
        {/* ============================================================ */}
        {/* KOLOM KIRI: KAMERA DETEKSI WAJAH & TABEL RIWAYAT ABSENSI     */}
        {/* ============================================================ */}
        <div>
          {/* Card Kamera */}
          <FaceCamera
            identifiedUser={{
              name: user?.name || 'Budi Santoso',
              id: user?.nim || '12345'
            }}
            onAbsenMasuk={handleAbsenMasuk}
            onAbsenPulang={handleAbsenPulang}
          />

          {/* Card Tabel Riwayat Absensi Hari Ini Sesuai Gambar */}
          <div className="white-box-card">
            <h3 className="card-title-left">Riwayat Absensi Hari Ini - Usindo</h3>

            <div className="attendance-table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px' }}>No</th>
                    <th>Nama</th>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th style={{ width: '50px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ color: '#64748B' }}>{index + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td style={{ color: '#64748B' }}>{item.time}</td>
                      <td>
                        <span className="badge-hadir-pill">{item.status}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-table-action-delete"
                          title="Hapus Catatan"
                          onClick={() => handleDeleteRow(item.id)}
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                        Tidak ada catatan absensi yang sesuai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* KOLOM KANAN: RINGKASAN KEHADIRAN (CHART) & PEMBERITAHUAN      */}
        {/* ============================================================ */}
        <div>
          {/* Card Ringkasan Kehadiran Hari Ini (Donut Chart) */}
          <div className="white-box-card">
            <h3 className="card-title-left">Ringkasan Kehadiran Hari Ini</h3>

            {/* Donut Chart SVG Sesuai Gambar (45 Hadir, 3 Izin, 2 Alfa) */}
            <div className="donut-chart-wrapper">
              <svg width="170" height="170" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#E2E8F0" strokeWidth="14" />

                {/* Hadir (Blue Arc: 45 / 50 = 90%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="14"
                  strokeDasharray="215 240"
                  strokeDashoffset="60"
                  strokeLinecap="round"
                />

                {/* Izin (Green Arc: 3 / 50 = 6%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="14"
                  strokeDasharray="14 240"
                  strokeDashoffset="-158"
                />

                {/* Alfa (Gray Arc: 2 / 50 = 4%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="14"
                  strokeDasharray="10 240"
                  strokeDashoffset="-174"
                />
              </svg>
            </div>

            {/* Legend di Bawah Donut Chart Sesuai Gambar */}
            <div className="donut-legend-container">
              {/* 45 Hadir */}
              <div className="legend-stat-item">
                <div className="legend-item-header">
                  <span className="legend-dot" style={{ background: '#2563EB' }} />
                  <span>45</span>
                </div>
                <span className="legend-sublabel">Hadir</span>
              </div>

              {/* 3 Izin */}
              <div className="legend-stat-item">
                <div className="legend-item-header">
                  <span className="legend-dot" style={{ background: '#22C55E' }} />
                  <span>3</span>
                </div>
                <span className="legend-sublabel">Izin</span>
              </div>

              {/* 2 Alfa */}
              <div className="legend-stat-item">
                <div className="legend-item-header">
                  <span className="legend-dot" style={{ background: '#94A3B8' }} />
                  <span>2</span>
                </div>
                <span className="legend-sublabel">Alfa</span>
              </div>
            </div>
          </div>

          {/* Card Pemberitahuan Terbaru Sesuai Gambar */}
          <div className="white-box-card">
            <h3 className="card-title-left">Pemberitahuan Terbaru</h3>

            <div className="notification-list">
              {/* Notifikasi 1 (Ikon Bell Terang) */}
              <div className="notification-item">
                <div className="notification-bell-icon bell-icon-light">
                  <IconBell />
                </div>
                <div>
                  <div className="notification-title">
                    Pemberitahuan Terbaru (Rekap Masuk...)
                  </div>
                  <div className="notification-desc">
                    Sistem merekam kehadiran karyawan tepat waktu dan data tersinkronisasi otomatis.
                  </div>
                  <div className="notification-date">
                    28 Januari 2026
                  </div>
                </div>
              </div>

              {/* Notifikasi 2 (Ikon Bell Gelap) */}
              <div className="notification-item">
                <div className="notification-bell-icon bell-icon-dark">
                  <IconBell />
                </div>
                <div>
                  <div className="notification-title">
                    Pemberitahuan Terbaru (Rekap Pulang...)
                  </div>
                  <div className="notification-desc">
                    Laporan presensi harian shift siang berhasil disimpan ke server pusat.
                  </div>
                  <div className="notification-date">
                    26 Januari 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
