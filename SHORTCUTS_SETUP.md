# Setting Up Drafts Shortcuts

This MCP server uses Apple Shortcuts to interact with Drafts. This is more powerful than x-callback-url because shortcuts can:
- Return lists of drafts
- Search and filter drafts
- Access all draft properties
- Return structured JSON data

## Prerequisites

- macOS 12 (Monterey) or later (for `shortcuts` CLI)
- Drafts app installed
- Shortcuts app (pre-installed on macOS)

## Required Shortcuts

You need to create the following shortcuts in the Shortcuts app. Each shortcut is simple and uses Drafts' built-in actions.

### 1. "Drafts - Get All"

**What it does**: Returns a list of all drafts as JSON

**Steps**:
1. Open Shortcuts app
2. Create new shortcut, name it **"Drafts - Get All"**
3. Add actions:
   - **Get Drafts** (from Drafts)
     - Filter: `Inbox` or `All`
     - Sort by: `Modified` (Newest First)
     - Limit: `100` (or your preference)
   - **Repeat with Each** (item in Drafts)
     - **Get Details of Draft** (get: UUID, Content, Tags, Created Date, Modified Date)
     - **Dictionary**:
       - `uuid`: UUID
       - `content`: Content
       - `preview`: First line of Content
       - `tags`: Tags
       - `created`: Created Date
       - `modified`: Modified Date
     - **Add to Variable** "Results"
   - **Get Variable** "Results"
   - **Get Dictionary from Input**
   - **Get Value for Key** (all keys)
   - **Output** as JSON Text

**Simplified version**:
```
Get Drafts (Inbox, limit 100)
For each draft:
  Create dictionary with:
    - uuid
    - content (first 200 chars)
    - tags
  Add to list
Output list as JSON
```

### 2. "Drafts - Search"

**What it does**: Searches drafts and returns results as JSON

**Input**: Search query (text)

**Steps**:
1. Create new shortcut, name it **"Drafts - Search"**
2. Add actions:
   - **Get Drafts** (from Drafts)
     - Filter by: `Inbox` or `All`
     - Search text: **Shortcut Input**
     - Limit: `50`
   - **Repeat with Each**
     - Create dictionary with draft details
     - Add to variable
   - **Output** as JSON

### 3. "Drafts - Get by UUID"

**What it does**: Gets a specific draft by UUID

**Input**: Draft UUID (text)

**Steps**:
1. Create new shortcut, name it **"Drafts - Get by UUID"**
2. Add actions:
   - **Find Drafts** where `UUID` = **Shortcut Input**
   - **Get Details of Draft**:
     - UUID
     - Content
     - Tags
     - Created Date
     - Modified Date
     - Permalink
   - **Dictionary** with all details
   - **Get Dictionary Value**
   - **Output** as JSON Text

### 4. "Drafts - Create"

**What it does**: Creates a new draft

**Input**: JSON with `{"text": "content", "tags": ["tag1", "tag2"]}`

**Steps**:
1. Create new shortcut, name it **"Drafts - Create"**
2. Add actions:
   - **Get Dictionary from Input**
   - **Get Value for "text"** from Dictionary
   - **Create Draft** (in Drafts)
     - Content: Dictionary value for "text"
     - Tags: Dictionary value for "tags"
   - **Get Details of Draft** → UUID
   - **Dictionary**:
     - `uuid`: UUID
     - `success`: true
   - **Output** as JSON Text

### 5. "Drafts - Get Current"

**What it does**: Gets the currently active draft in Drafts

**Steps**:
1. Create new shortcut, name it **"Drafts - Get Current"**
2. Add actions:
   - **Get Current Draft** (from Drafts)
   - **Get Details of Draft**:
     - UUID
     - Content
     - Tags
     - Created Date
     - Modified Date
   - **Dictionary** with all details
   - **Output** as JSON Text

## Quick Setup (Simplified Versions)

If the above seems complex, here are minimal versions:

### Minimal "Drafts - Get All":
```
1. Get Drafts (limit 20)
2. Set Variable "drafts"
3. Get Variable "drafts"
4. Get Name from drafts (this gets content)
```

### Minimal "Drafts - Search":
```
1. Get Shortcut Input
2. Get Drafts where "Any" contains "Shortcut Input"
3. Get Content from Drafts
```

## Testing Your Shortcuts

Test each shortcut from Terminal:

```bash
# List all your shortcuts
shortcuts list

# Test getting all drafts
shortcuts run "Drafts - Get All"

# Test search
shortcuts run "Drafts - Search" -i "meeting"

# Test get by UUID (replace with real UUID)
shortcuts run "Drafts - Get by UUID" -i "YOUR-UUID-HERE"

# Test create
shortcuts run "Drafts - Create" -i '{"text":"Hello from shortcuts","tags":["test"]}'

# Test get current
shortcuts run "Drafts - Get Current"
```

## Troubleshooting

### "Shortcut not found"
- Make sure the shortcut name matches exactly (case-sensitive)
- Check that the shortcut exists in Shortcuts app

### "Permission denied"
- Grant Terminal (or your app) access to run shortcuts
- System Settings → Privacy & Security → Automation

### "No output"
- Make sure the shortcut has an **Output** action at the end
- Try running the shortcut manually in Shortcuts app first

### "Invalid JSON"
- Make sure you're using **Get Dictionary from Input** and **Output as JSON Text**
- Test the shortcut in Shortcuts app and check the output

## Example Shortcut Exports

You can also import pre-made shortcuts. Create a file `Drafts-Get-All.shortcut` with this structure:

1. Open Shortcuts app
2. Create the shortcut as described above
3. Right-click the shortcut → Share → Export to Files
4. Share the exported `.shortcut` file

## Tips

1. **Start simple**: Create minimal versions first, then add more fields
2. **Test in Shortcuts app**: Run shortcuts manually before using with MCP
3. **Check output format**: Make sure shortcuts return valid JSON
4. **Use limits**: Don't return thousands of drafts at once
5. **Add error handling**: Use "If" actions to handle edge cases

## Advanced: Custom Shortcuts

You can create custom shortcuts for your specific workflow:

- **Drafts - Get Tasks**: Filter drafts with `#task` tag
- **Drafts - Get Notes**: Get drafts from specific workspace
- **Drafts - Append**: Append to existing draft
- **Drafts - Archive**: Archive completed drafts

The MCP server can run any shortcut, so you can create shortcuts for your specific needs!
