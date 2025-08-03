#!/bin/bash

# Clean install script for AI Prompt Detector
echo "AI Prompt Detector - Clean Install Script"
echo "========================================"

# Build the extension
echo "1. Building extension..."
npm run compile
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Create VSIX package
echo "2. Creating VSIX package..."
vsce package --allow-star-activation --out ai-prompt-detector-latest.vsix
if [ $? -ne 0 ]; then
    echo "❌ VSIX creation failed!"
    exit 1
fi

# Clean old extensions (silent)
echo "3. Cleaning old extensions..."
code --uninstall-extension sunamocz.specstory-autosave --disable-extensions >/dev/null 2>&1
code --uninstall-extension radekdev.ai-prompt-detector-new --disable-extensions >/dev/null 2>&1

# Install new extension (no new window)
echo "4. Installing new extension..."
code --install-extension ai-prompt-detector-latest.vsix --disable-extensions --wait
if [ $? -eq 0 ]; then
    echo "✅ Extension installed successfully!"
    echo "📝 Please restart VS Code to see the new version"
    echo "🔍 Look for version [v1.0.1-ENTER-NEW] in status bar"
else
    echo "❌ Installation failed!"
fi

echo "========================================"
echo "Installation complete!"
