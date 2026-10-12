/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: frontend/src/pages/EnrollmentPage.jsx
 * Deskripsi: Pendaftaran Biometrik 3 Pose Wajah (Enterprise e-KYC).
 *            Mengambil 3 sampel pose (Depan, Kiri, Kanan) secara otomatis
 *            dan menyimpan representasi vektor ke server tanpa menyimpan foto fisik.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import LivenessWebcam from '../components/LivenessWebcam';
import { api } from '../services/api';

const ShieldCheckIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export default function EnrollmentPage({ user, onEnrollmentComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [capturedPoses, setCapturedPoses] = useState([
    { poseType: 'FRONT', label: 'Tampak Depan', hint: 'Posisikan kepala tegak lurus menghadap kamera', vector: null },
    { poseType: 'LEFT', label: 'Menoleh Kiri', hint: 'Tolehkan kepala secara wajar ke arah kiri Anda (sekitar 25°)', vector: null },
    { poseType: 'RIGHT', label: 'Menoleh Kanan', hint: 'Tolehkan kepala secara wajar ke arah kanan Anda (sekitar 25°)', vector: null }
  ]);

  const [resetCounter, setResetCounter] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentPose = capturedPoses[currentStepIndex];

  /**
   * Menangani pengambilan pose otomatis dari kamera
   */
  const handleCapturePose = (result) => {
    setErrorMessage('');
    const updatedPoses = [...capturedPoses];
    updatedPoses[currentStepIndex].vector = result.embedding;
    setCapturedPoses(updatedPoses);

    if (currentStepIndex < 2) {
      setTimeout(() => {
        setCurrentStepIndex(currentStepIndex + 1);
        setResetCounter((prev) => prev + 1);
      }, 700);
    }
  };

  /**
   * Otomatis menyimpan pendaftaran wajah begitu ke-3 pose lengkap
   */
  useEffect(() => {
    const isAllDone = capturedPoses.every((p) => p.vector !== null);

    if (isAllDone && !isSubmitting && !successBanner) {
      const autoSave = async () => {
        setIsSubmitting(true);
        try {
          const payloadPoses = capturedPoses.map((p) => ({
            poseType: p.poseType,
            vector: p.vector
          }));

          const res = await api.enrollFace(payloadPoses);
          if (res.success) {
            setSuccessBanner(true);
            if (onEnrollmentComplete) {
              onEnrollmentComplete();
            }
          }
        } catch (err) {
          setErrorMessage(err.message || 'Gagal menyimpan pendaftaran biometrik.');
        } finally {
          setIsSubmitting(false);
        }
      };

      autoSave();
    }
  }, [capturedPoses, isSubmitting, successBanner, onEnrollmentComplete]);

  return (
    <div className="container" style={{ maxWidth: '840px' }}>
      <div className="card">
        {/* Header Modul */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span className="badge badge-info" style={{ marginBottom: '8px' }}>
            Registrasi Biometrik
          </span>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>
            Pendaftaran 3 Sampel Pose Wajah
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13.5px', maxWidth: '520px', margin: '6px auto 0' }}>
            Sistem merekam 3 vektor sudut referensi (Depan, Kiri, Kanan).
            Sesuai standar privasi, citra fisik foto mentah tidak disimpan ke penyimpanan server.
          </p>
        </div>

        {/* Notifikasi Sukses Registrasi */}
        {successBanner ? (
          <div style={{
            padding: '36px 24px',
            background: '#ECFDF5',
            border: '1px solid #10B981',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <ShieldCheckIcon />
            </div>
            <h3 style={{ color: '#065F46', fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
              Pendaftaran Biometrik Berhasil Disimpan
            </h3>
            <p style={{ color: '#047857', fontSize: '13.5px', maxWidth: '480px', margin: '0 auto 20px' }}>
              Vektor referensi 3 pose telah tersimpan terenkripsi pada basis data USINDO.
              Akun Anda telah diaktifkan untuk presensi harian mandiri.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-success"
              style={{ padding: '10px 24px' }}
            >
              Lanjut ke Presensi Harian
            </button>
          </div>
        ) : (
          <>
            {/* Indikator Status 3 Sampel Pose */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {capturedPoses.map((pose, idx) => (
                <div
                  key={pose.poseType}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: currentStepIndex === idx ? '#2563EB' : 'var(--color-border)',
                    background: pose.vector ? '#ECFDF5' : currentStepIndex === idx ? '#EFF6FF' : '#FFFFFF',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Sampel {idx + 1}</div>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '2px', color: '#0F172A' }}>
                    {pose.label}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: pose.vector ? '#059669' : currentStepIndex === idx ? '#2563EB' : '#94A3B8' }}>
                    {pose.vector ? 'Terekam' : currentStepIndex === idx ? 'Sedang Dipindai' : 'Menunggu'}
                  </div>
                </div>
              ))}
            </div>

            {/* Kotak Petunjuk Arah Pose Aktif */}
            <div style={{
              padding: '12px 16px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              textAlign: 'center',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#334155'
            }}>
              <strong>Instruksi Pose {currentStepIndex + 1}:</strong> {currentPose.hint}
            </div>

            {/* Pesan Kesalahan */}
            {errorMessage && (
              <div style={{
                padding: '12px',
                background: '#FEF2F2',
                color: '#991B1B',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px'
              }}>
                {errorMessage}
              </div>
            )}

            {/* Kamera Biometrik Enterprise */}
            <LivenessWebcam
              mode="enrollment"
              poseLabel={currentPose.label}
              onCapture={handleCapturePose}
              isProcessing={isSubmitting}
              resetTrigger={resetCounter}
            />
          </>
        )}
      </div>
    </div>
  );
}
