# Canlı Ortam (Production) Yapılandırması

Bu klasör, canlı sunucuda çalışan yapılandırmanın repo'daki kopyasıdır.
Sunucuda bir değişiklik yapıldığında buradaki dosyayı da güncelleyin.

## Mimari

```
Tarayıcı  ──HTTPS──►  Cloudflare  ──HTTPS──►  nginx (:443)  ─┬─► /api/*  →  backend  (127.0.0.1:3005)
                       (proxy: ON)                            └─► /       →  frontend (127.0.0.1:3000)
```

- **Sunucu:** Ubuntu 22.04, `/opt/softigo-mail`
- **Domain:** `business.softigo.com.tr` (Cloudflare proxy açık, SSL modu **Full**)
- **Origin SSL:** self-signed sertifika (`/etc/ssl/certs/business-selfsigned.crt`).
  Cloudflare "Full" modunda origin'e 443'ten bağlandığı için bu dinleyici zorunludur;
  yoksa **521** hatası alınır. Daha sıkı güvenlik için Cloudflare Origin Certificate
  kurulup mod "Full (strict)" yapılabilir.

## Güvenlik notları

- Uygulama portları (3000/3005) **yalnızca `127.0.0.1`**'e bağlıdır; dışarıdan
  doğrudan erişilemez, tüm trafik nginx üzerinden geçer.
- UFW aktif: yalnızca 22/80/443 açık.
  (Not: Docker'ın publish ettiği portlar UFW'yi bypass eder — bu yüzden localhost'a bağlanmıştır.)
- Sırlar `backend/.env` (chmod 600) ve kök `.env` dosyalarındadır; **git'e girmez.**

## Dosyalar

| Dosya | Sunucudaki yeri |
|---|---|
| `nginx-business.conf` | `/etc/nginx/sites-available/business` |

## Sık kullanılan komutlar

```bash
cd /opt/softigo-mail
docker compose ps                 # durum
docker compose logs -f            # canlı log
docker compose up -d --build      # güncelle ve yeniden başlat
nginx -t && systemctl reload nginx
```

## Gerekli ortam değişkenleri

`backend/.env` (örnek için `backend/.env.example`):

```
PORT=3005
IMAP_HOST=mail.softigo.com
IMAP_PORT=993
IMAP_SECURE=true
ENCRYPTION_KEY=<openssl rand -base64 48>
```

Kök dizindeki `.env`:

```
NEXT_PUBLIC_API_URL=https://business.softigo.com.tr
```

> `NEXT_PUBLIC_*` değişkenleri Next.js build sırasında gömülür — değiştirirseniz
> frontend'i **yeniden derlemeniz** gerekir (`docker compose up -d --build frontend`).
