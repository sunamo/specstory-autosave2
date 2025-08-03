# SpecStory AutoSave - Modulární struktura

Rozdělen do logických celků pro lepší údržbu a rozšiřitelnost.

## 📁 Struktura souborů

### 🏗️ Hlavní soubory
- **`extension.ts`** - Hlavní aktivační logika a orchestrace komponent
- **`activityProvider.ts`** - WebView provider pro Activity Bar

### 🔍 Detection (detekce AI aktivity)
- **`detection/basicDetection.ts`** - Základní detekce (command hooks, webview monitoring)
- **`detection/advancedDetection.ts`** - Pokročilá detekce (pattern detection, enhanced webview)
- **`detection/aggressiveDetection.ts`** - Agresivní detekce (memory, filesystem)

### 📊 SpecStory integrace
- **`specstory/historyReader.ts`** - Čtení SpecStory konverzací z historie
- **`specstory/messageGenerator.ts`** - Generování kontextových zpráv na základě historie

### 🔔 Notifikace
- **`notifications/notificationManager.ts`** - Správa a zobrazování notifikací (popup, panel, activity bar)

### 🛠️ Utility
- **`utils/aiActivityHandler.ts`** - Hlavní handler pro AI aktivitu a status bar
- **`i18n.ts`** - Lokalizační systém (existující)
- **`enterDetection.ts`** - Enter key detekce (existující)

## 🔄 Tok dat

```
AI aktivita detekována
        ↓
handleAIActivity() (utils/aiActivityHandler.ts)
        ↓
generateSmartNotificationMessage() (utils/aiActivityHandler.ts)
        ↓  ← čte z historie
SpecStory integrace (specstory/)
        ↓
showAINotificationImmediately() (notifications/notificationManager.ts)
        ↓
AIActivityProvider pro zobrazení (activityProvider.ts)
```

## 🎯 Výhody modulární struktury

### ✅ **Lepší údržba**
- Každý modul má jasně definovanou odpovědnost
- Snadnější debugging a testování
- Izolované změny bez dopadu na jiné části

### ✅ **Rozšiřitelnost**
- Snadné přidání nových typů detekce
- Nové způsoby notifikací
- Rozšíření SpecStory integrace

### ✅ **Čitelnost**
- Logické seskupení souvisejících funkcí
- Jasné importy a exporty
- Dokumentované rozhraní

### ✅ **Testovatelnost**
- Jednotlivé moduly lze testovat nezávisle
- Mockování závislostí
- Izolované unit testy

## 📋 Konfigurace modulů

### Detection systém
```typescript
// Základní detekce
enableCommandHookDetection: boolean
enableWebviewDetection: boolean
enablePanelFocusDetection: boolean

// Pokročilá detekce
+ pattern detection v dokumentech
+ enhanced webview monitoring

// Agresivní detekce
enableCodeInsertionDetection: boolean
enableMemoryDetection: boolean
enableTerminalDetection: boolean
enableFileSystemDetection: boolean
enableFileSystemDetection: boolean
```

### Notification systém
```typescript
notificationDisplayType: "notification" | "panel" | "activitybar"
activityBarMaxPrompts: number (1-50)
enableSmartNotifications: boolean
```

## 🔧 Rozšíření modulů

### Přidání nové detekce
1. Vytvořit nový soubor v `detection/`
2. Implementovat detekční logiku
3. Exportovat inicializační funkci
4. Importovat a zavolat v `extension.ts`

### Přidání nového typu notifikace  
1. Rozšířit `notificationManager.ts`
2. Přidat novou konfiguraci do `package.json`
3. Implementovat zobrazovací logiku

### Rozšíření SpecStory integrace
1. Přidat nové funkce do `historyReader.ts` nebo `messageGenerator.ts`
2. Rozšířit analýzu kontextu
3. Přidat nové typy zpráv

## 📊 Metriky komplexity

| Modul | Řádky | Odpovědnost | Složitost |
|-------|-------|-------------|-----------|
| extension.ts | ~300 | Orchestrace | Střední |
| activityProvider.ts | ~200 | UI komponenta | Nízká |
| basicDetection.ts | ~150 | Základní detekce | Nízká |
| advancedDetection.ts | ~100 | Pokročilá detekce | Střední |
| aggressiveDetection.ts | ~200 | Agresivní detekce | Vysoká |
| historyReader.ts | ~150 | I/O operace | Střední |
| messageGenerator.ts | ~200 | Analýza kontextu | Střední |
| notificationManager.ts | ~150 | UI management | Střední |
| aiActivityHandler.ts | ~100 | Business logic | Nízká |

**Celkem: ~1650 řádků** (původně ~1507 řádků v jednom souboru)

## 🎉 Výsledek

Kód je nyní:
- ✅ **Modulární** - logicky rozdělený
- ✅ **Udržovatelný** - snadné změny
- ✅ **Testovatelný** - izolované komponenty  
- ✅ **Rozšiřitelný** - snadné přidání funkcí
- ✅ **Čitelný** - jasná struktura a odpovědnosti
