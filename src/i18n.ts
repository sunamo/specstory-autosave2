import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface LocalizationData {
  [key: string]: any;
}

export class I18n {
  private static instance: I18n;
  private translations: LocalizationData = {};
  private currentLanguage: string = 'en';

  private constructor(context: vscode.ExtensionContext) {
    this.loadTranslations(context);
  }

  public static init(context: vscode.ExtensionContext): I18n {
    if (!I18n.instance) {
      I18n.instance = new I18n(context);
    }
    return I18n.instance;
  }

  public static getInstance(): I18n {
    if (!I18n.instance) {
      throw new Error('I18n not initialized. Call I18n.init() first.');
    }
    return I18n.instance;
  }

  private loadTranslations(context: vscode.ExtensionContext): void {
    // Detect language from VS Code
    const vsCodeLanguage = vscode.env.language;
    this.currentLanguage = vsCodeLanguage.startsWith('cs') ? 'cs' : 'en';

    try {
      const translationPath = path.join(context.extensionPath, 'i18n', `${this.currentLanguage}.json`);
      if (fs.existsSync(translationPath)) {
        const rawData = fs.readFileSync(translationPath, 'utf8');
        this.translations = JSON.parse(rawData);
      } else {
        // Fallback to English
        const fallbackPath = path.join(context.extensionPath, 'i18n', 'en.json');
        if (fs.existsSync(fallbackPath)) {
          const rawData = fs.readFileSync(fallbackPath, 'utf8');
          this.translations = JSON.parse(rawData);
          this.currentLanguage = 'en';
        }
      }
    } catch (error) {
      console.error('SpecStoryAutoSave: Failed to load translations:', error);
      // Use fallback empty object
      this.translations = {};
    }
  }

  public t(key: string, ...args: any[]): string {
    const keys = key.split('.');
    let translation: any = this.translations;

    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Return the key itself if translation not found
        return key;
      }
    }

    if (typeof translation === 'string') {
      // Replace placeholders {0}, {1}, etc. with arguments
      return translation.replace(/\{(\d+)\}/g, (match, index) => {
        const argIndex = parseInt(index, 10);
        return argIndex < args.length ? String(args[argIndex]) : match;
      });
    }

    return key;
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }
}
