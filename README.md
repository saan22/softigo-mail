# Softigo BulutMail Platform

Modern, hızlı ve güvenli web tabanlı e-posta yönetim paneli.

## 🚀 Özellikler

- **Modern Tasarım:** Nebula temalı glassmorphism arayüz.
- **Dinamik Sunucu Bağlantısı:** Herhangi bir e-posta domaini ile anında kullanım.
- **Gelişmiş Klasör Yönetimi:** Gelen kutusu, gönderilenler, çöpler, arşiv ve spam yönetimi.
- **Zengin Metin Editörü:** HTML formatında e-posta gönderimi.
- **Dosya Ekleri:** Dosya gönderme ve alma (onay mekanizmalı indirme).
- **Akıllı Araçlar (Widgets):** Güncel döviz kurları, hava durumu ve haberler.

## 🛠️ Kurulum (Yerel Geliştirme)

1. Depoyu klonlayın:

   ```bash
   git clone <repo-url>
   cd softigo-mail
   ```

2. Bağımlılıkları yükleyin:

   ```bash
   npm install
   npm run install-all
   ```

3. Gerekli yapılandırmaları yapın:
   - `backend/.env` dosyasını `backend/.env.example` dosyasından türeterek oluşturun.
   - `frontend/.env.local` dosyasını oluşturun: `NEXT_PUBLIC_API_URL=http://localhost:3005`

4. Uygulamayı başlatın:

   ```bash
   npm run dev
   ```

## 🚢 Canlı Sunucu (Hosting) Kurulumu

Proje Docker desteği ile gelmektedir. En sağlıklı kurulum için Docker kullanılması önerilir. Detaylı adım adım kurulum için `UBUNTU_DEPLOYMENT_GUIDE.md` dosyasını inceleyebilirsiniz.

### Hızlı Docker Kurulumu

1. `docker-compose.yml` dosyasındaki ayarları düzenleyin.
2. `docker compose up -d --build` komutunu çalıştırın.
3. Nginx veya benzeri bir ters vekil (reverse proxy) sunucu ile SSL sertifikasını yapılandırın.

---
**Softigo - Profesyonel E-Posta Çözümleri**
