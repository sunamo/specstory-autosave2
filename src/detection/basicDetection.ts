import * as vscode from 'vscode';
import { logDebug, logAIActivity } from '../utils/logger';
    // const disposableUniversal = vscode.workspace.onDidChangeConfiguration((event) => {
    //     if (event.affectsConfiguration('copilot') || 
    //         event.affectsConfiguration('chat') ||
    //         event.affectsConfiguration('github.copilot')) {
    //         logDebug('⚙️ COPILOT CONFIGURATION CHANGE DETECTED!');
    //         logAIActivity('AI activity detected via configuration change');
    //         debouncedHandleAIActivity('Config-Change');
    //     }
    // });
    // disposables.push(disposableUniversal);er';

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
            // ULTRA-FAST response - reduce to minimum possible delay
            if (now - lastFileChange > 10) { // Reduced from 50ms to 10ms for instant response
                lastFileChange = now;
                logDebug(`📝 SpecStory file changed: ${uri.fsPath}`);
                logDebug('🚀 ULTRA-FAST SPECSTORY DETECTION!');
                logAIActivity('AI activity detected via SpecStory file change');
                
                // IMMEDIATE TRIGGER - no delay at all
                handleAIActivity();
            } else {
                logDebug(`📝 SpecStory file change ignored (debounce): ${uri.fsPath} (${now - lastFileChange}ms ago)`);
            }
        };
        
        fileWatcher.onDidCreate(onSpecStoryChange);
        // DISABLED: onDidChange causes duplicate detection with onDidCreate
        // fileWatcher.onDidChange(onSpecStoryChange);
        
        logDebug('📁 SpecStory file watcher initialized (CREATE only)');
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
    enableCommandHook: boolean = false, // DISABLED - doesn't work for Copilot Chat
    enableWebview: boolean = false, // DISABLED - doesn't detect chat
    enablePanelFocus: boolean = false // DISABLED - not needed
) {
    logDebug(`🎯 Initializing OPTIMIZED BASIC detection - ONLY FILE WATCHERS (others disabled as ineffective)`);
    
    const disposables: vscode.Disposable[] = [];
    
    // SIMPLIFIED DEBOUNCE - only for file watchers
    const debouncedHandleAIActivity = (source = 'unknown') => {
        logDebug(`🚀 IMMEDIATE DETECTION from [${source}] - no debounce delay`);
        logDebug(`📞 CALLING handleAIActivity() from [${source}]`);
        handleAIActivity();
        logDebug(`✅ handleAIActivity() FINISHED from [${source}]`);
    };
    
    // ONLY: SpecStory file monitoring - this is the ONLY thing that works
    const specstoryWatcher = initializeSpecStoryWatcher(() => debouncedHandleAIActivity('SpecStory-File'), debugChannel);
    if (specstoryWatcher) {
        disposables.push(specstoryWatcher);
    }
    
    // ONLY: Ultra-fast polling for file changes
    const pollingInterval = initializePollingDetection(() => debouncedHandleAIActivity('Polling'), debugChannel);
    if (pollingInterval) {
        disposables.push({ dispose: () => clearInterval(pollingInterval) });
    }
    
    logDebug('✅ OPTIMIZED detection initialized - FILE WATCHERS ONLY (all VS Code API hooks disabled as ineffective)');
    logDebug('💡 Detection will happen when SpecStory creates .md files (slight delay unavoidable)');
    
    return disposables;
}

/**
 * Initialize polling detection as backup mechanism
 */
function initializePollingDetection(handleAIActivity: () => void, debugChannel: vscode.OutputChannel): NodeJS.Timeout | null {
    try {
        let lastSpecStoryCount = -1; // Use -1 to indicate uninitialized
        let isInitialized = false;
        let lastActiveEditor = '';
        let lastVisibleEditorsCount = 0;
        let checkCounter = 0;
        
        const pollingInterval = setInterval(async () => {
            try {
                checkCounter++;
                
                // APPROACH 1: Check SpecStory files as before
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
                            return; // Exit after detection
                        }
                        
                    } catch {
                        // SpecStory folder doesn't exist yet, ignore
                    }
                }
                
                // APPROACH 2: Monitor VS Code editor state changes
                const activeEditor = vscode.window.activeTextEditor;
                const currentActiveEditor = activeEditor ? activeEditor.document.uri.toString() : '';
                const visibleEditorsCount = vscode.window.visibleTextEditors.length;
                
                // Check for editor changes every 10 cycles (2 seconds)
                if (checkCounter % 10 === 0) {
                    logDebug(`🔍 POLLING STATE CHECK: activeEditor="${currentActiveEditor}" visibleEditors=${visibleEditorsCount}`);
                    
                    // Detect changes in active editor
                    if (currentActiveEditor !== lastActiveEditor) {
                        logDebug(`📝 POLLING: Active editor changed from "${lastActiveEditor}" to "${currentActiveEditor}"`);
                        
                        // Check if new editor is chat-related
                        if (currentActiveEditor.includes('copilot') || currentActiveEditor.includes('chat') || currentActiveEditor.includes('webview')) {
                            logDebug(`🎯 POLLING: Chat editor detected via state monitoring!`);
                            logAIActivity(`Chat editor detected via polling: ${currentActiveEditor}`);
                            handleAIActivity();
                        }
                        
                        lastActiveEditor = currentActiveEditor;
                    }
                    
                    // Detect changes in visible editors count
                    if (visibleEditorsCount !== lastVisibleEditorsCount) {
                        logDebug(`👁️ POLLING: Visible editors count changed from ${lastVisibleEditorsCount} to ${visibleEditorsCount}`);
                        
                        // IGNORE STARTUP CHANGES - only trigger if not initial setup
                        if (lastVisibleEditorsCount > 0 && checkCounter > 15) { // After initial startup (3 seconds)
                            logDebug(`🎯 POLLING: Significant editor change detected (not startup)`);
                            lastVisibleEditorsCount = visibleEditorsCount;
                            
                            // Any change in visible editors might indicate chat activity
                            setTimeout(() => {
                                logAIActivity(`Visible editors change detected via polling`);
                                handleAIActivity();
                            }, 500); // Small delay to let UI settle
                        } else {
                            logDebug(`🔕 POLLING: Ignoring startup editor change (counter=${checkCounter})`);
                            lastVisibleEditorsCount = visibleEditorsCount;
                        }
                    }
                }
                
                // APPROACH 3: Periodic chat command checking
                if (checkCounter % 25 === 0) { // Every 5 seconds
                    try {
                        const allCommands = await vscode.commands.getCommands(true);
                        const activeChatCommands = allCommands.filter(cmd => 
                            cmd.includes('github.copilot-chat') || 
                            cmd.includes('workbench.panel.chat') ||
                            cmd.includes('copilot.chat') ||
                            cmd.includes('chat.submit') ||
                            cmd.includes('chat.send')
                        );
                        
                        if (activeChatCommands.length > 0) {
                            logDebug(`� POLLING: Found ${activeChatCommands.length} chat-related commands available`);
                            
                            // Try to detect if any chat commands were recently used
                            // This is indirect but might help
                            if (checkCounter % 50 === 0) { // Every 10 seconds, less frequent
                                logDebug(`🔍 POLLING: Available chat commands: ${activeChatCommands.slice(0, 3).join(', ')}...`);
                            }
                        }
                    } catch (error) {
                        // Ignore command checking errors
                    }
                }
                
                // Debug: log file count periodically
                if (Math.random() < 0.02) { // 2% chance to log (less spam)
                    logDebug(`📊 Polling check ${checkCounter}: ${lastSpecStoryCount} files, activeEditor="${currentActiveEditor.slice(-50)}", visibleEditors=${visibleEditorsCount}`);
                }
                
            } catch (error) {
                // Ignore polling errors to avoid spam
                if (checkCounter % 100 === 0) { // Log errors only occasionally
                    logDebug(`⚠️ Polling error: ${error}`);
                }
            }
        }, 100); // Check every 100ms for ultra-fast detection (reduced from 200ms)
        
        logDebug('📊 ULTRA-FAST polling detection initialized (100ms interval with state monitoring)');
        return pollingInterval;
    } catch (error) {
        logDebug(`⚠️ Polling detection failed: ${error}`);
        return null;
    }
}
