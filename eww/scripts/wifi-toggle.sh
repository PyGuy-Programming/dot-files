#!/bin/bash
# Toggle WiFi on/off
state=$(nmcli radio wifi 2>/dev/null)
if [ "$state" = "enabled" ]; then
  nmcli radio wifi off 2>/dev/null
else
  nmcli radio wifi on 2>/dev/null
fi
