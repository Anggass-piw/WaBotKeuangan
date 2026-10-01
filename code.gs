const SHEET_ID = 'Kode_SpreadSheet';
const KUNCI = 'GANTI_DENGAN_KATA_ACAK'; // harus sama dengan di bot.js
const TAB_UTAMA = 'Pengguna 1';           // tabnya tetap bernama "Transaksi"
const ADMIN = ['Pengguna 1', 'Pengguna 2'];     // yang boleh pakai /semua (ganti Pengguna 2 dengan namanya)

// ===== Ambil tab milik user, buat otomatis kalau belum ada =====
function ambilSheet(user) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const namaTab = user === TAB_UTAMA ? 'Transaksi' : 'Transaksi ' + user;
  let sheet = ss.getSheetByName(namaTab);

  if (!sheet) {
    const awal = ss.getSheetByName('Sheet1');
    if (user === TAB_UTAMA && awal) { sheet = awal; sheet.setName(namaTab); }
    else sheet = ss.insertSheet(namaTab);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([['Tanggal', 'Jenis', 'Nominal', 'Keterangan']]);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm');
    sheet.getRange('C:C').setNumberFormat('#,##0');
  }
  return sheet;
}

// ===== Pintu masuk dari bot.js =====
function doPost(e) {
  try {
    const { text, key, user } = JSON.parse(e.postData.contents);
    if (key !== KUNCI) return ContentService.createTextOutput('Akses ditolak');
    if (!user) return ContentService.createTextOutput('Pengguna tidak dikenal');
    return ContentService.createTextOutput(proses(text, user));
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message);
  }
}

function doGet() {
  return ContentService.createTextOutput('Bot keuangan aktif ✅');
}

// ===== Semua perintah =====
function proses(text, user) {
  const parts = (text || '').trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rp = n => 'Rp' + n.toLocaleString('id-ID');

  // Khusus admin: rekap saldo semua pengguna
  if (cmd === '/semua') {
    if (!ADMIN.includes(user)) return '⛔ Perintah ini hanya untuk admin.';
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const baris = [];
    ss.getSheets().forEach(s => {
      const nama = s.getName();
      if (!nama.startsWith('Transaksi')) return;
      let saldo = 0;
      s.getDataRange().getValues().slice(1)
        .forEach(r => saldo += r[1] === 'Pemasukan' ? r[2] : -r[2]);
      baris.push(`${nama === 'Transaksi' ? TAB_UTAMA : nama.replace('Transaksi ', '')}: ${rp(saldo)}`);
    });
    return '👥 Saldo semua pengguna\n' + baris.join('\n');
  }

  const sheet = ambilSheet(user);
  const data = () => sheet.getDataRange().getValues().slice(1);

  if (cmd === '/masuk' || cmd === '/keluar') {
    const nominal = parseInt(parts[1]);
    const ket = parts.slice(2).join(' ') || '-';
    if (isNaN(nominal)) return 'Format: /masuk 50000 gaji';
    const jenis = cmd === '/masuk' ? 'Pemasukan' : 'Pengeluaran';
    sheet.appendRow([new Date(), jenis, nominal, ket]);
    return `✅ ${jenis} ${rp(nominal)} dicatat: ${ket}`;
  }

  if (cmd === '/saldo') {
    let saldo = 0;
    data().forEach(r => saldo += r[1] === 'Pemasukan' ? r[2] : -r[2]);
    return `💰 Saldo ${user}: ${rp(saldo)}`;
  }

  if (cmd === '/riwayat') {
    const n = parseInt(parts[1]) || 5;
    const baris = data().slice(-n).map(r =>
      `${r[1] === 'Pemasukan' ? '➕' : '➖'} ${rp(r[2])} ${r[3]}`);
    return baris.length ? baris.join('\n') : 'Belum ada transaksi.';
  }

  if (cmd === '/hariini' || cmd === '/bulan') {
    const now = new Date();
    let masuk = 0, keluar = 0;
    data().forEach(r => {
      const d = new Date(r[0]);
      const cocok = cmd === '/hariini'
        ? d.toDateString() === now.toDateString()
        : d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (!cocok) return;
      if (r[1] === 'Pemasukan') masuk += r[2]; else keluar += r[2];
    });
    const judul = cmd === '/hariini' ? 'Hari ini' : 'Bulan ini';
    return `📊 ${judul} (${user})\nMasuk: ${rp(masuk)}\nKeluar: ${rp(keluar)}\nSelisih: ${rp(masuk - keluar)}`;
  }

  if (cmd === '/hapus') {
    const last = sheet.getLastRow();
    if (last < 2) return 'Tidak ada data.';
    const r = sheet.getRange(last, 1, 1, 4).getValues()[0];
    sheet.deleteRow(last);
    return `🗑️ Dihapus: ${r[1]} ${rp(r[2])} ${r[3]}`;
  }

  return 'Perintah:\n/masuk 50000 gaji\n/keluar 15000 makan siang\n/saldo\n/riwayat 5\n/hariini\n/bulan\n/hapus (transaksi terakhir)' +
    (ADMIN.includes(user) ? '\n/semua (saldo semua pengguna)' : '');
}
