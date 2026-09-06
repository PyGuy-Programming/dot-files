#!/bin/bash
# Revert display manager from sddm back to cosmic-greeter (Pop!_OS default)
# Use if sddm causes issues - you had bad experiences before
set -e
PASSWORD="simba0207"
echo "Reverting to cosmic-greeter..."

echo "$PASSWORD" | sudo -S systemctl disable sddm.service 2>&1 | head -n 5
echo "$PASSWORD" | sudo -S systemctl enable cosmic-greeter.service 2>&1 | head -n 5
echo "$PASSWORD" | sudo -S bash -c 'echo "/usr/bin/cosmic-greeter" > /etc/X11/default-display-manager'
echo "$PASSWORD" | sudo -S sed -i 's/^Current=.*/Current=catppuccin-macchiato-dark/' /etc/sddm.conf 2>/dev/null || true

echo "Current:"
cat /etc/X11/default-display-manager
systemctl is-enabled cosmic-greeter sddm 2>&1 | head -n 5
ls -l /etc/systemd/system/display-manager.service 2>&1 | head -n 5
echo "Done - reboot with 'sudo reboot' to get cosmic-greeter back"
echo "If sddm still shows, run: sudo dpkg-reconfigure cosmic-greeter"
