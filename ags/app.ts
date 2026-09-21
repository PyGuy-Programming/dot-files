import app from "ags/gtk4/app"
import style from "./style.scss"
import { Bar, LogoMenu, toggleLogoMenu } from "./widget/Bar"

app.start({
  css: style,
  main() {
    Bar()
    LogoMenu()
  },
  requestHandler(argv, res) {
    if (argv[0] === "logo-menu") {
      toggleLogoMenu()
      res("ok")
    } else {
      res("unknown command")
    }
  },
})
