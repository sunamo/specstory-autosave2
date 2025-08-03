import * as vscode from 'vscode';
import { findSpecStoryHistoryPath, readRecentSpecStoryConversations } from '../specstory/historyReader';
import { generateMessageWithRecentPrompts } from '../specstory/messageGenerator';

/**
 * Core AI activity handling and status management
 */

export function handleAIActivity(
    aiPromptCounter: { value: number },
    debugChannel: vscode.OutputChannel,
    showNotificationCallback: () => Promise<void>,
    updateStatusBarCallback: () => void
) {
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
    const enableSmartNotifications = config.get<boolean>('enableSmartNotifications', true);
    const customMessage = config.get<string>('aiNotificationMessage', '');
    const defaultMessage = 'AI prompt detected! Please check:\n• Did AI understand your question correctly?\n• If working with HTML, inspect for invisible elements\n• Verify the response quality and accuracy';
    
    // If user has non-empty custom message or smart notifications are disabled, use their message or default
    if (!enableSmartNotifications || (customMessage && customMessage.trim() !== '')) {
        return customMessage || defaultMessage;
    }
    
    try {
        // Add small delay to allow SpecStory file to be written
        debugChannel.appendLine('[DEBUG] Waiting 2 seconds for SpecStory file to be updated...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to find SpecStory history folder
        const specstoryPath = await findSpecStoryHistoryPath();
        if (!specstoryPath) {
            debugChannel.appendLine('[DEBUG] No SpecStory history found, using default message');
            return defaultMessage;
        }
        
        // Read latest 10 SpecStory conversations to get more prompts
        const recentConversations = await readRecentSpecStoryConversations(specstoryPath, 10, debugChannel);
        if (!recentConversations || recentConversations.length === 0) {
            debugChannel.appendLine('[DEBUG] No recent conversations found, using default message');
            return defaultMessage;
        }
        
        // Generate message with recent prompts
        const smartMessage = generateMessageWithRecentPrompts(recentConversations, debugChannel);
        debugChannel.appendLine(`[DEBUG] Generated smart message based on ${recentConversations.length} recent conversations`);
        return smartMessage;
        
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] Error generating smart message: ${error}`);
        return defaultMessage;
    }
}

export function updateStatusBar(statusBarItem: vscode.StatusBarItem, aiPromptCounter: { value: number }) {
    if (statusBarItem) {
        statusBarItem.text = `$(robot) AI: ${aiPromptCounter.value}`;
        statusBarItem.tooltip = `AI prompts detected: ${aiPromptCounter.value}`;
    }
}
