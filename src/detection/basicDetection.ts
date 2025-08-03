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
            // Debounce rapid file changes but allow immediate detection
            if (now - lastFileChange > 500) {
                lastFileChange = now;
                logDebug(`📝 SpecStory file changed: ${uri.fsPath}`);
                logDebug('🚀 SPECSTORY FILE DETECTION!');
                logAIActivity('AI activity detected via SpecStory file change');
                handleAIActivity();
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
    logDebug(`🎯 Initializing ENHANCED BASIC detection - CommandHook: ${enableCommandHook}, Webview: ${enableWebview}, PanelFocus: ${enablePanelFocus}`);
    
    const disposables: vscode.Disposable[] = [];
    
    // NEW: SpecStory file monitoring for immediate detection
    const specstoryWatcher = initializeSpecStoryWatcher(handleAIActivity, debugChannel);
    if (specstoryWatcher) {
        disposables.push(specstoryWatcher);
    }
    
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
                        cmd.includes('workbench.panel.chat.view.copilot')
                    );
                    
                    if (activeChatCommands.length > 0) {
                        debugChannel.appendLine(`[DEBUG] 💬 Found ${activeChatCommands.length} active chat commands`);
                    }
                });
            }
        });
        disposables.push(disposable2);
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
                    'interactive'
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
                        }
                        
                    } catch {
                        // SpecStory folder doesn't exist yet, ignore
                    }
                }
            } catch (error) {
                // Ignore polling errors to avoid spam
            }
        }, 2000); // Check every 2 seconds
        
        logDebug('📊 Polling detection initialized (2s interval)');
        return pollingInterval;
    } catch (error) {
        logDebug(`⚠️ Polling detection failed: ${error}`);
        return null;
    }
}
