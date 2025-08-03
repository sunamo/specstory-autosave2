import * as vscode from 'vscode';

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 Advanced GitHub Copilot Chat detection based on source code analysis');
    
    // Check Copilot availability
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    if (!copilotExt || !copilotChatExt) {
        debugChannel.appendLine('❌ Missing Copilot extensions');
        return [];
    }
    
    debugChannel.appendLine(`✅ Copilot extensions found`);

    let lastChatContent = '';
    let lastActivityTime = 0;

    // Method 1: Enhanced text document change monitoring
    // Na základě analýzy zdrojového kódu - sledujeme změny v chat dokumentech
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri;
        const scheme = uri.scheme;
        
        // Skip náš vlastní output
        if (uri.toString().includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Detekce pro všechny Copilot Chat schemes
        if (scheme === 'chat-editing-snapshot-text-model' || 
            scheme === 'vscode-chat-input' ||
            uri.toString().includes('copilot') ||
            uri.toString().includes('chat')) {
            
            const currentText = event.document.getText();
            const now = Date.now();
            
            for (const change of event.contentChanges) {
                // Detekce odeslání zprávy na základě analýzy Copilot Chat kódu
                const isMessageSubmitted = (
                    // Úplné vymazání textu (častý pattern při odeslání)
                    (change.text === '' && change.rangeLength > 3) ||
                    // Nebo značné zmenšení obsahu (>80% textu zmizelo)
                    (currentText.length < lastChatContent.length * 0.2 && change.rangeLength > 5) ||
                    // Detekce "acceptInput" pattern - když se text najednou zkrátí
                    (lastChatContent.length > 10 && currentText.length < 3 && change.rangeLength > 7)
                );
                
                if (isMessageSubmitted && now - lastActivityTime > 200) {
                    debugChannel.appendLine(`🚀 Chat message submitted! (change: -${change.rangeLength} chars, scheme: ${scheme})`);
                    debugChannel.appendLine(`   Previous content length: ${lastChatContent.length}, new: ${currentText.length}`);
                    handleAIActivity();
                    lastActivityTime = now;
                    break;
                }
            }
            
            // Aktualizace posledního obsahu
            if (currentText.length > lastChatContent.length) {
                lastChatContent = currentText;
            }
        }
    });

    // Method 2: Command execution monitoring
    // Na základě analýzy zdrojových kódů - sledujeme spuštění příkazů souvisejících s chatem
    const commandListener = vscode.commands.registerCommand('specstoryautosave.detectChatSubmit', () => {
        debugChannel.appendLine(`⚡ Chat submit command detected!`);
        handleAIActivity();
    });

    // Registrace posluchače pro workbench akce (inspirováno zdrojovým kódem)
    const registerWorkbenchCommandListener = () => {
        try {
            // Sledujeme známé příkazy pro chat
            const chatCommands = [
                'workbench.action.chat.submit',
                'workbench.action.chat.sendMessage',
                'interactive.acceptInput',
                'chat.action.submit'
            ];
            
            const listeners: vscode.Disposable[] = [];
            
            chatCommands.forEach(commandId => {
                try {
                    // Registrujeme posluchač pro každý příkaz
                    const listener = vscode.commands.registerCommand(`specstoryautosave.listen.${commandId}`, () => {
                        debugChannel.appendLine(`⚡ Chat command intercepted: ${commandId}`);
                        handleAIActivity();
                    });
                    listeners.push(listener);
                } catch (error) {
                    // Některé příkazy nemusí existovat, to je v pořádku
                }
            });
            
            return listeners;
        } catch (error) {
            debugChannel.appendLine(`⚠️ Could not register command listeners: ${error}`);
            return [];
        }
    };

    const commandListeners = registerWorkbenchCommandListener();

    // Method 3: Enhanced selection change monitoring
    // Na základě analýzy InteractiveEditorWidget - sledujeme změny selection
    const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection((event) => {
        const editor = event.textEditor;
        if (editor && (
            editor.document.uri.scheme === 'chat-editing-snapshot-text-model' ||
            editor.document.uri.scheme === 'vscode-chat-input' ||
            editor.document.uri.toString().includes('copilot') ||
            editor.document.uri.toString().includes('chat')
        )) {
            const now = Date.now();
            
            // Detekce rychlých změn selection (typické při submit)
            if (now - lastActivityTime > 100) {
                const currentText = editor.document.getText();
                
                // Pokud je text prázdný nebo velmi krátký po předchozí aktivitě
                if ((currentText.length === 0 || currentText.trim() === '') && lastChatContent.length > 5) {
                    debugChannel.appendLine(`⚡ Chat cleared via selection change - message submitted!`);
                    debugChannel.appendLine(`   Previous: "${lastChatContent.substring(0, 50)}...", now empty`);
                    handleAIActivity();
                    lastActivityTime = now;
                    lastChatContent = '';
                }
            }
        }
    });

    // Method 4: Active editor monitoring
    // Sledujeme přepínání editorů pro lepší kontext
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && (
            editor.document.uri.scheme === 'chat-editing-snapshot-text-model' ||
            editor.document.uri.scheme === 'vscode-chat-input' ||
            editor.document.uri.toString().includes('copilot') ||
            editor.document.uri.toString().includes('chat')
        )) {
            debugChannel.appendLine(`📝 Switched to Copilot Chat editor (${editor.document.uri.scheme})`);
            lastChatContent = editor.document.getText();
        }
    });

    // Method 5: Focus change monitoring  
    // Sledujeme ztrátu fokusu z chat editorů (může indikovat submit)
    const focusListener = vscode.window.onDidChangeWindowState((state) => {
        if (!state.focused) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && (
                activeEditor.document.uri.scheme === 'chat-editing-snapshot-text-model' ||
                activeEditor.document.uri.toString().includes('copilot')
            )) {
                // Možná submit když ztratíme fokus
                setTimeout(() => {
                    const currentText = activeEditor.document.getText();
                    if (currentText.length < lastChatContent.length * 0.5) {
                        debugChannel.appendLine(`⚡ Focus change detected possible chat submit`);
                        handleAIActivity();
                    }
                }, 100);
            }
        }
    });

    debugChannel.appendLine('✅ Advanced Copilot Chat detection active (5 methods)');
    
    const allListeners = [
        textChangeListener, 
        commandListener, 
        selectionChangeListener, 
        editorChangeListener,
        focusListener,
        ...commandListeners
    ];
    
    return allListeners;
}
