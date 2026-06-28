import * as vscode from 'vscode';
import { convertMarkdownToStyledHtml, type ConvertOptions } from './converter';
import {
  copyHtmlToClipboard,
  getWindowsPowerShellHost,
  disposeWindowsClipboardHost,
  type WindowsClipboardMode,
} from './clipboard';

const POWERSHELL7_HINT_KEY = 'copyMarkdownFormatted.powerShell7Suggested';

function readWindowsClipboardMode(): WindowsClipboardMode {
  const cfg = vscode.workspace.getConfiguration('copyMarkdownFormatted');
  return cfg.get<WindowsClipboardMode>('windows.clipboardMode', 'persistentHost');
}

function readConvertOptions(): ConvertOptions {
  const cfg = vscode.workspace.getConfiguration('copyMarkdownFormatted');
  return {
    stripBlockquote: cfg.get<boolean>('stripBlockquote', true),
    fontBody: cfg.get<string>('font.body', "Aptos, 'Segoe UI', Calibri, Arial, sans-serif"),
    fontBodySize: cfg.get<number>('font.bodySize', 11),
    fontCode: cfg.get<string>('font.code', 'Cascadia Mono, Consolas, Courier New, monospace'),
    fontCodeSize: cfg.get<number>('font.codeSize', 10),
  };
}

function buildClipboardErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (process.platform === 'darwin') {
    if (lower.includes('swift') || lower.includes('xcode')) {
      return 'Clipboard write failed on macOS. Swift/Xcode Command Line Tools may be missing. Install with "xcode-select --install" and try again.';
    }
    return `Clipboard write failed on macOS. ${raw}`;
  }

  if (process.platform === 'linux') {
    if (lower.includes('wl-copy')) {
      return 'Clipboard write failed on Linux (Wayland). Install wl-clipboard (for example: sudo apt install wl-clipboard) and try again.';
    }
    if (lower.includes('xclip')) {
      return 'Clipboard write failed on Linux (X11). Install xclip (for example: sudo apt install xclip) and try again.';
    }
    return `Clipboard write failed on Linux. ${raw}`;
  }

  if (process.platform === 'win32') {
    return `Clipboard write failed on Windows. ${raw}`;
  }

  return `Clipboard write failed. ${raw}`;
}

async function copyFormatted(text: string, context: vscode.ExtensionContext): Promise<void> {
  if (!text.trim()) {
    vscode.window.showWarningMessage('No text to copy.');
    return;
  }

  try {
    const html = convertMarkdownToStyledHtml(text, readConvertOptions());
    await copyHtmlToClipboard(html, text, { windowsClipboardMode: readWindowsClipboardMode() });
    vscode.window.showInformationMessage('Formatted Markdown copied to clipboard.');
    void maybeSuggestPowerShell7(context);
  } catch (err: unknown) {
    const message = buildClipboardErrorMessage(err);
    vscode.window.showErrorMessage(message);
  }
}

/**
 * On Windows, if the copy fell back to Windows PowerShell because PowerShell 7
 * (`pwsh`) is not installed, show a one-time hint that installing it makes
 * copies noticeably faster. Shown at most once per machine/profile.
 */
async function maybeSuggestPowerShell7(context: vscode.ExtensionContext): Promise<void> {
  if (process.platform !== 'win32') {
    return;
  }
  // 'powershell.exe' as the resolved host means pwsh was not found (ENOENT).
  if (getWindowsPowerShellHost() !== 'powershell.exe') {
    return;
  }
  if (context.globalState.get<boolean>(POWERSHELL7_HINT_KEY)) {
    return;
  }
  // Mark as shown first, so the hint appears at most once even if dismissed.
  await context.globalState.update(POWERSHELL7_HINT_KEY, true);

  const installAction = 'How to install';
  const choice = await vscode.window.showInformationMessage(
    'Copy Markdown Formatted: PowerShell 7 (pwsh) was not found, so the slower Windows PowerShell is used. Installing PowerShell 7 makes clipboard copies about twice as fast.',
    installAction
  );
  if (choice === installAction) {
    await vscode.env.openExternal(vscode.Uri.parse(
      'https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows'
    ));
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('copyMarkdownFormatted.copySelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const selection = editor.selection;
      const text = editor.document.getText(selection);
      if (!text) {
        vscode.window.showWarningMessage('No text selected. Use "Copy File as Formatted HTML" to copy the entire file.');
        return;
      }
      await copyFormatted(text, context);
    }),

    vscode.commands.registerCommand('copyMarkdownFormatted.copyFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const text = editor.document.getText();
      await copyFormatted(text, context);
    }),

    vscode.commands.registerCommand('copyMarkdownFormatted.openSettings', async () => {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:ardimedia.copy-markdown-formatted'
      );
    }),

    // Free the background PowerShell host when the user switches to one-shot.
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('copyMarkdownFormatted.windows.clipboardMode') &&
        readWindowsClipboardMode() === 'oneShot'
      ) {
        disposeWindowsClipboardHost();
      }
    })
  );
}

export function deactivate(): void {
  disposeWindowsClipboardHost();
}
