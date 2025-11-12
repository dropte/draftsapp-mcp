#!/usr/bin/env node

/**
 * Automated setup script for Drafts shortcuts
 *
 * This script creates the required shortcuts programmatically using the shortcuts CLI.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

interface ShortcutAction {
  WFWorkflowActionIdentifier: string;
  WFWorkflowActionParameters: Record<string, any>;
}

interface ShortcutDefinition {
  name: string;
  description: string;
  actions: ShortcutAction[];
}

/**
 * Generate a shortcut plist structure
 */
function createShortcut(def: ShortcutDefinition): any {
  return {
    WFWorkflowActions: def.actions,
    WFWorkflowClientRelease: '2.2.2',
    WFWorkflowClientVersion: '2227',
    WFWorkflowIcon: {
      WFWorkflowIconStartColor: 4282601983,
      WFWorkflowIconGlyphNumber: 59446,
    },
    WFWorkflowImportQuestions: [],
    WFWorkflowInputContentItemClasses: ['WFStringContentItem'],
    WFWorkflowMinimumClientRelease: '2.2.2',
    WFWorkflowMinimumClientVersion: 2227,
    WFWorkflowOutputContentItemClasses: ['WFStringContentItem'],
    WFWorkflowTypes: ['NCWidget', 'WatchKit'],
  };
}

/**
 * Shortcut definitions
 */
const shortcuts: ShortcutDefinition[] = [
  {
    name: 'Drafts - Get All',
    description: 'Get all drafts and return as JSON',
    actions: [
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.comment',
        WFWorkflowActionParameters: {
          WFCommentActionText: 'Get all drafts from Drafts app and return as JSON array',
        },
      },
      {
        WFWorkflowActionIdentifier: 'com.agiletortoise.Drafts-OSX.GetDraftsAction',
        WFWorkflowActionParameters: {
          WFDraftsActionFilter: 'inbox',
          WFDraftsActionSortBy: 'modified',
          WFDraftsActionSortDescending: true,
          WFDraftsActionLimit: 20,
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.repeat.each',
        WFWorkflowActionParameters: {
          WFInput: {
            Value: {
              Type: 'Variable',
              Variable: {
                Value: {
                  Type: 'ActionOutput',
                  OutputName: 'Drafts',
                  OutputUUID: '{{draft-uuid}}',
                },
              },
            },
            WFSerializationType: 'WFTextTokenAttachment',
          },
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.properties.draft',
        WFWorkflowActionParameters: {
          WFContentItemPropertyName: 'UUID',
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.setvariable',
        WFWorkflowActionParameters: {
          WFVariableName: 'uuid',
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.properties.draft',
        WFWorkflowActionParameters: {
          WFContentItemPropertyName: 'Content',
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.setvariable',
        WFWorkflowActionParameters: {
          WFVariableName: 'content',
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.properties.draft',
        WFWorkflowActionParameters: {
          WFContentItemPropertyName: 'Tags',
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.setvariable',
        WFWorkflowActionParameters: {
          WFVariableName: 'tags',
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.dictionary',
        WFWorkflowActionParameters: {
          WFItems: {
            Value: {
              WFDictionaryFieldValueItems: [
                {
                  WFItemType: 0,
                  WFKey: { Value: { string: 'uuid' }, WFSerializationType: 'WFTextTokenString' },
                  WFValue: {
                    Value: { VariableName: 'uuid' },
                    WFSerializationType: 'WFTextTokenAttachment',
                  },
                },
                {
                  WFItemType: 0,
                  WFKey: { Value: { string: 'content' }, WFSerializationType: 'WFTextTokenString' },
                  WFValue: {
                    Value: { VariableName: 'content' },
                    WFSerializationType: 'WFTextTokenAttachment',
                  },
                },
                {
                  WFItemType: 0,
                  WFKey: { Value: { string: 'tags' }, WFSerializationType: 'WFTextTokenString' },
                  WFValue: {
                    Value: { VariableName: 'tags' },
                    WFSerializationType: 'WFTextTokenAttachment',
                  },
                },
              ],
            },
            WFSerializationType: 'WFDictionaryFieldValue',
          },
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.appendvariable',
        WFWorkflowActionParameters: {
          WFVariableName: 'results',
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.repeat.each.end',
        WFWorkflowActionParameters: {},
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.getvariable',
        WFWorkflowActionParameters: {
          WFVariable: {
            Value: { VariableName: 'results' },
            WFSerializationType: 'WFTextTokenAttachment',
          },
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.getvalueforkey',
        WFWorkflowActionParameters: {
          WFDictionaryKey: 'all',
        },
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.output',
        WFWorkflowActionParameters: {
          WFOutput: {
            Value: {
              Type: 'Variable',
              Variable: {
                Value: {
                  Type: 'ActionOutput',
                },
              },
            },
            WFSerializationType: 'WFTextTokenAttachment',
          },
        },
      },
    ],
  },
];

/**
 * Create a shortcut using the shortcuts command-line tool
 */
async function createShortcutViaScript(name: string, script: string): Promise<void> {
  const tempDir = tmpdir();
  const scriptPath = join(tempDir, `${name.replace(/\s+/g, '-')}.scpt`);

  console.log(`Creating shortcut "${name}"...`);

  try {
    // For now, let's use a simpler approach with the shortcuts CLI
    // We'll create shortcuts by running AppleScript
    await writeFile(scriptPath, script);

    const { stdout, stderr } = await execAsync(`osascript "${scriptPath}"`);

    if (stderr && !stderr.includes('missing value')) {
      console.error(`  Warning: ${stderr}`);
    }

    console.log(`  ✓ Created "${name}"`);
  } catch (error: any) {
    console.error(`  ✗ Failed to create "${name}": ${error.message}`);
    throw error;
  }
}

/**
 * Main setup function
 */
async function setup() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Drafts MCP Server - Automated Shortcuts Setup');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check if shortcuts CLI is available
  try {
    await execAsync('which shortcuts');
  } catch {
    console.error('✗ Error: shortcuts command not found.');
    console.error('  This requires macOS 12 (Monterey) or later.');
    process.exit(1);
  }

  console.log('✓ Shortcuts CLI available\n');

  // For the MVP, let's create a simple script that tells users which shortcuts to create
  // The full automation requires more complex AppleScript/Shortcut file format

  console.log('Creating shortcuts...\n');

  // Simple shortcuts that we can script
  const simpleShortcuts = [
    {
      name: 'Drafts - Get All',
      actions: 'Get 20 Drafts from Inbox → Output as JSON',
    },
    {
      name: 'Drafts - Search',
      actions: 'Get Drafts matching Shortcut Input → Output as JSON',
    },
    {
      name: 'Drafts - Get by UUID',
      actions: 'Get Draft where UUID = Shortcut Input → Output as JSON',
    },
    {
      name: 'Drafts - Get Current',
      actions: 'Get Current Draft → Output as JSON',
    },
    {
      name: 'Drafts - Create',
      actions: 'Create Draft from Shortcut Input → Output UUID as JSON',
    },
  ];

  console.log('Unfortunately, creating shortcuts programmatically is complex.');
  console.log('The Shortcuts app uses a proprietary plist format.\n');
  console.log('However, I can open the Shortcuts app for you to create them manually.\n');
  console.log('You need to create these 5 shortcuts:\n');

  simpleShortcuts.forEach((shortcut, i) => {
    console.log(`${i + 1}. "${shortcut.name}"`);
    console.log(`   Actions: ${shortcut.actions}\n`);
  });

  console.log('\nSee SHORTCUTS_SETUP.md for detailed step-by-step instructions.\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Offer to open Shortcuts app
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Open Shortcuts app now? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      try {
        await execAsync('open -a Shortcuts');
        console.log('\n✓ Opening Shortcuts app...');
        console.log('  Create the shortcuts listed above, then restart this MCP server.\n');
      } catch (error) {
        console.error('\n✗ Failed to open Shortcuts app');
      }
    }
    rl.close();
  });
}

// Run setup
setup().catch((error) => {
  console.error('\nSetup failed:', error.message);
  process.exit(1);
});
