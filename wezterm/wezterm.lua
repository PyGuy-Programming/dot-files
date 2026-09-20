local wezterm = require("wezterm")

config = wezterm.config_builder()
config.term = "xterm-256color"

config.enable_wayland = true
config.disable_default_key_bindings = true
config.keys = {
	{ key = "V", mods = "CTRL", action = wezterm.action.PasteFrom("Clipboard") },
	{ key = "C", mods = "CTRL", action = wezterm.action.CopyTo("ClipboardAndPrimarySelection") },
}
config = {
	automatically_reload_config = true,
	enable_tab_bar = false,
	window_close_confirmation = "NeverPrompt",
	window_decorations = "NONE",
	font = wezterm.font("Cascadia Code", { weight = "Regular" }),
	font_size = 12.0,
	freetype_load_target = "Light",
	freetype_render_target = "HorizontalLcd",
	default_cursor_style = "BlinkingBlock",
	color_scheme = "Catppuccin Macchiato",
	colors = {
		cursor_bg = "#d99abb",
		cursor_border = "#d99abb",
		cursor_fg = "#1e1e2e",
	},
	window_background_opacity = 0.95,
	cursor_blink_rate = 700,
	cursor_blink_ease_in = "Constant",
	cursor_blink_ease_out = "Constant",
	cursor_thickness = "1.5pt",
}

config.animation_fps = 90

return config
