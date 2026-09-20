#!/bin/bash
# Toggle Bluetooth on/off
state=$(bluetoothctl show 2>/dev/null | grep "Powered:" | awk '{print $2}')
if [ "$state" = "yes" ]; then
  bluetoothctl power off 2>/dev/null
else
  bluetoothctl power on 2>/dev/null
fi
