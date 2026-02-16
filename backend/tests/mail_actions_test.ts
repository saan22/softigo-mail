import { ImapFlow } from 'imapflow';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'mail.softigo.com',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: process.env.IMAP_SECURE === 'true',
    auth: {
        user: process.env.IMAP_USER || '',
        pass: process.env.IMAP_PASS || ''
    },
    tls: {
        rejectUnauthorized: false
    },
    logger: false
});

async function main() {
    console.log('--- Softigo Mail IMAP Aksiyon Testi (Okundu/Silme) ---');

    try {
        await client.connect();

        let lock = await client.getMailboxLock('INBOX');
        try {
            const mailbox = client.mailbox;
            if (mailbox && mailbox.exists > 0) {
                // Test için son maili bulalım
                const lastMessage = await client.fetchOne(mailbox.exists, { flags: true, uid: true });

                if (lastMessage) {
                    console.log(`🔍 İşlem yapılacak Mail UID: ${lastMessage.uid}`);

                    // 1. Okundu İşareti Koyma
                    console.log('🔖 Mail "Okundu" (\\Seen) olarak işaretleniyor...');
                    await client.messageFlagsAdd({ uid: lastMessage.uid }, ['\\Seen'], { uid: true });
                    console.log('✅ Okundu işareti eklendi.');
                }
            } else {
                console.log('❌ Klasörde mail bulunamadı veya mailbox erişilemez.');
            }

        } finally {
            lock.release();
        }

        await client.logout();
        console.log('👋 Test tamamlandı.');

    } catch (err) {
        console.error('❌ Hata:', err);
    }
}

main().catch(console.error);
