# Marka Patent Skill (Claude in Chrome)

TÜRKPATENT'te marka, patent ve endüstriyel tasarım araması yapan ve başvuru
detaylarını getiren bir Claude-in-Chrome skill'i. İstekler kullanıcının kendi
Chrome'unda `turkpatent.gov.tr` üzerinde çalışır; reCAPTCHA v3 token'ı **sayfa
içinde** üretilir, bu yüzden **harici bir CAPTCHA çözme servisine gerek yoktur**.

Bu skill, [markapatent-mcp](https://github.com/saidsurucu/markapatent-mcp)
sunucusunun capsolver bağımlılığını ortadan kaldıran tarayıcı tabanlı sürümüdür.

## Araçlar
- `searchTrademarks` / `getTrademarkDetails` — Marka arama ve detay
- `searchPatents` / `getPatentDetails` — Patent arama ve detay
- `searchDesigns` / `getDesignDetails` — Tasarım arama ve detay

Arama parametreleri ve sınıf (Nice/IPC/CPC/Locarno) notları için `reference.md`,
kullanım akışı için `SKILL.md` dosyasına bakın.

## Kurulum
Skill'i `~/.claude/skills/markapatent` altına kopyalayın. Claude in Chrome
uzantısının `turkpatent.gov.tr` için site izni verilmiş olmalıdır.

## Testler
```bash
cd tests && node --test
```

## Lisans
MIT
