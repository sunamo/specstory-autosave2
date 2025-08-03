import * as vscode from 'vscode';
import { findSpecStoryHistoryPath, readRecentSpecStoryConversations } from './specstory/historyReader';

/**
 * WebView Provider for Activity Bar - handles AI activity notifications display
 */
export class AIActivityProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'specstoryAINotifications';
    private _view?: vscode.WebviewView;
    private _prompts: {timestamp: string, shortPrompt: string, fullContent?: string}[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) {}

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

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

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
            const specstoryPath = await findSpecStoryHistoryPath();
            if (!specstoryPath) {
                return;
            }

            const conversations = await readRecentSpecStoryConversations(specstoryPath, 10, undefined as any);
            if (!conversations || conversations.length === 0) {
                return;
            }

            // Transform conversations to prompts with shortened content
            this._prompts = conversations.map(conv => {
                const lines = conv.content.split('\n');
                
                // Find user prompts (lines starting with "User:" or similar)
                const userLines = lines.filter(line => 
                    line.trim().toLowerCase().startsWith('user:') || 
                    line.trim().toLowerCase().startsWith('**user**') ||
                    line.includes('User:')
                ).slice(0, 1); // Take first user prompt

                let shortPrompt = 'AI activity detected';
                if (userLines.length > 0) {
                    const userLine = userLines[0].replace(/^.*?user[:\s]*\**/i, '').trim();
                    shortPrompt = userLine.length > 60 ? userLine.substring(0, 60) + '...' : userLine;
                }

                return {
                    timestamp: conv.timestamp || new Date().toLocaleTimeString('cs-CZ', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                    }),
                    shortPrompt: shortPrompt,
                    fullContent: conv.content
                };
            });

            // Get max prompts from configuration
            const config = vscode.workspace.getConfiguration('specstoryautosave');
            const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);
            
            // Keep only configured number of prompts
            if (this._prompts.length > maxPrompts) {
                this._prompts = this._prompts.slice(0, maxPrompts);
            }
        } catch (error) {
            console.error('Failed to load prompts from SpecStory:', error);
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
