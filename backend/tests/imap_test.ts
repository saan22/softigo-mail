import { ImapFlow } from 'imapflow';
import * as dotenv from 'dotenv';
import * as net from 'net';

dotenv.config();

console.log('--- ENV DEBUG ---');
console.log('IMAP_HOST:', process.env.IMAP_HOST);
console.log('IMAP_PORT:', process.env.IMAP_PORT);
console.log('IMAP_SECURE:', process.env.IMAP_SECURE, `(Type: ${typeof process.env.IMAP_SECURE})`);
console.log('-----------------');

const IMAP_HOST = (process.env.IMAP_HOST || 'mail.softigo.com').trim();
const IMAP_PORT = parseInt((process.env.IMAP_PORT || '993').trim());
// String check'i daha sağlam yapalım (boşlukları temizleyerek)
const isSecure = process.env.IMAP_SECURE?.trim().toLowerCase() === 'true';

const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: isSecure,
    auth: {
        user: process.env.IMAP_USER || '',
        pass: process.env.IMAP_PASS || ''
    },
    tls: {
        rejectUnauthorized: false
    },
    // logger: true, // Tip hatası verdiği için devre dışı bırakıldı
    greetingTimeout: 30000
});

async function checkPort(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => resolve(false));
        socket.connect(port, host);
    });
}

async function main() {
    console.log('--- Softigo Mail IMAP Debug Modu ---');
    console.log(`Hedef: ${IMAP_HOST}:${IMAP_PORT}`);

    console.log('🔍 Network Kontrolü: Port açık mı?');
    const isPortOpen = await checkPort(IMAP_HOST, IMAP_PORT);
    if (!isPortOpen) {
        console.error(`❌ Hata: ${IMAP_HOST} sunucusuna ${IMAP_PORT} portu üzerinden ulaşılamıyor. Firewall veya ISP engeli olabilir.`);
        return;
    }
    console.log('✅ Port erişilebilir. IMAP Oturumu başlatılıyor...');

    try {
        // Sunucuya bağlan
        await client.connect();
        console.log('✅ Sunucuya bağlantı başarılı.');

        // INBOX klasörünü seç
        let lock = await client.getMailboxLock('INBOX');
        try {
            console.log(`📂 INBOX açıldı, toplam ${client.mailbox ? client.mailbox.exists : 0} mail var...`);

            // Son 10 maili listele (Sequence range kullanarak)
            const messages = [];
            const exists = client.mailbox ? client.mailbox.exists : 0;
            const start = Math.max(1, exists - 9);

            for await (let message of client.fetch(`${start}:*`, { envelope: true, uid: true, flags: true })) {
                messages.push({
                    uid: message.uid,
                    subject: message.envelope?.subject || '(Konu Yok)',
                    from: message.envelope?.from?.[0]?.address || 'Bilinmeyen Gönderen',
                    date: message.envelope?.date,
                    flags: Array.from(message.flags || [])
                });
            }

            console.log('📩 Son 10 E-posta (JSON Formatı):');
            console.log(JSON.stringify(messages, null, 2));

        } finally {
            // Kilidi bırak
            lock.release();
        }

        // Bağlantıyı kapat
        await client.logout();
        console.log('👋 Bağlantı güvenli bir şekilde kapatıldı.');

    } catch (err) {
        console.error('❌ Hata oluştu:', err);
    }
}

main().catch(console.error);
