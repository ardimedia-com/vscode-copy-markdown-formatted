import { execFile, spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import { randomBytes } from 'crypto';

/** Wrap HTML fragment in a minimal document (for macOS/Linux — no CF_HTML header needed). */
export function wrapHtml(htmlFragment: string): string {
  return '<html><head><meta charset="utf-8"></head><body>' + htmlFragment + '</body></html>';
}

// ---------------------------------------------------------------------------
// Platform dispatcher
// ---------------------------------------------------------------------------

/**
 * How the Windows clipboard write runs:
 *  - `'persistentHost'` keeps a background PowerShell ready so copies after the
 *    first are near-instant (default).
 *  - `'oneShot'` spawns a fresh PowerShell per copy (slower, no background
 *    process).
 */
export type WindowsClipboardMode = 'persistentHost' | 'oneShot';

export interface CopyOptions {
  windowsClipboardMode?: WindowsClipboardMode;
}

export async function copyHtmlToClipboard(
  html: string,
  plainText: string,
  options: CopyOptions = {}
): Promise<void> {
  switch (process.platform) {
    case 'win32':  return copyWindows(html, plainText, options.windowsClipboardMode ?? 'persistentHost');
    case 'darwin': return copyMacOS(html, plainText);
    case 'linux':  return copyLinux(html, plainText);
    default:
      throw new Error(`Platform "${process.platform}" is not supported.`);
  }
}

// ---------------------------------------------------------------------------
// Windows — CF_HTML via PowerShell
// ---------------------------------------------------------------------------

/**
 * Build CF_HTML clipboard format string.
 * Windows clipboard expects a specific header with byte offsets.
 * See: https://learn.microsoft.com/en-us/windows/win32/dataxchg/html-clipboard-format
 *
 * Outlook's Word rendering engine needs @font-face declarations and MSO namespaces
 * to recognise non-default fonts like Consolas.  We include a minimal <head> block
 * that mirrors what Outlook itself generates when saving HTML.
 */
export function buildCfHtml(htmlFragment: string): string {
  const header =
    'Version:0.9\r\n' +
    'StartHTML:SSSSSSSSSS\r\n' +
    'EndHTML:EEEEEEEEEE\r\n' +
    'StartFragment:FFFFFFFFFF\r\n' +
    'EndFragment:GGGGGGGGGG\r\n';

  const prefix =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office"\r\n' +
    'xmlns:w="urn:schemas-microsoft-com:office:word"\r\n' +
    'xmlns="http://www.w3.org/TR/REC-html40">\r\n' +
    '<head>\r\n' +
    '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\r\n' +
    '<!--[if gte mso 9]>\r\n' +
    '<style>\r\n' +
    '@font-face\r\n' +
    '\t{font-family:Consolas;\r\n' +
    '\tpanose-1:2 11 6 9 2 2 4 3 2 4;\r\n' +
    '\tmso-font-charset:0;\r\n' +
    '\tmso-generic-font-family:modern;\r\n' +
    '\tmso-font-pitch:fixed;}\r\n' +
    '</style>\r\n' +
    '<![endif]-->\r\n' +
    '</head>\r\n' +
    '<body style="margin:0;padding:0;border:none">\r\n<!--StartFragment-->';
  const suffix = '<!--EndFragment-->\r\n</body></html>';

  const headerBytes = Buffer.byteLength(header, 'utf-8');
  const prefixBytes = Buffer.byteLength(prefix, 'utf-8');
  const fragmentBytes = Buffer.byteLength(htmlFragment, 'utf-8');
  const suffixBytes = Buffer.byteLength(suffix, 'utf-8');

  const startHtml = headerBytes;
  const startFragment = headerBytes + prefixBytes;
  const endFragment = startFragment + fragmentBytes;
  const endHtml = endFragment + suffixBytes;

  const filledHeader = header
    .replace('SSSSSSSSSS', startHtml.toString().padStart(10, '0'))
    .replace('EEEEEEEEEE', endHtml.toString().padStart(10, '0'))
    .replace('FFFFFFFFFF', startFragment.toString().padStart(10, '0'))
    .replace('GGGGGGGGGG', endFragment.toString().padStart(10, '0'));

  return filledHeader + prefix + htmlFragment + suffix;
}

/**
 * Resolved PowerShell host, cached for the session.
 *
 * PowerShell 7 (`pwsh`) is preferred over Windows PowerShell 5.1
 * (`powershell.exe`): loading System.Windows.Forms — which the clipboard
 * write needs — costs ~0.8s under pwsh versus ~2s (and up to ~13s on a busy
 * machine, cold) under powershell.exe. `powershell.exe` is always present on
 * Windows, so it is the fallback.
 */
let cachedPowerShell: string | undefined;

const POWERSHELL_CANDIDATES = ['pwsh.exe', 'powershell.exe'];

// A spawned host must load WinForms before it answers; cold that can take >10s.
const HOST_READY_TIMEOUT_MS = 25000;
// Once the host is ready a copy is a few tens of ms; the margin covers the
// internal SetDataObject retry (10×150ms) and a busy machine.
const COPY_TIMEOUT_MS = 10000;
// The one-shot fallback spawns + loads WinForms fresh, so it needs the cold budget.
const ONESHOT_TIMEOUT_MS = 25000;

/**
 * The PowerShell host resolved for clipboard writes (`'pwsh.exe'` or
 * `'powershell.exe'`), or `undefined` if no write has run yet.
 *
 * A value of `'powershell.exe'` means PowerShell 7 (`pwsh`) was not found and
 * the slower Windows PowerShell fallback was used — the caller can use this to
 * suggest installing PowerShell 7.
 */
export function getWindowsPowerShellHost(): string | undefined {
  return cachedPowerShell;
}

/**
 * Copy HTML to the Windows clipboard via a persistent PowerShell host (see
 * {@link WindowsClipboardHost}). The host loads System.Windows.Forms once and
 * then serves each copy in a few tens of milliseconds instead of paying the
 * ~1–2s assembly load on every copy. If the host cannot start (or dies), this
 * falls back to a self-contained one-shot PowerShell run.
 *
 * When `mode` is `'oneShot'` the persistent host is skipped entirely and every
 * copy spawns a fresh PowerShell (user-selectable via settings).
 */
async function copyWindows(html: string, plainText: string, mode: WindowsClipboardMode): Promise<void> {
  const cfHtml = buildCfHtml(html);

  if (mode === 'oneShot') {
    await copyWindowsOneShot(cfHtml, plainText);
    return;
  }

  try {
    await clipboardHost.copy(cfHtml, plainText);
  } catch {
    // Persistent host unavailable or failed — degrade to the proven one-shot
    // path (spawns a fresh PowerShell per copy: slower, but self-contained).
    await copyWindowsOneShot(cfHtml, plainText);
  }
}

// ---------------------------------------------------------------------------
// Persistent PowerShell clipboard host
// ---------------------------------------------------------------------------

/**
 * Bootstrap for the persistent host. It loads WinForms once, prints `READY`,
 * then serves one clipboard write per stdin line until stdin closes.
 *
 * Wire protocol (UTF-8, newline-delimited):
 *   request  : "<id>|<cfHtmlBase64>|<plainBase64>"
 *   response : "OK <id>"  or  "ERR <id> <message>"
 *
 * Payloads are base64 so a request is always one line and the CF_HTML bytes
 * reach the clipboard verbatim (no temp files, no BOM, exact byte offsets).
 * When the parent dies, stdin hits EOF and the loop exits on its own.
 */
const HOST_SCRIPT = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Windows.Forms
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 3
}
$enc = New-Object System.Text.UTF8Encoding($false)
$stdin = New-Object System.IO.StreamReader([System.Console]::OpenStandardInput(), $enc)
$stdout = New-Object System.IO.StreamWriter([System.Console]::OpenStandardOutput(), $enc)
$stdout.AutoFlush = $true
$stdout.WriteLine('READY')
while ($true) {
  $line = $stdin.ReadLine()
  if ($null -eq $line) { break }
  if ($line.Length -eq 0) { continue }
  if ($line -eq 'EXIT') { break }
  $parts = $line.Split('|')
  $id = $parts[0]
  try {
    $htmlBytes = [System.Convert]::FromBase64String($parts[1])
    $stream = New-Object System.IO.MemoryStream(,$htmlBytes)
    $plain = $enc.GetString([System.Convert]::FromBase64String($parts[2]))
    $dataObj = New-Object System.Windows.Forms.DataObject
    $dataObj.SetData([System.Windows.Forms.DataFormats]::Html, $stream)
    $dataObj.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $plain)
    [System.Windows.Forms.Clipboard]::SetDataObject($dataObj, $true, 10, 150)
    $stdout.WriteLine("OK $id")
  } catch {
    $msg = ($_.Exception.Message -replace '[\\r\\n]+', ' ')
    $stdout.WriteLine("ERR $id $msg")
  }
}
`;

interface PendingCopy {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Manages a long-lived PowerShell process that keeps WinForms loaded and serves
 * clipboard writes over stdin/stdout. Lazily started, restarted on death, and
 * disposed on extension deactivate. Concurrent copies are matched by id, so the
 * single channel serialises them safely.
 */
class WindowsClipboardHost {
  private proc: ReturnType<typeof spawn> | undefined;
  private startPromise: Promise<void> | undefined;
  private stdoutBuffer = '';
  private stderrTail = '';
  private readonly pending = new Map<string, PendingCopy>();
  private awaitingReady: { resolve: () => void; reject: (err: Error) => void } | undefined;

  async copy(cfHtml: string, plainText: string): Promise<void> {
    await this.ensureStarted();
    const stdin = this.proc?.stdin;
    if (!stdin) {
      throw new Error('PowerShell clipboard host is not running.');
    }

    const id = randomBytes(4).toString('hex');
    const cfB64 = Buffer.from(cfHtml, 'utf-8').toString('base64');
    const plainB64 = Buffer.from(plainText, 'utf-8').toString('base64');

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        // The host may be wedged — drop it so the next copy starts fresh.
        this.kill(new Error('Clipboard host timed out.'));
        reject(new Error(`Clipboard write timed out after ${COPY_TIMEOUT_MS / 1000}s.`));
      }, COPY_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      try {
        stdin.write(`${id}|${cfB64}|${plainB64}\n`);
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err as Error);
      }
    });
  }

  dispose(): void {
    if (this.proc?.stdin) {
      try { this.proc.stdin.write('EXIT\n'); } catch { /* ignore */ }
    }
    this.kill();
  }

  private ensureStarted(): Promise<void> {
    if (!this.startPromise) {
      this.startPromise = this.start().catch((err) => {
        this.startPromise = undefined;
        throw err;
      });
    }
    return this.startPromise;
  }

  private async start(): Promise<void> {
    const candidates = cachedPowerShell ? [cachedPowerShell] : POWERSHELL_CANDIDATES;
    let lastError: Error | undefined;
    for (const exe of candidates) {
      try {
        await this.spawnHost(exe);
        cachedPowerShell = exe;
        return;
      } catch (err) {
        lastError = err as Error;
        this.discardProc();
      }
    }
    throw lastError ?? new Error('Could not start a PowerShell clipboard host.');
  }

  private spawnHost(exe: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const encoded = Buffer.from(HOST_SCRIPT, 'utf16le').toString('base64');
      let proc: ReturnType<typeof spawn>;
      try {
        proc = spawn(
          exe,
          ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', encoded],
          { windowsHide: true }
        );
      } catch (err) {
        reject(err as Error);
        return;
      }

      this.proc = proc;
      this.stdoutBuffer = '';
      this.stderrTail = '';

      const readyTimer = setTimeout(() => {
        this.awaitingReady = undefined;
        reject(new Error(`PowerShell host did not become ready within ${HOST_READY_TIMEOUT_MS / 1000}s.`));
      }, HOST_READY_TIMEOUT_MS);

      this.awaitingReady = {
        resolve: () => { clearTimeout(readyTimer); resolve(); },
        reject: (err) => { clearTimeout(readyTimer); reject(err); },
      };

      proc.stdout?.setEncoding('utf8');
      proc.stdout?.on('data', (chunk: string) => this.onStdout(chunk));
      proc.stderr?.setEncoding('utf8');
      proc.stderr?.on('data', (chunk: string) => {
        this.stderrTail = (this.stderrTail + chunk).slice(-500);
      });

      proc.on('error', (err: Error) => this.onProcExit(proc, err));
      proc.on('exit', (code, signal) => this.onProcExit(proc, this.exitError(code, signal)));
    });
  }

  private onStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    let nl: number;
    while ((nl = this.stdoutBuffer.indexOf('\n')) >= 0) {
      const line = this.stdoutBuffer.slice(0, nl).replace(/\r$/, '');
      this.stdoutBuffer = this.stdoutBuffer.slice(nl + 1);
      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    if (line.length === 0) {
      return;
    }
    if (this.awaitingReady && line === 'READY') {
      const ready = this.awaitingReady;
      this.awaitingReady = undefined;
      ready.resolve();
      return;
    }
    // "OK <id>" or "ERR <id> <message>"
    const firstSpace = line.indexOf(' ');
    const tag = firstSpace < 0 ? line : line.slice(0, firstSpace);
    const rest = firstSpace < 0 ? '' : line.slice(firstSpace + 1);
    if (tag === 'OK') {
      this.settle(rest, undefined);
    } else if (tag === 'ERR') {
      const sep = rest.indexOf(' ');
      const id = sep < 0 ? rest : rest.slice(0, sep);
      const msg = sep < 0 ? 'Clipboard write failed.' : rest.slice(sep + 1);
      this.settle(id, new Error(`Clipboard write failed: ${msg}`));
    }
  }

  private settle(id: string, err: Error | undefined): void {
    const pending = this.pending.get(id);
    if (!pending) {
      return;
    }
    this.pending.delete(id);
    clearTimeout(pending.timer);
    if (err) {
      pending.reject(err);
    } else {
      pending.resolve();
    }
  }

  private onProcExit(proc: ReturnType<typeof spawn>, err: Error): void {
    if (this.proc !== proc) {
      return;
    }
    if (this.awaitingReady) {
      const ready = this.awaitingReady;
      this.awaitingReady = undefined;
      ready.reject(err);
    }
    this.failAll(err);
    this.proc = undefined;
    this.startPromise = undefined;
  }

  private failAll(err: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pending.clear();
  }

  private exitError(code: number | null, signal: NodeJS.Signals | null): Error {
    const detail = this.stderrTail.trim();
    return new Error(
      `PowerShell clipboard host exited (code ${code ?? 'null'}${signal ? `, signal ${signal}` : ''})` +
      (detail ? `: ${detail}` : '')
    );
  }

  private discardProc(): void {
    const proc = this.proc;
    if (!proc) {
      return;
    }
    this.proc = undefined;
    this.awaitingReady = undefined;
    proc.removeAllListeners();
    proc.stdout?.removeAllListeners();
    proc.stderr?.removeAllListeners();
    try { proc.kill(); } catch { /* ignore */ }
  }

  private kill(err?: Error): void {
    if (err) {
      this.failAll(err);
    }
    this.discardProc();
    this.startPromise = undefined;
  }
}

const clipboardHost = new WindowsClipboardHost();

/** Stop the persistent clipboard host (call from the extension's deactivate). */
export function disposeWindowsClipboardHost(): void {
  clipboardHost.dispose();
}

// ---------------------------------------------------------------------------
// One-shot fallback — a fresh PowerShell per copy (used if the host can't run)
// ---------------------------------------------------------------------------

async function copyWindowsOneShot(cfHtml: string, plainText: string): Promise<void> {
  const id = randomBytes(4).toString('hex');
  const cfHtmlFile = join(tmpdir(), `vscode-md-cf-${id}.txt`);
  const plainFile = join(tmpdir(), `vscode-md-plain-${id}.txt`);

  // Write without BOM — Node.js writeFile('utf-8') does not add BOM.
  await writeFile(cfHtmlFile, cfHtml, 'utf-8');
  await writeFile(plainFile, plainText, 'utf-8');

  // Forward slashes are fine for .NET on Windows.
  const cfHtmlPath = cfHtmlFile.replace(/\\/g, '/');
  const plainPath = plainFile.replace(/\\/g, '/');

  // $ErrorActionPreference + try/catch surface a real reason on stderr instead
  // of an empty "Command failed". SetDataObject's 4-arg overload retries 10×.
  const psScript = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -AssemblyName System.Windows.Forms

  # Read CF_HTML as raw bytes (no BOM reinterpretation)
  $bytes = [System.IO.File]::ReadAllBytes('${cfHtmlPath}')
  $stream = New-Object System.IO.MemoryStream(,$bytes)

  $plain = [System.IO.File]::ReadAllText('${plainPath}', [System.Text.Encoding]::UTF8)

  $dataObj = New-Object System.Windows.Forms.DataObject
  $dataObj.SetData([System.Windows.Forms.DataFormats]::Html, $stream)
  $dataObj.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $plain)
  [System.Windows.Forms.Clipboard]::SetDataObject($dataObj, $true, 10, 150)
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`;

  try {
    await runPowerShellOneShot(psScript);
  } finally {
    await unlink(cfHtmlFile).catch(() => {});
    await unlink(plainFile).catch(() => {});
  }
}

/**
 * Run a one-shot PowerShell script, preferring pwsh and falling back to
 * powershell.exe. The chosen host is cached for subsequent calls.
 */
async function runPowerShellOneShot(script: string): Promise<void> {
  const candidates = cachedPowerShell ? [cachedPowerShell] : POWERSHELL_CANDIDATES;

  let lastError: Error | undefined;
  for (const exe of candidates) {
    try {
      await execPowerShell(exe, script);
      cachedPowerShell = exe;
      return;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      // pwsh missing → try the next candidate; any other error is real.
      if (e.code === 'ENOENT') {
        lastError = e;
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error('No PowerShell host available.');
}

function execPowerShell(exe: string, script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      exe,
      ['-NoProfile', '-NonInteractive', '-STA', '-Command', script],
      { timeout: ONESHOT_TIMEOUT_MS },
      // error is ExecFileException (carries code/killed/signal); let TS infer it.
      (error, _stdout, stderr) => {
        if (!error) {
          resolve();
          return;
        }
        // Let ENOENT propagate so the caller can fall back to another host.
        if (error.code === 'ENOENT') {
          reject(error);
          return;
        }
        if (error.killed || error.signal === 'SIGTERM') {
          reject(new Error(`Clipboard write timed out after ${ONESHOT_TIMEOUT_MS / 1000}s.`));
          return;
        }
        reject(new Error(`Clipboard write failed: ${stderr.trim() || error.message}`));
      }
    );
  });
}

// ---------------------------------------------------------------------------
// macOS — NSPasteboard via osascript
// ---------------------------------------------------------------------------

/**
 * Copy HTML to macOS clipboard using osascript (AppleScript).
 * Sets both HTML and plain text on the pasteboard.
 */
async function copyMacOS(html: string, plainText: string): Promise<void> {
  const fullHtml = wrapHtml(html);
  const id = randomBytes(4).toString('hex');
  const htmlFile = join(tmpdir(), `vscode-md-${id}.html`);
  const plainFile = join(tmpdir(), `vscode-md-${id}.txt`);
  await writeFile(htmlFile, fullHtml, 'utf-8');
  await writeFile(plainFile, plainText, 'utf-8');
  let swiftFile = '';

  try {
    try {
      await copyMacOSWithOsaScript(htmlFile, plainFile);
      return;
    } catch {
      // Fallback to Swift path (older systems can fail JXA ObjC bridge calls)
    }

  // Use Swift via osascript — more reliable than AppleScript for setting
  // multiple pasteboard types (HTML + plain text) simultaneously.
  const swiftScript = `
import Cocoa

let args = CommandLine.arguments
guard args.count >= 3 else {
  fputs("Missing clipboard input files\\n", stderr)
  exit(2)
}

let htmlPath = args[1]
let plainPath = args[2]

guard let htmlData = FileManager.default.contents(atPath: htmlPath) else {
  fputs("Unable to read HTML clipboard payload\\n", stderr)
  exit(3)
}

let plainData = FileManager.default.contents(atPath: plainPath) ?? Data()
let plainText = String(data: plainData, encoding: .utf8) ?? ""

let pb = NSPasteboard.general
pb.clearContents()
pb.setData(htmlData, forType: .html)
pb.setString(plainText, forType: .string)
`;

    swiftFile = join(tmpdir(), `vscode-md-${id}.swift`);
    await writeFile(swiftFile, swiftScript, 'utf-8');

    await new Promise<void>((resolve, reject) => {
      execFile(
        'swift',
        [swiftFile, htmlFile, plainFile],
        { timeout: 10000 },
        (error, _stdout, stderr) => {
          if (error) {
            reject(new Error(`Clipboard write failed: ${stderr || error.message}`));
          } else {
            resolve();
          }
        }
      );
    });
  } finally {
    await unlink(htmlFile).catch(() => {});
    await unlink(plainFile).catch(() => {});
    if (swiftFile) {
      await unlink(swiftFile).catch(() => {});
    }
  }
}

async function copyMacOSWithOsaScript(htmlFile: string, plainFile: string): Promise<void> {
  const jxa = `
ObjC.import('AppKit')
ObjC.import('Foundation')

function run(argv) {
  var htmlPath = argv[0]
  var plainPath = argv[1]

  var fm = $.NSFileManager.defaultManager
  var htmlData = fm.contentsAtPath(htmlPath)
  if (!htmlData) {
    throw new Error('Unable to read HTML clipboard payload')
  }

  var plainData = fm.contentsAtPath(plainPath)
  var plainText = ''
  if (plainData) {
    var nsStr = $.NSString.alloc.initWithDataEncoding(plainData, $.NSUTF8StringEncoding)
    if (nsStr) {
      plainText = ObjC.unwrap(nsStr)
    }
  }

  var pb = $.NSPasteboard.generalPasteboard
  pb.clearContents()
  pb.setDataForType(htmlData, $.NSPasteboardTypeHTML)
  pb.setStringForType($(plainText), $.NSPasteboardTypeString)
  return 'ok'
}
`;

  return new Promise((resolve, reject) => {
    execFile(
      'osascript',
      ['-l', 'JavaScript', '-e', jxa, '--', htmlFile, plainFile],
      { timeout: 10000 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`Clipboard write failed: ${stderr || error.message}`));
        } else {
          resolve();
        }
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Linux — xclip (X11) or wl-copy (Wayland)
// ---------------------------------------------------------------------------

/**
 * Copy HTML to Linux clipboard.
 * Detects Wayland vs X11 and uses the appropriate tool.
 * Falls back to xclip if detection is ambiguous.
 */
async function copyLinux(html: string, plainText: string): Promise<void> {
  const fullHtml = wrapHtml(html);
  const isWayland = !!process.env.WAYLAND_DISPLAY;

  if (isWayland) {
    await pipeToClipboard('wl-copy', ['--type', 'text/html'], fullHtml,
      'wl-copy not found. Install wl-clipboard: sudo apt install wl-clipboard');
  } else {
    await pipeToClipboard('xclip', ['-selection', 'clipboard', '-t', 'text/html'], fullHtml,
      'xclip not found. Install it: sudo apt install xclip');
  }

  // Also set plain text (separate clipboard operation)
  if (isWayland) {
    await pipeToClipboard('wl-copy', ['--primary'], plainText).catch(() => {});
  } else {
    await pipeToClipboard('xclip', ['-selection', 'clipboard'], plainText).catch(() => {});
  }
}

/** Pipe content to a clipboard CLI tool via stdin. */
function pipeToClipboard(cmd: string, args: string[], content: string, notFoundHint?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { timeout: 10000 });
    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT' && notFoundHint) {
        reject(new Error(notFoundHint));
      } else {
        reject(new Error(`Clipboard write failed: ${err.message}`));
      }
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Clipboard write failed (exit ${code}): ${stderr}`));
      }
    });

    proc.stdin.write(content, 'utf-8');
    proc.stdin.end();
  });
}
