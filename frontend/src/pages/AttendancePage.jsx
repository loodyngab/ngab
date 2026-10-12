/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: frontend/src/pages/AttendancePage.jsx
 * Deskripsi: Halaman Presensi Biometrik Wajah Mandiri (Enterprise Grade).
 *            Menggunakan verifikasi liveness otomatis (Hitung Mundur 5s,
 *            Uji Kedip -> Pop-up Sukses, Uji Senyum -> Pop-up Sukses).
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import LivenessWebcam from '../components/LivenessWebcam';
import { api } from '../services/api';

const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function AttendancePage({ user, onGoToEnrollment }) {
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [history, setHistory] = useState([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(null);
  const [resultError, setResultError] = useState(null);
  const [resetCounter, setResetCounter] = useState(0);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState(null);

  /**
   * Mengambil data jadwal aktif dan riwayat kehadiran
   */
  useEffect(() => {
    async function loadData() {
      try {
        const schRes = await api.getSchedules();
        if (schRes.success && schRes.data.length > 0) {
          setSchedules(schRes.data);
          setSelectedScheduleId(schRes.data[0].id);
        }

        const histRes = await api.getMyAttendanceHistory();
        if (histRes.success) {
          setHistory(histRes.data);
        }
      } catch (err) {
        console.error('Gagal memuat jadwal atau riwayat:', err);
      }
    }

    loadData();

    // Mengambil koordinat GPS perangkat untuk validasi Geofencing
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => {
          // Fallback koordinat kampus USINDO
          setLocationCoords({ latitude: -6.200000, longitude: 106.816666 });
        }
      );
    }
  }, []);

  /**
   * Menangani hasil pemindaian otomatis dari LivenessWebcam
   */
  const handleAttendanceCapture = async ({ embedding, livenessVerified }) => {
    if (!selectedScheduleId) return;

    setIsProcessing(true);
    setResultSuccess(null);
    setResultError(null);
    setAutoRetryCountdown(null);

    try {
      const payload = {
        scheduleId: selectedScheduleId,
        liveEmbedding: embedding,
        livenessVerified,
        latitude: locationCoords?.latitude,
        longitude: locationCoords?.longitude
      };

      const res = await api.submitAttendance(payload);

      if (res.success) {
        setResultSuccess(res.data);
        const histRes = await api.getMyAttendanceHistory();
        if (histRes.success) setHistory(histRes.data);
      }
    } catch (err) {
      const errorMsg = err.message || 'Wajah tidak cocok dengan data referensi.';
      setResultError(errorMsg);

      // Hitung mundur pemindaian ulang otomatis
      setAutoRetryCountdown(3);
      let count = 3;
      const timer = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setAutoRetryCountdown(count);
        } else {
          clearInterval(timer);
          setAutoRetryCountdown(null);
          setResultError(null);
          setResetCounter((prev) => prev + 1);
        }
      }, 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  return (
    <div className="container" style={{ maxWidth: '1080px' }}>
      {/* Banner Peringatan jika belum registrasi wajah */}
      {!user.isEnrolled && (
        <div style={{
          padding: '16px 20px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '10px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ color: '#92400E', fontSize: '14px', fontWeight: 700 }}>Data Biometrik Belum Terdaftar</h4>
            <p style={{ color: '#B45309', fontSize: '13px', margin: '2px 0 0' }}>
              Anda belum melakukan pendaftaran 3 sampel pose wajah. Selesaikan enrollment terlebih dahulu.
            </p>
          </div>
          <button
            onClick={onGoToEnrollment}
            className="btn btn-primary"
            style={{ fontSize: '13px' }}
          >
            Daftarkan Wajah
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Kolom Kiri: Kamera Verifikasi Biometrik */}
        <div className="card">
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-info">Otentikasi Mandiri</span>
              <span className="badge badge-success">Sistem Aktif</span>
            </div>
            <h3 style={{ fontSize: '19px', marginTop: '6px', fontWeight: 700 }}>Presensi Biometrik Wajah</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Arahkan wajah tegak lurus ke kamera. Sistem akan memandu hitungan 5 detik, uji kedip, dan senyuman.
            </p>
          </div>

          {/* Pemilihan Jadwal Kuliah */}
          <div className="form-group">
            <label className="form-label">Jadwal Kuliah Aktif</label>
            <select
              className="form-select"
              value={selectedScheduleId}
              onChange={(e) => {
                setSelectedScheduleId(e.target.value);
                setResetCounter((prev) => prev + 1);
              }}
            >
              {schedules.map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.subjectName} ({sch.day}, {sch.startTime} - {sch.endTime})
                </option>
              ))}
            </select>
          </div>

          {selectedSchedule && (
            <div style={{
              fontSize: '12.5px',
              padding: '10px 14px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <div><strong style={{ color: '#475569' }}>Lokasi:</strong> {selectedSchedule.room}</div>
              <div><strong style={{ color: '#475569' }}>Dosen:</strong> {selectedSchedule.lecturerName}</div>
            </div>
          )}

          {/* Notifikasi Hasil: Presensi Berhasil Dicatat */}
          {resultSuccess && (
            <div style={{
              padding: '18px',
              background: '#ECFDF5',
              border: '1px solid #10B981',
              borderRadius: '10px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}>
              <CheckIcon />
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ color: '#065F46', fontSize: '14.5px', margin: 0, fontWeight: 700 }}>
                  Presensi Berhasil Diverifikasi
                </h4>
                <div style={{ fontSize: '12.5px', color: '#047857', marginTop: '3px' }}>
                  Status: <strong>{resultSuccess.status}</strong> • Kemiripan: <strong>{resultSuccess.similarityPercentage}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                  Waktu: {resultSuccess.date} pukul {resultSuccess.time} WIB
                </div>
              </div>
            </div>
          )}

          {/* Notifikasi Hasil: Tidak Cocok (Dengan Retry Countdown) */}
          {resultError && (
            <div style={{
              padding: '16px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '10px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertIcon />
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ color: '#991B1B', fontSize: '14px', margin: 0, fontWeight: 700 }}>
                  Verifikasi Wajah Belum Berhasil
                </h4>
                <div style={{ fontSize: '12.5px', color: '#B91C1C', marginTop: '2px' }}>
                  {resultError}
                </div>
                {autoRetryCountdown !== null && (
                  <div style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 600, marginTop: '4px' }}>
                    Memulai pemindaian ulang otomatis dalam {autoRetryCountdown} detik...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Komponen Kamera Biometrik Enterprise */}
          <LivenessWebcam
            mode="attendance"
            onCapture={handleAttendanceCapture}
            isProcessing={isProcessing}
            resetTrigger={resetCounter}
          />
        </div>

        {/* Kolom Kanan: Riwayat Presensi Mahasiswa */}
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Riwayat Kehadiran Mahasiswa</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Rekapitulasi log verifikasi presensi biometrik yang tercatat pada server USINDO.
            </p>
          </div>

          {history.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: 'var(--color-text-muted)',
              fontSize: '13px',
              border: '1px dashed #CBD5E1',
              borderRadius: '10px'
            }}>
              Belum ada riwayat presensi yang terekam untuk semester ini.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mata Kuliah</th>
                    <th>Waktu Presensi</th>
                    <th>Status</th>
                    <th>Kemiripan</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.subjectName}</td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>{item.date} {item.time}</td>
                      <td>
                        <span className={`badge ${item.status === 'HADIR' ? 'badge-success' : 'badge-warning'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', fontWeight: 700, color: '#0369A1' }}>
                        {item.similarityPercentage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
