/**
 * ============================================================================
 * SISTEM ABSENSI FACE ID USINDO
 * File: frontend/src/components/Topbar.jsx
 * Deskripsi: Bilah Navigasi Atas persis sesuai gambar mockup Usindo.
 *            - Logo Globe Usindo
 *            - Input Search berbentuk kapsul
 *            - Profil pengguna: Admin - Budi Santoso
 * ============================================================================
 */

import React from 'react';

export default function Topbar({ user, onSearchChange }) {
  return (
    <header className="usindo-topbar">
      {/* Brand Logo Kiri */}
      <div className="topbar-brand">
        <div className="brand-globe-icon" />
        <span>Usindo</span>
      </div>

      {/* Search Bar Tengah */}
      <div className="topbar-search-container">
        <svg
          className="topbar-search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="topbar-search-input"
          placeholder="Search"
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      {/* Profil User Kanan */}
      <div className="topbar-user-profile">
        <div className="user-avatar-img">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#64748B">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <span className="user-name-role">
          {user?.name ? `Admin - ${user.name}` : 'Admin - Budi Santoso'}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </header>
  );
}
