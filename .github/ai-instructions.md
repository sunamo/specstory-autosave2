# AI Assistant Instructions

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
