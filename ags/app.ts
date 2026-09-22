import app from "ags/gtk4/app"
import { Gtk } from "ags/gtk4"
import style from "./style.scss"
import { Bar, LogoMenu, toggleLogoMenu } from "./widget/Bar"
import { trayActionTest, trayDebug, trayMenuTest, traySizes, TrayMenuWindow } from "./widget/Tray"

app.start({
  css: style,
  main() {
    Gtk.Settings.get_default()!.gtk_double_click_time = 600
    Bar()
    LogoMenu()
    TrayMenuWindow()
  },
  requestHandler(argv, res) {
    if (argv[0] === "logo-menu") {
      toggleLogoMenu()
      res("ok")
    } else if (argv[0] === "tray-debug") {
      res(trayDebug())
    } else if (argv[0] === "tray-menu-test") {
      res(trayMenuTest())
    } else if (argv[0] === "tray-size") {
      res(traySizes())
    } else if (argv[0] === "tray-action-test") {
      res(trayActionTest())
    } else {
      res("unknown command")
    }
  },
})
