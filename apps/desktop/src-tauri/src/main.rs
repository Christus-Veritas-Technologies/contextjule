// Prevents an extra console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // `--statusline` is Claude Code invoking us as its status line command. It
    // must not start Tauri: it reads stdin, writes one row, prints one line and
    // exits, several times a second. Handled before anything else so no window
    // system is touched on that path.
    if std::env::args().any(|arg| arg == "--statusline") {
        contextjule_lib::run_statusline();
        return;
    }

    contextjule_lib::run()
}
