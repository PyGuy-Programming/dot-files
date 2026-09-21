#!/bin/bash
# Toggle quick-settings panel with slide animation (Super+. keybind)
if eww active-windows 2>/dev/null | grep -q qs-panel; then
  eww update qs-reveal=false 2>/dev/null
  sleep 0.3
  eww close qs-panel 2>/dev/null
else
  eww open qs-panel 2>/dev/null
  sleep 0.05
  eww update qs-reveal=true 2>/dev/null
fi
