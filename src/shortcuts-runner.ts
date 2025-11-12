import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ShortcutInput {
  [key: string]: any;
}

export interface ShortcutOptions {
  name: string;
  input?: ShortcutInput | string;
  outputType?: 'text' | 'json';
}

/**
 * Run an Apple Shortcut and return its output
 */
export async function runShortcut(options: ShortcutOptions): Promise<any> {
  const { name, input, outputType = 'json' } = options;

  let command = `shortcuts run "${name}"`;

  // Add input if provided
  if (input !== undefined) {
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    // Escape single quotes in input
    const escapedInput = inputStr.replace(/'/g, "'\\''");
    command += ` -i '${escapedInput}'`;
  }

  console.error(`[Shortcuts] Running: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    if (stderr) {
      console.error(`[Shortcuts] stderr: ${stderr}`);
    }

    // Parse output based on type
    if (outputType === 'json') {
      try {
        return JSON.parse(stdout.trim());
      } catch (e) {
        // If JSON parsing fails, return as text
        console.error(`[Shortcuts] Failed to parse JSON, returning as text: ${e}`);
        return stdout.trim();
      }
    }

    return stdout.trim();
  } catch (error) {
    const err = error as any;
    console.error(`[Shortcuts] Error running shortcut "${name}":`, err.message);

    if (err.message.includes('not found')) {
      throw new Error(
        `Shortcut "${name}" not found. Please create this shortcut in the Shortcuts app first.`
      );
    }

    throw new Error(`Failed to run shortcut "${name}": ${err.message}`);
  }
}

/**
 * Check if shortcuts CLI is available
 */
export async function isShortcutsAvailable(): Promise<boolean> {
  try {
    await execAsync('which shortcuts');
    return true;
  } catch {
    return false;
  }
}

/**
 * List all available shortcuts
 */
export async function listShortcuts(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('shortcuts list');
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('[Shortcuts] Failed to list shortcuts:', error);
    return [];
  }
}
