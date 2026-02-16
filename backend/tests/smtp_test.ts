import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log('--- Softigo Mail SMTP Gönderme Testi ---');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'mail.softigo.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true', // port 465 için true
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        console.log(`📤 E-posta gönderiliyor: ${process.env.SMTP_USER} -> test@softigo.com (kendine test)`);

        const info = await transporter.sendMail({
            from: `"Softigo Mail Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Test için kendine gönder
            subject: 'Softigo Mail SMTP Test Mesajı 🚀',
            text: 'Bu bir test e-postasıdır. Eğer bu maili görüyorsanız SMTP ayarları doğru demektir.',
            html: '<b>Softigo Mail</b> üzerinden gönderilen bu mail başarıyla ulaştı! <br><i>Custom Webmail Altyapısı yayında.</i>',
        });

        console.log('✅ E-posta başarıyla gönderildi!');
        console.log('Mesaj ID:', info.messageId);

    } catch (error) {
        console.error('❌ SMTP Hatası:', error);
    }
}

main().catch(console.error);
