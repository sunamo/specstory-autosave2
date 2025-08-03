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
    shouldUseFileSystem: boolean = false
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
                
                // Large text insertion (AI completion) - FASTER detection
                if (lengthDiff > 20 && versionDiff === 1) {
                    debugChannel.appendLine(`[DEBUG] 📈 Fast text insertion detected: +${lengthDiff} chars`);
                    
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
                        debugChannel.appendLine('[DEBUG] 🚀 AGGRESSIVE MEMORY DETECTION!');
                        handleAIActivity();
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
    
    // File system activity detection - optimized for SpecStory
    if (shouldUseFileSystem) {
        // Primary watcher: .specstory/history files (most important)
        const specstoryWatcher = vscode.workspace.createFileSystemWatcher('**/.specstory/history/*.md');
        let lastSpecStoryChange = 0;
        
        const onSpecStoryFileChange = (uri: vscode.Uri) => {
            const now = Date.now();
            if (now - lastSpecStoryChange > 500) { // Prevent duplicate detections
                lastSpecStoryChange = now;
                lastDetectedTime.value = now;
                debugChannel.appendLine(`[DEBUG] 🎯 SPECSTORY FILE DETECTION! ${uri.fsPath}`);
                logAIActivity(`SpecStory file changed: ${uri.fsPath}`);
                handleAIActivity();
            }
        };
        
        specstoryWatcher.onDidCreate(onSpecStoryFileChange);
        specstoryWatcher.onDidChange(onSpecStoryFileChange);
        disposables.push(specstoryWatcher);
        
        // Secondary watcher: General file system for AI-generated files
        const generalWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        let fileChangeCount = 0;
        let fileChangeTimer: NodeJS.Timeout | undefined;
        
        const onGeneralFileChange = (uri: vscode.Uri) => {
            // Skip SpecStory files (handled above) and our own output
            if (uri.fsPath.includes('.specstory') || uri.fsPath.includes('SpecStoryAutoSave')) {
                return;
            }
            
            fileChangeCount++;
            
            if (fileChangeTimer) {
                clearTimeout(fileChangeTimer);
            }
            
            fileChangeTimer = setTimeout(() => {
                if (fileChangeCount >= 3) { // Multiple file changes in short time
                    const now = Date.now();
                    if (now - lastDetectedTime.value > 2000) {
                        lastDetectedTime.value = now;
                        debugChannel.appendLine(`[DEBUG] 🚀 GENERAL FILE SYSTEM DETECTION! (${fileChangeCount} changes)`);
                        handleAIActivity();
                    }
                }
                fileChangeCount = 0;
            }, 1000);
        };
        
        generalWatcher.onDidCreate(onGeneralFileChange);
        generalWatcher.onDidChange(onGeneralFileChange);
        generalWatcher.onDidDelete(onGeneralFileChange);
        
        disposables.push(generalWatcher);
        disposables.push({ dispose: () => { if (fileChangeTimer) clearTimeout(fileChangeTimer); } });
        
        debugChannel.appendLine('[DEBUG] 📁 File system monitoring enabled (SpecStory + General)');
    }
    
    debugChannel.appendLine('[DEBUG] ✅ Aggressive detection with all methods installed');
    
    return disposables;
}
