import * as vscode from 'vscode';
import { findSpecStoryHistoryPath, readRecentSpecStoryConversations } from './specstory/historyReader';
import { logDebug, logInfo, logError } from './utils/logger';

/**
 * WebView Provider for Activity Bar - handles AI activity notifications display
 */
export class AIActivityProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'specstoryAINotifications';
    private _view?: vscode.WebviewView;
    private _prompts: {timestamp: string, shortPrompt: string, fullContent?: string}[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) {
        // Force create debug log immediately
        this.writeDebugLog('=== ACTIVITY BAR CONSTRUCTOR STARTED ===');
        
        // Enable debug logs temporarily for troubleshooting
        const config = vscode.workspace.getConfiguration('specstoryautosave');
        if (!config.get<boolean>('enableDebugLogs', false)) {
            config.update('enableDebugLogs', true, vscode.ConfigurationTarget.Global);
        }
        
        logDebug('Activity Bar provider constructor called');
        
        // Multiple loading attempts
        this.initializeWithRetry();
        
        // Set up periodic refresh every 30 seconds (not every second!)
        setInterval(() => {
            this.refreshPrompts();
        }, 30000);
        
        // Listen for configuration changes and refresh UI immediately
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('specstoryautosave.activityBarMaxPrompts')) {
                this.writeDebugLog('Configuration changed: activityBarMaxPrompts - refreshing UI');
                logInfo('Configuration changed: activityBarMaxPrompts - refreshing UI');
                
                // Apply new limit to existing prompts
                const config = vscode.workspace.getConfiguration('specstoryautosave');
                const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);
                
                if (this._prompts.length > maxPrompts) {
                    this._prompts = this._prompts.slice(0, maxPrompts);
                    this.writeDebugLog(`Applied new limit: reduced to ${this._prompts.length} prompts`);
                }
                
                this._updateView();
            }
        });
        
        this.writeDebugLog('=== ACTIVITY BAR CONSTRUCTOR FINISHED ===');
    }

    private async initializeWithRetry() {
        this.writeDebugLog('=== INITIALIZING WITH RETRY ===');
        
        // Try multiple times with delays
        for (let attempt = 1; attempt <= 3; attempt++) {
            this.writeDebugLog(`Loading attempt ${attempt}/3`);
            
            try {
                await this.loadPromptsFromSpecStory();
                if (this._prompts.length > 0) {
                    this.writeDebugLog(`Successfully loaded ${this._prompts.length} prompts on attempt ${attempt}`);
                    logInfo(`Successfully loaded ${this._prompts.length} prompts on attempt ${attempt}`);
                    return; // Success - exit retry loop
                }
            } catch (error) {
                this.writeDebugLog(`Attempt ${attempt} failed: ${error}`);
                logError(`Attempt ${attempt} failed: ${error}`);
            }
            
            if (attempt < 3) {
                // Wait before retry
                this.writeDebugLog(`Waiting ${2000 * attempt}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
        
        // If still no prompts, add test prompts as immediate fallback
        if (this._prompts.length === 0) {
            this.writeDebugLog('Adding test prompts as fallback');
            logDebug('Adding test prompts as fallback');
            this._prompts = [
                {
                    timestamp: '#1',
                    shortPrompt: 'Test: robustnější řešení načítání - čekám na SpecStory data',
                    fullContent: 'Fallback test prompt while waiting for SpecStory integration'
                },
                {
                    timestamp: '#2',
                    shortPrompt: 'Test: zkontroluj debug logy pro více informací',
                    fullContent: 'Check debug output for detailed loading information'
                }
            ];
            
            // Force immediate display of fallback prompts
            this._updateView();
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        // Always update HTML when webview is created
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        logDebug(`Activity Bar HTML set with ${this._prompts.length} prompts`);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'clearAll':
                    this._prompts = [];
                    this._updateView();
                    break;
                case 'refresh':
                    this.refreshPrompts();
                    break;
            }
        });
    }

    public async addNotification(message: string) {
        const startTime = Date.now();
        this.writeDebugLog(`=== ADDING NEW NOTIFICATION START ===`);
        this.writeDebugLog(`Message: ${message}`);
        logDebug(`Adding new AI notification: ${message.substring(0, 100)}...`);
        
        // Generate timestamp for the new prompt
        const now = new Date();
        const timestamp = `#${this._prompts.length + 1} - ${now.toLocaleTimeString()}`;
        
        // Create short prompt (first line only, max 80 chars)
        const shortPrompt = message.split('\n')[0].substring(0, 80) + (message.length > 80 ? '...' : '');
        
        // Add new notification to the beginning of the array
        const newPrompt = {
            timestamp: timestamp,
            shortPrompt: shortPrompt,
            fullContent: message
        };
        
        this._prompts.unshift(newPrompt);
        this.writeDebugLog(`Added new prompt: ${shortPrompt}`);
        
        // Apply max prompts limit
        const config = vscode.workspace.getConfiguration('specstoryautosave');
        const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);
        
        if (this._prompts.length > maxPrompts) {
            this._prompts = this._prompts.slice(0, maxPrompts);
            this.writeDebugLog(`Trimmed to max ${maxPrompts} prompts`);
        }
        
        // Update the view immediately with retry mechanism
        this._updateView();
        
        // Force immediate focus switch to Activity Bar
        try {
            await vscode.commands.executeCommand('workbench.view.extension.specstoryAI');
            this.writeDebugLog('Switched to Activity Bar view');
        } catch (error) {
            this.writeDebugLog(`Failed to switch to Activity Bar: ${error}`);
        }
        
        const duration = Date.now() - startTime;
        this.writeDebugLog(`=== NOTIFICATION ADDED IN ${duration}ms ===`);
        
        // Delay SpecStory refresh to allow user to see the temporary entry first
        setTimeout(() => {
            this.loadPromptsFromSpecStory().catch(error => {
                this.writeDebugLog(`Delayed SpecStory refresh failed: ${error}`);
            });
        }, 2000); // 2 second delay before background refresh
    }

    private async refreshPrompts() {
        await this.loadPromptsFromSpecStory();
        this._updateView();
    }

    private async loadPromptsFromSpecStory() {
        try {
            this.writeDebugLog('=== STARTING ROBUST PROMPT LOADING ===');
            logDebug('=== STARTING ROBUST PROMPT LOADING ===');
            
            // Try multiple methods to find SpecStory path
            let specstoryPath = await findSpecStoryHistoryPath();
            
            if (!specstoryPath) {
                this.writeDebugLog('Primary path detection failed, trying workspace search...');
                logDebug('Primary path detection failed, trying workspace search...');
                
                // Search for .specstory/history in workspace folders
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders) {
                    for (const folder of workspaceFolders) {
                        const specstoryDir = vscode.Uri.joinPath(folder.uri, '.specstory', 'history');
                        try {
                            const stat = await vscode.workspace.fs.stat(specstoryDir);
                            if (stat.type === vscode.FileType.Directory) {
                                specstoryPath = specstoryDir.fsPath;
                                this.writeDebugLog(`Found SpecStory in workspace: ${specstoryPath}`);
                                logDebug(`Found SpecStory in workspace: ${specstoryPath}`);
                                break;
                            }
                        } catch {
                            this.writeDebugLog(`Workspace path not found: ${specstoryDir.fsPath}`);
                            logDebug(`Workspace path not found: ${specstoryDir.fsPath}`);
                        }
                    }
                }
            }
            
            if (!specstoryPath) {
                this.writeDebugLog('No SpecStory path found with any method');
                logError('No SpecStory path found with any method');
                return;
            }

            this.writeDebugLog(`Using SpecStory path: ${specstoryPath}`);
            logInfo(`Using SpecStory path: ${specstoryPath}`);

            // ALWAYS use manual file listing with proper chronological sorting
            // Skip the potentially buggy readRecentSpecStoryConversations
            this.writeDebugLog('Using direct file scanning with chronological sorting');
            logDebug('Using direct file scanning with chronological sorting');
            
            try {
                const historyUri = vscode.Uri.file(specstoryPath);
                const files = await vscode.workspace.fs.readDirectory(historyUri);
                this.writeDebugLog(`Manual directory listing found ${files.length} files`);
                logDebug(`Manual directory listing found ${files.length} files`);
                
                const mdFiles = files.filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File);
                this.writeDebugLog(`Found ${mdFiles.length} .md files`);
                logDebug(`Found ${mdFiles.length} .md files`);
                
                if (mdFiles.length > 0) {
                    // Sort files by SpecStory timestamp format (YYYY-MM-DD_HH-MMZ-description.md)
                    // Extract timestamp for proper chronological sorting
                    const sortedFiles = mdFiles.sort((a, b) => {
                        const timestampA = this.extractTimestampFromFileName(a[0]);
                        const timestampB = this.extractTimestampFromFileName(b[0]);
                        return timestampB.getTime() - timestampA.getTime(); // Newest first
                    });
                    
                    this.writeDebugLog(`Found ${mdFiles.length} SpecStory files, processing all files`);
                    logDebug(`Found ${mdFiles.length} SpecStory files, processing all files`);
                    
                    // Log all files for debugging
                    sortedFiles.forEach((file, index) => {
                        const timestamp = this.extractTimestampFromFileName(file[0]);
                        this.writeDebugLog(`File #${index + 1}: ${file[0]} (${timestamp.toISOString()})`);
                    });
                    
                    // Process ALL files, not just the latest one
                    const allUserPrompts: string[] = [];
                    
                    for (const [fileName] of sortedFiles) {
                        this.writeDebugLog(`Reading file: ${fileName}`);
                        logDebug(`Reading file: ${fileName}`);
                        
                        try {
                            const fileUri = vscode.Uri.joinPath(historyUri, fileName);
                            const fileContent = await vscode.workspace.fs.readFile(fileUri);
                            const content = Buffer.from(fileContent).toString('utf8');
                            
                            this.writeDebugLog(`File ${fileName} read successful, content length: ${content.length}`);
                            logDebug(`File ${fileName} read successful, content length: ${content.length}`);
                            
                            // Extract prompts from this file
                            const filePrompts = this.extractPromptsFromContent(content, fileName);
                            // Reverse the prompts from this file so newest prompts in file are first
                            const reversedFilePrompts = filePrompts.reverse();
                            // Add prompts to the end of array - since files are sorted newest first,
                            // this will put newest prompts at the beginning of the final array
                            allUserPrompts.push(...reversedFilePrompts);
                            
                            this.writeDebugLog(`Extracted ${filePrompts.length} prompts from ${fileName}, total so far: ${allUserPrompts.length}`);
                        } catch (fileError) {
                            this.writeDebugLog(`Failed to read file ${fileName}: ${fileError}`);
                            logError(`Failed to read file ${fileName}: ${fileError}`);
                        }
                    }
                    
                    // Transform all collected prompts to display format
                    const specstoryPrompts = allUserPrompts.map((prompt, index) => {
                        const shortPrompt = prompt.length > 120 ? prompt.substring(0, 120) + '...' : prompt;
                        const displayNumber = `#${index + 1}`;

                        return {
                            timestamp: displayNumber,
                            shortPrompt: shortPrompt,
                            fullContent: prompt
                        };
                    });

                    // Separate current notifikace (non-SpecStory) from SpecStory prompts
                    // Remove temporary "New AI prompt detected" entries when real SpecStory data is available
                    const currentNotifications = this._prompts.filter(p => {
                        // Keep entries that are NOT temporary placeholders
                        const isTemporary = (p.fullContent && p.fullContent.includes('New AI prompt detected!')) || 
                                          (p.shortPrompt && p.shortPrompt.includes('New AI prompt detected'));
                        
                        // Only keep non-temporary entries or entries with proper timestamps
                        return !isTemporary && (!p.timestamp.includes('#') || p.timestamp.includes(' - '));
                    });
                    
                    this.writeDebugLog(`Filtered out temporary entries, keeping ${currentNotifications.length} real notifications`);
                    logDebug(`Filtered out temporary entries, keeping ${currentNotifications.length} real notifications`);
                    
                    // Combine: current notifications first, then SpecStory prompts
                    this._prompts = [...currentNotifications, ...specstoryPrompts];

                    // Limit to max configured prompts
                    const config = vscode.workspace.getConfiguration('specstoryautosave');
                    const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);
                    
                    if (this._prompts.length > maxPrompts) {
                        this._prompts = this._prompts.slice(0, maxPrompts);
                    }

                    this.writeDebugLog(`Successfully processed ${specstoryPrompts.length} SpecStory prompts + ${currentNotifications.length} current notifications from ${sortedFiles.length} files`);
                    logInfo(`Successfully processed ${specstoryPrompts.length} SpecStory prompts + ${currentNotifications.length} current notifications from ${sortedFiles.length} files`);
                    
                    // Force immediate update
                    this._updateView();
                    return;
                }
            } catch (directError) {
                this.writeDebugLog(`Direct file reading failed: ${directError}`);
                logError(`Direct file reading failed: ${directError}`);
            }

        } catch (error) {
            this.writeDebugLog(`Critical error in loadPromptsFromSpecStory: ${error}`);
            logError(`Critical error in loadPromptsFromSpecStory: ${error}`);
        }
    }

    private extractPromptsFromContent(content: string, fileName: string): string[] {
        this.writeDebugLog(`=== EXTRACTING PROMPTS FROM ${fileName} ===`);
        this.writeDebugLog(`Content length: ${content.length}`);
        
        const lines = content.split('\n');
        this.writeDebugLog(`Total lines: ${lines.length}`);
        
        const userPrompts: string[] = [];
        
        // Process lines from beginning to end to maintain chronological order
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for SpecStory user marker
            if (line === '_**User**_') {
                // The next non-empty line should be the user's prompt
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    
                    // Skip empty lines and separators
                    if (nextLine === '' || nextLine === '---') {
                        continue;
                    }
                    
                    // Stop if we hit another marker
                    if (nextLine === '_**Assistant**_' || nextLine === '_**User**_' || nextLine.startsWith('#')) {
                        break;
                    }
                    
                    // This should be the user's prompt
                    if (nextLine.length > 3) {
                        userPrompts.push(nextLine);
                        this.writeDebugLog(`*** FOUND USER PROMPT in ${fileName} at line ${j + 1}: "${nextLine}"`);
                        break;
                    }
                }
            }
        }

        this.writeDebugLog(`*** ${fileName}: Found ${userPrompts.length} user prompts (chronological order)`);
        return userPrompts;
    }

    private writeDebugLog(message: string) {
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp}: ${message}\n`;
        
        try {
            const fs = require('fs');
            const path = require('path');
            const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
            const logFile = path.join(tempDir, 'specstory-debug.log');
            
            // Ensure log file exists and is writable
            if (!fs.existsSync(logFile)) {
                fs.writeFileSync(logFile, `=== SpecStory Debug Log Started ===\n`);
            }
            
            fs.appendFileSync(logFile, logEntry);
        } catch (error) {
            // Fallback to console if file write fails
            console.log(`DEBUG FALLBACK: ${message}`);
            // Try alternative temp location
            try {
                const fs = require('fs');
                const path = require('path');
                const os = require('os');
                const altLogFile = path.join(os.tmpdir(), 'specstory-debug.log');
                fs.appendFileSync(altLogFile, logEntry);
            } catch (altError) {
                console.log(`DEBUG FILE FAILED: ${error}, ALT FAILED: ${altError}`);
            }
        }
    }

    private extractTimestampFromTopic(topic: string): Date {
        // Extract timestamp from SpecStory filename like "2025-08-03_07-59Z-user-greeting..."
        const match = topic.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})Z/);
        if (match) {
            const [, date, hour, minute] = match;
            const [year, month, day] = date.split('-').map(Number);
            return new Date(year, month - 1, day, Number(hour), Number(minute), 0);
        }
        
        // Fallback to current time if parsing fails
        return new Date();
    }

    private extractTimestampFromFileName(fileName: string): Date {
        // Extract timestamp from SpecStory filename like "2025-08-03_07-59Z-description.md"
        const match = fileName.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})Z/);
        if (match) {
            const [, date, hour, minute] = match;
            const [year, month, day] = date.split('-').map(Number);
            return new Date(year, month - 1, day, Number(hour), Number(minute), 0);
        }
        
        // Fallback to epoch time if parsing fails (will be sorted last)
        return new Date(0);
    }

    public clearNotifications() {
        this._prompts = [];
        this._updateView();
    }

    public getHtmlForWebview(webview: vscode.Webview): string {
        return this._getHtmlForWebview(webview);
    }

    private _updateView() {
        const startTime = Date.now();
        this.writeDebugLog(`=== UPDATING VIEW START ===`);
        
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            const duration = Date.now() - startTime;
            this.writeDebugLog(`Activity Bar view updated in ${duration}ms`);
            logDebug(`Activity Bar view updated in ${duration}ms`);
        } else {
            this.writeDebugLog('❌ Cannot update view - _view is null');
            logDebug('❌ Cannot update view - _view is null');
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const notificationsList = this._prompts.length > 0 
            ? this._prompts.map((prompt, index) => {
                return `<div class="notification">
                    <div class="notification-header">
                        <span class="notification-time">${prompt.timestamp}</span>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${prompt.shortPrompt}</div>
                    </div>
                </div>`;
            }).join('')
            : '<div class="no-notifications">No AI prompts detected yet...<br><button onclick="refresh()">🔄 Refresh</button></div>';

        const config = vscode.workspace.getConfiguration('specstoryautosave');
        const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Activity</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    line-height: 1.4;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 8px;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }
                .header-title {
                    font-size: 12px;
                    font-weight: bold;
                    color: var(--vscode-foreground);
                }
                .header-count {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                }
                .notification {
                    background-color: var(--vscode-list-hoverBackground);
                    border: 1px solid var(--vscode-widget-border);
                    border-left: 3px solid var(--vscode-charts-blue);
                    margin: 4px 0;
                    border-radius: 4px;
                    overflow: hidden;
                    transition: background-color 0.2s ease;
                }
                .notification:hover {
                    background-color: var(--vscode-list-activeSelectionBackground);
                }
                .notification-header {
                    padding: 4px 8px;
                    background-color: var(--vscode-editor-selectionBackground);
                    border-bottom: 1px solid var(--vscode-widget-border);
                    text-align: center;
                }
                .notification-time {
                    font-size: 10px;
                    font-weight: bold;
                    color: var(--vscode-charts-blue);
                }
                .notification-content {
                    padding: 6px 8px;
                }
                .notification-title {
                    font-size: 11px;
                    font-weight: 500;
                    color: var(--vscode-foreground);
                    margin-bottom: 2px;
                }
                .no-notifications {
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                    text-align: center;
                    padding: 20px;
                    font-size: 11px;
                }
                .no-notifications button {
                    margin-top: 8px;
                    padding: 4px 8px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                }
                .settings-note {
                    font-size: 9px;
                    color: var(--vscode-descriptionForeground);
                    text-align: center;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid var(--vscode-widget-border);
                }
            </style>
            <script>
                const vscode = acquireVsCodeApi();
                function refresh() {
                    vscode.postMessage({type: 'refresh'});
                }
            </script>
        </head>
        <body>
            <div class="header">
                <span class="header-title">Recent AI Prompts</span>
                <span class="header-count">Max: ${maxPrompts}</span>
            </div>
            <div id="notifications">
                ${notificationsList}
            </div>
            <div class="settings-note">
                Configure max prompts in Settings → SpecStoryAutoSave → Activity Bar Max Prompts
            </div>
        </body>
        </html>`;
    }
}
