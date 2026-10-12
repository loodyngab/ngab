/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: frontend/src/pages/Login.jsx
 * Deskripsi: Halaman Masuk Akun Portal Akademik USINDO (Enterprise SSO).
 * ============================================================================
 */

import React, { useState } from 'react';
import { api, setToken } from '../services/api';

const UniversityLogo = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

export default function Login({ onLoginSuccess }) {
  const [nim, setNim] = useState('202401001');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Menangani submit form login
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const response = await api.login(nim, password);
      if (response.success && response.token) {
        setToken(response.token);
        localStorage.setItem('usindo_user', JSON.stringify(response.user));
        onLoginSuccess(response.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Kredensial tidak valid. Periksa kembali NIM dan kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleNim) => {
    setNim(roleNim);
    setPassword('password123');
    setErrorMessage('');
  };

  return (
    <div style={{
      minHeight: '88vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px 32px' }}>
        {/* Header Form */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            margin: '0 auto 16px',
            borderRadius: '12px',
            background: '#0F172A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
          }}>
            <UniversityLogo />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Portal Presensi Biometrik
          </h2>
          <p style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>
            Universitas Siber Indonesia (USINDO)
          </p>
        </div>

        {/* Pesan Kesalahan */}
        {errorMessage && (
          <div style={{
            padding: '12px 14px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            borderRadius: '8px',
            fontSize: '12.5px',
            marginBottom: '16px'
          }}>
            {errorMessage}
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nomor Induk Mahasiswa (NIM) / NIP</label>
            <input
              type="text"
              className="form-input"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              placeholder="Contoh: 202401001"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kata Sandi Akun</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '11px', fontSize: '14px' }}
          >
            {loading ? 'Mengotentikasi...' : 'Masuk ke Sistem'}
          </button>
        </form>

        {/* Bantuan Akun Uji Coba */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid var(--color-border)',
          fontSize: '12px',
          color: '#64748B'
        }}>
          <p style={{ fontWeight: 600, marginBottom: '8px', textAlign: 'center', color: '#475569' }}>
            Pilih Kredensial Pengujian:
          </p>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('202401001')}
              className="btn btn-outline"
              style={{ padding: '5px 10px', fontSize: '11.5px' }}
            >
              Mahasiswa
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('DOSEN01')}
              className="btn btn-outline"
              style={{ padding: '5px 10px', fontSize: '11.5px' }}
            >
              Dosen
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('ADMIN01')}
              className="btn btn-outline"
              style={{ padding: '5px 10px', fontSize: '11.5px' }}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
