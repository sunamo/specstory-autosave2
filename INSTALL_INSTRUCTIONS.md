# 🛠️ Instrukce pro práci s SpecStory AutoSave extension

## ⚠️ DŮLEŽITÉ - Vždy používej install.ps1!

**NIKDY nepoužívej manuální příkazy pro build a instalaci!**

### ✅ **Správný způsob instalace:**
```powershell
.\install.ps1
```

### ❌ **Nepoužívej tyto příkazy přímo:**
```bash
# ŠPATNĚ - nepoužívej!
npm run compile
npx @vscode/vsce package  
code --install-extension specstory-autosave-x.x.x.vsix
```

## 🔧 Co install.ps1 dělá automaticky:

1. **🧹 Vyčistí staré VSIX soubory**
2. **🏗️ Zkompiluje TypeScript (pnpm run compile)**
3. **📦 Commitne změny do Git a pushne na GitHub**
4. **📋 Vytvoří VSIX balíček (vsce package)**
5. **🗑️ Vyčistí staré extension z VS Code**
6. **⚡ Nainstaluje novou verzi**
7. **📝 Zobrazí instrukce pro testování**

## 🎯 Po instalaci:

1. **Restartuj VS Code** (nebo VS Code Insiders)
2. **Otevři Extension** - najdi "SpecStory AutoSave" v extensions
3. **Testuj funkcionalitu:**
   - `Ctrl+Shift+A` - force AI notification
   - Nebo použij Copilot Chat a pozoruj Activity Bar
4. **Konfigurace** - `Ctrl+,` → "specstoryautosave"

## 📊 Kontrola stavu:

- **Status Bar** - zobrazuje `AI: [počet]`
- **Activity Bar** - ikona SpecStory AutoSave vlevo
- **Settings** - sekce "SpecStoryAutoSave" 
- **Commands** - `Ctrl+Shift+P` → "SpecStoryAutoSave"

## 🚀 Workflow:

1. **Úprava kódu** → změň co potřebuješ
2. **Instalace** → `.\install.ps1`
3. **Restart VS Code** → aby se projevily změny
4. **Test** → `Ctrl+Shift+A` nebo použij Copilot
5. **Repeat** → opakuj podle potřeby

## 🔍 Debug:

- **Debug Channel** - "SpecStoryAutoSave Debug" v Output panelu
- **Force trigger** - `Ctrl+Shift+A`
- **Settings check** - ověř konfiguraci v Settings

---

**🎉 Tímto způsobem máš vždy aktuální a funkční extension!**
