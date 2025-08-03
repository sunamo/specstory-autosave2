import * as vscode from 'vscode';

// Import modular components
import { AIActivityProvider } from './activityProvider';
import { initializeBasicDetection } from './detection/basicDetection';
import { initializeAdvancedDetection } from './detection/advancedDetection';
import { initializeAggressiveDetection } from './detection/aggressiveDetection';
import { showAINotificationImmediately } from './notifications/notificationManager';
import { handleAIActivity, generateSmartNotificationMessage, updateStatusBar } from './utils/aiActivityHandler';

// Global variables
let outputChannel: vscode.OutputChannel;
let debugChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let copilotOutputChannel: vscode.OutputChannel | undefined;
let aiPromptCounter = { value: 0 };
let lastDetectedTime = { value: 0 };
let countdownTimer = { value: undefined as NodeJS.Timeout | undefined };
let aiNotificationPanel = { value: undefined as vscode.WebviewPanel | undefined };
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
    updateStatusBar(statusBarItem, aiPromptCounter);
    
    debugChannel.appendLine('[DEBUG] Extension activated');
    debugChannel.show(); // Show debug channel immediately
    console.log('SpecStoryAutoSave extension is now active!');

    // Initialize Copilot monitoring
    initializeCopilotMonitoring(context);
    
    // Register commands
    registerCommands(context);
    
    debugChannel.appendLine('[DEBUG] All components initialized successfully');
}

function initializeCopilotMonitoring(context: vscode.ExtensionContext) {
    debugChannel.appendLine('[DEBUG] 🔍 Initializing Copilot monitoring system...');
    
    // Activate Copilot extensions first
    activateCopilotExtensions();
    
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const detectionLevel = config.get<string>('detectionLevel', 'basic');
    
    debugChannel.appendLine(`[DEBUG] Detection level: ${detectionLevel}`);
    
    // Set up detection based on configuration level
    performDiagnostics(detectionLevel);
    
    switch (detectionLevel) {
        case 'off':
            debugChannel.appendLine('[DEBUG] ❌ AI Detection is OFF - no monitoring will be performed');
            break;
            
        case 'basic':
            {
                const enableCommandHook = config.get<boolean>('enableCommandHookDetection', true);
                const enableWebview = config.get<boolean>('enableWebviewDetection', true);  
                const enablePanelFocus = config.get<boolean>('enablePanelFocusDetection', false);
                
                const disposables = initializeBasicDetection(
                    () => handleAIActivity(aiPromptCounter, debugChannel, async () => {
                        const message = await generateSmartNotificationMessage(debugChannel);
                        await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                    }, () => updateStatusBar(statusBarItem, aiPromptCounter)),
                    debugChannel,
                    lastDetectedTime,
                    enableCommandHook,
                    enableWebview,
                    enablePanelFocus
                );
                
                disposables.forEach(d => context.subscriptions.push(d));
            }
            break;
            
        case 'advanced':
            {
                // Basic detection first
                const enableCommandHook = config.get<boolean>('enableCommandHookDetection', true);
                const enableWebview = config.get<boolean>('enableWebviewDetection', true);  
                const enablePanelFocus = config.get<boolean>('enablePanelFocusDetection', false);
                
                const basicDisposables = initializeBasicDetection(
                    () => handleAIActivity(aiPromptCounter, debugChannel, async () => {
                        const message = await generateSmartNotificationMessage(debugChannel);
                        await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                    }, () => updateStatusBar(statusBarItem, aiPromptCounter)),
                    debugChannel,
                    lastDetectedTime,
                    enableCommandHook,
                    enableWebview,
                    enablePanelFocus
                );
                
                // Advanced detection
                const advancedDisposables = initializeAdvancedDetection(
                    () => handleAIActivity(aiPromptCounter, debugChannel, async () => {
                        const message = await generateSmartNotificationMessage(debugChannel);
                        await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                    }, () => updateStatusBar(statusBarItem, aiPromptCounter)),
                    debugChannel,
                    lastDetectedTime
                );
                
                [...basicDisposables, ...advancedDisposables].forEach(d => context.subscriptions.push(d));
            }
            break;
            
        case 'aggressive':
            {
                // All detection methods
                const enableCommandHook = config.get<boolean>('enableCommandHookDetection', true);
                const enableWebview = config.get<boolean>('enableWebviewDetection', true);  
                const enablePanelFocus = config.get<boolean>('enablePanelFocusDetection', false);
                const enableCodeInsertion = config.get<boolean>('enableCodeInsertionDetection', false);
                const enableMemory = config.get<boolean>('enableMemoryDetection', false);
                const enableTerminal = config.get<boolean>('enableTerminalDetection', false);
                const enableFileSystem = config.get<boolean>('enableFileSystemDetection', false);
                const enableKeyboard = config.get<boolean>('enableKeyboardActivityDetection', false);
                
                const basicDisposables = initializeBasicDetection(
                    () => handleAIActivity(aiPromptCounter, debugChannel, async () => {
                        const message = await generateSmartNotificationMessage(debugChannel);
                        await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                    }, () => updateStatusBar(statusBarItem, aiPromptCounter)),
                    debugChannel,
                    lastDetectedTime,
                    enableCommandHook,
                    enableWebview,
                    enablePanelFocus
                );
                
                const advancedDisposables = initializeAdvancedDetection(
                    () => handleAIActivity(aiPromptCounter, debugChannel, async () => {
                        const message = await generateSmartNotificationMessage(debugChannel);
                        await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                    }, () => updateStatusBar(statusBarItem, aiPromptCounter)),
                    debugChannel,
                    lastDetectedTime
                );
                
                const aggressiveDisposables = initializeAggressiveDetection(
                    () => handleAIActivity(aiPromptCounter, debugChannel, async () => {
                        const message = await generateSmartNotificationMessage(debugChannel);
                        await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                    }, () => updateStatusBar(statusBarItem, aiPromptCounter)),
                    debugChannel,
                    lastDetectedTime,
                    enableCodeInsertion,
                    enableMemory,
                    enableTerminal,
                    enableFileSystem,
                    enableKeyboard
                );
                
                [...basicDisposables, ...advancedDisposables, ...aggressiveDisposables].forEach(d => context.subscriptions.push(d));
            }
            break;
    }
    
    debugChannel.appendLine('[DEBUG] ✅ Copilot monitoring system initialized');
}

async function activateCopilotExtensions() {
    debugChannel.appendLine('[DEBUG] 🔌 Attempting to activate Copilot extensions...');
    
    const copilotExtensions = [
        'GitHub.copilot',
        'GitHub.copilot-chat'
    ];
    
    for (const extensionId of copilotExtensions) {
        try {
            const extension = vscode.extensions.getExtension(extensionId);
            if (extension) {
                if (!extension.isActive) {
                    debugChannel.appendLine(`[DEBUG] 🔌 Activating ${extensionId}...`);
                    await extension.activate();
                }
                debugChannel.appendLine(`[DEBUG] ✅ ${extensionId} is active`);
            } else {
                debugChannel.appendLine(`[DEBUG] ❌ ${extensionId} not found`);
            }
        } catch (error) {
            debugChannel.appendLine(`[DEBUG] ⚠️ Could not activate ${extensionId}: ${error}`);
        }
    }
}

async function performDiagnostics(detectionLevel: string) {
    debugChannel.appendLine('[DEBUG] 🔍 Performing system diagnostics...');
    
    // Check if Copilot extensions are installed
    const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
    const copilotChatExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
    
    debugChannel.appendLine(`[DEBUG] GitHub Copilot extension: ${copilotExtension ? '✅ Found' : '❌ Not found'}`);
    debugChannel.appendLine(`[DEBUG] GitHub Copilot Chat extension: ${copilotChatExtension ? '✅ Found' : '❌ Not found'}`);
    
    // Check available commands
    const allCommands = await vscode.commands.getCommands(true);
    const copilotCommands = allCommands.filter(cmd => cmd.includes('copilot') || cmd.includes('chat'));
    debugChannel.appendLine(`[DEBUG] Found ${copilotCommands.length} Copilot-related commands`);
    
    // Log first few commands for debugging
    copilotCommands.slice(0, 5).forEach(cmd => {
        debugChannel.appendLine(`[DEBUG]   - ${cmd}`);
    });
    
    if (copilotCommands.length > 5) {
        debugChannel.appendLine(`[DEBUG]   ... and ${copilotCommands.length - 5} more`);
    }
    
    debugChannel.appendLine(`[DEBUG] Detection level: ${detectionLevel}`);
    debugChannel.appendLine('[DEBUG] ✅ Diagnostics completed');
}

function registerCommands(context: vscode.ExtensionContext) {
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

    // Register force AI notification command
    const forceAINotification = vscode.commands.registerCommand('specstoryautosave.forceAINotification', () => {
        debugChannel.appendLine('[DEBUG] 🔧 FORCE TRIGGER: User manually triggered AI notification');
        handleAIActivity(aiPromptCounter, debugChannel, async () => {
            const message = await generateSmartNotificationMessage(debugChannel);
            await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
        }, () => updateStatusBar(statusBarItem, aiPromptCounter));
    });

    // Register show prompt stats command
    const showPromptStats = vscode.commands.registerCommand('specstoryautosave.showPromptStats', () => {
        const message = `AI Prompts detected: ${aiPromptCounter.value}`;
        vscode.window.showInformationMessage(message);
        debugChannel.appendLine(`[DEBUG] ${message}`);
    });

    // Register reset counter command
    const resetCounter = vscode.commands.registerCommand('specstoryautosave.resetPromptCounter', () => {
        aiPromptCounter.value = 0;
        lastDetectedTime.value = 0;
        updateStatusBar(statusBarItem, aiPromptCounter);
        debugChannel.appendLine('[DEBUG] AI prompt counter reset to 0');
        vscode.window.showInformationMessage('AI prompt counter reset to 0');
    });

    // Add commands to context
    context.subscriptions.push(findSpecStoryCommands);
    context.subscriptions.push(forceAINotification);
    context.subscriptions.push(showPromptStats);
    context.subscriptions.push(resetCounter);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(debugChannel);
    
    debugChannel.appendLine('[DEBUG] All commands registered successfully');
}

export function deactivate() {
    if (countdownTimer.value) {
        clearInterval(countdownTimer.value);
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
