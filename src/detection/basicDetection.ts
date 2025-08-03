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
            // Reduce debounce time for faster detection
            if (now - lastFileChange > 50) { // Reduced from 100ms to 50ms for ultra-fast response
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
    enableCommandHook: boolean = true, 
    enableWebview: boolean = true, 
    enablePanelFocus: boolean = true
) {
    logDebug(`🎯 Initializing ULTRA-AGGRESSIVE BASIC detection - CommandHook: ${enableCommandHook}, Webview: ${enableWebview}, PanelFocus: ${enablePanelFocus}`);
    
    const disposables: vscode.Disposable[] = [];
    
    // ADD GLOBAL DEBOUNCE MECHANISM to prevent duplicate detections
    let lastGlobalDetection = 0;
    let lastDetectionSource = '';
    const DEBOUNCE_MS = 800; // Reduced from 1500ms to 800ms for faster response
    
    const debouncedHandleAIActivity = (source = 'unknown') => {
        const now = Date.now();
        const timeSinceLastDetection = now - lastGlobalDetection;
        
        logDebug(`🔍 DEBOUNCE CHECK: source=[${source}], timeSince=${timeSinceLastDetection}ms, need=${DEBOUNCE_MS}ms`);
        
        if (timeSinceLastDetection > DEBOUNCE_MS) {
            lastGlobalDetection = now;
            lastDetectionSource = source;
            logDebug(`🎯 DETECTION ALLOWED from [${source}] - ${timeSinceLastDetection}ms since last [${lastDetectionSource}]`);
            logDebug(`📞 CALLING handleAIActivity() from [${source}]`);
            handleAIActivity();
            logDebug(`✅ handleAIActivity() FINISHED from [${source}]`);
        } else {
            logDebug(`🛑 DETECTION BLOCKED from [${source}] - only ${timeSinceLastDetection}ms ago from [${lastDetectionSource}] (need ${DEBOUNCE_MS}ms)`);
        }
    };
    
    // NEW: SpecStory file monitoring for immediate detection
    const specstoryWatcher = initializeSpecStoryWatcher(() => debouncedHandleAIActivity('SpecStory-File'), debugChannel);
    if (specstoryWatcher) {
        disposables.push(specstoryWatcher);
    }
    
    // DISABLED: Configuration change detection - causes duplicate detections
    // const disposableUniversal = vscode.workspace.onDidChangeConfiguration((event) => {
    //     if (event.affectsConfiguration('copilot') || 
    //         event.affectsConfiguration('chat') ||
    //         event.affectsConfiguration('github.copilot')) {
    //         logDebug('⚙️ COPILOT CONFIGURATION CHANGE DETECTED!');
    //         logAIActivity('AI activity detected via configuration change');
    //         debouncedHandleAIActivity('Config-Change');
    //     }
    // });
    // disposables.push(disposableUniversal);
    
    // Method 1: Monitor chat panel visibility and focus (RE-ENABLED for immediate response)
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
                debouncedHandleAIActivity('Webview-Panel');
            }
        });
        disposables.push(disposable1);
        
        // DISABLED: Visible editors monitoring - causes duplicate detections with Active editor
        // const disposable1b = vscode.window.onDidChangeVisibleTextEditors((editors) => {
        //     logDebug(`👁️ Visible editors changed: ${editors.length} editors`);
        //     const hasCopilotEditor = editors.some(editor => {
        //         if (!editor) return false;
        //         const uri = editor.document.uri.toString();
        //         return uri.includes('copilot') || uri.includes('chat') || 
        //                uri.includes('github.copilot') || uri.includes('inlinechat');
        //     });
        //     if (hasCopilotEditor) {
        //         logDebug(`🎯 COPILOT ACTIVITY VIA VISIBLE EDITORS`);
        //         logAIActivity(`Copilot activity detected via visible editors`);
        //         debouncedHandleAIActivity('Visible-Editors');
        //     }
        // });
        // disposables.push(disposable1b);
    }
    
    // Method 2: Monitor panel state changes (DISABLED - testing for duplicates)
    if (false && enablePanelFocus) {
        // DISABLED: Window state monitoring - causes duplicate detections
        // const disposable2 = vscode.window.onDidChangeWindowState((state) => {
        //     if (state.focused) {
        //         logDebug('🖼️ Window focus changed - checking for chat activity');
        //         vscode.commands.getCommands(true).then(commands => {
        //             const activeChatCommands = commands.filter(cmd => 
        //                 cmd.includes('github.copilot-chat') || 
        //                 cmd.includes('workbench.panel.chat.view.copilot') ||
        //                 cmd.includes('copilot.chat') ||
        //                 cmd.includes('inlinechat')
        //             );
        //             if (activeChatCommands.length > 0) {
        //                 debugChannel.appendLine(`[DEBUG] 💬 Found ${activeChatCommands.length} active chat commands`);
        //                 logDebug('🚀 CHAT COMMANDS DETECTED!');
        //                 logAIActivity(`Found ${activeChatCommands.length} active chat commands`);
        //                 debouncedHandleAIActivity('Window-State');
        //             }
        //         });
        //     }
        // });
        // disposables.push(disposable2);
        
        // NEW: Monitor terminal changes that might indicate Copilot usage
        const disposable2b = vscode.window.onDidChangeActiveTerminal((terminal) => {
            if (terminal && terminal.name.toLowerCase().includes('copilot')) {
                logDebug(`🖥️ COPILOT TERMINAL ACTIVATED: ${terminal.name}`);
                logAIActivity(`Copilot terminal activated: ${terminal.name}`);
                debouncedHandleAIActivity('Terminal');
            }
        });
        disposables.push(disposable2b);
    }
    
    // Method 3: Enhanced command hook (RE-ENABLED for immediate command detection)
    if (enableCommandHook) {
        try {
            // APPROACH 1: Hook into VS Code command system earlier
            const originalExecuteCommand = vscode.commands.executeCommand;
            
            (vscode.commands as any).executeCommand = async function(command: string, ...args: any[]) {
                const cmd = command.toLowerCase();
                
                // DEBUG: Log ALL commands for troubleshooting - TEMPORARY 100% LOGGING
                logDebug(`🔍 COMMAND EXECUTED: ${command}`);
                
                // Expanded command detection for better coverage - INCLUDE ENTER/SEND COMMANDS
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
                    'workbench.action.openChat',
                    'chat.action.submit',  // NEW: Likely the Enter command
                    'workbench.action.chat.submit',  // NEW: Alternative submit
                    'github.copilot-chat.submit',  // NEW: Copilot Chat submit
                    'editor.action.inlineSuggest.trigger',  // NEW: Inline suggestions
                    'workbench.action.chat.send',  // NEW: Generic chat send
                    'acceptSelectedSuggestion',  // NEW: Accept suggestion
                    'type',  // NEW: Generic typing command
                    'cursorMove',  // NEW: Cursor movement
                    'editor.action.triggerSuggest'  // NEW: Trigger suggestions
                ];
                
                // Also check for ANY command containing these keywords
                const keywordPatterns = ['chat', 'copilot', 'submit', 'send', 'accept', 'suggest'];
                const hasKeyword = keywordPatterns.some(keyword => cmd.includes(keyword));
                
                const isCopilotCommand = copilotCommands.some(pattern => cmd.includes(pattern)) || hasKeyword;
                
                if (isCopilotCommand) {
                    logDebug(`🔧 COPILOT COMMAND DETECTED: ${command}`);
                    
                    // Immediate detection without timing restrictions
                    logDebug('🚀 ENHANCED COMMAND HOOK DETECTION!');
                    logAIActivity(`AI activity detected via command: ${command}`);
                    
                    try {
                        debouncedHandleAIActivity('Command-Hook');
                        logDebug(`✅ handleAIActivity called successfully for command: ${command}`);
                    } catch (handleError) {
                        logDebug(`❌ handleAIActivity failed for command ${command}: ${handleError}`);
                    }
                }
                
                // Always call original command, even if our detection fails
                try {
                    return await originalExecuteCommand.apply(this, [command, ...args]);
                } catch (commandError) {
                    logDebug(`❌ Original command execution failed: ${command} - ${commandError}`);
                    throw commandError;
                }
            };
            
            // APPROACH 2: Monitor keyboard events directly
            const keyboardDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
                if (!event.document) return;
                
                const uri = event.document.uri.toString();
                
                // Look for ANY document changes that might be chat-related
                if (uri.includes('copilot') || uri.includes('chat') || uri.includes('webview')) {
                    logDebug(`🎹 KEYBOARD EVENT in chat context: ${uri}`);
                    logDebug(`📝 Content changes: ${event.contentChanges.length}`);
                    
                    event.contentChanges.forEach((change, index) => {
                        logDebug(`   Change ${index}: text="${change.text}" rangeLength=${change.rangeLength}`);
                        
                        // Detect potential Enter key presses or prompt submissions
                        if (change.text === '\n' || (change.text === '' && change.rangeLength > 5)) {
                            logDebug(`🚀 POTENTIAL ENTER KEY DETECTED in chat!`);
                            logAIActivity(`Potential prompt submission detected via keyboard: ${uri}`);
                            
                            setTimeout(() => {
                                debouncedHandleAIActivity('Keyboard-Enter');
                            }, 100); // Small delay to let submission complete
                        }
                    });
                }
            });
            disposables.push(keyboardDisposable);
            
            logDebug('✅ Enhanced command hook installed with comprehensive error handling');
        } catch (error) {
            logDebug(`⚠️ Command hook failed: ${error}`);
        }
    }
    
    // DISABLED: Monitor text selection changes - testing for duplicates
    /*
    const disposable4 = vscode.window.onDidChangeTextEditorSelection((event) => {
        const editor = event.textEditor;
        if (!editor) return;
        
        const uri = editor.document.uri.toString();
        // Check if this might be Copilot-related activity
        if (event.selections.length > 0 && (uri.includes('copilot') || uri.includes('chat'))) {
            logDebug(`📝 TEXT SELECTION IN COPILOT CONTEXT: ${uri}`);
            logAIActivity(`Text selection change in Copilot context: ${uri}`);
            debouncedHandleAIActivity('Text-Selection');
        }
    });
    disposables.push(disposable4);
    */
    
    // NEW: Monitor document changes that might indicate AI responses - DISABLED for Ask prompts
    // This detection is not useful for "Ask" type prompts that don't change code
    /*
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
    */
    
    // RE-ENABLED: Aggressive keyboard activity monitoring for immediate chat detection
    const disposable6 = vscode.window.onDidChangeTextEditorSelection((event) => {
        const editor = event.textEditor;
        if (!editor) return;
        
        const uri = editor.document.uri.toString();
        // Detect ANY activity in Copilot Chat context
        if (uri.includes('copilot') || uri.includes('chat') || uri.includes('github.copilot')) {
            logDebug(`🎯 CHAT CONTEXT ACTIVITY: ${uri}`);
            
            // Log selection details for debugging
            event.selections.forEach((selection, index) => {
                logDebug(`   Selection ${index}: empty=${selection.isEmpty} line=${selection.start.line} char=${selection.start.character}`);
            });
            
            // Only trigger on significant selection changes (not just cursor moves)
            if (event.selections.some(sel => !sel.isEmpty)) {
                logDebug(`🎯 CHAT SELECTION ACTIVITY: ${uri}`);
                logAIActivity(`Chat selection activity detected: ${uri}`);
                debouncedHandleAIActivity('Chat-Selection');
            }
        }
    });
    disposables.push(disposable6);
    
    // NEW: Monitor window focus changes for chat detection
    const disposable6b = vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
            logDebug(`🖼️ WINDOW FOCUS GAINED - checking active editor`);
            
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const uri = activeEditor.document.uri.toString();
                if (uri.includes('copilot') || uri.includes('chat')) {
                    logDebug(`🎯 WINDOW FOCUS on chat context: ${uri}`);
                    logAIActivity(`Window focus on chat context: ${uri}`);
                    // Immediate trigger for focus events
                    setTimeout(() => {
                        debouncedHandleAIActivity('Window-Focus');
                    }, 50);
                }
            }
        }
    });
    disposables.push(disposable6b);
    
    // RE-ENABLED: Monitor keyboard activity for immediate Enter detection
    const disposable7 = vscode.workspace.onDidChangeTextDocument((event) => {
        if (!event.document) return;
        
        const uri = event.document.uri.toString();
        // Detect typing in Copilot Chat input areas
        if ((uri.includes('copilot') || uri.includes('chat')) && 
            event.contentChanges.length > 0) {
            
            // Check for Enter key press (empty change after user input)
            const hasEnterPress = event.contentChanges.some(change => 
                change.text === '' && change.rangeLength > 0 // Text being removed/submitted
            );
            
            // Check if this looks like user input (not AI response)
            const hasUserTyping = event.contentChanges.some(change => 
                change.text.length > 0 && change.text.length < 500 && // User input range
                !change.text.includes('```') && // Not code blocks  
                !change.text.includes('function') && // Not generated code
                !change.text.includes('##') && // Not markdown headers
                change.text.trim().length > 0
            );
            
            if (hasEnterPress || hasUserTyping) {
                logDebug(`⌨️ USER ACTIVITY IN CHAT: ${uri} (Enter: ${hasEnterPress}, Typing: ${hasUserTyping})`);
                logAIActivity(`User activity detected in chat: ${uri}`);
                // Very short delay to capture full prompt submission
                setTimeout(() => {
                    debouncedHandleAIActivity('User-Typing');
                }, hasEnterPress ? 50 : 100); // Faster for Enter press
            }
        }
    });
    disposables.push(disposable7);
    
    // RE-ENABLED: Polling mechanism as backup for immediate detection
    const pollingInterval = initializePollingDetection(() => debouncedHandleAIActivity('Polling'), debugChannel);
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
        }, 200); // Check every 200ms for ultra-fast detection
        
        logDebug('📊 Ultra-fast polling detection initialized (200ms interval)');
        return pollingInterval;
    } catch (error) {
        logDebug(`⚠️ Polling detection failed: ${error}`);
        return null;
    }
}
