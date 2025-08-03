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
        // Enable debug logs temporarily for troubleshooting
        const config = vscode.workspace.getConfiguration('specstoryautosave');
        if (!config.get<boolean>('enableDebugLogs', false)) {
            config.update('enableDebugLogs', true, vscode.ConfigurationTarget.Global);
        }
        
        logDebug('Activity Bar provider constructor called');
        
        // Multiple loading attempts
        this.initializeWithRetry();
        
        // Set up periodic refresh every 30 seconds
        setInterval(() => {
            this.refreshPrompts();
        }, 30000);
    }

    private async initializeWithRetry() {
        // Try multiple times with delays
        for (let attempt = 1; attempt <= 3; attempt++) {
            logDebug(`Loading attempt ${attempt}/3`);
            
            try {
                await this.loadPromptsFromSpecStory();
                if (this._prompts.length > 0) {
                    logInfo(`Successfully loaded ${this._prompts.length} prompts on attempt ${attempt}`);
                    break;
                }
            } catch (error) {
                logError(`Attempt ${attempt} failed: ${error}`);
            }
            
            if (attempt < 3) {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
        
        // If still no prompts, add test prompts
        if (this._prompts.length === 0) {
            logDebug('Adding test prompts as fallback');
            this._prompts = [
                {
                    timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    shortPrompt: 'Test: robustnější řešení načítání - čekám na SpecStory data',
                    fullContent: 'Fallback test prompt while waiting for SpecStory integration'
                },
                {
                    timestamp: new Date(Date.now() - 120000).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    shortPrompt: 'Test: zkontroluj debug logy pro více informací',
                    fullContent: 'Check debug output for detailed loading information'
                }
            ];
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
        logDebug('Refreshing prompts from SpecStory...');
        await this.loadPromptsFromSpecStory();
        this._updateView();
    }

    private async loadPromptsFromSpecStory() {
        try {
            logDebug('=== STARTING ROBUST PROMPT LOADING ===');
            
            // Try multiple methods to find SpecStory path
            let specstoryPath = await findSpecStoryHistoryPath();
            
            if (!specstoryPath) {
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
                            logDebug(`Found SpecStory using hardcoded path: ${path}`);
                            break;
                        }
                    } catch {
                        logDebug(`Hardcoded path not found: ${path}`);
                    }
                }
            }
            
            if (!specstoryPath) {
                logError('No SpecStory path found with any method');
                return;
            }

            logInfo(`Using SpecStory path: ${specstoryPath}`);

            // Try to read conversations
            const conversations = await readRecentSpecStoryConversations(specstoryPath, 1);
            
            if (!conversations || conversations.length === 0) {
                logError('No conversations loaded from SpecStory');
                
                // Try manual file listing
                try {
                    const historyUri = vscode.Uri.file(specstoryPath);
                    const files = await vscode.workspace.fs.readDirectory(historyUri);
                    logDebug(`Manual directory listing found ${files.length} files`);
                    
                    const mdFiles = files.filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File);
                    logDebug(`Found ${mdFiles.length} .md files`);
                    
                    if (mdFiles.length > 0) {
                        // Try to read the latest file manually
                        mdFiles.sort((a, b) => b[0].localeCompare(a[0]));
                        const latestFile = mdFiles[0][0];
                        logDebug(`Attempting to read latest file manually: ${latestFile}`);
                        
                        const fileUri = vscode.Uri.joinPath(historyUri, latestFile);
                        const fileContent = await vscode.workspace.fs.readFile(fileUri);
                        const content = Buffer.from(fileContent).toString('utf8');
                        
                        logDebug(`Manual file read successful, content length: ${content.length}`);
                        
                        // Process content manually
                        this.processSpecStoryContent(content, latestFile);
                        return;
                    }
                } catch (manualError) {
                    logError(`Manual file reading failed: ${manualError}`);
                }
                return;
            }

            logDebug(`Loaded ${conversations.length} conversations successfully`);
            this.processSpecStoryContent(conversations[0].content, conversations[0].topic);

        } catch (error) {
            logError(`Critical error in loadPromptsFromSpecStory: ${error}`);
        }
    }

    private processSpecStoryContent(content: string, topic: string) {
        logDebug(`Processing SpecStory content: ${content.length} chars, topic: ${topic}`);
        
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        logDebug(`Content has ${lines.length} non-empty lines`);

        // Find ALL user prompts in the content
        const userPrompts = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lowerLine = line.toLowerCase();
            
            // Check if this line is a user prompt
            if (lowerLine.startsWith('user:') || 
                lowerLine.startsWith('**user**') ||
                line.startsWith('User:') ||
                (lowerLine.includes('user:') && !lowerLine.includes('assistant'))) {
                
                // Extract the prompt text
                let promptText = line
                    .replace(/^.*?user[:\s]*\**/i, '')
                    .replace(/^\*\*/, '')
                    .replace(/^User:\s*/i, '')
                    .trim();
                
                // If the prompt continues on next lines, collect them too
                let fullPrompt = promptText;
                let nextLineIndex = i + 1;
                while (nextLineIndex < lines.length) {
                    const nextLine = lines[nextLineIndex].trim();
                    const nextLower = nextLine.toLowerCase();
                    
                    // Stop if we hit assistant response or another user prompt
                    if (nextLower.startsWith('assistant') || 
                        nextLower.startsWith('**assistant') ||
                        nextLower.startsWith('github copilot') ||
                        nextLower.startsWith('user:') ||
                        nextLower.startsWith('**user**') ||
                        nextLine.startsWith('User:')) {
                        break;
                    }
                    
                    // Add this line to the prompt if it's not empty
                    if (nextLine.length > 0) {
                        fullPrompt += ' ' + nextLine;
                    }
                    nextLineIndex++;
                }
                
                if (fullPrompt.length > 0) {
                    userPrompts.push(fullPrompt);
                    logDebug(`Found user prompt ${userPrompts.length}: "${fullPrompt.substring(0, 50)}..."`);
                }
            }
        }

        logDebug(`Extracted ${userPrompts.length} user prompts from content`);

        // Transform user prompts to display format
        this._prompts = userPrompts.map((prompt, index) => {
            const shortPrompt = prompt.length > 120 ? prompt.substring(0, 120) + '...' : prompt;
            
            // Generate timestamps in reverse order (newest first) with seconds
            const timestamp = new Date(Date.now() - (index * 60000)).toLocaleTimeString('cs-CZ', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });

            return {
                timestamp: timestamp,
                shortPrompt: shortPrompt,
                fullContent: prompt
            };
        });

        // Get max prompts from configuration and limit
        const config = vscode.workspace.getConfiguration('specstoryautosave');
        const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);
        
        // Keep only configured number of prompts (most recent first)
        if (this._prompts.length > maxPrompts) {
            this._prompts = this._prompts.slice(0, maxPrompts);
        }

        logInfo(`Successfully processed ${this._prompts.length} prompts for Activity Bar`);
        
        // Debug: log all loaded prompts
        this._prompts.forEach((prompt, index) => {
            logDebug(`Prompt ${index + 1}: [${prompt.timestamp}] ${prompt.shortPrompt}`);
        });
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
