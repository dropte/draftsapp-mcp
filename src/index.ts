#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { buildDraftsUrl, CLIPBOARD_MARKER } from './url-builder.js';
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
 * MCP Server for Drafts app integration
 */
class DraftsAppServer {
  private server: Server;

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
            return this.handleCreateDraft(args as unknown as CreateDraftParams);
          case 'drafts_get':
            return this.handleGetDraft(args as unknown as GetDraftParams);
          case 'drafts_get_current':
            return this.handleGetCurrentDraft(args as unknown as CallbackParams);
          case 'drafts_search':
            return this.handleSearch(args as unknown as SearchParams);
          case 'drafts_dictate':
            return this.handleDictate(args as unknown as DictateParams);
          case 'drafts_scan_document':
            return this.handleScanDocument(args as unknown as CallbackParams);
          case 'drafts_arrange':
            return this.handleArrange(args as unknown as ArrangeParams);
          case 'drafts_open':
            return this.handleOpenDraft(args as unknown as OpenDraftParams);
          case 'drafts_run_action':
            return this.handleRunAction(args as unknown as RunActionParams);
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
        name: 'drafts_create',
        description:
          'Creates a new draft in Drafts app. Returns the UUID of the created draft via x-success callback.',
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
            'x-success': {
              type: 'string',
              description: 'Callback URL for successful creation',
            },
            'x-error': {
              type: 'string',
              description: 'Callback URL for errors',
            },
            'x-cancel': {
              type: 'string',
              description: 'Callback URL for cancellation',
            },
            retParam: {
              type: 'string',
              description: 'Override default return parameter name (default: "uuid")',
            },
          },
        },
      },
      {
        name: 'drafts_get',
        description:
          'Retrieves content of an existing draft by UUID and passes it to the x-success callback.',
        inputSchema: {
          type: 'object',
          properties: {
            uuid: {
              type: 'string',
              description: 'UUID of the draft to retrieve',
            },
            'x-success': {
              type: 'string',
              description: 'Callback URL to receive draft content',
            },
            'x-error': {
              type: 'string',
              description: 'Callback URL for errors',
            },
            retParam: {
              type: 'string',
              description: 'Override default return parameter name (default: "text")',
            },
          },
          required: ['uuid'],
        },
      },
      {
        name: 'drafts_get_current',
        description:
          'Gets information about the currently active draft in Drafts. Returns uuid, url, title, and content.',
        inputSchema: {
          type: 'object',
          properties: {
            'x-success': {
              type: 'string',
              description: 'Callback URL to receive draft information',
            },
            'x-error': {
              type: 'string',
              description: 'Callback URL for errors',
            },
          },
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
            'x-success': {
              type: 'string',
              description: 'Callback URL for results',
            },
            'x-error': {
              type: 'string',
              description: 'Callback URL for errors',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'drafts_dictate',
        description:
          'Starts dictation and passes the transcribed text to the x-success callback.',
        inputSchema: {
          type: 'object',
          properties: {
            locale: {
              type: 'string',
              description: 'Locale for dictation (e.g., "en-US", "es-ES")',
            },
            'x-success': {
              type: 'string',
              description: 'Callback URL to receive dictated text',
            },
            'x-error': {
              type: 'string',
              description: 'Callback URL for errors',
            },
            'x-cancel': {
              type: 'string',
              description: 'Callback URL for cancellation',
            },
            retParam: {
              type: 'string',
              description: 'Override default return parameter name (default: "text")',
            },
          },
        },
      },
      {
        name: 'drafts_scan_document',
        description:
          'Starts document scanning and passes the scanned text to the x-success callback.',
        inputSchema: {
          type: 'object',
          properties: {
            'x-success': {
              type: 'string',
              description: 'Callback URL to receive scanned text',
            },
            'x-error': {
              type: 'string',
              description: 'Callback URL for errors',
            },
            'x-cancel': {
              type: 'string',
              description: 'Callback URL for cancellation',
            },
            retParam: {
              type: 'string',
              description: 'Override default return parameter name (default: "text")',
            },
          },
        },
      },
      {
        name: 'drafts_arrange',
        description:
          'Arranges text using a template and sends the result to the x-success callback.',
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
            'x-success': {
              type: 'string',
              description: 'Callback URL to receive arranged text',
            },
            'x-error': {
              type: 'string',
              description: 'Callback URL for errors',
            },
            retParam: {
              type: 'string',
              description: 'Override default return parameter name (default: "text")',
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

  private handleCreateDraft(params: CreateDraftParams) {
    const url = buildDraftsUrl('create', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to create a draft:\n\n${url}\n\nNote: Use "${CLIPBOARD_MARKER}" in the text parameter to insert clipboard contents.`,
        },
      ],
    };
  }

  private handleGetDraft(params: GetDraftParams) {
    const url = buildDraftsUrl('get', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to retrieve the draft:\n\n${url}`,
        },
      ],
    };
  }

  private handleGetCurrentDraft(params: CallbackParams) {
    const url = buildDraftsUrl('getCurrentDraft', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to get the current draft:\n\n${url}`,
        },
      ],
    };
  }

  private handleSearch(params: SearchParams) {
    const url = buildDraftsUrl('search', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to search drafts:\n\n${url}`,
        },
      ],
    };
  }

  private handleDictate(params: DictateParams) {
    const url = buildDraftsUrl('dictate', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to start dictation:\n\n${url}`,
        },
      ],
    };
  }

  private handleScanDocument(params: CallbackParams) {
    const url = buildDraftsUrl('scanDocument', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to scan a document:\n\n${url}`,
        },
      ],
    };
  }

  private handleArrange(params: ArrangeParams) {
    const url = buildDraftsUrl('arrange', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to arrange text:\n\n${url}`,
        },
      ],
    };
  }

  private handleOpenDraft(params: OpenDraftParams) {
    const url = buildDraftsUrl('open', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to open the draft:\n\n${url}`,
        },
      ],
    };
  }

  private handleRunAction(params: RunActionParams) {
    const url = buildDraftsUrl('runAction', params as unknown as Record<string, string | number | boolean | undefined>);
    return {
      content: [
        {
          type: 'text',
          text: `Open this URL to run the action:\n\n${url}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Drafts App MCP server running on stdio');
  }
}

// Start the server
const server = new DraftsAppServer();
server.run().catch(console.error);
