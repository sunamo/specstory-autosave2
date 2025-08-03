# SpecStory AutoSave with AI Copilot Detection

🤖 **Intelligent VS Code extension that automatically saves GitHub Copilot Chat conversations and provides instant AI quality verification notifications.**

## 🎯 Proč potřebujete toto rozšíření?

**Stalo se vám že po AI chcete výsledek ale stále se jí nedaří splnit úkol?** Chcete mít přehled o tom jaká je historie vašich dotazů a jestli náhodou nezkoušíte na sílu něco co ani nepůjde? **Moje rozšíření vám pomůže zbytečně neztrácet čas.**

### 🔍 Hlavní problémy které řeší:
- ❌ **Ztracené prompty**: Nevíte co jste už zkoušeli
- ❌ **Opakování chyb**: Ptáte se na stejné věci různě
- ❌ **Časové ztráty**: Dlouhé neúspěšné konverzace s AI
- ❌ **Chybějící přehled**: Nemáte historii svých dotazů

## ✨ Key Features

### 🎯 AI Prompt Detection
- **Instant Detection**: Automatically detects when you send prompts to GitHub Copilot Chat
- **Enter Key Monitoring**: Advanced detection via Enter key press monitoring in chat panels
- **Multiple Detection Methods**: Command hooks, webview monitoring, and text change detection
- **Configurable Sensitivity**: 4 detection levels from "off" to "aggressive"

### 📋 Quality Verification Notifications
When AI activity is detected, you get an instant notification asking you to verify:
- ✅ Did AI understand your question correctly?
- 🔍 If working with HTML, inspect for invisible elements
- 📊 Verify the response quality and accuracy

### 💾 Automatic Chat Export
- **Background Saving**: Automatically exports chat history at configurable intervals
- **SpecStory Integration**: Works seamlessly with SpecStory extension for documentation
- **Custom Export Timing**: Set intervals from 1-60 minutes

### 🛠️ Advanced Configuration
- **Detection Level Control**: Choose from off/basic/advanced/aggressive modes
- **Individual Method Toggle**: Enable/disable specific detection methods
- **Custom Notification Messages**: Personalize the verification prompts
- **Frequency Control**: Set how often notifications appear (every prompt or every Nth prompt)

## 🚀 Quick Start

1. **Install the extension** from VS Code Marketplace
2. **Enable GitHub Copilot Chat** if not already active
3. **Start chatting** - the extension automatically detects your prompts
4. **Verify AI responses** when notifications appear
5. **Enjoy automatic chat export** to your documentation workflow

## ⚙️ Configuration

### Detection Levels
- **Off**: No AI detection (notifications disabled)
- **Basic**: Command hooks only (recommended for most users)
- **Advanced**: Adds panel focus and content pattern detection
- **Aggressive**: Full detection including code insertion and memory monitoring (default)

### Individual Detection Methods
- ✅ **Command Hook Detection**: Intercepts VS Code commands (recommended)
- ✅ **Webview Detection**: Monitors Copilot Chat panel activity (recommended)
- ⚪ **Panel Focus Detection**: Tracks chat panel focus changes
- ⚪ **Pattern Detection**: Scans document content for AI patterns
- ⚪ **Code Insertion Detection**: Detects large code insertions
- ⚪ **Memory Detection**: Experimental memory usage spike detection

## 🎮 Manual Controls

### Keyboard Shortcuts
- **Ctrl+Shift+A**: Force trigger AI notification (for testing)

### Commands
- **SpecStoryAutoSave: Export Chat History Now**: Manual export trigger
- **SpecStoryAutoSave: Force AI Notification**: Test notification system
- **SpecStoryAutoSave: Show AI Prompt Statistics**: View detection stats
- **SpecStoryAutoSave: Toggle AI Notifications**: Enable/disable notifications
- **SpecStoryAutoSave: Clear Output Logs**: Clean debug output

## 📊 Status Bar Integration

The extension shows real-time status in VS Code's status bar:
- `$(robot) AI: 5 [v1.0.2-AGGRESSIVE]` - Shows prompt count and detection level
- `$(robot) AI: 5 (DETECTED!)` - Briefly shows when new activity is detected

## 🔧 Troubleshooting

### Extension Not Detecting?
1. Check detection level is not set to "off"
2. Enable "Command Hook Detection" and "Webview Detection"
3. Check "SpecStoryAutoSave Debug" output channel for logs
4. Try manual trigger with Ctrl+Shift+A

### No Notifications Appearing?
1. Verify "Enable AI Check Notifications" is turned on
2. Check notification frequency setting
3. Ensure you're actively using GitHub Copilot Chat
4. Look for notifications in VS Code's notification area

### Chat Export Not Working?
1. Install the SpecStory extension for full export functionality
2. Check auto-save interval settings
3. Verify workspace permissions for file creation

## 🤝 Contributing

This extension is designed to enhance your AI-assisted development workflow. If you encounter issues or have suggestions:

1. Check the "SpecStoryAutoSave Debug" output channel for detailed logs
2. Use built-in test commands to verify functionality
3. Report issues with specific reproduction steps

## 📝 Requirements

- **VS Code**: Version 1.102.0 or higher
- **GitHub Copilot**: Active subscription and Chat extension
- **SpecStory Extension**: Optional, for full export functionality

## 🏷️ Version History

### v1.0.2 - Marketplace Ready
- ✅ Aggressive detection level as default
- ✅ Publisher updated for marketplace publication
- ✅ Removed external dependencies for standalone operation
- ✅ Enhanced documentation and user experience

### v1.0.1 - Enter Key Detection
- ✅ Advanced Enter key detection in Copilot Chat
- ✅ Multiple fallback detection methods
- ✅ Comprehensive configuration options

### v1.0.0 - Initial Release
- ✅ Basic AI prompt detection
- ✅ Automatic chat export integration
- ✅ Customizable notification system

---

## 👨‍💻 Development

Pro vývojáře: Při každé nové verzi nezapomeň:
1. Aktualizovat číslo verze v `package.json`
2. Udělat git commit s číslem verze (např. `git commit -m "v0.0.4"`)
3. Udělat git push
4. Vytvořit nový .vsix package

Detailní instrukce najdeš v `DEVELOPMENT.md`.

---

**Made with ❤️ for developers who want to ensure AI quality in their workflow**
