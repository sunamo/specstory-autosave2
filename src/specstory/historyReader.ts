import * as vscode from 'vscode';

/**
 * SpecStory integration utilities - finding history, reading conversations
 */

export async function findSpecStoryHistoryPath(): Promise<string | null> {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const customPath = config.get<string>('specstoryHistoryPath', '');
    
    if (customPath) {
        console.log(`[DEBUG] Using custom SpecStory path: ${customPath}`);
        return customPath;
    }
    
    // Auto-detect SpecStory folder in workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return null;
    }
    
    for (const folder of workspaceFolders) {
        const specstoryPath = vscode.Uri.joinPath(folder.uri, '.specstory', 'history');
        try {
            const stat = await vscode.workspace.fs.stat(specstoryPath);
            if (stat.type === vscode.FileType.Directory) {
                console.log(`[DEBUG] Found SpecStory history at: ${specstoryPath.fsPath}`);
                return specstoryPath.fsPath;
            }
        } catch {
            // Directory doesn't exist, continue searching
        }
    }
    
    return null;
}

export async function readRecentSpecStoryConversations(
    historyPath: string, 
    count: number = 3,
    debugChannel: vscode.OutputChannel
): Promise<{content: string, topic: string, timestamp: string}[] | null> {
    try {
        const historyUri = vscode.Uri.file(historyPath);
        const files = await vscode.workspace.fs.readDirectory(historyUri);
        
        // Get ALL .md files (not just the requested count)
        const mdFiles = files
            .filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File)
            .map(([name]) => name);
        
        debugChannel.appendLine(`[DEBUG] Found ${mdFiles.length} SpecStory files to process`);
        
        if (mdFiles.length === 0) {
            return null;
        }
        
        const conversations = [];
        
        for (const fileName of mdFiles) {
            const fileUri = vscode.Uri.joinPath(historyUri, fileName);
            
            try {
                const fileStat = await vscode.workspace.fs.stat(fileUri);
                debugChannel.appendLine(`[DEBUG] File ${fileName} last modified: ${new Date(fileStat.mtime)}`);
            } catch (e) {
                debugChannel.appendLine(`[DEBUG] Could not get file stats for ${fileName}: ${e}`);
            }
            
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(fileContent).toString('utf8');
            
            // Debug: show file size and first few lines to verify content
            const lines = content.split('\n');
            debugChannel.appendLine(`[DEBUG] File ${fileName}: ${content.length} chars, ${lines.length} lines`);
            debugChannel.appendLine(`[DEBUG] First 3 lines: ${lines.slice(0, 3).join(' | ')}`);
            debugChannel.appendLine(`[DEBUG] Last 3 lines: ${lines.slice(-3).join(' | ')}`);
            
            // Extract topic from filename: 2025-08-03_07-59Z-user-greeting-and-request-for-assistance.md
            const topicMatch = fileName.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}Z-(.+)\.md$/);
            const topic = topicMatch ? topicMatch[1].replace(/-/g, ' ') : 'conversation';
            
            // Extract timestamp for sorting
            const timestampMatch = fileName.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}Z)/);
            const timestamp = timestampMatch ? timestampMatch[1] : '1970-01-01_00-00Z';
            
            conversations.push({
                content,
                topic,
                timestamp
            });
        }
        
        // Sort by timestamp descending (newest first) and take only the requested count
        return conversations
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, count);
        
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] Error reading SpecStory conversations: ${error}`);
        return null;
    }
}

export async function readLatestSpecStoryConversation(
    historyPath: string,
    debugChannel: vscode.OutputChannel
): Promise<{content: string, topic: string, timestamp: string} | null> {
    try {
        const historyUri = vscode.Uri.file(historyPath);
        const files = await vscode.workspace.fs.readDirectory(historyUri);
        
        // Get ALL .md files, not just recent ones
        const mdFiles = files
            .filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File)
            .map(([name]) => name);
        
        if (mdFiles.length === 0) {
            return null;
        }
        
        // Sort files by name (which contains timestamp) to get the latest
        mdFiles.sort((a, b) => b.localeCompare(a));
        const latestFile = mdFiles[0];
        
        debugChannel.appendLine(`[DEBUG] Reading latest SpecStory file: ${latestFile}`);
        
        const fileUri = vscode.Uri.joinPath(historyUri, latestFile);
        const fileContent = await vscode.workspace.fs.readFile(fileUri);
        const content = Buffer.from(fileContent).toString('utf8');
        
        debugChannel.appendLine(`[DEBUG] Content length: ${content.length} characters`);
        
        // Extract topic from filename
        const topicMatch = latestFile.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}Z-(.+)\.md$/);
        const topic = topicMatch ? topicMatch[1].replace(/-/g, ' ') : 'conversation';
        
        // Extract timestamp
        const timestampMatch = latestFile.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}Z)/);
        const timestamp = timestampMatch ? timestampMatch[1] : '1970-01-01_00-00Z';
        
        return {
            content,
            topic,
            timestamp
        };
        
    } catch (error) {
        debugChannel.appendLine(`[DEBUG] Error reading latest SpecStory conversation: ${error}`);
        return null;
    }
}
