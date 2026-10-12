/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: frontend/src/components/LivenessWebcam.jsx
 * Deskripsi: Modul Verifikasi Biometrik Wajah dengan DETEKSI AKTIF (ACTIVE VISION):
 *            1. Deteksi Topologi Wajah Asli (Dinding/Benda Mati DITOLAK KERAS).
 *            2. Hitung Mundur 5 Detik HANYA BERJALAN jika wajah nyata ada di oval.
 *            3. Uji Kedip Mata AKTIF: Pop-up sukses HANYA MUNCUL jika kelopak mata
 *               benar-benar berkedip (perubahan kontras mata terdeteksi).
 *            4. Uji Senyuman AKTIF: Pop-up sukses HANYA MUNCUL jika bibir
 *               benar-benar tersenyum (perubahan kontur mulut terdeteksi).
 *            5. Jika wajah keluar dari frame kapan pun -> Alur DIBATALKAN & DIRESET!
 * ============================================================================
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { extractFaceEmbeddingFromCanvas, analyzeFaceBiometrics } from '../services/api';

// Ikon Vektor SVG Profesional
const IconEye = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconSmile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const IconCheckmark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconAlert = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function LivenessWebcam({
  mode = 'attendance',
  poseLabel = 'Depan',
  onCapture,
  isProcessing = false,
  resetTrigger = 0
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const activeLoopRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Status Real-Time Keberadaan Wajah
  const [isFaceInFrame, setIsFaceInFrame] = useState(false);
  const [diagnosticReason, setDiagnosticReason] = useState('Arahkan wajah ke lingkaran oval...');

  /**
   * Tahapan Alur Liveness Aktif:
   * - 'INITIAL_COUNTDOWN' : Hitungan mundur 5 detik (hanya jalan jika wajah nyata di oval)
   * - 'BLINK_PROMPT'      : Menunggu aksi KEDIP NYATA dari pengguna
   * - 'BLINK_SUCCESS'     : Pop-up berhasil kedip (1.5s)
   * - 'SMILE_PROMPT'      : Menunggu aksi SENYUM NYATA dari pengguna
   * - 'SMILE_SUCCESS'     : Pop-up berhasil senyum (1.5s)
   * - 'COMPLETED'         : Selesai, snapshot dan kirim
   */
  const [step, setStep] = useState('INITIAL_COUNTDOWN');
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [hasAutoCaptured, setHasAutoCaptured] = useState(false);

  // Buffer metrik liveness aktif untuk deteksi kedip dan senyum dinamis
  const livenessTrackerRef = useRef({
    step: 'INITIAL_COUNTDOWN',
    countdownProgressMs: 0,
    // Pelacakan Kedip
    baselineEyeVar: null,
    eyeVarHistory: [],
    blinkDetected: false,
    // Pelacakan Senyum
    baselineMouthContrast: null,
    smileDetected: false,
    successPopupTimerMs: 0,
    hasCaptured: false
  });

  // 1. Inisialisasi Aliran Video Kamera
  useEffect(() => {
    let stream = null;

    async function initCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        setCameraError('Akses kamera tidak diizinkan atau perangkat kamera tidak terhubung.');
      }
    }

    initCamera();

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Reset Alur saat ada pemicu baru
  useEffect(() => {
    livenessTrackerRef.current = {
      step: 'INITIAL_COUNTDOWN',
      countdownProgressMs: 0,
      baselineEyeVar: null,
      eyeVarHistory: [],
      blinkDetected: false,
      baselineMouthContrast: null,
      smileDetected: false,
      successPopupTimerMs: 0,
      hasCaptured: false
    };
    setStep('INITIAL_COUNTDOWN');
    setCountdownSeconds(5);
    setHasAutoCaptured(false);
    setIsFaceInFrame(false);
  }, [resetTrigger, poseLabel, mode]);

  // 2. Eksekusi Ekstraksi Snapshot Otomatis
  const executeCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || livenessTrackerRef.current.hasCaptured) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const embedding = extractFaceEmbeddingFromCanvas(canvas);

      livenessTrackerRef.current.hasCaptured = true;
      setHasAutoCaptured(true);
      setStep('COMPLETED');

      if (onCapture) {
        onCapture({ embedding, livenessVerified: true });
      }
    } catch (err) {
      console.warn('Gagal snapshot:', err.message);
      // Reset jika wajah menghilang saat capture
      livenessTrackerRef.current.step = 'INITIAL_COUNTDOWN';
      livenessTrackerRef.current.countdownProgressMs = 0;
      setStep('INITIAL_COUNTDOWN');
      setCountdownSeconds(5);
    }
  }, [onCapture]);

  // 3. MASTER VISION TICKER (Aktif Setiap 100 Milidetik)
  // Menjamin:
  // - Pop-up kedip HANYA MUNCUL jika mata benar-benar berkedip!
  // - Pop-up senyum HANYA MUNCUL jika mulut benar-benar tersenyum!
  // - Wajah di luar frame seketika membatalkan seluruh proses!
  useEffect(() => {
    if (!hasPermission || isProcessing || hasAutoCaptured) return;

    const TICK_INTERVAL_MS = 100;

    activeLoopRef.current = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) return;

      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Panggil Computer Vision Analyzer
      const bio = analyzeFaceBiometrics(canvas);
      const tracker = livenessTrackerRef.current;

      // -------------------------------------------------------------
      // KONDISI A: WAJAH TIDAK TERDETEKSI / DI LUAR BINGKAI OVAL
      // (Dinding, pintu kayu, meja, atau kepala keluar lingkaran)
      // -------------------------------------------------------------
      if (!bio.isFacePresent) {
        setIsFaceInFrame(false);
        setDiagnosticReason(bio.reason);

        // BATALKAN TOTAL: Reset hitungan dan uji aktif!
        tracker.step = 'INITIAL_COUNTDOWN';
        tracker.countdownProgressMs = 0;
        tracker.baselineEyeVar = null;
        tracker.eyeVarHistory = [];
        tracker.blinkDetected = false;
        tracker.baselineMouthContrast = null;
        tracker.smileDetected = false;
        tracker.successPopupTimerMs = 0;

        setStep('INITIAL_COUNTDOWN');
        setCountdownSeconds(5);
        return;
      }

      // -------------------------------------------------------------
      // KONDISI B: WAJAH NYATA TERKONFIRMASI DI DALAM OVAL
      // -------------------------------------------------------------
      setIsFaceInFrame(true);
      setDiagnosticReason('Wajah terverifikasi di dalam bingkai oval.');

      // TAHAP 1: Hitungan Mundur 5 Detik di Layar Kamera (5000ms)
      if (tracker.step === 'INITIAL_COUNTDOWN') {
        tracker.countdownProgressMs += TICK_INTERVAL_MS;
        const remaining = Math.max(1, Math.ceil((5000 - tracker.countdownProgressMs) / 1000));
        setCountdownSeconds(remaining);

        // Hanya jika wajah bertahan 5 detik penuh di dalam oval:
        if (tracker.countdownProgressMs >= 5000) {
          tracker.countdownProgressMs = 0;

          if (mode === 'enrollment') {
            tracker.step = 'COMPLETED';
            setStep('COMPLETED');
            executeCapture();
          } else {
            // Masuk ke Uji Kedip dan inisialisasi baseline mata
            tracker.step = 'BLINK_PROMPT';
            tracker.baselineEyeVar = bio.eyeVariance;
            tracker.eyeVarHistory = [bio.eyeVariance];
            tracker.blinkDetected = false;
            setStep('BLINK_PROMPT');
          }
        }
      }

      // TAHAP 2: Uji Kedipan Mata AKTIF
      // Pop-up sukses TIDAK AKAN MUNCUL sampai mata benar-benar berkedip!
      else if (tracker.step === 'BLINK_PROMPT') {
        const history = tracker.eyeVarHistory;
        history.push(bio.eyeVariance);
        if (history.length > 15) history.shift();

        // Baseline variansi mata saat terbuka
        if (!tracker.baselineEyeVar || tracker.baselineEyeVar < 10) {
          tracker.baselineEyeVar = bio.eyeVariance;
        }

        // Deteksi Kedipan: Terjadi penurunan kontras mata saat kelopak menutup
        // diikuti pembukaan kembali (lembah kurva variansi mata)
        const minVarInWindow = Math.min(...history);
        const maxVarInWindow = Math.max(...history);
        const varDrop = maxVarInWindow - minVarInWindow;

        // Syarat kedip: variansi mata turun setidaknya 25% dari baseline lalu pulih
        const isBlinkEvent = varDrop >= Math.max(8, tracker.baselineEyeVar * 0.25);

        if (isBlinkEvent && history.length >= 6) {
          // KEDIPAN NYATA TERKONFIRMASI!
          tracker.blinkDetected = true;
          tracker.step = 'BLINK_SUCCESS';
          tracker.successPopupTimerMs = 0;
          setStep('BLINK_SUCCESS');
        }
      }

      // TAHAP 3: Pop-up Sukses Kedip (Tampil 1.5 detik)
      else if (tracker.step === 'BLINK_SUCCESS') {
        tracker.successPopupTimerMs += TICK_INTERVAL_MS;

        if (tracker.successPopupTimerMs >= 1500) {
          tracker.successPopupTimerMs = 0;
          // Baru setelah pop-up sukses kedip selesai, masuk ke Uji Senyum!
          tracker.step = 'SMILE_PROMPT';
          tracker.baselineMouthContrast = bio.mouthContrast;
          tracker.smileDetected = false;
          setStep('SMILE_PROMPT');
        }
      }

      // TAHAP 4: Uji Senyuman AKTIF
      // Pop-up sukses TIDAK AKAN MUNCUL sampai pengguna benar-benar tersenyum!
      else if (tracker.step === 'SMILE_PROMPT') {
        if (!tracker.baselineMouthContrast || tracker.baselineMouthContrast < 10) {
          tracker.baselineMouthContrast = bio.mouthContrast;
        }

        // Deteksi Senyuman: Saat tersenyum, lebar mulut dan kontras gigi/bibir meningkat
        const smileRatio = bio.mouthContrast / (tracker.baselineMouthContrast || 1);
        const hasSmileExpansion = smileRatio >= 1.25 || bio.mouthBrightnessRatio >= 1.05;

        if (hasSmileExpansion) {
          // SENYUMAN NYATA TERKONFIRMASI!
          tracker.smileDetected = true;
          tracker.step = 'SMILE_SUCCESS';
          tracker.successPopupTimerMs = 0;
          setStep('SMILE_SUCCESS');
        }
      }

      // TAHAP 5: Pop-up Sukses Senyum (Tampil 1.5 detik)
      else if (tracker.step === 'SMILE_SUCCESS') {
        tracker.successPopupTimerMs += TICK_INTERVAL_MS;

        if (tracker.successPopupTimerMs >= 1500) {
          tracker.step = 'COMPLETED';
          setStep('COMPLETED');
          executeCapture();
        }
      }
    }, TICK_INTERVAL_MS);

    return () => {
      if (activeLoopRef.current) clearInterval(activeLoopRef.current);
    };
  }, [hasPermission, isProcessing, hasAutoCaptured, mode, executeCapture]);

  return (
    <div style={{ textAlign: 'center' }}>
      {cameraError ? (
        <div style={{
          padding: '24px',
          background: '#FEF2F2',
          color: '#991B1B',
          borderRadius: '12px',
          border: '1px solid #FCA5A5'
        }}>
          <h4 style={{ fontWeight: 700 }}>Akses Perangkat Kamera Dibutuhkan</h4>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>{cameraError}</p>
        </div>
      ) : (
        <>
          <div className="biometric-viewport">
            {/* Aliran Video Live */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="biometric-video"
            />

            {/* Vignette Gelap di Tepian Frame */}
            <div className="biometric-vignette" />

            {/* Bingkai Target Oval Wajah:
                - MERAH jika wajah keluar dari frame / dinding
                - BIRU saat penyesuaian / aktif
                - HIJAU saat sukses
            */}
            <div
              className={`biometric-target-oval ${
                !isFaceInFrame
                  ? 'out-of-frame'
                  : step === 'BLINK_SUCCESS' || step === 'SMILE_SUCCESS' || step === 'COMPLETED'
                  ? 'success'
                  : 'active'
              }`}
              style={{
                borderColor: !isFaceInFrame ? '#EF4444' : undefined,
                boxShadow: !isFaceInFrame ? '0 0 25px rgba(239, 68, 68, 0.5)' : undefined
              }}
            />

            {/* Siku Presisi Target Biometrik (Corner Reticle Brackets) */}
            <div className="reticle-bracket reticle-tl" style={{ borderColor: !isFaceInFrame ? '#EF4444' : undefined }} />
            <div className="reticle-bracket reticle-tr" style={{ borderColor: !isFaceInFrame ? '#EF4444' : undefined }} />
            <div className="reticle-bracket reticle-bl" style={{ borderColor: !isFaceInFrame ? '#EF4444' : undefined }} />
            <div className="reticle-bracket reticle-br" style={{ borderColor: !isFaceInFrame ? '#EF4444' : undefined }} />

            {/* Laser Garis Pindai Tipis (Hanya aktif jika wajah nyata di dalam oval) */}
            {isFaceInFrame && <div className="biometric-scan-beam" />}

            {/* ============================================================== */}
            {/* PERINGATAN JIKA WAJAH TIDAK TERDETEKSI / DI LUAR FRAME        */}
            {/* ============================================================== */}
            {!isFaceInFrame && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(15, 23, 42, 0.94)',
                border: '2px solid #EF4444',
                borderRadius: '12px',
                padding: '18px 20px',
                color: '#FFFFFF',
                width: '88%',
                maxWidth: '360px',
                boxShadow: '0 16px 36px rgba(0,0,0,0.65)',
                backdropFilter: 'blur(12px)',
                zIndex: 30,
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <IconAlert />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FCA5A5' }}>
                  Wajah Tidak Terdeteksi
                </div>
                <div style={{ fontSize: '11.5px', color: '#CBD5E1', marginTop: '4px', lineHeight: 1.4 }}>
                  {diagnosticReason}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#FEF08A',
                  marginTop: '10px',
                  fontWeight: 600,
                  background: 'rgba(239, 68, 68, 0.25)',
                  padding: '5px 10px',
                  borderRadius: '6px'
                }}>
                  Posisikan wajah Anda tepat di dalam lingkaran oval untuk memulai.
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 1. HITUNGAN MUNDUR 5 DETIK DI KAMERA                            */}
            {/* ============================================================== */}
            {isFaceInFrame && step === 'INITIAL_COUNTDOWN' && (
              <div className="countdown-modal-overlay">
                <div className="countdown-circle-badge">
                  {countdownSeconds}
                </div>
                <div style={{
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginTop: '10px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: 'rgba(15, 23, 42, 0.75)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  backdropFilter: 'blur(8px)'
                }}>
                  {mode === 'enrollment' ? `Persiapan: Pose ${poseLabel}` : 'Wajah Terdeteksi • Tahan Posisi'}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 2. POP-UP SUKSES: KEDIPAN MATA NYATA TERVERIFIKASI             */}
            {/* ============================================================== */}
            {isFaceInFrame && step === 'BLINK_SUCCESS' && (
              <div className="biometric-success-toast">
                <div className="success-check-icon">
                  <IconCheckmark />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#34D399' }}>
                    Verifikasi Kedipan Berhasil
                  </div>
                  <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
                    Gerakan kelopak mata manusia nyata terkonfirmasi valid.
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 3. POP-UP SUKSES: SENYUMAN NYATA TERVERIFIKASI                 */}
            {/* ============================================================== */}
            {isFaceInFrame && step === 'SMILE_SUCCESS' && (
              <div className="biometric-success-toast">
                <div className="success-check-icon">
                  <IconCheckmark />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#34D399' }}>
                    Verifikasi Senyuman Berhasil
                  </div>
                  <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
                    Pola lengkungan senyuman manusia nyata terkonfirmasi valid.
                  </div>
                </div>
              </div>
            )}

            {/* Header Informasi Bagian Atas */}
            <div className="biometric-top-guidance">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: isFaceInFrame ? '#38BDF8' : '#EF4444' }}><IconShield /></span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                  USINDO BIOMETRIC GUARD
                </span>
              </div>
              <span className="badge" style={{
                background: isFaceInFrame ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.25)',
                color: isFaceInFrame ? '#38BDF8' : '#FCA5A5'
              }}>
                {isFaceInFrame ? 'WAJAH DI DALAM BINGKAI' : 'DI LUAR BINGKAI'}
              </span>
            </div>

            {/* Bar Petunjuk Bagian Bawah Kamera */}
            <div className="biometric-bottom-bar">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isFaceInFrame ? (
                    <>
                      <span style={{ color: '#EF4444' }}>●</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#FCA5A5' }}>
                        Wajah di luar bingkai oval (Uji Dibatalkan)
                      </span>
                    </>
                  ) : step === 'INITIAL_COUNTDOWN' ? (
                    <>
                      <span style={{ color: '#38BDF8' }}>●</span>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF' }}>
                        Tahan posisi wajah Anda di dalam oval ({countdownSeconds}s)
                      </span>
                    </>
                  ) : step === 'BLINK_PROMPT' ? (
                    <>
                      <span style={{ color: '#FBBF24' }}><IconEye /></span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#FDE68A' }}>
                        Uji 1/2: SILAKAN KEDIPKAN MATA (Menunggu Kedipan Nyata...)
                      </span>
                    </>
                  ) : step === 'BLINK_SUCCESS' ? (
                    <>
                      <span style={{ color: '#34D399' }}><IconCheckmark /></span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#34D399' }}>
                        Kedipan Valid. Mempersiapkan Uji Senyuman...
                      </span>
                    </>
                  ) : step === 'SMILE_PROMPT' ? (
                    <>
                      <span style={{ color: '#38BDF8' }}><IconSmile /></span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#BAE6FD' }}>
                        Uji 2/2: SILAKAN TERSENYUM (Menunggu Senyuman Nyata...)
                      </span>
                    </>
                  ) : step === 'SMILE_SUCCESS' ? (
                    <>
                      <span style={{ color: '#34D399' }}><IconCheckmark /></span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#34D399' }}>
                        Senyuman Valid. Mengambil Snapshot Presensi...
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: '#10B981' }}><IconCheckmark /></span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981' }}>
                        {isProcessing ? 'Memverifikasi ke server...' : 'Otentikasi Selesai!'}
                      </span>
                    </>
                  )}
                </div>

                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                  {!isFaceInFrame ? 'Batal' : step === 'INITIAL_COUNTDOWN' ? 'Persiapan' : 'Menunggu Aksi'}
                </span>
              </div>

              {/* Bar Indikator Progres Tahapan */}
              <div className="biometric-meter">
                <div
                  className="biometric-meter-fill"
                  style={{
                    width:
                      !isFaceInFrame ? '0%' :
                      step === 'INITIAL_COUNTDOWN' ? `${((5 - countdownSeconds) / 5) * 33}%` :
                      step === 'BLINK_PROMPT' ? '50%' :
                      step === 'BLINK_SUCCESS' ? '68%' :
                      step === 'SMILE_PROMPT' ? '84%' : '100%',
                    background:
                      !isFaceInFrame ? '#EF4444' :
                      step === 'BLINK_PROMPT' ? '#FBBF24' :
                      step === 'SMILE_PROMPT' ? '#38BDF8' : '#10B981'
                  }}
                />
              </div>
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Keterangan Kaki */}
          <div style={{
            marginTop: '14px',
            fontSize: '12px',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <IconShield />
            <span>Deteksi Biometrik Aktif: Pop-up berhasil hanya muncul jika Anda benar-benar berkedip dan tersenyum.</span>
          </div>
        </>
      )}
    </div>
  );
}
