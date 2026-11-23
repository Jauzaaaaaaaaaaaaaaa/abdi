# Abdi — latihan SKD CPNS

Situs statis (HTML, CSS, JavaScript biasa) untuk latihan SKD: latihan per topik dengan pembahasan langsung,
tryout berwaktu yang dinilai seperti SKD, dan tinjauan jawaban. Tanpa server, tanpa akun; kemajuan disimpan
di browser pengguna. Bukan situs resmi pemerintah.

## Halaman

| Berkas | Isi |
|---|---|
| `index.html` | Beranda: tiga subtes, cara kerja, cara menilai SKD, catatan kejujuran isi |
| `latihan.html` | Pilih subtes, topik, tingkat, jumlah soal; tombol Cara cepat (atau tombol H) sebelum menjawab; pembahasan per opsi; ringkasan dan tinjauan |
| `tryout.html` | Tryout TIU (35 soal, 32 menit) dan SKD lengkap (110 soal, 100 menit). Cara cepat boleh dibuka; soalnya ditandai petir di hasil |
| `ebook.html` | E-book TWK (16 bab) dan SKB TI (13 bab): daftar bab, cari di seluruh buku, tandai sudah dibaca (`abdi:ebook`), tombol latihan per topik (`latihan.html?topik=kode1,kode2`). Isi dari `data/ebook-*.js`, dibangun `bank-belajar/ebook.py` dari `bank-belajar/ebook/<buku>/*.html`; bunyi pasal UUD dan UU 24/2009 disisipkan dari sumber, bukan diketik |

## Data soal

Soal tidak ditulis tangan di sini. Sumbernya bank soal lokal `bank-belajar/bank.db` (tidak ikut repo ini); hanya soal yang lolos
verifikasi (view `v_soal_sah`) yang diekspor. Setelah bank berubah, perbarui situs dengan:

```
cd bank-belajar
python ekspor.py cpns ../ABDI-CPNS/data
```

Hasilnya `data/indeks.js` dan `data/soal/*.js` (paket berisi paling banyak 300 soal, dimuat sesuai kebutuhan).
Karena datanya berkas `.js`, situs tetap jalan saat `index.html` dibuka langsung dari folder.

Isi saat ini: 2.975 soal. TIU 1.840 (deret, hitung cepat, perbandingan, persentase, rata-rata) yang kuncinya dihitung
ulang oleh pemeriksa terpisah; TWK 599 yang kuncinya dicocokkan ke teks UUD NRI 1945 dan UU 24/2009; TKP 536 dengan
rubrik terbuka. Pembahasan dirender `A.isiBahas` di `js/inti.js`: baris `Konsep:`, langkah `1. …`, kutipan `“…”`, dan
`Cara cepat:` diberi gaya sendiri. TWK berbasis kasus serta TIU verbal dan figural belum ada.

## Desain

Gaya editorial yang terinspirasi situs pemenang Awwwards (judul besar, aksen huruf miring serif, daftar
bergaya katalog huruf, kartu menumpuk saat digulir), tetapi dibuat ringan dan nyaman di mata:

- Palet Volcanic Slag `#3d3d3d`, Alpine Ice `#ebecee`, Lichen Green `#c4e326`, Summit Stone `#8a8c8f`: latar es,
  teks slag (kontras sekitar 9:1); mode gelap memakai abu tua `#2b2b2b` dengan kartu slag. Lichen hanya untuk isian
  tombol dan sorotan; di mode terang garis dan teks aksen memakai zaitun `#4e6400` supaya tetap terbaca.
- Huruf: Bricolage Grotesque (judul), Instrument Serif (aksen), Geist (isi), Geist Mono (angka). Lebar baca sekitar 65 karakter.
- Setelan tampilan (ikon di kanan atas): ukuran huruf, tema, dan pengingat istirahat mata 20-20-20 saat latihan.
- Tanpa WebGL, tanpa blur latar, tanpa latar fixed; animasi hanya `transform` dan `opacity`, dan mengikuti
  setelan "kurangi gerak" di sistem.

## Aturan penilaian

TWK dan TIU: benar 5, salah atau kosong 0. TKP: tiap opsi bernilai 1–5. Nilai ambang 65 / 80 / 166 mengacu pada
Kepmen PANRB No. 321 Tahun 2024 (dicek 16 November 2026). Ubah di `js/inti.js` (`A.SUBTES`) bila aturan baru terbit.

## Menjalankan

Buka `index.html` di Chrome, atau lewat server lokal (konfigurasi `website-proyek`, port 8123, lalu buka `/ABDI-CPNS/`).
