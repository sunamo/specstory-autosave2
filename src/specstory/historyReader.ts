import * as vscode from 'vscode';
import { logDebug, logInfo } from '../utils/logger';

/**
 * SpecStory integration utilities - finding history, reading conversations
 */

export async function findSpecStoryHistoryPath(): Promise<string | null> {
    const config = vscode.workspace.getConfiguration('specstoryautosave');
    const customPath = config.get<string>('specstoryHistoryPath', '');
    
    if (customPath) {
        logDebug(`Using custom SpecStory path: ${customPath}`);
        return customPath;
    }
    
    // Auto-detect SpecStory folder in workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        logDebug('No workspace folders found for SpecStory detection');
        return null;
    }
    
    logDebug(`Searching for SpecStory in ${workspaceFolders.length} workspace folders...`);
    
    for (const folder of workspaceFolders) {
        const specstoryPath = vscode.Uri.joinPath(folder.uri, '.specstory', 'history');
        try {
            const stat = await vscode.workspace.fs.stat(specstoryPath);
            if (stat.type === vscode.FileType.Directory) {
                logInfo(`Found SpecStory history at: ${specstoryPath.fsPath}`);
                return specstoryPath.fsPath;
            }
        } catch {
            // Directory doesn't exist, continue searching
            logDebug(`No SpecStory folder found in: ${folder.uri.fsPath}`);
        }
    }
    
    logDebug('No SpecStory history folder found in any workspace');
    return null;
}

export async function readRecentSpecStoryConversations(
    historyPath: string, 
    count: number = 3
): Promise<{content: string, topic: string, timestamp: string}[] | null> {
    try {
        logDebug(`Reading recent SpecStory conversations from: ${historyPath}`);
        const historyUri = vscode.Uri.file(historyPath);
        const files = await vscode.workspace.fs.readDirectory(historyUri);
        
        // Get ALL .md files (not just the requested count)
        const mdFiles = files
            .filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File)
            .map(([name]) => name);
        
        logDebug(`Found ${mdFiles.length} SpecStory files to process`);
        
        if (mdFiles.length === 0) {
            logDebug('No .md files found in SpecStory history directory');
            return null;
        }
        
        const conversations = [];
        
        for (const fileName of mdFiles) {
            const fileUri = vscode.Uri.joinPath(historyUri, fileName);
            
            try {
                const fileStat = await vscode.workspace.fs.stat(fileUri);
                logDebug(`File ${fileName} last modified: ${new Date(fileStat.mtime)}`);
            } catch (e) {
                logDebug(`Could not get file stats for ${fileName}: ${e}`);
            }
            
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(fileContent).toString('utf8');
            
            // Debug: show file size and first few lines to verify content
            const lines = content.split('\n');
            logDebug(`File ${fileName}: ${content.length} chars, ${lines.length} lines`);
            logDebug(`First 3 lines: ${lines.slice(0, 3).join(' | ')}`);
            logDebug(`Last 3 lines: ${lines.slice(-3).join(' | ')}`);
            
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
        const sortedConversations = conversations
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .slice(0, count);
            
        logInfo(`Successfully loaded ${sortedConversations.length} SpecStory conversations for Activity Bar`);
        return sortedConversations;
        
    } catch (error) {
        logDebug(`Error reading SpecStory conversations: ${error}`);
        return null;
    }
}

export async function readLatestSpecStoryConversation(
    historyPath: string
): Promise<{content: string, topic: string, timestamp: string} | null> {
    try {
        logDebug(`Reading latest SpecStory conversation from: ${historyPath}`);
        const historyUri = vscode.Uri.file(historyPath);
        const files = await vscode.workspace.fs.readDirectory(historyUri);
        
        // Get ALL .md files, not just recent ones
        const mdFiles = files
            .filter(([name, type]) => name.endsWith('.md') && type === vscode.FileType.File)
            .map(([name]) => name);
        
        if (mdFiles.length === 0) {
            logDebug('No .md files found for latest conversation');
            return null;
        }
        
        // Sort files by name (which contains timestamp) to get the latest
        mdFiles.sort((a, b) => b.localeCompare(a));
        const latestFile = mdFiles[0];
        
        logDebug(`Reading latest SpecStory file: ${latestFile}`);
        
        const fileUri = vscode.Uri.joinPath(historyUri, latestFile);
        const fileContent = await vscode.workspace.fs.readFile(fileUri);
        const content = Buffer.from(fileContent).toString('utf8');
        
        logDebug(`Content length: ${content.length} characters`);
        
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
        logDebug(`Error reading latest SpecStory conversation: ${error}`);
        return null;
    }
}
