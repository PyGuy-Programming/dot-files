#!/bin/bash
# Returns brightness icon based on level
max=$(brightnessctl max 2>/dev/null || echo 7500)
cur=$(brightnessctl get 2>/dev/null || echo 0)
pct=$(( cur * 100 / max ))
if   [ "$pct" -lt 25 ]; then printf "󰃞"
elif [ "$pct" -lt 50 ]; then printf "󰃟"
elif [ "$pct" -lt 75 ]; then printf "󰃠"
else                          printf "󰃠"
fi
