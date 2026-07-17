-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

vim.keymap.set("n", "<leader>r", function()
  local file = vim.fn.expand("%")
  if file == "" then
    return
  end

  -- Get the first line to check for shebang
  local first_line = vim.fn.getline(1)
  local cmd

  -- Check if the first line starts with #!
  if string.match(first_line, "^#!") then
    -- Extract the interpreter path (removes arguments like -S)
    -- Matches #!/usr/bin/env python3 OR #!/bin/bash
    local interpreter = first_line:match("^#!%s*(%S+)")

    if interpreter then
      -- Make file executable just in case
      vim.cmd("!chmod +x " .. vim.fn.shellescape(file))
      cmd = interpreter .. " " .. vim.fn.shellescape(file)
    else
      vim.notify("Invalid shebang format", vim.log.levels.WARN)
      return
    end
  else
    -- Fallback: Ask user or default to python3 (optional)
    vim.notify("No shebang found. Add #!/usr/bin/env ... to the first line.", vim.log.levels.WARN)
    return
  end

  -- Execute using ToggleTerm (LazyVim's default)
  local term = require("toggleterm.terminal").Terminal:new({
    cmd = cmd,
    direction = "horizontal",
    close_on_exit = false,
  })
  term:toggle()
end, { desc = "Run file using shebang interpreter" })
