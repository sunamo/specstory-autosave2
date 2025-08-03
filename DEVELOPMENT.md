# Development Instructions / Instrukce pro vývoj

## Version Management / Správa verzí

**DŮLEŽITÉ: Pri každé nové verzi:**
1. Aktualizuj číslo verze v `package.json`
2. Aktualizuj `CHANGELOG.md` s popisem změn
3. Spusť `.\install.ps1` - provede automaticky: git commit, git push, build, package a install

### Příkazy pro release nové verze:
```powershell
# 1. Aktualizace verze (např. z 1.0.8 na 1.0.9)
# Uprav package.json manually nebo použij:
pnpm version patch

# 2. Aktualizuj CHANGELOG.md
# Přidej novou sekci s verzí a změnami

# 3. Spusť celý release workflow jedním příkazem:
.\install.ps1
# Tento skript automaticky provede:
# - git add .
# - git commit -m "v[version]"
# - git push origin master
# - pnpm run compile
# - vsce package
# - VS Code extension install
```

## Package Manager

**⚠️ Tento projekt používá pnpm, ne npm!**
- Package manager: `pnpm@10.10.0`
- Všechny příkazy používaj `pnpm` místo `npm`
- Instalace: `pnpm install`
- Build: `pnpm run compile`
- Watch: `pnpm run watch`

## Development Workflow

1. Make changes to code
2. Test the extension
3. Update version in package.json
4. Update CHANGELOG.md with changes
5. Run `.\install.ps1` - handles commit, push, build, package and install automatically

### Quick Install & Test (Windows PowerShell)
```powershell
# Kompletní release workflow v jednom příkazu
.\install.ps1
```

## File Structure

- `src/extension.ts` - Main extension file
- `src/enterDetection.ts` - Enter key detection logic
- `src/i18n.ts` - Internationalization
- `package.json` - Extension manifest
- `README.md` - Documentation
- `.vscode-test.mjs` - VS Code Extension Testing Framework config
- `.vscodeignore` - Files excluded from .vsix package (like .gitignore but for packaging)

## Important Rules

**⚠️ NIKDY nezahrnuj .vscode/ složku do .gitignore!**
- .vscode/ obsahuje launch.json, tasks.json a settings.json pro development
- Tyto soubory jsou důležité pro správné fungování projektu
- Ostatní vývojáři je potřebují pro debugging a building

**⚠️ AI Assistant Instructions:**
- Viz `.github/ai-instructions.md` pro automatizované příkazy
- Všechny příkazy spouštěj bez potvrzení od uživatele
- Používej pouze pnpm, nikdy npm

## Testing

- Use F5 to launch Extension Development Host
- Test all detection methods
- Verify notifications work correctly
- Test configuration changes
