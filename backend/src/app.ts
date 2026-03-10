import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { CryptoService } from './services/crypto.service';
import { WidgetService } from './services/widget.service';
import { simpleParser } from 'mailparser';

dotenv.config();

const fastify = Fastify({
    logger: true,
    bodyLimit: 52428800 // 50MB — ek dosya yüklemeleri için gerekli
});

// Register CORS
fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Helper to find system folders
async function findSystemFolders(client: ImapFlow) {
    const folders = await client.list();

    const findFolder = (types: string[], keywords: string[]) => {
        return folders.find(f =>
            (f.specialUse && types.includes(f.specialUse)) ||
            keywords.some(k => f.path.toLowerCase().includes(k.toLowerCase()))
        )?.path;
    };

    return {
        trash: findFolder(['\\Trash'], ['trash', 'çöp', 'deleted']) || 'Trash',
        junk: findFolder(['\\Junk'], ['junk', 'spam', 'istenmeyen']) || 'Junk',
        sent: findFolder(['\\Sent'], ['sent', 'gönderil', 'sent items']) || 'Sent',
        drafts: findFolder(['\\Drafts'], ['draft', 'taslak']) || 'Drafts',
        archive: findFolder(['\\Archive'], ['archive', 'arşiv']) || 'Archive'
    };
}

// Get Folders API
fastify.get('/api/folders', async (request, reply) => {
    const token = request.headers['authorization'];
    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const folders = await client.list();

        // Map folders to UI-friendly types
        // 1. First pass: Identify based solely on specialUse
        const mappedFolders = folders.map(f => ({
            name: f.path,
            type: f.specialUse ? f.specialUse.replace('\\', '').toUpperCase() : 'USER',
            path: f.path
        }));

        // Track found types to avoid duplicates
        const foundTypes = new Set(mappedFolders.filter(f => f.type !== 'USER').map(f => f.type));

        // 2. Second pass: Heuristic detection only for MISSING types
        mappedFolders.forEach(f => {
            if (f.type === 'USER') {
                const path = f.path.toLowerCase();

                if (path === 'inbox' && !foundTypes.has('INBOX')) {
                    f.type = 'INBOX';
                    foundTypes.add('INBOX');
                }
                else if (!foundTypes.has('TRASH') && (path.includes('trash') || path.includes('çöp') || path.includes('deleted'))) {
                    f.type = 'TRASH';
                    foundTypes.add('TRASH');
                }
                else if (!foundTypes.has('JUNK') && (path.includes('junk') || path.includes('spam') || path.includes('istenmeyen'))) {
                    f.type = 'JUNK';
                    foundTypes.add('JUNK');
                }
                else if (!foundTypes.has('SENT') && (path.includes('sent') || path.includes('gönderil') || path.includes('giden'))) {
                    f.type = 'SENT';
                    foundTypes.add('SENT');
                }
                else if (!foundTypes.has('DRAFTS') && (path.includes('draft') || path.includes('taslak'))) {
                    f.type = 'DRAFTS';
                    foundTypes.add('DRAFTS');
                }
                else if (!foundTypes.has('ARCHIVE') && (path.includes('archive') || path.includes('arşiv'))) {
                    f.type = 'ARCHIVE';
                    foundTypes.add('ARCHIVE');
                }
            }
        });

        return { success: true, data: mappedFolders };
    } catch (error: any) {
        console.error('❌ Klasör listesi hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Login API
fastify.post('/api/login', async (request, reply) => {
    const { email, password, host, port, secure } = request.body as any;
    console.log(`🔑 Giriş isteği alındı: ${email}`);

    // Helper setup
    const testConnection = async (testHost: string, testPort: number, testSecure: boolean) => {
        const client = new ImapFlow({
            host: testHost,
            port: testPort,
            secure: testSecure,
            auth: { user: email, pass: password },
            tls: { rejectUnauthorized: false },
            logger: false as any,
            greetingTimeout: 5000
        });

        client.on('error', err => {
            console.error(`❌ IMAP Error Event (${testHost}:${testPort}):`, err.message);
        });

        try {
            console.log(`⏳ Deneme başlatılıyor: Host=${testHost}, Port=${testPort}, Secure=${testSecure}`);

            let timerId: NodeJS.Timeout;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timerId = setTimeout(() => {
                    client.close();
                    reject(new Error('Connection timed out'));
                }, 10000);
            });

            await Promise.race([
                client.connect(),
                timeoutPromise
            ]);

            clearTimeout(timerId!);
            await client.logout();
            console.log(`✅ Bağlantı başarılı: ${testHost}:${testPort}`);
            return { success: true, host: testHost, port: testPort, secure: testSecure };
        } catch (error: any) {
            console.warn(`⚠️ Bağlantı başarısız (${testHost}:${testPort}):`, error.message);
            return { success: false, error };
        }
    };

    let result: any = null;
    let lastError: any = null;

    if (host && port) {
        // Gelişmiş seçeneklerden manuel girildiyse
        result = await testConnection(host, parseInt(port), secure ?? true);
        if (!result.success) lastError = result.error;
    } else {
        // Auto-Discovery: Domain adından otomatik bul
        const domain = email.includes('@') ? email.split('@')[1] : null;
        if (!domain) {
            return reply.status(400).send({ success: false, message: 'Geçersiz e-posta adresi.' });
        }

        const strategies = [
            { h: `mail.${domain}`, p: 993, s: true },
            { h: `imap.${domain}`, p: 993, s: true },
            { h: `mail.${domain}`, p: 143, s: false },
            { h: `imap.${domain}`, p: 143, s: false }
        ];

        try {
            // Run all connection attempts concurrently.
            // Promise.any resolves with the FIRST promise that fulfills.
            result = await Promise.any(
                strategies.map(strat =>
                    testConnection(strat.h, strat.p, strat.s).then(res => {
                        if (!res.success) throw res.error; // Reject so Promise.any ignores it
                        return res;
                    })
                )
            );
        } catch (error: any) {
            // If Promise.any catches, it means ALL promises rejected (AggregateError)
            // Extract the first useful error (like Authentication failed / Command failed)
            const errors = error.errors || [error];
            lastError = errors.find((e: any) =>
                e?.message?.includes('AUTHENTICATIONFAILED') ||
                e?.message?.includes('Authentication failed') ||
                e?.message?.includes('Command failed')
            ) || errors[0];
        }
    }

    if (result && result.success) {
        // En son çalışan ayarları session'a kaydet.
        const sessionData = JSON.stringify({
            email,
            password,
            host: result.host,
            port: result.port,
            secure: result.secure
        });
        const token = CryptoService.encrypt(sessionData);

        return { success: true, token };
    } else {
        const errStr = lastError?.message || lastError?.code || 'Bilinmeyen hata';
        let userMessage = `Giriş başarısız: Sunucuya bağlanılamadı. Lütfen gelişmiş ayarları kullanın. (Hata: ${errStr})`;

        if (errStr.includes('AUTHENTICATIONFAILED') || errStr.includes('Authentication failed') || errStr.includes('Command failed')) {
            userMessage = 'Giriş başarısız: Kullanıcı adı veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
        } else if (lastError?.code === 'ECONNRESET' || lastError?.code === 'ETIMEDOUT') {
            userMessage = `Sunucuya bağlanılamadı. Lütfen alan adınızın e-posta sunucusunun aktif olduğundan emin olun. (Hata: ${errStr})`;
        }

        console.error('----------------------------------------');
        return reply.status(401).send({ success: false, message: userMessage });
    }
});

// List Emails API - WITH FOLDER SUPPORT
fastify.get('/api/mails', async (request, reply) => {
    const token = request.headers['authorization'];
    const { folder = 'INBOX' } = request.query as any;
    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: {
                rejectUnauthorized: false
            },
            logger: false
        });

        await client.connect();

        const systemFolders = await findSystemFolders(client);

        // Map folder names to IMAP folders
        const folderMap: any = {
            'INBOX': 'INBOX',
            'DRAFTS': systemFolders.drafts,
            'SENT': systemFolders.sent,
            'SPAM': systemFolders.junk,
            'TRASH': systemFolders.trash,
            'ARCHIVE': systemFolders.archive,
            'STARRED': 'INBOX'
        };

        const imapFolder = folderMap[folder] || folder;
        console.log(`📂 Klasör açılıyor: ${imapFolder} (Original: ${folder})`);

        let lock = await client.getMailboxLock(imapFolder);
        const messages = [];

        try {
            const mailbox = client.mailbox;
            if (!mailbox) throw new Error('Mailbox not found');
            const exists = mailbox.exists;

            if (exists === 0) {
                return { success: true, data: [] };
            }

            // Fetch last 500 messages to avoid performance issues (e.g. 10000+ mails)
            const fetchStart = Math.max(1, exists - 499);
            const range = `${fetchStart}:*`;

            for await (let message of client.fetch(range, { envelope: true, uid: true, flags: true })) {
                if (folder === 'STARRED' && !message.flags?.has('\\Flagged')) {
                    continue;
                }

                messages.push({
                    uid: message.uid,
                    subject: message.envelope?.subject || '(Konu Yok)',
                    from: message.envelope?.from?.[0]?.address || 'Bilinmeyen',
                    date: message.envelope?.date,
                    flags: Array.from(message.flags || [])
                });
            }
        } finally {
            if (lock) lock.release();
        }

        console.log(`✅ ${messages.length} mail bulundu`);
        return { success: true, data: messages.reverse() };
    } catch (error: any) {
        console.error('❌ Mail listesi hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Register Multipart for File Uploads
fastify.register(import('@fastify/multipart'), {
    attachFieldsToBody: true,
    limits: {
        fileSize: 25 * 1024 * 1024,  // 25MB per file
        fieldSize: 5 * 1024 * 1024,  // 5MB per text field (html body)
        files: 10,                    // maks 10 dosya
        fieldNameSize: 500
    }
});

// Send Mail API
// Send Mail API
fastify.post('/api/send', async (request, reply) => {
    const token = request.headers['authorization'];
    const parts = request.body as any;

    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));

        // Extract fields
        const to = parts.to?.value;
        const cc = parts.cc?.value;
        const bcc = parts.bcc?.value;
        const subject = parts.subject?.value;
        const html = parts.html?.value;
        const bodyText = parts.body?.value; // Fallback plain text

        // Extract attachments
        const attachments: any[] = [];
        if (parts.attachments) {
            if (Array.isArray(parts.attachments)) {
                for (const file of parts.attachments) {
                    attachments.push({
                        filename: file.filename,
                        content: await file.toBuffer()
                    });
                }
            } else {
                attachments.push({
                    filename: parts.attachments.filename,
                    content: await parts.attachments.toBuffer()
                });
            }
        }

        const mailOptions = {
            from: sessionData.email,
            to,
            cc,
            bcc,
            subject,
            text: bodyText || html?.replace(/<[^>]*>?/gm, '') || '',
            html: html || bodyText?.replace(/\n/g, '<br>'),
            attachments
        };

        // 1. Generate Raw Message Buffer using Stream Transport
        const streamTransporter = nodemailer.createTransport({
            streamTransport: true,
            buffer: true,
            newline: 'windows'
        });
        const info = await streamTransporter.sendMail(mailOptions);
        const rawMessage = info.message as Buffer;

        // 2. Identify SMTP Settings
        // Priority: 1. Host from session, 2. Derived from email, 3. Global fallback from .env
        const userDomain = sessionData.email.includes('@') ? sessionData.email.split('@')[1] : '';
        const smtpHost = sessionData.host || (userDomain ? `mail.${userDomain}` : process.env.SMTP_HOST || '');

        console.log(`📡 E-posta gönderimi başlıyor... Alıcı Domain: ${userDomain}, Kullanılan SMTP: ${smtpHost}`);

        const trySend = async (port: number, secure: boolean) => {
            console.log(`⏳ Deneme: Port ${port} (Secure: ${secure})...`);
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: port,
                secure: secure,
                auth: {
                    user: sessionData.email,
                    pass: sessionData.password
                },
                tls: {
                    rejectUnauthorized: false
                },
                connectionTimeout: 15000,
                greetingTimeout: 15000
            });

            await transporter.sendMail({
                envelope: {
                    from: sessionData.email,
                    to: [to, cc, bcc].filter(Boolean).join(',')
                },
                raw: rawMessage
            });
            console.log(`✅ Port ${port} üzerinden başarıyla gönderildi.`);
        };

        try {
            try {
                // Deneme 1: 587 (Modern Standart)
                await trySend(587, false);
            } catch (err587: any) {
                console.warn(`⚠️ Port 587 başarısız: ${err587.message}`);
                // Deneme 2: 465 (Eski SSL)
                console.log(`🔄 Port 465 deneniyor...`);
                await trySend(465, true);
            }
        } catch (error: any) {
            console.error(`❌ Tüm SMTP denemeleri başarısız:`, error.message);
            throw error;
        }

        // 3. Save to Sent Folder via IMAP
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);
        const sentFolder = systemFolders.sent || 'Sent';

        // Check if Sent folder exists, if not try to create (optional but good)
        // Usually Sent exists.

        try {
            await client.append(sentFolder, rawMessage, ['\\Seen']);
        } catch (appendError: any) {
            console.error('Sent klasörüne kaydedilemedi:', appendError.message);
            // Don't fail the request if append fails, sending was successful
        }

        return { success: true, message: 'E-posta başarıyla gönderildi' };

    } catch (error: any) {
        console.error("Gönderim hatası:", error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Delete Mail (Move to Trash)
fastify.delete('/api/mails/:uid', async (request, reply) => {
    const token = request.headers['authorization'];
    const { uid } = request.params as any;
    const { folder = 'INBOX' } = request.query as any;
    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);

        const folderMap: any = {
            'INBOX': 'INBOX',
            'DRAFTS': systemFolders.drafts,
            'SENT': systemFolders.sent,
            'SPAM': systemFolders.junk,
            'TRASH': systemFolders.trash,
            'ARCHIVE': systemFolders.archive
        };

        const sourceFolder = folderMap[folder] || folder;
        // Don't parseInt, use uid string directly for bulk operations (e.g. "123,124,125")

        console.log(`🗑️ Silme işlemi: Source=${sourceFolder}, Trash=${systemFolders.trash}, UID=${uid}`);

        if (folder === 'TRASH' || sourceFolder === systemFolders.trash) {
            let lock = await client.getMailboxLock(sourceFolder);
            try {
                // Pass uid string directly
                await client.messageDelete(uid, { uid: true });
                console.log(`🗑️ Mail(ler) kalıcı olarak silindi`);
            } finally {
                lock.release();
            }
        } else {
            let lock = await client.getMailboxLock(sourceFolder);
            try {
                // Pass uid string directly
                await client.messageMove(uid, systemFolders.trash, { uid: true });
                console.log(`📦 Mail(ler) çöp kutusuna taşındı`);
            } finally {
                lock.release();
            }
        }

        reply.code(200);
        return { success: true, message: 'Mail başarıyla silindi' };
    } catch (error: any) {
        console.error('❌ Mail silme hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Mark as Spam
fastify.post('/api/mails/:uid/spam', async (request, reply) => {
    const token = request.headers['authorization'];
    const { uid } = request.params as any;
    const { folder = 'INBOX' } = request.query as any;
    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);

        const sourceFolder = (folder === 'INBOX' ? 'INBOX' : (folder === 'DRAFTS' ? systemFolders.drafts : (folder === 'SENT' ? systemFolders.sent : (folder === 'TRASH' ? systemFolders.trash : (folder === 'ARCHIVE' ? systemFolders.archive : folder))))) as string;

        let lock = await client.getMailboxLock(sourceFolder);
        try {
            await client.messageMove(uid, systemFolders.junk as string, { uid: true });
            console.log(`⚠️ Mail(ler) spam olarak işaretlendi`);
        } finally {
            lock.release();
        }

        reply.code(200);
        return { success: true, message: 'Mail istenmeyen olarak işaretlendi' };
    } catch (error: any) {
        console.error('❌ Spam işaretleme hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Empty Trash
fastify.delete('/api/trash/empty', async (request, reply) => {
    const token = request.headers['authorization'];
    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);

        let lock = await client.getMailboxLock(systemFolders.trash);
        try {
            const mailbox = client.mailbox;
            if (mailbox && mailbox.exists > 0) {
                await client.messageDelete('1:*');
                console.log(`🗑️ Çöp kutusu boşaltıldı`);
            }
        } finally {
            lock.release();
        }

        reply.code(200);
        return { success: true, message: 'Çöp kutusu boşaltıldı' };
    } catch (error: any) {
        console.error('❌ Çöp kutusu boşaltma hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Move Mail to Folder
fastify.post('/api/mails/:uid/move', async (request, reply) => {
    const token = request.headers['authorization'];
    const { uid } = request.params as any;
    const { folder = 'INBOX' } = request.query as any;
    const { destination } = request.body as any;

    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });
    if (!destination) return reply.status(400).send({ error: 'Hedef klasör belirtilmedi' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);

        const folderMap: any = {
            'INBOX': 'INBOX',
            'DRAFTS': systemFolders.drafts,
            'SENT': systemFolders.sent,
            'SPAM': systemFolders.junk,
            'TRASH': systemFolders.trash,
            'ARCHIVE': systemFolders.archive,
            'STARRED': 'INBOX'
        };

        const sourceFolder = folderMap[folder] || folder;

        let lock = await client.getMailboxLock(sourceFolder);
        try {
            await client.messageMove(uid, destination, { uid: true });
            console.log(`📦 Mail(ler) taşındı: ${sourceFolder} -> ${destination}`);
        } finally {
            lock.release();
        }

        reply.code(200);
        return { success: true, message: 'Mail başarıyla taşındı' };
    } catch (error: any) {
        console.error('❌ Mail taşıma hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Archive Mail
fastify.post('/api/mails/:uid/archive', async (request, reply) => {
    const token = request.headers['authorization'];
    const { uid } = request.params as any;
    const { folder = 'INBOX' } = request.query as any;

    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);

        const folderMap: any = {
            'INBOX': 'INBOX',
            'DRAFTS': systemFolders.drafts,
            'SENT': systemFolders.sent,
            'SPAM': systemFolders.junk,
            'TRASH': systemFolders.trash,
            'ARCHIVE': systemFolders.archive,
            'STARRED': 'INBOX'
        };

        const sourceFolder = folderMap[folder] || folder;

        let lock = await client.getMailboxLock(sourceFolder);
        try {
            await client.messageMove(uid, systemFolders.archive, { uid: true });
            console.log(`📦 Mail(ler) arşivlendi`);
        } finally {
            lock.release();
        }

        reply.code(200);
        return { success: true, message: 'Mail arşivlendi' };
    } catch (error: any) {
        console.error('❌ Mail arşivleme hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Mark as Unread
fastify.post('/api/mails/:uid/unread', async (request, reply) => {
    const token = request.headers['authorization'];
    const { uid } = request.params as any;
    const { folder = 'INBOX' } = request.query as any;

    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);

        const folderMap: any = {
            'INBOX': 'INBOX',
            'DRAFTS': systemFolders.drafts,
            'SENT': systemFolders.sent,
            'SPAM': systemFolders.junk,
            'TRASH': systemFolders.trash,
            'ARCHIVE': systemFolders.archive,
            'STARRED': 'INBOX'
        };

        const sourceFolder = folderMap[folder] || folder;

        let lock = await client.getMailboxLock(sourceFolder);
        try {
            await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
            console.log(`Mail(ler) okunmadı işaretlendi`);
        } finally {
            lock.release();
        }

        reply.code(200);
        return { success: true, message: 'Mail okunmadı olarak işaretlendi' };
    } catch (error: any) {
        console.error('❌ Okunmadı işaretleme hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Download Attachment
fastify.get('/api/mails/:uid/attachments/:filename', async (request, reply) => {
    const { uid, filename } = request.params as any;
    const { folder = 'INBOX', token: queryToken } = request.query as any;
    const token = request.headers['authorization'] || queryToken;

    console.log(`📥 Dosya indirme isteği: ${filename}, F: ${folder}, Token Var mı: ${!!token}, QToken: ${!!queryToken}`);

    if (!token) {
        console.warn('❌ Dosya indirme başarısız: Token yok');
        return reply.status(401).send({ error: 'Yetkisiz erişim' });
    }

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();

        // Find correct folder path... reusing logic is better but copy-paste is faster for now
        const systemFolders = await findSystemFolders(client);
        const folderMap: any = {
            'INBOX': 'INBOX',
            'DRAFTS': systemFolders.drafts,
            'SENT': systemFolders.sent,
            'SPAM': systemFolders.junk,
            'TRASH': systemFolders.trash,
            'ARCHIVE': systemFolders.archive,
            'STARRED': 'INBOX'
        };
        const imapFolder = folderMap[folder] || folder;

        let lock = await client.getMailboxLock(imapFolder);
        try {
            const message = await client.fetchOne(parseInt(uid), { source: true }, { uid: true });
            if (!message || !message.source) throw new Error('Mail bulunamadı');

            const parsed = await simpleParser(message.source);
            const attachment = parsed.attachments.find(att => att.filename === filename);

            if (!attachment) {
                return reply.status(404).send({ error: 'Dosya bulunamadı' });
            }

            reply.header('Content-Disposition', `attachment; filename="${filename}"`);
            reply.header('Content-Type', attachment.contentType);
            return reply.send(attachment.content);

        } finally {
            lock.release();
        }
    } catch (error: any) {
        console.error('Download error:', error);
        reply.status(500).send({ error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Download Raw Email (.eml)
fastify.get('/api/mails/:uid/download', async (request, reply) => {
    const { uid } = request.params as any;
    const { folder = 'INBOX', token: queryToken } = request.query as any;
    const token = request.headers['authorization'] || queryToken;

    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);
        const folderMap: any = {
            'INBOX': 'INBOX',
            'DRAFTS': systemFolders.drafts,
            'SENT': systemFolders.sent,
            'SPAM': systemFolders.junk,
            'TRASH': systemFolders.trash,
            'ARCHIVE': systemFolders.archive,
            'STARRED': 'INBOX'
        };
        const imapFolder = folderMap[folder] || folder;

        let lock = await client.getMailboxLock(imapFolder);
        try {
            const message = await client.fetchOne(parseInt(uid), { source: true }, { uid: true });
            if (!message || !message.source) throw new Error('E-posta bulunamadı');

            reply.header('Content-Disposition', `attachment; filename="mail-${uid}.eml"`);
            reply.header('Content-Type', 'message/rfc822');
            return reply.send(message.source);
        } finally {
            lock.release();
        }
    } catch (error: any) {
        console.error('Email download error:', error);
        reply.status(500).send({ error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Get Single Mail Detail
fastify.get('/api/mails/:uid', async (request, reply) => {
    const token = request.headers['authorization'];
    const { uid } = request.params as any;
    const { folder = 'INBOX' } = request.query as any;
    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: {
                rejectUnauthorized: false
            },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);

        const folderMap: any = {
            'INBOX': 'INBOX',
            'DRAFTS': systemFolders.drafts,
            'SENT': systemFolders.sent,
            'SPAM': systemFolders.junk,
            'TRASH': systemFolders.trash,
            'ARCHIVE': systemFolders.archive,
            'STARRED': 'INBOX'
        };

        const imapFolder = folderMap[folder] || folder;
        let lock = await client.getMailboxLock(imapFolder);

        try {
            const uidNumber = parseInt(uid);
            const message = await client.fetchOne(uidNumber, { source: true, envelope: true }, { uid: true });

            if (!message || !message.envelope || !message.source) {
                throw new Error('E-posta içeriği alınamadı');
            }

            await client.messageFlagsAdd({ uid: uidNumber }, ['\\Seen'], { uid: true });
            const parsed = await simpleParser(message.source);

            let bodyContent = '';
            let isHtmlContent = false;
            let attachments: any[] = [];

            if (parsed.attachments && parsed.attachments.length > 0) {
                attachments = parsed.attachments.map(att => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                    cid: att.contentId,
                    content: att.content
                }));
            }

            // Fix inline images with CIDs
            if (parsed.html) {
                bodyContent = parsed.html;
                if (attachments.length > 0) {
                    attachments.forEach(att => {
                        if (att.cid) {
                            const cidRef = `cid:${att.cid}`;
                            const dataUri = `data:${att.contentType};base64,${att.content.toString('base64')}`;
                            bodyContent = bodyContent.replace(new RegExp(cidRef, 'g'), dataUri);
                        }
                    });
                }
                isHtmlContent = true;
            } else if (parsed.textAsHtml) {
                bodyContent = parsed.textAsHtml;
                isHtmlContent = true;
            } else if (parsed.text) {
                bodyContent = parsed.text;
                isHtmlContent = false;
            } else {
                bodyContent = 'Mail içeriği görüntülenemiyor.';
                isHtmlContent = false;
            }

            const serializedAttachments = attachments.map(att => ({
                filename: att.filename || 'unnamed_file',
                contentType: att.contentType,
                size: att.size,
                id: att.checksum
            }));

            return {
                success: true,
                data: {
                    uid: message.uid,
                    subject: message.envelope.subject || '(Konu Yok)',
                    from: message.envelope.from?.[0]?.address || 'Bilinmeyen',
                    to: message.envelope.to?.map((t: any) => t.address).join(', ') || '',
                    date: message.envelope.date,
                    body: bodyContent,
                    isHtml: isHtmlContent,
                    attachments: attachments.map(a => ({ filename: a.filename, size: a.size, contentType: a.contentType }))
                }
            };
        } finally {
            if (lock) lock.release();
        }
    } catch (error: any) {
        console.error('❌ Mail detay hatası:', error);
        reply.status(500).send({ success: false, error: error.message });
    } finally {
        if (client) await client.logout();
    }
});



// Save Draft API
fastify.post('/api/drafts', async (request, reply) => {
    const token = request.headers['authorization'];
    const parts = request.body as any;

    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;

    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));

        // Extract fields from multipart body
        const to = parts.to?.value || '';
        const subject = parts.subject?.value || '(Konu Yok)';
        const html = parts.html?.value || '';

        // Extract attachments
        const attachments: any[] = [];
        if (parts.attachments) {
            if (Array.isArray(parts.attachments)) {
                for (const file of parts.attachments) {
                    attachments.push({
                        filename: file.filename,
                        content: await file.toBuffer()
                    });
                }
            } else {
                attachments.push({
                    filename: parts.attachments.filename,
                    content: await parts.attachments.toBuffer()
                });
            }
        }

        // Generate Raw Email
        const transporter = nodemailer.createTransport({
            streamTransport: true,
            newline: 'windows'
        });

        const info = await transporter.sendMail({
            from: sessionData.email,
            to,
            subject,
            html,
            attachments
        });

        // info.message is a Buffer when buffer: true is set on stream transport
        const rawMessage = info.message as Buffer;

        // Connect to IMAP and Append
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();
        const systemFolders = await findSystemFolders(client);

        let targetFolder = systemFolders.drafts || 'Drafts';

        try {
            await client.append(targetFolder, rawMessage, ['\\Draft']);
        } catch (err: any) {
            console.error(`⚠️ Taslak klasörüne (${targetFolder}) ekleme başarısız, klasör oluşturuluyor...`, err.message);
            try {
                await client.mailboxCreate('Drafts');
                targetFolder = 'Drafts';
                await client.append(targetFolder, rawMessage, ['\\Draft']);
            } catch (createErr: any) {
                throw new Error(`Taslak klasörü oluşturulamadı: ${createErr.message}`);
            }
        }

        return { success: true, message: 'Taslak kaydedildi' };

    } catch (error: any) {
        console.error("Taslak kaydetme hatası:", error);
        reply.status(500).send({ error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Update Draft API - Fix for drafts saving
fastify.post('/api/mails/:uid/draft', async (request, reply) => {
    const token = request.headers['authorization'];
    const { folder = 'DRAFTS', subject, body, to } = request.body as any;
    const { uid } = request.params as any;

    if (!token) return reply.status(401).send({ error: 'Yetkisiz erişim' });

    let client: ImapFlow | null = null;
    try {
        const sessionData = JSON.parse(CryptoService.decrypt(token));
        client = new ImapFlow({
            host: sessionData.host || process.env.IMAP_HOST,
            port: parseInt(sessionData.port || process.env.IMAP_PORT),
            secure: sessionData.secure ?? (process.env.IMAP_SECURE === 'true'),
            auth: { user: sessionData.email, pass: sessionData.password },
            tls: { rejectUnauthorized: false },
            logger: false
        });

        await client.connect();

        // Remove old draft
        const lock = await client.getMailboxLock(folder);
        try {
            await client.messageDelete(uid);
        } finally {
            lock.release();
        }

        // Upload new draft
        const html = body;
        const msg = `From: ${sessionData.email}
To: ${to}
Subject: ${subject}
Content-Type: text/html; charset=utf-8

${html}`;

        await client.append(folder, msg, ['\\Draft']);

        return { success: true, message: 'Taslak güncellendi' };
    } catch (error: any) {
        console.error("Taslak güncelleme hatası:", error);
        reply.status(500).send({ error: error.message });
    } finally {
        if (client) await client.logout();
    }
});

// Widgets Data API
fastify.get('/api/widgets/data', async (request, reply) => {
    try {
        const { city } = request.query as any;
        const data = await WidgetService.getAllData(city);
        return { success: true, data };
    } catch (error: any) {
        console.error("Widget verisi hatası:", error);
        return { success: false, error: error.message };
    }
});

const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3005');
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Softigo Mail API ${port} portunda çalışıyor.`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
