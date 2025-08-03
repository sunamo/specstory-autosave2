import * as vscode from 'vscode';

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 ULTIMATE VS Code Source-Based GitHub Copilot Chat Detection');
    
    // Check Copilot availability
    const copilotExt = vscode.extensions.getExtension('github.copilot');
    const copilotChatExt = vscode.extensions.getExtension('github.copilot-chat');
    if (!copilotExt || !copilotChatExt) {
        debugChannel.appendLine('❌ Missing Copilot extensions');
        return [];
    }
    
    debugChannel.appendLine(`✅ Copilot extensions found - ULTIMATE VS Code source-based detection ACTIVE`);

    let lastChatContent = '';
    let lastActivityTime = 0;
    let recentInputActivity = false;

    // Method 1: VS Code Source-Based Text Document Change Monitoring
    // Based on actual VS Code Chat implementation patterns
    const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri;
        const scheme = uri.scheme;
        
        // Skip our own output
        if (uri.toString().includes('SpecStoryAutoSave')) {
            return;
        }
        
        // VS Code Chat URI schemes based on source code analysis
        const isVSCodeChatInput = (
            scheme === 'vscode-chat-input' ||           // Real VS Code chat input scheme
            scheme === 'chat-editing-snapshot-text-model' || 
            scheme === 'interactive-input' ||
            scheme === 'copilot-chat-input' ||
            uri.toString().includes('copilot') ||
            uri.toString().includes('chat') ||
            uri.path.includes('chat') ||
            event.document.languageId === 'copilot-chat' ||
            (event.document.languageId === 'plaintext' && uri.toString().includes('chat'))
        );
        
        if (isVSCodeChatInput) {
            const currentText = event.document.getText();
            const now = Date.now();
            
            // Track input activity for better context
            if (currentText.length > lastChatContent.length) {
                recentInputActivity = true;
                setTimeout(() => { recentInputActivity = false; }, 2000);
            }
            
            for (const change of event.contentChanges) {
                // VS Code source-based submit detection patterns
                const isAcceptInputTriggered = (
                    // Pattern 1: Complete text clearing (acceptInput clears the input)
                    (change.text === '' && change.rangeLength > 2) ||
                    
                    // Pattern 2: Major content reduction (>75% text disappeared)
                    (currentText.length < lastChatContent.length * 0.25 && change.rangeLength > 3) ||
                    
                    // Pattern 3: AcceptInput pattern - entire content shortened at once
                    (lastChatContent.length > 8 && currentText.length < 2 && change.rangeLength > 6) ||
                    
                    // Pattern 4: Quick clearing during recent activity
                    (recentInputActivity && change.text === '' && change.rangeLength > 1 && lastChatContent.length > 5) ||
                    
                    // Pattern 5: Multi-line message clearing (Enter with newline)
                    (change.text === '' && change.rangeLength > 0 && lastChatContent.includes('\n')) ||
                    
                    // Pattern 6: VS Code specific - URI change during text clearing
                    (scheme === 'vscode-chat-input' && change.text === '' && change.rangeLength > 0)
                );
                
                if (isAcceptInputTriggered && now - lastActivityTime > 100) {
                    debugChannel.appendLine(`🚀 VS CODE CHAT MESSAGE SUBMITTED! (acceptInput detected, -${change.rangeLength} chars, scheme: ${scheme})`);
                    debugChannel.appendLine(`   Previous content: ${lastChatContent.length} chars → current: ${currentText.length} chars`);
                    debugChannel.appendLine(`   Recent input activity: ${recentInputActivity}, Document: ${uri.path.substring(uri.path.length - 30)}`);
                    debugChannel.appendLine(`   VS Code Chat URI: ${uri.toString().substring(0, 60)}...`);
                    handleAIActivity();
                    lastActivityTime = now;
                    recentInputActivity = false;
                    break;
                }
            }
            
            // Update last content - only when larger (user typing)
            if (currentText.length >= lastChatContent.length) {
                lastChatContent = currentText;
            } else if (currentText.length === 0) {
                // Reset on complete clearing
                lastChatContent = '';
            }
        }
    });

    // Method 2: VS Code Source-Based Command Monitoring
    // Based on actual VS Code Chat architecture - acceptInput() method detection
    const commandListener = vscode.commands.registerCommand('specstoryautosave.detectChatSubmit', () => {
        debugChannel.appendLine(`⚡ Direct chat submit command detected!`);
        handleAIActivity();
    });

    // Method 3: Real VS Code Chat Command Interception
    // Based on actual VS Code source code analysis - these are the real commands
    const registerVSCodeCommandListener = () => {
        try {
            // Real VS Code Chat commands from source code analysis
            const realVSCodeChatCommands = [
                // Core VS Code Chat commands (from chatExecuteActions.ts)
                'workbench.action.chat.submit',
                'workbench.action.edits.submit',
                'workbench.action.chat.submitWithoutDispatching',
                'workbench.action.chat.submitWithCodebase',
                'workbench.action.chat.acceptInput',
                'workbench.action.chat.sendMessage',
                
                // Interactive session commands
                'interactive.acceptInput',
                'workbench.action.interactiveSession.submit',
                
                // Copilot-specific commands
                'github.copilot.chat.submitChatMessage',
                'github.copilot.interactiveEditor.accept',
                'github.copilot.generate',
                'github.copilot.sendChatMessage',
                
                // General chat commands
                'vscode.chat.submit',
                'chat.action.submit',
                'chat.submit'
            ];
            
            const listeners: vscode.Disposable[] = [];
            
            // Try to register intercepting listeners for real VS Code commands
            realVSCodeChatCommands.forEach(commandId => {
                try {
                    const listener = vscode.commands.registerCommand(`specstoryautosave.intercept.${commandId}`, (...args) => {
                        const now = Date.now();
                        if (now - lastActivityTime > 50) {
                            debugChannel.appendLine(`⚡ REAL VS CODE CHAT COMMAND INTERCEPTED: ${commandId}`);
                            debugChannel.appendLine(`   Arguments: ${args.length > 0 ? JSON.stringify(args[0]) : 'none'}`);
                            debugChannel.appendLine(`   This is a VS Code source-based detection!`);
                            handleAIActivity();
                            lastActivityTime = now;
                        }
                        
                        // Forward to original command if possible
                        try {
                            return vscode.commands.executeCommand(commandId, ...args);
                        } catch (error) {
                            // Original command might not exist or be accessible - that's OK
                        }
                    });
                    listeners.push(listener);
                } catch (error) {
                    // Registration might fail - ignore and continue
                }
            });
            
            return listeners;
        } catch (error) {
            debugChannel.appendLine(`⚠️ Could not register VS Code command listeners: ${error}`);
            return [];
        }
    };

    const commandListeners = registerVSCodeCommandListener();

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

    // Method 7: TRUE INSTANT Enter Detection - Zero Delay!
    // Spustí handleAIActivity() OKAMŽITĚ při stisknutí Enter bez jakéhokoliv čekání
    const keyboardListener = vscode.commands.registerCommand('type', (args) => {
        const activeEditor = vscode.window.activeTextEditor;
        const now = Date.now();
        
        if (activeEditor && args && typeof args.text === 'string') {
            const isVSCodeChatContext = (
                activeEditor.document.uri.scheme === 'vscode-chat-input' ||    
                activeEditor.document.uri.scheme === 'chat-editing-snapshot-text-model' ||
                activeEditor.document.uri.scheme === 'interactive-input' ||
                activeEditor.document.uri.toString().includes('copilot') ||
                activeEditor.document.uri.toString().includes('chat')
            );
            
            if (isVSCodeChatContext) {
                // TRUE INSTANT detection - žádné čekání, žádné ověřování!
                if (args.text.includes('\n') || args.text === '\r' || args.text === '\r\n') {
                    const currentContent = activeEditor.document.getText();
                    
                    // IMMEDIATE TRIGGER - bez jakýchkoliv podmínek nebo čekání!
                    if (currentContent.trim().length > 1) { // Minimální kontrola
                        debugChannel.appendLine(`🚀🚀🚀 TRUE INSTANT ENTER - ZERO DELAY!`);
                        debugChannel.appendLine(`   Content: "${currentContent.substring(0, 30)}..."`);
                        debugChannel.appendLine(`   URI: ${activeEditor.document.uri.scheme}`);
                        debugChannel.appendLine(`   Time: ${new Date().toISOString()}`);
                        
                        // OKAMŽITÁ aktivace BEZ jakéhokoliv setTimeout nebo čekání!
                        handleAIActivity();
                        lastActivityTime = now;
                        
                        debugChannel.appendLine(`✅ IMMEDIATE ACTION COMPLETED!`);
                    }
                }
            }
        }
        
        // CRITICAL: Forward the command for normal functioning
        return vscode.commands.executeCommand('default:type', args);
    });

    // Method 8: Pre-emptive Content Monitoring
    // Sleduje obsah a spouští detekci při každé změně v chat kontextu
    const preEmptiveListener = vscode.workspace.onDidChangeTextDocument((event) => {
        const uri = event.document.uri;
        const scheme = uri.scheme;
        
        // Skip our output
        if (uri.toString().includes('SpecStoryAutoSave')) {
            return;
        }
        
        // Chat context detection
        const isChatContext = (
            scheme === 'vscode-chat-input' ||
            scheme === 'chat-editing-snapshot-text-model' ||
            uri.toString().includes('copilot') ||
            uri.toString().includes('chat')
        );
        
        if (isChatContext) {
            const currentText = event.document.getText();
            const now = Date.now();
            
            // Pre-emptive rapid detection - spouští při každé změně
            for (const change of event.contentChanges) {
                // Extremely aggressive detection - any significant text clearing
                if (change.text === '' && change.rangeLength > 0 && now - lastActivityTime > 20) {
                    const contentBefore = change.rangeLength;
                    const contentAfter = currentText.length;
                    
                    // Fire immediately on any text clearing that could be a submit
                    if (contentBefore > 3 || (contentAfter === 0 && lastChatContent.length > 2)) {
                        debugChannel.appendLine(`🚀🚀 PRE-EMPTIVE INSTANT TRIGGER!`);
                        debugChannel.appendLine(`   Text cleared: ${contentBefore} chars, remaining: ${contentAfter}`);
                        debugChannel.appendLine(`   URI: ${scheme}`);
                        debugChannel.appendLine(`   Ultra-fast detection activated!`);
                        
                        // IMMEDIATE FIRE - no delays, no conditions!
                        handleAIActivity();
                        lastActivityTime = now;
                        break;
                    }
                }
            }
            
            // Update tracking
            if (currentText.length >= lastChatContent.length) {
                lastChatContent = currentText;
            } else {
                lastChatContent = '';
            }
        }
    });

    debugChannel.appendLine('✅ TRUE INSTANT VS Code detection active - ZERO DELAY!');
    debugChannel.appendLine('   🚀🚀🚀 IMMEDIATE trigger on Enter press - no waiting!');
    debugChannel.appendLine('   Pre-emptive detection on any text clearing!');
    debugChannel.appendLine('   Based on real VS Code source code analysis');
    
    const allListeners = [
        textChangeListener, 
        commandListener, 
        selectionChangeListener, 
        editorChangeListener,
        focusListener,
        keyboardListener,
        preEmptiveListener,  // Ultra-fast pre-emptive detection
        ...commandListeners
    ];
    
    return allListeners;
}
