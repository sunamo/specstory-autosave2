/**
 * Path configuration for SpecStory AutoSave extension
 * Centralized configuration to avoid hardcoded paths
 */

import * as os from 'os';
import * as path from 'path';

/**
 * Get common SpecStory history paths to try
 */
export function getCommonSpecStoryPaths(): string[] {
    return [
        // Relative to common project structures - will be resolved based on workspace
        '.specstory/history',
        '../.specstory/history',
        '../../.specstory/history',
        '../../../.specstory/history',
    ];
}

/**
 * Get fallback SpecStory paths for when auto-detection fails
 * These are more generic paths that might exist on the system
 */
export function getFallbackSpecStoryPaths(): string[] {
    const homeDir = os.homedir();
    const commonProjectRoots = ['Projects', 'Proj_Net', 'src', 'repos', 'workspace'];
    
    const fallbackPaths: string[] = [];
    
    // Add common project root combinations
    for (const root of commonProjectRoots) {
        fallbackPaths.push(path.join(homeDir, root, '.specstory', 'history'));
        // Also try common drive letters for Windows
        if (os.platform() === 'win32') {
            fallbackPaths.push(path.join('C:', root, '.specstory', 'history'));
            fallbackPaths.push(path.join('D:', root, '.specstory', 'history'));
            fallbackPaths.push(path.join('E:', root, '.specstory', 'history'));
        }
    }
    
    return fallbackPaths;
}

/**
 * Get temp directory for logs and exports
 */
export function getTempDirectory(): string {
    return os.tmpdir();
}

/**
 * Get export directory (defaults to temp, but can be configured)
 */
export function getExportDirectory(): string {
    // Default to system temp directory
    return getTempDirectory();
}

/**
 * Get debug log file path
 */
export function getDebugLogPath(): string {
    return path.join(getTempDirectory(), 'specstory-debug.log');
}

/**
 * Get alternative debug log path (fallback)
 */
export function getAlternativeDebugLogPath(): string {
    if (os.platform() === 'win32') {
        // Try to create temp directory if it doesn't exist
        const tempPath = path.join('C:', 'temp');
        return path.join(tempPath, 'specstory-debug.log');
    } else {
        return path.join('/tmp', 'specstory-debug.log');
    }
}

/**
 * Generate export file path with timestamp
 */
export function generateExportPath(prefix: string = 'specstory-export'): string {
    const timestamp = Date.now();
    const filename = `${prefix}-${timestamp}.md`;
    return path.join(getExportDirectory(), filename);
}
