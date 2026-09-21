import app from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll, timeout } from "ags/time"
import { createState, type Accessor } from "gnim"

const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor
export const EWW_SCRIPTS = "/home/luca/.config/eww/scripts"

// ---------------------------------------------------------------------------
// open/close with slide animation
// ---------------------------------------------------------------------------
const [qsVisible, setQsVisible] = createState(false)
const [qsRevealed, setQsRevealed] = createState(false)
let gen = 0

export function qsOpen() {
  if (qsVisible.peek()) return
  const g = ++gen
  setQsVisible(true)
  timeout(50, () => {
    if (g === gen) setQsRevealed(true)
  })
}

export function qsClose() {
  if (!qsVisible.peek()) return
  const g = ++gen
  setQsRevealed(false)
  timeout(300, () => {
    if (g === gen) setQsVisible(false)
  })
}

export function qsToggle() {
  if (qsVisible.peek()) qsClose()
  else qsOpen()
}

// ---------------------------------------------------------------------------
// polled state (same sources as the old eww panel)
// ---------------------------------------------------------------------------
function sh(cmd: string): Promise<string> {
  return execAsync(["bash", "-c", cmd])
}

export const brightness = createPoll(50, 2000, async (prev) => {
  try {
    const n = parseInt(
      await sh(`brightnessctl get 2>/dev/null | awk '{max=7500; pct=$1*100/max; print int(pct)}'`),
    )
    return Number.isNaN(n) ? prev : Math.max(0, Math.min(100, n))
  } catch {
    return prev
  }
})

export const volume = createPoll(50, 1000, async (prev) => {
  try {
    const n = parseInt(await sh(`pamixer --get-volume 2>/dev/null`))
    return Number.isNaN(n) ? prev : Math.max(0, Math.min(100, n))
  } catch {
    return prev
  }
})

export const brightnessIcon = createPoll("󰃠", 2000, async (prev) => {
  try {
    return await execAsync(`${EWW_SCRIPTS}/brightness-icon.sh`)
  } catch {
    return prev
  }
})

export const volumeIcon = createPoll("󰕾", 1000, async (prev) => {
  try {
    return await execAsync(`${EWW_SCRIPTS}/volume-icon.sh`)
  } catch {
    return prev
  }
})

const kbd = createPoll("0", 2000, async (prev) => {
  try {
    return await sh(`cat /sys/class/leds/dell::kbd_backlight/brightness 2>/dev/null`)
  } catch {
    return prev
  }
})

const wifi = createPoll("enabled", 5000, async (prev) => {
  try {
    return await sh(`nmcli radio wifi 2>/dev/null`)
  } catch {
    return prev
  }
})

const bt = createPoll("no", 5000, async (prev) => {
  try {
    return await sh(`bluetoothctl show 2>/dev/null | grep "Powered:" | awk '{print $2}'`)
  } catch {
    return prev
  }
})

export const nightlight = createPoll("off", 5000, async (prev) => {
  try {
    await sh(`pgrep -f gammastep`)
    return "on"
  } catch {
    return "off"
  }
})

const dnd = createPoll("off", 5000, async (prev) => {
  try {
    const out = await sh(`swaync-client -D 2>/dev/null`)
    return out.includes("true") ? "on" : "off"
  } catch {
    return prev
  }
})

export const powerProfile = createPoll("balanced", 10000, async (prev) => {
  try {
    const out = await sh(`system76-power profile 2>/dev/null | grep -oP '^Power Profile: \\K\\w+'`)
    return out.trim() === "" ? prev : out.trim().toLowerCase()
  } catch {
    return prev
  }
})

// ---------------------------------------------------------------------------
// hover helper (enter/leave via EventControllerMotion)
// ---------------------------------------------------------------------------
function hover(onEnter: () => void, onLeave: () => void) {
  return (self: Gtk.Widget) => {
    const m = new Gtk.EventControllerMotion()
    m.connect("enter", onEnter)
    m.connect("leave", onLeave)
    self.add_controller(m)
  }
}

// ---------------------------------------------------------------------------
// widgets
// ---------------------------------------------------------------------------
export function SliderRow({
  icon,
  value,
  onSet,
}: {
  icon: Accessor<string>
  value: Accessor<number>
  onSet: (v: number) => void
}) {
  return (
    <box class="qs-slider" spacing={6}>
      <label class="qs-slider-icon" label={icon} />
      <slider
        class="qs-scale"
        hexpand
        min={0}
        max={100}
        step={1}
        value={value}
        onChangeValue={(self) => onSet(Math.round(self.value))}
      />
      <label class="qs-slider-value" label={value.as((v) => `${v}%`)} />
    </box>
  )
}

export function Pill({
  label,
  active,
  onClicked,
}: {
  label: string
  active: Accessor<string>
  onClicked: () => void
}) {
  return (
    <button class={active.as((a) => `qs-pill${a.trim() === "on" ? " active" : ""}`)} onClicked={onClicked}>
      <label label={label} />
    </button>
  )
}

export function QuickSettingsPanel() {
  return (
    <window
      name="quick-settings"
      namespace="quick-settings"
      visible={qsVisible}
      anchor={TOP | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.NONE}
      marginTop={52}
      application={app}
    >
      <box class="qs-container" $={hover(() => {}, qsClose)}>
        <revealer
          transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
          transitionDuration={250}
          revealChild={qsRevealed}
        >
          <box
            class="qs-panel"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={6}
            valign={Gtk.Align.START}
          >
            <SliderRow
              icon={brightnessIcon}
              value={brightness}
              onSet={(v) =>
                execAsync(["brightnessctl", "set", `${v}%`]).catch(() => {})
              }
            />
            <SliderRow
              icon={volumeIcon}
              value={volume}
              onSet={(v) =>
                execAsync(["pamixer", "--set-volume", `${v}`]).catch(() => {})
              }
            />
            <box class="qs-row" spacing={8}>
              <label class="qs-row-label" label="  Keyboard" />
              <box spacing={4}>
                {[
                  ["Off", "0"],
                  ["50%", "1"],
                  ["100%", "2"],
                ].map(([text, level]) => (
                  <button
                    class={kbd.as((v) => `qs-pill${v.trim() === level ? " active" : ""}`)}
                    onClicked={() =>
                      execAsync([
                        "brightnessctl",
                        "--device",
                        "dell::kbd_backlight",
                        "set",
                        level,
                      ]).catch(() => {})
                    }
                  >
                    <label label={text} />
                  </button>
                ))}
              </box>
            </box>
            <box class="qs-separator" />
            <box class="qs-row" spacing={8}>
              <button
                class={wifi.as((s) => `qs-pill${s.trim() === "enabled" ? " active" : ""}`)}
                onClicked={() => execAsync(`${EWW_SCRIPTS}/wifi-toggle.sh`).catch(() => {})}
              >
                <label label="󰤨  WiFi" />
              </button>
              <button
                class={bt.as((s) => `qs-pill${s.trim() === "yes" ? " active" : ""}`)}
                onClicked={() => execAsync(`${EWW_SCRIPTS}/bt-toggle.sh`).catch(() => {})}
              >
                <label label="󰂯  Bluetooth" />
              </button>
            </box>
            <box class="qs-row" spacing={8}>
              <Pill
                label="󰖨  Night Light"
                active={nightlight}
                onClicked={() => execAsync(`${EWW_SCRIPTS}/nightlight-toggle.sh`).catch(() => {})}
              />
              <Pill
                label="󰂞  DND"
                active={dnd}
                onClicked={() => execAsync(["swaync-client", "-d"]).catch(() => {})}
              />
            </box>
            <box class="qs-separator" />
            <box class="qs-row" spacing={6}>
              <label class="qs-row-label" label="⏻  Power" />
              <box spacing={4}>
                {[
                  ["󰓅", "performance"],
                  ["󰾡", "balanced"],
                  ["󰍹", "battery"],
                ].map(([icon, profile]) => (
                  <button
                    class={powerProfile.as(
                      (p) => `qs-power-pill${p.trim() === profile ? " active" : ""}`,
                    )}
                    onClicked={() => execAsync(["system76-power", "profile", profile]).catch(() => {})}
                  >
                    <label label={icon} />
                  </button>
                ))}
              </box>
            </box>
          </box>
        </revealer>
      </box>
    </window>
  )
}

export function QuickSettingsTrigger() {
  return (
    <window
      name="qs-trigger"
      namespace="qs-trigger"
      visible
      anchor={TOP | RIGHT | BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.NONE}
      application={app}
    >
      <box class="qs-trigger" $={hover(qsOpen, () => {})} />
    </window>
  )
}
