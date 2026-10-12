/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: frontend/src/App.jsx
 * Deskripsi: Komponen Utama Aplikasi React.
 *            Mengatur alur otentikasi pengguna, navigasi antar halaman,
 *            serta hak akses berbasis peran (Mahasiswa, Dosen, Admin).
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import EnrollmentPage from './pages/EnrollmentPage';
import AttendancePage from './pages/AttendancePage';
import AdminDashboard from './pages/AdminDashboard';
import { removeToken } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'enrollment' | 'monitoring' | 'audit'

  // Periksa apakah pengguna sudah memiliki sesi login aktif sebelumnya
  useEffect(() => {
    const savedUser = localStorage.getItem('usindo_user');
    const token = localStorage.getItem('usindo_auth_token');

    if (savedUser && token) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Set tab default berdasarkan peran pengguna
        if (parsed.role === 'MAHASISWA') {
          setActiveTab('attendance');
        } else {
          setActiveTab('monitoring');
        }
      } catch (e) {
        removeToken();
      }
    }
  }, []);

  /**
   * Menangani saat pengguna berhasil masuk (login)
   */
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData.role === 'MAHASISWA') {
      setActiveTab(userData.isEnrolled ? 'attendance' : 'enrollment');
    } else {
      setActiveTab('monitoring');
    }
  };

  /**
   * Menangani logout pengguna
   */
  const handleLogout = () => {
    removeToken();
    setUser(null);
  };

  /**
   * Jika belum login, tampilkan layar login
   */
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Bilah Navigasi Atas */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Konten Halaman Sesuai Tab Aktif */}
      <main style={{ flex: 1, padding: '24px 0' }}>
        {user.role === 'MAHASISWA' ? (
          <>
            {activeTab === 'attendance' && (
              <AttendancePage
                user={user}
                onGoToEnrollment={() => setActiveTab('enrollment')}
              />
            )}
            {activeTab === 'enrollment' && (
              <EnrollmentPage
                user={user}
                onEnrollmentComplete={() => {
                  const updatedUser = { ...user, isEnrolled: true };
                  setUser(updatedUser);
                  localStorage.setItem('usindo_user', JSON.stringify(updatedUser));
                }}
              />
            )}
          </>
        ) : (
          /* Dashboard Dosen & Admin */
          <AdminDashboard user={user} />
        )}
      </main>

      {/* Footer Hak Cipta */}
      <footer style={{
        textAlign: 'center',
        padding: '16px',
        fontSize: '12px',
        color: '#94A3B8',
        borderTop: '1px solid #E2E8F0',
        background: '#FFF'
      }}>
        © 2026 Universitas Siber Indonesia (USINDO) — Sistem Absensi Biometrik Berbasis Pengenalan Wajah
      </footer>
    </div>
  );
}
