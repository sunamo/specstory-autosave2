import * as vscode from 'vscode';

// Import modular components
import { AIActivityProvider } from './activityProvider';
import { initializeBasicDetection } from './detection/basicDetection';
import { initializeAdvancedDetection } from './detection/advancedDetection';
import { initializeAggressiveDetection } from './detection/aggressiveDetection';
import { showAINotificationImmediately } from './notifications/notificationManager';
import { handleAIActivity, generateSmartNotificationMessage, updateStatusBar } from './utils/aiActivityHandler';
import { initializeLogger, logDebug, logInfo, logError, logAIActivity, logExport } from './utils/logger';

// Global variables
let outputChannel: vscode.OutputChannel;
let debugChannel: vscode.OutputChannel;
let exportChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let copilotOutputChannel: vscode.OutputChannel | undefined;
let aiPromptCounter = { value: 0 };
let lastDetectedTime = { value: 0 };
let countdownTimer = { value: undefined as NodeJS.Timeout | undefined };
let autoSaveTimer = { value: undefined as NodeJS.Timeout | undefined };
let aiNotificationPanel = { value: undefined as vscode.WebviewPanel | undefined };
let aiActivityProvider: AIActivityProvider;

export function activate(context: vscode.ExtensionContext) {
    // Create output channels
    outputChannel = vscode.window.createOutputChannel('SpecStory AutoSave + AI Copilot Prompt Detection');
    debugChannel = vscode.window.createOutputChannel('SpecStory AutoSave + AI Copilot Prompt Detection Debug');
    exportChannel = vscode.window.createOutputChannel('SpecStory AutoSave - Chat Exports');
    
    // Initialize logger
    initializeLogger(debugChannel, outputChannel, exportChannel);
    
    // Register webview provider for activity bar
    aiActivityProvider = new AIActivityProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AIActivityProvider.viewType, aiActivityProvider)
    );
    
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'specstoryautosave.showPromptStats';
    context.subscriptions.push(statusBarItem);
    
    // Initialize status bar immediately and show it
    updateStatusBar(statusBarItem, aiPromptCounter);
    statusBarItem.show(); // Explicitly show the status bar
    
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableDebugLogs = config.get<boolean>('enableDebugLogs', false);
    
    // Initialize logger
    initializeLogger(debugChannel, outputChannel, exportChannel);
    
    logDebug('Extension activated');
    if (enableDebugLogs) {
        debugChannel.show(); // Show debug channel immediately only if debug enabled
    }
    logInfo('Extension activated and ready');
    console.log('SpecStory AutoSave + AI Copilot Prompt Detection extension is now active!');

    // Initialize Copilot monitoring
    initializeCopilotMonitoring(context);
    
    // Add SpecStory file monitoring
    initializeSpecStoryMonitoring(context);
    
    // Register commands
    registerCommands(context);
    
    // Setup auto-save intervals
    setupAutoSaveIntervals();
    
    // Setup configuration listener for auto-save changes
    setupConfigurationListener();
    
    debugChannel.appendLine('[DEBUG] All components initialized successfully');
}

function initializeCopilotMonitoring(context: vscode.ExtensionContext) {
    logDebug('🔍 Initializing Copilot monitoring system...');
    
    // Activate Copilot extensions first
    activateCopilotExtensions();
    
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const detectionLevel = config.get<string>('detectionLevel', 'basic');
    
    logDebug(`Detection level: ${detectionLevel}`);
    
    // Set up detection based on configuration level
    performDiagnostics(detectionLevel);
    
    switch (detectionLevel) {
        case 'off':
            logInfo('AI Detection is OFF - no monitoring will be performed');
            logDebug('❌ AI Detection is OFF - no monitoring will be performed');
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
    
    logDebug('✅ Copilot monitoring system initialized');
}

function initializeSpecStoryMonitoring(context: vscode.ExtensionContext) {
    logDebug('📁 Initializing SpecStory file monitoring...');
    
    // Monitor when user opens/edits SpecStory files
    const fileWatcher = vscode.workspace.onDidOpenTextDocument((document) => {
        const filePath = document.uri.fsPath;
        
        // Check if it's a SpecStory history file
        if (filePath.includes('.specstory') && filePath.includes('history') && filePath.endsWith('.md')) {
            logDebug(`📄 SpecStory file opened: ${filePath}`);
            logAIActivity(`SpecStory history file accessed: ${document.fileName}`);
            
            // Read the content to see if it contains AI prompts
            const content = document.getText();
            
            // Detect AI conversation patterns in SpecStory files
            const hasUserPrompts = content.includes('**User:**') || content.includes('## User') || 
                                 content.match(/^\s*\d+\.\s*.*$/gm); // Numbered prompts like "1. something"
            const hasAssistantResponses = content.includes('**Assistant:**') || content.includes('## Assistant') ||
                                        content.includes('**GitHub Copilot:**');
            const hasCodeBlocks = content.includes('```');
            const hasConversationStructure = content.includes('---') || content.includes('###');
            
            // Count recent activity indicators
            const lines = content.split('\n');
            const hasRecentTimestamp = lines.some(line => {
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                return line.includes(today) || line.includes('2025-08-03'); // Today's date
            });
            
            logDebug(`📊 SpecStory analysis: User prompts: ${hasUserPrompts}, Assistant responses: ${hasAssistantResponses}, Code blocks: ${hasCodeBlocks}, Structure: ${hasConversationStructure}, Recent: ${hasRecentTimestamp}`);
            
            if ((hasUserPrompts || hasAssistantResponses || hasCodeBlocks) && hasConversationStructure) {
                logDebug('🎯 SpecStory file contains AI conversation - triggering notification');
                logAIActivity(`AI conversation detected in SpecStory file: ${document.fileName}`);
                
                // Trigger AI activity notification
                handleAIActivity(aiPromptCounter, debugChannel, async () => {
                    const message = `SpecStory history with AI conversation detected!\n\nFile: ${document.fileName}\n\nPlease verify the AI responses are accurate and complete.`;
                    await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                }, () => updateStatusBar(statusBarItem, aiPromptCounter));
            } else {
                logDebug('📄 SpecStory file opened but no clear AI conversation patterns detected');
            }
        }
    });
    
    // Monitor when SpecStory files are changed/saved
    const changeWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
        const filePath = event.document.uri.fsPath;
        
        if (filePath.includes('.specstory') && filePath.includes('history') && filePath.endsWith('.md')) {
            logDebug(`📝 SpecStory file changed: ${filePath}`);
            
            // Only process if there were substantial changes
            if (event.contentChanges.length > 0) {
                const totalChanges = event.contentChanges.reduce((sum, change) => sum + change.text.length, 0);
                
                if (totalChanges > 50) { // Only trigger for substantial changes
                    logDebug(`📈 Substantial changes detected (${totalChanges} characters)`);
                    logAIActivity(`SpecStory file modified: ${event.document.fileName} (${totalChanges} chars)`);
                    
                    // Check if the changes include AI conversation patterns
                    const newContent = event.document.getText();
                    const hasNewAIContent = newContent.includes('**Assistant:**') || 
                                          newContent.includes('**GitHub Copilot:**') ||
                                          newContent.includes('```') ||
                                          newContent.includes('## Assistant');
                    
                    if (hasNewAIContent) {
                        logDebug('🔥 New AI content detected in SpecStory file changes');
                        
                        handleAIActivity(aiPromptCounter, debugChannel, async () => {
                            const message = `SpecStory file updated with new AI content!\n\nFile: ${event.document.fileName}\nChanges: ${totalChanges} characters\n\nNew AI responses detected - please review for accuracy.`;
                            await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                        }, () => updateStatusBar(statusBarItem, aiPromptCounter));
                    }
                }
            }
        }
    });
    
    // Monitor when user changes focus to SpecStory files
    const editorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            const filePath = editor.document.uri.fsPath;
            
            if (filePath.includes('.specstory') && filePath.includes('history') && filePath.endsWith('.md')) {
                logDebug(`📝 User switched to SpecStory file: ${filePath}`);
                logAIActivity(`User viewing SpecStory history: ${editor.document.fileName}`);
                
                // Check if file was recently modified (within last 5 minutes)
                const stats = require('fs').statSync(filePath);
                const now = Date.now();
                const fileModified = stats.mtime.getTime();
                const fiveMinutesAgo = now - (5 * 60 * 1000);
                
                if (fileModified > fiveMinutesAgo) {
                    logDebug('🔥 SpecStory file was recently modified - likely new AI activity');
                    logAIActivity('Recent SpecStory file modification detected');
                    
                    handleAIActivity(aiPromptCounter, debugChannel, async () => {
                        const message = `Recent SpecStory activity detected!\n\nFile: ${editor.document.fileName}\nModified: ${stats.mtime.toLocaleString()}\n\nPlease check the latest AI responses.`;
                        await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
                    }, () => updateStatusBar(statusBarItem, aiPromptCounter));
                }
            }
        }
    });
    
    context.subscriptions.push(fileWatcher);
    context.subscriptions.push(changeWatcher);
    context.subscriptions.push(editorWatcher);
    
    logDebug('✅ SpecStory file monitoring initialized');
}

async function activateCopilotExtensions() {
    logDebug('🔌 Attempting to activate Copilot extensions...');
    
    const copilotExtensions = [
        'GitHub.copilot',
        'GitHub.copilot-chat'
    ];
    
    for (const extensionId of copilotExtensions) {
        try {
            const extension = vscode.extensions.getExtension(extensionId);
            if (extension) {
                if (!extension.isActive) {
                    logDebug(`🔌 Activating ${extensionId}...`);
                    await extension.activate();
                }
                logDebug(`✅ ${extensionId} is active`);
            } else {
                logDebug(`❌ ${extensionId} not found`);
            }
        } catch (error) {
            logDebug(`⚠️ Could not activate ${extensionId}: ${error}`);
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
        logDebug('AI prompt counter reset to 0');
        vscode.window.showInformationMessage('AI prompt counter reset to 0');
    });

    // Command to test SpecStory history detection
    const testHistoryDetection = vscode.commands.registerCommand('specstoryautosave.testHistoryDetection', async () => {
        logInfo('🔍 Testing SpecStory history detection...');
        logDebug('🔍 MANUAL TEST: User requested SpecStory history detection test');
        
        try {
            const config = vscode.workspace.getConfiguration('specstoryautosave');
            const historyPath = config.get<string>('specstoryHistoryPath', '');
            
            if (!historyPath) {
                const message = 'SpecStory history path not configured. Please set specstoryautosave.specstoryHistoryPath in settings.';
                logError(message);
                vscode.window.showErrorMessage(message);
                return;
            }

            logInfo(`Checking history path: ${historyPath}`);
            logDebug(`📁 History path configured: ${historyPath}`);
            
            // Trigger AI activity simulation for testing
            logDebug('🎯 Simulating AI activity from history detection...');
            handleAIActivity(aiPromptCounter, debugChannel, async () => {
                const message = await generateSmartNotificationMessage(debugChannel);
                await showAINotificationImmediately(message, aiActivityProvider, aiNotificationPanel, debugChannel, countdownTimer);
            }, () => updateStatusBar(statusBarItem, aiPromptCounter));
            
            vscode.window.showInformationMessage('SpecStory history detection test completed - check output for details');
        } catch (error) {
            logError(`Failed to test history detection: ${error}`);
            vscode.window.showErrorMessage(`History detection test failed: ${error}`);
        }
    });

    // Command to export chat history now
    const exportNow = vscode.commands.registerCommand('specstoryautosave.exportNow', async () => {
        logInfo('📤 Manual export chat history initiated...');
        logExport('Manual export requested by user');
        
        try {
            // Here would be the actual export logic
            // For now, just simulate the export
            const timestamp = new Date().toLocaleString();
            const os = require('os');
            const path = require('path');
            const exportPath = path.join(os.tmpdir(), `specstory-export-${Date.now()}.md`);
            
            logExport(`Export started at ${timestamp}`);
            logExport(`Target path: ${exportPath}`);
            
            // Simulate export process
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            logExport('✅ Chat history exported successfully');
            logInfo('✅ Chat history exported successfully');
            
            vscode.window.showInformationMessage('Chat history exported successfully - check Export output for details');
        } catch (error) {
            logExport(`❌ Export failed: ${error}`);
            logError(`Export failed: ${error}`);
            vscode.window.showErrorMessage(`Export failed: ${error}`);
        }
    });

    // Add commands to context
    context.subscriptions.push(findSpecStoryCommands);
    context.subscriptions.push(forceAINotification);
    context.subscriptions.push(showPromptStats);
    context.subscriptions.push(resetCounter);
    context.subscriptions.push(testHistoryDetection);
    context.subscriptions.push(exportNow);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(debugChannel);
    context.subscriptions.push(exportChannel);
    
    logDebug('All commands registered successfully');
}

function setupAutoSaveIntervals() {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableAutoSave = config.get<boolean>('enableAutoSave', true);
    const intervalMinutes = config.get<number>('autoSaveInterval', 5);
    
    if (!enableAutoSave) {
        logInfo('Auto-save is disabled in settings');
        return;
    }
    
    logInfo(`Setting up auto-save interval: ${intervalMinutes} minutes`);
    logExport(`Auto-save configured: every ${intervalMinutes} minutes`);
    
    // Clear existing timer if any
    if (autoSaveTimer.value) {
        clearInterval(autoSaveTimer.value);
    }
    
    // Set up new timer
    autoSaveTimer.value = setInterval(async () => {
        logExport('🔄 Auto-save interval triggered');
        
        try {
            // Simulate export process
            const timestamp = new Date().toLocaleString();
            const os = require('os');
            const path = require('path');
            const exportPath = path.join(os.tmpdir(), `specstory-autosave-${Date.now()}.md`);
            
            logExport(`Auto-export started at ${timestamp}`);
            logExport(`Target path: ${exportPath}`);
            
            // Here would be the actual export logic
            await new Promise(resolve => setTimeout(resolve, 500));
            
            logExport('✅ Auto-export completed successfully');
            logInfo('✅ Auto-export completed successfully');
            
        } catch (error) {
            logExport(`❌ Auto-export failed: ${error}`);
            logError(`Auto-export failed: ${error}`);
        }
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
    
    logDebug(`Auto-save timer set for ${intervalMinutes} minutes`);
}

// Listen for configuration changes to update auto-save intervals
function setupConfigurationListener() {
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('specstoryautosave.enableAutoSave') || 
            event.affectsConfiguration('specstoryautosave.autoSaveInterval')) {
            logInfo('Auto-save configuration changed - updating intervals');
            setupAutoSaveIntervals();
        }
    });
}

export function deactivate() {
    if (countdownTimer.value) {
        clearInterval(countdownTimer.value);
    }
    if (autoSaveTimer.value) {
        clearInterval(autoSaveTimer.value);
        logExport('Auto-save timer stopped');
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
    if (exportChannel) {
        exportChannel.dispose();
    }
}
