-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

vim.keymap.set({ "n", "t" }, "<F12>", function()
  local current_dir = vim.uv.cwd()
  local cmd = "opencode" -- Startbefehl für deine KI

  Snacks.terminal.toggle(cmd, {
    cwd = current_dir,
    id = "opencode_persistent_terminal", -- Feste ID, damit immer dieselbe Instanz genutzt wird
    win = {
      position = "float",
      height = 0.85,
      width = 0.85,
      border = "rounded",
      keys = {
        nav_h = false, -- Deaktiviert LazyVim-Fensternavigation im Terminal, damit Pfeiltasten frei sind
        nav_j = false,
        nav_k = false,
        nav_l = false,
      },
    },
  })
end, { desc = "Toggle persistent OpenCode window" })

-- F5: aktuelle Datei per Dateiendung ausführen (ohne Shebang)
local function run_file_with_interpreter()
  local file = vim.fn.expand("%:p")
  if file == "" then
    vim.notify("Kein File zum Ausführen", vim.log.levels.WARN)
    return
  end

  if vim.bo.modified then
    vim.cmd("write")
  end

  local ext = vim.fn.expand("%:e"):lower()
  local filename = vim.fn.expand("%:t"):lower()

  local interpreters = {
    py = "/usr/bin/env python3",
    pyw = "/usr/bin/env python3",
    js = "/usr/bin/env node",
    mjs = "/usr/bin/env node",
    cjs = "/usr/bin/env node",
    ts = "/usr/bin/env ts-node",
    mts = "/usr/bin/env ts-node",
    lua = "/usr/bin/env lua",
    sh = "/usr/bin/env bash",
    bash = "/usr/bin/env bash",
    zsh = "/usr/bin/env zsh",
    rb = "/usr/bin/env ruby",
    pl = "/usr/bin/env perl",
    php = "/usr/bin/env php",
    r = "/usr/bin/env Rscript",
    go = "go run",
  }

  local interpreter = interpreters[ext]

  if not interpreter then
    if filename == "makefile" or filename == "gnumakefile" then
      interpreter = "make -f"
    end
  end

  local cmd
  if interpreter then
    cmd = interpreter .. " " .. vim.fn.shellescape(file)
  else
    vim.notify("Kein Interpreter für Endung '." .. ext .. "' bekannt", vim.log.levels.WARN)
    return
  end

  -- Nutze Snacks.terminal wie beim F12-Mapping, Fallback auf ToggleTerm/split
  local ok_snacks = pcall(require, "snacks")
  if ok_snacks and Snacks.terminal then
    Snacks.terminal.toggle(cmd, {
      win = { position = "bottom", height = 0.4 },
      auto_close = false,
    })
    return
  end

  local ok, toggleterm = pcall(require, "toggleterm.terminal")
  if ok then
    local Terminal = toggleterm.Terminal
    local term = Terminal:new({
      cmd = cmd,
      direction = "horizontal",
      close_on_exit = false,
    })
    term:toggle()
  else
    vim.cmd("split | terminal " .. cmd)
  end
end

vim.keymap.set("n", "<F5>", run_file_with_interpreter, { desc = "Run file (F5) per Dateiendung" })
