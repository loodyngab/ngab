/**
 * ============================================================================
 * SISTEM ABSENSI FACE RECOGNITION USINDO
 * File: backend/src/utils/geofence.js
 * Deskripsi: Modul Geofencing menggunakan Rumus Haversine.
 *            Memvalidasi apakah mahasiswa berada di dalam radius area kampus
 *            atau ruang kelas yang telah ditentukan saat melakukan absensi.
 * ============================================================================
 */

/**
 * Mengubah derajat sudut ke radian
 */
const toRadians = (degree) => (degree * Math.PI) / 180;

/**
 * Menghitung jarak lintang-bujur antara dua titik koordinat GPS (meter).
 * Menggunakan algoritma Haversine formula.
 * 
 * @param {number} lat1 - Latitude titik 1
 * @param {number} lon1 - Longitude titik 1
 * @param {number} lat2 - Latitude titik 2
 * @param {number} lon2 - Longitude titik 2
 * @returns {number} Jarak dalam satuan meter
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const EARTH_RADIUS_METERS = 6371000; // Radius rata-rata bumi

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * Memvalidasi apakah koordinat user berada di dalam radius geofence yang diizinkan.
 * 
 * @param {number} userLat - Latitude pengguna
 * @param {number} userLng - Longitude pengguna
 * @param {number} targetLat - Latitude target ruang kelas/kampus
 * @param {number} targetLng - Longitude target ruang kelas/kampus
 * @param {number} allowedRadiusMeters - Radius toleransi (misal 100 meter)
 * @returns {{isInside: boolean, distanceMeters: number}}
 */
export const validateGeofence = (
  userLat,
  userLng,
  targetLat,
  targetLng,
  allowedRadiusMeters = 100
) => {
  if (userLat === undefined || userLng === undefined) {
    return {
      isInside: false,
      distanceMeters: null,
      message: 'Koordinat lokasi GPS tidak disediakan oleh perangkat.'
    };
  }

  const distanceMeters = calculateDistanceMeters(
    Number(userLat),
    Number(userLng),
    Number(targetLat),
    Number(targetLng)
  );

  const isInside = distanceMeters <= allowedRadiusMeters;

  return {
    isInside,
    distanceMeters: Math.round(distanceMeters),
    message: isInside
      ? `Lokasi valid: berjarak ${Math.round(distanceMeters)}m dari kelas (dalam radius ${allowedRadiusMeters}m).`
      : `Di luar radius: Anda berjarak ${Math.round(distanceMeters)}m (maksimal ${allowedRadiusMeters}m).`
  };
};
