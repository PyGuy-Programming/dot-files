#!/bin/bash
# Toggle quick-settings panel
current=$(eww get qs-reveal 2>/dev/null)
if [ "$current" = "true" ]; then
  eww update qs-reveal=false
else
  eww update qs-reveal=true
fi
