import app from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import Gio from "gi://Gio?version=2.0"
import { timeout, type Timer } from "ags/time"
import { For, createState } from "gnim"
import AstalTray from "gi://AstalTray?version=0.1"

type TrayItem = InstanceType<typeof AstalTray.TrayItem>

const { TOP, RIGHT } = Astal.WindowAnchor

const tray = AstalTray.Tray.get_default()
const [items, setItems] = createState<Array<TrayItem>>([])

function sync() {
  setItems([...tray.items] as Array<TrayItem>)
}

tray.connect("item_added", sync)
tray.connect("item_removed", sync)
sync()

function hover(onEnter: () => void, onLeave: () => void) {
  return (self: Gtk.Widget) => {
    const m = new Gtk.EventControllerMotion()
    m.connect("enter", onEnter)
    m.connect("leave", onLeave)
    self.add_controller(m)
  }
}

type MenuRow = { label: string; action: string; enabled: boolean }

const [trayMenuVisible, setTrayMenuVisible] = createState(false)
const [trayMenuRevealed, setTrayMenuRevealed] = createState(false)
const [trayMenuRows, setTrayMenuRows] = createState<Array<MenuRow>>([])
let trayMenuItem: TrayItem | null = null
let trayMenuGen = 0
let trayMenuCloseTimer: Timer | null = null

function snapshotMenu(item: TrayItem): Array<MenuRow> {
  const rows: Array<MenuRow> = []
  const model = item.menu_model
  if (!model) return rows
  const strT = new GLib.VariantType("s")
  const walk = (m: Gio.MenuModel) => {
    for (let i = 0; i < m.get_n_items(); i++) {
      let label = ""
      let action = ""
      try {
        const it = m.iterate_item_attributes(i)
        try {
          while (it.next()) {
            const n = it.get_name()
            if (n !== "label" && n !== "action") continue
            const v = it.get_value()
            if (v && v.is_of_type(strT)) {
              if (n === "label") label = v.unpack<string>()
              else action = v.unpack<string>()
            }
          }
        } finally {
          try {
            it.free()
          } catch {
            /* ignore */
          }
        }
      } catch {
        continue
      }
      if (label && action) {
        let enabled = true
        const dot = action.indexOf(".")
        try {
          if (dot > 0) enabled = item.action_group?.get_action_enabled(action.slice(dot + 1)) ?? true
        } catch {
          enabled = true
        }
        rows.push({ label, action, enabled })
      }
      for (const link of ["section", "submenu"]) {
        const sub = m.get_item_link(i, link)
        if (sub) walk(sub)
      }
    }
  }
  walk(model)
  return rows
}

export function openTrayMenu(item: TrayItem) {
  try {
    item.about_to_show()
  } catch {
    /* ignore */
  }
  setTrayMenuRows(snapshotMenu(item))
  trayMenuItem = item
  trayMenuCloseTimer?.cancel()
  trayMenuCloseTimer = null
  const g = ++trayMenuGen
  if (!trayMenuVisible.peek()) {
    setTrayMenuVisible(true)
    timeout(50, () => {
      if (g === trayMenuGen) setTrayMenuRevealed(true)
    })
  } else {
    setTrayMenuRevealed(true)
  }
}

export function closeTrayMenuSoon() {
  trayMenuCloseTimer?.cancel()
  const g = trayMenuGen
  trayMenuCloseTimer = timeout(300, () => {
    setTrayMenuRevealed(false)
    timeout(250, () => {
      if (g === trayMenuGen) setTrayMenuVisible(false)
    })
  })
}

function clickTrayMenuRow(action: string) {
  const dot = action.indexOf(".")
  try {
    if (dot > 0) trayMenuItem?.action_group?.activate_action(action.slice(dot + 1), null)
  } catch (e) {
    console.error(`tray: row dispatch failed: ${e}`)
  }
  const g = ++trayMenuGen
  trayMenuCloseTimer?.cancel()
  trayMenuCloseTimer = null
  setTrayMenuRevealed(false)
  timeout(200, () => {
    if (g === trayMenuGen) setTrayMenuVisible(false)
  })
}

export function TrayMenuWindow() {
  return (
    <window
      name="tray-menu"
      namespace="logo-menu"
      visible={trayMenuVisible}
      anchor={TOP | RIGHT}
      exclusivity={Astal.Exclusivity.IGNORE}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.NONE}
      marginTop={56}
      marginRight={200}
      application={app}
    >
      <box $={hover(openTrayMenuKeepAlive, closeTrayMenuSoon)}>
        <revealer
          transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
          transitionDuration={250}
          revealChild={trayMenuRevealed}
        >
          <box
            class="qs-panel tray-menu"
            orientation={Gtk.Orientation.VERTICAL}
            spacing={4}
            valign={Gtk.Align.START}
          >
            <scrolledwindow maxContentHeight={400} propagateNaturalHeight={true}>
              <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                <For each={trayMenuRows} id={(row) => row.action}>
                  {(row) => (
                    <button
                      class="tray-menu-item"
                      sensitive={row.enabled}
                      onClicked={() => clickTrayMenuRow(row.action)}
                    >
                      <label label={row.label} halign={Gtk.Align.START} />
                    </button>
                  )}
                </For>
              </box>
            </scrolledwindow>
          </box>
        </revealer>
      </box>
    </window>
  )
}

function openTrayMenuKeepAlive() {
  trayMenuCloseTimer?.cancel()
  trayMenuCloseTimer = null
  setTrayMenuRevealed(true)
}

export function trayMenuTest(): string {
  const list = items.peek()
  if (list.length === 0) return "(tray empty)"
  openTrayMenu(list[0])
  return `opened menu for ${list[0].item_id}`
}

export function trayActionTest(): string {
  const list = items.peek()
  if (list.length === 0) return "(tray empty)"
  const item = list[0]
  const model = item.menu_model
  if (!model) return "no menu model"
  const out: Array<string> = []
  const strT = new GLib.VariantType("s")
  const dump = (m: Gio.MenuModel, prefix: string) => {
    for (let i = 0; i < m.get_n_items(); i++) {
      const label = m.get_item_attribute_value(i, "label", strT)?.unpack<string>()
      const action = m.get_item_attribute_value(i, "action", strT)?.unpack<string>()
      let enabled = ""
      if (action) {
        const dot = action.indexOf(".")
        const ag = item.action_group
        if (ag && dot > 0) {
          try {
            enabled = ` enabled=${ag.get_action_enabled(action.slice(dot + 1))}`
          } catch {
            enabled = " enabled=ERR"
          }
        }
      }
      out.push(`${prefix}[${i}] label=${label} action=${action}${enabled}`)
      for (const link of ["section", "submenu"]) {
        const sub = m.get_item_link(i, link)
        if (sub) dump(sub, `${prefix}${link}>`)
      }
    }
  }
  dump(model, "")
  // dispatch Settings to prove end-to-end action delivery
  try {
    item.action_group?.activate_action("id-4", null)
    out.push("dispatched id-4 (Settings)")
  } catch (e) {
    out.push(`dispatch failed: ${e}`)
  }
  return out.join("\n") || "(empty menu)"
}

function TrayButton({ item }: { item: TrayItem }) {
  const [tick, setTick] = createState(0)
  item.connect("changed", () => setTick((t) => t + 1))

  const showMenu = () => openTrayMenu(item)

  return (
    <box
      class="tray-btn"
      tooltipText={tick.as(() => item.tooltip_text || item.title)}
      $={(self) => {
        const click = new Gtk.GestureClick()
        let singleTimer: Timer | null = null
        click.connect("pressed", (gesture, nPress) => {
          const btn = gesture.get_current_button()
          if (btn !== 1) {
            if (btn === 2 || btn === 3) showMenu()
            return
          }
          if (nPress === 2) {
            // double-click: menu only, no activate
            singleTimer?.cancel()
            singleTimer = null
            console.log(`tray: double-click menu on ${item.item_id}`)
            showMenu()
            return
          }
          // single press: arm delayed activate (cancelled by double-click/long-press)
          singleTimer?.cancel()
          singleTimer = timeout(350, () => {
            singleTimer = null
            console.log(`tray: primary pressed on ${item.item_id}`)
            try {
              item.activate(0, 0)
            } catch {
              /* ignore */
            }
          })
        })
        const scroll = new Gtk.EventControllerScroll({
          flags: Gtk.EventControllerScrollFlags.VERTICAL,
        })
        scroll.connect("scroll", (_c, _dx, dy) => {
          try {
            item.scroll(dy > 0 ? 1 : -1, "vertical")
          } catch {
            /* ignore */
          }
          return true
        })
        self.add_controller(click)
        const hold = new Gtk.GestureLongPress()
        hold.set_delay_factor(0.6)
        hold.connect("pressed", () => {
          singleTimer?.cancel()
          singleTimer = null
          console.log(`tray: long-press menu on ${item.item_id}`)
          showMenu()
        })
        self.add_controller(hold)
        self.add_controller(scroll)
      }}
    >
      <image gicon={tick.as(() => item.gicon)} pixelSize={16} />
    </box>
  )
}

export function traySizes(): string {
  const win = app.get_window("tray-menu")
  if (!win) return "no window"
  const child = win.get_child()
  return `win=${win.get_width()}x${win.get_height()} child=${child?.get_width() ?? -1}x${child?.get_height() ?? -1}`
}

export function trayDebug(): string {
  const list = items.peek()
  if (list.length === 0) return "(tray empty)"
  return list
    .map(
      (i) =>
        `${i.item_id} title="${i.title}" menu_model=${i.menu_model ? "yes" : "no"} action_group=${i.action_group ? "yes" : "no"}`,
    )
    .join("\n")
}

export default function SysTray() {
  return (
    <box
      class="tray"
      spacing={6}
      $={(self) => {
        const legacy = new Gtk.EventControllerLegacy()
        legacy.connect("event", (_c, event) => {
          const t = event.get_event_type()
          // 4=GDK_BUTTON_PRESS, 5=GDK_BUTTON_RELEASE, 7=GDK_MOTION_NOTIFY
          if (t === 4 || t === 5) {
            console.log(`tray legacy event type=${t} button=${event.get_button()}`)
          }
          return false
        })
        self.add_controller(legacy)
        const click = new Gtk.GestureClick()
        click.connect("pressed", (gesture) => {
          console.log(`tray container pressed button ${gesture.get_current_button()}`)
        })
        self.add_controller(click)
      }}
    >
      <For each={items} id={(item) => item.item_id}>
        {(item) => <TrayButton item={item} />}
      </For>
    </box>
  )
}
