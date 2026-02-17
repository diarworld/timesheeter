#!/bin/bash
# Skill Validator
# Usage: ./validate.sh <path-to-skill>

set -e

SKILL_PATH="${1:-.}"
SKILL_MD="$SKILL_PATH/SKILL.md"

echo "=== Skill Validator ==="
echo "Validating: $SKILL_PATH"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

error() {
    echo -e "${RED}ERROR:${NC} $1"
    ((ERRORS++))
}

warn() {
    echo -e "${YELLOW}WARNING:${NC} $1"
    ((WARNINGS++))
}

pass() {
    echo -e "${GREEN}PASS:${NC} $1"
}

# Check SKILL.md exists
if [[ ! -f "$SKILL_MD" ]]; then
    error "SKILL.md not found at $SKILL_MD"
    exit 1
fi

pass "SKILL.md exists"

# Extract frontmatter (between first two --- lines)
FRONTMATTER=$(awk '/^---$/{if(++n==1)next; if(n==2)exit} n==1' "$SKILL_MD")

if [[ -z "$FRONTMATTER" ]]; then
    error "No YAML frontmatter found (must be between --- markers)"
    exit 1
fi

pass "Frontmatter found"

# Check name field - get only the value on the same line
NAME=$(echo "$FRONTMATTER" | grep -E "^name:" | head -1 | sed 's/^name:[[:space:]]*//' | tr -d '"' | tr -d "'" | tr -d ' ')

if [[ -z "$NAME" ]]; then
    error "Missing required 'name' field"
else
    # Validate name format
    if [[ ${#NAME} -gt 64 ]]; then
        error "Name exceeds 64 characters: ${#NAME} ('$NAME')"
    fi

    if [[ ! "$NAME" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]] && [[ ! "$NAME" =~ ^[a-z0-9]$ ]]; then
        error "Invalid name format. Must be lowercase, hyphens only, no consecutive hyphens: '$NAME'"
    fi

    if [[ "$NAME" =~ -- ]]; then
        error "Name contains consecutive hyphens"
    fi

    # Check name matches directory
    DIR_NAME=$(basename "$(cd "$SKILL_PATH" && pwd)")
    if [[ "$NAME" != "$DIR_NAME" ]]; then
        warn "Name '$NAME' doesn't match directory name '$DIR_NAME'"
    else
        pass "Name '$NAME' is valid and matches directory"
    fi
fi

# Check description field - handle multiline
DESC_LINE=$(echo "$FRONTMATTER" | grep -n "^description:" | head -1 | cut -d: -f1)

if [[ -z "$DESC_LINE" ]]; then
    error "Missing required 'description' field"
else
    # Get description value (may be on same line or multiline)
    DESC_SAME_LINE=$(echo "$FRONTMATTER" | sed -n "${DESC_LINE}p" | sed 's/^description:[[:space:]]*//')

    # If it starts with > or | it's multiline
    if [[ "$DESC_SAME_LINE" =~ ^[\>\|] ]] || [[ -z "$DESC_SAME_LINE" ]]; then
        # Get all indented lines after description:
        DESC=$(echo "$FRONTMATTER" | awk -v start="$DESC_LINE" '
            NR > start && /^[[:space:]]/ { gsub(/^[[:space:]]+/, ""); printf "%s ", $0 }
            NR > start && /^[a-z]/ { exit }
        ')
    else
        DESC="$DESC_SAME_LINE"
    fi

    DESC_LEN=${#DESC}
    if [[ $DESC_LEN -gt 1024 ]]; then
        error "Description exceeds 1024 characters: $DESC_LEN"
    elif [[ $DESC_LEN -lt 20 ]]; then
        warn "Description seems too short ($DESC_LEN chars). Consider adding more detail."
    else
        pass "Description present ($DESC_LEN chars)"
    fi

    # Check for "when to use" keywords
    if ! echo "$DESC" | grep -qi "use when\|when \|use for\|for "; then
        warn "Description may not explain when to use the skill"
    fi
fi

# Count body lines (after second ---)
BODY_LINES=$(awk '/^---$/{if(++n==2){found=1; next}} found' "$SKILL_MD" | wc -l | tr -d ' ')

if [[ $BODY_LINES -gt 500 ]]; then
    warn "SKILL.md body exceeds 500 lines ($BODY_LINES). Consider moving content to references/"
else
    pass "Body line count OK ($BODY_LINES lines)"
fi

# Check optional directories
if [[ -d "$SKILL_PATH/scripts" ]]; then
    pass "scripts/ directory found"
    # Check scripts are executable
    for script in "$SKILL_PATH/scripts"/*; do
        if [[ -f "$script" && ! -x "$script" ]]; then
            warn "Script not executable: $(basename "$script")"
        fi
    done
fi

if [[ -d "$SKILL_PATH/references" ]]; then
    pass "references/ directory found"
fi

if [[ -d "$SKILL_PATH/templates" ]]; then
    pass "templates/ directory found"
fi

if [[ -d "$SKILL_PATH/assets" ]]; then
    pass "assets/ directory found"
fi

# Check for common issues
if grep -q "TODO\|FIXME\|XXX" "$SKILL_MD" 2>/dev/null; then
    warn "SKILL.md contains TODO/FIXME markers"
fi

# Check for unfilled template placeholders (but not in code blocks)
if grep -v '```' "$SKILL_MD" | grep -q "{{[A-Z_]*}}" 2>/dev/null; then
    warn "SKILL.md contains template placeholders ({{...}})"
fi

echo ""
echo "=== Summary ==="
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [[ $ERRORS -gt 0 ]]; then
    echo -e "\n${RED}Validation FAILED${NC}"
    exit 1
else
    echo -e "\n${GREEN}Validation PASSED${NC}"
    exit 0
fi
