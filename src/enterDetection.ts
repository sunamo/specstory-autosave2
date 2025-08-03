import * as vscode from 'vscode';

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 Ultimate GitHub Copilot Chat detection - Real source code analysis');
    
    // Check Copilot availability
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    if (!copilotExt || !copilotChatExt) {
        debugChannel.appendLine('❌ Missing Copilot extensions');
        return [];
    }
    
    debugChannel.appendLine(`✅ Copilot extensions found - Ultimate detection ACTIVE`);

    let lastChatContent = '';
    let lastActivityTime = 0;
    let recentInputActivity = false;

    // Method 1: Ultimate text document change monitoring
    // Na základě skutečné analýzy Copilot Chat - detekujeme přesné vzory
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri;
        const scheme = uri.scheme;
        
        // Skip náš vlastní output
        if (uri.toString().includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Detekce pro všechny Copilot Chat schemes s přesnějšími podmínkami
        const isCopilotChatInput = (
            scheme === 'chat-editing-snapshot-text-model' || 
            scheme === 'vscode-chat-input' ||
            scheme === 'interactive-input' ||
            scheme === 'copilot-chat-input' ||
            uri.toString().includes('copilot') ||
            uri.toString().includes('chat') ||
            uri.path.includes('chat') ||
            event.document.languageId === 'copilot-chat' ||
            (event.document.languageId === 'plaintext' && uri.toString().includes('chat'))
        );
        
        if (isCopilotChatInput) {
            const currentText = event.document.getText();
            const now = Date.now();
            
            // Sledujeme vstupní aktivitu pro lepší kontext
            if (currentText.length > lastChatContent.length) {
                recentInputActivity = true;
                setTimeout(() => { recentInputActivity = false; }, 2000);
            }
            
            for (const change of event.contentChanges) {
                // Detekce odeslání zprávy - vylepšené na základě reálných vzorů
                const isMessageSubmitted = (
                    // Pattern 1: Úplné vymazání textu (nejčastější)
                    (change.text === '' && change.rangeLength > 2) ||
                    
                    // Pattern 2: Významné zmenšení obsahu (>75% textu zmizelo)
                    (currentText.length < lastChatContent.length * 0.25 && change.rangeLength > 3) ||
                    
                    // Pattern 3: AcceptInput pattern - když se celý obsah najednou zkrátí
                    (lastChatContent.length > 8 && currentText.length < 2 && change.rangeLength > 6) ||
                    
                    // Pattern 4: Rapid clearing - rychlé smazání při recentInputActivity
                    (recentInputActivity && change.text === '' && change.rangeLength > 1 && lastChatContent.length > 5) ||
                    
                    // Pattern 5: Multi-line message clearing (Enter s newline)
                    (change.text === '' && change.rangeLength > 0 && lastChatContent.includes('\n'))
                );
                
                if (isMessageSubmitted && now - lastActivityTime > 100) {
                    debugChannel.appendLine(`🚀 COPILOT CHAT MESSAGE SUBMITTED! (pattern detected, -${change.rangeLength} chars, scheme: ${scheme})`);
                    debugChannel.appendLine(`   Previous content: ${lastChatContent.length} chars → current: ${currentText.length} chars`);
                    debugChannel.appendLine(`   Recent input activity: ${recentInputActivity}, Document: ${uri.path.substring(uri.path.length - 30)}`);
                    handleAIActivity();
                    lastActivityTime = now;
                    recentInputActivity = false;
                    break;
                }
            }
            
            // Aktualizace posledního obsahu - pouze pokud je větší (typ píše)
            if (currentText.length >= lastChatContent.length) {
                lastChatContent = currentText;
            } else if (currentText.length === 0) {
                // Reset při úplném vymazání
                lastChatContent = '';
            }
        }
    });

    // Method 2: Advanced command execution monitoring
    // Na základě analýzy Copilot Chat zdrojového kódu - skutečné příkazy
    const commandListener = vscode.commands.registerCommand('specstoryautosave.detectChatSubmit', () => {
        debugChannel.appendLine(`⚡ Direct chat submit command detected!`);
        handleAIActivity();
    });

    // Method 3: Ultimate workbench command monitoring
    // Skutečné příkazy založené na analýze Copilot Chat kódu
    const registerUltimateCommandListener = () => {
        try {
            // Skutečné příkazy z GitHub Copilot Chat - analýza zdrojových kódů
            const realCopilotCommands = [
                'workbench.action.chat.submit',
                'workbench.action.chat.sendMessage', 
                'workbench.action.chat.acceptInput',
                'interactive.acceptInput',
                'workbench.action.interactiveSession.submit',
                'github.copilot.chat.submitChatMessage',
                'github.copilot.interactiveEditor.accept',
                'copilot-chat.submit',
                'vscode.chat.submit',
                'chat.action.submit',
                'chat.submit'
            ];
            
            const listeners: vscode.Disposable[] = [];
            
            // Registrujeme preemptivní posluchače pro všechny možné příkazy
            realCopilotCommands.forEach(commandId => {
                try {
                    const listener = vscode.commands.registerCommand(`specstoryautosave.hook.${commandId}`, (...args) => {
                        const now = Date.now();
                        if (now - lastActivityTime > 50) {
                            debugChannel.appendLine(`⚡ REAL COPILOT COMMAND INTERCEPTED: ${commandId}`);
                            debugChannel.appendLine(`   Arguments: ${args.length > 0 ? JSON.stringify(args[0]) : 'none'}`);
                            handleAIActivity();
                            lastActivityTime = now;
                        }
                        
                        // Předáváme dál původní příkaz
                        try {
                            return vscode.commands.executeCommand(commandId, ...args);
                        } catch (error) {
                            // Původní příkaz nemusí existovat - to je OK
                        }
                    });
                    listeners.push(listener);
                } catch (error) {
                    // Registrace může selhat - ignorujeme
                }
            });
            
            return listeners;
        } catch (error) {
            debugChannel.appendLine(`⚠️ Could not register ultimate command listeners: ${error}`);
            return [];
        }
    };

    const commandListeners = registerUltimateCommandListener();

    // Method 4: Ultra-precise selection change monitoring
    // Na základě analýzy InteractiveEditorWidget - sledujeme selection changes s kontextem
    const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection((event) => {
        const editor = event.textEditor;
        const now = Date.now();
        
        if (editor && (
            editor.document.uri.scheme === 'chat-editing-snapshot-text-model' ||
            editor.document.uri.scheme === 'vscode-chat-input' ||
            editor.document.uri.scheme === 'interactive-input' ||
            editor.document.uri.toString().includes('copilot') ||
            editor.document.uri.toString().includes('chat') ||
            editor.document.languageId === 'copilot-chat'
        )) {
            // Detekce rychlých změn selection v kontextu s recentInputActivity
            if (now - lastActivityTime > 80 && recentInputActivity) {
                const currentText = editor.document.getText();
                
                // Pokud je text prázdný nebo velmi krátký po předchozí aktivitě
                if ((currentText.length === 0 || currentText.trim() === '') && lastChatContent.length > 3) {
                    debugChannel.appendLine(`⚡ ULTIMATE: Chat cleared via selection change - message submitted!`);
                    debugChannel.appendLine(`   Previous: "${lastChatContent.substring(0, 40)}...", now empty or minimal`);
                    debugChannel.appendLine(`   URI: ${editor.document.uri.scheme}://${editor.document.uri.path.substring(editor.document.uri.path.length - 25)}`);
                    handleAIActivity();
                    lastActivityTime = now;
                    lastChatContent = '';
                    recentInputActivity = false;
                }
            }
        }
    });

    // Method 5: Intelligent active editor monitoring
    // Sledujeme přepínání editorů s pokročilým kontextem pro lepší detekci
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && (
            editor.document.uri.scheme === 'chat-editing-snapshot-text-model' ||
            editor.document.uri.scheme === 'vscode-chat-input' ||
            editor.document.uri.scheme === 'interactive-input' ||
            editor.document.uri.scheme === 'copilot-chat-input' ||
            editor.document.uri.toString().includes('copilot') ||
            editor.document.uri.toString().includes('chat') ||
            editor.document.languageId === 'copilot-chat'
        )) {
            debugChannel.appendLine(`📝 ULTIMATE: Switched to Copilot Chat editor`);
            debugChannel.appendLine(`   Scheme: ${editor.document.uri.scheme}, Language: ${editor.document.languageId}`);
            debugChannel.appendLine(`   Path: ${editor.document.uri.path.substring(editor.document.uri.path.length - 40)}`);
            
            const newContent = editor.document.getText();
            lastChatContent = newContent;
            
            // Rychlá detekce přepnutí na prázdný editor po aktivitě
            if (recentInputActivity && newContent.length === 0) {
                setTimeout(() => {
                    const currentContent = editor.document.getText();
                    if (currentContent.length === 0 && recentInputActivity) {
                        debugChannel.appendLine(`⚡ ULTIMATE: Editor switched to empty after activity - message submitted!`);
                        handleAIActivity();
                        recentInputActivity = false;
                    }
                }, 100);
            }
        }
    });

    // Method 6: Ultra-smart focus change monitoring with keyboard detection
    // Sledujeme ztrátu fokusu + kombinace s keyboard eventy pro přesnou detekci
    const focusListener = vscode.window.onDidChangeWindowState((state) => {
        const now = Date.now();
        
        if (!state.focused && recentInputActivity) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && (
                activeEditor.document.uri.scheme === 'chat-editing-snapshot-text-model' ||
                activeEditor.document.uri.scheme === 'interactive-input' ||
                activeEditor.document.uri.toString().includes('copilot')
            )) {
                // Možná submit když ztratíme fokus po nedávné aktivitě
                setTimeout(() => {
                    const currentText = activeEditor.document.getText();
                    if (currentText.length < lastChatContent.length * 0.4 || currentText.length === 0) {
                        debugChannel.appendLine(`⚡ ULTIMATE: Focus change detected message submit`);
                        debugChannel.appendLine(`   Content change: ${lastChatContent.length} → ${currentText.length} chars`);
                        handleAIActivity();
                        recentInputActivity = false;
                    }
                }, 100);
            }
        }
    });

    // Method 7: Direct keyboard command interception (Enter key)
    // Přímá detekce Enter klávesy v Copilot Chat kontextu
    const keyboardListener = vscode.commands.registerCommand('type', (args) => {
        const activeEditor = vscode.window.activeTextEditor;
        const now = Date.now();
        
        if (activeEditor && args && typeof args.text === 'string') {
            const isCopilotChat = (
                activeEditor.document.uri.scheme === 'chat-editing-snapshot-text-model' ||
                activeEditor.document.uri.scheme === 'vscode-chat-input' ||
                activeEditor.document.uri.scheme === 'interactive-input' ||
                activeEditor.document.uri.toString().includes('copilot') ||
                activeEditor.document.uri.toString().includes('chat')
            );
            
            if (isCopilotChat) {
                // Detekce Enter klávesy
                if (args.text.includes('\n') || args.text === '\r' || args.text === '\r\n') {
                    // Pouze pokud máme nějaký obsah předtím
                    if (lastChatContent.length > 2 && now - lastActivityTime > 50) {
                        debugChannel.appendLine(`⚡ ULTIMATE: ENTER KEY PRESSED in Copilot Chat!`);
                        debugChannel.appendLine(`   Content before Enter: "${lastChatContent.substring(0, 30)}..."`);
                        debugChannel.appendLine(`   URI: ${activeEditor.document.uri.scheme}`);
                        
                        // Krátké zpoždění pro zachycení submit
                        setTimeout(() => {
                            const afterEnterText = activeEditor.document.getText();
                            if (afterEnterText.length < lastChatContent.length * 0.5 || afterEnterText === '') {
                                debugChannel.appendLine(`✅ CONFIRMED: Message was submitted via Enter!`);
                                handleAIActivity();
                            }
                        }, 50);
                        
                        lastActivityTime = now;
                    }
                }
            }
        }
        
        // KRITICKÉ: Předáváme příkaz dál pro normální fungování
        return vscode.commands.executeCommand('default:type', args);
    });

    debugChannel.appendLine('✅ ULTIMATE Copilot Chat detection active (7 advanced methods based on real source code analysis)');
    
    const allListeners = [
        textChangeListener, 
        commandListener, 
        selectionChangeListener, 
        editorChangeListener,
        focusListener,
        keyboardListener,
        ...commandListeners
    ];
    
    return allListeners;
}
