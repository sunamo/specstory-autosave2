# 🔔 Konfigurace zobrazování notifikací

## 📋 Jak nastavit typ zobrazení notifikací

Ve VS Code přejdi do **Settings** (Ctrl+,) a vyhledej `specstoryautosave`:

### ⚙️ Nastavení: `Notification Display Type`

Máš na výběr ze **3 možností**:

## 📱 **Activity Bar** (výchozí - doporučeno)
```json
"specstoryautosave.notificationDisplayType": "activitybar"
```
- ✅ **Trvalá historie** - všechny notifikace zůstávají uložené
- ✅ **Dedikovaná sekce** - vlastní ikona v Activity Bar
- ✅ **Konfigurovatelný počet** - nastavitelné maximum promptů (1-50)
- ✅ **Timestampy** - každá notifikace má čas detekce
- ✅ **Neruší workflow** - není intruzivní

### Jak použít:
1. Po detekci AI aktivity se objeví notifikace v Activity Bar
2. Klikni na ikonu SpecStory AutoSave v levém panelu
3. Vidíš historii posledních AI aktivit s časovými razítky

---

## 🖥️ **Webview Panel**
```json
"specstoryautosave.notificationDisplayType": "panel"
```
- ✅ **Detailní zobrazení** - formátovaný obsah s tlačítky
- ✅ **Sdílená historie** - stejné data jako Activity Bar
- ✅ **Automatické zavření** - po 30 sekundách se zavře
- ⚠️ **Ruší workflow** - otevře se nový panel

### Jak použít:
1. Po detekci AI aktivity se otevře nový webview panel
2. Panel zobrazuje historii s timestampy a tlačítky
3. Můžeš kliknout na "Check Status", "Everything OK" nebo "Dismiss"

---

## 💬 **VS Code Popup Notifikace**
```json
"specstoryautosave.notificationDisplayType": "notification"
```
- ✅ **Rychlé** - okamžitá zpráva v pravém dolním rohu
- ✅ **Neintruzivní** - malé a nenápadné
- ⚠️ **Omezené formátování** - pouze jednořádkový text
- ❌ **Bez historie** - notifikace mizí po akci

### Jak použít:
1. Po detekci AI aktivity se objeví popup v pravém dolním rohu
2. Můžeš kliknout na "Check Status", "Everything OK" nebo "Dismiss"
3. Nebo počkat, až zmizí sám

---

## 🎯 **Doporučení**

### 🏆 **Activity Bar** (výchozí)
- **Nejlepší pro většinu uživatelů**
- Neruší práci a uchovává historii
- Snadný přístup kdykoli

### 🔧 **Panel** 
- **Dobré pro detailní sledování**
- Když chceš vidět ihned všechny detaily

### ⚡ **Popup**
- **Minimalistické řešení**
- Když chceš jen základní upozornění

---

## ⚙️ **Další související nastavení**

### 📊 **Maximální počet promptů v Activity Bar**
```json
"specstoryautosave.activityBarMaxPrompts": 10
```
Rozsah: 1-50 (výchozí: 10)

### 🔔 **Frekvence notifikací**
```json
"specstoryautosave.aiNotificationFrequency": 1
```
- `1` = každý prompt
- `2` = každý druhý prompt
- atd.

### 🧠 **Chytré notifikace**
```json
"specstoryautosave.enableSmartNotifications": true
```
- `true` = kontextové zprávy na základě SpecStory historie
- `false` = standardní zpráva

---

## 🔧 **Jak změnit nastavení**

### Přes VS Code UI:
1. **Ctrl+,** → otevře Settings
2. Vyhledej **"specstoryautosave"**
3. Najdi **"Notification Display Type"**
4. Vyber požadovanou možnost z dropdown menu

### Přes settings.json:
```json
{
  "specstoryautosave.notificationDisplayType": "activitybar",
  "specstoryautosave.activityBarMaxPrompts": 15,
  "specstoryautosave.aiNotificationFrequency": 1
}
```

## 🎉 **Výsledek**

Ať zvolíš jakýkoli typ zobrazení, vždy budeš informován o AI aktivitě a můžeš rychle ověřit kvalitu odpovědí!
