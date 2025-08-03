import * as vscode from 'vscode';

// WebView Provider for Activity Bar
class AIActivityProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'specstoryAINotifications';
    private _view?: vscode.WebviewView;
    private _notifications: string[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'clearAll':
                    this._notifications = [];
                    this._updateView();
                    break;
            }
        });
    }

    public addNotification(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        this._notifications.unshift(`[${timestamp}] ${message}`);
        
        // Keep only last 10 notifications
        if (this._notifications.length > 10) {
            this._notifications = this._notifications.slice(0, 10);
        }
        
        this._updateView();
    }

    private _updateView() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const notificationsList = this._notifications.length > 0 
            ? this._notifications.map(notification => `<div class="notification">${notification}</div>`).join('')
            : '<div class="no-notifications">No AI activity detected yet...</div>';

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Activity</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    line-height: var(--vscode-font-weight);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 10px;
                }
                .notification {
                    background-color: var(--vscode-editor-selectionBackground);
                    border-left: 3px solid var(--vscode-charts-blue);
                    padding: 8px;
                    margin: 5px 0;
                    border-radius: 3px;
                    font-size: 11px;
                }
                .no-notifications {
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                    text-align: center;
                    padding: 20px;
                }
                .clear-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    cursor: pointer;
                    border-radius: 3px;
                    font-size: 11px;
                    margin-bottom: 10px;
                    width: 100%;
                }
                .clear-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
            <button class="clear-button" onclick="clearAll()">Clear History</button>
            <div id="notifications">
                ${notificationsList}
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function clearAll() {
                    vscode.postMessage({ type: 'clearAll' });
                }
            </script>
        </body>
        </html>`;
    }
}

let outputChannel: vscode.OutputChannel;
let debugChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let copilotOutputChannel: vscode.OutputChannel | undefined;
let aiPromptCounter = 0;
let lastDetectedTime = 0;
let countdownTimer: NodeJS.Timeout | undefined;
let aiNotificationPanel: vscode.WebviewPanel | undefined;
let aiActivityProvider: AIActivityProvider;

export function activate(context: vscode.ExtensionContext) {
    // Create output channels
    outputChannel = vscode.window.createOutputChannel('SpecStoryAutoSave');
    debugChannel = vscode.window.createOutputChannel('SpecStoryAutoSave Debug');
    
    // Register webview provider for activity bar
    aiActivityProvider = new AIActivityProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AIActivityProvider.viewType, aiActivityProvider)
    );
    
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'specstoryautosave.showPromptStats';
    context.subscriptions.push(statusBarItem);
    
    // Initialize status bar immediately
    updateStatusBar();
    
    debugChannel.appendLine('[DEBUG] Extension activated');
    debugChannel.show(); // Show debug channel immediately
    console.log('SpecStoryAutoSave extension is now active!');

    // Initialize Copilot monitoring
    initializeCopilotMonitoring();
    
    // Register test command to find SpecStory commands
    const findSpecStoryCommands = vscode.commands.registerCommand('specstoryautosave.findSpecStoryCommands', async () => {
        debugChannel.appendLine('[DEBUG] Finding SpecStory commands...');
        
        try {
            const allCommands = await vscode.commands.getCommands(true);
            const specStoryCommands = allCommands.filter(cmd => 
                cmd.toLowerCase().includes('specstory') || 
                cmd.toLowerCase().includes('export') ||
                cmd.toLowerCase().includes('chat')
            );
            
            debugChannel.appendLine(`[DEBUG] Found ${specStoryCommands.length} potential SpecStory commands:`);
            specStoryCommands.forEach(cmd => {
                debugChannel.appendLine(`  - ${cmd}`);
            });
            
            vscode.window.showInformationMessage(`Found ${specStoryCommands.length} SpecStory-related commands. Check Debug output for details.`);
        } catch (error) {
            debugChannel.appendLine(`[ERROR] Failed to find commands: ${error}`);
        }
    });

    // Register test command to test SpecStory dialog
    const testSpecStoryDialog = vscode.commands.registerCommand('specstoryautosave.testSpecStoryDialog', async () => {
        debugChannel.appendLine('[DEBUG] Testing SpecStory dialog...');
        
        try {
            // Try to execute the SpecStory export command
            const result = await vscode.commands.executeCommand('specstory.exportChatHistory');
            debugChannel.appendLine(`[DEBUG] SpecStory command result: ${JSON.stringify(result)}`);
            
            // Monitor for dialogs/notifications that might appear
            vscode.window.showInformationMessage('SpecStory command executed. Check for any dialog that appears.');
            
        } catch (error) {
            debugChannel.appendLine(`[ERROR] Failed to execute SpecStory command: ${error}`);
            vscode.window.showErrorMessage(`SpecStory command failed: ${error}`);
        }
    });

    // Register basic test command
    const testCommand = vscode.commands.registerCommand('specstoryautosave.test', () => {
        debugChannel.appendLine('[DEBUG] Test command executed');
        vscode.window.showInformationMessage('SpecStoryAutoSave test command works!');
    });

    // Register AI notification test command
    const testAINotification = vscode.commands.registerCommand('specstoryautosave.testAINotification', () => {
        debugChannel.appendLine('[DEBUG] MANUAL TEST: Simulating immediate AI notification...');
        debugChannel.appendLine('[DEBUG] Note: This is a manual test, not triggered by real AI activity');
        debugChannel.appendLine('[DEBUG] Testing vscode.window.showWarningMessage directly...');
        
        // Direct test of notification system
        vscode.window.showWarningMessage('🧪 TEST NOTIFICATION: This is a test of the notification system', 'Test OK', 'Test Cancel').then((selection) => {
            debugChannel.appendLine(`[DEBUG] TEST RESULT: User selected '${selection || 'DISMISSED'}'`);
        }, (error: any) => {
            debugChannel.appendLine(`[DEBUG] TEST ERROR: ${error}`);
        });
    });

    // Register keyboard shortcut for AI notification (for testing)
    const keyboardTrigger = vscode.commands.registerCommand('specstoryautosave.keyboardTrigger', () => {
        debugChannel.appendLine('[DEBUG] 🎹 KEYBOARD TRIGGER: Simulating AI prompt detection');
        handleAIActivity();
    });

    // Register force AI notification command (alternative method)
    const forceAINotification = vscode.commands.registerCommand('specstoryautosave.forceAINotification', () => {
        debugChannel.appendLine('[DEBUG] 🔧 FORCE TRIGGER: User manually triggered AI notification');
        handleAIActivity();
    });

    // Register simple copilot detection test
    const testCopilotDetection = vscode.commands.registerCommand('specstoryautosave.testCopilotDetection', async () => {
        debugChannel.appendLine('[DEBUG] 🧪 TESTING COPILOT DETECTION...');
        
        // Try to trigger common copilot commands
        try {
            debugChannel.appendLine('[DEBUG] Testing chat panel focus...');
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            debugChannel.appendLine('[DEBUG] Chat panel focus command executed');
        } catch (error) {
            debugChannel.appendLine(`[DEBUG] Chat panel focus failed: ${error}`);
        }
        
        // Test if this triggers our detection
        setTimeout(() => {
            debugChannel.appendLine('[DEBUG] 🧪 Test completed - check if notification appeared');
        }, 1000);
    });

    // Register show prompt stats command
    const showPromptStats = vscode.commands.registerCommand('specstoryautosave.showPromptStats', () => {
        const message = `AI Prompts detected: ${aiPromptCounter}`;
        vscode.window.showInformationMessage(message);
        debugChannel.appendLine(`[DEBUG] ${message}`);
    });

    // Register reset counter command
    const resetCounter = vscode.commands.registerCommand('specstoryautosave.resetPromptCounter', () => {
        aiPromptCounter = 0;
        lastDetectedTime = 0;
        updateStatusBar();
        debugChannel.appendLine('[DEBUG] AI prompt counter reset to 0');
        vscode.window.showInformationMessage('AI prompt counter reset to 0');
    });

    // Register Copilot continue helper command
    const copilotContinue = vscode.commands.registerCommand('specstoryautosave.copilotContinue', async () => {
        debugChannel.appendLine('[DEBUG] 🔵 Copilot Continue helper triggered');
        
        try {
            // Try multiple possible continue commands
            const continueCommands = [
                'github.copilot.chat.continueInlineChat',
                'github.copilot.interactiveEditor.accept',
                'workbench.action.chat.continue',
                'github.copilot.chat.accept',
                'inlineChat.accept',
                'interactive.accept'
            ];
            
            for (const command of continueCommands) {
                try {
                    debugChannel.appendLine(`[DEBUG] 🔵 Trying command: ${command}`);
                    await vscode.commands.executeCommand(command);
                    debugChannel.appendLine(`[DEBUG] ✅ Successfully executed: ${command}`);
                    return; // Success, exit
                } catch (error) {
                    debugChannel.appendLine(`[DEBUG] ❌ Failed: ${command} - ${error}`);
                }
            }
            
            // If all commands failed, try pressing Enter programmatically
            debugChannel.appendLine('[DEBUG] 🔵 All commands failed, trying keyboard simulation');
            await vscode.commands.executeCommand('type', { text: '\n' });
            
        } catch (error) {
            debugChannel.appendLine(`[DEBUG] ❌ Copilot continue failed: ${error}`);
        }
    });

    // Add commands to context
    context.subscriptions.push(findSpecStoryCommands);
    context.subscriptions.push(testSpecStoryDialog);
    context.subscriptions.push(testCommand);
    context.subscriptions.push(testAINotification);
    context.subscriptions.push(keyboardTrigger);
    context.subscriptions.push(forceAINotification);
    context.subscriptions.push(testCopilotDetection);
    context.subscriptions.push(showPromptStats);
    context.subscriptions.push(resetCounter);
    context.subscriptions.push(copilotContinue);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(debugChannel);
    
    debugChannel.appendLine('[DEBUG] All commands registered successfully');
}

function initializeCopilotMonitoring() {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const detectionLevel = config.get<string>('detectionLevel', 'off'); // 'off', 'basic', 'advanced', 'aggressive'
    
    // Individual detection method settings (all default to false)
    const enableCommandHook = config.get<boolean>('enableCommandHookDetection', false);
    const enableWebview = config.get<boolean>('enableWebviewDetection', false);
    const enablePanelFocus = config.get<boolean>('enablePanelFocusDetection', false);
    const enablePattern = config.get<boolean>('enablePatternDetection', false);
    const enableCodeInsertion = config.get<boolean>('enableCodeInsertionDetection', false);
    const enableMemory = config.get<boolean>('enableMemoryDetection', false);
    const enableTerminal = config.get<boolean>('enableTerminalDetection', false);
    const enableFileSystem = config.get<boolean>('enableFileSystemDetection', false);
    const enableKeyboardActivity = config.get<boolean>('enableKeyboardActivityDetection', false);
    
    debugChannel.appendLine(`[DEBUG] Initializing Copilot monitoring - Level: ${detectionLevel}`);
    debugChannel.appendLine(`[DEBUG] Individual settings: CommandHook=${enableCommandHook}, Webview=${enableWebview}, PanelFocus=${enablePanelFocus}, Pattern=${enablePattern}, CodeInsertion=${enableCodeInsertion}, Memory=${enableMemory}, Terminal=${enableTerminal}, FileSystem=${enableFileSystem}, KeyboardActivity=${enableKeyboardActivity}`);
    
    if (detectionLevel === 'off' && !enableCommandHook && !enableWebview && !enablePanelFocus && !enablePattern && !enableCodeInsertion && !enableMemory && !enableTerminal && !enableFileSystem && !enableKeyboardActivity) {
        debugChannel.appendLine('[DEBUG] All detection is OFF - no monitoring will be performed');
        debugChannel.appendLine('[DEBUG] 💡 To enable detection, change detectionLevel or enable individual detection methods in settings');
        return;
    }

    // Try to activate Copilot extensions first
    activateCopilotExtensions().then(() => {
        // Initialize detection methods based on individual settings OR detection level
        const shouldUseCommandHook = enableCommandHook || (detectionLevel === 'basic' || detectionLevel === 'advanced' || detectionLevel === 'aggressive');
        const shouldUseWebview = enableWebview || (detectionLevel === 'basic' || detectionLevel === 'advanced' || detectionLevel === 'aggressive');
        const shouldUsePanelFocus = enablePanelFocus || (detectionLevel === 'advanced' || detectionLevel === 'aggressive');
        const shouldUsePattern = enablePattern || (detectionLevel === 'advanced' || detectionLevel === 'aggressive');
        const shouldUseCodeInsertion = enableCodeInsertion || (detectionLevel === 'aggressive');
        const shouldUseMemory = enableMemory || (detectionLevel === 'aggressive');
        const shouldUseTerminal = enableTerminal; // Only when explicitly enabled
        const shouldUseFileSystem = enableFileSystem; // Only when explicitly enabled  
        const shouldUseKeyboardActivity = enableKeyboardActivity; // Only when explicitly enabled
        
        if (shouldUseCommandHook || shouldUseWebview || shouldUsePanelFocus) {
            initializeBasicDetection(shouldUseCommandHook, shouldUseWebview, shouldUsePanelFocus);
        }
        
        if (shouldUsePattern) {
            initializeAdvancedDetection();
        }
        
        if (shouldUseCodeInsertion || shouldUseMemory) {
            initializeAggressiveDetection(shouldUseCodeInsertion, shouldUseMemory, shouldUseTerminal, shouldUseFileSystem, shouldUseKeyboardActivity);
        }
        
        // Diagnostics after activation attempts
        setTimeout(async () => {
            await performDiagnostics(detectionLevel);
        }, 5000);
    });
}

async function activateCopilotExtensions() {
    debugChannel.appendLine('[DEBUG] 🔄 Attempting to activate Copilot extensions...');
    
    try {
        // Try to get and activate GitHub Copilot
        const copilotExt = vscode.extensions.getExtension('GitHub.copilot');
        if (copilotExt && !copilotExt.isActive) {
            debugChannel.appendLine('[DEBUG] 🔄 Activating GitHub Copilot...');
            await copilotExt.activate();
            debugChannel.appendLine('[DEBUG] ✅ GitHub Copilot activation attempted');
        }
        
        // Try to get and activate GitHub Copilot Chat
        const copilotChatExt = vscode.extensions.getExtension('GitHub.copilot-chat');
        if (copilotChatExt && !copilotChatExt.isActive) {
            debugChannel.appendLine('[DEBUG] 🔄 Activating GitHub Copilot Chat...');
            await copilotChatExt.activate();
            debugChannel.appendLine('[DEBUG] ✅ GitHub Copilot Chat activation attempted');
        }
        
        // Wait a bit for activation to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] ⚠️ Copilot activation error (this is expected in Extension Development Host): ${error}`);
    }
    
    debugChannel.appendLine('[DEBUG] 🔄 Copilot activation phase completed');
}

async function performDiagnostics(detectionLevel: string) {
    try {
        const allCommands = await vscode.commands.getCommands(true);
        const copilotCommands = allCommands.filter(cmd => 
            cmd.toLowerCase().includes('copilot') || 
            cmd.toLowerCase().includes('github.copilot')
        );
        
        debugChannel.appendLine(`[DEBUG] 📋 Found ${copilotCommands.length} Copilot commands`);
        if (copilotCommands.length > 0) {
            debugChannel.appendLine(`[DEBUG] 📋 Examples: ${copilotCommands.slice(0, 3).join(', ')}`);
        }
        
        const copilotExt = vscode.extensions.getExtension('GitHub.copilot');
        const copilotChatExt = vscode.extensions.getExtension('GitHub.copilot-chat');
        
        debugChannel.appendLine(`[DEBUG] 🔌 GitHub Copilot: ${copilotExt?.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        debugChannel.appendLine(`[DEBUG] 🔌 GitHub Copilot Chat: ${copilotChatExt?.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        
        // If still inactive, provide helpful message
        if (!copilotExt?.isActive && !copilotChatExt?.isActive) {
            debugChannel.appendLine('[DEBUG] ⚠️ Copilot extensions are still inactive.');
            debugChannel.appendLine('[DEBUG] 💡 This is normal in Extension Development Host.');
            debugChannel.appendLine('[DEBUG] 💡 Try using the extension in your main VS Code window, or');
            debugChannel.appendLine('[DEBUG] 💡 use the manual test: Ctrl+Shift+P → "SpecStoryAutoSave: Force AI Notification"');
        }
        
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] ❌ Diagnostics error: ${error}`);
    }
    
    debugChannel.appendLine(`[DEBUG] ✅ Monitoring initialized - Level: ${detectionLevel}`);
}

function initializeBasicDetection(enableCommandHook: boolean = true, enableWebview: boolean = true, enablePanelFocus: boolean = true) {
    debugChannel.appendLine(`[DEBUG] 🎯 Initializing BASIC detection - CommandHook: ${enableCommandHook}, Webview: ${enableWebview}, PanelFocus: ${enablePanelFocus}`);
    
    // Method 1: Monitor chat panel visibility and focus (if enabled)
    if (enableWebview) {
        const disposable1 = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (!editor) return;
            
            const uri = editor.document.uri.toString();
            debugChannel.appendLine(`[DEBUG] 📝 Active editor: ${uri}`);
            
            // Detect Copilot Chat webview panels
            if (uri.includes('webview-panel') && uri.includes('copilot')) {
                debugChannel.appendLine(`[DEBUG] 🎯 COPILOT CHAT PANEL DETECTED: ${uri}`);
                
                const now = Date.now();
                if (now - lastDetectedTime > 1000) {
                    lastDetectedTime = now;
                    debugChannel.appendLine('[DEBUG] 🚀 BASIC WEBVIEW DETECTION!');
                    handleAIActivity();
                }
            }
        });
    }
    
    // Method 2: Monitor panel state changes (if enabled)
    if (enablePanelFocus) {
        const disposable2 = vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                debugChannel.appendLine('[DEBUG] 🖼️ Window focus changed - checking for chat activity');
                
                // Check if any chat-related commands are available
                vscode.commands.getCommands(true).then(commands => {
                    const activeChatCommands = commands.filter(cmd => 
                        cmd.includes('github.copilot-chat') || 
                        cmd.includes('workbench.panel.chat.view.copilot')
                    );
                    
                    if (activeChatCommands.length > 0) {
                        debugChannel.appendLine(`[DEBUG] 💬 Found ${activeChatCommands.length} active chat commands`);
                    }
                });
            }
        });
    }
    
    // Method 3: Try command hook (if enabled)
    if (enableCommandHook) {
        try {
            const originalExecuteCommand = vscode.commands.executeCommand;
            
            (vscode.commands as any).executeCommand = async function(command: string, ...args: any[]) {
                const cmd = command.toLowerCase();
                
                // Only log specific commands to reduce noise
                if (cmd.includes('copilot') || cmd.includes('chat')) {
                    debugChannel.appendLine(`[DEBUG] 🔧 COMMAND: ${command}`);
                    
                    // Copilot command detection
                    if (cmd.startsWith('github.copilot') || 
                        cmd.includes('copilot-chat') ||
                        cmd.includes('chat.send') ||
                        cmd === 'workbench.panel.chat.view.copilot.focus') {
                        
                        debugChannel.appendLine(`[DEBUG] 🎯 COPILOT COMMAND: ${command}`);
                        
                        const now = Date.now();
                        if (now - lastDetectedTime > 500) {
                            lastDetectedTime = now;
                            debugChannel.appendLine('[DEBUG] 🚀 COMMAND HOOK DETECTION!');
                            handleAIActivity();
                        }
                    }
                }
                
                return originalExecuteCommand.apply(this, [command, ...args]);
            };
            
            debugChannel.appendLine('[DEBUG] ✅ Command hook attempted (may not work in dev host)');
        } catch (error) {
            debugChannel.appendLine(`[DEBUG] ⚠️ Command hook failed: ${error}`);
        }
    }
    
    debugChannel.appendLine('[DEBUG] ✅ Basic detection with selected methods installed');
    debugChannel.appendLine('[DEBUG] 💡 If automatic detection fails, use Ctrl+Shift+P → "SpecStoryAutoSave: Force AI Notification"');

    // Method 2: Monitor panel state changes
    const disposable2 = vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
            debugChannel.appendLine('[DEBUG] �️ Window focus changed - checking for chat activity');
            
            // Check if any chat-related commands are available
            vscode.commands.getCommands(true).then(commands => {
                const activeChatCommands = commands.filter(cmd => 
                    cmd.includes('github.copilot-chat') || 
                    cmd.includes('workbench.panel.chat.view.copilot')
                );
                
                if (activeChatCommands.length > 0) {
                    debugChannel.appendLine(`[DEBUG] 💬 Found ${activeChatCommands.length} active chat commands`);
                }
            });
        }
    });
    
    // Method 3: Try command hook (may not work in Extension Development Host)
    try {
        const originalExecuteCommand = vscode.commands.executeCommand;
        
        (vscode.commands as any).executeCommand = async function(command: string, ...args: any[]) {
            const cmd = command.toLowerCase();
            
            // Only log specific commands to reduce noise
            if (cmd.includes('copilot') || cmd.includes('chat')) {
                debugChannel.appendLine(`[DEBUG] 🔧 COMMAND: ${command}`);
                
                // Copilot command detection
                if (cmd.startsWith('github.copilot') || 
                    cmd.includes('copilot-chat') ||
                    cmd.includes('chat.send') ||
                    cmd === 'workbench.panel.chat.view.copilot.focus') {
                    
                    debugChannel.appendLine(`[DEBUG] 🎯 COPILOT COMMAND: ${command}`);
                    
                    const now = Date.now();
                    if (now - lastDetectedTime > 500) {
                        lastDetectedTime = now;
                        debugChannel.appendLine('[DEBUG] 🚀 COMMAND HOOK DETECTION!');
                        handleAIActivity();
                    }
                }
            }
            
            return originalExecuteCommand.apply(this, [command, ...args]);
        };
        
        debugChannel.appendLine('[DEBUG] ✅ Command hook attempted (may not work in dev host)');
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] ⚠️ Command hook failed: ${error}`);
    }
    
    debugChannel.appendLine('[DEBUG] ✅ Basic detection with multiple fallback methods installed');
    debugChannel.appendLine('[DEBUG] 💡 If automatic detection fails, use Ctrl+Shift+P → "SpecStoryAutoSave: Force AI Notification"');
}

function initializeAdvancedDetection() {
    debugChannel.appendLine('[DEBUG] 🔍 Initializing ADVANCED detection (panels + patterns)...');
    
    // Enhanced webview detection for Copilot Chat
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) return;
        
        const uri = editor.document.uri;
        const scheme = uri.scheme;
        const path = uri.path;
        const fullUri = uri.toString();
        
        debugChannel.appendLine(`[DEBUG] 👁️ Editor changed: ${scheme}:${path}`);
        
        // Skip our own debug channels
        if (path.includes('SpecStoryAutoSave') || scheme === 'output') {
            return;
        }
        
        // Enhanced detection for webview-based chat
        if (scheme === 'webview-panel' || 
            fullUri.includes('copilot') ||
            fullUri.includes('chat') ||
            scheme.includes('copilot') || 
            scheme.includes('webview') ||
            path.includes('copilot') ||
            path.includes('chat')) {
            
            debugChannel.appendLine(`[DEBUG] 👁️ POTENTIAL COPILOT PANEL: ${fullUri}`);
            
            const now = Date.now();
            if (now - lastDetectedTime > 3000) {
                lastDetectedTime = now;
                debugChannel.appendLine('[DEBUG] 🚀 ADVANCED WEBVIEW DETECTION!');
                handleAIActivity();
            }
        }
    });
    
    // Webview and keyboard detection
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) return;
        
        const uri = editor.document.uri;
        const scheme = uri.scheme;
        const path = uri.path;
        const fullUri = uri.toString();
        
        debugChannel.appendLine(`[DEBUG] �️ Editor changed: ${scheme}:${path}`);
    });
    
    // Document pattern detection (with filtering)
    vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const content = event.document.getText();
        
        // Skip our own channels and non-relevant documents
        if (uri.includes('extension-output') || 
            uri.includes('SpecStoryAutoSave') ||
            uri.includes('output:')) {
            return;
        }
        
        // Look for AI patterns in relevant documents
        if (uri.includes('copilot') || 
            uri.includes('chat') ||
            (uri.includes('webview') && !uri.includes('extension-output'))) {
            
            const aiPatterns = [
                /ccreq:/i,
                /github[\s\-_]?copilot/i,
                /user:\s*\n/i,
                /assistant:\s*\n/i,
                /requestId:/i,
                /finish\s+reason:/i,
                /GitHub\s+Copilot/i,
                /@workspace/i,
                /@terminal/i
            ];
            
            const hasAIPattern = aiPatterns.some(pattern => pattern.test(content));
            
            if (hasAIPattern && content.length > 10) {
                debugChannel.appendLine(`[DEBUG] 🔍 AI PATTERN in: ${uri.substring(0, 50)}...`);
                
                const now = Date.now();
                if (now - lastDetectedTime > 2000) {
                    lastDetectedTime = now;
                    debugChannel.appendLine('[DEBUG] 🔍 AI PATTERN DETECTED!');
                    debugChannel.appendLine('[DEBUG] 🚀 ADVANCED PATTERN DETECTION!');
                    handleAIActivity();
                }
            }
        }
    });
    
    debugChannel.appendLine('[DEBUG] ✅ Advanced detection with webview hooks installed');
}

function initializeAggressiveDetection(shouldUseCodeInsertion: boolean = false, shouldUseMemory: boolean = false, shouldUseTerminal: boolean = false, shouldUseFileSystem: boolean = false, shouldUseKeyboardActivity: boolean = false) {
    debugChannel.appendLine('[DEBUG] ⚡ Initializing AGGRESSIVE detection (all methods)...');
    
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableCodeDetection = shouldUseCodeInsertion || config.get<boolean>('enableCodeInsertionDetection', false);
    
    if (enableCodeDetection) {
        // Code insertion detection
        let documentVersions = new Map<string, { version: number, length: number }>();
        
        vscode.workspace.onDidChangeTextDocument((event) => {
            const uri = event.document.uri.toString();
            
            // Skip debug channels
            if (uri.includes('extension-output') || uri.includes('SpecStoryAutoSave')) {
                return;
            }
            
            const currentLength = event.document.getText().length;
            const currentVersion = event.document.version;
            
            const previous = documentVersions.get(uri);
            if (previous) {
                const lengthDiff = currentLength - previous.length;
                const versionDiff = currentVersion - previous.version;
                
                // Large text insertion (AI completion)
                if (lengthDiff > 100 && versionDiff === 1) {
                    debugChannel.appendLine(`[DEBUG] 📈 Large text insertion: +${lengthDiff} chars`);
                    
                    const now = Date.now();
                    if (now - lastDetectedTime > 2000) {
                        lastDetectedTime = now;
                        debugChannel.appendLine('[DEBUG] 🚀 AGGRESSIVE CODE DETECTION!');
                        handleAIActivity();
                    }
                }
            }
            
            documentVersions.set(uri, { version: currentVersion, length: currentLength });
        });
        
        debugChannel.appendLine('[DEBUG] 📝 Code insertion detection enabled');
    }
    
    // Memory monitoring (less aggressive than before)
    if (shouldUseMemory) {
        let lastMemoryCheck = process.memoryUsage().heapUsed;
        let consecutiveSpikes = 0;
        
        setInterval(() => {
            try {
                const currentMemory = process.memoryUsage().heapUsed;
                const memoryIncrease = currentMemory - lastMemoryCheck;
                
                if (memoryIncrease > 50000000) { // 50MB increase
                    consecutiveSpikes++;
                    
                    if (consecutiveSpikes >= 3) {
                        debugChannel.appendLine(`[DEBUG] 🧠 Sustained memory activity: +${Math.round(memoryIncrease/1000000)}MB`);
                        
                        const now = Date.now();
                        if (now - lastDetectedTime > 10000) {
                            lastDetectedTime = now;
                            debugChannel.appendLine('[DEBUG] 🚀 AGGRESSIVE MEMORY DETECTION!');
                            handleAIActivity();
                        }
                        consecutiveSpikes = 0;
                    }
                } else {
                    consecutiveSpikes = Math.max(0, consecutiveSpikes - 1);
                }
                
                lastMemoryCheck = currentMemory;
            } catch (error) {
                // Ignore memory errors
            }
        }, 5000);
        
        debugChannel.appendLine('[DEBUG] 🧠 Memory monitoring enabled');
    }
    
    // Terminal activity detection
    if (shouldUseTerminal) {
        vscode.window.onDidOpenTerminal((terminal) => {
            debugChannel.appendLine('[DEBUG] 📟 Terminal opened - checking for AI activity');
            const now = Date.now();
            if (now - lastDetectedTime > 3000) {
                lastDetectedTime = now;
                debugChannel.appendLine('[DEBUG] 🚀 TERMINAL DETECTION!');
                handleAIActivity();
            }
        });
        
        vscode.window.onDidCloseTerminal((terminal) => {
            debugChannel.appendLine('[DEBUG] 📟 Terminal closed - checking for AI activity');
            const now = Date.now();
            if (now - lastDetectedTime > 3000) {
                lastDetectedTime = now;
                debugChannel.appendLine('[DEBUG] 🚀 TERMINAL CLOSE DETECTION!');
                handleAIActivity();
            }
        });
        
        debugChannel.appendLine('[DEBUG] 📟 Terminal monitoring enabled');
    }
    
    // File system activity detection
    if (shouldUseFileSystem) {
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        let fileChangeCount = 0;
        let fileChangeTimer: NodeJS.Timeout | undefined;
        
        const onFileChange = () => {
            fileChangeCount++;
            
            if (fileChangeTimer) {
                clearTimeout(fileChangeTimer);
            }
            
            fileChangeTimer = setTimeout(() => {
                if (fileChangeCount >= 3) { // Multiple file changes in short time
                    const now = Date.now();
                    if (now - lastDetectedTime > 2000) {
                        lastDetectedTime = now;
                        debugChannel.appendLine(`[DEBUG] 🚀 FILE SYSTEM DETECTION! (${fileChangeCount} changes)`);
                        handleAIActivity();
                    }
                }
                fileChangeCount = 0;
            }, 1000);
        };
        
        fileWatcher.onDidCreate(onFileChange);
        fileWatcher.onDidChange(onFileChange);
        fileWatcher.onDidDelete(onFileChange);
        
        debugChannel.appendLine('[DEBUG] 📁 File system monitoring enabled');
    }
    
    // Keyboard activity detection
    if (shouldUseKeyboardActivity) {
        let keyPressCount = 0;
        let keyPressTimer: NodeJS.Timeout | undefined;
        
        vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.contentChanges.length > 0) {
                const totalChars = e.contentChanges.reduce((sum, change) => sum + change.text.length, 0);
                
                // Only detect very large insertions (typical for AI code generation)
                if (totalChars > 200) { // Much higher threshold - AI typically generates lots of code at once
                    keyPressCount += totalChars;
                    
                    if (keyPressTimer) {
                        clearTimeout(keyPressTimer);
                    }
                    
                    keyPressTimer = setTimeout(() => {
                        if (keyPressCount > 500) { // Very large amount of text - likely AI generated
                            const now = Date.now();
                            if (now - lastDetectedTime > 5000) { // Longer cooldown to prevent spam
                                lastDetectedTime = now;
                                debugChannel.appendLine(`[DEBUG] 🚀 KEYBOARD ACTIVITY DETECTION! (${keyPressCount} chars)`);
                                handleAIActivity();
                            }
                        }
                        keyPressCount = 0;
                    }, 2000); // Longer timeout to accumulate more changes
                }
            }
        });
        
        debugChannel.appendLine('[DEBUG] ⌨️ Keyboard activity monitoring enabled');
    }
    
    debugChannel.appendLine('[DEBUG] ✅ Aggressive detection installed');
}

function handleAIActivity() {
    aiPromptCounter++;
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableNotifications = config.get<boolean>('enableAICheckNotifications', true);
    const frequency = config.get<number>('aiNotificationFrequency', 1);
    
    debugChannel.appendLine(`[DEBUG] AI activity detected! Counter: ${aiPromptCounter}`);
    debugChannel.appendLine(`[DEBUG] Notifications enabled: ${enableNotifications}, Frequency: ${frequency}`);
    
    if (enableNotifications && (aiPromptCounter % frequency === 0)) {
        debugChannel.appendLine(`[DEBUG] Will show notification (counter ${aiPromptCounter} matches frequency ${frequency})`);
        showAINotificationImmediately().catch((error) => {
            debugChannel.appendLine(`[DEBUG] Error showing notification: ${error}`);
        });
    } else {
        debugChannel.appendLine(`[DEBUG] Notification skipped - notifications: ${enableNotifications}, counter: ${aiPromptCounter}, frequency: ${frequency}`);
    }
    
    updateStatusBar();
}

async function generateSmartNotificationMessage(): Promise<string> {
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
        const recentConversations = await readRecentSpecStoryConversations(specstoryPath, 10);
        if (!recentConversations || recentConversations.length === 0) {
            debugChannel.appendLine('[DEBUG] No recent conversations found, using default message');
            return defaultMessage;
        }
        
        // Generate message with recent prompts
        const smartMessage = generateMessageWithRecentPrompts(recentConversations);
        debugChannel.appendLine(`[DEBUG] Generated smart message based on ${recentConversations.length} recent conversations`);
        return smartMessage;
        
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] Error generating smart message: ${error}`);
        return defaultMessage;
    }
}

async function findSpecStoryHistoryPath(): Promise<string | null> {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const customPath = config.get<string>('specstoryHistoryPath', '');
    
    if (customPath) {
        debugChannel.appendLine(`[DEBUG] Using custom SpecStory path: ${customPath}`);
        return customPath;
    }
    
    // Auto-detect SpecStory folder in workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return null;
    }
    
    for (const folder of workspaceFolders) {
        const specstoryPath = vscode.Uri.joinPath(folder.uri, '.specstory', 'history');
        try {
            const stat = await vscode.workspace.fs.stat(specstoryPath);
            if (stat.type === vscode.FileType.Directory) {
                debugChannel.appendLine(`[DEBUG] Found SpecStory history at: ${specstoryPath.fsPath}`);
                return specstoryPath.fsPath;
            }
        } catch {
            // Directory doesn't exist, continue searching
        }
    }
    
    return null;
}

async function readRecentSpecStoryConversations(historyPath: string, count: number = 3): Promise<{content: string, topic: string, timestamp: string}[] | null> {
    try {
        const historyUri = vscode.Uri.file(historyPath);
        const files = await vscode.workspace.fs.readDirectory(historyUri);
        
        // Get ALL .md files (not just the requested count)
        const mdFiles = files
            .filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File)
            .map(([name]) => name);
        
        debugChannel.appendLine(`[DEBUG] Found ${mdFiles.length} SpecStory files to process`);
        
        if (mdFiles.length === 0) {
            return null;
        }
        
        const conversations = [];
        
        for (const fileName of mdFiles) {
            const fileUri = vscode.Uri.joinPath(historyUri, fileName);
            
            // Force refresh the file content by checking modification time
            try {
                const fileStat = await vscode.workspace.fs.stat(fileUri);
                debugChannel.appendLine(`[DEBUG] File ${fileName} last modified: ${new Date(fileStat.mtime)}`);
            } catch (e) {
                debugChannel.appendLine(`[DEBUG] Could not get file stats for ${fileName}: ${e}`);
            }
            
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(fileContent).toString('utf8');
            
            // Debug: show file size and first few lines to verify content
            const lines = content.split('\n');
            debugChannel.appendLine(`[DEBUG] File ${fileName}: ${content.length} chars, ${lines.length} lines`);
            debugChannel.appendLine(`[DEBUG] First 3 lines: ${lines.slice(0, 3).join(' | ')}`);
            debugChannel.appendLine(`[DEBUG] Last 3 lines: ${lines.slice(-3).join(' | ')}`);
            
            // Extract topic from filename: 2025-08-03_07-59Z-user-greeting-and-request-for-assistance.md
            const topicMatch = fileName.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}Z-(.+)\.md$/);
            const topic = topicMatch ? topicMatch[1].replace(/-/g, ' ') : 'conversation';
            
            // Extract timestamp for sorting
            const timestampMatch = fileName.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}Z)/);
            const timestamp = timestampMatch ? timestampMatch[1] : '';
            
            conversations.push({ content, topic, timestamp });
            debugChannel.appendLine(`[DEBUG] Loaded file: ${fileName} (${timestamp})`);
        }
        
        // Sort conversations by timestamp (newest first) 
        conversations.sort((a, b) => {
            const timeA = new Date(a.timestamp.replace('_', 'T').replace('Z', ':00Z')).getTime();
            const timeB = new Date(b.timestamp.replace('_', 'T').replace('Z', ':00Z')).getTime();
            return timeB - timeA; // Newest first
        });
        
        debugChannel.appendLine(`[DEBUG] Sorted ${conversations.length} conversations by timestamp`);
        return conversations;
        
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] Error reading SpecStory conversations: ${error}`);
        return null;
    }
}

function generateMessageWithRecentPrompts(conversations: {content: string, topic: string, timestamp: string}[]): string {
    const i18n = require('./i18n');
    
    if (conversations.length === 0) {
        return 'AI prompt detected! Please check:\n• Did AI understand your question correctly?\n• If working with HTML, inspect for invisible elements\n• Verify the response quality and accuracy';
    }
    
    // Extract recent user prompts from conversations
    const allPrompts: {text: string, timestamp: string}[] = [];
    
    // Sort conversations by timestamp to ensure chronological order
    const sortedConversations = conversations.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (const conversation of sortedConversations) {
        const content = conversation.content;
        
        // Debug: log file being processed
        debugChannel.appendLine(`[DEBUG] Processing file: ${conversation.topic} (${conversation.timestamp})`);
        
        // Split by _**User**_ to find user messages
        const userMessages = content.split('_**User**_');
        debugChannel.appendLine(`[DEBUG] Found ${userMessages.length - 1} user messages in file`);
        
        for (let i = 1; i < userMessages.length; i++) { // Skip first split (before first user message)
            const userPart = userMessages[i];
            // Extract text until next _**Assistant**_ or end
            const endMatch = userPart.indexOf('_**Assistant**_');
            const userText = endMatch !== -1 ? userPart.substring(0, endMatch) : userPart;
            
            // Clean up the text (remove ---, newlines, extra spaces)
            const cleanText = userText
                .replace(/---/g, '')
                .replace(/\n+/g, ' ')
                .trim();
            
            if (cleanText && cleanText.length > 10) { // Only meaningful prompts
                allPrompts.push({
                    text: cleanText,
                    timestamp: conversation.timestamp
                });
                // Debug: log each prompt as it's added
                debugChannel.appendLine(`[DEBUG] Added prompt ${allPrompts.length}: ${cleanText.substring(0, 50)}...`);
            }
        }
    }
    
    debugChannel.appendLine(`[DEBUG] Total prompts collected: ${allPrompts.length}`);
    
    // Sort all prompts by timestamp and take the last 3
    allPrompts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastPrompts = allPrompts.slice(-3).map(p => p.text);
    debugChannel.appendLine(`[DEBUG] Selected last 3 prompts for display (from ${allPrompts.length} total)`);
    
    // Debug: log the selected prompts
    lastPrompts.forEach((prompt, index) => {
        debugChannel.appendLine(`[DEBUG] Selected prompt ${index + 1}: ${prompt.substring(0, 50)}...`);
    });
    
    if (lastPrompts.length === 0) {
        return 'AI prompt detected! Please check:\n• Did AI understand your question correctly?\n• If working with HTML, inspect for invisible elements\n• Verify the response quality and accuracy';
    }
    
    // Format prompts for display - single line with separators for VS Code notifications
    const promptsList = lastPrompts.map((prompt, index) => {
        const shortPrompt = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
        return shortPrompt;
    }).join(' | ');
    
    // Generate context-aware message with recent prompts
    const contextAnalysis = analyzePromptsContext(lastPrompts);
    
    try {
        switch (contextAnalysis.type) {
            case 'debug':
                return i18n.t('ai.smartDebug', promptsList);
            case 'ui':
                return i18n.t('ai.smartUI', promptsList);
            case 'database':
                return i18n.t('ai.smartDatabase', promptsList);
            case 'api':
                return i18n.t('ai.smartAPI', promptsList);
            case 'performance':
                return i18n.t('ai.smartPerformance', promptsList);
            case 'security':
                return i18n.t('ai.smartSecurity', promptsList);
            default:
                return i18n.t('ai.smartDefault', conversations[0]?.topic || 'code', promptsList);
        }
    } catch (error) {
        // Fallback if i18n fails - minimal message
        return `AI responded! Prompts: ${promptsList}`;
    }
}

function analyzePromptsContext(prompts: string[]): {type: string, focus: string, checks: string} {
    const allText = prompts.join(' ').toLowerCase();
    
    if (allText.includes('debug') || allText.includes('error') || allText.includes('bug') || allText.includes('fix')) {
        return {
            type: 'debug',
            focus: 'debugging',
            checks: 'Fixed root cause? No new bugs? Test edge cases?'
        };
    }
    
    if (allText.includes('html') || allText.includes('css') || allText.includes('style') || allText.includes('design')) {
        return {
            type: 'ui',
            focus: 'UI/design',
            checks: 'Responsive design? Accessibility? Cross-browser compatibility?'
        };
    }
    
    if (allText.includes('database') || allText.includes('sql') || allText.includes('query')) {
        return {
            type: 'database',
            focus: 'database',
            checks: 'Data integrity? Performance impact? Backup strategy?'
        };
    }
    
    if (allText.includes('api') || allText.includes('endpoint') || allText.includes('request')) {
        return {
            type: 'api',
            focus: 'API',
            checks: 'Error handling? Security? API documentation?'
        };
    }
    
    if (allText.includes('performance') || allText.includes('optimize') || allText.includes('slow')) {
        return {
            type: 'performance',
            focus: 'performance',
            checks: 'Actual speedup achieved? Memory leaks? Functionality regression?'
        };
    }
    
    if (allText.includes('security') || allText.includes('auth') || allText.includes('login') || allText.includes('password')) {
        return {
            type: 'security',
            focus: 'security',
            checks: 'Proper encryption? Input validation? Security best practices?'
        };
    }
    
    return {
        type: 'default',
        focus: 'code',
        checks: 'Meets requirements? No breaking changes? Documentation updated?'
    };
}

async function readLatestSpecStoryConversation(historyPath: string): Promise<{content: string, topic: string, timestamp: string} | null> {
    try {
        const historyUri = vscode.Uri.file(historyPath);
        const files = await vscode.workspace.fs.readDirectory(historyUri);
        
        // Filter only .md files and sort by name (which includes timestamp)
        const mdFiles = files
            .filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File)
            .map(([name]) => name)
            .sort()
            .reverse(); // Latest first
        
        if (mdFiles.length === 0) {
            return null;
        }
        
        // Read the latest file
        const latestFile = mdFiles[0];
        const fileUri = vscode.Uri.joinPath(historyUri, latestFile);
        const fileContent = await vscode.workspace.fs.readFile(fileUri);
        const content = Buffer.from(fileContent).toString('utf8');
        
        // Extract topic from filename: 2025-08-03_07-59Z-user-greeting-and-request-for-assistance.md
        const topicMatch = latestFile.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}Z-(.+)\.md$/);
        const topic = topicMatch ? topicMatch[1].replace(/-/g, ' ') : 'conversation';
        
        // Extract timestamp
        const timestampMatch = latestFile.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}Z)/);
        const timestamp = timestampMatch ? timestampMatch[1] : '';
        
        return { content, topic, timestamp };
        
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] Error reading SpecStory conversation: ${error}`);
        return null;
    }
}

function generateContextAwareMessage(conversation: {content: string, topic: string, timestamp: string}): string {
    const content = conversation.content.toLowerCase();
    const topic = conversation.topic.toLowerCase();
    
    // Analyze content for different contexts
    if (content.includes('debug') || content.includes('error') || content.includes('bug') || content.includes('fix')) {
        return 'AI právě debugoval! Zkontroluj:\n• Opravil skutečnou příčinu problému?\n• Nezavedl nové bugy?\n• Testuj edge cases a boundary conditions';
    }
    
    if (content.includes('html') || content.includes('css') || content.includes('style') || content.includes('design') || content.includes('responsive')) {
        return 'AI pracoval s UI! Zkontroluj:\n• Responzivní design na různých zařízeních\n• Accessibility (ARIA, contrast, keyboard navigation)\n• Cross-browser kompatibilita';
    }
    
    if (content.includes('database') || content.includes('sql') || content.includes('query') || content.includes('table')) {
        return 'AI upravoval databázi! Zkontroluj:\n• Data integrity a constraints\n• Performance impact na velká data\n• Backup strategie před změnami';
    }
    
    if (content.includes('api') || content.includes('endpoint') || content.includes('request') || content.includes('response')) {
        return 'AI vytvořil API! Zkontroluj:\n• Error handling pro všechny edge cases\n• Security (authentication, authorization)\n• API dokumentace a testování';
    }
    
    if (content.includes('performance') || content.includes('optimize') || content.includes('slow') || content.includes('speed')) {
        return 'AI optimalizoval performance! Zkontroluj:\n• Skutečné zrychlení (měření před/po)\n• Memory leaks a resource usage\n• Nedošlo k regresi funkcjonality';
    }
    
    if (content.includes('security') || content.includes('auth') || content.includes('login') || content.includes('password')) {
        return 'AI pracoval se security! Zkontroluj:\n• Proper encryption a hashing\n• Input validation a sanitization\n• Security best practices dodrženy';
    }
    
    if (content.includes('test') || content.includes('unit') || content.includes('integration')) {
        return 'AI vytvořil testy! Zkontroluj:\n• Test coverage skutečně důležitých částí\n• Edge cases a error scenarios\n• Testy jsou maintainable a čitelné';
    }
    
    // Default smart message based on topic
    return `AI pracoval na "${conversation.topic}"! Zkontroluj:\n• Kód splňuje původní požadavky?\n• Nezavedl side effects nebo breaking changes?\n• Dokumentace a komentáře jsou aktuální`;
}

async function showAINotificationImmediately() {
    debugChannel.appendLine('[DEBUG] Showing AI notification immediately');
    
    // Generate smart message
    const message = await generateSmartNotificationMessage();
    debugChannel.appendLine(`[DEBUG] Message: ${message}`);
    
    // Clear any existing countdown
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = undefined;
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
            'Everything OK',
            'Dismiss'
        );
        
        switch (action) {
            case 'Check Status':
                debugChannel.appendLine('[DEBUG] User will check the AI response status');
                break;
            case 'Everything OK':
                debugChannel.appendLine('[DEBUG] User confirmed AI response is correct - everything OK');
                break;
            case 'Dismiss':
                debugChannel.appendLine('[DEBUG] User dismissed notification');
                break;
        }
    } else if (displayType === 'activitybar') {
        // Use activity bar view
        debugChannel.appendLine('[DEBUG] Using activity bar display');
        aiActivityProvider.addNotification(message);
        
        // Focus the activity bar view
        vscode.commands.executeCommand('workbench.view.extension.specstoryAI');
        
    } else {
        // Use webview panel
        if (!aiNotificationPanel) {
            // Create new panel only if none exists
            debugChannel.appendLine('[DEBUG] Creating new webview panel for AI notification...');
            
            aiNotificationPanel = vscode.window.createWebviewPanel(
                'aiNotification',
                '🤖 AI Activity Detected',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            
            // Handle panel disposal
            aiNotificationPanel.onDidDispose(() => {
                debugChannel.appendLine('[DEBUG] AI notification panel disposed');
                aiNotificationPanel = undefined;
            });
            
            // Handle messages from webview
            aiNotificationPanel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'checkStatus':
                            debugChannel.appendLine('[DEBUG] User will check the AI response status');
                            if (aiNotificationPanel) {
                                aiNotificationPanel.dispose();
                            }
                            return;
                        case 'everythingOK':
                            debugChannel.appendLine('[DEBUG] User confirmed AI response is correct - everything OK');
                            if (aiNotificationPanel) {
                                aiNotificationPanel.dispose();
                            }
                            return;
                        case 'dismiss':
                            debugChannel.appendLine('[DEBUG] User dismissed notification');
                            if (aiNotificationPanel) {
                                aiNotificationPanel.dispose();
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
        
        // Update panel content (for both new and existing panels)
        aiNotificationPanel.webview.html = getWebviewContent(message);
        
        // Bring panel to focus
        aiNotificationPanel.reveal(vscode.ViewColumn.Beside);
        
        // Auto-close after 30 seconds (clear previous timer)
        setTimeout(() => {
            if (aiNotificationPanel && aiNotificationPanel.visible) {
                debugChannel.appendLine('[DEBUG] Auto-closing AI notification panel after 30 seconds');
                aiNotificationPanel.dispose();
            }
        }, 30000);
    }
    
    debugChannel.appendLine('[DEBUG] AI notification ready');
}

function updateStatusBar() {
    if (!countdownTimer) {
        // Get extension version from package.json
        const packageJson = require('../package.json');
        const version = packageJson.version || '1.0.0';
        statusBarItem.text = `$(robot) AI: ${aiPromptCounter} v${version}`;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.show();
    }
}

export function deactivate() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
    if (debugChannel) {
        debugChannel.dispose();
    }
}

function getWebviewContent(message: string): string {
    // Parse the message to extract prompts
    const parts = message.split('Prompts: ');
    const title = parts[0] || 'AI Activity Detected!';
    const promptsText = parts[1] || '';
    const prompts = promptsText.split(' | ').filter(p => p.length > 0);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Activity Detected</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            padding: 20px;
            margin: 0;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 20px;
            font-size: 18px;
        }
        .prompts-section {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
        .prompts-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-textPreformat-foreground);
        }
        .prompt-item {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px 12px;
            margin: 8px 0;
            font-family: 'Courier New', Consolas, monospace;
            font-size: 13px;
            color: var(--vscode-input-foreground);
        }
        .buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            justify-content: center;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .primary {
            background: var(--vscode-button-background);
        }
        .secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .dismiss {
            background: transparent;
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 ${title.replace('!', '')}</h1>
        
        <div class="prompts-section">
            <div class="prompts-title">📝 Recent AI Prompts:</div>
            ${prompts.map(prompt => `<div class="prompt-item">• ${prompt.trim()}</div>`).join('')}
        </div>
        
        <div class="buttons">
            <button class="primary" onclick="checkStatus()">🔍 Will Check Status</button>
            <button class="secondary" onclick="everythingOK()">✅ Everything OK</button>
            <button class="dismiss" onclick="dismiss()">❌ Dismiss</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function checkStatus() {
            vscode.postMessage({
                command: 'checkStatus'
            });
        }
        
        function everythingOK() {
            vscode.postMessage({
                command: 'everythingOK'
            });
        }
        
        function dismiss() {
            vscode.postMessage({
                command: 'dismiss'
            });
        }
    </script>
</body>
</html>`;
}
