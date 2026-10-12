/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: frontend/src/components/Navbar.jsx
 * Deskripsi: Komponen Bilah Navigasi Atas (Enterprise Header).
 *            Desain bersih, terstruktur, tanpa ornamen informal.
 * ============================================================================
 */

import React from 'react';

export default function Navbar({ user, activeTab, setActiveTab, onLogout }) {
  if (!user) return null;

  return (
    <header style={{
      background: '#0F172A',
      borderBottom: '1px solid #1E293B',
      color: '#FFFFFF',
      padding: '12px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1140px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand Identitas Kampus */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '16px',
            letterSpacing: '0.05em'
          }}>
            U
          </div>
          <div>
            <h1 style={{ fontSize: '15px', color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em', fontWeight: 700 }}>
              UNIVERSITAS SIBER INDONESIA
            </h1>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, letterSpacing: '0.02em' }}>
              Biometric Attendance & Verification System
            </p>
          </div>
        </div>

        {/* Menu Navigasi Berdasarkan Peran */}
        <nav style={{ display: 'flex', gap: '6px' }}>
          {user.role === 'MAHASISWA' ? (
            <>
              <button
                className="btn"
                style={{
                  background: activeTab === 'attendance' ? '#1E293B' : 'transparent',
                  color: activeTab === 'attendance' ? '#38BDF8' : '#CBD5E1',
                  border: activeTab === 'attendance' ? '1px solid #334155' : '1px solid transparent',
                  fontSize: '13px'
                }}
                onClick={() => setActiveTab('attendance')}
              >
                Presensi Harian
              </button>
              <button
                className="btn"
                style={{
                  background: activeTab === 'enrollment' ? '#1E293B' : 'transparent',
                  color: activeTab === 'enrollment' ? '#38BDF8' : '#CBD5E1',
                  border: activeTab === 'enrollment' ? '1px solid #334155' : '1px solid transparent',
                  fontSize: '13px'
                }}
                onClick={() => setActiveTab('enrollment')}
              >
                Pendaftaran Wajah
              </button>
            </>
          ) : (
            <>
              <button
                className="btn"
                style={{
                  background: activeTab === 'monitoring' ? '#1E293B' : 'transparent',
                  color: activeTab === 'monitoring' ? '#38BDF8' : '#CBD5E1',
                  border: activeTab === 'monitoring' ? '1px solid #334155' : '1px solid transparent',
                  fontSize: '13px'
                }}
                onClick={() => setActiveTab('monitoring')}
              >
                Monitoring & Rekapitulasi
              </button>
              {user.role === 'ADMIN' && (
                <button
                  className="btn"
                  style={{
                    background: activeTab === 'audit' ? '#1E293B' : 'transparent',
                    color: activeTab === 'audit' ? '#38BDF8' : '#CBD5E1',
                    border: activeTab === 'audit' ? '1px solid #334155' : '1px solid transparent',
                    fontSize: '13px'
                  }}
                  onClick={() => setActiveTab('audit')}
                >
                  Audit Trail Log
                </button>
              )}
            </>
          )}
        </nav>

        {/* Profil Akun & Tombol Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              {user.nim} • <span style={{ textTransform: 'uppercase', color: '#38BDF8' }}>{user.role}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="btn btn-outline"
            style={{
              borderColor: '#334155',
              background: 'transparent',
              color: '#F87171',
              padding: '6px 12px',
              fontSize: '12px'
            }}
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
