import * as vscode from 'vscode';

/**
 * Advanced detection methods - enhanced webview monitoring, pattern detection
 */
export function initializeAdvancedDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel,
    lastDetectedTime: { value: number }
) {
    debugChannel.appendLine('[DEBUG] 🔍 Initializing ADVANCED detection (panels + patterns)...');
    
    const disposables: vscode.Disposable[] = [];
    
    // Enhanced webview detection for Copilot Chat
    const disposable1 = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) return;
        
        const uri = editor.document.uri;
        const scheme = uri.scheme;
        const path = uri.path;
        const fullUri = uri.toString();
        
        debugChannel.appendLine(`[DEBUG] 👁️ Editor changed: ${scheme}:${path}`);
        
        // Skip our own debug channels
        if (path.includes('SpecStoryAutoSave') || scheme === 'output') {
            return;
        }
        
        // Enhanced detection for webview-based chat
        if (scheme === 'webview-panel' || 
            fullUri.includes('copilot') ||
            fullUri.includes('chat') ||
            scheme.includes('copilot') || 
            scheme.includes('webview') ||
            path.includes('copilot') ||
            path.includes('chat')) {
            
            debugChannel.appendLine(`[DEBUG] 👁️ POTENTIAL COPILOT PANEL: ${fullUri}`);
            
            const now = Date.now();
            if (now - lastDetectedTime.value > 3000) {
                lastDetectedTime.value = now;
                debugChannel.appendLine('[DEBUG] 🚀 ADVANCED WEBVIEW DETECTION!');
                handleAIActivity();
            }
        }
    });
    disposables.push(disposable1);
    
    // Document pattern detection (with filtering)
    const disposable2 = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri.toString();
        const content = event.document.getText();
        
        // Skip our own channels and non-relevant documents
        if (uri.includes('extension-output') || 
            uri.includes('SpecStoryAutoSave') ||
            uri.includes('output:')) {
            return;
        }
        
        // Look for AI patterns in relevant documents
        if (uri.includes('copilot') || 
            uri.includes('chat') ||
            (uri.includes('webview') && !uri.includes('extension-output'))) {
            
            const aiPatterns = [
                /ccreq:/i,
                /github[\s\-_]?copilot/i,
                /user:\s*\n/i,
                /assistant:\s*\n/i,
                /requestId:/i,
                /finish\s+reason:/i,
                /GitHub\s+Copilot/i,
                /@workspace/i,
                /@terminal/i
            ];
            
            const hasAIPattern = aiPatterns.some(pattern => pattern.test(content));
            
            if (hasAIPattern && content.length > 10) {
                debugChannel.appendLine(`[DEBUG] 🔍 AI PATTERN in: ${uri.substring(0, 50)}...`);
                
                const now = Date.now();
                if (now - lastDetectedTime.value > 2000) {
                    lastDetectedTime.value = now;
                    debugChannel.appendLine('[DEBUG] 🔍 AI PATTERN DETECTED!');
                    debugChannel.appendLine('[DEBUG] 🚀 ADVANCED PATTERN DETECTION!');
                    handleAIActivity();
                }
            }
        }
    });
    disposables.push(disposable2);
    
    debugChannel.appendLine('[DEBUG] ✅ Advanced detection with webview hooks installed');
    
    return disposables;
}
