import app from "ags/gtk4/app"
import style from "./style.scss"
import { QuickSettingsPanel, QuickSettingsTrigger, qsToggle } from "./widget/QuickSettings"
import { Bar, LogoMenu } from "./widget/Bar"

app.start({
  css: style,
  main() {
    Bar()
    LogoMenu()
    QuickSettingsPanel()
    QuickSettingsTrigger()
  },
  requestHandler(argv, res) {
    if (argv[0] === "qs-toggle") {
      qsToggle()
      res("ok")
    } else {
      res("unknown command")
    }
  },
})
