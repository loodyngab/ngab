# ALUR SISTEM ABSENSI FACE RECOGNITION USINDO

Implementasi lengkap kode aplikasi presensi biometrik berbasis pengenalan wajah (*Face Recognition*) untuk **Universitas Siber Indonesia (USINDO)**.

Sistem dibangun berdasarkan diagram arsitektur alur kerja:
1. **Pendaftaran Wajah (Enrollment)**: Perekaman 3 sampel pose wajah (Depan, Kiri, Kanan) dengan prinsip keamanan privasi (hanya vektor embedding terenkripsi yang disimpan, citra/foto mentah tidak disimpan).
2. **Absensi Harian (Recognition)**: Pemilihan jadwal aktif perkuliahan, webcam real-time, *Liveness Detection* (uji kedip & senyum anti-spoofing), pencocokan embedding wajah (*Cosine Similarity* ambang batas > 85%), validasi waktu & radius lokasi (*Geofencing* Haversine).
3. **Monitoring & Pelaporan**: Rekapitulasi presensi real-time, persentase kehadiran otomatis, evaluasi syarat mengikuti ujian (kehadiran minimal $\ge 75\%$), ekspor data ke Excel (CSV) dan PDF, serta rekaman *Audit Trail* (IP klien & waktu).

---

## 📁 Struktur Direktori Proyek

```text
absensi-face-usindo/
├── README.md
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js                      # Server utama Express.js
│       ├── config/
│       │   └── db.js                      # In-memory database & data seeder awal
│       ├── middlewares/
│       │   ├── auth.js                    # JWT verification & RBAC (Mahasiswa/Dosen/Admin)
│       │   └── auditTrail.js              # Logger pencatatan IP, waktu, & aktivitas
│       ├── utils/
│       │   ├── faceMatcher.js             # Engine Cosine Similarity & ambang batas (>85%)
│       │   └── geofence.js                # Algoritma Haversine validasi radius lokasi
│       ├── controllers/
│       │   ├── authController.js          # Controller login & profil
│       │   ├── enrollmentController.js    # Controller registrasi 3 pose wajah
│       │   ├── attendanceController.js    # Controller verifikasi presensi harian
│       │   └── reportController.js        # Controller rekap, ekspor, & evaluasi ujian
│       └── routes/
│           ├── authRoutes.js
│           ├── enrollmentRoutes.js
│           ├── attendanceRoutes.js
│           └── reportRoutes.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx                       # Titik masuk React DOM
        ├── App.jsx                        # Manajemen navigasi & state auth
        ├── index.css                      # Styling modern responsif
        ├── services/
        │   └── api.js                     # HTTP Client & Face Embedding Extractor
        ├── components/
        │   ├── Navbar.jsx                 # Bilah navigasi atas berbasis peran
        │   └── LivenessWebcam.jsx         # Komponen webcam & tantangan uji kedip/senyum
        └── pages/
            ├── Login.jsx                  # Halaman masuk akun (NIM/kata sandi)
            ├── EnrollmentPage.jsx         # Pendaftaran 3 pose (Depan, Kiri, Kanan)
            ├── AttendancePage.jsx         # Presensi harian biometrik
            └── AdminDashboard.jsx         # Dashboard monitoring rekapitulasi & audit trail
```

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Menjalankan Backend (Node.js)

Buka terminal di folder `backend`:
```bash
cd backend
npm install
npm run dev
```
Server akan aktif di `http://localhost:5000` dengan endpoint tes kesehatan di `http://localhost:5000/api/health`.

### 2. Menjalankan Frontend (React + Vite)

Buka terminal baru di folder `frontend`:
```bash
cd frontend
npm install
npm run dev
```
Aplikasi frontend akan aktif di `http://localhost:3000`.

---

## 👥 Akun Uji Coba Default

| Peran | NIM / NIP | Kata Sandi | Keterangan |
|---|---|---|---|
| **Mahasiswa** | `202401001` | `password123` | Ahmad Fauzi (Belum Enrollment) |
| **Mahasiswa** | `202401002` | `password123` | Siti Nurhaliza |
| **Dosen** | `DOSEN01` | `password123` | Dr. Hendra Wijaya, M.Kom. |
| **Administrator** | `ADMIN01` | `password123` | Administrator USINDO (Akses Audit Trail) |

---

## 🔒 Fitur Keamanan Sesuai Diagram

1. **Password Hashing**: Kata sandi di-hash menggunakan algoritma **bcrypt**.
2. **Privasi Data Biometrik**: Citra fisik / foto mentah wajah **TIDAK PERNAH disimpan** di server. Hanya representasi vektor embedding 128-dimensi float yang disimpan.
3. **Role-Based Access Control (RBAC)**: Pembatasan akses API berdasarkan peran (Mahasiswa hanya dapat presensi, Dosen/Admin dapat melihat rekap dan mengekspor data).
4. **Anti-Spoofing / Liveness**: Verifikasi kedipan mata dan senyuman sebelum pengiriman data wajah untuk mencegah manipulasi menggunakan foto cetak atau layar ponsel.
5. **Audit Trail**: Setiap percobaan absensi dicatat lengkap dengan **alamat IP klien**, **status keberhasilan**, dan **stempel waktu**.

## Tampilan Aplikasi

**Login**
![Login](docs/screenshots/login.webp)

**Halaman Login**
<img width="1920" height="964" alt="{5CAD0C89-66A7-4BBB-BCC5-E77D115E4AA4}" src="https://github.com/user-attachments/assets/4c1a4819-ae32-43f5-8130-91092981f8d4" />


**Pendaftaran Wajah**
<img width="1897" height="971" alt="{60F97D03-386E-4120-ADA7-EC3639A7247B}" src="https://github.com/user-attachments/assets/ae1ed203-37b9-425b-99f7-39decf0116e9" />


**Presensi Harian**
<img width="1918" height="962" alt="{6A5BF32A-5610-4A7D-9BB6-7B61066EBD86}" src="https://github.com/user-attachments/assets/957579ad-f1a1-4e2b-98bc-f75ba5ecca61" />


## Pembagian Tugas

| No | Nama Anggota | Tugas & Tanggung Jawab |
|:---|:---|:---|:---|
| 1 | Rudi Kurniawan |  | Setup repository GitHub, merancang kerangka awal aplikasi React, dan mengatur *Routing* akses pengguna (RBAC). |
| 2 |  |Rivaldo Juniar Ardana | Agregasi data kehadiran per mahasiswa dan per mata kuliah.
Logika evaluasi kelayakan mengikuti ujian akhir: evaluasi otomatis persentase kehadiran terhadap standar minimal $\ge 75%$.|
| 3 | Andi Mulyono | Kartu indikator metrik utama: Total Mahasiswa, Terdaftar Biometrik, Kehadiran Hari Ini, dan Mahasiswa Terlambat.
Visualisasi titik lokasi ruang kelas perkuliahan menggunakan peta interaktif Leaflet OpenStreetMap |
| 4 | Anton Yogaswara | Pencatatan alamat IP klien, user-agent perangkat, jenis aksi, status keberhasilan, dan timestamp ke dalam tabel log audit.
Pembuatan dokumentasi teknis sistem, petunjuk instalasi backend/frontend, diagram alur sistem, serta akun uji coba default.|
| 5 | Muhammad Aziis Baehacqi | Pencatatan alamat IP klien, user-agent perangkat, jenis aksi, status keberhasilan, dan timestamp ke dalam tabel log audit.
Pembuatan dokumentasi teknis sistem, petunjuk instalasi backend/frontend, diagram alur sistem, serta akun uji coba default. |

