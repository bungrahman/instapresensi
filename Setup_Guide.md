# Panduan Setup - InstaPresensi 🚀

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi Absensi (Attendance System) kamu:

## 1. Persiapan Google Sheet
1. Buka [Google Sheets](https://sheets.new) baru.
2. Beri nama file Google Sheet kamu (misal: `instapresensi_DB`).
3. Pergi ke menu **Extensions** > **Apps Script**.

## 2. Pindahkan Kode
Di dalam editor Apps Script:
1. Ganti isi file `Code.gs` dengan konten dari file `Code.gs` InstaPresensi.
2. Buat file HTML baru (Klik ikon **+** > **HTML**) dengan nama:
   - `index`
   - `styles`
   - `scripts`
*(Salin masing-masing kode HTML ke dalam file tersebut)*

## 3. Inisialisasi Database
1. Di dalam editor Apps Script, cari fungsi `initSheet` pada drop-down fungsi di bagian atas.
2. Klik tombol **Run**.
3. Google akan meminta izin (*Authorization*). Izinkan semua akses (pilih akun Google kamu -> Advanced -> Go to ... (unsafe) -> Allow).
4. Cek Google Sheet kamu, otomatis akan muncul sheet `Employees`, `Attendance_Log`, dan `Settings`.

## 4. Mode Operasional & Keamanan
Aplikasi ini sudah diprogram dengan integrasi **GPS** (Lokasi Latitude/Longitude) dan memblokir absen ganda.
Pastikan karyawan **menyetujui akses lokasi** pada browser HP masing-masing atau di mesin Kiosk saat membuka halaman instalasi. Jika lokasi ditolak, sistem tetap mengizinkan absen namun akan memberi flag `Akses GPS Ditolak / Timeout`.

Kamera External menggunakan bypass `https://jejakkreasi.com/camerascanner.html` secara otomatis dari sisi *scripts*.

## 5. Pengaturan Aplikasi
Buka sheet **`Settings`** di Google Sheet kamu:
- **`NOTIFICATION_URLS`**: Masukkan URL webhook jika ingin mengirim real-time notif absen.
- **`DEPARTMENTS`**: Tambahkan opsi divisi (IT, HR, Sales dll).
- **`COMPANY_NAME`**: Ganti Instapresensi dengan nama perusahaanmu.

## 6. Deploy Sebagai Web App
1. Klik tombol **Deploy** > **New Deployment**.
2. Pilih type: **Web App**.
3. Masukkan deskripsi: `v1.0`.
4. Execute as: **Me** (akun kamu).
5. Who has access: **Anyone** (agar akses dari HP karyawan mudah).
6. Klik **Deploy**.
7. Copy **Web App URL** yang diberikan. Ini adalah link aplikasi **InstaPresensi** kamu!

---
> [!TIP]
> Buka Web App URL di HP untuk absensi. Anda bahkan bisa "Add to Home Screen" di HP tiap karyawan supaya menjadi layaknya aplikasi asli. Titik koordinat GPS akan dikirim ke Spreadsheet pada saat Clock-in dan Clock-out!
