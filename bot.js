const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const APPS_URL = 'Link_Appscript';
const KUNCI = 'Kunci_Sama_Seperti_AppsScript';
const NOMOR = '62';

const PENGGUNA = {
  Nomor Tertaut: [''],
  Pengguna 1: ['628'],
  Pengguna 2: ['628'],
  Pengguna 3: ['628']
};

let sudahMinta = false;


function bukaPesan(msg) {
  let x = msg;
  for (let i = 0; i < 5 && x; i++) {
    const dalam =
      x.ephemeralMessage?.message ||
      x.viewOnceMessage?.message ||
      x.viewOnceMessageV2?.message ||
      x.documentWithCaptionMessage?.message ||
      x.deviceSentMessage?.message ||
      x.editedMessage?.message?.protocolMessage?.editedMessage ||
      x.protocolMessage?.editedMessage;
    if (!dalam) break;
    x = dalam;
  }
  return x;
}

function ambilTeks(msg) {
  const x = bukaPesan(msg);
  return x?.conversation || x?.extendedTextMessage?.text || x?.imageMessage?.caption || '';
}

const idDari = jid => (jid || '').split('@')[0].split(':')[0];


function cariNama(...ids) {
  for (const [nama, daftar] of Object.entries(PENGGUNA)) {
    if (ids.some(i => i && daftar.includes(i))) return nama;
  }
  return null;
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    logger: require('pino')({ level: 'error' }),
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered && !sudahMinta) {
    sudahMinta = true;
    setTimeout(async () => {
      const kode = await sock.requestPairingCode(NOMOR);
      console.log('Kode pairing:', kode);
    }, 3000);
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('Terhubung!');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log('Koneksi putus, kode:', code);
      if (code !== DisconnectReason.loggedOut) start();
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      if (!m.message) continue;

      const jid = m.key.remoteJid || '';
      if (jid.endsWith('@g.us') || jid === 'status@broadcast') continue;

      const text = ambilTeks(m.message);
      if (!text.startsWith('/')) continue;

      const me = idDari(sock.user?.id);
      const meLid = idDari(sock.user?.lid);
      const id = idDari(jid);
      const idAlt = idDari(m.key.remoteJidAlt);

      let user = null;
      if (id === me || id === meLid) {
        user = Object.keys(PENGGUNA)[0];
      } else if (!m.key.fromMe) {
        user = cariNama(id, idAlt);
      }

      console.log('Pesan:', JSON.stringify({ text, jid, alt: m.key.remoteJidAlt, user }));
      if (!user) continue;

      try {
        const res = await fetch(APPS_URL, {
          method: 'POST',
          body: JSON.stringify({ text, key: KUNCI, user }),
        });
        const balasan = await res.text();
        console.log('Balasan Apps Script:', balasan.slice(0, 200));
        await sock.sendMessage(jid, { text: balasan });
      } catch (err) {
        console.log('Error:', err.message);
      }
    }
  });
}

start();
