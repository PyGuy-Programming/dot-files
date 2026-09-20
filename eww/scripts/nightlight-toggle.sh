#!/bin/bash
# Toggle night light (gammastep) on/off
if pgrep -x gammastep >/dev/null 2>&1; then
  pkill gammastep 2>/dev/null
else
  gammastep -m wayland &>/dev/null &
fi
