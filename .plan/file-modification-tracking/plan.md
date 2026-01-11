# File Modification Tracking

## Overview
Track last modified time of files to prevent overwriting changes made by external systems between reads.

## Key Points from Discussion
- Cloud code has a file watching system
- If another process modifies a file and you try to edit_file, it checks internal tracker
- Compares "last time Claude modified this file" vs current mtime
- If modified externally, re-read file before editing

## Implementation Steps
1. Create internal file tracker (map of filepath -> last read/modified timestamp)
2. On read_file: record mtime
3. On edit_file:
   - Check current mtime vs recorded mtime
   - If different, re-read file first and inform model
   - Then apply edit
4. Consider using fs.watch or chokidar for real-time notifications

## Testing
- Test external modification detection
- Test that edits fail gracefully when file changed
- Test re-read behavior
