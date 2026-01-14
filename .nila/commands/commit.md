Create a git commit with an appropriate commit message based on the changes made.

The user will provide a description of what they want to commit. You should:
1. Check the current git status to see what files have been changed
2. Review the changes to understand what was modified
3. Create a clear, descriptive commit message following conventional commit format (e.g., "feat:", "fix:", "refactor:", "docs:", "test:")
4. Stage the changes using `git add`
5. Create the commit using `git commit -m "message"`

If the user provides a specific commit message, use that. Otherwise, generate an appropriate message based on the changes.

Use the `run_command` tool to execute git commands.

