import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel;
let debugChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let copilotOutputChannel: vscode.OutputChannel | undefined;
let aiPromptCounter = 0;
let lastDetectedTime = 0;
let countdownTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    // Create output channels
    outputChannel = vscode.window.createOutputChannel('SpecStoryAutoSave');
    debugChannel = vscode.window.createOutputChannel('SpecStoryAutoSave Debug');
    
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
        showAINotificationImmediately();
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
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(debugChannel);
    
    debugChannel.appendLine('[DEBUG] All commands registered successfully');
}

function initializeCopilotMonitoring() {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const detectionLevel = config.get<string>('detectionLevel', 'off'); // 'off', 'basic', 'advanced', 'aggressive'
    
    // Individual detection method settings - some enabled for testing
    const enableCommandHook = config.get<boolean>('enableCommandHookDetection', true);  // Default TRUE for testing
    const enableWebview = config.get<boolean>('enableWebviewDetection', true);         // Default TRUE for testing
    const enablePanelFocus = config.get<boolean>('enablePanelFocusDetection', false);  // Default FALSE
    const enablePattern = config.get<boolean>('enablePatternDetection', false);        // Default FALSE
    const enableCodeInsertion = config.get<boolean>('enableCodeInsertionDetection', false); // Default FALSE
    const enableMemory = config.get<boolean>('enableMemoryDetection', false);          // Default FALSE
    
    debugChannel.appendLine(`[DEBUG] Initializing Copilot monitoring - Level: ${detectionLevel}`);
    debugChannel.appendLine(`[DEBUG] Individual settings: CommandHook=${enableCommandHook}, Webview=${enableWebview}, PanelFocus=${enablePanelFocus}, Pattern=${enablePattern}, CodeInsertion=${enableCodeInsertion}, Memory=${enableMemory}`);
    
    if (detectionLevel === 'off' && !enableCommandHook && !enableWebview && !enablePanelFocus && !enablePattern && !enableCodeInsertion && !enableMemory) {
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
        
        if (shouldUseCommandHook || shouldUseWebview || shouldUsePanelFocus) {
            initializeBasicDetection(shouldUseCommandHook, shouldUseWebview, shouldUsePanelFocus);
        }
        
        if (shouldUsePattern) {
            initializeAdvancedDetection();
        }
        
        if (shouldUseCodeInsertion || shouldUseMemory) {
            initializeAggressiveDetection(shouldUseCodeInsertion, shouldUseMemory);
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
}

function initializeAdvancedDetection() {
    debugChannel.appendLine('[DEBUG] 🔍 Initializing ADVANCED detection (pattern matching)...');
    
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
                    debugChannel.appendLine('[DEBUG] 🚀 ADVANCED PATTERN DETECTION!');
                    handleAIActivity();
                }
            }
        }
    });
    
    debugChannel.appendLine('[DEBUG] ✅ Advanced detection with pattern matching installed');
}

function initializeAggressiveDetection(enableCodeInsertion: boolean = false, enableMemory: boolean = false) {
    debugChannel.appendLine(`[DEBUG] ⚡ Initializing AGGRESSIVE detection - CodeInsertion: ${enableCodeInsertion}, Memory: ${enableMemory}`);
    
    if (enableCodeInsertion) {
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
    
    if (enableMemory) {
        // Memory monitoring (less aggressive than before)
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
    
    debugChannel.appendLine('[DEBUG] ✅ Aggressive detection installed');
}

function handleAIActivity() {
    aiPromptCounter++;
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableNotifications = config.get<boolean>('enableAICheckNotifications', true);
    const frequency = config.get<number>('aiNotificationFrequency', 1);
    
    debugChannel.appendLine(`[DEBUG] AI activity detected! Counter: ${aiPromptCounter}`);
    
    if (enableNotifications && (aiPromptCounter % frequency === 0)) {
        showAINotificationImmediately();
    }
    
    updateStatusBar();
}

function showAINotificationImmediately() {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const defaultMessage = 'AI prompt detected! Please check:\n• Did AI understand your question correctly?\n• If working with HTML, inspect for invisible elements\n• Verify the response quality and accuracy';
    const message = config.get<string>('aiNotificationMessage', defaultMessage);
    
    debugChannel.appendLine('[DEBUG] Showing AI notification immediately');
    
    // Clear any existing countdown
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = undefined;
    }
    
    // Show the notification immediately
    vscode.window.showWarningMessage(message, 'Everything OK', 'Will Check Status').then((selection) => {
        if (selection === 'Everything OK') {
            debugChannel.appendLine('[DEBUG] User confirmed AI response is correct - everything OK');
        } else if (selection === 'Will Check Status') {
            debugChannel.appendLine('[DEBUG] User will check the AI response status');
        }
        debugChannel.appendLine('[DEBUG] AI notification dismissed');
    });
    
    // Update status bar to show detection
    statusBarItem.text = `$(robot) AI: ${aiPromptCounter} (Latest!)`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.show();
    
    // Reset status bar color after 3 seconds
    setTimeout(() => {
        updateStatusBar();
    }, 3000);
}

function updateStatusBar() {
    if (!countdownTimer) {
        statusBarItem.text = `$(robot) AI: ${aiPromptCounter}`;
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
