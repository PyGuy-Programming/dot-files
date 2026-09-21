import app from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll, timeout, type Timer } from "ags/time"
import { createState, type Accessor } from "gnim"
import SysTray from "./Tray"
import {
  EWW_SCRIPTS,
  SliderRow,
  brightness,
  brightnessIcon,
  nightlight,
  powerProfile,
  volume,
  volumeIcon,
} from "./QuickSettings"

const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
const EWW_SCRIPTS = "/home/luca/.config/eww/scripts"

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------
function sh(cmd: string): Promise<string> {
  return execAsync(["bash", "-c", cmd])
}

const time = createPoll("00:00", 1000, async () => {
  try {
    return await sh(`date "+%H:%M"`)
  } catch {
    return "00:00"
  }
})

const date = createPoll("01 Jan", 60000, async () => {
  try {
    return await sh(`date "+%a %d %b"`)
  } catch {
    return ""
  }
})

const music = createPoll("", 2000, async () => {
  try {
    return await sh(`playerctl metadata title 2>/dev/null | head -c 30`)
  } catch {
    return ""
  }
})

const artist = createPoll("", 2000, async () => {
  try {
    return await sh(`playerctl metadata artist 2>/dev/null | head -c 20`)
  } catch {
    return ""
  }
})

const musicStatus = createPoll("Stopped", 2000, async () => {
  try {
    return await sh(`playerctl status 2>/dev/null`)
  } catch {
    return "Stopped"
  }
})

const volume = createPoll(50, 1000, async (prev) => {
  try {
    const n = parseInt(await sh(`pamixer --get-volume 2>/dev/null`))
    return Number.isNaN(n) ? prev : Math.max(0, Math.min(100, n))
  } catch {
    return prev
  }
})

const volumeIcon = createPoll("󰕾", 1000, async (prev) => {
  try {
    return await execAsync(`${EWW_SCRIPTS}/volume-icon.sh`)
  } catch {
    return prev
  }
})

const netIcon = createPoll("󰤨", 5000, async (prev) => {
  try {
    return await execAsync(`${EWW_SCRIPTS}/wifi-icon.sh`)
  } catch {
    return prev
  }
})

const netStatus = createPoll("connected", 5000, async () => {
  try {
    return await sh(`nmcli -t -f NAME c show --active 2>/dev/null | head -1 | tr -d '\\n' | head -c 10`)
  } catch {
    return "disconnected"
  }
})

const netSpeed = createPoll("0D 0U", 2000, async () => {
  try {
    return await sh(
      `awk 'NR>2 {rx+=$2; tx+=$10} END {printf "%.1fD %.1fU", rx/1024/1024, tx/1024/1024}' /proc/net/dev 2>/dev/null | head -c 16`,
    )
  } catch {
    return "0D 0U"
  }
})

const battery = createPoll(100, 15000, async (prev) => {
  try {
    const n = parseInt(await sh(`cat /sys/class/power_supply/BAT0/capacity 2>/dev/null`))
    return Number.isNaN(n) ? prev : n
  } catch {
    return prev
  }
})

const batIcon: Accessor<string> = battery.as((v) =>
  v > 90 ? "󰂄" : v > 60 ? "󰂂" : v > 30 ? "󰂁" : v > 10 ? "󰂀" : "󰁺",
)

// reveal states (animated, in-process — no CLI roundtrips)
const [powerRevealed, setPowerRevealed] = createState(false)
const [dateRevealed, setDateRevealed] = createState(false)
const [netRevealed, setNetRevealed] = createState(false)

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function hover(onEnter: () => void, onLeave: () => void) {
  return (self: Gtk.Widget) => {
    const m = new Gtk.EventControllerMotion()
    m.connect("enter", onEnter)
    m.connect("leave", onLeave)
    self.add_controller(m)
  }
}

function onScroll(up: () => void, down: () => void) {
  return (self: Gtk.Widget) => {
    const s = new Gtk.EventControllerScroll({ flags: Gtk.EventControllerScrollFlags.VERTICAL })
    s.connect("scroll", (_c, _dx, dy) => {
      if (dy > 0) down()
      else if (dy < 0) up()
      return true
    })
    self.add_controller(s)
  }
}

function onRightClick(cb: () => void) {
  return (self: Gtk.Widget) => {
    const g = new Gtk.GestureClick()
    g.set_button(2)
    g.connect("pressed", () => cb())
    self.add_controller(g)
  }
}

const volUp = () =>
  execAsync(["bash", "-c", "pamixer --increase 2 2>/dev/null || wpctl set-volume @DEFAULT_AUDIO_SINK@ 2%+ 2>/dev/null"]).catch(
    () => {},
  )
const volDown = () =>
  execAsync(["bash", "-c", "pamixer --decrease 2 2>/dev/null || wpctl set-volume @DEFAULT_AUDIO_SINK@ 2%- 2>/dev/null"]).catch(
    () => {},
  )
const volMute = () =>
  execAsync(["bash", "-c", "pamixer --toggle-mute 2>/dev/null || wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle 2>/dev/null"]).catch(
    () => {},
  )

// ---------------------------------------------------------------------------
// modules
// ---------------------------------------------------------------------------
function Power() {
  return (
    <box
      class="power-box"
      spacing={6}
      $={hover(() => setPowerRevealed(true), () => setPowerRevealed(false))}
    >
      <button class="power-main" onClicked={() => execAsync("systemctl poweroff").catch(() => {})}>
        <label label="⏻" />
      </button>
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        transitionDuration={350}
        revealChild={powerRevealed}
      >
        <box spacing={1}>
          <button
            class="power-suspend"
            onClicked={() => execAsync("systemctl suspend").catch(() => {})}
          >
            <label label="󰤄" />
          </button>
          <button class="power-logout" onClicked={() => execAsync("swaymsg exit").catch(() => {})}>
            <label label="󰍃" />
          </button>
          <button
            class="power-reboot"
            onClicked={() => execAsync("systemctl reboot").catch(() => {})}
          >
            <label label="󰜉" />
          </button>
        </box>
      </revealer>
    </box>
  )
}

function Network() {
  return (
    <box
      class="network"
      spacing={4}
      $={hover(() => setNetRevealed(true), () => setNetRevealed(false))}
    >
      <label class="net-icon" label={netIcon} />
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        transitionDuration={300}
        revealChild={netRevealed}
      >
        <box spacing={6}>
          <label class="net-text" label={netStatus} />
          <label class="net-speed" label={netSpeed} />
        </box>
      </revealer>
    </box>
  )
}

function Volume() {
  return (
    <box
      class="volume"
      spacing={4}
      $={(self) => {
        onScroll(volUp, volDown)(self)
        onRightClick(volMute)(self)
      }}
    >
      <button class="vol-btn" onClicked={() => execAsync("pavucontrol").catch(() => {})}>
        <label class="vol-icon" label={volumeIcon} />
      </button>
      <label class="vol-text" label={volume.as((v) => `${v}%`)} />
    </box>
  )
}

function Battery() {
  return (
    <box class="battery" spacing={6}>
      <label class="bat-icon" label={batIcon} />
      <label class="bat-text" label={battery.as((v) => `${v}%`)} />
    </box>
  )
}

function Player() {
  const [showPlayer, setShowPlayer] = createState(false)
  const update = () => setShowPlayer(music.peek() !== "" && musicStatus.peek() === "Playing")
  music.subscribe(update)
  musicStatus.subscribe(update)
  return (
    <revealer
      transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
      transitionDuration={300}
      revealChild={showPlayer}
    >
      <box
        class="player"
        spacing={8}
        $={(self) => {
          const g = new Gtk.GestureClick()
          g.set_button(1)
          g.connect("pressed", () => execAsync("playerctl play-pause").catch(() => {}))
          self.add_controller(g)
        }}
      >
        <label class="music-icon" label="" />
        <label class="music-text" label={music} />
        <label class="artist-text" label={artist} />
      </box>
    </revealer>
  )
}

function Clock() {
  return (
    <box
      class="clock"
      halign={Gtk.Align.CENTER}
      valign={Gtk.Align.CENTER}
      $={hover(() => setDateRevealed(true), () => setDateRevealed(false))}
    >
      <revealer
        transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
        transitionDuration={250}
        revealChild={dateRevealed}
      >
        <label class="date" label={date.as((d) => `${d} `)} />
      </revealer>
      <label class="time" label={time} />
    </box>
  )
}

// ---------------------------------------------------------------------------
// logo dropdown menu (night light, brightness, volume, power modes)
// ---------------------------------------------------------------------------
const [logoMenuVisible, setLogoMenuVisible] = createState(false)
const [logoMenuRevealed, setLogoMenuRevealed] = createState(false)
let logoGen = 0
let logoCloseTimer: Timer | null = null

function showLogoMenu() {
  logoCloseTimer?.cancel()
  logoCloseTimer = null
  const g = ++logoGen
  if (!logoMenuVisible.peek()) {
    setLogoMenuVisible(true)
    timeout(50, () => {
      if (g === logoGen) setLogoMenuRevealed(true)
    })
  } else {
    setLogoMenuRevealed(true)
  }
}

function hideLogoMenuSoon() {
  logoCloseTimer?.cancel()
  const g = logoGen
  logoCloseTimer = timeout(400, () => {
    setLogoMenuRevealed(false)
    timeout(250, () => {
      if (g === logoGen) setLogoMenuVisible(false)
    })
  })
}

export function LogoMenu() {
  return (
    <window
      name="logo-menu"
      namespace="quick-settings"
      visible={logoMenuVisible}
      anchor={TOP | LEFT}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.NONE}
      marginTop={56}
      marginLeft={10}
      application={app}
    >
      <box $={hover(showLogoMenu, hideLogoMenuSoon)}>
        <revealer
          transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
          transitionDuration={250}
          revealChild={logoMenuRevealed}
        >
          <box
            class="qs-panel logo-menu"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={6}
            valign={Gtk.Align.START}
          >
            <button
              class={nightlight.as((s) => `qs-pill${s.trim() === "on" ? " active" : ""}`)}
              onClicked={() => execAsync(`${EWW_SCRIPTS}/nightlight-toggle.sh`).catch(() => {})}
            >
              <label label="󰖨  Night Light" />
            </button>
            <SliderRow
              icon={brightnessIcon}
              value={brightness}
              onSet={(v) => execAsync(["brightnessctl", "set", `${v}%`]).catch(() => {})}
            />
            <SliderRow
              icon={volumeIcon}
              value={volume}
              onSet={(v) => execAsync(["pamixer", "--set-volume", `${v}`]).catch(() => {})}
            />
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

// ---------------------------------------------------------------------------
// bar window
// ---------------------------------------------------------------------------
export function Bar() {
  return (
    <window
      name="bar"
      namespace="bar"
      visible
      anchor={TOP | LEFT | RIGHT}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      layer={Astal.Layer.TOP}
      keymode={Astal.Keymode.NONE}
      marginTop={8}
      marginLeft={10}
      marginRight={10}
      application={app}
    >
      <centerbox class="bar" orientation={Gtk.Orientation.HORIZONTAL}>
        <box $type="start" spacing={10} halign={Gtk.Align.START}>
          <box $={hover(showLogoMenu, hideLogoMenuSoon)}>
            <label class="distro" label="" />
          </box>
          <Player />
        </box>
        <Clock $type="center" />
        <box $type="end" spacing={12} halign={Gtk.Align.END}>
          <SysTray />
          <Volume />
          <Network />
          <Battery />
          <Power />
        </box>
      </centerbox>
    </window>
  )
}
