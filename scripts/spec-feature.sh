#!/bin/bash
set -e

FEAT_ID="$1"
DESCRIPTION="$2"
SCOPE="${3:-backend+frontend}"

if [ -z "$FEAT_ID" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: ./scripts/spec-feature FEAT-009 \"description\" [scope]"
  echo "  scope defaults to backend+frontend"
  exit 1
fi

PROMPT=$(cat .codex/prompts/spec-feature.md \
  | sed "s/\$FEAT_ID/$FEAT_ID/g" \
  | sed "s/\$DESCRIPTION/$DESCRIPTION/g" \
  | sed "s/\$SCOPE/$SCOPE/g")

echo "[spec-feature] Writing spec and test plan for $FEAT_ID..."
codex "$PROMPT"

# Log the session
DATE=$(date +%Y-%m-%d)
BRANCH=$(git branch --show-current 2>/dev/null || echo "no-branch")
echo "$DATE,codex,default,$BRANCH,spec-feature,$FEAT_ID" >> tasks/token-log.csv
