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
    const now = Date.now();
    
    // Debouncing - prevent multiple triggers within 2 seconds
    if (lastDetectedTime && (now - lastDetectedTime.value < 2000)) {
        debugChannel.appendLine(`[DEBUG] AI activity ignored - too soon (${now - lastDetectedTime.value}ms since last detection)`);
        return;
    }
    
    if (lastDetectedTime) {
        lastDetectedTime.value = now;
    }
    
    aiPromptCounter.value++;
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableNotifications = config.get<boolean>('enableAICheckNotifications', true);
    const frequency = config.get<number>('aiNotificationFrequency', 1);
    
    debugChannel.appendLine(`[DEBUG] AI activity detected! Counter: ${aiPromptCounter.value}`);
    debugChannel.appendLine(`[DEBUG] Notifications enabled: ${enableNotifications}, Frequency: ${frequency}`);
    
    if (enableNotifications && (aiPromptCounter.value % frequency === 0)) {
        debugChannel.appendLine(`[DEBUG] Will show notification (counter ${aiPromptCounter.value} matches frequency ${frequency})`);
        showNotificationCallback().catch((error) => {
            debugChannel.appendLine(`[DEBUG] Error showing notification: ${error}`);
        });
    } else {
        debugChannel.appendLine(`[DEBUG] Notification skipped - notifications: ${enableNotifications}, counter: ${aiPromptCounter.value}, frequency: ${frequency}`);
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
