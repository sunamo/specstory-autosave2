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
        // Preload prompts when provider is created
        this.loadPromptsFromSpecStory().then(() => {
            logDebug(`Activity Bar provider initialized with ${this._prompts.length} prompts`);
        }).catch(error => {
            logError(`Failed to preload prompts for Activity Bar: ${error}`);
        });
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

        // Load prompts immediately when webview is created
        this.loadPromptsFromSpecStory().then(() => {
            if (webviewView.webview) {
                webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
                logDebug(`Activity Bar HTML updated with ${this._prompts.length} prompts`);
            }
        }).catch(error => {
            logError(`Failed to initialize Activity Bar with prompts: ${error}`);
            // Set fallback HTML even if prompts fail to load
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        });

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'clearAll':
                    this._prompts = [];
                    this._updateView();
                    break;
            }
        });
    }

    public async addNotification(message: string) {
        // Reload prompts from SpecStory history when notification is added
        await this.loadPromptsFromSpecStory();
        this._updateView();
    }

    private async loadPromptsFromSpecStory() {
        try {
            logDebug('Starting to load prompts from SpecStory for Activity Bar...');
            
            const specstoryPath = await findSpecStoryHistoryPath();
            if (!specstoryPath) {
                logDebug('No SpecStory path found for Activity Bar');
                return;
            }

            logDebug(`Found SpecStory path: ${specstoryPath}`);

            const conversations = await readRecentSpecStoryConversations(specstoryPath, 15, undefined as any);
            if (!conversations || conversations.length === 0) {
                logDebug('No conversations found for Activity Bar');
                return;
            }

            logDebug(`Found ${conversations.length} conversations for Activity Bar`);

            // Transform conversations to prompts with shortened content
            this._prompts = conversations.map((conv, index) => {
                const lines = conv.content.split('\n').filter(line => line.trim().length > 0);
                
                logDebug(`Processing conversation ${index + 1}, lines: ${lines.length}, topic: ${conv.topic}`);

                // Find user prompts (multiple patterns to catch different formats)
                const userLines = lines.filter(line => {
                    const trimmed = line.trim().toLowerCase();
                    return trimmed.startsWith('user:') || 
                           trimmed.startsWith('**user**') ||
                           trimmed.includes('user:') ||
                           line.trim().startsWith('User:') ||
                           (trimmed.length > 10 && 
                            !trimmed.startsWith('assistant') && 
                            !trimmed.startsWith('**assistant') &&
                            !trimmed.startsWith('github copilot'));
                });

                let shortPrompt = `Prompt #${conversations.length - index}`;
                if (userLines.length > 0) {
                    // Take the first meaningful user line
                    const userLine = userLines[0]
                        .replace(/^.*?user[:\s]*\**/i, '')
                        .replace(/^\*\*/, '')
                        .replace(/^User:\s*/i, '')
                        .trim();
                    
                    if (userLine.length > 0) {
                        shortPrompt = userLine.length > 80 ? userLine.substring(0, 80) + '...' : userLine;
                        logDebug(`Extracted user prompt: "${shortPrompt}"`);
                    }
                } else {
                    // Fallback: use conversation topic or first non-empty line
                    if (conv.topic && conv.topic.trim().length > 0) {
                        shortPrompt = conv.topic.length > 80 ? conv.topic.substring(0, 80) + '...' : conv.topic;
                    } else if (lines.length > 0) {
                        const firstLine = lines[0].trim();
                        shortPrompt = firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine;
                    }
                }

                // Use file timestamp if available, otherwise current time with different seconds
                const timestamp = conv.timestamp || new Date(Date.now() - (index * 1000)).toLocaleTimeString('cs-CZ', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                });

                return {
                    timestamp: timestamp,
                    shortPrompt: shortPrompt,
                    fullContent: conv.content
                };
            });

            // Get max prompts from configuration and limit
            const config = vscode.workspace.getConfiguration('specstoryautosave');
            const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);
            
            // Keep only configured number of prompts (most recent first)
            if (this._prompts.length > maxPrompts) {
                this._prompts = this._prompts.slice(0, maxPrompts);
            }

            logInfo(`Successfully loaded ${this._prompts.length} prompts for Activity Bar`);
            
            // Debug: log all loaded prompts
            this._prompts.forEach((prompt, index) => {
                logDebug(`Prompt ${index + 1}: [${prompt.timestamp}] ${prompt.shortPrompt}`);
            });

        } catch (error) {
            logError(`Failed to load prompts from SpecStory for Activity Bar: ${error}`);
        }
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
            : '<div class="no-notifications">No AI prompts detected yet...</div>';

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
                .notification-details {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                    line-height: 1.3;
                }
                .no-notifications {
                    color: var(--vscode-descriptionForeground);
                    font-style: italic;
                    text-align: center;
                    padding: 20px;
                    font-size: 11px;
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
