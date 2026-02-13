#!/usr/bin/env bash
#
# archive-stale-branches.sh
#
# Archives (tags + deletes) remote branches that haven't had a commit
# in the last N hours. Defaults to 24 hours.
#
# Usage:
#   ./scripts/archive-stale-branches.sh            # archive branches older than 24h
#   ./scripts/archive-stale-branches.sh 48          # archive branches older than 48h
#   ./scripts/archive-stale-branches.sh --dry-run   # preview what would be archived
#   ./scripts/archive-stale-branches.sh 48 --dry-run
#
# To restore an archived branch:
#   git checkout -b <branch-name> archive/<branch-name>

set -euo pipefail

HOURS="${1:-24}"
DRY_RUN=false

for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN=true
  fi
done

# Strip --dry-run from HOURS if it was the first arg
if [[ "$HOURS" == "--dry-run" ]]; then
  HOURS=24
fi

CUTOFF_EPOCH=$(date -u -d "$HOURS hours ago" +%s 2>/dev/null || date -u -v-"${HOURS}"H +%s)

echo "Archiving remote branches with no commits in the last ${HOURS} hours"
echo "Cutoff: $(date -u -d "@$CUTOFF_EPOCH" '+%Y-%m-%d %H:%M:%S UTC' 2>/dev/null || date -u -r "$CUTOFF_EPOCH" '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Fetch latest remote state
git fetch --prune origin

# Protected branches that should never be archived
PROTECTED_BRANCHES="main|master|develop|release"

ARCHIVED=0
SKIPPED=0

while IFS= read -r line; do
  branch=$(echo "$line" | awk '{print $1}' | sed 's|^origin/||')
  commit_date=$(echo "$line" | awk '{print $2, $3, $4}')

  # Skip HEAD pointer
  [[ "$branch" == "HEAD" ]] && continue

  # Skip protected branches
  if echo "$branch" | grep -qE "^($PROTECTED_BRANCHES)$"; then
    echo "SKIP (protected): $branch"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Convert commit date to epoch
  branch_epoch=$(date -u -d "$commit_date" +%s 2>/dev/null || date -u -j -f "%Y-%m-%d %H:%M:%S %z" "$commit_date" +%s)

  if [[ "$branch_epoch" -lt "$CUTOFF_EPOCH" ]]; then
    tag_name="archive/${branch}"

    if $DRY_RUN; then
      echo "WOULD ARCHIVE: $branch (last commit: $commit_date)"
    else
      echo "ARCHIVING: $branch (last commit: $commit_date)"

      # Create local tag preserving the branch tip
      git tag "$tag_name" "origin/$branch" 2>/dev/null || echo "  Tag $tag_name already exists, skipping tag creation"

      # Push the tag to remote
      git push origin "$tag_name" 2>/dev/null || echo "  Warning: could not push tag $tag_name"

      # Delete the remote branch
      git push origin --delete "$branch" 2>/dev/null || echo "  Warning: could not delete remote branch $branch"

      # Clean up local tracking branch if it exists
      git branch -d "$branch" 2>/dev/null || true
    fi

    ARCHIVED=$((ARCHIVED + 1))
  else
    echo "KEEP: $branch (last commit: $commit_date)"
    SKIPPED=$((SKIPPED + 1))
  fi
done < <(git branch -r --format='%(refname:short) %(committerdate:iso8601)' | grep -v HEAD)

echo ""
if $DRY_RUN; then
  echo "Dry run complete. Would archive $ARCHIVED branches, keeping $SKIPPED."
else
  echo "Done. Archived $ARCHIVED branches, kept $SKIPPED."
fi
echo ""
echo "To restore an archived branch:"
echo "  git fetch origin 'refs/tags/archive/*:refs/tags/archive/*'"
echo "  git checkout -b <branch-name> archive/<branch-name>"
