#!/bin/bash
# Win+p - wofi select service/process to kill with sudo (INSECURE - hardcoded password)
# WARNING: echo "password" | sudo -S is insecure (visible in process list, history, script)
# Better: sudo visudo -> add: luca ALL=(ALL) NOPASSWD: /usr/bin/pkill
# Or use pkexec: pkexec pkill ...

PASSWORD="simba0207"

# List ALL services + ALL processes for selection (not just running)
SERVICES=$( (systemctl list-units --type=service --all --no-legend --no-pager 2>/dev/null | awk '{print $1}'; systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}'; ps -eo comm --no-headers) | sort -u | grep -v "^\s*$" | grep -v "^$" )

# wofi dmenu selection (uses style from ~/.config/wofi/config -> menu.css)
SELECTED=$(echo "$SERVICES" | wofi --show dmenu --prompt "Kill service:" --insensitive --allow-markup)

if [ -z "$SELECTED" ]; then
  exit 0
fi

# Confirm
CONFIRM=$(echo -e "No\nYes" | wofi --show dmenu --prompt "Kill $SELECTED? (sudo pkill)")
if [ "$CONFIRM" != "Yes" ]; then
  notify-send -a sway "Cancelled" "$SELECTED not killed"
  exit 0
fi

# Try pkill as systemd service stop first, then process kill
if systemctl list-units --type=service --all | grep -q "^$SELECTED"; then
  # systemd service - try systemctl stop
  echo "$PASSWORD" | sudo -S systemctl stop "$SELECTED" 2>&1 | head
  if [ ${PIPESTATUS[1]} -eq 0 ]; then
    notify-send -a sway "Service stopped" "$SELECTED"
    exit 0
  fi
fi

# Fallback: pkill process (as you requested: echo "my_password" | sudo -S pkill)
# Using -f to match full command, change to -x for exact comm
echo "$PASSWORD" | sudo -S pkill -f "$SELECTED"
if [ $? -eq 0 ]; then
  notify-send -a sway "Killed" "$SELECTED"
else
  # Try without sudo (own user processes)
  pkill -f "$SELECTED" && notify-send -a sway "Killed (user)" "$SELECTED" || notify-send -a sway "Failed" "Could not kill $SELECTED"
fi
