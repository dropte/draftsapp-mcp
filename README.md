# Drafts App MCP Server

A Model Context Protocol (MCP) server for integrating [Drafts app](https://getdrafts.com/) with AI assistants via **Apple Shortcuts**.

## Why Shortcuts?

This server uses Apple Shortcuts instead of x-callback-url because shortcuts can:
- ✅ **List all drafts** (not just individual ones)
- ✅ **Search and filter** drafts with complex queries
- ✅ **Return structured JSON** data directly
- ✅ **Access all draft properties** (tags, dates, content, etc.)
- ✅ **No callback servers needed** - direct, synchronous responses
- ✅ **More powerful and flexible** than URL schemes

## Requirements

- **macOS 12 (Monterey) or later** (for `shortcuts` CLI)
- **Node.js 18 or later**
- **Drafts app** (macOS version)
- **Shortcuts app** (pre-installed on macOS)
- An MCP-compatible client (e.g., Claude Desktop)

### Checking Your Node Version

```bash
node --version
```

If you're using an older version, upgrade with nvm:

```bash
nvm install 20
nvm use 20
nvm alias default 20
```

## Installation

### 1. Install the MCP Server

```bash
git clone <repository-url>
cd draftsapp-mcp
npm install
npm run build
```

### 2. Set Up Shortcuts

**This is the key step!** You need to create shortcuts that the MCP server will call.

See **[SHORTCUTS_SETUP.md](SHORTCUTS_SETUP.md)** for detailed instructions on creating the required shortcuts.

**Quick summary** - Create these 5 shortcuts in the Shortcuts app:

1. **"Drafts - Get All"** - Returns list of drafts as JSON
2. **"Drafts - Search"** - Searches drafts by query
3. **"Drafts - Get by UUID"** - Gets specific draft by UUID
4. **"Drafts - Get Current"** - Gets currently active draft
5. **"Drafts - Create"** - Creates a new draft

Each shortcut is simple (3-5 actions) and uses Drafts' built-in Shortcut actions.

### 3. Test Shortcuts

Before using with the MCP server, test that your shortcuts work:

```bash
# List your shortcuts
shortcuts list | grep "Drafts -"

# Test getting all drafts
shortcuts run "Drafts - Get All"

# Test search
shortcuts run "Drafts - Search" -i "meeting"
```

If these work, you're ready to use the MCP server!

## Configuration

### For Claude Desktop

Add to your `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

**With specific Node version:**

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

Find your Node path with: `which node`

## Available Tools

### `drafts_list`

Lists drafts from the Drafts app.

**Parameters:**
- `limit` (optional): Maximum number of drafts to return (default: 20)

**Example:**
```
List my 10 most recent drafts
```

**Returns:**
```json
[
  {
    "uuid": "ABC-123",
    "content": "Meeting notes...",
    "tags": ["work", "meeting"],
    "created": "2025-01-15",
    "modified": "2025-01-15"
  },
  ...
]
```

### `drafts_search`

Searches for drafts matching a query.

**Parameters:**
- `query` (required): Search query string

**Example:**
```
Search my drafts for "project ideas"
```

### `drafts_get`

Retrieves a specific draft by UUID.

**Parameters:**
- `uuid` (required): UUID of the draft

**Example:**
```
Get draft with UUID ABC-123
```

### `drafts_get_current`

Gets the currently active/open draft in Drafts.

**Example:**
```
What's my current draft in Drafts?
```

### `drafts_create`

Creates a new draft.

**Parameters:**
- `text` (required): Content of the draft
- `tags` (optional): Array of tags

**Example:**
```
Create a draft with "Buy milk" tagged as "shopping"
```

**Returns:**
```json
{
  "uuid": "NEW-UUID",
  "success": true
}
```

### `drafts_run_shortcut`

Runs any custom Drafts-related shortcut by name.

**Parameters:**
- `name` (required): Name of the shortcut
- `input` (optional): Input to pass to the shortcut

**Example:**
```
Run my custom shortcut "Drafts - Export Weekly Notes"
```

## Usage Examples

Once set up with Claude Desktop:

**"Show me my 5 most recent drafts"**
- Calls `drafts_list` with limit: 5
- Returns JSON array of drafts

**"Search my drafts for todos"**
- Calls `drafts_search` with query: "todos"
- Returns matching drafts

**"What am I currently working on in Drafts?"**
- Calls `drafts_get_current`
- Returns the active draft

**"Create a draft that says 'Call dentist tomorrow'"**
- Calls `drafts_create` with text
- Returns UUID of new draft

## How It Works

```
You → Claude Desktop → MCP Server → shortcuts CLI → Drafts App
                                         ↓
                     JSON data ← ← ← ← ←
```

1. You ask Claude to interact with Drafts
2. Claude calls an MCP tool
3. MCP server runs a Shortcuts command: `shortcuts run "Drafts - Get All"`
4. Shortcuts executes actions in the Drafts app
5. Shortcuts returns JSON data
6. MCP server returns data to Claude
7. Claude presents the information to you

No callbacks, no web servers, no complexity - just direct command execution!

## Troubleshooting

### "Shortcut not found"

Make sure you've created the required shortcuts in the Shortcuts app. The names must match exactly (case-sensitive):
- "Drafts - Get All"
- "Drafts - Search"
- "Drafts - Get by UUID"
- "Drafts - Get Current"
- "Drafts - Create"

### "shortcuts: command not found"

You're on macOS 11 or earlier. The `shortcuts` CLI requires macOS 12 (Monterey) or later.

### "Permission denied"

Grant Terminal (or Claude) permission to run shortcuts:
- System Settings → Privacy & Security → Automation

### "Invalid JSON" or "Failed to parse"

Your shortcut isn't returning valid JSON. Make sure your shortcut:
1. Uses **"Get Dictionary from Input"** or **"Dictionary"** action
2. Has **"Output"** action as the last step
3. Returns structured data, not plain text

Test the shortcut manually in the Shortcuts app to verify its output.

### No drafts returned

- Check that Drafts app is installed and has drafts
- Run the shortcut manually: `shortcuts run "Drafts - Get All"`
- Make sure your shortcut has the right permissions to access Drafts

## Advanced Usage

### Custom Shortcuts

You can create custom shortcuts for specific workflows:

**"Drafts - Get Tasks"** (Get drafts tagged with #task):
```
1. Get Drafts where Tags contains "task"
2. Get Details (UUID, Content, Tags)
3. Dictionary with details
4. Output as JSON
```

**"Drafts - Weekly Review"** (Get drafts from last 7 days):
```
1. Get Drafts modified in last 7 days
2. Get Details
3. Output as JSON
```

Then call them with: `drafts_run_shortcut` with name: "Drafts - Weekly Review"

### Modifying Shortcuts

You can customize the built-in shortcuts:
- Change the limit (default 20 drafts)
- Add more fields (folder, flagged status, etc.)
- Filter by workspace or folder
- Sort by different criteria

Just update the shortcut in Shortcuts app - the MCP server will use the latest version.

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Test Shortcuts Integration

```bash
# Check if shortcuts CLI is available
which shortcuts

# List Drafts shortcuts
shortcuts list | grep "Drafts -"

# Test a shortcut
shortcuts run "Drafts - Get All"
```

## Files

- `src/index.ts` - Main MCP server
- `src/shortcuts-runner.ts` - Shortcuts CLI integration
- `src/types.ts` - TypeScript type definitions
- `SHORTCUTS_SETUP.md` - Detailed shortcuts setup guide

## References

- [Drafts Documentation](https://docs.getdrafts.com/)
- [Apple Shortcuts User Guide](https://support.apple.com/guide/shortcuts-mac/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Drafts Scripting](https://docs.getdrafts.com/docs/automation/scripting)

## License

MIT
