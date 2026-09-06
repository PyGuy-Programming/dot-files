#!/bin/bash
# Toggle blue-light filter (hyprshade OLED) - wlsunset
if pgrep -x wlsunset >/dev/null || pgrep -x gammastep >/dev/null; then
  pkill wlsunset 2>/dev/null; pkill gammastep 2>/dev/null
  notify-send -a sway "Blue light" "Off - 6500K"
else
  gammastep -O 3500 &
  notify-send -a sway "Blue light" "On - 3500K warm"
fi
