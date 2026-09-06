if status is-interactive
    alias nvim="/home/linuxbrew/.linuxbrew/bin/nvim"
    alias opencode="/home/linuxbrew/.linuxbrew/bin/opencode"
    alias sshmgr="/home/linuxbrew/.linuxbrew/bin/sshmgr"
    alias fzf="/home/linuxbrew/.linuxbrew/bin/fzf"
    alias brew="/home/linuxbrew/.linuxbrew/bin/brew"
    alias asdf="/home/linuxbrew/.linuxbrew/bin/asdf"
    alias wezterm='flatpak run org.wezfurlong.wezterm'
    alias git-all="git add . && git commit && git push --force"
    alias fetch="git fetch"
    alias ls="eza --icons"
    alias c="clear"
    alias passgen="openssl rand -base64 $1"
    fastfetch
    alias idf-init="source ~/.espressif/v6.0/esp-idf/export.fish"
    alias poweroof="poweroff"
    alias reset-tmux="tmux kill-server; echo 'killed old shared main - next kitty will have fresh session'"

    # Auto-start tmux in kitty - each kitty window gets own tmux session (not shared main)
    if not set -q TMUX; and set -q KITTY_WINDOW_ID
        exec tmux new-session
    end
    # Commands to run in interactive sessions can go here
end

abbr -a !! --position anywhere --function __sudo_bang
function __sudo_bang
    echo $history[1]
end

starship init fish | source
set -x SPACESHIP_NODE_SHOW false
zoxide init --cmd cd fish | source

# Added by Vice installer
fish_add_path -g $HOME/.local/bin

# bun
set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH

set fish_greeting " "
