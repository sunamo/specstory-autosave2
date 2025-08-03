import * as vscode from 'vscode';
import { logDebug, logAIActivity } from '../utils/logger';

/**
 * Aggressive detection methods - code insertion, memory monitoring, terminal/filesystem activity
 */
export function initializeAggressiveDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel,
    lastDetectedTime: { value: number },
    shouldUseCodeInsertion: boolean = false, 
    shouldUseMemory: boolean = false, 
    shouldUseTerminal: boolean = false, 
    shouldUseFileSystem: boolean = false, 
    shouldUseKeyboardActivity: boolean = false
) {
    debugChannel.appendLine('[DEBUG] ⚡ Initializing AGGRESSIVE detection (all methods)...');
    
    const disposables: vscode.Disposable[] = [];
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const enableCodeDetection = shouldUseCodeInsertion || config.get<boolean>('enableCodeInsertionDetection', false);
    
    if (enableCodeDetection) {
        // Code insertion detection
        let documentVersions = new Map<string, { version: number, length: number }>();
        
        const disposable1 = vscode.workspace.onDidChangeTextDocument((event) => {
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
                    if (now - lastDetectedTime.value > 2000) {
                        lastDetectedTime.value = now;
                        debugChannel.appendLine('[DEBUG] 🚀 AGGRESSIVE CODE DETECTION!');
                        handleAIActivity();
                    }
                }
            }
            
            documentVersions.set(uri, { version: currentVersion, length: currentLength });
        });
        disposables.push(disposable1);
        
        debugChannel.appendLine('[DEBUG] 📝 Code insertion detection enabled');
    }
    
    // Memory monitoring (less aggressive than before)
    if (shouldUseMemory) {
        let lastMemoryCheck = process.memoryUsage().heapUsed;
        let consecutiveSpikes = 0;
        
        const memoryInterval = setInterval(() => {
            try {
                const currentMemory = process.memoryUsage().heapUsed;
                const memoryIncrease = currentMemory - lastMemoryCheck;
                
                if (memoryIncrease > 50000000) { // 50MB increase
                    consecutiveSpikes++;
                    
                    if (consecutiveSpikes >= 3) {
                        debugChannel.appendLine(`[DEBUG] 🧠 Sustained memory activity: +${Math.round(memoryIncrease/1000000)}MB`);
                        
                        const now = Date.now();
                        if (now - lastDetectedTime.value > 10000) {
                            lastDetectedTime.value = now;
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
        
        disposables.push({ dispose: () => clearInterval(memoryInterval) });
        debugChannel.appendLine('[DEBUG] 🧠 Memory monitoring enabled');
    }
    
    // Terminal activity detection
    if (shouldUseTerminal) {
        const disposable2 = vscode.window.onDidOpenTerminal((terminal) => {
            debugChannel.appendLine('[DEBUG] 📟 Terminal opened - checking for AI activity');
            const now = Date.now();
            if (now - lastDetectedTime.value > 3000) {
                lastDetectedTime.value = now;
                debugChannel.appendLine('[DEBUG] 🚀 TERMINAL DETECTION!');
                handleAIActivity();
            }
        });
        disposables.push(disposable2);
        
        const disposable3 = vscode.window.onDidCloseTerminal((terminal) => {
            debugChannel.appendLine('[DEBUG] 📟 Terminal closed - checking for AI activity');
            const now = Date.now();
            if (now - lastDetectedTime.value > 3000) {
                lastDetectedTime.value = now;
                debugChannel.appendLine('[DEBUG] 🚀 TERMINAL CLOSE DETECTION!');
                handleAIActivity();
            }
        });
        disposables.push(disposable3);
        
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
                    if (now - lastDetectedTime.value > 2000) {
                        lastDetectedTime.value = now;
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
        
        disposables.push(fileWatcher);
        disposables.push({ dispose: () => { if (fileChangeTimer) clearTimeout(fileChangeTimer); } });
        
        debugChannel.appendLine('[DEBUG] 📁 File system monitoring enabled');
    }
    
    // Keyboard activity detection
    if (shouldUseKeyboardActivity) {
        let keyPressCount = 0;
        let keyPressTimer: NodeJS.Timeout | undefined;
        
        const disposable4 = vscode.workspace.onDidChangeTextDocument((e) => {
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
                            if (now - lastDetectedTime.value > 5000) { // Longer cooldown to prevent spam
                                lastDetectedTime.value = now;
                                debugChannel.appendLine(`[DEBUG] 🚀 KEYBOARD ACTIVITY DETECTION! (${keyPressCount} chars)`);
                                handleAIActivity();
                            }
                        }
                        keyPressCount = 0;
                    }, 2000);
                }
            }
        });
        disposables.push(disposable4);
        disposables.push({ dispose: () => { if (keyPressTimer) clearTimeout(keyPressTimer); } });
        
        debugChannel.appendLine('[DEBUG] ⌨️ Keyboard activity detection enabled');
    }
    
    debugChannel.appendLine('[DEBUG] ✅ Aggressive detection with all methods installed');
    
    return disposables;
}
