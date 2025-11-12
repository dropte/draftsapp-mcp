#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import open from 'open';
import { buildDraftsUrl, CLIPBOARD_MARKER } from './url-builder.js';
import { getCallbackServer } from './callback-server.js';
import type {
  CreateDraftParams,
  GetDraftParams,
  SearchParams,
  DictateParams,
  ArrangeParams,
  OpenDraftParams,
  RunActionParams,
  CallbackParams,
} from './types.js';

/**
 * MCP Server for Drafts app integration with callback support
 */
class DraftsAppServer {
  private server: Server;
  private callbackServer = getCallbackServer();

  constructor() {
    this.server = new Server(
      {
        name: 'draftsapp-mcp',
        version: '1.0.0',
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
      await this.callbackServer.stop();
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
          case 'drafts_create':
            return await this.handleCreateDraft(args as unknown as CreateDraftParams);
          case 'drafts_get':
            return await this.handleGetDraft(args as unknown as GetDraftParams);
          case 'drafts_get_current':
            return await this.handleGetCurrentDraft(args as unknown as CallbackParams);
          case 'drafts_search':
            return await this.handleSearch(args as unknown as SearchParams);
          case 'drafts_dictate':
            return await this.handleDictate(args as unknown as DictateParams);
          case 'drafts_scan_document':
            return await this.handleScanDocument(args as unknown as CallbackParams);
          case 'drafts_arrange':
            return await this.handleArrange(args as unknown as ArrangeParams);
          case 'drafts_open':
            return await this.handleOpenDraft(args as unknown as OpenDraftParams);
          case 'drafts_run_action':
            return await this.handleRunAction(args as unknown as RunActionParams);
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

  /**
   * Execute a Drafts URL and wait for callback
   */
  private async executeDraftsUrl(
    action: string,
    params: Record<string, string | number | boolean | undefined>,
    expectCallback: boolean = true
  ): Promise<{ success: boolean; data?: Record<string, string>; error?: string }> {
    // Ensure callback server is started
    await this.callbackServer.start();

    if (!expectCallback) {
      // For actions that don't return data, just open the URL
      const url = buildDraftsUrl(action as any, params);
      await open(url);
      return { success: true };
    }

    // Generate a unique callback ID
    const callbackId = randomUUID();

    // Add callback URLs to params
    const paramsWithCallbacks = {
      ...params,
      'x-success': this.callbackServer.getCallbackUrl(callbackId, 'success'),
      'x-error': this.callbackServer.getCallbackUrl(callbackId, 'error'),
      'x-cancel': this.callbackServer.getCallbackUrl(callbackId, 'cancel'),
    };

    // Build and open the URL
    const url = buildDraftsUrl(action as any, paramsWithCallbacks);
    console.error(`[DraftsApp] Opening URL: ${url}`);
    await open(url);

    // Wait for callback
    try {
      const result = await this.callbackServer.waitForCallback(callbackId, 30000);

      if (result.success) {
        return { success: true, data: result.params };
      } else {
        return { success: false, error: result.error || 'Operation failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'drafts_create',
        description:
          'Creates a new draft in Drafts app and returns its UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Initial text content. Use "||clipboard||" to insert clipboard contents.',
            },
            prepend: {
              type: 'string',
              description: 'Text to prepend to the draft',
            },
            append: {
              type: 'string',
              description: 'Text to append to the draft',
            },
            tag: {
              type: 'string',
              description: 'Tag to apply to the draft',
            },
            action: {
              type: 'string',
              description: 'Action name to run after creating the draft',
            },
            allowEmpty: {
              type: 'boolean',
              description: 'Allow empty draft before running action',
            },
          },
        },
      },
      {
        name: 'drafts_get',
        description:
          'Retrieves the content of an existing draft by UUID.',
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
          'Gets information about the currently active draft in Drafts (uuid, url, title, content).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'drafts_search',
        description: 'Searches for drafts matching a query.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            tag: {
              type: 'string',
              description: 'Filter results by tag',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'drafts_dictate',
        description:
          'Starts dictation and returns the transcribed text.',
        inputSchema: {
          type: 'object',
          properties: {
            locale: {
              type: 'string',
              description: 'Locale for dictation (e.g., "en-US", "es-ES")',
            },
          },
        },
      },
      {
        name: 'drafts_scan_document',
        description:
          'Starts document scanning and returns the scanned text.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'drafts_arrange',
        description:
          'Arranges text using a template and returns the result.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to arrange',
            },
            template: {
              type: 'string',
              description: 'Template for arrangement',
            },
          },
          required: ['text', 'template'],
        },
      },
      {
        name: 'drafts_open',
        description: 'Opens an existing draft by UUID in the Drafts app.',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              description: 'UUID of the draft to open',
            },
          },
          required: ['uuid'],
        },
      },
      {
        name: 'drafts_run_action',
        description: 'Runs a named action on text content in Drafts.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text content to run the action on',
            },
            action: {
              type: 'string',
              description: 'Name of the action to run',
            },
            allowEmpty: {
              type: 'boolean',
              description: 'Allow empty content',
            },
          },
          required: ['action'],
        },
      },
    ];
  }

  private async handleCreateDraft(params: CreateDraftParams) {
    const result = await this.executeDraftsUrl('create', params as any, true);

    if (result.success && result.data) {
      return {
        content: [
          {
            type: 'text',
            text: `Draft created successfully!\n\nUUID: ${result.data.uuid || result.data.text || 'N/A'}\n\nFull response: ${JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create draft: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetDraft(params: GetDraftParams) {
    const result = await this.executeDraftsUrl('get', params as any, true);

    if (result.success && result.data) {
      return {
        content: [
          {
            type: 'text',
            text: `Draft retrieved:\n\n${result.data.text || JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to retrieve draft: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleGetCurrentDraft(params: CallbackParams) {
    const result = await this.executeDraftsUrl('getCurrentDraft', params as any, true);

    if (result.success && result.data) {
      return {
        content: [
          {
            type: 'text',
            text: `Current draft:\n\nTitle: ${result.data.title || 'N/A'}\nUUID: ${result.data.uuid || 'N/A'}\nURL: ${result.data.url || 'N/A'}\n\nContent:\n${result.data.content || result.data.text || 'No content'}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get current draft: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSearch(params: SearchParams) {
    const result = await this.executeDraftsUrl('search', params as any, true);

    if (result.success && result.data) {
      return {
        content: [
          {
            type: 'text',
            text: `Search results:\n\n${JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Search failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleDictate(params: DictateParams) {
    const result = await this.executeDraftsUrl('dictate', params as any, true);

    if (result.success && result.data) {
      return {
        content: [
          {
            type: 'text',
            text: `Dictated text:\n\n${result.data.text || JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Dictation failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleScanDocument(params: CallbackParams) {
    const result = await this.executeDraftsUrl('scanDocument', params as any, true);

    if (result.success && result.data) {
      return {
        content: [
          {
            type: 'text',
            text: `Scanned text:\n\n${result.data.text || JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Scan failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleArrange(params: ArrangeParams) {
    const result = await this.executeDraftsUrl('arrange', params as any, true);

    if (result.success && result.data) {
      return {
        content: [
          {
            type: 'text',
            text: `Arranged text:\n\n${result.data.text || JSON.stringify(result.data, null, 2)}`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Arrange failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleOpenDraft(params: OpenDraftParams) {
    const result = await this.executeDraftsUrl('open', params as any, false);

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Draft opened successfully (UUID: ${params.uuid})`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to open draft: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleRunAction(params: RunActionParams) {
    const result = await this.executeDraftsUrl('runAction', params as any, false);

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Action "${params.action}" executed successfully`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to run action: ${result.error}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    // Start callback server
    await this.callbackServer.start();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Drafts App MCP server running on stdio with callback support');
  }
}

// Start the server
const server = new DraftsAppServer();
server.run().catch(console.error);
