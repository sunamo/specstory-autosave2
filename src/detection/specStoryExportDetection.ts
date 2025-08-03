import * as vscode from 'vscode';
import { logDebug, logAIActivity } from '../utils/logger';

/**
 * SpecStory Export Detection - most reliable method
 * Regularly triggers SpecStory export and monitors for changes in .specstory/history
 */
export function initializeSpecStoryExportDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    logDebug('🎯 Initializing SPECSTORY EXPORT DETECTION (most reliable method)');
    
    const disposables: vscode.Disposable[] = [];
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const intervalSeconds = config.get<number>('specStoryExportInterval', 2);
    
    // State tracking
    let lastFileCount = new Map<string, number>(); // workspace -> file count
    let lastModificationTimes = new Map<string, number>(); // file path -> modification time
    let isInitialized = false;
    
    logDebug(`📊 SpecStory export detection starting with ${intervalSeconds}s interval`);
    
    // Main export and detection loop
    const exportInterval = setInterval(async () => {
        try {
            // 1. Try to trigger SpecStory export
            await triggerSpecStoryExport(debugChannel);
            
            // 2. Check for changes in SpecStory files
            await checkSpecStoryChanges(handleAIActivity, debugChannel, lastFileCount, lastModificationTimes, isInitialized);
            
            // Mark as initialized after first run
            if (!isInitialized) {
                isInitialized = true;
                logDebug('📊 SpecStory export detection initialized (will detect changes from now on)');
            }
            
        } catch (error) {
            // Don't spam logs with errors, just log occasionally
            if (Math.random() < 0.1) { // Log 10% of errors
                logDebug(`⚠️ SpecStory export detection cycle error: ${error}`);
            }
        }
    }, intervalSeconds * 1000);
    
    disposables.push({ dispose: () => clearInterval(exportInterval) });
    
    // Also monitor file system changes for immediate detection
    const fileWatcher = initializeSpecStoryFileWatcher(handleAIActivity, debugChannel, lastModificationTimes);
    if (fileWatcher) {
        disposables.push(fileWatcher);
    }
    
    logDebug('✅ SpecStory export detection initialized');
    return disposables;
}

/**
 * Trigger SpecStory export command
 */
async function triggerSpecStoryExport(debugChannel: vscode.OutputChannel): Promise<void> {
    try {
        // Try multiple possible SpecStory export commands
        const exportCommands = [
            'specstory.exportChatHistory',
            'specstory.export',
            'specstory.exportChat',
            'extension.specstory.exportChatHistory',
            'specStory.exportChatHistory'
        ];
        
        for (const command of exportCommands) {
            try {
                await vscode.commands.executeCommand(command);
                logDebug(`📤 SpecStory export triggered: ${command}`);
                return; // Success, exit
            } catch (error) {
                // Try next command
            }
        }
        
        // If no command worked, log occasionally
        if (Math.random() < 0.01) { // Log 1% of failures
            logDebug('📤 SpecStory export commands not available (SpecStory extension may not be installed)');
        }
        
    } catch (error) {
        // Ignore export errors to avoid spam
    }
}

/**
 * Check for changes in SpecStory history files
 */
async function checkSpecStoryChanges(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel,
    lastFileCount: Map<string, number>,
    lastModificationTimes: Map<string, number>,
    isInitialized: boolean
): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    
    for (const folder of workspaceFolders) {
        const specstoryPath = vscode.Uri.joinPath(folder.uri, '.specstory', 'history');
        const workspaceKey = folder.uri.toString();
        
        try {
            const files = await vscode.workspace.fs.readDirectory(specstoryPath);
            const mdFiles = files.filter(([name, type]) => 
                name.endsWith('.md') && type === vscode.FileType.File
            );
            
            const currentFileCount = mdFiles.length;
            const previousFileCount = lastFileCount.get(workspaceKey) || 0;
            
            if (!isInitialized) {
                // First run - just initialize
                lastFileCount.set(workspaceKey, currentFileCount);
                await initializeFileModificationTimes(specstoryPath, mdFiles, lastModificationTimes);
                logDebug(`📊 Initialized SpecStory tracking: ${currentFileCount} files in ${folder.name}`);
                return;
            }
            
            // Check for new files
            if (currentFileCount > previousFileCount) {
                const newFiles = currentFileCount - previousFileCount;
                logDebug(`📊 SpecStory export detected ${newFiles} new files in ${folder.name}`);
                logDebug('🚀 SPECSTORY EXPORT DETECTION!');
                logAIActivity(`AI activity detected via SpecStory export (${newFiles} new files)`);
                lastFileCount.set(workspaceKey, currentFileCount);
                handleAIActivity();
                return;
            }
            
            // Check for modified files
            const modifiedFiles = await checkFileModifications(specstoryPath, mdFiles, lastModificationTimes);
            if (modifiedFiles.length > 0) {
                logDebug(`📊 SpecStory export detected ${modifiedFiles.length} modified files in ${folder.name}`);
                logDebug('🚀 SPECSTORY EXPORT DETECTION (modified files)!');
                logAIActivity(`AI activity detected via SpecStory export (${modifiedFiles.length} modified files)`);
                handleAIActivity();
                return;
            }
            
            // Update count
            lastFileCount.set(workspaceKey, currentFileCount);
            
        } catch {
            // SpecStory folder doesn't exist yet, ignore
        }
    }
}

/**
 * Initialize modification times for existing files
 */
async function initializeFileModificationTimes(
    specstoryPath: vscode.Uri,
    mdFiles: [string, vscode.FileType][],
    lastModificationTimes: Map<string, number>
): Promise<void> {
    for (const [fileName] of mdFiles) {
        try {
            const filePath = vscode.Uri.joinPath(specstoryPath, fileName);
            const stat = await vscode.workspace.fs.stat(filePath);
            lastModificationTimes.set(filePath.toString(), stat.mtime);
        } catch {
            // Ignore errors
        }
    }
}

/**
 * Check for file modifications
 */
async function checkFileModifications(
    specstoryPath: vscode.Uri,
    mdFiles: [string, vscode.FileType][],
    lastModificationTimes: Map<string, number>
): Promise<string[]> {
    const modifiedFiles: string[] = [];
    
    for (const [fileName] of mdFiles) {
        try {
            const filePath = vscode.Uri.joinPath(specstoryPath, fileName);
            const filePathString = filePath.toString();
            const stat = await vscode.workspace.fs.stat(filePath);
            
            const lastMtime = lastModificationTimes.get(filePathString) || 0;
            if (stat.mtime > lastMtime) {
                modifiedFiles.push(fileName);
                lastModificationTimes.set(filePathString, stat.mtime);
            }
        } catch {
            // Ignore errors
        }
    }
    
    return modifiedFiles;
}

/**
 * Initialize file system watcher for immediate detection
 */
function initializeSpecStoryFileWatcher(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel,
    lastModificationTimes: Map<string, number>
): vscode.Disposable | null {
    try {
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/.specstory/history/*.md');
        let lastFileChange = 0;
        
        const onSpecStoryChange = async (uri: vscode.Uri) => {
            const now = Date.now();
            // Debounce rapid file changes
            if (now - lastFileChange > 500) {
                lastFileChange = now;
                
                try {
                    // Update modification time
                    const stat = await vscode.workspace.fs.stat(uri);
                    lastModificationTimes.set(uri.toString(), stat.mtime);
                    
                    logDebug(`📝 SpecStory file watcher detected change: ${uri.fsPath}`);
                    logDebug('🚀 SPECSTORY FILE WATCHER DETECTION!');
                    logAIActivity(`AI activity detected via SpecStory file watcher: ${uri.fsPath}`);
                    handleAIActivity();
                } catch (error) {
                    logDebug(`⚠️ Error handling file change: ${error}`);
                }
            }
        };
        
        fileWatcher.onDidCreate(onSpecStoryChange);
        fileWatcher.onDidChange(onSpecStoryChange);
        
        logDebug('📁 SpecStory file watcher initialized (immediate detection)');
        return fileWatcher;
        
    } catch (error) {
        logDebug(`⚠️ SpecStory file watcher failed: ${error}`);
        return null;
    }
}
