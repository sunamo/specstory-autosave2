import * as vscode from 'vscode';

/**
 * Message generation based on SpecStory conversation analysis
 */

export function generateMessageWithRecentPrompts(
    conversations: {content: string, topic: string, timestamp: string}[], 
    debugChannel: vscode.OutputChannel
): string {
    const i18n = require('../i18n');
    
    if (conversations.length === 0) {
        return 'AI prompt detected! Please check:\n• Did AI understand your question correctly?\n• If working with HTML, inspect for invisible elements\n• Verify the response quality and accuracy';
    }
    
    // Extract recent user prompts from conversations
    const allPrompts: {text: string, timestamp: string}[] = [];
    
    // Sort conversations by timestamp to ensure chronological order
    const sortedConversations = conversations.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (const conversation of sortedConversations) {
        const content = conversation.content;
        
        // Debug: log file being processed
        debugChannel.appendLine(`[DEBUG] Processing file: ${conversation.topic} (${conversation.timestamp})`);
        
        // Split by _**User**_ to find user messages
        const userMessages = content.split('_**User**_');
        debugChannel.appendLine(`[DEBUG] Found ${userMessages.length - 1} user messages in file`);
        
        for (let i = 1; i < userMessages.length; i++) { // Skip first split (before first user message)
            const userPart = userMessages[i];
            // Extract text until next _**Assistant**_ or end
            const endMatch = userPart.indexOf('_**Assistant**_');
            const userText = endMatch !== -1 ? userPart.substring(0, endMatch) : userPart;
            
            // Clean up the text (remove ---, newlines, extra spaces)
            const cleanText = userText
                .replace(/---/g, '')
                .replace(/\n+/g, ' ')
                .trim();
            
            if (cleanText && cleanText.length > 10) { // Only meaningful prompts
                allPrompts.push({
                    text: cleanText,
                    timestamp: conversation.timestamp
                });
                // Debug: log each prompt as it's added
                debugChannel.appendLine(`[DEBUG] Added prompt ${allPrompts.length}: ${cleanText.substring(0, 50)}...`);
            }
        }
    }
    
    debugChannel.appendLine(`[DEBUG] Total prompts collected: ${allPrompts.length}`);
    
    // Sort all prompts by timestamp and take the last 3
    allPrompts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const lastPrompts = allPrompts.slice(-3).map(p => p.text);
    debugChannel.appendLine(`[DEBUG] Selected last 3 prompts for display (from ${allPrompts.length} total)`);
    
    // Debug: log the selected prompts
    lastPrompts.forEach((prompt, index) => {
        debugChannel.appendLine(`[DEBUG] Selected prompt ${index + 1}: ${prompt.substring(0, 50)}...`);
    });
    
    if (lastPrompts.length === 0) {
        return 'AI prompt detected! Please check:\n• Did AI understand your question correctly?\n• If working with HTML, inspect for invisible elements\n• Verify the response quality and accuracy';
    }
    
    // Format prompts for display - single line with separators for VS Code notifications
    const promptsList = lastPrompts.map((prompt, index) => {
        const shortPrompt = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
        return shortPrompt;
    }).join(' | ');
    
    // Generate context-aware message with recent prompts
    const contextAnalysis = analyzePromptsContext(lastPrompts);
    
    try {
        switch (contextAnalysis.type) {
            case 'debug':
                return i18n.t('ai.smartDebug', promptsList);
            case 'ui':
                return i18n.t('ai.smartUI', promptsList);
            case 'database':
                return i18n.t('ai.smartDatabase', promptsList);
            case 'api':
                return i18n.t('ai.smartAPI', promptsList);
            case 'performance':
                return i18n.t('ai.smartPerformance', promptsList);
            case 'security':
                return i18n.t('ai.smartSecurity', promptsList);
            default:
                return i18n.t('ai.smartDefault', conversations[0]?.topic || 'code', promptsList);
        }
    } catch (error) {
        // Fallback if i18n fails - minimal message
        return `AI responded! Prompts: ${promptsList}`;
    }
}

export function analyzePromptsContext(prompts: string[]): {type: string, focus: string, checks: string} {
    const allText = prompts.join(' ').toLowerCase();
    
    if (allText.includes('debug') || allText.includes('error') || allText.includes('bug') || allText.includes('fix')) {
        return {
            type: 'debug',
            focus: 'debugging',
            checks: 'Fixed root cause? No new bugs? Test edge cases?'
        };
    }
    
    if (allText.includes('html') || allText.includes('css') || allText.includes('style') || allText.includes('design')) {
        return {
            type: 'ui',
            focus: 'UI/design',
            checks: 'Responsive design? Accessibility? Cross-browser compatibility?'
        };
    }
    
    if (allText.includes('database') || allText.includes('sql') || allText.includes('query')) {
        return {
            type: 'database',
            focus: 'database',
            checks: 'Data integrity? Performance impact? Backup strategy?'
        };
    }
    
    if (allText.includes('api') || allText.includes('endpoint') || allText.includes('request')) {
        return {
            type: 'api',
            focus: 'API',
            checks: 'Error handling? Security? API documentation?'
        };
    }
    
    if (allText.includes('performance') || allText.includes('optimize') || allText.includes('slow')) {
        return {
            type: 'performance',
            focus: 'performance',
            checks: 'Actual speedup achieved? Memory leaks? Functionality regression?'
        };
    }
    
    if (allText.includes('security') || allText.includes('auth') || allText.includes('login') || allText.includes('password')) {
        return {
            type: 'security',
            focus: 'security',
            checks: 'Proper encryption? Input validation? Security best practices?'
        };
    }
    
    return {
        type: 'default',
        focus: 'code',
        checks: 'Meets requirements? No breaking changes? Documentation updated?'
    };
}

export function generateContextAwareMessage(conversation: {content: string, topic: string, timestamp: string}): string {
    const content = conversation.content.toLowerCase();
    const topic = conversation.topic.toLowerCase();
    
    // Analyze content for different contexts
    if (content.includes('debug') || content.includes('error') || content.includes('bug') || content.includes('fix')) {
        return 'AI právě debugoval! Zkontroluj:\n• Opravil skutečnou příčinu problému?\n• Nezavedl nové bugy?\n• Testuj edge cases a boundary conditions';
    }
    
    if (content.includes('html') || content.includes('css') || content.includes('style') || content.includes('design') || content.includes('responsive')) {
        return 'AI pracoval s UI! Zkontroluj:\n• Responzivní design na různých zařízeních\n• Accessibility (ARIA, contrast, keyboard navigation)\n• Cross-browser kompatibilita';
    }
    
    if (content.includes('database') || content.includes('sql') || content.includes('query') || content.includes('table')) {
        return 'AI upravoval databázi! Zkontroluj:\n• Data integrity a constraints\n• Performance impact na velká data\n• Backup strategie před změnami';
    }
    
    if (content.includes('api') || content.includes('endpoint') || content.includes('request') || content.includes('response')) {
        return 'AI vytvořil API! Zkontroluj:\n• Error handling pro všechny edge cases\n• Security (authentication, authorization)\n• API dokumentace a testování';
    }
    
    if (content.includes('performance') || content.includes('optimize') || content.includes('slow') || content.includes('speed')) {
        return 'AI optimalizoval performance! Zkontroluj:\n• Skutečné zrychlení (měření před/po)\n• Memory leaks a resource usage\n• Nedošlo k regresi funkcjonality';
    }
    
    if (content.includes('security') || content.includes('auth') || content.includes('login') || content.includes('password')) {
        return 'AI pracoval se security! Zkontroluj:\n• Proper encryption a hashing\n• Input validation a sanitization\n• Security best practices dodrženy';
    }
    
    if (content.includes('test') || content.includes('unit') || content.includes('integration')) {
        return 'AI vytvořil testy! Zkontroluj:\n• Test coverage skutečně důležitých částí\n• Edge cases a error scenarios\n• Testy jsou maintainable a čitelné';
    }
    
    // Default smart message based on topic
    return `AI pracoval na "${conversation.topic}"! Zkontroluj:\n• Kód splňuje původní požadavky?\n• Nezavedl side effects nebo breaking changes?\n• Dokumentace a komentáře jsou aktuální`;
}
