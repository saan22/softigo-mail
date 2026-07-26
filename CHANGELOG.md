# Softigo Webmail — Değişiklik Günlüğü (CHANGELOG)

> GitHub: <https://github.com/saan22/softigo-mail>  
> Deploy: `/opt/softigo-mail` (Ubuntu + Docker)

---

## [v2.0.0] — Geliştirme aşamasında (Unreleased)

> Bu sürüm `v2` dalında geliştirilmektedir.
> Temel alınan kararlı sürüm: **v1.5.0** (canlıda çalışan hâli).

### 🚧 Planlanan

- _(Yeni özellikler buraya eklenecek)_

---

## [v1.5.0] — 2026-07-26

> Yeni sunucuya (VDS) taşınma ve güvenlik sıkılaştırma sürümü.
> **v2 geliştirmeleri bu sürümün üzerine başlar.**

### 🔐 Güvenlik

- **Şifreleme anahtarı depodan çıkarıldı:** `ENCRYPTION_KEY` `docker-compose.yml` içinde
  açık metin commit'lenmişti ve depo public olduğu için herkese görünüyordu. Bu anahtar
  oturum token'larını şifreliyor; token içinde kullanıcının IMAP e-posta ve parolası taşınıyor.
  Anahtar **yenilendi (rotate)** ve `backend/.env` dosyasına taşındı (`env_file` ile okunuyor).
- **Uygulama portları dışarıya kapatıldı:** 3000 ve 3005 artık yalnızca `127.0.0.1`'e bağlı;
  tüm erişim nginx üzerinden. UFW etkinleştirildi (22/80/443).
- **Yapılandırma depodan ayrıldı:** `NEXT_PUBLIC_API_URL` sabit kodlanmak yerine `.env`'den okunuyor.

### 🚀 Dağıtım (Deployment)

- Proje yeni VDS'e Docker ile kuruldu; `business.softigo.com.tr` domaini devreye alındı.
- nginx ters vekil yapılandırıldı: `/api/*` → backend, geri kalan → frontend.
- **Cloudflare 521 hatası çözüldü:** Cloudflare "Full" modunda origin'e 443'ten bağlandığı için
  nginx'e HTTPS dinleyicisi eklendi (yalnızca 80 dinlemek yeterli değildi).
- Canlı yapılandırma `deploy/` klasörüne alındı (nginx config + kurulum notları).
- Sunucu kernel güncellemesi yapıldı (`5.15.0-186`).

### ⚠️ Yükseltme notu

Şifreleme anahtarı yenilendiği için **açık oturumlar düşer**; kullanıcılar yeniden giriş yapar.
Kalıcı veri kaybı yoktur (anahtar yalnızca oturum token'ını şifreler).

---

## [v1.4.0] — 2026-03-26

### ✨ Gelişmiş İmza ve Zengin Metin Editörü

- **Zengin Metin Editörü (RichTextEditor):** Mailler ve imzalar için gelişmiş HTML editörü eklendi.
- **Resim Ekleme:** İmzaya veya mail gövdesine bilgisayardan/telefondan resim yükleme (base64) desteği eklendi.
- **Bağlantı (Link) Desteği:** İmzalar için tıklanabilir bağlantı oluşturma özelliği eklendi.

### ✨ Takvim Görevleri (Yapılacaklar Listesi)

- Boş takvim alanı, aktif bir **Görev Yönetim Sistemi'ne** dönüştürüldü.
- Görevlere **Bitiş Tarihi** ve **Öncelik Derecesi** (Normal/Yüksek) atama eklendi.
- Tamamlanan görevleri toplu silme ve üstünü çizerek işaretleme desteği.

### ✨ Cihazlar Arası Eşitleme (Cross-Device Sync)

- **Backend Veri Deposu:** Ayarların (imza, görevler vb.) tarayıcı yerine sunucuda saklanması sağlandı.
- Farklı bilgisayar veya telefonlardan girildiğinde ayarların otomatik çekilmesi sağlandı.
- **Docker Veri Güvenliği:** `docker-compose.yml` dosyasına `volumes` eklenerek sunucu güncellense bile verilerin silinmemesi sağlandı.

### ✨ Kullanıcı Deneyimi İyileştirmeleri

- **Gönderilmiş/Taslak Klasörleri:** Mail listesinde "Kimden" yerine "Kime" adresi gösterilmesi sağlandı.
- **Bildirim Ayarları:** Tarayıcı üzerinden masaüstü bildirimlerine izin verme ve yönetme arayüzü eklendi.

---

## [v1.3.0] — 2026-02-24

### 🐛 iOS Ek Dosya Gönderim Hatası Düzeltildi

- **Sorun:** iPhone'dan resim ekleyip gönder denildiğinde `"The string did not match the expected pattern"` hatası alınıyordu.
- **Neden:** iOS Safari'de `File` nesnesi FormData'ya doğrudan eklendiğinde WebKit bu hatayı fırlatıyor (özellikle HEIC formatı ve iCloud dosyaları).
- **Çözüm:**
  1. `handleFileChange`: Dosya seçildiğinde `FileReader` ile ilk 1KB okunarak dosyanın erişilebilir olduğu doğrulanıyor. İndirilmemiş iCloud dosyaları anında uyarıyla atlanıyor.
  2. `handleSend`: `File` → `file.arrayBuffer()` → `new Blob([buf], { type })` dönüşümü yapılarak FormData'ya ekleniyor. Boş MIME type olan dosyalara `application/octet-stream` atanıyor.

---

## [v1.2.0] — 2026-02-23

### 🐛 Ek Dosya Yükleme Limiti Artırıldı (Backend)

- **Sorun:** Büyük ek dosyalar gönderilirken sunucu hata veriyordu.
- **Neden:** Fastify'ın varsayılan `bodyLimit` değeri yalnızca **1MB**.
- **Çözüm:**
  - `bodyLimit` → **50MB** olarak artırıldı.
  - `@fastify/multipart` limitleri güncellendi:
    - `fileSize`: 10MB → **25MB**
    - `fieldSize`: yok → **5MB** (HTML body için)
    - `files`: sınırsız → **max 10 dosya**

---

## [v1.1.0] — 2026-02-23

### ✨ Mobil E-posta Yazma Modalı (Compose) Yeniden Tasarlandı

- Mobilde modal artık **tam ekran** açılıyor (`height: 100vh`, `borderRadius: 0`).
- **Slide-up animasyonu** eklendi (aşağıdan yukarı kayarak açılıyor).
- **Header'a "Gönder" butonu** eklendi — masaüstünde alt çubukta, mobilde üst başlıkta.
- **Cc/Bcc toggle'ları** mobilde küçük chip olarak "Kime" alanının altında gösteriliyor.
- Input alanlarına `minWidth: 0` eklenerek yatay taşma (overflow) önlendi.
- **Dosya eki bottom bar'ı** mobilde daha kompakt (56px yükseklik).

### ✨ Tam Ekran Mail Okuyucu — Zoom Desteği

- Tam ekran mail okuyucu açıldığında viewport meta tag güncellenerek zoom açılıyor:

  ```
  minimum-scale=0.25, maximum-scale=5, user-scalable=yes
  ```

- Tam ekran kapatıldığında zoom tekrar kilitleniyor (`user-scalable=no`).

### ✨ Mobil FAB (Floating Action Button) — Yeni İleti

- Mobil görünümde sağ altta mavi yuvarlak **"✉ Yeni İleti" butonu** eklendi.
- Tam ekran mail okuyucu açıkken FAB gizleniyor.
- Compose modal açıkken masaüstünde FAB gösterilmiyor.

---

## [v1.0.0] — 2026-02-12

### ✨ Temel Özellikler (İlk Sürüm)

- IMAP üzerinden e-posta listeleme (Gelen, Gönderilen, Taslak, Çöp, Arşiv)
- SMTP ile e-posta gönderme (port 587/465 otomatik deneme)
- Dosya eki indirme (onay dialogu ile)
- E-posta içindeki linkleri yeni sekmede açma (onay dialogu ile)
- Mobil uyumlu alt navigasyon çubuğu
- Spam olarak işaretleme / Arşivleme / Silme (çöp kutusuna taşıma)
- Gönderilen e-postayı IMAP SENT klasörüne kaydetme
- Cihaza özgü şifreli oturum token'ı (CryptoService)
- Docker + Nginx ile Ubuntu sunucu deployment

---

## Deploy Komutları

```bash
# Backend güncellendiyse:
cd /opt/softigo-mail && sudo git pull origin main
sudo docker-compose up -d --build backend

# Frontend güncellendiyse:
cd /opt/softigo-mail && sudo git pull origin main
sudo docker-compose up -d --build frontend

# Her ikisi güncellendiyse:
cd /opt/softigo-mail && sudo git pull origin main
sudo docker-compose up -d --build
```

## Proje Yapısı

```
email.softigo/
├── backend/
│   └── src/app.ts          ← Fastify API (IMAP + SMTP + multipart)
├── frontend/
│   └── src/app/
│       ├── dashboard/
│       │   └── page.tsx    ← Ana uygulama (mail listesi + compose + fullscreen)
│       └── page.tsx        ← Giriş sayfası
├── docker-compose.yml
├── UBUNTU_DEPLOYMENT_GUIDE.md
└── CHANGELOG.md            ← Bu dosya
```
