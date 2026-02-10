# Dino Adventure

Bu proje GitHub Pages ile paylaşım için hazırlanmıştır.

## Dosya Yapısı

```text
index.html
style.css
script.js
assets/
  bgm.mp3
  jump.wav.mp3
  win.wav.mp3
  hit.wav.mp3
  sprites/
    *.png
```

## GitHub Pages'e Sorunsuz Yükleme (Önerilen)

1. Yeni bir repo oluşturun.
2. Bu klasörün **tamamını** yükleyin (`index.html`, `style.css`, `script.js`, `assets/`).
3. Repo ayarlarından `Pages` bölümünde:
   - Source: `Deploy from a branch`
   - Branch: `main` (veya kullandığınız branch)
   - Folder: `/ (root)`
4. Birkaç dakika sonra Pages linkini açın.

## Sık Görülen Sorunlar

- Oyun açılıyor ama bazı sprite/sesler yok:
  - Genelde `assets` klasörü eksik veya dosya isimleri farklıdır.
  - GitHub Pages **case-sensitive** olduğu için dosya adı birebir aynı olmalıdır.
- Ses efekti var ama bgm yok:
  - Tarayıcı otomatik oynatmayı engelleyebilir.
  - Oyunda bir tuşa/butona bastıktan sonra bgm başlayacaktır.

## Bu Sürümde Ek Güvence

`script.js` içinde asset fallback sistemi var:

- Ses dosyaları için şu yollar sırayla denenir:
  - `assets/...`
  - `./` (kök)
- Sprite dosyaları için şu yollar sırayla denenir:
  - `assets/sprites/...`
  - `sprites/...`
  - `assets/...`
  - `./` (kök)

Böylece dosyalar yanlış klasöre yüklense bile oyun mümkün olduğunca ayağa kalkar.

Ek olarak asset self-test sayesinde eksik dosyalar konsolda net loglanır:

- `[asset-fallback] ...` (alternatif yola geçti)
- `[asset-missing] ...` (dosya bulunamadı)

## Lokal Çalıştırma

`index.html` dosyasını açmanız yeterli.

