#!/bin/bash
# Close quick-settings panel with slide-out animation (called on hover-lost)
eww update qs-reveal=false 2>/dev/null
sleep 0.3
eww close qs-panel 2>/dev/null
