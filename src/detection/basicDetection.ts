import * as vscode from 'vscode';
import { logDebug, logAIActivity } from '../utils/logger';

/**
 * Initialize SpecStory file watcher for immediate detection
 */
function initializeSpecStoryWatcher(handleAIActivity: () => void, debugChannel: vscode.OutputChannel): vscode.Disposable | null {
    try {
        // Watch for changes in SpecStory history folder
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/.specstory/history/*.md');
        let lastFileChange = 0;
        
        const onSpecStoryChange = (uri: vscode.Uri) => {
            const now = Date.now();
            // Reduce debounce time for faster detection
            if (now - lastFileChange > 100) { // Reduced from 500ms to 100ms
                lastFileChange = now;
                logDebug(`📝 SpecStory file changed: ${uri.fsPath}`);
                logDebug('🚀 SPECSTORY FILE DETECTION!');
                logAIActivity('AI activity detected via SpecStory file change');
                handleAIActivity();
            } else {
                logDebug(`📝 SpecStory file change ignored (debounce): ${uri.fsPath} (${now - lastFileChange}ms ago)`);
            }
        };
        
        fileWatcher.onDidCreate(onSpecStoryChange);
        fileWatcher.onDidChange(onSpecStoryChange);
        
        logDebug('📁 SpecStory file watcher initialized');
        return fileWatcher;
    } catch (error) {
        logDebug(`⚠️ SpecStory file watcher failed: ${error}`);
        return null;
    }
}

/**
 * Basic detection methods - command hooks, webview monitoring, panel focus
 */
export function initializeBasicDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel,
    lastDetectedTime: { value: number },
    enableCommandHook: boolean = true, 
    enableWebview: boolean = true, 
    enablePanelFocus: boolean = true
) {
    logDebug(`🎯 Initializing ULTRA-AGGRESSIVE BASIC detection - CommandHook: ${enableCommandHook}, Webview: ${enableWebview}, PanelFocus: ${enablePanelFocus}`);
    
    const disposables: vscode.Disposable[] = [];
    
    // NEW: SpecStory file monitoring for immediate detection
    const specstoryWatcher = initializeSpecStoryWatcher(handleAIActivity, debugChannel);
    if (specstoryWatcher) {
        disposables.push(specstoryWatcher);
    }
    
    // NEW: UNIVERSAL AI ACTIVITY DETECTOR - monitors ALL VS Code activity
    const disposableUniversal = vscode.workspace.onDidChangeConfiguration((event) => {
        // Any configuration change might indicate AI activity
        if (event.affectsConfiguration('copilot') || 
            event.affectsConfiguration('chat') ||
            event.affectsConfiguration('github.copilot')) {
            logDebug('⚙️ COPILOT CONFIGURATION CHANGE DETECTED!');
            logAIActivity('AI activity detected via configuration change');
            handleAIActivity();
        }
    });
    disposables.push(disposableUniversal);
    
    // Method 1: Monitor chat panel visibility and focus (IMPROVED)
    if (enableWebview) {
        const disposable1 = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (!editor) return;
            
            const uri = editor.document.uri.toString();
            logDebug(`📝 Active editor: ${uri}`);
            
            // Detect Copilot Chat webview panels (expanded detection)
            if ((uri.includes('webview-panel') && uri.includes('copilot')) ||
                uri.includes('github.copilot-chat') ||
                uri.includes('copilot.chat') ||
                (uri.includes('webview') && uri.includes('chat'))) {
                
                logDebug(`🎯 COPILOT CHAT PANEL DETECTED: ${uri}`);
                logAIActivity(`Copilot Chat panel activated: ${uri}`);
                
                // Remove timing restriction for immediate response
                logDebug('🚀 ENHANCED WEBVIEW DETECTION!');
                logAIActivity('AI activity detected via webview panel activation');
                handleAIActivity();
            }
        });
        disposables.push(disposable1);
        
        // NEW: Additional webview monitoring for ALL Copilot activity
        const disposable1b = vscode.window.onDidChangeVisibleTextEditors((editors) => {
            editors.forEach(editor => {
                if (!editor) return;
                const uri = editor.document.uri.toString();
                
                // Detect ANY Copilot-related activity
                if (uri.includes('copilot') || uri.includes('chat') || 
                    uri.includes('github.copilot') || uri.includes('inlinechat')) {
                    logDebug(`🎯 COPILOT ACTIVITY VIA VISIBLE EDITORS: ${uri}`);
                    logAIActivity(`Copilot activity detected via visible editors: ${uri}`);
                    handleAIActivity();
                }
            });
        });
        disposables.push(disposable1b);
    }
    
    // Method 2: Monitor panel state changes (if enabled)
    if (enablePanelFocus) {
        const disposable2 = vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                logDebug('🖼️ Window focus changed - checking for chat activity');
                
                // Check if any chat-related commands are available
                vscode.commands.getCommands(true).then(commands => {
                    const activeChatCommands = commands.filter(cmd => 
                        cmd.includes('github.copilot-chat') || 
                        cmd.includes('workbench.panel.chat.view.copilot') ||
                        cmd.includes('copilot.chat') ||
                        cmd.includes('inlinechat')
                    );
                    
                    if (activeChatCommands.length > 0) {
                        debugChannel.appendLine(`[DEBUG] 💬 Found ${activeChatCommands.length} active chat commands`);
                        logDebug('🚀 CHAT COMMANDS DETECTED!');
                        logAIActivity(`Found ${activeChatCommands.length} active chat commands`);
                        handleAIActivity();
                    }
                });
            }
        });
        disposables.push(disposable2);
        
        // NEW: Monitor terminal changes that might indicate Copilot usage
        const disposable2b = vscode.window.onDidChangeActiveTerminal((terminal) => {
            if (terminal && terminal.name.toLowerCase().includes('copilot')) {
                logDebug(`🖥️ COPILOT TERMINAL ACTIVATED: ${terminal.name}`);
                logAIActivity(`Copilot terminal activated: ${terminal.name}`);
                handleAIActivity();
            }
        });
        disposables.push(disposable2b);
    }
    
    // Method 3: Enhanced command hook (if enabled)
    if (enableCommandHook) {
        try {
            const originalExecuteCommand = vscode.commands.executeCommand;
            
            (vscode.commands as any).executeCommand = async function(command: string, ...args: any[]) {
                const cmd = command.toLowerCase();
                
                // Expanded command detection for better coverage
                const copilotCommands = [
                    'github.copilot',
                    'copilot-chat',
                    'chat.send',
                    'workbench.panel.chat',
                    'workbench.action.chat',
                    'inlinechat',
                    'interactive',
                    'copilot.send',
                    'copilot.chat.send',
                    'workbench.action.openChat'
                ];
                
                const isCopilotCommand = copilotCommands.some(pattern => cmd.includes(pattern));
                
                if (isCopilotCommand) {
                    logDebug(`🔧 COPILOT COMMAND: ${command}`);
                    
                    // Immediate detection without timing restrictions
                    logDebug('🚀 ENHANCED COMMAND HOOK DETECTION!');
                    logAIActivity(`AI activity detected via command: ${command}`);
                    handleAIActivity();
                }
                
                return originalExecuteCommand.apply(this, [command, ...args]);
            };
            
            logDebug('✅ Enhanced command hook installed');
        } catch (error) {
            logDebug(`⚠️ Command hook failed: ${error}`);
        }
    }
    
    // NEW: Monitor text selection changes in case of Copilot inline suggestions
    const disposable4 = vscode.window.onDidChangeTextEditorSelection((event) => {
        const editor = event.textEditor;
        if (!editor) return;
        
        const uri = editor.document.uri.toString();
        // Check if this might be Copilot-related activity
        if (event.selections.length > 0 && (uri.includes('copilot') || uri.includes('chat'))) {
            logDebug(`📝 TEXT SELECTION IN COPILOT CONTEXT: ${uri}`);
            logAIActivity(`Text selection change in Copilot context: ${uri}`);
            handleAIActivity();
        }
    });
    disposables.push(disposable4);
    
    // NEW: Monitor document changes that might indicate AI responses
    const disposable5 = vscode.workspace.onDidChangeTextDocument((event) => {
        if (!event.document) return;
        
        const uri = event.document.uri.toString();
        // Detect AI-generated content insertions
        if (uri.includes('copilot') || uri.includes('chat') || 
            (event.contentChanges.length > 0 && 
             event.contentChanges.some(change => 
                change.text.length > 50 && // Significant text insertion
                (change.text.includes('//') || change.text.includes('/*') || change.text.includes('function'))
             ))) {
            logDebug(`📄 DOCUMENT CHANGE IN AI CONTEXT: ${uri}`);
            logAIActivity(`Document change in AI context: ${uri}`);
            handleAIActivity();
        }
    });
    disposables.push(disposable5);
    
    // NEW: Polling mechanism as backup detection
    const pollingInterval = initializePollingDetection(handleAIActivity, debugChannel);
    if (pollingInterval) {
        disposables.push({ dispose: () => clearInterval(pollingInterval) });
    }
    
    logDebug('✅ Enhanced basic detection with multiple fallback methods installed');
    logDebug('💡 If detection still fails, use Ctrl+Shift+P → "SpecStoryAutoSave: Force AI Notification"');
    
    return disposables;
}

/**
 * Initialize polling detection as backup mechanism
 */
function initializePollingDetection(handleAIActivity: () => void, debugChannel: vscode.OutputChannel): NodeJS.Timeout | null {
    try {
        let lastSpecStoryCount = -1; // Use -1 to indicate uninitialized
        let isInitialized = false;
        
        const pollingInterval = setInterval(async () => {
            try {
                // Check if SpecStory folder exists and count files
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders) return;
                
                for (const folder of workspaceFolders) {
                    const specstoryPath = vscode.Uri.joinPath(folder.uri, '.specstory', 'history');
                    try {
                        const files = await vscode.workspace.fs.readDirectory(specstoryPath);
                        const mdFiles = files.filter(([name, type]) => 
                            name.endsWith('.md') && type === vscode.FileType.File
                        );
                        
                        if (!isInitialized) {
                            // First run - just initialize the count, don't trigger detection
                            lastSpecStoryCount = mdFiles.length;
                            isInitialized = true;
                            logDebug(`📊 Initialized SpecStory file count: ${lastSpecStoryCount} (no detection triggered)`);
                            return;
                        }
                        
                        // Only detect NEW files after initialization
                        if (mdFiles.length > lastSpecStoryCount) {
                            const newFiles = mdFiles.length - lastSpecStoryCount;
                            logDebug(`📊 Polling detected ${newFiles} new SpecStory files`);
                            logDebug('🚀 POLLING DETECTION!');
                            logAIActivity(`AI activity detected via polling (${newFiles} new files)`);
                            lastSpecStoryCount = mdFiles.length;
                            handleAIActivity();
                        } else {
                            // Debug: log file count periodically
                            if (Math.random() < 0.05) { // 5% chance to log
                                logDebug(`📊 Polling check: ${mdFiles.length} files (no change)`);
                            }
                        }
                        
                    } catch {
                        // SpecStory folder doesn't exist yet, ignore
                    }
                }
            } catch (error) {
                // Ignore polling errors to avoid spam
            }
        }, 500); // Check every 500ms for faster detection
        
        logDebug('📊 Fast polling detection initialized (500ms interval)');
        return pollingInterval;
    } catch (error) {
        logDebug(`⚠️ Polling detection failed: ${error}`);
        return null;
    }
}
