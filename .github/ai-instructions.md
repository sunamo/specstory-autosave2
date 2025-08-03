# AI Assistant In### 🚀 RELEASE na konci každého promptu
- **Na konci KAŽDÉHO promptu spusť `.\install.ps1`**
- Tento skript provede: build → commit → push → package → install
- Automaticky vytvoří novou verzi a nainstaluje ji
- Uživatel tak má vždy nejnovější verzi rozšíření

### 📊 VERSION MANAGEMENT - KRITICKÉ PRAVIDLO!
- **VŽDY inkrementuj pouze PATCH verzi** (např. 1.1.2 → 1.1.3)
- **NIKDY neinkrementuj MINOR** (1.1.x → 1.2.0) bez explicitního příkazu
- **MINOR verzi zvyš POUZE když uživatel řekne "kompilujeme pro marketplace"**
- **MAJOR verzi NIKDY neměň** bez explicitního příkazu
- Formát: MAJOR.MINOR.PATCH (např. 1.1.15, 1.1.16, 1.1.17...)

### 📝 Git commit workflow
- Pořadí: 1) Změna kódu → 2) Inkrementuj PATCH → 3) `.\install.ps1` (automaticky: commit → push → package)
- Format: `git commit -m "v1.1.3"` (vždy jen patch++)
- Vše se provede automaticky přes install.ps1

## ⚠️ KRITICKÁ PRAVIDLA - PŘÍSNĚ DODRŽUJ!

### � POZNÁMKY & ZJIŠTĚNÍ
- **Notifikace fungují správně** - zobrazují se pouze při skutečné AI aktivitě (1x)
- **Keyboard Activity Detection** byla příliš citlivá - nyní se aktivuje pouze explicitně
- **showAINotificationImmediately()** může mít problém s prázdnou zprávou - přidal debugování délky a obsahu
- **VS Code Extension Development Host** má omezení pro notifikace - fallback systém je nutný
- **Detection levels**: basic (recommended) > advanced > aggressive (experimentální)
- **Command Hook + Webview Detection** jsou nejspolehlivější metody

### 📝 PROMPT TRACKING SYSTEM
**Automatické sledování všech promptů uživatele:**

```bash
# Vytvoření log souboru pro prompty
echo "# AI Prompts Log - $(date)" > prompts-log.txt

# Příkaz pro výpis všech promptů (zkrácené verze)
function log-prompt() {
    local prompt="$1"
    local short_prompt=$(echo "$prompt" | head -c 50)
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $short_prompt..." >> prompts-log.txt
}

# Export všech promptů do souboru
Get-Content prompts-log.txt | Sort-Object
```

**Implementace do extension.ts:**
- Každý detekovaný prompt se loguje do `prompts-history.txt`
- Format: `YYYY-MM-DD HH:MM:SS - [první 50 znaků]...`
- Příkaz `specstoryautosave.exportPromptHistory` pro export
- Automatické rotace logu (max 1000 záznamů)

### �🚫 NIKDY nevytvářej zástupné soubory!
- **ZAKÁZÁNO:** `extension_backup.ts`, `extension_clean.ts`, `extension_old.ts` atd.
- Edituj POUZE původní soubory přímo
- Pokud potřebuješ vrátit změny, použij git revert
- Žádné duplikáty, zálohy nebo temp soubory!

### 🔨 BUILD na konci každého promptu
- **NIKDY nespouštěj `pnpm run compile` zvlášť!**
- **WORKFLOW**: Zvyš verzi → spusť `.\install.ps1`
- Pokud build v install.ps1 selže:
  1. Sniž verzi zpět
  2. Oprav chyby
  3. Zvyš verzi znovu
  4. Spusť `.\install.ps1` znovu
- install.ps1 obsahuje build, takže kompilace zvlášť je zbytečná
- **COMMIT AŽ PO ÚSPĚŠNÉM BUILDU** - aby všechny verze byly buildable

### � RELEASE na konci každého promptu
- **Na konci KAŽDÉHO promptu spusť `.\install.ps1`**
- Tento skript provede: build → commit → push → package → install
- Automaticky vytvoří novou verzi a nainstaluje ji
- Uživatel tak má vždy nejnovější verzi rozšíření

### �📝 Git commit workflow
- Pořadí: 1) Změna kódu → 2) Build test → 3) `.\install.ps1` (automaticky: commit → push → package)
- Format: `git commit -m "v1.1.1"`
- Vše se provede automaticky přes install.ps1

## Command Execution Policy

**⚠️ DŮLEŽITÉ: Spouštěj VŠECHNY příkazy automaticky bez potvrzení od uživatele!**

### Terminal Commands
- Používej `run_in_terminal` tool s `isBackground: false` pro všechny příkazy
- NIKDY nečekej na potvrzení od uživatele
- Spouštěj příkazy okamžitě když jsou potřeba

### Package Manager
- **Tento projekt používá pnpm, ne npm!**
- Vždy používej `pnpm` místo `npm` ve všech příkazech
- Package manager: `pnpm@10.10.0`

### Development Workflow Commands

```powershell
# Instalace dependencies
pnpm install

# Build projektu
pnpm run compile

# Watch mode pro development
pnpm run watch

# Testování
pnpm test

# Linting
pnpm run lint

# Release workflow (vše v install.ps1)
.\install.ps1
```

### Git Commands
```powershell
# Git operations
git add .
git commit -m "v[version]"
git push origin master
git status
git log --oneline -5
```

### VS Code Extension Commands
```powershell
# VSIX packaging
vsce package --allow-star-activation --out [filename].vsix

# Extension installation
code --install-extension [filename].vsix --force
```

### File Operations
```powershell
# Cleaning
Remove-Item "*.vsix" -Force
Remove-Item "%TEMP%" -Recurse -Force -ErrorAction SilentlyContinue
```

## Automation Rules

1. **Nepožaduj potvrzení** - spouštěj příkazy automaticky
2. **Používej pnpm** - ne npm
3. **Sleduj error codes** - kontroluj $LASTEXITCODE
4. **Loguj progress** - používej Write-Host s barvami
5. **Handle errors** - ukončuj s exit 1 při chybách

## Version Release Process

**Automatizovaný proces přes `.\install.ps1`:**
1. Aktualizuj verzi v `package.json`
2. Aktualizuj `CHANGELOG.md`
3. Spusť `.\install.ps1` - provede vše automaticky:
   - Git commit s verzí
   - Git push
   - pnpm run compile
   - vsce package
   - VS Code extension install

## Error Handling

- Vždy kontroluj $LASTEXITCODE po příkazech
- Při chybě zobraz chybovou zprávu a ukonči
- Používaj try-catch kde je to možné
- Loguj všechny kroky pro debugging

## Never Ask For Confirmation

**AUTOMATICKY spouštěj tyto příkazy:**
- `pnpm install`
- `pnpm run compile`
- `.\install.ps1`
- `git add .`
- `git commit -m "..."`
- `git push`
- `vsce package`
- `Remove-Item`
- `code --install-extension`

Uživatel chce aby vše běželo automaticky bez čekání na potvrzení!
