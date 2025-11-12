#!/usr/bin/env node

/**
 * Interactive setup script for Drafts MCP Server
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir } from 'fs/promises';
import { join } from 'path';
import * as readline from 'readline';

const execAsync = promisify(exec);

interface ShortcutSpec {
  name: string;
  description: string;
  quickInstructions: string[];
}

const REQUIRED_SHORTCUTS: ShortcutSpec[] = [
  {
    name: 'Drafts - Get All',
    description: 'Returns a list of recent drafts as JSON',
    quickInstructions: [
      'Add action: Get Drafts (limit 20, from Inbox)',
      'Add action: Repeat with Each',
      '  Inside repeat: Get Details of Draft (UUID, Content, Tags)',
      '  Inside repeat: Dictionary with uuid, content, tags',
      '  Inside repeat: Add to Variable "results"',
      'Add action: Get Variable "results"',
      'Add action: Get Dictionary from Input',
      'Add action: Output',
    ],
  },
  {
    name: 'Drafts - Search',
    description: 'Searches drafts and returns matching results',
    quickInstructions: [
      'Add action: Get Drafts where Content contains "Shortcut Input"',
      'Add action: Repeat with Each',
      '  Inside: Create dictionary with UUID, Content, Tags',
      '  Inside: Add to Variable "results"',
      'Add action: Get Variable "results"',
      'Add action: Output',
    ],
  },
  {
    name: 'Drafts - Get by UUID',
    description: 'Gets a specific draft by its UUID',
    quickInstructions: [
      'Add action: Get Drafts where UUID = "Shortcut Input"',
      'Add action: Get Details of Draft',
      'Add action: Dictionary with UUID, Content, Tags, etc.',
      'Add action: Get Dictionary from Input',
      'Add action: Output',
    ],
  },
  {
    name: 'Drafts - Get Current',
    description: 'Gets the currently active draft',
    quickInstructions: [
      'Add action: Get Current Draft',
      'Add action: Get Details of Draft',
      'Add action: Dictionary with UUID, Content, Tags',
      'Add action: Output',
    ],
  },
  {
    name: 'Drafts - Create',
    description: 'Creates a new draft',
    quickInstructions: [
      'Add action: Get Dictionary from "Shortcut Input"',
      'Add action: Get Value for "text" from Dictionary',
      'Add action: Create Draft with above text',
      'Add action: Get Details of Draft → UUID',
      'Add action: Dictionary with uuid, success: true',
      'Add action: Output',
    ],
  },
];

async function checkShortcutsAvailable(): Promise<boolean> {
  try {
    await execAsync('which shortcuts');
    return true;
  } catch {
    return false;
  }
}

async function listExistingShortcuts(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('shortcuts list');
    return stdout
      .trim()
      .split('\n')
      .filter((s) => s.trim().length > 0);
  } catch {
    return [];
  }
}

async function checkShortcutExists(name: string, existingShortcuts: string[]): Promise<boolean> {
  return existingShortcuts.includes(name);
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function openShortcutsApp(): Promise<void> {
  try {
    await execAsync('open -a Shortcuts');
    console.log('  ✓ Opened Shortcuts app');
  } catch (error) {
    console.error('  ✗ Failed to open Shortcuts app');
    throw error;
  }
}

async function openDraftsDocumentation(): Promise<void> {
  try {
    await execAsync('open "https://docs.getdrafts.com/docs/automation/shortcuts"');
    console.log('  ✓ Opened Drafts Shortcuts documentation');
  } catch {
    console.error('  ℹ  Visit: https://docs.getdrafts.com/docs/automation/shortcuts');
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('     Drafts MCP Server - Interactive Setup');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check prerequisites
  console.log('Checking prerequisites...\n');

  const shortcutsAvailable = await checkShortcutsAvailable();
  if (!shortcutsAvailable) {
    console.error('✗ Shortcuts CLI not found');
    console.error('  Requires: macOS 12 (Monterey) or later\n');
    process.exit(1);
  }
  console.log('✓ Shortcuts CLI available');

  // Check existing shortcuts
  console.log('✓ Checking existing shortcuts...\n');

  const existing = await listExistingShortcuts();
  const draftsShortcuts = existing.filter((s) => s.startsWith('Drafts -'));

  if (draftsShortcuts.length > 0) {
    console.log(`Found ${draftsShortcuts.length} Drafts shortcut(s):`);
    draftsShortcuts.forEach((s) => console.log(`  - ${s}`));
    console.log('');
  }

  // Check which shortcuts need to be created
  const missing: ShortcutSpec[] = [];
  const found: string[] = [];

  for (const spec of REQUIRED_SHORTCUTS) {
    if (await checkShortcutExists(spec.name, existing)) {
      found.push(spec.name);
    } else {
      missing.push(spec);
    }
  }

  if (missing.length === 0) {
    console.log('✓ All required shortcuts are installed!\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Setup complete! You can now use the Drafts MCP server.\n');
    console.log('Restart Claude Desktop to start using it.\n');
    return;
  }

  console.log(`Need to create ${missing.length} shortcut(s):\n`);
  missing.forEach((spec, i) => {
    console.log(`${i + 1}. ${spec.name}`);
    console.log(`   ${spec.description}`);
  });
  console.log('');

  // Offer to show instructions
  const showInstructions = await ask('Show detailed instructions for each shortcut? (y/n): ');

  if (showInstructions.toLowerCase() === 'y' || showInstructions.toLowerCase() === 'yes') {
    console.log('\n═══════════════════════════════════════════════════════════\n');

    for (const spec of missing) {
      console.log(`\n📝 ${spec.name}`);
      console.log(`   ${spec.description}\n`);
      console.log('   Quick steps:');
      spec.quickInstructions.forEach((instruction) => {
        console.log(`   ${instruction}`);
      });
      console.log('\n-----------------------------------------------------------');
    }

    console.log('\n');
  }

  // Open Shortcuts app
  const openApp = await ask('Open Shortcuts app now? (y/n): ');

  if (openApp.toLowerCase() === 'y' || openApp.toLowerCase() === 'yes') {
    await openShortcutsApp();
    console.log('\n');

    const openDocs = await ask('Open Drafts Shortcuts documentation? (y/n): ');
    if (openDocs.toLowerCase() === 'y' || openDocs.toLowerCase() === 'yes') {
      await openDraftsDocumentation();
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('Next steps:\n');
  console.log('1. Create the shortcuts listed above in the Shortcuts app');
  console.log('2. Test each shortcut: shortcuts run "Drafts - Get All"');
  console.log('3. Run this setup script again to verify');
  console.log('4. Restart Claude Desktop\n');
  console.log('See SHORTCUTS_SETUP.md for detailed step-by-step instructions.\n');
}

main().catch((error) => {
  console.error('\nSetup error:', error.message);
  process.exit(1);
});
