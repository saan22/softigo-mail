# Ubuntu 22.04 Canlı Sunucu (Production) Kurulum Rehberi

Bu rehber, Softigo Mail projesini Ubuntu 22.04 tabanlı bir VDS sunucusuna en sağlıklı (Docker kullanarak) nasıl kuracağınızı adım adım anlatır.

## 1. Hazırlık (Sunucu Kurulumu)

Sunucunuza SSH ile bağlandıktan sonra sistem güncellemelerini yapın ve gerekli araçları kurun:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install git curl -y
```

## 2. Docker Kurulumu

Projenin bağımlılıklardan etkilenmeden, izole bir şekilde çalışması için Docker kullanacağız:

```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu
sudo apt install docker-compose -y
```

## 3. Projenin Sunucuya Alınması

```bash
cd /opt
sudo git clone <depo_adresiniz> softigo-mail
cd softigo-mail
```

## 4. Yapılandırma (Environment Variables)

`docker-compose.yml` dosyasını sunucunuza göre düzenleyin:

```bash
nano docker-compose.yml
```

- `ENCRYPTION_KEY`: 32 karakterlik rastgele bir anahtar belirleyin.
- `NEXT_PUBLIC_API_URL`: Backend API'nize erişilecek adresi yazın (Örn: `https://api.domaininiz.com`).

## 5. Projeyi Başlatma

```bash
# Image'ları oluştur ve arka planda çalıştır
sudo docker-compose up -d --build
```

## 6. Nginx ve SSL (Tavsiye Edilen)

Sunucunuzda **Nginx Proxy Manager** (Daha modüler ve görsel yönetim için) kurmanızı öneririm. Alternatif olarak klasik Nginx ile:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### Örnek Nginx Config (`/etc/nginx/sites-available/webmail`):

```nginx
server {
    listen 80;
    server_name webmail.domaininiz.com;

    location / {
        proxy_pass http://localhost:3000; # Frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3005; # Backend API
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 7. İzleme ve Yönetim

- **Logları izleme:** `sudo docker-compose logs -f`
- **Konteyner durumları:** `sudo docker ps`
- **Durdurma:** `sudo docker-compose down`

---
**Not:** Güvenlik için Ubuntu Güvenlik Duvarı'nı (UFW) yapılandırmayı unutmayın:
```bash
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```
