#!/bin/bash
# Import GitHub issues from CSV
# Usage: ./import-issues.sh [--dry-run]

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN MODE - No issues will be created ==="
fi

CSV_FILE="github-issues.csv"

# Check if gh is authenticated (skip for dry-run)
if [[ "$DRY_RUN" == "false" ]]; then
  if ! gh auth status &>/dev/null; then
    echo "Error: Please run 'gh auth login' first"
    exit 1
  fi
fi

echo "Reading issues from $CSV_FILE..."
echo ""

# Use Python to properly parse CSV with multiline fields
python3 << 'PYTHON_SCRIPT'
import csv
import subprocess
import sys
import os

dry_run = '--dry-run' in sys.argv or os.environ.get('DRY_RUN') == 'true'

with open('github-issues.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    issues = list(reader)

print(f"Found {len(issues)} issues in CSV")
print("")

for i, issue in enumerate(issues, 1):
    title = issue.get('title', '').strip()
    body = issue.get('body', '').strip()
    labels = issue.get('labels', '').strip()

    if not title:
        print(f"[{i}] Skipping - no title")
        continue

    print(f"[{i}/{len(issues)}] {title[:60]}...")

    if dry_run:
        print(f"  Labels: {labels}")
        print(f"  Body preview: {body[:80]}..." if len(body) > 80 else f"  Body: {body}")
        print("  [Would create issue]")
        print("")
        continue

    # Build gh command
    cmd = ['gh', 'issue', 'create', '--title', title, '--body', body]

    # Add labels if present
    if labels:
        for label in labels.split(','):
            label = label.strip()
            if label:
                cmd.extend(['--label', label])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  ✓ Created: {result.stdout.strip()}")
        else:
            print(f"  ✗ Error: {result.stderr.strip()}")
    except Exception as e:
        print(f"  ✗ Exception: {e}")

    print("")

print("Done!")
PYTHON_SCRIPT
