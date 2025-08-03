import * as vscode from 'vscode';

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 Simple Enter key detection for Copilot Chat');
    
    // Check Copilot availability
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    if (!copilotExt || !copilotChatExt) {
        debugChannel.appendLine('❌ Missing Copilot extensions');
        return [];
    }
    
    debugChannel.appendLine(`✅ Copilot extensions found`);

    // Method 1: Simple text document change monitoring
    // Detekce na základě změn v chat dokumentech
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri;
        const scheme = uri.scheme;
        
        // Skip náš vlastní output
        if (uri.toString().includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Pouze pro Copilot Chat scheme
        if (scheme === 'chat-editing-snapshot-text-model') {
            const currentText = event.document.getText();
            
            for (const change of event.contentChanges) {
                // Detekce odeslání zprávy = značné zmenšení textu nebo úplné vymazání
                const isMessageSent = (
                    // Úplné vymazání textu
                    (change.text === '' && change.rangeLength > 5) ||
                    // Nebo značné zmenšenie (>70% textu zmizelo)
                    (currentText.length < event.document.getText().length * 0.3 && change.rangeLength > 10)
                );
                
                if (isMessageSent) {
                    debugChannel.appendLine(`🚀 Copilot message sent! (text change: -${change.rangeLength} chars)`);
                    handleAIActivity();
                    break;
                }
            }
        }
    });

    // Method 2: Key binding monitoring
    // Přímé zachytávání Enter klávesy pouze v Copilot Chat kontextu
    const keyListener = vscode.commands.registerCommand('type', (args) => {
        const activeEditor = vscode.window.activeTextEditor;
        
        if (activeEditor && 
            activeEditor.document.uri.scheme === 'chat-editing-snapshot-text-model' &&
            args && args.text === '\n') {
            
            debugChannel.appendLine(`⚡ Enter pressed in Copilot Chat!`);
            
            // Malé zpoždění aby se zpráva stihla odeslat
            setTimeout(() => {
                handleAIActivity();
            }, 100);
        }
        
        // KRITICKÉ: Předáváme příkaz dál, aby se nezablokoval normální typing
        return vscode.commands.executeCommand('default:type', args);
    });

    // Method 3: Active editor change monitoring
    // Detekce kdy se uživatel přepne do Copilot Chat
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.uri.scheme === 'chat-editing-snapshot-text-model') {
            debugChannel.appendLine(`📝 Switched to Copilot Chat editor`);
        }
    });

    debugChannel.appendLine('✅ Simple Enter detection active (3 methods)');
    
    return [textChangeListener, keyListener, editorChangeListener];
}
