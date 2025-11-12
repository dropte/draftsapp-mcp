#!/usr/bin/env node

/**
 * Generates .shortcut files for Drafts integration
 *
 * Note: This creates simplified shortcut files. For full compatibility,
 * you may need to open and re-save them in the Shortcuts app.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SHORTCUTS_DIR = join(__dirname, '..', 'shortcuts');

// Shortcut template in plist format
function createShortcutPlist(name: string, actions: any[]): string {
  const plist = {
    WFWorkflowActions: actions,
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

  return JSON.stringify(plist, null, 2);
}

async function generateShortcuts() {
  console.log('Generating shortcut files...\n');

  // Create shortcuts directory
  await mkdir(SHORTCUTS_DIR, { recursive: true });

  // Create simple text files with instructions instead
  // These can be imported by copy-pasting into the Shortcuts app

  const shortcuts = [
    {
      name: 'Drafts - Get All',
      file: 'drafts-get-all.txt',
      content: `# Drafts - Get All

This shortcut gets all drafts and returns them as JSON.

Actions to add in Shortcuts app:

1. Get Drafts
   - Filter: Inbox (or All)
   - Sort by: Modified (Newest First)
   - Limit: 20

2. Repeat with Each (item in Drafts)

   3. Get Details of Draft
      - Get: UUID, Content, Tags, Created Date, Modified Date

   4. Dictionary
      - uuid: UUID
      - content: Content (first 200 characters)
      - tags: Tags
      - created: Created Date
      - modified: Modified Date

   5. Add to Variable
      - Variable: results

6. End Repeat

7. Get Variable
   - Variable: results

8. Get Dictionary from Input

9. Get Value for Key
   - Key: all

10. Output
    - Result

Save as: "Drafts - Get All" (exact name, case-sensitive)
`,
    },
    {
      name: 'Drafts - Search',
      file: 'drafts-search.txt',
      content: `# Drafts - Search

This shortcut searches drafts and returns results as JSON.

Actions to add in Shortcuts app:

1. Get Drafts
   - Filter: where Content contains "Shortcut Input"
   - Limit: 50

2. Repeat with Each

   3. Get Details of Draft
      - UUID, Content, Tags

   4. Dictionary
      - uuid: UUID
      - content: Content
      - tags: Tags

   5. Add to Variable
      - Variable: results

6. End Repeat

7. Get Variable
   - Variable: results

8. Output
   - Result

Save as: "Drafts - Search" (exact name, case-sensitive)
`,
    },
    {
      name: 'Drafts - Get by UUID',
      file: 'drafts-get-by-uuid.txt',
      content: `# Drafts - Get by UUID

This shortcut gets a specific draft by UUID.

Actions to add in Shortcuts app:

1. Get Drafts
   - Filter: where UUID equals "Shortcut Input"
   - Limit: 1

2. Get Details of Draft
   - UUID, Content, Tags, Created Date, Modified Date, Permalink

3. Dictionary
   - uuid: UUID
   - content: Content
   - tags: Tags
   - created: Created Date
   - modified: Modified Date
   - url: Permalink

4. Output
   - Result

Save as: "Drafts - Get by UUID" (exact name, case-sensitive)
`,
    },
    {
      name: 'Drafts - Get Current',
      file: 'drafts-get-current.txt',
      content: `# Drafts - Get Current

This shortcut gets the currently active draft.

Actions to add in Shortcuts app:

1. Get Current Draft

2. Get Details of Draft
   - UUID, Content, Tags, Created Date, Modified Date

3. Dictionary
   - uuid: UUID
   - content: Content
   - tags: Tags
   - created: Created Date
   - modified: Modified Date
   - title: (first line of Content)

4. Output
   - Result

Save as: "Drafts - Get Current" (exact name, case-sensitive)
`,
    },
    {
      name: 'Drafts - Create',
      file: 'drafts-create.txt',
      content: `# Drafts - Create

This shortcut creates a new draft.

Actions to add in Shortcuts app:

1. Get Dictionary from Input
   - Input: Shortcut Input

2. Get Value for Key
   - Key: text
   - Dictionary: (from step 1)

3. Set Variable
   - Variable: text_content
   - Value: (from step 2)

4. Get Value for Key
   - Key: tags
   - Dictionary: (from step 1)

5. Set Variable
   - Variable: tag_list
   - Value: (from step 4)

6. Create Draft
   - Content: Variable text_content
   - Tags: Variable tag_list

7. Get Details of Draft
   - UUID

8. Dictionary
   - uuid: UUID
   - success: true

9. Output
   - Result

Save as: "Drafts - Create" (exact name, case-sensitive)
`,
    },
  ];

  for (const shortcut of shortcuts) {
    const filePath = join(SHORTCUTS_DIR, shortcut.file);
    await writeFile(filePath, shortcut.content);
    console.log(`✓ Generated: ${shortcut.file}`);
  }

  console.log(`\nShortcut templates saved to: ${SHORTCUTS_DIR}`);
  console.log('\nUse these as reference when creating shortcuts in the Shortcuts app.');
  console.log('See SHORTCUTS_SETUP.md for detailed visual instructions.\n');
}

generateShortcuts().catch((error) => {
  console.error('Error generating shortcuts:', error);
  process.exit(1);
});
