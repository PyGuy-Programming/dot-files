#!/bin/bash
# Cycle power profile: performance -> balanced -> battery -> performance
current=$(system76-power profile 2>/dev/null | grep -oP '(?<=\*\s)\w+' || echo "balanced")
case "$current" in
  performance) system76-power balanced 2>/dev/null ;;
  balanced)    system76-power battery 2>/dev/null ;;
  battery)     system76-power performance 2>/dev/null ;;
  *)           system76-power balanced 2>/dev/null ;;
esac
