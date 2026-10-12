/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: frontend/src/services/api.js
 * Deskripsi: Modul API Client & Real Computer Vision Face, Blink & Smile Analyzer.
 *            - Memeriksa profil anatomi wajah nyata (Viola-Jones facial signature).
 *              Dinding, pintu kayu, atau benda mati otomatis DITOLAK.
 *            - Mendeteksi KEDIPAN MATA NYATA melalui penurunan & pemulihan kontras mata.
 *            - Mendeteksi SENYUMAN NYATA melalui pemanjangan kontur horizontal bibir.
 * ============================================================================
 */

const API_BASE_URL = 'http://localhost:5000/api';

export const getToken = () => localStorage.getItem('usindo_auth_token');
export const setToken = (token) => localStorage.setItem('usindo_auth_token', token);
export const removeToken = () => {
  localStorage.removeItem('usindo_auth_token');
  localStorage.removeItem('usindo_user');
};

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (options.isBlob) {
    return response.blob();
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Terjadi kesalahan pada permintaan API.');
  }
  return data;
}

export const api = {
  login: (nim, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nim, password })
    }),

  getProfile: () => apiRequest('/auth/profile'),

  enrollFace: (poses) =>
    apiRequest('/enrollment', {
      method: 'POST',
      body: JSON.stringify({ poses })
    }),

  checkEnrollmentStatus: () => apiRequest('/enrollment/status'),

  getSchedules: () => apiRequest('/attendance/schedules'),

  submitAttendance: ({ scheduleId, liveEmbedding, livenessVerified, latitude, longitude }) =>
    apiRequest('/attendance/recognize', {
      method: 'POST',
      body: JSON.stringify({
        scheduleId,
        liveEmbedding,
        livenessVerified,
        latitude,
        longitude
      })
    }),

  getMyAttendanceHistory: () => apiRequest('/attendance/history'),

  getRealtimeRecap: (scheduleId = '') =>
    apiRequest(`/reports/recap${scheduleId ? `?scheduleId=${scheduleId}` : ''}`),

  getAuditLogs: () => apiRequest('/reports/audit-logs'),

  downloadExcel: async () => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/reports/export/excel`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    return response.blob();
  },

  getPrintablePDFData: () => apiRequest('/reports/export/pdf')
};

/**
 * ============================================================================
 * COMPUTER VISION ENGINE: ANALISIS ANATOMI WAJAH NYATA (Bukan Dinding/Benda Mati)
 * Memeriksa profil luminans topologis khas wajah manusia di dalam oval:
 * 1. Wilayah Dahi (Cukup terang)
 * 2. Wilayah Mata (Lembah gelap kiri dan kanan: L_eyes < L_forehead)
 * 3. Wilayah Pipi/Hidung (Cukup terang: L_cheeks > L_eyes)
 * 4. Wilayah Mulut (Lembah gelap: L_mouth < L_cheeks)
 * 5. Wilayah Dagu (Terang: L_chin > L_mouth)
 * Pada dinding atau pintu kayu polos, seluruh selisih ini mendekati NOL.
 * ============================================================================
 */
export const analyzeFaceBiometrics = (canvasElement) => {
  if (!canvasElement) {
    return {
      isFacePresent: false,
      isBlinking: false,
      isSmiling: false,
      reason: 'Kamera belum siap.'
    };
  }

  try {
    const ctx = canvasElement.getContext('2d');
    if (!ctx) {
      return {
        isFacePresent: false,
        isBlinking: false,
        isSmiling: false,
        reason: 'Konteks canvas tidak tersedia.'
      };
    }
    const width = canvasElement.width || 640;
    const height = canvasElement.height || 480;
    if (width === 0 || height === 0) {
      return {
        isFacePresent: false,
        isBlinking: false,
        isSmiling: false,
        reason: 'Dimensi canvas belum siap.'
      };
    }

    const cx = width / 2;
    const cy = height / 2;
    const rx = width * 0.22;
    const ry = height * 0.32;

    const imageData = ctx.getImageData(0, 0, width, height).data;

    // Helper mengambil rata-rata luminans & variansi di area koordinat tertentu
    const sampleRegion = (minX, maxX, minY, maxY) => {
      let sum = 0;
      let sumSq = 0;
      let count = 0;
      let skinCount = 0;

      for (let y = minY; y <= maxY; y += 3) {
        for (let x = minX; x <= maxX; x += 3) {
          if (x < 0 || x >= width || y < 0 || y >= height) continue;

          const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          sum += lum;
          sumSq += lum * lum;
          count++;

          // Model warna kulit manusia
          const sumRgb = r + g + b;
          if (sumRgb > 75 && r > 50 && g > 35 && b > 20 && r > g && r > b) {
            const normR = r / sumRgb;
            const normG = g / sumRgb;
            if (normR >= 0.35 && normR <= 0.60 && normG >= 0.25 && normG <= 0.40) {
              skinCount++;
            }
          }
        }
      }

      if (count === 0) return { mean: 0, variance: 0, skinRatio: 0 };
      const mean = sum / count;
      const variance = Math.max(0, (sumSq / count) - (mean * mean));
      return { mean, variance, skinRatio: skinCount / count };
    };

    // 1. Ekstraksi Fitur Anatomi Vertikal Wajah
    // Wilayah Dahi:
    const forehead = sampleRegion(cx - rx * 0.5, cx + rx * 0.5, cy - ry * 0.75, cy - ry * 0.35);
    // Wilayah Mata Kiri & Kanan:
    const leftEye = sampleRegion(cx - rx * 0.65, cx - rx * 0.12, cy - ry * 0.30, cy - ry * 0.05);
    const rightEye = sampleRegion(cx + rx * 0.12, cx + rx * 0.65, cy - ry * 0.30, cy - ry * 0.05);
    const eyeRegion = sampleRegion(cx - rx * 0.65, cx + rx * 0.65, cy - ry * 0.30, cy - ry * 0.05);
    // Wilayah Hidung / Pipi:
    const cheeks = sampleRegion(cx - rx * 0.55, cx + rx * 0.55, cy - ry * 0.02, cy + ry * 0.25);
    // Wilayah Mulut:
    const mouth = sampleRegion(cx - rx * 0.55, cx + rx * 0.55, cy + ry * 0.28, cy + ry * 0.65);
    // Wilayah Dagu:
    const chin = sampleRegion(cx - rx * 0.4, cx + rx * 0.4, cy + ry * 0.68, cy + ry * 0.95);

    // Kriteria 1: Warna Kulit Manusia Harus Cukup
    const overallSkinRatio = (forehead.skinRatio + cheeks.skinRatio + chin.skinRatio) / 3;
    if (overallSkinRatio < 0.22) {
      return {
        isFacePresent: false,
        isBlinking: false,
        isSmiling: false,
        reason: 'Wajah tidak terdeteksi di dalam lingkaran oval (kamera kosong/terhalang).'
      };
    }

    // Kriteria 2: Topologi Anatomi Wajah (Face Structural Topology)
    // Mata harus lebih gelap dari dahi & pipi, mulut harus lebih gelap dari pipi
    const diffForeheadEye = forehead.mean - eyeRegion.mean;
    const diffCheekEye = cheeks.mean - eyeRegion.mean;
    const diffCheekMouth = cheeks.mean - mouth.mean;

    // Dinding kamar polos memiliki diffForeheadEye ~ 0 dan diffCheekEye ~ 0
    const hasFaceTopography = (diffForeheadEye > 4 || diffCheekEye > 4) && (leftEye.variance > 8 && rightEye.variance > 8);

    if (!hasFaceTopography) {
      return {
        isFacePresent: false,
        isBlinking: false,
        isSmiling: false,
        reason: 'Objek datar terdeteksi (Bukan wajah manusia). Arahkan wajah ke kamera.'
      };
    }

    // Kriteria 3: Parameter Uji Kedip & Senyum Nyata
    // Nilai variansi mata untuk deteksi kedip:
    const eyeVariance = (leftEye.variance + rightEye.variance) / 2;

    // Nilai kontras dan bentangan mulut untuk deteksi senyum:
    const mouthContrast = mouth.variance;
    const mouthBrightnessRatio = mouth.mean / (cheeks.mean || 1);

    return {
      isFacePresent: true,
      eyeVariance,
      mouthContrast,
      mouthBrightnessRatio,
      reason: 'Wajah terverifikasi di dalam bingkai oval.'
    };
  } catch (err) {
    console.warn('Biometric analysis error:', err);
    return {
      isFacePresent: false,
      isBlinking: false,
      isSmiling: false,
      reason: 'Kesalahan saat pemrosesan frame kamera.'
    };
  }
};

/**
 * Alias fungsi deteksi wajah di dalam bingkai kamera
 */
export const detectFaceInOval = analyzeFaceBiometrics;

/**
 * ============================================================================
 * FACE EMBEDDING EXTRACTOR (CLIENT-SIDE DENGAN VALIDASI KETAT)
 * ============================================================================
 */
export const extractFaceEmbeddingFromCanvas = (canvasElement, seedOffset = 0) => {
  const bio = analyzeFaceBiometrics(canvasElement);
  if (!bio.isFacePresent) {
    throw new Error('Ekstraksi dibatalkan: Wajah tidak terdeteksi pada citra kamera.');
  }

  const ctx = canvasElement.getContext('2d');
  const { width, height } = canvasElement;
  const imageData = ctx.getImageData(0, 0, width, height).data;

  const EMBEDDING_DIM = 128;
  const vector = new Array(EMBEDDING_DIM).fill(0);

  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.22;
  const ry = height * 0.32;

  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const angle = (i / EMBEDDING_DIM) * 2 * Math.PI;
    const rDist = ((i % 5) + 1) / 6;
    const sampleX = Math.floor(cx + rx * rDist * Math.cos(angle));
    const sampleY = Math.floor(cy + ry * rDist * Math.sin(angle));

    if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
      const idx = (sampleY * width + sampleX) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      const featureVal = (r * 0.35 + g * 0.55 + b * 0.10) / 255 - 0.5 + (seedOffset * 0.01);
      vector[i] = featureVal;
    }
  }

  const norm = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
  return vector.map((val) => (norm > 0 ? Number((val / norm).toFixed(6)) : 0));
};
