# Changelog

## [1.1.13] - 2025-08-03
### Changed
- **Complete English localization** - all .md and .instructions.md files now fully in English
- **DEVELOPMENT.md translated** - all Czech text converted to English
- **README.md translated** - improved English version with clear explanations
- **CHANGELOG.md finalized** - all remaining Czech text translated to English

### Added
- **AI instructions fully English** - complete rewrite of ai.instructions.md in English
- **Consistent documentation language** - all documentation now in English only
- **Improved readability** - better English translations for technical terms

### Technical
- All user-facing and developer-facing documentation now in English
- Consistent terminology across all documentation files
- Maintained technical accuracy in translations

# Changelog

## [1.1.16] - 2025-08-03
### Fixed
- **SpecStory integration debug** - investigated issue with not displaying last 3 prompts from SpecStory file
- **Path detection** - extension looks for SpecStory files in workspace but user has them in different location
- **Czech language support** - confirmed that SpecStory content can contain Czech text (only code/docs must be English)

### Investigation
- **Found issue**: extension searches for `.specstory/history` in workspace folders only
- **User's files location**: `C:\Proj_Net\portal-ui\.specstory\history\2025-08-03_07-59Z-user-greeting-and-request-for-assistance.md`
- **Solution**: need to configure `specstoryautosave.specstoryHistoryPath` setting to point to correct path

### Configuration
- **Setting available**: `specstoryautosave.specstoryHistoryPath` can be set to custom path
- **Debug logging**: extension logs SpecStory detection attempts to debug channel

## [1.1.15] - 2025-08-03
### Fixed
- **File naming compliance** - fixed incorrect editing of `ai-instructions.md` instead of `ai.instructions.md`
- **Naming convention enforcement** - removed incorrectly named files with wrong format
- **Content migration** - moved content from corrupted `ai-instructions.md` to proper `ai.instructions.md`

### Changed
- **Proper file structure** - now only correctly named `*.instructions.md` files exist
- **File repair applied** - repaired corrupted content instead of deleting files
- **Consistent naming** - all instruction files now follow `*.instructions.md` format

### Removed
- **Incorrect files** - deleted `ai-instructions.md` and `development-instructions.md` (wrong naming)
- **Empty duplicates** - cleaned up empty incorrectly named instruction files

## [1.1.14] - 2025-08-03
### Changed
- **Complete English translation** - all documentation files now in English only
- **AI instructions fully translated** - fixed corrupted header and mixed language content
- **File repair policy** - added rule to never delete corrupted files, always repair them
- **Language enforcement** - only cs.json allowed to contain non-English text

### Added
- **Critical language policy** - all output must be in English except localization files
- **File repair rules** - think carefully and repair instead of delete
- **Comprehensive translation** of DEVELOPMENT.md, README.md, CHANGELOG.md, ai.instructions.md

### Fixed
- **Corrupted ai.instructions.md** - repaired header and emoji display issues
- **Mixed language content** - all Czech text translated to English
- **File naming consistency** - maintained *.instructions.md format

## [1.1.13] - 2025-08-03
### Changed
- **File naming convention** - renamed `ai-instructions.md` to `ai.instructions.md`
- **Updated naming rules** - all instruction files must use `*.instructions.md` format
- **Fixed references** - updated all file references to new naming convention

### Added
- **Critical naming rules** in AI instructions
- **Proper file format**: `ai.instructions.md`, `development.instructions.md`, etc.
- **Updated documentation** with correct file references

### Technical
- Moved `.github/ai-instructions.md` → `.github/ai.instructions.md`
- Updated DEVELOPMENT.md and CHANGELOG.md references
- Enforced consistent naming convention across all instruction files

## [1.1.11] - 2025-08-03
### Changed
- **Full English localization** - all user-facing texts now use i18n/en.json
- **CHANGELOG.md in English** - all documentation now in English only
- **Smart notifications localized** - context-aware messages now properly localized

### Added
- **Localization rules** - added critical rules to AI instructions
- **New i18n keys** for smart notifications (smartDebug, smartUI, smartDatabase, etc.)
- **Proper i18n integration** for all notification messages

### Technical
- All hardcoded texts moved to i18n system
- Fallback handling for i18n failures
- Updated context analysis to return type for proper i18n key selection

## [1.1.10] - 2025-08-03
### Fixed
- **Single notification** - removed Information message fallback to prevent duplicate notifications
- **Smart messages** - fixed loading of empty custom messages (`""`)
- **Last 3 prompts** - now displays 3 most recent user prompts in notification

### Enhanced
- **Context analysis** - improved recognition of work type (debugging, UI, database, API, performance)
- **Notification format**:
  ```
  AI just responded! Check [work type]:
  
  📝 Recent prompts:
  1. [first prompt...]
  2. [second prompt...]  
  3. [third prompt...]
  
  ✅ Check:
  • [specific checks based on context]
  ```

### Technical
- Reads up to 3 latest SpecStory conversations
- Extracts user prompts from SpecStory markdown format
- Generates contextual check points based on work type

## [1.1.9] - 2025-08-03
### Added
- **🤖 Smart notifications** - analyzes SpecStory conversations for contextual messages
- **📁 SpecStory integration** - reads `.specstory/history/` folders for context
- **⚙️ New settings**:
  - `enableSmartNotifications` - enable/disable smart messages
  - `specstoryHistoryPath` - custom path to SpecStory history

### Features
- **Contextual messages** based on AI work type:
  - Debugging: "AI just debugged! Check root cause..."
  - UI/HTML/CSS: "AI worked on UI! Check responsive design..."
  - Database: "AI modified database! Check data integrity..."
  - API: "AI created API! Check error handling..."
  - Performance: "AI optimized! Check actual speedup..."
  - Security: "AI worked on security! Check encryption..."

### Technical
- Auto-detection of `.specstory/history/` in workspace
- Fallback to default message on errors
- Respects user custom messages

## [1.1.8] - 2025-08-03
### Analysis
- Analyzován správný formát SpecStory exportů z `C:\Proj_Net\portal-ui\.specstory\history\`
- Zdokumentována struktura: `YYYY-MM-DD_HH-mmZ-popis.md`
- Poznámky pro budoucí implementaci přesného formátu exportů

### Technical Notes
- Header: `<!-- Generated by SpecStory -->`
- Format: `_**User**_` / `_**Assistant**_` s `---` separátory
- Timestamp: UTC s 'Z' sufixem
- Encoding: podpora českých znaků

## [1.1.7] - 2025-08-03
### Fixed
- Keyboard Activity Detection se nyní nikdy neaktivuje automaticky
- Executes only when explicitly enabled in settings
- Fixed unwanted execution even when `KeyboardActivity=false`

### Updated
- Updated AI instructions: NEVER run `pnpm run compile` separately
- Workflow: increment version → `.\install.ps1` → if fails: decrease version, fix, increment again

## [1.1.6] - 2025-08-03
### Fixed
- **Keyboard Activity Detection** now activates only when explicitly enabled in settings
- **Terminal and File System Detection** also activate only when explicitly enabled
- **Aggressive detection level** no longer activates experimental methods automatically
- Reduced debug log amount - logs won't update during normal typing

### Changed
- Experimental detection methods (Terminal, FileSystem, KeyboardActivity) are now available only on explicit request
- Aggressive level uses only: CommandHook + Webview + PanelFocus + Pattern + CodeInsertion + Memory

## [1.1.5] - 2025-08-03Log

All notable changes to the "specstory-autosave" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

# Changelog

## [1.1.4] - 2025-08-03
### Added
- **3 new detection methods**: Terminal Detection, File System Detection, Keyboard Activity Detection
- **Total 9 detection methods** - all conditionally available through settings
- Terminal Detection: monitors terminal opening/closing
- File System Detection: detects rapid file changes (3+ changes per second)
- Keyboard Activity Detection: detects rapid typing (100+ characters in 500ms)

### Fixed
- Fixed notification functionality - removed blocking condition from handleAIActivity()
- Notifications now display correctly again after AI activity detection

### Technical
- Aggressive detection level now supports all 9 methods
- By default only CommandHook and Webview Detection are active (recommended)
- Other methods can be enabled individually in settings

## [1.1.3] - 2025-08-03

### Added
- Strict version management rules: only patch increments by default
- MINOR version increments only for marketplace releases
- Clear versioning guidelines in AI instructions

### Changed
- Updated AI instructions with critical version management rules
- Patch-only incremental versioning (1.1.2 → 1.1.3 → 1.1.4...)
- MINOR version (1.1.x → 1.2.0) only on "marketplace compilation" command

## [1.1.2] - 2025-08-03

### Added
- Enhanced notification system with fallback (Information message if Warning fails)
- Better debug logging for notification troubleshooting
- Automatic install.ps1 execution at end of each prompt for continuous deployment

### Changed
- Improved timing for AI detection (minimum 5 seconds between notifications)
- Updated AI instructions: build on end of prompt, not after each line
- Added fallback notification method to ensure notifications are visible

### Fixed
- Enhanced notification reliability in Extension Development Host
- Better error handling for notification promises

## [1.1.1] - 2025-08-03

### Fixed
- **CRITICAL:** Fixed release workflow - build is now executed BEFORE git commit
- Ensures all committed versions are buildable (build → commit → push → package)
- Updated install.ps1 to prevent committing broken code

### Changed
- Git commit now happens only after successful build
- Updated AI instructions and development workflow documentation
- Improved error handling in release process

## [1.1.0] - 2025-08-03

### Changed
- Implemented strict development rules: NO backup files (extension_backup.ts, extension_clean.ts)
- Added mandatory build after every code change
- Enhanced AI instructions with critical development rules

### Removed
- Deleted extension_backup.ts and extension_clean.ts files
- Eliminated all temporary/backup TypeScript files

### Added
- Comprehensive AI development rules in .github/ai.instructions.md
- Automatic build verification after code changes
- Strict git commit workflow for version releases

## [1.0.9] - 2025-08-03

### Changed
- Fixed .gitignore - removed .vscode/ folder from ignored files (important for development workflow)
- Added comprehensive documentation about .vscode-test.mjs and .vscodeignore files
- Updated DEVELOPMENT.md with important rule: never ignore .vscode/ folder

### Added
- Clear explanation of VS Code extension testing and packaging files
- Development rules and best practices in DEVELOPMENT.md

## [1.0.8] - 2025-08-03

### Changed
- Repository cleanup - removed old .vsix files and unnecessary files
- Added comprehensive .gitignore for VS Code extension development
- Updated development workflow for Windows PowerShell only
- Moved version history from README.md to CHANGELOG.md

### Added
- DEVELOPMENT.md with detailed development instructions
- Git commit and push workflow for version releases

## [1.0.2] - Marketplace Ready

### Changed
- Aggressive detection level as default
- Publisher updated for marketplace publication
- Removed external dependencies for standalone operation
- Enhanced documentation and user experience

## [1.0.1] - Enter Key Detection

### Added
- Advanced Enter key detection in Copilot Chat
- Multiple fallback detection methods
- Comprehensive configuration options

## [1.0.0] - Initial Release

### Added
- Basic AI prompt detection
- Automatic chat export integration
- Customizable notification system

## [Unreleased]

- Future improvements and features will be listed here