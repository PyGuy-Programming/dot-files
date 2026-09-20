#!/bin/bash
# Returns "true" if no windows are open on any workspace (desktop-only mode)
ws=$(swaymsg -t get_workspaces 2>/dev/null)
count=$(python3 -c "
import sys, json
ws = json.load(sys.stdin)
total = sum(len(w.get('nodes', [])) + len(w.get('floating_nodes', [])) for w in ws)
print(total)
" <<< "$ws" 2>/dev/null)
[ "$count" = "0" ] && echo "true" || echo "false"
