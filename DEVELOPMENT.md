# Development Instructions

## Version Management

**IMPORTANT: For each new version:**
1. Update version number in `package.json`
2. Update `CHANGELOG.md` with description of changes
3. Run `.\install.ps1` - automatically performs: build, git commit (only on successful build), git push, package and install

### Commands for new version release:
```powershell
# 1. Version update (e.g. from 1.0.8 to 1.0.9)
# Edit package.json manually or use:
pnpm version patch

# 2. Update CHANGELOG.md
# Add new section with version and changes

# 3. Run complete release workflow with one command:
.\install.ps1
# This script automatically performs:
# - Clean old .vsix files
# - pnpm run compile (BUILD FIRST!)
# - git add .
# - git commit -m "v[version]" (only on successful build)
# - git push origin master
# - vsce package
# - VS Code extension install
```

## Package Manager

**⚠️ This project uses pnpm, not npm!**
- Package manager: `pnpm@10.10.0`
- Use `pnpm` instead of `npm` for all commands
- Install: `pnpm install`
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
# Complete release workflow in one command
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

**⚠️ NEVER include .vscode/ folder in .gitignore!**
- .vscode/ contains launch.json, tasks.json and settings.json for development
- These files are important for proper project functionality
- Other developers need them for debugging and building

**⚠️ AI Assistant Instructions:**
- See `.github/ai.instructions.md` for automated commands
- Run all commands without user confirmation
- Use only pnpm, never npm

## Testing

- Use F5 to launch Extension Development Host
- Test all detection methods
- Verify notifications work correctly
- Test configuration changes
