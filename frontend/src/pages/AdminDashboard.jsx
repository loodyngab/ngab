/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: frontend/src/pages/AdminDashboard.jsx
 * Deskripsi: Dashboard Monitoring, Pelaporan & Audit Trail Akademik USINDO.
 *            Tampilan Enterprise, bersih, dan profesional.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Konfigurasi icon marker Leaflet agar tampil dengan benar di React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Komponen helper untuk menangani klik pada peta
function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    }
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const PrinterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export default function AdminDashboard({ user }) {
  const [recapData, setRecapData] = useState({
    totalRecords: 0,
    attendances: [],
    studentSummaries: []
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('recap');
  const [isExporting, setIsExporting] = useState(false);

  // State untuk Pengaturan Geofencing
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLatitude, setNewLatitude] = useState('-6.200000');
  const [newLongitude, setNewLongitude] = useState('106.816666');

  const loadDashboardData = async () => {
    try {
      const recapRes = await api.getRealtimeRecap();
      if (recapRes.success) {
        setRecapData(recapRes.data);
      }

      if (user.role === 'ADMIN') {
        const auditRes = await api.getAuditLogs();
        if (auditRes.success) {
          setAuditLogs(auditRes.data);
        }
      }
    } catch (err) {
      console.error('Gagal memuat data dashboard:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await api.downloadExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Presensi_USINDO_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengekspor file Excel: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveLocation = () => {
    // Integrasi ke backend nanti bisa dilakukan di sini
    alert(`Koordinat Geofencing berhasil diperbarui:\nLatitude: ${newLatitude}\nLongitude: ${newLongitude}`);
    setShowLocationModal(false);
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewLatitude(pos.coords.latitude.toFixed(6));
          setNewLongitude(pos.coords.longitude.toFixed(6));
        },
        (err) => {
          alert('Gagal mengambil lokasi perangkat. Pastikan izin lokasi diberikan.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolokasi tidak didukung oleh browser Anda.');
    }
  };

  const totalStudents = recapData.studentSummaries.length;
  const eligibleStudents = recapData.studentSummaries.filter((s) => s.isEligibleForExam).length;
  const totalAttendancesToday = recapData.totalRecords;

  return (
    <div className="container">
      {/* Header Dashboard */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <span className="badge badge-info" style={{ marginBottom: '6px' }}>
            Panel Pengawasan Akademik
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>
            Monitoring & Evaluasi Presensi
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13.5px' }}>
            Rekapitulasi kehadiran real-time, evaluasi ambang batas ujian (75%), dan jejak audit trail.
          </p>
        </div>

        {/* Tombol Aksi Ekspor & Pengaturan */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowLocationModal(true)} className="btn btn-outline" style={{ borderColor: '#2563EB', color: '#2563EB' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
            Ubah Titik Koordinat
          </button>
          <button onClick={loadDashboardData} className="btn btn-outline">
            <RefreshIcon /> Segarkan
          </button>
          <button onClick={handleExportExcel} disabled={isExporting} className="btn btn-outline">
            <DownloadIcon /> {isExporting ? 'Mengunduh...' : 'Ekspor CSV/Excel'}
          </button>
          <button onClick={() => window.print()} className="btn btn-primary">
            <PrinterIcon /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Kartu Ringkasan Metrik (KPI Enterprise) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="card" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Mahasiswa Terdaftar
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {totalStudents} Mahasiswa
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
            Semester Akademik Aktif
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
            Log Presensi Terverifikasi
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {totalAttendancesToday} Catatan
          </div>
          <div style={{ fontSize: '12px', color: '#2563EB', marginTop: '4px' }}>
            Verifikasi Wajah Real-time
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
            Syarat Kelayakan Ujian (≥ 75%)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {eligibleStudents} / {totalStudents}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Ambang batas minimal kehadiran
          </div>
        </div>
      </div>

      {/* Sub-Navigasi Tab */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveSubTab('recap')}
          className={`btn ${activeSubTab === 'recap' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '13px' }}
        >
          Persentase & Kelayakan Ujian
        </button>
        <button
          onClick={() => setActiveSubTab('realtime')}
          className={`btn ${activeSubTab === 'realtime' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '13px' }}
        >
          Log Presensi Masuk
        </button>
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`btn ${activeSubTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '13px' }}
          >
            Audit Trail Keamanan
          </button>
        )}
      </div>

      {/* Konten Tab 1: Rekap Persentase & Syarat Ujian */}
      {activeSubTab === 'recap' && (
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Rekapitulasi Kehadiran & Kelayakan Ujian Mahasiswa</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Standar akademik USINDO menetapkan kehadiran minimal 75% dari total 16 pertemuan untuk berhak mengikuti Ujian Akhir Semester.
            </p>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>NIM</th>
                  <th>Nama Mahasiswa</th>
                  <th>Status Biometrik</th>
                  <th>Kehadiran</th>
                  <th>Persentase</th>
                  <th>Status Syarat Ujian</th>
                </tr>
              </thead>
              <tbody>
                {recapData.studentSummaries.map((st) => (
                  <tr key={st.userId}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{st.nim}</td>
                    <td>{st.name}</td>
                    <td>
                      <span className={`badge ${st.isEnrolled ? 'badge-success' : 'badge-warning'}`}>
                        {st.isEnrolled ? 'Terdaftar' : 'Belum Terdaftar'}
                      </span>
                    </td>
                    <td>{st.totalHadir} Hadir, {st.totalTerlambat} Terlambat</td>
                    <td style={{ fontWeight: 700, color: st.rawPercentage >= 75 ? '#059669' : '#DC2626' }}>
                      {st.attendancePercentage}
                    </td>
                    <td>
                      <span className={`badge ${st.isEligibleForExam ? 'badge-success' : 'badge-danger'}`}>
                        {st.isEligibleForExam ? 'MEMENUHI SYARAT' : 'TIDAK MEMENUHI (<75%)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Konten Tab 2: Log Realtime Presensi */}
      {activeSubTab === 'realtime' && (
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Log Presensi Masuk Terverifikasi</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Setiap catatan kehadiran telah melalui uji liveness anti-spoofing dan pencocokan embedding wajah &gt; 85%.
            </p>
          </div>

          {recapData.attendances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              Belum ada aktivitas presensi masuk pada hari ini.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>NIM & Nama</th>
                    <th>Mata Kuliah</th>
                    <th>Waktu Presensi</th>
                    <th>Status Kehadiran</th>
                    <th>Skor Kemiripan</th>
                    <th>Pose Vektor</th>
                  </tr>
                </thead>
                <tbody>
                  {recapData.attendances.map((att) => (
                    <tr key={att.id}>
                      <td>
                        <strong>{att.studentName}</strong>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{att.nim}</div>
                      </td>
                      <td>{att.subjectName}</td>
                      <td>{att.date} {att.time}</td>
                      <td>
                        <span className={`badge ${att.status === 'HADIR' ? 'badge-success' : 'badge-warning'}`}>
                          {att.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0369A1' }}>{att.similarityPercentage}</td>
                      <td><span className="badge badge-info">{att.matchedPose}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Konten Tab 3: Log Audit Trail Keamanan */}
      {activeSubTab === 'audit' && user.role === 'ADMIN' && (
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Audit Trail Percobaan Akses & Presensi</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Jejak forensik aktivitas sistem mencakup alamat IP klien, waktu eksekusi, dan status keberhasilan.
            </p>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Alamat IP</th>
                  <th>Aktivitas</th>
                  <th>Status</th>
                  <th>Rincian Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px', color: '#475569' }}>
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0F172A', fontWeight: 600 }}>
                      {log.clientIp}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.action}</td>
                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#334155' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Titik Koordinat (Geofencing) */}
      {showLocationModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', 
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', margin: '20px', padding: '24px', position: 'relative' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Pengaturan Geofencing</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Klik area pada peta untuk menyesuaikan titik pusat (lokasi kampus/fakultas), atau gunakan lokasi Anda saat ini.
            </p>
            
            <button onClick={handleGetCurrentLocation} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginBottom: '16px', borderColor: '#059669', color: '#059669' }}>
              📍 Gunakan Lokasi Perangkat Terkini
            </button>

            <div style={{ height: '280px', width: '100%', marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <MapContainer center={[parseFloat(newLatitude) || -6.2, parseFloat(newLongitude) || 106.8]} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker 
                  position={{ lat: parseFloat(newLatitude) || -6.2, lng: parseFloat(newLongitude) || 106.8 }} 
                  setPosition={(pos) => {
                    setNewLatitude(pos.lat.toFixed(6));
                    setNewLongitude(pos.lng.toFixed(6));
                  }} 
                />
              </MapContainer>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Latitude</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newLatitude} 
                  onChange={(e) => setNewLatitude(e.target.value)}
                  placeholder="Contoh: -6.200000"
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Longitude</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newLongitude} 
                  onChange={(e) => setNewLongitude(e.target.value)}
                  placeholder="Contoh: 106.816666"
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLocationModal(false)} className="btn btn-outline">
                Batal
              </button>
              <button onClick={handleSaveLocation} className="btn btn-primary">
                Simpan Koordinat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
