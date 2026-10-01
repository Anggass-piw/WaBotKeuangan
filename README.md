# 💰 Bot Keuangan WhatsApp

Bot pencatat keuangan lewat WhatsApp. Kirim perintah seperti `/keluar 15000 makan siang`, dan transaksinya otomatis masuk ke **Google Sheets**. Berjalan di **Termux** (Android) memakai **Baileys**, dengan **Google Apps Script** sebagai otak dan pencatatnya.

- Gratis, tanpa server berbayar
- Mendukung banyak pengguna, **saldo tiap orang terpisah** (satu tab per orang)
- Ada perintah rekap harian, bulanan, dan riwayat

> ⚠️ **Peringatan:** Baileys adalah library **tidak resmi** untuk WhatsApp Web. Pakai untuk keperluan pribadi saja, jangan untuk pesan massal atau spam. Sebaiknya gunakan **nomor khusus bot (nomor kedua)**, bukan nomor utama, karena ada risiko kecil nomor dibatasi WhatsApp.

---

## Cara kerja

```
Kamu (WhatsApp) ──► Nomor bot (Termux + Baileys) ──► Apps Script (Web App) ──► Google Sheets
                                    ◄────────── balasan teks ◄──────────┘
```

1. Kamu mengirim perintah ke nomor bot.
2. `bot.js` di Termux menerima pesan dan meneruskannya ke Apps Script.
3. Apps Script mencatat atau menghitung di spreadsheet, lalu mengembalikan teks balasan.
4. Bot membalas lewat WhatsApp.

## Struktur repo

```
.
├── bot.js        # bot WhatsApp (dijalankan di Termux)
├── Code.gs       # kode Google Apps Script
├── package.json
├── .gitignore
└── README.md
```

## Yang dibutuhkan

- HP Android dengan **Termux** (disarankan dari [F-Droid](https://f-droid.org/packages/com.termux/), bukan Play Store)
- Akun **Google**
- **Nomor WhatsApp untuk bot** (disarankan nomor kedua) yang aktif di HP
- Koneksi internet

---

## Langkah 1 — Siapkan Google Spreadsheet

1. Buat Google Sheet baru.
2. Salin **ID spreadsheet** dari URL, yaitu bagian antara `/d/` dan `/edit`:
   ```
   https://docs.google.com/spreadsheets/d/ID_SPREADSHEET_ADA_DI_SINI/edit
   ```
3. Tab dan header (`Tanggal | Jenis | Nominal | Keterangan`) akan **dibuat otomatis** oleh script saat pertama kali dipakai, jadi tidak perlu diisi manual.

## Langkah 2 — Pasang Apps Script

1. Di spreadsheet, buka **Extensions → Apps Script**.
2. Hapus isi default, lalu tempel seluruh isi `Code.gs` dari repo ini.
3. Ubah konfigurasi di bagian atas file:

   ```javascript
   const SHEET_ID = 'ID_SPREADSHEET_KAMU';
   const KUNCI = 'KATA_RAHASIA_BUATANMU';  // harus sama dengan di bot.js
   const TAB_UTAMA = 'NamaKamu';           // tabnya bernama "Transaksi"
   const ADMIN = ['NamaKamu', 'NamaTeman']; // yang boleh pakai /semua
   ```

4. Klik **Deploy → New deployment → ikon roda gigi → Web app**:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
5. Klik **Deploy**, setujui izin akses (klik *Advanced → Go to project* jika muncul peringatan).
6. Salin **Web app URL** yang berakhiran `/exec`.

> **Setiap kali kode Apps Script diubah**, deploy ulang lewat **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**. Dengan cara ini URL tidak berubah.

Cek apakah sudah aktif dengan membuka URL tadi di browser. Kalau muncul `Bot keuangan aktif ✅`, berarti beres.

## Langkah 3 — Pasang di Termux

```bash
pkg update && pkg upgrade -y
pkg install nodejs git nano tmux -y

git clone https://github.com/USERNAME_KAMU/NAMA_REPO.git wabot
cd wabot
npm install
```

Kalau repo belum memakai `package.json`, instal manual:

```bash
npm init -y
npm install @whiskeysockets/baileys pino
```

## Langkah 4 — Atur konfigurasi `bot.js`

Buka dengan `nano bot.js`, lalu ubah bagian atas:

```javascript
const APPS_URL = 'URL_WEBAPP_APPS_SCRIPT';   // URL berakhiran /exec
const KUNCI = 'KATA_RAHASIA_BUATANMU';       // sama dengan di Code.gs
const NOMOR = '628xxxxxxxxxx';               // nomor bot: awalan 62, tanpa + dan tanpa 0

const PENGGUNA = {
  NamaKamu: ['628xxxxxxxxxx'],    // nomor/ID kamu
  NamaTeman: ['628yyyyyyyyyy'],   // nomor/ID orang kedua
};
```

Aturan penting:
- Nama di `PENGGUNA` harus **sama persis** (termasuk huruf besar-kecil) dengan `TAB_UTAMA` dan `ADMIN` di `Code.gs`.
- Satu orang boleh punya beberapa ID, misalnya `['628123456789', '163282493140999']`. Lihat bagian [Mencari ID pengguna](#mencari-id-pengguna).
- Nama pertama di `PENGGUNA` adalah pemilik chat ke diri sendiri pada nomor bot.

Simpan dengan `Ctrl+O`, `Enter`, lalu `Ctrl+X`.

## Langkah 5 — Jalankan dan login (pairing)

```bash
termux-wake-lock
node bot.js
```

1. Tunggu sampai muncul `Kode pairing: XXXX-XXXX`.
2. Di HP yang memakai nomor bot, buka **WhatsApp → Perangkat tertaut → Tautkan perangkat → Tautkan dengan nomor telepon saja**.
3. Masukkan kodenya.
4. Setelah muncul `Terhubung!`, kirim `/saldo` dari nomor pengguna ke nomor bot.

Sesi login tersimpan di folder `auth/`, jadi pairing cukup sekali.

Kalau kode ditolak atau kedaluwarsa: tekan `Ctrl+C`, jalankan `rm -rf auth`, lalu `node bot.js` lagi.

## Langkah 6 — Jalankan di latar belakang

Pakai `tmux` supaya bot tetap hidup saat Termux ditutup:

```bash
tmux new -s bot
termux-wake-lock
node bot.js
```

Lepas dari sesi dengan `Ctrl+B`, lalu tekan `D`.

| Keperluan | Perintah |
|---|---|
| Masuk lagi ke sesi bot | `tmux attach -t bot` |
| Hentikan bot | masuk sesi, lalu `Ctrl+C` |
| Lihat sesi aktif | `tmux ls` |

Agar stabil, matikan optimasi baterai untuk Termux (**Pengaturan → Aplikasi → Termux → Baterai → Tanpa batasan**) dan kunci Termux di daftar aplikasi terbaru.

---

## Daftar perintah

| Perintah | Contoh | Fungsi |
|---|---|---|
| `/masuk` | `/masuk 100000 uang saku` | Catat pemasukan |
| `/keluar` | `/keluar 15000 makan siang` | Catat pengeluaran |
| `/saldo` | `/saldo` | Lihat saldo milikmu |
| `/riwayat` | `/riwayat 10` | Lihat N transaksi terakhir (default 5) |
| `/hariini` | `/hariini` | Ringkasan hari ini |
| `/bulan` | `/bulan` | Ringkasan bulan ini |
| `/hapus` | `/hapus` | Hapus transaksi terakhir |
| `/semua` | `/semua` | Saldo semua pengguna (khusus admin) |

Catatan penulisan: nominal ditulis angka saja (`15000`, bukan `15.000` atau `Rp15000`), dan keterangan boleh dikosongkan.

## Banyak pengguna, saldo terpisah

Tiap pengguna di `PENGGUNA` punya tab sendiri di spreadsheet:

| Pengguna | Tab |
|---|---|
| `TAB_UTAMA` | `Transaksi` |
| Pengguna lain | `Transaksi NamaPengguna` (dibuat otomatis) |

Perintah `/saldo`, `/hapus`, dan lainnya hanya menyentuh data milik pengirimnya. Nomor yang tidak ada di `PENGGUNA` akan **diabaikan**.

> Pemisahan ini hanya berlaku di bot. Siapa pun yang punya akses ke spreadsheet bisa melihat semua tab, jadi jangan bagikan link spreadsheet ke sembarang orang.

## Mencari ID pengguna

WhatsApp kini memakai dua bentuk ID: nomor telepon biasa dan ID panjang (LID). Cara mengetahui ID seseorang:

1. Minta orangnya mengirim `/saldo` ke nomor bot.
2. Lihat baris `Pesan:` di Termux, misalnya:
   ```
   Pesan: {"text":"/saldo","jid":"163282493140999@lid","alt":"628123456789@s.whatsapp.net","user":null}
   ```
3. Salin angka sebelum `@` pada `jid` dan/atau `alt` ke daftar `PENGGUNA`.
4. Simpan, lalu jalankan ulang `node bot.js`.

---

## Troubleshooting

| Masalah | Penyebab dan solusi |
|---|---|
| Tidak ada balasan, tidak ada log `Pesan:` | Pesan tidak sampai ke bot. Cek koneksi, lalu coba `rm -rf auth` dan pairing ulang. |
| Ada log `Pesan:` tapi `user: null` | ID pengirim belum ada di `PENGGUNA`. Tambahkan sesuai bagian [Mencari ID pengguna](#mencari-id-pengguna). |
| `Akses ditolak` | `KUNCI` di `bot.js` dan `Code.gs` berbeda. |
| Balasan berisi HTML atau halaman login Google | Deployment belum **Execute as: Me** dan **Access: Anyone**, atau belum di-deploy versi baru. |
| `Cannot read properties of null (reading 'getDataRange')` | Tab spreadsheet tidak ditemukan. Pakai versi `Code.gs` yang membuat tab otomatis. |
| `Cannot read properties of undefined (reading 'trim')` | Fungsi `proses` dijalankan lewat tombol **Run** tanpa teks. Fungsi ini hanya jalan lewat bot. |
| `Cannot find module 'pino'` | Jalankan `npm install pino`. |
| Bot mati sendiri | Aktifkan `termux-wake-lock`, matikan optimasi baterai, dan jalankan lewat `tmux`. |
| Koneksi putus berulang | Update library: `npm install @whiskeysockets/baileys@latest`. |

---

## Keamanan

- **Jangan** mengunggah ke GitHub: folder `auth/`, nilai `KUNCI`, URL Web App, ID spreadsheet, dan nomor telepon asli. Semuanya bisa dipakai orang lain untuk mengakses akunmu.
- Tinggalkan placeholder di repo, dan isi nilai aslinya hanya di perangkatmu.
- Karena Web App berakses **Anyone**, `KUNCI` adalah satu-satunya penjaga. Pilih kata acak yang panjang.
- Set spreadsheet ke **Restricted** (Share → General access). Bot tetap bisa menulis karena berjalan atas akun pemilik script.

Contoh `.gitignore`:

```
node_modules/
auth/
*.log
```

Kalau kamu sudah terlanjur mengunggah rahasia: ganti `KUNCI`, deploy ulang Apps Script, dan hapus folder `auth/` lalu pairing ulang. Menghapus file dari commit terbaru saja tidak cukup, karena riwayat Git masih menyimpannya.

---

## Lisensi

Pilih lisensi sesuai kebutuhanmu (misalnya MIT) dan tambahkan file `LICENSE`.

## Ucapan terima kasih

- [Baileys](https://github.com/WhiskeySockets/Baileys) untuk koneksi WhatsApp Web
- [Google Apps Script](https://developers.google.com/apps-script) dan Google Sheets
- [Termux](https://termux.dev)
