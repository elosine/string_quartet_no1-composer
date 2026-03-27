#!/bin/bash
# create_new_piece.sh — Create a new piece repository from SQ1 infrastructure
#
# Usage:
#   ./scripts/create_new_piece.sh <new-piece-name> [target-directory]
#
# Example:
#   ./scripts/create_new_piece.sh string_quartet_no2 ~/GitHub/
#   → creates ~/GitHub/string_quartet_no2/
#
# What it does:
#   1. Clones this repository to a new directory
#   2. Removes all SQ1-specific files (scores, audio, MIDI, Reaper, etc.)
#   3. Cleans generated LilyPond outputs (keeps .ly templates and tooling)
#   4. Creates a fresh scores/ directory
#   5. Resets git history (fresh start)
#   6. Prints a summary of what to customize next

set -e

# --- Arguments ---
PIECE_NAME="${1:?Usage: create_new_piece.sh <new-piece-name> [target-directory]}"
TARGET_DIR="${2:-.}"
DEST="${TARGET_DIR}/${PIECE_NAME}"

if [ -d "$DEST" ]; then
    echo "ERROR: Directory already exists: $DEST"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== Creating new piece: ${PIECE_NAME} ==="
echo "    Source: ${SCRIPT_DIR}"
echo "    Destination: ${DEST}"
echo ""

# --- Step 1: Clone ---
echo "[1/6] Cloning repository..."
git clone "$SCRIPT_DIR" "$DEST"
cd "$DEST"

# --- Step 2: Remove piece-specific directories ---
echo "[2/6] Removing SQ1-specific directories..."

DIRS_TO_REMOVE=(
    "scores"
    "scoresBackUp"
    "public/audio_files"
    "midi files"
    "midi_exports"
    "Reaper"
    "Diagonistic"
    "JY_oldCode"
    "old_archived"
    "misc"
    "motive_library"
    "ai files"
    "fonts"
    "svg_compositions"
    "data"
    "lilypond_code/tempo_variants"
    "builds"
)

for dir in "${DIRS_TO_REMOVE[@]}"; do
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo "    Removed: $dir/"
    fi
done

# Also remove StrQtrNo1-AudioRender-* directories
for dir in StrQtrNo1-AudioRender-*; do
    if [ -d "$dir" ]; then
        rm -rf "$dir"
        echo "    Removed: $dir/"
    fi
done

# --- Step 3: Clean generated LilyPond outputs (keep .ly and tooling) ---
echo "[3/6] Cleaning generated LilyPond outputs..."
CLEANED=0
for ext in mid midi svg pdf; do
    while IFS= read -r -d '' file; do
        rm -f "$file"
        CLEANED=$((CLEANED + 1))
    done < <(find lilypond_code -maxdepth 1 -name "*.${ext}" -print0 2>/dev/null)
done
echo "    Removed ${CLEANED} generated files from lilypond_code/"

# Remove event logs
find lilypond_code -maxdepth 1 -name "*-midi-log.json" -delete 2>/dev/null || true
find lilypond_code -maxdepth 1 -name "*_cc.json" -delete 2>/dev/null || true

# --- Step 4: Create fresh directories ---
echo "[4/6] Creating fresh directories..."
mkdir -p scores
mkdir -p builds/performance
echo "    Created: scores/, builds/performance/"

# --- Step 5: Reset git history ---
echo "[5/6] Resetting git history..."
rm -rf .git
git init
git add -A
git commit -m "Initial: ${PIECE_NAME} — from SQ1 infrastructure"
echo "    Fresh git history initialized."

# --- Step 6: Summary ---
echo ""
echo "=== Done! ==="
echo ""
echo "New piece repository created at: ${DEST}"
echo ""
echo "Next steps:"
echo "  1. Update README.md with new piece title and description"
echo "  2. Update landing/index.html — change title, instruments, description"
echo "  3. Update homepage/index.html — add or replace the piece card"
echo "  4. If different instrumentation:"
echo "     - Update track count references in public/index.html"
echo "     - Update MIDI channel mapping"
echo "     - Update performance_server.js if needed"
echo "  5. Start composing: node server.js  (Workshop on :5000)"
echo "  6. Create a GitHub repo and push:"
echo "     git remote add origin https://github.com/elosine/${PIECE_NAME}.git"
echo "     git push -u origin main"
echo ""
echo "Documentation: docs/PROJECT_JOURNAL.md (Part IV: New Piece Guide)"
echo ""
