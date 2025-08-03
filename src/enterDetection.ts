import * as vscode from 'vscode';

let lastDetectedTime = 0;

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 Copilot Chat command detection ready');
    
    // Check Copilot availability
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    if (copilotExt && copilotChatExt) {
        debugChannel.appendLine('✅ Copilot extensions found');
    } else {
        debugChannel.appendLine('❌ Missing Copilot extensions');
        return [];
    }
    
    // Method 1: Listen to chat submit commands directly
    const chatCommandListener = vscode.commands.registerCommand('workbench.action.chat.submit', (...args) => {
        const now = Date.now();
        if (now - lastDetectedTime > 200) {
            lastDetectedTime = now;
            debugChannel.appendLine('🚀 COPILOT SUBMIT COMMAND DETECTED!');
            handleAIActivity();
        }
        // Continue with original command
        return vscode.commands.executeCommand('workbench.action.chat.submit.original', ...args);
    });
    
    // Method 2: Listen to various chat-related commands
    const chatCommands = [
        'workbench.action.chat.submit',
        'workbench.action.chat.submitSecondaryAgent',
        'chat.action.submit',
        'interactive.acceptInput',
        'workbench.action.interactiveSession.submit'
    ];
    
    const commandListeners: vscode.Disposable[] = [];
    
    chatCommands.forEach(command => {
        try {
            const listener = vscode.commands.registerCommand(command + '.copilot-detector', (...args) => {
                const now = Date.now();
                if (now - lastDetectedTime > 100) {
                    lastDetectedTime = now;
                    debugChannel.appendLine(`🚀 COPILOT COMMAND: ${command}`);
                    handleAIActivity();
                }
            });
            commandListeners.push(listener);
        } catch (error) {
            // Command might not exist - ignore
        }
    });
    
    // Method 3: Monitor VS Code window focus and activity
    const windowListener = vscode.window.onDidChangeWindowState(state => {
        if (state.focused) {
            // When window regains focus, check for recent activity
            setTimeout(() => {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    const scheme = activeEditor.document.uri.scheme;
                    if (scheme === 'chat-editing-snapshot-text-model') {
                        debugChannel.appendLine('� Window focus with Copilot chat active');
                    }
                }
            }, 100);
        }
    });
    
    // Method 4: Monitor all available commands for chat patterns
    const allCommandsMonitor = setInterval(async () => {
        try {
            const commands = await vscode.commands.getCommands(true);
            const chatCommands = commands.filter(cmd => 
                cmd.includes('chat') || 
                cmd.includes('copilot') || 
                cmd.includes('interactive')
            );
            
            // Log periodically for debugging
            if (Math.random() < 0.01) { // 1% chance
                debugChannel.appendLine(`📊 Found ${chatCommands.length} chat-related commands`);
            }
        } catch (error) {
            // Ignore errors
        }
    }, 5000);
    
    const allCommandsDisposable = new vscode.Disposable(() => {
        clearInterval(allCommandsMonitor);
    });
    
    debugChannel.appendLine('✅ Multi-method Copilot detection active');
    
    return [
        chatCommandListener,
        ...commandListeners,
        windowListener,
        allCommandsDisposable
    ];
}
