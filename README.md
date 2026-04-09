# InstaPresensi

Aplikasi Manajemen Absensi (Attendance System) berbasis Google Apps Script.
Aplikasi ini memungkinkan karyawan untuk melakukan absensi ganda (masuk dan keluar) setiap harinya melalui antarmuka web, terintegrasi langsung dengan database Google Sheets, fitur titik lokasi GPS, pengambilan swafoto, dan dukungan scanner QR Code tingkat lanjut.

## Struktur dan Penjelasan File

Aplikasi ini menggunakan metode pemisahan logika (Single Page Application dengan multiple resource files) agar kode lebih rapi dan mudah diatur. Berikut adalah fungsi dari masing-masing file yang ada:

### 1. Code.gs
File ini adalah otak di balik sistem backend. Ditulis di dalam ekosistem Google Apps Script, fungsinya mencakup:
- Melayani antarmuka file HTML utama ke pengguna web (fungsi doGet).
- Menginisialisasi otomatis struktur database di file Google Sheets menjadi 3 sheet pokok: Employees, Attendance_Log, dan Settings.
- Mengontrol prosedur simpan data untuk Registrasi Karyawan, prosedur Clock-In (Absen Masuk), dan prosedur Clock-Out (Absen Keluar).
- Menangani konversi file foto Base64 kiriman dari client menjadi file gambar fisik berformat JPG yang kemudian disimpan ke tautan publik dalam Google Drive.
- Menyusun dan mengeksekusi payload pengiriman notifikasi Webhook ke external URL secara otomatis.
- Memiliki logika penyaringan khusus untuk nomor handphone (Phone Formatting) memastikan format nomor seluler berawalan angka 62.

### 2. index.html
Ini merupakan fondasi utama kerangka sisi pengguna (Frontend). File ini bertugas untuk:
- Mengatur keseluruhan struktur antarmuka UI dan UX untuk karyawan. 
- Memuat referensi CSS (styles.html) dan referensi JavaScript (scripts.html).
- Mengaplikasikan blok-blok tampilan secara kompartemen layaknya Single Page Application (contohnya form registrasi, form tangkapan kamera, input absen QR, layar sukses badge, dan pengaturan aplikasi).
- Tidak ada pergantian URL halaman; semua kontrol tampilan blok dikelola lewat logika Javascript untuk pengalaman panggunaan yang tanpa putus (seamless).

### 3. scripts.html
File ini berisi seluruh fungsi logika di sisi pengguna (Client-side JavaScript). Fungsinya mencakup:
- Eksekusi pergantian halaman dinamis antar antarmuka dan pop-up peringatan dari library antarmuka.
- Melakukan pendeteksian titik Longitude dan Latitude posisi pengguna saat itu melalui Geolocation API yang ada pada browser.
- Menjalankan koneksi kamera natif di perangkat yang dipakai dan mengatur pengiriman data Base64 kembali ke server saat pengambilan foto wajah (selfie) dilakukan.
- Berkomunikasi bolak-balik dengan file kamera eksternal (camerascanner) apabila pengambilan kamera natif diblokir, sembari mendengarkan pengembalian instruksi QR Code yang terdeteksi atau foto yang sudah ditangkap.
- Kompilasi modul untuk pengunduhan bentuk digital Kartu Nama/Badge karyawan ke dalam grafis HTML Canvas.

### 4. styles.html
File ini eksklusif menangani seluruh instruksi Cascading Style Sheets (CSS). Karakteristik visual yang diatur meliputi:
- Menyediakan desain warna yang solid dan menenangkan (gradasi hijau terang hingga biru serasi).
- Membuat latar komponen-komponen antarmuka yang mengabur sebagian mirip sistem pencahayaan kaca (teknik mendasar glassmorphism).
- Menyamakan bentuk rasio setiap tombol masukan pada formulir serta menyesuaikan elemen yang mendukung tampilan ukuran perangkat telpon genggam dan komputer grafis.

### 5. camerascanner.html
File tambahan ini sengaja didesain untuk ditempatkan pada waduk hosting terpisah dari ekosistem Google (misalnya pada server VPS biasa atau repositori statis). 
- Berguna membongkar jalan batas (bypass) kebijakan blokir kamera perangkat oleh mesin iframe standar Google Apps Script terutama di sistem operasi ketat seperti piranti seluler.
- Memiliki kode algoritma library Javascript jsQR yang siap mendekodekan gambar dari video streaming ke dalam sandi identitas Karyawan (NIK). 
- Meneruskan secara paralel hasil sandi tersebut atau tangkapan gambar foto ke script utama Google sebelum proses menutup jendela interaksi kamera.

### 6. Setup_Guide.md
Sebuah dokumen yang ditujukan eksklusif bagi administrator atau instalatur. Penjelasannya memberikan petunjuk taktis dalam mengimplementasikan, menautkan, mengatur izin Google Sheet, dan mempublikasikan (Deploy) rangkaian aplikasi ini ke publik (Web App) tahap demi tahap.
