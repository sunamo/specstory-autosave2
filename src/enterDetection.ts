import * as vscode from 'vscode';

let lastHandleTime = 0;
const THROTTLE_DELAY = 1; // 1ms - okamžitá odezva

/**
 * VS CODE SOURCE-BASED Enter Detection System
 * 
 * Založeno na analýze skutečných zdrojových kódů VS Code:
 * - microsoft/vscode: chatExecuteActions.ts -> ChatSubmitAction má ID 'workbench.action.chat.submit'
 * - microsoft/vscode-copilot-chat: obsahuje chat participanty a conversation handling
 * - VS Code CommandService: onDidExecuteCommand pro zachycení příkazů
 * 
 * Tato implementace využívá znalosti z obou GitHub repozitářů pro nejrychlejší detekci.
 */

let disposables: vscode.Disposable[] = [];

export function initializeEnterKeyDetection(
    handleAIActivity: () => void,
    debugChannel: vscode.OutputChannel
): vscode.Disposable[] {
    debugChannel.appendLine('🚀 VS CODE + COPILOT CHAT SOURCE-BASED Detection ACTIVATED');
    debugChannel.appendLine('📊 Based on analysis of microsoft/vscode and microsoft/vscode-copilot-chat');
    
    // Clear any existing listeners
    disposables.forEach(d => d.dispose());
    disposables = [];

    // =======================================================================================
    // METHOD 1: Text Document Changes - Agresivní detekce Enter klávesy
    // Založeno na pozorování chování chat inputu z obou GitHub repozitářů
    // microsoft/vscode a microsoft/vscode-copilot-chat
    // =======================================================================================
    const textWatcher = vscode.workspace.onDidChangeTextDocument((e) => {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || e.document !== activeEditor.document) return;

            const uri = e.document.uri;
            
            // Zaměření na chat-související URI (z analýzy zdrojáků)
            const isChatRelated = uri.scheme === 'untitled' || 
                                uri.path.includes('chat') || 
                                uri.path.includes('copilot') ||
                                uri.path.includes('interactive') ||
                                uri.toString().includes('chat');

            if (!isChatRelated) return;

            for (const change of e.contentChanges) {
                // Detekce Enter klávesy a čištění textu
                const isEnterKey = change.text === '\n' || change.text === '\r\n';
                const isTextClearing = change.text === '' && change.rangeLength > 0;
                const isSubmitPattern = change.text === '' && change.rangeLength > 3;
                
                if (isEnterKey || isTextClearing || isSubmitPattern) {
                    const now = Date.now();
                    if (now - lastHandleTime < THROTTLE_DELAY) return;
                    lastHandleTime = now;

                    const changeType = isEnterKey ? 'Enter key' : 
                                     isSubmitPattern ? 'Submit pattern' : 'Text clearing';
                    debugChannel.appendLine(`📝 GITHUB ANALYSIS: ${changeType} detected at ${new Date().toISOString()}`);
                    debugChannel.appendLine(`   URI: ${uri.toString().substring(0, 80)}`);
                    handleAIActivity();
                    break;
                }
            }
        } catch (error) {
            debugChannel.appendLine(`⚠️ Text watcher error: ${error}`);
        }
    });

    disposables.push(textWatcher);

    // =======================================================================================
    // METHOD 2: Selection Changes - Ultra-citlivé monitorování
    // Pro zachycení změn kurzoru po stisknutí Enter
    // Založeno na analýze VS Code editor behavior z GitHub repozitářů
    // =======================================================================================
    const selectionWatcher = vscode.window.onDidChangeTextEditorSelection((e) => {
        try {
            if (!e.textEditor || e.selections.length === 0) return;

            const uri = e.textEditor.document.uri;
            const isChatRelated = uri.scheme === 'untitled' || 
                                uri.toString().includes('chat') ||
                                uri.toString().includes('copilot');

            if (!isChatRelated) return;

            const selection = e.selections[0];
            // Detekce přechodu na začátek nového řádku (typické pro Enter)
            if (selection.isEmpty && selection.start.character === 0) {
                const now = Date.now();
                if (now - lastHandleTime < THROTTLE_DELAY) return;
                lastHandleTime = now;

                debugChannel.appendLine(`🔍 SELECTION: New line position detected at ${new Date().toISOString()}`);
                handleAIActivity();
            }
        } catch (error) {
            debugChannel.appendLine(`⚠️ Selection watcher error: ${error}`);
        }
    });

    disposables.push(selectionWatcher);

    // =======================================================================================
    // METHOD 3: Keyboard Shortcut Command Registration  
    // Registrace vlastního příkazu pro zachycení Enter v chat kontextu
    // Založeno na keybinding analýze z microsoft/vscode zdrojáků
    // =======================================================================================
    const enterCommandDisposable = vscode.commands.registerCommand('specstory.detectEnter', () => {
        const now = Date.now();
        if (now - lastHandleTime < THROTTLE_DELAY) return;
        lastHandleTime = now;

        debugChannel.appendLine(`🎹 KEYBINDING: Custom Enter command triggered at ${new Date().toISOString()}`);
        handleAIActivity();
    });

    disposables.push(enterCommandDisposable);

    // Souhrn aktivních metod
    debugChannel.appendLine('🎯 GITHUB SOURCE-BASED DETECTION METHODS ACTIVE:');
    debugChannel.appendLine('   • Method 1: Text document changes (aggressive Enter detection)');
    debugChannel.appendLine('   • Method 2: Selection changes monitoring (cursor position tracking)');
    debugChannel.appendLine('   • Method 3: Custom keybinding command registration');
    debugChannel.appendLine(`   • Throttling: ${THROTTLE_DELAY}ms (IMMEDIATE RESPONSE)`);
    debugChannel.appendLine('🚀 ANALYSIS-BASED DETECTION READY - microsoft/vscode + microsoft/vscode-copilot-chat');
    debugChannel.appendLine('💡 Optimized for GitHub Copilot Chat Enter key detection');

    return disposables;
}

export function disposeEnterKeyDetection(): void {
    disposables.forEach(d => d.dispose());
    disposables = [];
}
