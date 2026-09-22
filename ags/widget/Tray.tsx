import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import Gio from "gi://Gio?version=2.0"
import { timeout, type Timer } from "ags/time"
import { For, createState, onCleanup } from "gnim"
import AstalTray from "gi://AstalTray?version=0.1"

type TrayItem = InstanceType<typeof AstalTray.TrayItem>

const tray = AstalTray.Tray.get_default()
const [items, setItems] = createState<Array<TrayItem>>([])

function sync() {
  setItems([...tray.items] as Array<TrayItem>)
}

tray.connect("item_added", sync)
tray.connect("item_removed", sync)
sync()

const openPopovers = new Set<Gtk.PopoverMenu>()
const buttonWidgets = new Map<string, Gtk.Widget>()

function openItemMenu(item: TrayItem, parent: Gtk.Widget) {
  try {
    item.about_to_show()
  } catch {
    /* ignore */
  }
  const model = item.menu_model
  if (!model) {
    console.log(`tray: no menu for ${item.item_id}, secondary activate`)
    try {
      item.secondary_activate(0, 0)
    } catch (e) {
      console.error(`tray: secondary_activate failed: ${e}`)
    }
    return
  }
  try {
    const pop = new Gtk.PopoverMenu()
    pop.set_menu_model(model)
    const ag = item.action_group
    if (ag) pop.insert_action_group("dbusmenu", ag)
    pop.set_position(Gtk.PositionType.BOTTOM)
    pop.set_parent(parent)
    openPopovers.add(pop)
    pop.connect("closed", () => {
      openPopovers.delete(pop)
      pop.unparent()
    })
    console.log(`tray: opening menu for ${item.item_id}`)
    pop.popup()
  } catch (e) {
    console.error(`tray: menu failed: ${e}`)
  }
}

export function trayMenuTest(): string {
  const list = items.peek()
  if (list.length === 0) return "(tray empty)"
  const item = list[0]
  const widget = buttonWidgets.get(item.item_id)
  if (!widget) return "no widget ref"
  openItemMenu(item, widget)
  return `opened menu for ${item.item_id}`
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

  const showMenu = (parent: Gtk.Widget) => openItemMenu(item, parent)

  return (
    <box
      class="tray-btn"
      tooltipText={tick.as(() => item.tooltip_text || item.title)}
      $={(self) => {
        buttonWidgets.set(item.item_id, self)
        onCleanup(() => buttonWidgets.delete(item.item_id))
        const click = new Gtk.GestureClick()
        let singleTimer: Timer | null = null
        click.connect("pressed", (gesture, nPress) => {
          const btn = gesture.get_current_button()
          if (btn !== 1) {
            if (btn === 2 || btn === 3) showMenu(self)
            return
          }
          if (nPress === 2) {
            // double-click: menu only, no activate
            singleTimer?.cancel()
            singleTimer = null
            console.log(`tray: double-click menu on ${item.item_id}`)
            showMenu(self)
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
          showMenu(self)
        })
        self.add_controller(hold)
        self.add_controller(scroll)
      }}
    >
      <image gicon={tick.as(() => item.gicon)} pixelSize={16} />
    </box>
  )
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
