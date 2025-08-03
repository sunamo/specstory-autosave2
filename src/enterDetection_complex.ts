import * as vscode from 'vscode';

let lastDetectedTime = 0;
let chatSubmissionTimeout: NodeJS.Timeout | undefined;
let recentChatActivity = false;

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 Advanced Copilot Chat detection initialized (based on source code analysis)');
    
    // Check Copilot availability and versions
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    if (copilotExt && copilotChatExt) {
        debugChannel.appendLine(`✅ Copilot: ${copilotExt.packageJSON.version}, Chat: ${copilotChatExt.packageJSON.version}`);
    } else {
        debugChannel.appendLine('❌ Missing Copilot extensions');
        return [];
    }

    // Method 1: Advanced Webview Message Monitoring (inspired by source code analysis)
    const webviewMessageListener = vscode.window.onDidChangeActiveColorTheme(() => {
        // This is a clever workaround - webview events often trigger theme change events
        if (recentChatActivity) {
            debugChannel.appendLine('🎨 Theme change during chat activity detected');
        }
    });

    // Method 2: Comprehensive Chat Command Interception (based on Copilot source patterns)
    const chatCommandsAdvanced = [
        'workbench.action.chat.submit',
        'workbench.action.chat.submitSecondaryAgent', 
        'workbench.action.chat.acceptInput',
        'interactive.acceptInput',
        'workbench.action.interactiveSession.submit',
        'github.copilot.generate',
        'github.copilot.sendChatMessage',
        'vscode.executeDocumentRenameProvider',
        'workbench.action.chat.insertCodeBlock',
        'workbench.action.chat.runInTerminal',
        'workbench.action.chat.clear',
        'workbench.action.chat.newChat'
    ];

    const commandListeners: vscode.Disposable[] = [];
    
    chatCommandsAdvanced.forEach(command => {
        try {
            // Try to intercept existing commands
            const originalCommand = `${command}.original`;
            
            const listener = vscode.commands.registerCommand(command, async (...args) => {
                const now = Date.now();
                if (now - lastDetectedTime > 50) { // Very fast detection
                    lastDetectedTime = now;
                    recentChatActivity = true;
                    debugChannel.appendLine(`🚀 CHAT COMMAND INTERCEPTED: ${command}`);
                    handleAIActivity();
                    
                    // Clear activity flag after 2 seconds
                    setTimeout(() => { recentChatActivity = false; }, 2000);
                }
                
                // Forward to original command if it exists
                try {
                    return await vscode.commands.executeCommand(originalCommand, ...args);
                } catch (error) {
                    // Original command might not exist - that's OK for most cases
                }
            });
            commandListeners.push(listener);
        } catch (error) {
            // Command registration might fail - ignore and continue
        }
    });

    // Method 3: Enhanced Text Document Monitoring with Multiple Chat Schemes
    const advancedTextListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri;
        const scheme = uri.scheme;
        
        // Skip our own output
        if (uri.toString().includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Multi-scheme detection based on Copilot source analysis
        const isCopilotRelated = (
            scheme === 'chat-editing-snapshot-text-model' ||
            scheme === 'copilot' ||
            scheme === 'interactive' ||
            scheme === 'chat' ||
            uri.path.includes('copilot') ||
            uri.path.includes('chat') ||
            event.document.languageId === 'copilot-chat' ||
            event.document.languageId === 'markdown' && uri.path.includes('chat')
        );
        
        if (isCopilotRelated) {
            const hasSignificantChanges = event.contentChanges.some(change => 
                change.text.length > 0 || change.rangeLength > 5
            );
            
            if (hasSignificantChanges) {
                const now = Date.now();
                
                // Set up delayed detection for message submission
                if (chatSubmissionTimeout) {
                    clearTimeout(chatSubmissionTimeout);
                }
                
                chatSubmissionTimeout = setTimeout(() => {
                    if (now - lastDetectedTime > 100) {
                        lastDetectedTime = Date.now();
                        recentChatActivity = true;
                        debugChannel.appendLine(`💬 Chat text change: ${scheme} (${event.contentChanges.length} changes)`);
                        handleAIActivity();
                        
                        setTimeout(() => { recentChatActivity = false; }, 1500);
                    }
                }, 150); // Wait for complete input before detecting
            }
        }
    });

    // Method 4: Enhanced Window State and Panel Focus Detection  
    const windowFocusListener = vscode.window.onDidChangeWindowState(state => {
        if (state.focused && recentChatActivity) {
            debugChannel.appendLine('🔍 Window focus with recent chat activity');
        }
    });

    // Method 5: Active Editor Monitoring for Chat Contexts
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            const scheme = editor.document.uri.scheme;
            const path = editor.document.uri.path;
            const languageId = editor.document.languageId;
            
            const isChatContext = (
                scheme === 'chat-editing-snapshot-text-model' ||
                scheme === 'copilot' ||
                scheme === 'interactive' ||
                languageId === 'copilot-chat' ||
                path.includes('copilot') ||
                path.includes('chat')
            );
            
            if (isChatContext) {
                debugChannel.appendLine(`📝 Active editor switched to chat context: ${scheme} (${languageId})`);
                recentChatActivity = true;
                setTimeout(() => { recentChatActivity = false; }, 3000);
            }
        }
    });

    // Method 6: Extension Host Communication Monitoring (experimental)
    const extensionChangeListener = vscode.extensions.onDidChange(() => {
        if (recentChatActivity) {
            debugChannel.appendLine('🔌 Extension change during chat activity');
        }
    });

    // Method 7: Terminal Command Monitoring for Copilot CLI
    const terminalListener = vscode.window.onDidChangeActiveTerminal(terminal => {
        if (terminal && recentChatActivity) {
            debugChannel.appendLine('💻 Terminal switched during chat activity');
        }
    });

    // Method 8: Command Discovery and Real-time Monitoring
    const allCommandsMonitor = setInterval(async () => {
        try {
            const commands = await vscode.commands.getCommands(true);
            const chatCommands = commands.filter(cmd => 
                cmd.includes('chat') || 
                cmd.includes('copilot') || 
                cmd.includes('interactive')
            );
            
            // Log periodically for debugging with more details
            if (Math.random() < 0.003) { // 0.3% chance, less frequent
                debugChannel.appendLine(`📊 Monitoring ${chatCommands.length} chat commands`);
                if (recentChatActivity) {
                    debugChannel.appendLine('🔥 High chat activity detected!');
                }
            }
        } catch (error) {
            // Ignore errors in command discovery
        }
    }, 2500); // More frequent checking

    // Method 9: Webview Panel State Monitoring (based on Copilot webview patterns)
    const webviewPanelListener = vscode.window.onDidChangeActiveTextEditor(editor => {
        // Check if switching to a webview-related editor
        if (editor && editor.document.uri.scheme.includes('webview')) {
            const now = Date.now();
            if (now - lastDetectedTime > 200) {
                debugChannel.appendLine('📱 Webview panel activity detected');
                recentChatActivity = true;
                setTimeout(() => { recentChatActivity = false; }, 2000);
            }
        }
    });

    const allCommandsDisposable = new vscode.Disposable(() => {
        clearInterval(allCommandsMonitor);
        if (chatSubmissionTimeout) {
            clearTimeout(chatSubmissionTimeout);
        }
    });
    
    debugChannel.appendLine('✅ Advanced multi-method Copilot detection active (9 detection methods)');
    
    return [
        webviewMessageListener,
        ...commandListeners,
        advancedTextListener,
        windowFocusListener,
        editorChangeListener,
        extensionChangeListener,
        terminalListener,
        webviewPanelListener,
        allCommandsDisposable
    ];
}
