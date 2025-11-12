#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { runShortcut, isShortcutsAvailable, listShortcuts } from './shortcuts-runner.js';

/**
 * MCP Server for Drafts app integration via Apple Shortcuts
 */
class DraftsAppServer {
  private server: Server;
  private shortcutsAvailable: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: 'draftsapp-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'drafts_list':
            return await this.handleListDrafts(args as any);
          case 'drafts_search':
            return await this.handleSearch(args as any);
          case 'drafts_get':
            return await this.handleGetDraft(args as any);
          case 'drafts_get_current':
            return await this.handleGetCurrentDraft();
          case 'drafts_create':
            return await this.handleCreateDraft(args as any);
          case 'drafts_run_shortcut':
            return await this.handleRunCustomShortcut(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'drafts_list',
        description:
          'Lists drafts from the Drafts app. Returns an array of drafts with uuid, content preview, tags, and dates. Requires "Drafts - Get All" shortcut to be set up.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of drafts to return (default: 20)',
            },
          },
        },
      },
      {
        name: 'drafts_search',
        description:
          'Searches for drafts matching a query. Returns matching drafts with their content. Requires "Drafts - Search" shortcut to be set up.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'drafts_get',
        description:
          'Retrieves a specific draft by UUID. Returns the full draft content and metadata. Requires "Drafts - Get by UUID" shortcut to be set up.',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              description: 'UUID of the draft to retrieve',
            },
          },
          required: ['uuid'],
        },
      },
      {
        name: 'drafts_get_current',
        description:
          'Gets the currently active/open draft in the Drafts app. Returns the draft content and metadata. Requires "Drafts - Get Current" shortcut to be set up.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'drafts_create',
        description:
          'Creates a new draft in the Drafts app. Returns the UUID of the created draft. Requires "Drafts - Create" shortcut to be set up.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Content of the new draft',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tags to apply to the draft',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'drafts_run_shortcut',
        description:
          'Runs a custom Drafts-related shortcut by name. Useful for running any custom shortcut you\'ve created. Returns the shortcut output.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the shortcut to run',
            },
            input: {
              type: 'string',
              description: 'Optional input to pass to the shortcut',
            },
          },
          required: ['name'],
        },
      },
    ];
  }

  private async handleListDrafts(args: { limit?: number }) {
    try {
      const result = await runShortcut({
        name: 'Drafts - Get All',
        outputType: 'json',
      });

      let drafts = Array.isArray(result) ? result : [result];

      // Apply limit if specified
      if (args.limit && args.limit > 0) {
        drafts = drafts.slice(0, args.limit);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Found ${drafts.length} draft(s):\n\n${JSON.stringify(drafts, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list drafts: ${errorMessage}\n\nMake sure you have created the "Drafts - Get All" shortcut. See SHORTCUTS_SETUP.md for instructions.`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSearch(args: { query: string }) {
    try {
      const result = await runShortcut({
        name: 'Drafts - Search',
        input: args.query,
        outputType: 'json',
      });

      const drafts = Array.isArray(result) ? result : [result];

      return {
        content: [
          {
            type: 'text',
            text: `Search results for "${args.query}":\n\nFound ${drafts.length} draft(s):\n\n${JSON.stringify(drafts, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Search failed: ${errorMessage}\n\nMake sure you have created the "Drafts - Search" shortcut. See SHORTCUTS_SETUP.md for instructions.`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetDraft(args: { uuid: string }) {
    try {
      const result = await runShortcut({
        name: 'Drafts - Get by UUID',
        input: args.uuid,
        outputType: 'json',
      });

      return {
        content: [
          {
            type: 'text',
            text: `Draft retrieved:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get draft: ${errorMessage}\n\nMake sure you have created the "Drafts - Get by UUID" shortcut. See SHORTCUTS_SETUP.md for instructions.`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetCurrentDraft() {
    try {
      const result = await runShortcut({
        name: 'Drafts - Get Current',
        outputType: 'json',
      });

      return {
        content: [
          {
            type: 'text',
            text: `Current draft:\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get current draft: ${errorMessage}\n\nMake sure you have created the "Drafts - Get Current" shortcut. See SHORTCUTS_SETUP.md for instructions.`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleCreateDraft(args: { text: string; tags?: string[] }) {
    try {
      const input = {
        text: args.text,
        tags: args.tags || [],
      };

      const result = await runShortcut({
        name: 'Drafts - Create',
        input,
        outputType: 'json',
      });

      return {
        content: [
          {
            type: 'text',
            text: `Draft created successfully!\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create draft: ${errorMessage}\n\nMake sure you have created the "Drafts - Create" shortcut. See SHORTCUTS_SETUP.md for instructions.`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleRunCustomShortcut(args: { name: string; input?: string }) {
    try {
      const result = await runShortcut({
        name: args.name,
        input: args.input,
        outputType: 'json',
      });

      return {
        content: [
          {
            type: 'text',
            text: `Shortcut "${args.name}" completed:\n\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to run shortcut "${args.name}": ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    // Check if shortcuts are available
    this.shortcutsAvailable = await isShortcutsAvailable();

    if (!this.shortcutsAvailable) {
      console.error(
        '[Warning] Shortcuts CLI not available. Make sure you are running on macOS 12+ and have the Shortcuts app.'
      );
    } else {
      console.error('[Shortcuts] CLI available');
      // List available shortcuts for debugging
      const shortcuts = await listShortcuts();
      const draftsShortcuts = shortcuts.filter((s) => s.startsWith('Drafts -'));
      console.error(`[Shortcuts] Found ${draftsShortcuts.length} Drafts shortcuts:`, draftsShortcuts);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Drafts App MCP server running with Apple Shortcuts integration');
  }
}

// Start the server
const server = new DraftsAppServer();
server.run().catch(console.error);
