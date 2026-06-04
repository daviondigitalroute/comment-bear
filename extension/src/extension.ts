import * as vscode from 'vscode';
import * as path from 'path';
import { removeComments } from '../../src/index';
import type { Lang, RemoveOptions } from '../../src/types';
import { resolveLanguage } from './language-map';

// In-memory provider backing the read-only "cleaned" side of the diff preview.
const PREVIEW_SCHEME = 'comment-bear-preview';
const previewContents = new Map<string, string>();

interface CbConfig {
  preserveLicense: boolean;
  keepEmptyLines: boolean;
  showDiffPreview: boolean;
  confirmFolderOperations: boolean;
  exclude: string[];
  showStatusBar: boolean;
  languageOverride: string;
}

function getConfig(): CbConfig {
  const c = vscode.workspace.getConfiguration('commentBear');
  return {
    preserveLicense: c.get('preserveLicense', false),
    keepEmptyLines: c.get('keepEmptyLines', false),
    showDiffPreview: c.get('showDiffPreview', true),
    confirmFolderOperations: c.get('confirmFolderOperations', true),
    exclude: c.get('exclude', ['**/node_modules/**', '**/dist/**', '**/.git/**']),
    showStatusBar: c.get('showStatusBar', true),
    languageOverride: c.get('languageOverride', 'auto'),
  };
}

function removeOptions(cfg: CbConfig, language: Lang | undefined, fileName?: string): RemoveOptions {
  return {
    language,
    filename: language ? undefined : fileName, // let the lib detect by name if we have no language
    preserveLicense: cfg.preserveLicense,
    keepEmptyLines: cfg.keepEmptyLines,
  };
}

/** Human-readable summary of what changed. */
function diffStats(original: string, cleaned: string, commentsRemoved: number): string {
  const charDelta = original.length - cleaned.length;
  const lineDelta = original.split('\n').length - cleaned.split('\n').length;
  const parts: string[] = [];
  parts.push(`${commentsRemoved} comment${commentsRemoved === 1 ? '' : 's'} removed`);
  if (charDelta !== 0) parts.push(`${charDelta} char${Math.abs(charDelta) === 1 ? '' : 's'}`);
  if (lineDelta !== 0) parts.push(`${lineDelta} line${Math.abs(lineDelta) === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/** Count comments without modifying (dry run). */
function countComments(code: string, opts: RemoveOptions): number {
  return removeComments(code, { ...opts, dryRun: true }).removedCount;
}

// ---------------------------------------------------------------------------
// Editor commands
// ---------------------------------------------------------------------------

async function runRemoveInEditor(preferPreview: boolean) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Comment Bear: open a file first.');
    return;
  }
  const cfg = getConfig();
  const doc = editor.document;
  const language = resolveLanguage(doc.languageId, doc.fileName, cfg.languageOverride);

  // Operate on the selection if there is a non-empty one, else the whole file.
  const hasSelection = !editor.selection.isEmpty;
  const range = hasSelection
    ? new vscode.Range(editor.selection.start, editor.selection.end)
    : new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  const original = doc.getText(range);

  const result = removeComments(original, removeOptions(cfg, language, doc.fileName));
  const cleaned = result.code;

  if (cleaned === original) {
    vscode.window.showInformationMessage(
      `Comment Bear: no comments found${language ? '' : ' (language not detected — try setting it in settings)'}.`
    );
    return;
  }

  const summary = diffStats(original, cleaned, result.removedCount);

  // Decide whether to preview first.
  const showPreview = preferPreview || cfg.showDiffPreview;
  if (showPreview) {
    const apply = await showDiffAndConfirm(doc, original, cleaned, summary, hasSelection ? 'selection' : 'file');
    if (!apply) return;
  }

  await editor.edit((edit) => edit.replace(range, cleaned));
  vscode.window.showInformationMessage(`Comment Bear: ${summary}.`);
}

/** Opens a diff (original ↔ cleaned) and asks the user to apply or cancel. */
async function showDiffAndConfirm(
  doc: vscode.TextDocument,
  original: string,
  cleaned: string,
  summary: string,
  scope: string
): Promise<boolean> {
  const baseName = path.basename(doc.fileName || 'untitled');
  const leftUri = vscode.Uri.parse(`${PREVIEW_SCHEME}:Original (${scope}) — ${baseName}`);
  const rightUri = vscode.Uri.parse(`${PREVIEW_SCHEME}:Cleaned (${scope}) — ${baseName}`);
  previewContents.set(leftUri.toString(), original);
  previewContents.set(rightUri.toString(), cleaned);

  await vscode.commands.executeCommand(
    'vscode.diff',
    leftUri,
    rightUri,
    `Comment Bear: ${baseName} (${summary})`,
    { preview: true }
  );

  const choice = await vscode.window.showInformationMessage(
    `Comment Bear: ${summary}. Apply changes?`,
    { modal: false },
    'Apply',
    'Cancel'
  );

  previewContents.delete(leftUri.toString());
  previewContents.delete(rightUri.toString());
  return choice === 'Apply';
}

async function runCopyWithoutComments() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Comment Bear: open a file first.');
    return;
  }
  const cfg = getConfig();
  const doc = editor.document;
  const language = resolveLanguage(doc.languageId, doc.fileName, cfg.languageOverride);
  const hasSelection = !editor.selection.isEmpty;
  const original = hasSelection ? doc.getText(editor.selection) : doc.getText();
  const result = removeComments(original, removeOptions(cfg, language, doc.fileName));
  await vscode.env.clipboard.writeText(result.code);
  vscode.window.showInformationMessage(
    `Comment Bear: copied to clipboard (${diffStats(original, result.code, result.removedCount)}).`
  );
}

async function runCountComments() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Comment Bear: open a file first.');
    return;
  }
  const cfg = getConfig();
  const doc = editor.document;
  const language = resolveLanguage(doc.languageId, doc.fileName, cfg.languageOverride);
  const count = countComments(doc.getText(), removeOptions(cfg, language, doc.fileName));
  vscode.window.showInformationMessage(
    `Comment Bear: ${count} comment${count === 1 ? '' : 's'} in this file` +
      `${language ? ` (${language})` : ' (language not detected)'}.`
  );
}

// ---------------------------------------------------------------------------
// Explorer (file / folder) command
// ---------------------------------------------------------------------------

async function runRemoveInExplorer(uri: vscode.Uri, selected: vscode.Uri[] | undefined) {
  const cfg = getConfig();
  const targets = selected && selected.length > 0 ? selected : uri ? [uri] : [];
  if (targets.length === 0) {
    vscode.window.showWarningMessage('Comment Bear: nothing selected.');
    return;
  }

  // Expand folders to files, honoring the exclude globs.
  const files: vscode.Uri[] = [];
  for (const target of targets) {
    const stat = await vscode.workspace.fs.stat(target);
    if (stat.type === vscode.FileType.Directory) {
      const pattern = new vscode.RelativePattern(target, '**/*');
      const found = await vscode.workspace.findFiles(pattern, `{${cfg.exclude.join(',')}}`);
      files.push(...found);
    } else {
      files.push(target);
    }
  }

  if (files.length === 0) {
    vscode.window.showInformationMessage('Comment Bear: no matching files.');
    return;
  }

  if (files.length > 1 && cfg.confirmFolderOperations) {
    const choice = await vscode.window.showWarningMessage(
      `Comment Bear: remove comments from ${files.length} files? This modifies them on disk.`,
      { modal: true },
      'Remove'
    );
    if (choice !== 'Remove') return;
  }

  let changedFiles = 0;
  let totalComments = 0;
  let skipped = 0;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Comment Bear: removing comments',
      cancellable: true,
    },
    async (progress, token) => {
      for (let i = 0; i < files.length; i++) {
        if (token.isCancellationRequested) break;
        const file = files[i];
        progress.report({
          message: `${i + 1}/${files.length} — ${path.basename(file.fsPath)}`,
          increment: 100 / files.length,
        });
        try {
          const bytes = await vscode.workspace.fs.readFile(file);
          const original = Buffer.from(bytes).toString('utf8');
          const language = resolveLanguage('', file.fsPath, cfg.languageOverride);
          const result = removeComments(original, removeOptions(cfg, language, path.basename(file.fsPath)));
          if (result.code !== original) {
            await vscode.workspace.fs.writeFile(file, Buffer.from(result.code, 'utf8'));
            changedFiles++;
            totalComments += result.removedCount;
          }
        } catch {
          skipped++;
        }
      }
    }
  );

  vscode.window.showInformationMessage(
    `Comment Bear: ${totalComments} comments removed in ${changedFiles} file(s)` +
      `${skipped ? `, ${skipped} skipped` : ''}.`
  );
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

let statusBarItem: vscode.StatusBarItem | undefined;

function updateStatusBar() {
  const cfg = getConfig();
  if (!cfg.showStatusBar) {
    statusBarItem?.hide();
    return;
  }
  const editor = vscode.window.activeTextEditor;
  if (!editor || !statusBarItem) {
    statusBarItem?.hide();
    return;
  }
  const doc = editor.document;
  const language = resolveLanguage(doc.languageId, doc.fileName, cfg.languageOverride);
  if (!language) {
    statusBarItem.hide();
    return;
  }
  try {
    const count = countComments(doc.getText(), removeOptions(cfg, language, doc.fileName));
    statusBarItem.text = `$(comment) ${count}`;
    statusBarItem.tooltip = `Comment Bear: ${count} comment(s) in this ${language} file — click to remove`;
    statusBarItem.command = 'commentBear.removeInEditor';
    statusBarItem.show();
  } catch {
    statusBarItem.hide();
  }
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
  // Read-only document provider for the diff preview.
  const provider: vscode.TextDocumentContentProvider = {
    provideTextDocumentContent(uri) {
      return previewContents.get(uri.toString()) ?? '';
    },
  };
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(PREVIEW_SCHEME, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('commentBear.removeInEditor', () => runRemoveInEditor(false)),
    vscode.commands.registerCommand('commentBear.previewInEditor', () => runRemoveInEditor(true)),
    vscode.commands.registerCommand('commentBear.copyWithoutComments', () => runCopyWithoutComments()),
    vscode.commands.registerCommand('commentBear.countComments', () => runCountComments()),
    vscode.commands.registerCommand('commentBear.removeInExplorer', (uri, selected) =>
      runRemoveInExplorer(uri, selected)
    )
  );

  // Status bar.
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) updateStatusBar();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('commentBear')) updateStatusBar();
    })
  );
  updateStatusBar();
}

export function deactivate() {
  previewContents.clear();
}
