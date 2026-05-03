#!/bin/bash
# Claude Code passes session data as JSON on stdin
SESSION=$(cat)
TOKENS_IN=$(echo "$SESSION"  | jq -r '.usage.input_tokens  // 0')
TOKENS_OUT=$(echo "$SESSION" | jq -r '.usage.output_tokens // 0')
MODEL=$(echo "$SESSION"      | jq -r '.model // "unknown"')
DATE=$(date +%Y-%m-%d)
BRANCH=$(git branch --show-current 2>/dev/null || echo "no-branch")

echo "$DATE,claude,$MODEL,$BRANCH,$TOKENS_IN,$TOKENS_OUT" \
  >> "$CLAUDE_WORKSPACE/tasks/token-log.csv"