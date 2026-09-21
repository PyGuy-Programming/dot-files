#!/bin/bash
# Open quick-settings panel with slide-in animation (called by edge hover trigger)
if ! eww active-windows 2>/dev/null | grep -q qs-panel; then
  eww open qs-panel 2>/dev/null
  sleep 0.05
fi
eww update qs-reveal=true 2>/dev/null
