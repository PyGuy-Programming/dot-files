#!/bin/bash
# Toggle night light (gammastep) on/off
if pgrep -f gammastep >/dev/null 2>&1; then
  pkill gammastep 2>/dev/null
else
  gammastep -m wayland -l 48:11 -t 6500:3500 &>/dev/null &
fi
