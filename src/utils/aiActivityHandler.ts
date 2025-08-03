import * as vscode from 'vscode';
import { findSpecStoryHistoryPath, readRecentSpecStoryConversations } from '../specstory/historyReader';
import { generateMessageWithRecentPrompts } from '../specstory/messageGenerator';

/**
 * Core AI activity handling and status management
 */

// Get extension version dynamically from package.json
function getExtensionVersion(): string {
    try {
        const extension = vscode.extensions.getExtension('sunamocz.specstory-autosave');
        return extension ? extension.packageJSON.version : '1.1.36';
    } catch (error) {
        return '1.1.36'; // fallback version
    }
}

export function handleAIActivity(
    aiPromptCounter: { value: number },
    debugChannel: vscode.OutputChannel,
    showNotificationCallback: () => Promise<void>,
    updateStatusBarCallback: () => void,
    lastDetectedTime?: { value: number }
) {
    debugChannel.appendLine(`[DEBUG] 🎯 === handleAIActivity() CALLED ===`);
    
    // NO COOLDOWN - detect every AI prompt immediately!
    const now = Date.now();
    
    if (lastDetectedTime) {
        lastDetectedTime.value = now;
    }
    
    aiPromptCounter.value++;
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableNotifications = config.get<boolean>('enableAICheckNotifications', true);
    const frequency = config.get<number>('aiNotificationFrequency', 1);
    
    debugChannel.appendLine(`[DEBUG] 🚀 AI PROMPT DETECTED! Counter: ${aiPromptCounter.value}`);
    debugChannel.appendLine(`[DEBUG] Notifications enabled: ${enableNotifications}, Frequency: ${frequency}`);
    
    // ALWAYS show notification when enabled - no frequency check for maximum reliability
    if (enableNotifications) {
        debugChannel.appendLine(`[DEBUG] ✅ SHOWING NOTIFICATION IMMEDIATELY (counter ${aiPromptCounter.value})`);
        debugChannel.appendLine(`[DEBUG] 📞 CALLING showNotificationCallback()...`);
        showNotificationCallback().catch((error) => {
            debugChannel.appendLine(`[DEBUG] ❌ Error showing notification: ${error}`);
        });
        debugChannel.appendLine(`[DEBUG] ✅ showNotificationCallback() CALLED (async)`);
    } else {
        debugChannel.appendLine(`[DEBUG] ❌ Notifications disabled in settings`);
    }
    
    updateStatusBarCallback();
}

export async function generateSmartNotificationMessage(debugChannel: vscode.OutputChannel): Promise<string> {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const customMessage = config.get<string>('aiNotificationMessage', '');
    const defaultUserMessage = 'Please check:\n• Did AI understand your question correctly?\n• If working with HTML, inspect for invisible elements\n• Verify the response quality and accuracy';
    
    // Always start with "New AI prompt detected!" on first line
    const firstLine = 'New AI prompt detected!';
    
    // Use custom message from settings or default as second part
    const userMessage = customMessage || defaultUserMessage;
    
    // Combine: first line + user's message
    const finalMessage = firstLine + '\n\n' + userMessage;
    
    debugChannel.appendLine(`[DEBUG] Generated notification message with first line: "${firstLine}"`);
    debugChannel.appendLine(`[DEBUG] User message from settings: "${userMessage.substring(0, 100)}..."`);
    
    return finalMessage;
}

export function updateStatusBar(statusBarItem: vscode.StatusBarItem, aiPromptCounter: { value: number }) {
    if (statusBarItem) {
        const version = getExtensionVersion();
        statusBarItem.text = `$(robot) AI: ${aiPromptCounter.value} | v${version}`;
        statusBarItem.tooltip = `AI prompts detected: ${aiPromptCounter.value} | SpecStory AutoSave + AI Copilot Prompt Detection v${version}`;
        statusBarItem.show(); // Ensure the status bar is visible
    }
}
