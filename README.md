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

- Create new drafts
- Retrieve existing drafts
- Search drafts
- Use dictation
- Scan documents
- Arrange text with templates
- Run actions
- And more!

All tools generate proper `drafts://x-callback-url/...` URLs that work with the Drafts app on iOS and macOS.

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

1. The MCP server exposes various Drafts operations as tools
2. When a tool is called, it generates a properly formatted `drafts://x-callback-url/...` URL
3. The URL is returned to the client
4. Opening this URL launches the Drafts app and performs the requested action
5. If callback URLs are provided, Drafts will call them with results

## x-callback-url Support

All tools support the x-callback-url specification with three callback parameters:

- **x-success**: Called when the action completes successfully
- **x-error**: Called when an error occurs
- **x-cancel**: Called when the user cancels the action

The `retParam` parameter allows you to override the default return variable name for compatibility with different apps.

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
