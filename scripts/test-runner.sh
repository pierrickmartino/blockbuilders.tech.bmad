#!/usr/bin/env bash
# test-runner.sh — Parse and report on docs/tst-*.md test checklists
#
# Usage:
#   ./scripts/test-runner.sh                  # Full summary of all test files
#   ./scripts/test-runner.sh --detail         # Per-file breakdown with section details
#   ./scripts/test-runner.sh --file <name>    # Report for a single test file (partial match)
#   ./scripts/test-runner.sh --category <cat> # Filter by category (epic|canvas|backtest|strategy|ui|billing|data)
#   ./scripts/test-runner.sh --unchecked      # Show only files with unchecked items
#   ./scripts/test-runner.sh --coverage       # PRD↔test coverage gap analysis
#   ./scripts/test-runner.sh --json           # Output summary as JSON (for CI/tooling)

set -uo pipefail

DOCS_DIR="$(cd "$(dirname "$0")/../docs" && pwd)"
MODE="summary"
FILTER_FILE=""
FILTER_CATEGORY=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --detail          Per-file breakdown with section details"
  echo "  --file <name>     Report for a single test file (partial match)"
  echo "  --category <cat>  Filter by category: epic, canvas, backtest, strategy, ui, billing, data"
  echo "  --unchecked       Show only files with unchecked items"
  echo "  --coverage        PRD↔test coverage gap analysis"
  echo "  --json            Output summary as JSON"
  echo "  -h, --help        Show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --detail)    MODE="detail"; shift ;;
    --file)      MODE="file"; FILTER_FILE="$2"; shift 2 ;;
    --category)  FILTER_CATEGORY="$2"; shift 2 ;;
    --unchecked) MODE="unchecked"; shift ;;
    --coverage)  MODE="coverage"; shift ;;
    --json)      MODE="json"; shift ;;
    -h|--help)   usage ;;
    *)           echo "Unknown option: $1"; usage ;;
  esac
done

# Categorize a test file by its name
categorize() {
  local name="$1"
  case "$name" in
    *epic*)                   echo "epic" ;;
    *canvas*|*node*|*block*|*inspector*|*minimap*|*undo*|*copy-paste*|*keyboard*|*bottom-action*|*compact-node*) echo "canvas" ;;
    *backtest*|*equity*|*drawdown*|*trade-dist*|*position*|*season*|*benchmark*|*transaction-cost*) echo "backtest" ;;
    *strategy*)               echo "strategy" ;;
    *dark-mode*|*display*|*responsive*|*mobile*|*tooltip*|*error-message*|*progress*|*top-bar*|*recently*|*dashboard*|*metrics-glossary*|*favorite-metrics*) echo "ui" ;;
    *subscription*|*billing*|*credit*|*grandfathered*|*tier*) echo "billing" ;;
    *data-quality*|*data-completeness*|*price-alert*|*price-ticker*|*volatility*|*market*|*notification*|*real-time*) echo "data" ;;
    *profile*|*user*|*auth*)  echo "user" ;;
    *tag*|*import*|*export*|*share*|*bulk*|*clone*|*template*|*explanation*|*note*|*wizard*|*validation*) echo "strategy" ;;
    *)                        echo "other" ;;
  esac
}

# Count checked/unchecked items in a file
count_checks() {
  local file="$1"
  local checked=0 unchecked=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*-\ \[x\] ]]; then
      checked=$((checked + 1))
    elif [[ "$line" =~ ^[[:space:]]*-\ \[\ \] ]]; then
      unchecked=$((unchecked + 1))
    fi
  done < "$file"
  echo "$checked $unchecked"
}

# Get sections from a file
get_sections() {
  local file="$1"
  grep -E '^##+ ' "$file" | sed 's/^##* //'
}

# Print a progress bar
progress_bar() {
  local checked=$1 total=$2 width=30
  if [[ $total -eq 0 ]]; then
    printf "${DIM}[no items]${RESET}"
    return
  fi
  local pct=$((checked * 100 / total))
  local filled=$((checked * width / total))
  local empty=$((width - filled))
  local color="$RED"
  if [[ $pct -ge 100 ]]; then color="$GREEN"
  elif [[ $pct -ge 50 ]]; then color="$YELLOW"
  fi
  printf "${color}["
  printf '%*s' "$filled" '' | tr ' ' '█'
  printf '%*s' "$empty" '' | tr ' ' '░'
  printf "] %3d%% (%d/%d)${RESET}" "$pct" "$checked" "$total"
}

# ── Coverage mode ──
run_coverage() {
  echo -e "${BOLD}${CYAN}PRD ↔ Test Coverage Gap Analysis${RESET}"
  echo -e "${DIM}──────────────────────────────────${RESET}"
  echo ""

  local prds_without_tests=0
  local tests_without_prds=0

  echo -e "${BOLD}PRDs missing test files:${RESET}"
  for prd in "$DOCS_DIR"/prd-*.md; do
    local base
    base=$(basename "$prd" | sed 's/^prd-/tst-/')
    if [[ ! -f "$DOCS_DIR/$base" ]]; then
      local name
      name=$(basename "$prd" .md | sed 's/^prd-//')
      if [[ "$name" != "template" ]]; then
        echo -e "  ${RED}✗${RESET} $name"
        prds_without_tests=$((prds_without_tests + 1))
      fi
    fi
  done
  if [[ $prds_without_tests -eq 0 ]]; then
    echo -e "  ${GREEN}✓ All PRDs have matching test files${RESET}"
  fi

  echo ""
  echo -e "${BOLD}Test files without matching PRDs:${RESET}"
  for tst in "$DOCS_DIR"/tst-*.md; do
    local base
    base=$(basename "$tst" | sed 's/^tst-/prd-/')
    if [[ ! -f "$DOCS_DIR/$base" ]]; then
      local name
      name=$(basename "$tst" .md | sed 's/^tst-//')
      echo -e "  ${YELLOW}?${RESET} $name"
      tests_without_prds=$((tests_without_prds + 1))
    fi
  done
  if [[ $tests_without_prds -eq 0 ]]; then
    echo -e "  ${GREEN}✓ All test files have matching PRDs${RESET}"
  fi

  echo ""
  local total_prds total_tests
  total_prds=$(find "$DOCS_DIR" -name 'prd-*.md' ! -name 'prd-template.md' | wc -l)
  total_tests=$(find "$DOCS_DIR" -name 'tst-*.md' | wc -l)
  local covered=$((total_prds - prds_without_tests))
  echo -e "${BOLD}Coverage: ${covered}/${total_prds} PRDs have test files ($((covered * 100 / total_prds))%)${RESET}"
  echo -e "Total test files: ${total_tests}"
}

# ── JSON mode ──
run_json() {
  echo "["
  local first=true
  for file in "$DOCS_DIR"/tst-*.md; do
    local name checked unchecked total cat
    name=$(basename "$file" .md | sed 's/^tst-//')
    read -r checked unchecked <<< "$(count_checks "$file")"
    total=$((checked + unchecked))
    cat=$(categorize "$name")

    if [[ -n "$FILTER_CATEGORY" && "$cat" != "$FILTER_CATEGORY" ]]; then
      continue
    fi

    if [[ "$first" == "true" ]]; then
      first=false
    else
      echo ","
    fi
    local pct=0
    if [[ $total -gt 0 ]]; then pct=$((checked * 100 / total)); fi
    printf '  {"name":"%s","category":"%s","checked":%d,"unchecked":%d,"total":%d,"percent":%d}' \
      "$name" "$cat" "$checked" "$unchecked" "$total" "$pct"
  done
  echo ""
  echo "]"
}

# ── Single file mode ──
run_file() {
  local match
  match=$(find "$DOCS_DIR" -name "tst-*${FILTER_FILE}*.md" | head -1)
  if [[ -z "$match" ]]; then
    echo -e "${RED}No test file matching '${FILTER_FILE}' found${RESET}"
    exit 1
  fi

  local name
  name=$(basename "$match" .md | sed 's/^tst-//')
  local title
  title=$(head -1 "$match" | sed 's/^# //')
  read -r checked unchecked <<< "$(count_checks "$match")"
  local total=$((checked + unchecked))
  local cat
  cat=$(categorize "$name")

  echo -e "${BOLD}${CYAN}$title${RESET}"
  echo -e "${DIM}Category: ${cat} | File: $(basename "$match")${RESET}"
  echo -e -n "Progress: "
  progress_bar "$checked" "$total"
  echo ""
  echo ""

  # Show per-section breakdown
  local current_section="" sec_checked=0 sec_unchecked=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^##[[:space:]] || "$line" =~ ^###[[:space:]] ]]; then
      if [[ -n "$current_section" ]]; then
        local sec_total=$((sec_checked + sec_unchecked))
        printf "  %-50s " "$current_section"
        progress_bar "$sec_checked" "$sec_total"
        echo ""
      fi
      current_section=$(echo "$line" | sed 's/^##* //')
      sec_checked=0
      sec_unchecked=0
    elif [[ "$line" =~ ^\s*-\ \[x\] ]]; then
      sec_checked=$((sec_checked + 1))
    elif [[ "$line" =~ ^\s*-\ \[\ \] ]]; then
      sec_unchecked=$((sec_unchecked + 1))
    fi
  done < "$match"
  # Print last section
  if [[ -n "$current_section" ]]; then
    local sec_total=$((sec_checked + sec_unchecked))
    printf "  %-50s " "$current_section"
    progress_bar "$sec_checked" "$sec_total"
    echo ""
  fi

  echo ""
  if [[ $unchecked -gt 0 ]]; then
    echo -e "${BOLD}Remaining items (${unchecked}):${RESET}"
    grep -n '^\s*- \[ \]' "$match" | while IFS= read -r line; do
      local linenum item
      linenum=$(echo "$line" | cut -d: -f1)
      item=$(echo "$line" | cut -d: -f2- | sed 's/^\s*- \[ \] //')
      echo -e "  ${DIM}L${linenum}${RESET}  ${RED}☐${RESET} $item"
    done
  else
    echo -e "${GREEN}✓ All items checked!${RESET}"
  fi
}

# ── Summary / Detail / Unchecked modes ──
run_summary() {
  local grand_checked=0 grand_unchecked=0 file_count=0
  declare -A cat_checked cat_unchecked cat_count

  echo -e "${BOLD}${CYAN}Blockbuilders Test Checklist Dashboard${RESET}"
  echo -e "${DIM}$(date '+%Y-%m-%d %H:%M')${RESET}"
  echo ""

  # Collect data
  local lines=()
  for file in "$DOCS_DIR"/tst-*.md; do
    local name checked unchecked total cat pct
    name=$(basename "$file" .md | sed 's/^tst-//')
    read -r checked unchecked <<< "$(count_checks "$file")"
    total=$((checked + unchecked))
    cat=$(categorize "$name")

    if [[ -n "$FILTER_CATEGORY" && "$cat" != "$FILTER_CATEGORY" ]]; then
      continue
    fi
    if [[ "$MODE" == "unchecked" && $unchecked -eq 0 ]]; then
      continue
    fi

    grand_checked=$((grand_checked + checked))
    grand_unchecked=$((grand_unchecked + unchecked))
    file_count=$((file_count + 1))

    cat_checked[$cat]=$(( ${cat_checked[$cat]:-0} + checked ))
    cat_unchecked[$cat]=$(( ${cat_unchecked[$cat]:-0} + unchecked ))
    cat_count[$cat]=$(( ${cat_count[$cat]:-0} + 1 ))

    if [[ $total -gt 0 ]]; then
      pct=$((checked * 100 / total))
    else
      pct=0
    fi
    lines+=("$pct|$name|$checked|$unchecked|$total|$cat")
  done

  # Category summary
  echo -e "${BOLD}By Category:${RESET}"
  for cat in epic canvas backtest strategy ui billing data user other; do
    local cc=${cat_checked[$cat]:-0}
    local cu=${cat_unchecked[$cat]:-0}
    local ct=$((cc + cu))
    local cn=${cat_count[$cat]:-0}
    if [[ $cn -eq 0 ]]; then continue; fi
    printf "  ${BOLD}%-12s${RESET} (%2d files) " "$cat" "$cn"
    progress_bar "$cc" "$ct"
    echo ""
  done

  echo ""
  local grand_total=$((grand_checked + grand_unchecked))
  echo -e -n "${BOLD}Overall: ${RESET}"
  progress_bar "$grand_checked" "$grand_total"
  echo -e "  ${DIM}(${file_count} files)${RESET}"
  echo ""

  if [[ "$MODE" == "detail" || "$MODE" == "unchecked" ]]; then
    echo -e "${DIM}──────────────────────────────────────────────────────────────────${RESET}"
    echo ""

    # Sort by completion percentage
    IFS=$'\n' sorted=($(printf '%s\n' "${lines[@]}" | sort -t'|' -k1 -n))
    unset IFS

    for entry in "${sorted[@]}"; do
      IFS='|' read -r pct name checked unchecked total cat <<< "$entry"
      local status_icon="${RED}☐${RESET}"
      if [[ $unchecked -eq 0 && $total -gt 0 ]]; then
        status_icon="${GREEN}✓${RESET}"
      elif [[ $pct -ge 50 ]]; then
        status_icon="${YELLOW}◐${RESET}"
      fi
      printf "  ${status_icon} %-55s ${DIM}[%s]${RESET} " "$name" "$cat"
      progress_bar "$checked" "$total"
      echo ""
    done
  else
    echo -e "${DIM}Use --detail for per-file breakdown, --file <name> for single file details${RESET}"
  fi
}

# ── Main dispatch ──
case "$MODE" in
  coverage)  run_coverage ;;
  json)      run_json ;;
  file)      run_file ;;
  *)         run_summary ;;
esac
