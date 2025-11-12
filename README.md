# Drafts App MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with the [Drafts app](https://getdrafts.com/) via its x-callback-url scheme.

## Requirements

- **Node.js 18 or later** (required by @modelcontextprotocol/sdk)
- Drafts app (iOS or macOS)
- An MCP-compatible client (e.g., Claude Desktop)

### Checking Your Node Version

```bash
node --version
```

If you're using an older version of Node.js, upgrade with nvm:

```bash
# Install Node.js 20 LTS (recommended)
nvm install 20
nvm use 20
nvm alias default 20
```

## Overview

This MCP server wraps the Drafts app's URL scheme functionality, allowing AI assistants and other MCP clients to:

- Create new drafts and get their UUIDs
- Retrieve existing drafts by UUID
- Get content from the currently active draft
- Search drafts
- Use dictation and get transcribed text
- Scan documents and get OCR text
- Arrange text with templates
- Run actions
- And more!

The server includes a **built-in callback handler** that:
1. Opens Drafts URLs automatically
2. Receives x-callback-url responses via a local HTTP server
3. Returns the actual data to your MCP client

This means you get real data back (draft content, UUIDs, etc.) instead of just URL strings!

## Installation

### Option 1: Install via npm (recommended)

```bash
npm install -g draftsapp-mcp
```

### Option 2: Install from source

```bash
git clone <repository-url>
cd draftsapp-mcp
npm install
npm run build
npm link
```

## Configuration

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "drafts": {
      "command": "node",
      "args": ["/path/to/draftsapp-mcp/build/index.js"]
    }
  }
}
```

**Important:** If Claude Desktop is using an old Node.js version, you can specify the full path to a newer Node.js installation:

```json
{
  "mcpServers": {
    "drafts": {
      "command": "/Users/yourusername/.nvm/versions/node/v20.x.x/bin/node",
      "args": ["/path/to/draftsapp-mcp/build/index.js"]
    }
  }
}
```

To find your Node.js path, run: `which node` (after activating the correct Node version with nvm)

Or if installed globally:

```json
{
  "mcpServers": {
    "drafts": {
      "command": "draftsapp-mcp"
    }
  }
}
```

### For other MCP clients

Configure the server to run via stdio transport using the command:

```bash
node /path/to/draftsapp-mcp/build/index.js
```

## Available Tools

### `drafts_create`

Creates a new draft in Drafts app.

**Parameters:**
- `text` (optional): Initial text content. Use `||clipboard||` to insert clipboard contents.
- `prepend` (optional): Text to prepend to the draft
- `append` (optional): Text to append to the draft
- `tag` (optional): Tag to apply to the draft
- `action` (optional): Action name to run after creating the draft
- `allowEmpty` (optional): Allow empty draft before running action
- `x-success` (optional): Callback URL for successful creation
- `x-error` (optional): Callback URL for errors
- `x-cancel` (optional): Callback URL for cancellation
- `retParam` (optional): Override default return parameter name

**Example:**
```json
{
  "text": "My new draft content",
  "tag": "important"
}
```

### `drafts_get`

Retrieves content of an existing draft by UUID.

**Parameters:**
- `uuid` (required): UUID of the draft to retrieve
- `x-success` (optional): Callback URL to receive draft content
- `x-error` (optional): Callback URL for errors
- `retParam` (optional): Override default return parameter name

### `drafts_get_current`

Gets information about the currently active draft in Drafts. Returns uuid, url, title, and content.

**Parameters:**
- `x-success` (optional): Callback URL to receive draft information
- `x-error` (optional): Callback URL for errors

### `drafts_search`

Searches for drafts matching a query.

**Parameters:**
- `query` (required): Search query string
- `tag` (optional): Filter results by tag
- `x-success` (optional): Callback URL for results
- `x-error` (optional): Callback URL for errors

### `drafts_dictate`

Starts dictation and passes the transcribed text to the callback.

**Parameters:**
- `locale` (optional): Locale for dictation (e.g., "en-US", "es-ES")
- `x-success` (optional): Callback URL to receive dictated text
- `x-error` (optional): Callback URL for errors
- `x-cancel` (optional): Callback URL for cancellation
- `retParam` (optional): Override default return parameter name

### `drafts_scan_document`

Starts document scanning and passes the scanned text to the callback.

**Parameters:**
- `x-success` (optional): Callback URL to receive scanned text
- `x-error` (optional): Callback URL for errors
- `x-cancel` (optional): Callback URL for cancellation
- `retParam` (optional): Override default return parameter name

### `drafts_arrange`

Arranges text using a template and sends the result to the callback.

**Parameters:**
- `text` (required): Text to arrange
- `template` (required): Template for arrangement
- `x-success` (optional): Callback URL to receive arranged text
- `x-error` (optional): Callback URL for errors
- `retParam` (optional): Override default return parameter name

### `drafts_open`

Opens an existing draft by UUID in the Drafts app.

**Parameters:**
- `uuid` (required): UUID of the draft to open

### `drafts_run_action`

Runs a named action on text content in Drafts.

**Parameters:**
- `action` (required): Name of the action to run
- `text` (optional): Text content to run the action on
- `allowEmpty` (optional): Allow empty content

## Usage Examples

### Creating a Draft with Content

When you ask an AI assistant using this MCP server:

> "Create a new draft in Drafts with the text 'Meeting notes for today'"

The server generates:
```
drafts://x-callback-url/create?text=Meeting%20notes%20for%20today
```

### Using Clipboard Content

> "Create a draft with clipboard content and tag it as 'web-clip'"

Generates:
```
drafts://x-callback-url/create?text=%7C%7Cclipboard%7C%7C&tag=web-clip
```

### Retrieving a Draft

> "Get the draft with UUID abc-123-def"

Generates:
```
drafts://x-callback-url/get?uuid=abc-123-def
```

### Searching Drafts

> "Search for drafts containing 'meeting notes' with tag 'work'"

Generates:
```
drafts://x-callback-url/search?query=meeting%20notes&tag=work
```

## How It Works

1. **MCP client calls a tool** (e.g., `drafts_get_current`)
2. **Server starts a local callback server** on an available port (e.g., `http://localhost:49597`)
3. **Server generates a Drafts URL** with callback URLs pointing to the local server
4. **Server opens the URL** which launches the Drafts app
5. **Drafts performs the action** (e.g., gets the current draft)
6. **Drafts calls back** to the local server with the results
7. **Server receives the data** and returns it to the MCP client

### Example Flow

```
MCP Client → drafts_get_current()
    ↓
Server generates: drafts://x-callback-url/getCurrentDraft?x-success=http://localhost:49597/callback?id=abc123
    ↓
Server opens URL → Drafts app opens
    ↓
Drafts gets current draft
    ↓
Drafts calls: http://localhost:49597/callback?id=abc123&uuid=XYZ&content=Hello%20World
    ↓
Server receives callback → Returns data to client
    ↓
Client gets: { uuid: "XYZ", content: "Hello World" }
```

## x-callback-url Support

The server automatically handles x-callback-url callbacks:

- **x-success**: Automatically set to receive successful results
- **x-error**: Automatically set to receive error messages
- **x-cancel**: Automatically set to handle user cancellation

All callbacks are handled internally and the appropriate data or error is returned to the MCP client.

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

## Requirements

- Node.js 18 or later
- Drafts app (iOS or macOS)
- An MCP-compatible client (e.g., Claude Desktop)

## References

- [Drafts URL Schemes Documentation](https://docs.getdrafts.com/docs/automation/urlschemes)
- [x-callback-url Specification](http://x-callback-url.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT
