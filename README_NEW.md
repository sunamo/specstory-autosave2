# SpecStory Chat AutoSave

**Automatically saves SpecStory chat exports when closing VS Code and provides configurable auto-save intervals with AI activity monitoring.**

## Features

🚀 **Automatic Export**: Automatically exports GitHub Copilot chat history using SpecStory when closing VS Code

⏰ **Configurable Intervals**: Set auto-save intervals from 1 to 60 minutes

🔍 **AI Activity Monitoring**: Get notifications when AI makes changes to help you verify the results

🌍 **Multi-language Support**: Available in English and Czech

## Requirements

- [SpecStory extension](https://marketplace.visualstudio.com/items?itemName=SpecStory.specstory) must be installed and active
- GitHub Copilot chat history in your workspace

## Extension Settings

This extension contributes the following settings:

* `specstoryautosave.enableAutoSave`: Enable automatic saving of chat history (default: `true`)
* `specstoryautosave.autoSaveInterval`: Auto-save interval in minutes (1-60, default: `5`)
* `specstoryautosave.enableAICheckNotifications`: Show notifications for AI result verification (default: `true`)

## Commands

* `SpecStoryAutoSave: Export Chat History Now` - Manually trigger export
* `SpecStoryAutoSave: Test Extension` - Test if extension is working

## How it Works

1. **Automatic Export on Close**: When you close VS Code, the extension automatically triggers SpecStory export
2. **Interval-based Export**: Exports happen at your configured interval (default every 5 minutes)  
3. **AI Monitoring**: When large code changes are detected (likely from AI), you get a notification to verify the results
4. **Manual Export**: Use the command palette to export anytime

## Installation

1. Install from VS Code Marketplace
2. Make sure SpecStory extension is installed
3. Configure your preferred settings
4. Start using Copilot chat - exports will happen automatically!

## Usage

The extension works automatically in the background. Your Copilot chat history will be exported to `.specstory` folder in your workspace.

### AI Monitoring

When the extension detects large code changes (likely from AI tools), it shows a red notification asking you to verify the results. This helps ensure AI understood your requirements correctly.

## Release Notes

### 0.0.1

Initial release of SpecStory Chat AutoSave

- Automatic export on VS Code close
- Configurable auto-save intervals  
- AI activity monitoring
- Multi-language support (English/Czech)
- Manual export commands

## Feedback

Found a bug or have a feature request? Please [open an issue](https://github.com/your-username/specstory-autosave/issues).

---

**Enjoy using SpecStory Chat AutoSave!** 🎉
