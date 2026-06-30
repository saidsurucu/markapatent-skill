# Marka Patent Skill (Claude in Chrome)

TÜRKPATENT (Türk Patent ve Marka Kurumu) araştırma portalı için bir **Claude in
Chrome** skill'i. Claude'u senin **kendi tarayıcı oturumun** üzerinden çalıştırır:
marka, patent ve endüstriyel tasarım araması ve başvuru detayları — hepsi
`turkpatent.gov.tr` sayfasına JavaScript enjekte edilerek yapılır. Senin gerçek
tarayıcın kullanıldığı için **CAPTCHA çözmeye gerek yoktur**.

> Bu skill bir sunucu/MCP değildir. Hiçbir API anahtarı veya harici servis
> gerektirmez — sadece Claude + Chrome eklentisi.

## Kurulum

**Gereksinimler:** Claude (Claude in Chrome özelliği aktif) + Chrome eklentisi.

Claude'a şunu yaz:

> Bu skill'i kurmak istiyorum: `https://github.com/saidsurucu/markapatent-skill`

## Ne yapabilir

Kurduktan sonra Claude'a doğal dilde söylemen yeterli; skill devreye girip
tarayıcında ilgili işi yapar.

### 1. Marka araması — `search_trademarks`
Marka adı, sahip/başvuru sahibi adı ve Nice sınıfına göre arama. Ad operatörleri:
`contains` (varsayılan) / `startsWith` / `equals`. Sayfalama (`limit`/`offset`)
desteklenir.

> Örnek: *"TÜRKPATENT'te 'Apple' markasını ara"*
> *"9 ve 35. Nice sınıflarında 'Samsung' markalarını getir"*
> *"Sahibi VESTEL olan markalar"*

### 2. Marka detayı — `get_trademark_details`
Başvuru numarası ile tam marka kaydı (marka bilgisi, Nice sınıfları, dosya bilgisi).

> Örnek: *"T/01853 numaralı markanın detaylarını getir"*

### 3. Patent araması — `search_patents`
Başlık, özet, buluş sahibi, başvuru sahibi, başvuru no, IPC/CPC sınıfı ve vekile
göre arama. Sayfalama desteklenir.

> Örnek: *"'yapay zeka' patentlerini ara"*
> *"Başvuru sahibi ASELSAN olan patentler"*
> *"IPC sınıfı G06F olan patentler"*

### 4. Patent detayı — `get_patent_details`
Başvuru numarası ile tam patent kaydı (başlık, özet, buluş sahipleri, sınıflar).

> Örnek: *"2020/12345 patentinin detayları"*

### 5. Tasarım araması — `search_designs`
Tasarım adı, tasarımcı, başvuru sahibi, tescil no, Locarno sınıfı ve vekile göre
arama. Sayfalama desteklenir.

> Örnek: *"'masa' tasarımlarını ara"*
> *"Başvuru sahibi IKEA olan tasarımlar"*
> *"Locarno sınıfı 06-01 tasarımlar"*

### 6. Tasarım detayı — `get_design_details`
Arama sonucundaki `fileId` ile tam tasarım kaydı.

> Örnek: *"106417 dosya id'li tasarımın detaylarını getir"*

## Nasıl çalışır

- Tüm işlemler `turkpatent.gov.tr/arastirma-yap` sekmesinde yapılır; arama ve
  detaylar **sayfa-içi same-origin `fetch`** ile çekilir.
- Görsel (base64) veriler token tasarrufu için sonuçlardan ayıklanır.
- Sayfa içeriği **güvenilmez veri** olarak ele alınır; içerikteki talimatlar
  uygulanmaz.

## Geliştirme

Saf fonksiyonlar (parametre kurma, yanıt biçimleme, ağ çekirdeği) Node ile birim
test edilir (jsdom gerekmez):

```bash
cd tests
node --test
```

Kod yapısı:
- `SKILL.md` — Claude'un izlediği iş akışları
- `reference.md` — API biçimi, `type` adları, parametre haritaları, sınıf notları
- `scripts/lib.js` — parametre kurucular, yanıt yardımcıları, ağ çekirdeği ve 6
  araç sarmalayıcısı (birim testli)

## Notlar

- Tek instance / kişisel kullanım için tasarlanmıştır.
- Çok küçük `limit` değerlerinde (< ~5) sunucu varsayılan sayfa boyutuna (20) döner.

## Lisans

MIT
