import * as vscode from 'vscode';

/**
 * WebView Provider for Activity Bar - handles AI activity notifications display
 */
export class AIActivityProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'specstoryAINotifications';
    private _view?: vscode.WebviewView;
    private _notifications: string[] = [];

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
                    this._notifications = [];
                    this._updateView();
                    break;
            }
        });
    }

    public addNotification(message: string) {
        const timestamp = new Date().toLocaleTimeString('cs-CZ', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        // Split multi-line message into individual prompts
        const lines = message.split('\n').filter(line => line.trim().length > 0);
        
        // Add each line as a separate notification (in reverse order to maintain chronology)
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line) {
                this._notifications.unshift(`[${timestamp}] ${line}`);
            }
        }
        
        // Get max prompts from configuration
        const config = vscode.workspace.getConfiguration('specstoryautosave');
        const maxPrompts = config.get<number>('activityBarMaxPrompts', 10);
        
        // Keep only configured number of notifications
        if (this._notifications.length > maxPrompts) {
            this._notifications = this._notifications.slice(0, maxPrompts);
        }
        
        this._updateView();
    }

    public clearNotifications() {
        this._notifications = [];
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
        const notificationsList = this._notifications.length > 0 
            ? this._notifications.map((notification, index) => {
                const [timestamp, ...messageParts] = notification.split('] ');
                const cleanTimestamp = timestamp.replace('[', '');
                const message = messageParts.join('] ');
                
                return `<div class="notification">
                    <div class="notification-header">
                        <span class="notification-time">${cleanTimestamp}</span>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${message}</div>
                    </div>
                </div>`;
            }).join('')
            : '<div class="no-notifications">No AI activity detected yet...</div>';

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
                .clear-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 4px 8px;
                    cursor: pointer;
                    border-radius: 3px;
                    font-size: 10px;
                    width: 100%;
                    margin-bottom: 8px;
                }
                .clear-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
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
                <span class="header-title">Recent AI Activity</span>
                <span class="header-count">Max: ${maxPrompts}</span>
            </div>
            <button class="clear-button" onclick="clearAll()">Clear History</button>
            <div id="notifications">
                ${notificationsList}
            </div>
            <div class="settings-note">
                Configure max prompts in Settings → SpecStoryAutoSave → Activity Bar Max Prompts
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function clearAll() {
                    vscode.postMessage({ type: 'clearAll' });
                }
            </script>
        </body>
        </html>`;
    }
}
