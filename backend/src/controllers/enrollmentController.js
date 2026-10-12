/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/controllers/enrollmentController.js
 * Deskripsi: Controller Pendaftaran Wajah (Face Enrollment).
 *            Menerima ekstraksi embedding dari 3 pose: Depan, Kiri, dan Kanan.
 *            MENERAPKAN PRINSIP KEAMANAN & PRIVASI: Foto mentah (citra fisik)
 *            TIDAK disimpan sama sekali; hanya vektor numerik (float embeddings)
 *            yang disimpan sebagai vektor referensi.
 * ============================================================================
 */

import { db } from '../config/db.js';
import { recordAuditLog } from '../middlewares/auditTrail.js';

/**
 * Controller: Pendaftaran Wajah Mahasiswa (Enrollment)
 * Route: POST /api/enrollment
 * Body: {
 *   poses: [
 *     { poseType: 'FRONT', vector: [...] },
 *     { poseType: 'LEFT', vector: [...] },
 *     { poseType: 'RIGHT', vector: [...] }
 *   ]
 * }
 */
export const enrollFace = async (req, res) => {
  try {
    const userId = req.user.id;
    const { poses } = req.body;

    // 1. Validasi keberadaan array pose
    if (!poses || !Array.isArray(poses) || poses.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Diperlukan 3 sampel pose wajah lengkap: Depan (FRONT), Kiri (LEFT), dan Kanan (RIGHT).'
      });
    }

    // 2. Pastikan ketiga pose ada dan vektornya valid
    const requiredPoses = ['FRONT', 'LEFT', 'RIGHT'];
    for (const reqPose of requiredPoses) {
      const found = poses.find((p) => p.poseType === reqPose);
      if (!found || !Array.isArray(found.vector) || found.vector.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Pose '${reqPose}' tidak memiliki vektor embedding yang valid.`
        });
      }
    }

    // 3. Hapus data embedding lama jika user melakukan re-enrollment
    db.faceEmbeddings = db.faceEmbeddings.filter((item) => item.userId !== userId);

    // 4. Simpan masing-masing vektor pose referensi ke database
    //    Foto mentah tidak pernah disimpan di disk atau database
    const timestamp = new Date().toISOString();
    for (const pose of poses) {
      db.faceEmbeddings.push({
        id: `EMB-${userId}-${pose.poseType}-${Date.now()}`,
        userId,
        poseType: pose.poseType,
        // Simpan array float vektor numerik
        vector: pose.vector.map(Number),
        createdAt: timestamp
      });
    }

    // 5. Perbarui status mahasiswa menjadi sudah terdaftar (isEnrolled = true)
    const userIndex = db.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      db.users[userIndex].isEnrolled = true;
    }

    // 6. Catat audit trail pendaftaran wajah
    recordAuditLog(
      req,
      userId,
      'FACE_ENROLLMENT',
      'SUCCESS',
      `Berhasil mendaftarkan 3 pose embedding wajah (Depan, Kiri, Kanan). Foto mentah diabaikan demi privasi.`
    );

    return res.status(201).json({
      success: true,
      message: 'Pendaftaran wajah (enrollment) 3 pose berhasil disimpan.',
      data: {
        userId,
        posesRegistered: requiredPoses,
        timestamp
      }
    });
  } catch (error) {
    console.error('Error saat enrollment wajah:', error);
    recordAuditLog(req, req.user?.id, 'FACE_ENROLLMENT', 'FAILED', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses pendaftaran wajah.',
      error: error.message
    });
  }
};

/**
 * Controller: Cek Status Enrollment Mahasiswa
 * Route: GET /api/enrollment/status
 */
export const checkEnrollmentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = db.users.find((u) => u.id === userId);
    const userEmbeddings = db.faceEmbeddings.filter((e) => e.userId === userId);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        isEnrolled: user?.isEnrolled || false,
        registeredPosesCount: userEmbeddings.length,
        poses: userEmbeddings.map((e) => e.poseType)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengecek status pendaftaran wajah.',
      error: error.message
    });
  }
};
