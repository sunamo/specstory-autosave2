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
        await this.loadPromptsFromSpecStory();
        this._updateView();
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
                this.writeDebugLog('Primary path detection failed, trying alternative methods...');
                logDebug('Primary path detection failed, trying alternative methods...');
                
                // Try hardcoded common paths
                const commonPaths = [
                    'C:\\Proj_Net\\portal-ui\\.specstory\\history',
                    'C:\\Proj_Net\\.specstory\\history',
                    'E:\\vs\\.specstory\\history'
                ];
                
                for (const path of commonPaths) {
                    try {
                        const testUri = vscode.Uri.file(path);
                        const stat = await vscode.workspace.fs.stat(testUri);
                        if (stat.type === vscode.FileType.Directory) {
                            specstoryPath = path;
                            this.writeDebugLog(`Found SpecStory using hardcoded path: ${path}`);
                            logDebug(`Found SpecStory using hardcoded path: ${path}`);
                            break;
                        }
                    } catch {
                        this.writeDebugLog(`Hardcoded path not found: ${path}`);
                        logDebug(`Hardcoded path not found: ${path}`);
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

            // Try to read conversations
            const conversations = await readRecentSpecStoryConversations(specstoryPath, 1);
            
            if (!conversations || conversations.length === 0) {
                this.writeDebugLog('No conversations loaded from SpecStory');
                logError('No conversations loaded from SpecStory');
                
                // Try manual file listing
                try {
                    const historyUri = vscode.Uri.file(specstoryPath);
                    const files = await vscode.workspace.fs.readDirectory(historyUri);
                    this.writeDebugLog(`Manual directory listing found ${files.length} files`);
                    logDebug(`Manual directory listing found ${files.length} files`);
                    
                    const mdFiles = files.filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File);
                    this.writeDebugLog(`Found ${mdFiles.length} .md files`);
                    logDebug(`Found ${mdFiles.length} .md files`);
                    
                    if (mdFiles.length > 0) {
                        // Try to read the latest file manually
                        mdFiles.sort((a, b) => b[0].localeCompare(a[0]));
                        const latestFile = mdFiles[0][0];
                        this.writeDebugLog(`Attempting to read latest file manually: ${latestFile}`);
                        logDebug(`Attempting to read latest file manually: ${latestFile}`);
                        
                        const fileUri = vscode.Uri.joinPath(historyUri, latestFile);
                        const fileContent = await vscode.workspace.fs.readFile(fileUri);
                        const content = Buffer.from(fileContent).toString('utf8');
                        
                        this.writeDebugLog(`Manual file read successful, content length: ${content.length}`);
                        logDebug(`Manual file read successful, content length: ${content.length}`);
                        
                        // Process content manually
                        this.processSpecStoryContent(content, latestFile);
                        return;
                    }
                } catch (manualError) {
                    this.writeDebugLog(`Manual file reading failed: ${manualError}`);
                    logError(`Manual file reading failed: ${manualError}`);
                }
                return;
            }

            this.writeDebugLog(`Loaded ${conversations.length} conversations successfully`);
            logDebug(`Loaded ${conversations.length} conversations successfully`);
            
            // DEBUG: Check conversation structure
            const conv = conversations[0];
            this.writeDebugLog(`Conversation structure: ${JSON.stringify(Object.keys(conv))}`);
            this.writeDebugLog(`Conversation topic: "${conv.topic}"`);
            this.writeDebugLog(`Conversation content length: ${conv.content ? conv.content.length : 'undefined'}`);
            
            if (!conv.content) {
                this.writeDebugLog('ERROR: Conversation content is missing!');
                logError('Conversation content is missing!');
                return;
            }
            
            if (!conv.topic) {
                this.writeDebugLog('ERROR: Conversation topic is missing!');
                logError('Conversation topic is missing!');
                return;
            }
            
            this.processSpecStoryContent(conv.content, conv.topic);

        } catch (error) {
            this.writeDebugLog(`Critical error in loadPromptsFromSpecStory: ${error}`);
            logError(`Critical error in loadPromptsFromSpecStory: ${error}`);
        }
    }

    private processSpecStoryContent(content: string, topic: string) {
        // Create debug log file
        this.writeDebugLog(`=== PROCESSING SPECSTORY CONTENT ===`);
        this.writeDebugLog(`Topic: ${topic}`);
        this.writeDebugLog(`Content length: ${content.length}`);
        
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        this.writeDebugLog(`Total non-empty lines: ${lines.length}`);
        
        // Log first 20 lines for analysis
        this.writeDebugLog(`=== FIRST 20 LINES ===`);
        lines.slice(0, 20).forEach((line, index) => {
            this.writeDebugLog(`Line ${index + 1}: "${line}"`);
        });
        
        const userPrompts = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lowerLine = line.toLowerCase();
            
            // COMPLETELY DIFFERENT APPROACH: Look for HUMAN input patterns, not AI responses
            const isRealUserRequest = 
                // Direct user markers
                lowerLine.startsWith('user:') || 
                lowerLine.startsWith('**user**') ||
                line.startsWith('User:') ||
                // OR lines that contain human speech patterns and are NOT AI responses
                (line.length > 8 && 
                 // EXCLUDE AI response patterns
                 !lowerLine.includes('github copilot') &&
                 !lowerLine.includes('copilot') &&
                 !lowerLine.includes('assistant') &&
                 !lowerLine.includes('here is') &&
                 !lowerLine.includes('here\'s') &&
                 !lowerLine.includes('i can help') &&
                 !lowerLine.includes('i\'ll help') &&
                 !lowerLine.includes('let me') &&
                 !lowerLine.includes('i\'ll create') &&
                 !lowerLine.includes('i\'ll fix') &&
                 !lowerLine.includes('i\'ll update') &&
                 !lowerLine.includes('perfect!') &&
                 !lowerLine.includes('excellent!') &&
                 !lowerLine.includes('great!') &&
                 !lowerLine.startsWith('#') &&
                 !lowerLine.startsWith('<!--') &&
                 !lowerLine.startsWith('---') &&
                 !lowerLine.startsWith('```') &&
                 !lowerLine.includes('generated by') &&
                 // INCLUDE human request patterns
                 (
                  // Czech human requests - INCLUDING "napiš" pattern!
                  lowerLine.includes('napiš') ||
                  lowerLine.includes('můžeš') || 
                  lowerLine.includes('prosím') ||
                  lowerLine.includes('potřebuji') ||
                  lowerLine.includes('chci') ||
                  lowerLine.includes('chtěl') ||
                  lowerLine.includes('dej mi') ||
                  lowerLine.includes('udělej') ||
                  lowerLine.includes('vytvoř') ||
                  lowerLine.includes('oprav') ||
                  lowerLine.includes('změň') ||
                  lowerLine.includes('pomož') ||
                  lowerLine.includes('vysvětli') ||
                  lowerLine.includes('ukáž') ||
                  lowerLine.includes('najdi') ||
                  lowerLine.includes('zkontroluj') ||
                  lowerLine.startsWith('38napiš') ||
                  lowerLine.startsWith('37napiš') ||
                  lowerLine.startsWith('36napiš') ||
                  // Czech questions
                  (lowerLine.includes('?') && (
                    lowerLine.includes('jak') ||
                    lowerLine.includes('co') ||
                    lowerLine.includes('kde') ||
                    lowerLine.includes('kdy') ||
                    lowerLine.includes('proč') ||
                    lowerLine.includes('který') ||
                    lowerLine.includes('jaký')
                  )) ||
                  // English human requests  
                  lowerLine.includes('please') ||
                  lowerLine.includes('could you') ||
                  lowerLine.includes('can you') ||
                  lowerLine.includes('would you') ||
                  lowerLine.includes('i need') ||
                  lowerLine.includes('i want') ||
                  lowerLine.includes('help me') ||
                  lowerLine.startsWith('create') ||
                  lowerLine.startsWith('make') ||
                  lowerLine.startsWith('fix') ||
                  lowerLine.startsWith('change') ||
                  lowerLine.startsWith('update') ||
                  lowerLine.startsWith('show') ||
                  lowerLine.startsWith('find') ||
                  lowerLine.startsWith('write')
                 )
                );
            
            if (isRealUserRequest) {
                this.writeDebugLog(`*** FOUND USER REQUEST at line ${i + 1}: "${line}"`);
                
                // Clean up prompt text
                let promptText = line
                    .replace(/^.*?user[:\s]*\**/i, '')
                    .replace(/^\*\*user\*\*[:\s]*/i, '')
                    .replace(/^User:\s*/i, '')
                    .trim();
                
                if (promptText.length < 5) {
                    promptText = line.trim();
                }
                
                if (promptText.length > 5) {
                    userPrompts.push(promptText);
                    this.writeDebugLog(`*** ADDED USER REQUEST #${userPrompts.length}: "${promptText.substring(0, 100)}"`);
                }
            }
        }

        this.writeDebugLog(`*** FINAL: Found ${userPrompts.length} user requests`);

        // Transform user prompts to display format with SIMPLE NUMBERING
        this._prompts = userPrompts.map((prompt, index) => {
            const shortPrompt = prompt.length > 120 ? prompt.substring(0, 120) + '...' : prompt;
            
            // Use simple numbering instead of timestamps since SpecStory doesn't have them
            const displayNumber = `#${userPrompts.length - index}`;

            return {
                timestamp: displayNumber,
                shortPrompt: shortPrompt,
                fullContent: prompt
            };
        });

        // Limit to max configured prompts
        const config = vscode.workspace.getConfiguration('specstoryautosave');
        const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);
        
        if (this._prompts.length > maxPrompts) {
            this._prompts = this._prompts.slice(0, maxPrompts);
        }

        this.writeDebugLog(`Successfully processed ${this._prompts.length} prompts for Activity Bar`);
        
        // Force immediate update
        this._updateView();
        
        logInfo(`Successfully processed ${this._prompts.length} prompts for Activity Bar`);
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
                const altLogFile = path.join('C:\\temp', 'specstory-debug.log');
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

    public clearNotifications() {
        this._prompts = [];
        this._updateView();
    }

    public getHtmlForWebview(webview: vscode.Webview): string {
        return this._getHtmlForWebview(webview);
    }

    private _updateView() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
            logDebug('Activity Bar view updated');
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
