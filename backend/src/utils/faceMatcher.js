/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/utils/faceMatcher.js
 * Deskripsi: Face Recognition Matching Engine.
 *            - Menghitung Cosine Similarity antara live embedding & vektor referensi.
 *            - Validasi Variansi/Entropi Vektor (Mencegah vektor frame kosong/dinding).
 *            - Ambang batas kecocokan ketat (> 85%).
 * ============================================================================
 */

/**
 * Validasi apakah vektor embedding berasal dari fitur wajah nyata atau citra kosong/dinding.
 * Vektor wajah nyata memiliki variansi dan entropi nilai float yang bervariasi.
 * Jika kamera mengarah ke dinding kosong/gelap, variansi vektor mendekati nol atau datar.
 * 
 * @param {number[]} vector - Vektor embedding float
 * @returns {boolean} true jika vektor valid dan memiliki fitur wajah
 */
export const isVectorValidAndRich = (vector) => {
  if (!vector || !Array.isArray(vector) || vector.length < 64) return false;

  let sum = 0;
  let sumSq = 0;
  let nonZeroCount = 0;

  for (const val of vector) {
    if (typeof val !== 'number' || isNaN(val)) return false;
    sum += val;
    sumSq += val * val;
    if (Math.abs(val) > 0.0001) nonZeroCount++;
  }

  // Jika sebagian besar vektor bernilai nol (frame kosong)
  if (nonZeroCount < vector.length * 0.7) return false;

  const mean = sum / vector.length;
  const variance = (sumSq / vector.length) - (mean * mean);

  // Variansi minimal: citra berfitur wajah memiliki variansi > 0.002
  return variance > 0.002;
};

/**
 * Menghitung Cosine Similarity antara dua vektor float.
 * similarity = (A . B) / (||A|| * ||B||)
 * 
 * @param {number[]} vecA - Vektor embedding wajah A
 * @param {number[]} vecB - Vektor embedding wajah B
 * @returns {number} Nilai cosine similarity (0.0 s/d 1.0)
 */
export const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    throw new Error('Vektor embedding tidak valid atau panjang dimensi tidak cocok.');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  const similarity = dotProduct / (normA * normB);
  return Math.max(0, Math.min(1, similarity));
};

/**
 * Membandingkan vektor wajah live dengan seluruh vektor pose terdaftar (Depan, Kiri, Kanan).
 * Mengambil skor kecocokan tertinggi dan membandingkannya dengan ambang batas (>85%).
 * 
 * @param {number[]} liveEmbedding - Vektor embedding dari kamera saat absensi
 * @param {Array<{poseType: string, vector: number[]}>} enrolledEmbeddings - Kumpulan pose terdaftar
 * @param {number} threshold - Ambang batas kecocokan (default: 0.85 atau 85%)
 * @returns {{isMatch: boolean, bestScore: number, matchedPose: string, percentage: string}}
 */
export const matchFaceWithEnrolledPoses = (
  liveEmbedding, 
  enrolledEmbeddings, 
  threshold = 0.85
) => {
  // Validasi kualitas vektor live: tolak jika vektor datar / kosong
  if (!isVectorValidAndRich(liveEmbedding)) {
    return {
      isMatch: false,
      bestScore: 0,
      matchedPose: 'NONE',
      percentage: '0.00%',
      error: 'Vektor embedding tidak mengandung fitur wajah valid (kemungkinan wajah di luar frame).'
    };
  }

  if (!enrolledEmbeddings || enrolledEmbeddings.length === 0) {
    return {
      isMatch: false,
      bestScore: 0,
      matchedPose: 'NONE',
      percentage: '0.00%'
    };
  }

  let bestScore = -1;
  let matchedPose = '';

  // Bandingkan dengan setiap pose referensi (Depan, Kiri, Kanan)
  for (const item of enrolledEmbeddings) {
    const score = calculateCosineSimilarity(liveEmbedding, item.vector);
    if (score > bestScore) {
      bestScore = score;
      matchedPose = item.poseType;
    }
  }

  const isMatch = bestScore >= threshold;

  return {
    isMatch,
    bestScore: Number(bestScore.toFixed(4)),
    matchedPose,
    percentage: `${(bestScore * 100).toFixed(2)}%`
  };
};
