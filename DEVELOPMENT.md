# Development Instructions / Instrukce pro vývoj

## Version Management / Správa verzí

**DŮLEŽITÉ: Pri každé nové verzi:**
1. Aktualizuj číslo verze v `package.json`
2. Udělej git commit s číslem této verze
3. Udělej git push
4. Vytvoř novou .vsix verzi

### Příkazy pro release nové verze:
```bash
# 1. Aktualizace verze (např. z 0.0.3 na 0.0.4)
# Uprav package.json manually nebo použij:
npm version patch

# 2. Git commit s číslem verze
git add .
git commit -m "v0.0.4"

# 3. Git push
git push origin master

# 4. Vytvoř VSIX package
vsce package
```

## Development Workflow

1. Make changes to code
2. Test the extension
3. Update version in package.json
4. Commit with version number
5. Push to repository
6. Package new .vsix

## File Structure

- `src/extension.ts` - Main extension file
- `src/enterDetection.ts` - Enter key detection logic
- `src/i18n.ts` - Internationalization
- `package.json` - Extension manifest
- `README.md` - Documentation

## Testing

- Use F5 to launch Extension Development Host
- Test all detection methods
- Verify notifications work correctly
- Test configuration changes
