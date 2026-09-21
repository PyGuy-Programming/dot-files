import { Gtk } from "ags/gtk4"
import { For, createState } from "gnim"
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

function TrayButton({ item }: { item: TrayItem }) {
  const [tick, setTick] = createState(0)
  item.connect("changed", () => setTick((t) => t + 1))

  const showMenu = (parent: Gtk.Widget) => {
    const model = item.menu_model
    if (!model) {
      try {
        item.secondary_activate(0, 0)
      } catch {
        /* ignore */
      }
      return
    }
    const pop = new Gtk.PopoverMenu()
    pop.set_menu_model(model)
    const ag = item.action_group
    if (ag) pop.insert_action_group("dbusmenu", ag)
    pop.set_parent(parent)
    pop.popup()
  }

  return (
    <box
      class="tray-btn"
      tooltipText={tick.as(() => item.tooltip_text || item.title)}
      $={(self) => {
        const primary = new Gtk.GestureClick()
        primary.set_button(1)
        primary.connect("pressed", () => {
          try {
            item.activate(0, 0)
          } catch {
            /* ignore */
          }
        })
        const secondary = new Gtk.GestureClick()
        secondary.set_button(2)
        secondary.connect("pressed", () => showMenu(self))
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
        self.add_controller(primary)
        self.add_controller(secondary)
        self.add_controller(scroll)
      }}
    >
      <image gicon={tick.as(() => item.gicon)} pixelSize={16} />
    </box>
  )
}

export default function SysTray() {
  return (
    <box class="tray" spacing={6}>
      <For each={items} id={(item) => item.item_id}>
        {(item) => <TrayButton item={item} />}
      </For>
    </box>
  )
}
