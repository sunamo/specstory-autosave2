import * as vscode from 'vscode';
import { AIActivityProvider } from '../activityProvider';

/**
 * Notification system for AI activity alerts
 */

export async function showAINotificationImmediately(
    message: string,
    aiActivityProvider: AIActivityProvider,
    aiNotificationPanel: { value: vscode.WebviewPanel | undefined },
    debugChannel: vscode.OutputChannel,
    countdownTimer: { value: NodeJS.Timeout | undefined }
) {
    debugChannel.appendLine('[DEBUG] Showing AI notification immediately');
    debugChannel.appendLine(`[DEBUG] Message: ${message}`);
    
    // Clear any existing countdown
    if (countdownTimer.value) {
        clearInterval(countdownTimer.value);
        countdownTimer.value = undefined;
    }
    
    // Get user preference for notification type
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const displayType = config.get<string>('notificationDisplayType', 'panel');
    
    if (displayType === 'notification') {
        // Use traditional VS Code notification
        debugChannel.appendLine('[DEBUG] Using VS Code notification display');
        const action = await vscode.window.showInformationMessage(
            message.replace(/\n/g, ' | '), // Replace newlines with separators for single-line display
            'Check Status',
            'Everything OK'
        );
        
        switch (action) {
            case 'Check Status':
                debugChannel.appendLine('[DEBUG] User will check the AI response status');
                break;
            case 'Everything OK':
                debugChannel.appendLine('[DEBUG] User confirmed AI response is correct - everything OK');
                break;
        }
    } else if (displayType === 'activitybar') {
        // Use activity bar view + brief notification
        debugChannel.appendLine('[DEBUG] Using activity bar display with brief notification');
        
        const startTime = Date.now();
        
        // Add notification first
        await aiActivityProvider.addNotification(message);
        debugChannel.appendLine(`[DEBUG] Activity provider notification added in ${Date.now() - startTime}ms`);
        
        // Show brief VS Code notification as well for immediate feedback
        const shortMessage = message.split('\n')[0]; // First line only
        vscode.window.showInformationMessage(
            `🤖 ${shortMessage}`,
            { modal: false }
        );
        debugChannel.appendLine('[DEBUG] Brief notification shown');
        
        // Focus the activity bar view with retry mechanism
        try {
            // Double focus to ensure it works
            await vscode.commands.executeCommand('workbench.view.extension.specstoryAI');
            setTimeout(async () => {
                try {
                    await vscode.commands.executeCommand('workbench.view.extension.specstoryAI');
                    debugChannel.appendLine(`[DEBUG] Activity bar double-focused in ${Date.now() - startTime}ms total`);
                } catch (retryError) {
                    debugChannel.appendLine(`[DEBUG] Activity bar retry focus failed: ${retryError}`);
                }
            }, 100);
        } catch (error) {
            debugChannel.appendLine(`[DEBUG] Failed to focus activity bar: ${error}`);
        }
        
    } else {
        // Use webview panel - but share the same display logic as activity bar
        if (!aiNotificationPanel.value) {
            // Create new panel only if none exists
            debugChannel.appendLine('[DEBUG] Creating new webview panel for AI notification...');
            
            aiNotificationPanel.value = vscode.window.createWebviewPanel(
                'aiNotification',
                '🤖 AI Activity Detected',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            
            // Handle panel disposal
            aiNotificationPanel.value.onDidDispose(() => {
                debugChannel.appendLine('[DEBUG] AI notification panel disposed');
                aiNotificationPanel.value = undefined;
            });
            
            // Handle messages from webview
            aiNotificationPanel.value.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'checkStatus':
                            debugChannel.appendLine('[DEBUG] User will check the AI response status');
                            if (aiNotificationPanel.value) {
                                aiNotificationPanel.value.dispose();
                            }
                            return;
                        case 'everythingOK':
                            debugChannel.appendLine('[DEBUG] User confirmed AI response is correct - everything OK');
                            if (aiNotificationPanel.value) {
                                aiNotificationPanel.value.dispose();
                            }
                            return;
                        case 'dismiss':
                            debugChannel.appendLine('[DEBUG] User dismissed notification');
                            if (aiNotificationPanel.value) {
                                aiNotificationPanel.value.dispose();
                            }
                            return;
                        case 'clearAll':
                            debugChannel.appendLine('[DEBUG] User cleared all notifications in panel');
                            // Clear the shared notifications array
                            aiActivityProvider.clearNotifications();
                            // Update both panel and activity bar
                            if (aiNotificationPanel.value) {
                                aiNotificationPanel.value.webview.html = aiActivityProvider.getHtmlForWebview(aiNotificationPanel.value.webview);
                            }
                            return;
                    }
                },
                undefined,
                []
            );
        } else {
            // Reuse existing panel
            debugChannel.appendLine('[DEBUG] Reusing existing webview panel...');
        }
        
        // Add notification to shared provider (same as activity bar)
        aiActivityProvider.addNotification(message);
        
        // Update panel content using the same HTML as activity bar
        aiNotificationPanel.value.webview.html = aiActivityProvider.getHtmlForWebview(aiNotificationPanel.value.webview);
        
        // Bring panel to focus
        aiNotificationPanel.value.reveal(vscode.ViewColumn.Beside);
        
        // Auto-close after 30 seconds (clear previous timer)
        setTimeout(() => {
            if (aiNotificationPanel.value && aiNotificationPanel.value.visible) {
                debugChannel.appendLine('[DEBUG] Auto-closing AI notification panel after 30 seconds');
                aiNotificationPanel.value.dispose();
            }
        }, 30000);
    }
    
    debugChannel.appendLine('[DEBUG] AI notification ready');
}
