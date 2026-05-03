#!/bin/bash
set -e

FEAT_ID="$1"

if [ -z "$FEAT_ID" ]; then
  echo "Usage: ./scripts/review-feature FEAT-009"
  exit 1
fi

PROMPT=$(cat .codex/prompts/review-feature.md | sed "s/\$FEAT_ID/$FEAT_ID/g")

echo "[review-feature] Reviewing $FEAT_ID against spec and test plan..."
codex "$PROMPT"

DATE=$(date +%Y-%m-%d)
BRANCH=$(git branch --show-current 2>/dev/null || echo "no-branch")
echo "$DATE,codex,default,$BRANCH,review-feature,$FEAT_ID" >> tasks/token-log.csv
