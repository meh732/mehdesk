// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize)]
struct SystemInfo {
    os: String,
    hostname: String,
    username: String,
    screen_width: i32,
    screen_height: i32,
    home_dir: String,
    downloads_dir: String,
}

#[derive(Deserialize, Debug)]
struct RemoteInputEvent {
    #[serde(rename = "type")]
    event_type: String,
    x: Option<f64>,
    y: Option<f64>,
    button: Option<String>,
    #[serde(rename = "deltaX")]
    delta_x: Option<f64>,
    #[serde(rename = "deltaY")]
    delta_y: Option<f64>,
    key: Option<String>,
    code: Option<String>,
    #[serde(rename = "ctrlKey")]
    ctrl_key: Option<bool>,
    #[serde(rename = "altKey")]
    alt_key: Option<bool>,
    #[serde(rename = "shiftKey")]
    shift_key: Option<bool>,
    #[serde(rename = "metaKey")]
    meta_key: Option<bool>,
}

#[derive(Serialize)]
struct ShellResult {
    stdout: String,
    stderr: String,
    exit_code: i32,
    cwd: String,
}

#[derive(Serialize)]
struct FileEntry {
    name: String,
    path: String,
    size: u64,
    #[serde(rename = "isDir")]
    is_dir: bool,
    modified: String,
    #[serde(rename = "type")]
    file_type: String,
    extension: String,
}

#[derive(Serialize)]
struct FileChunkResult {
    data_base64: String,
    bytes_read: usize,
    total_size: u64,
    eof: bool,
}

// Minimal Base64 encode/decode to avoid external crate cross-compile issues
const B64_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn base64_encode(input: &[u8]) -> String {
    let mut out = String::with_capacity((input.len() + 2) / 3 * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;

        out.push(B64_CHARS[((triple >> 18) & 0x3F) as usize] as char);
        out.push(B64_CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(B64_CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(B64_CHARS[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    let mut table = [255u8; 256];
    for (i, &c) in B64_CHARS.iter().enumerate() {
        table[c as usize] = i as u8;
    }
    let bytes: Vec<u8> = input.bytes().filter(|&b| !b.is_ascii_whitespace()).collect();
    if bytes.len() % 4 != 0 {
        return Err("Invalid base64 length".to_string());
    }
    let mut out = Vec::with_capacity(bytes.len() / 4 * 3);
    for chunk in bytes.chunks(4) {
        let a = table[chunk[0] as usize];
        let b = table[chunk[1] as usize];
        if a == 255 || b == 255 {
            return Err("Invalid base64 character".to_string());
        }
        let c = if chunk[2] == b'=' { 0 } else { table[chunk[2] as usize] };
        let d = if chunk[3] == b'=' { 0 } else { table[chunk[3] as usize] };
        if (chunk[2] != b'=' && c == 255) || (chunk[3] != b'=' && d == 255) {
            return Err("Invalid base64 character".to_string());
        }
        let triple = ((a as u32) << 18) | ((b as u32) << 12) | ((c as u32) << 6) | (d as u32);
        out.push(((triple >> 16) & 0xFF) as u8);
        if chunk[2] != b'=' {
            out.push(((triple >> 8) & 0xFF) as u8);
        }
        if chunk[3] != b'=' {
            out.push((triple & 0xFF) as u8);
        }
    }
    Ok(out)
}

fn get_home_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(p) = std::env::var("USERPROFILE") {
            return PathBuf::from(p);
        }
        PathBuf::from("C:\\")
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(p) = std::env::var("HOME") {
            return PathBuf::from(p);
        }
        PathBuf::from("/")
    }
}

fn get_downloads_dir() -> PathBuf {
    let dl = get_home_dir().join("Downloads");
    if dl.exists() {
        dl
    } else {
        get_home_dir()
    }
}

#[cfg(target_os = "windows")]
mod win_native {
    use super::RemoteInputEvent;
    use std::mem;

    const SM_CXSCREEN: i32 = 0;
    const SM_CYSCREEN: i32 = 1;
    const SM_XVIRTUALSCREEN: i32 = 76;
    const SM_YVIRTUALSCREEN: i32 = 77;
    const SM_CXVIRTUALSCREEN: i32 = 78;
    const SM_CYVIRTUALSCREEN: i32 = 79;

    const MOUSEEVENTF_LEFTDOWN: u32 = 0x0002;
    const MOUSEEVENTF_LEFTUP: u32 = 0x0004;
    const MOUSEEVENTF_RIGHTDOWN: u32 = 0x0008;
    const MOUSEEVENTF_RIGHTUP: u32 = 0x0010;
    const MOUSEEVENTF_MIDDLEDOWN: u32 = 0x0020;
    const MOUSEEVENTF_MIDDLEUP: u32 = 0x0040;
    const MOUSEEVENTF_WHEEL: u32 = 0x0800;

    const INPUT_KEYBOARD: u32 = 1;
    const KEYEVENTF_EXTENDEDKEY: u32 = 0x0001;
    const KEYEVENTF_KEYUP: u32 = 0x0002;
    const KEYEVENTF_UNICODE: u32 = 0x0004;

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct MOUSEINPUT {
        dx: i32,
        dy: i32,
        mouse_data: u32,
        dw_flags: u32,
        time: u32,
        dw_extra_info: usize,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct KEYBDINPUT {
        w_vk: u16,
        w_scan: u16,
        dw_flags: u32,
        time: u32,
        dw_extra_info: usize,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct HARDWAREINPUT {
        u_msg: u32,
        w_param_l: u16,
        w_param_h: u16,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    union INPUT_UNION {
        mi: MOUSEINPUT,
        ki: KEYBDINPUT,
        hi: HARDWAREINPUT,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct INPUT {
        input_type: u32,
        u: INPUT_UNION,
    }

    #[link(name = "user32")]
    extern "system" {
        fn GetSystemMetrics(n_index: i32) -> i32;
        fn SetCursorPos(x: i32, y: i32) -> i32;
        fn mouse_event(dw_flags: u32, dx: i32, dy: i32, dw_data: u32, dw_extra_info: usize);
        fn SendInput(c_inputs: u32, p_inputs: *const INPUT, cb_size: i32) -> u32;
        fn LockWorkStation() -> i32;
    }

    pub fn screen_size() -> (i32, i32) {
        unsafe {
            let w = GetSystemMetrics(SM_CXSCREEN);
            let h = GetSystemMetrics(SM_CYSCREEN);
            (if w > 0 { w } else { 1920 }, if h > 0 { h } else { 1080 })
        }
    }

    fn send_vk(vk: u16, is_up: bool, extended: bool) {
        let mut flags = if is_up { KEYEVENTF_KEYUP } else { 0 };
        if extended {
            flags |= KEYEVENTF_EXTENDEDKEY;
        }
        let input = INPUT {
            input_type: INPUT_KEYBOARD,
            u: INPUT_UNION {
                ki: KEYBDINPUT {
                    w_vk: vk,
                    w_scan: 0,
                    dw_flags: flags,
                    time: 0,
                    dw_extra_info: 0,
                },
            },
        };
        unsafe {
            SendInput(1, &input, mem::size_of::<INPUT>() as i32);
        }
    }

    fn send_unicode_char(ch: u16, is_up: bool) {
        let flags = KEYEVENTF_UNICODE | if is_up { KEYEVENTF_KEYUP } else { 0 };
        let input = INPUT {
            input_type: INPUT_KEYBOARD,
            u: INPUT_UNION {
                ki: KEYBDINPUT {
                    w_vk: 0,
                    w_scan: ch,
                    dw_flags: flags,
                    time: 0,
                    dw_extra_info: 0,
                },
            },
        };
        unsafe {
            SendInput(1, &input, mem::size_of::<INPUT>() as i32);
        }
    }

    fn map_special_vk(key: &str, code: Option<&str>) -> Option<(u16, bool)> {
        match key {
            "Enter" => Some((0x0D, false)),
            "Backspace" => Some((0x08, false)),
            "Tab" => Some((0x09, false)),
            "Escape" | "Esc" => Some((0x1B, false)),
            "Delete" | "Del" => Some((0x2E, true)),
            "Insert" => Some((0x2D, true)),
            "Home" => Some((0x24, true)),
            "End" => Some((0x23, true)),
            "PageUp" => Some((0x21, true)),
            "PageDown" => Some((0x22, true)),
            "ArrowUp" => Some((0x26, true)),
            "ArrowDown" => Some((0x28, true)),
            "ArrowLeft" => Some((0x25, true)),
            "ArrowRight" => Some((0x27, true)),
            "CapsLock" => Some((0x14, false)),
            "Shift" => Some((0x10, false)),
            "Control" => Some((0x11, false)),
            "Alt" => Some((0x12, false)),
            "Meta" | "LWin" | "OS" => Some((0x5B, true)),
            " " => Some((0x20, false)),
            "F1" => Some((0x70, false)),
            "F2" => Some((0x71, false)),
            "F3" => Some((0x72, false)),
            "F4" => Some((0x73, false)),
            "F5" => Some((0x74, false)),
            "F6" => Some((0x75, false)),
            "F7" => Some((0x76, false)),
            "F8" => Some((0x77, false)),
            "F9" => Some((0x78, false)),
            "F10" => Some((0x79, false)),
            "F11" => Some((0x7A, false)),
            "F12" => Some((0x7B, false)),
            _ => {
                if let Some(c) = code {
                    match c {
                        "OSLeft" | "MetaLeft" => Some((0x5B, true)),
                        "OSRight" | "MetaRight" => Some((0x5C, true)),
                        "Space" => Some((0x20, false)),
                        _ => None,
                    }
                } else {
                    None
                }
            }
        }
    }

    pub fn inject(ev: &RemoteInputEvent) {
        unsafe {
            if let (Some(nx), Some(ny)) = (ev.x, ev.y) {
                let vx = GetSystemMetrics(SM_XVIRTUALSCREEN);
                let vy = GetSystemMetrics(SM_YVIRTUALSCREEN);
                let vw = GetSystemMetrics(SM_CXVIRTUALSCREEN);
                let vh = GetSystemMetrics(SM_CYVIRTUALSCREEN);
                let (w, h) = if vw > 0 && vh > 0 {
                    (vw, vh)
                } else {
                    screen_size()
                };
                let clamped_x = nx.clamp(0.0, 1.0);
                let clamped_y = ny.clamp(0.0, 1.0);
                let px = vx + (clamped_x * (w as f64 - 1.0)).round() as i32;
                let py = vy + (clamped_y * (h as f64 - 1.0)).round() as i32;
                SetCursorPos(px, py);
            }

            let btn = ev.button.as_deref().unwrap_or("left");

            match ev.event_type.as_str() {
                "mousemove" => {}
                "mousedown" => {
                    let flag = match btn {
                        "right" => MOUSEEVENTF_RIGHTDOWN,
                        "middle" => MOUSEEVENTF_MIDDLEDOWN,
                        _ => MOUSEEVENTF_LEFTDOWN,
                    };
                    mouse_event(flag, 0, 0, 0, 0);
                }
                "mouseup" => {
                    let flag = match btn {
                        "right" => MOUSEEVENTF_RIGHTUP,
                        "middle" => MOUSEEVENTF_MIDDLEUP,
                        _ => MOUSEEVENTF_LEFTUP,
                    };
                    mouse_event(flag, 0, 0, 0, 0);
                }
                "click" => {
                    let (down, up) = match btn {
                        "right" => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
                        "middle" => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
                        _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
                    };
                    mouse_event(down, 0, 0, 0, 0);
                    mouse_event(up, 0, 0, 0, 0);
                }
                "dblclick" => {
                    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                    std::thread::sleep(std::time::Duration::from_millis(40));
                    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
                    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
                }
                "wheel" => {
                    let dy = ev.delta_y.unwrap_or(0.0);
                    let delta = if dy != 0.0 {
                        (-dy.signum() * 120.0) as i32
                    } else {
                        0
                    };
                    if delta != 0 {
                        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, delta as u32, 0);
                    }
                }
                "keydown" | "keyup" => {
                    let is_up = ev.event_type == "keyup";
                    let key = ev.key.as_deref().unwrap_or("");
                    let code = ev.code.as_deref();
                    let ctrl = ev.ctrl_key.unwrap_or(false);
                    let alt = ev.alt_key.unwrap_or(false);
                    let shift = ev.shift_key.unwrap_or(false);
                    let meta = ev.meta_key.unwrap_or(false);

                    // Handle special system shortcuts on keydown
                    if !is_up {
                        if meta && (key.eq_ignore_ascii_case("l")) {
                            LockWorkStation();
                            return;
                        }
                        if ctrl && alt && (key == "Delete" || code == Some("Delete")) {
                            // Open Task Manager via Ctrl+Shift+Esc as standard remote SAS fallback
                            send_vk(0x11, false, false);
                            send_vk(0x10, false, false);
                            send_vk(0x1B, false, false);
                            send_vk(0x1B, true, false);
                            send_vk(0x10, true, false);
                            send_vk(0x11, true, false);
                            return;
                        }
                        if ctrl && shift && (key == "Escape" || code == Some("Escape")) {
                            send_vk(0x11, false, false);
                            send_vk(0x10, false, false);
                            send_vk(0x1B, false, false);
                            send_vk(0x1B, true, false);
                            send_vk(0x10, true, false);
                            send_vk(0x11, true, false);
                            return;
                        }
                        if alt && (key == "Tab" || code == Some("Tab")) {
                            send_vk(0x12, false, false);
                            send_vk(0x09, false, false);
                            std::thread::sleep(std::time::Duration::from_millis(25));
                            send_vk(0x09, true, false);
                            send_vk(0x12, true, false);
                            return;
                        }
                    }

                    // If standalone modifier key event, ignore if we synthesize combos, or pass through
                    if let Some((vk, ext)) = map_special_vk(key, code) {
                        if !is_up && (ctrl || alt || shift) && vk != 0x10 && vk != 0x11 && vk != 0x12 {
                            if ctrl { send_vk(0x11, false, false); }
                            if alt { send_vk(0x12, false, false); }
                            if shift { send_vk(0x10, false, false); }
                            send_vk(vk, false, ext);
                            send_vk(vk, true, ext);
                            if shift { send_vk(0x10, true, false); }
                            if alt { send_vk(0x12, true, false); }
                            if ctrl { send_vk(0x11, true, false); }
                        } else {
                            send_vk(vk, is_up, ext);
                        }
                        return;
                    }

                    // Ctrl+Char / Alt+Char / Meta+Char shortcuts (e.g. Ctrl+C, Ctrl+V, Ctrl+A)
                    if (ctrl || alt || meta) && key.chars().count() == 1 {
                        if !is_up {
                            let ch = key.chars().next().unwrap().to_ascii_uppercase();
                            let vk = if ch.is_ascii_alphanumeric() {
                                ch as u16
                            } else {
                                0
                            };
                            if vk != 0 {
                                if ctrl { send_vk(0x11, false, false); }
                                if alt { send_vk(0x12, false, false); }
                                if meta { send_vk(0x5B, false, true); }
                                if shift { send_vk(0x10, false, false); }
                                send_vk(vk, false, false);
                                send_vk(vk, true, false);
                                if shift { send_vk(0x10, true, false); }
                                if meta { send_vk(0x5B, true, true); }
                                if alt { send_vk(0x12, true, false); }
                                if ctrl { send_vk(0x11, true, false); }
                            }
                        }
                        return;
                    }

                    // Normal text / Unicode typing (works for English, symbols, Persian, etc.)
                    if !is_up && !key.is_empty() && key.chars().count() == 1 {
                        for unit in key.encode_utf16() {
                            send_unicode_char(unit, false);
                            send_unicode_char(unit, true);
                        }
                    }
                }
                _ => {}
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod unix_native {
    use super::RemoteInputEvent;
    use std::process::Command;

    pub fn screen_size() -> (i32, i32) {
        if let Ok(out) = Command::new("xdotool").arg("getdisplaygeometry").output() {
            if out.status.success() {
                let s = String::from_utf8_lossy(&out.stdout);
                let parts: Vec<&str> = s.split_whitespace().collect();
                if parts.len() >= 2 {
                    if let (Ok(w), Ok(h)) = (parts[0].parse::<i32>(), parts[1].parse::<i32>()) {
                        return (w, h);
                    }
                }
            }
        }
        (1920, 1080)
    }

    pub fn inject(ev: &RemoteInputEvent) {
        if let (Some(nx), Some(ny)) = (ev.x, ev.y) {
            let (w, h) = screen_size();
            let px = (nx.clamp(0.0, 1.0) * (w as f64 - 1.0)).round() as i32;
            let py = (ny.clamp(0.0, 1.0) * (h as f64 - 1.0)).round() as i32;
            let _ = Command::new("xdotool")
                .args(["mousemove", &px.to_string(), &py.to_string()])
                .status();
        }
        let btn = match ev.button.as_deref().unwrap_or("left") {
            "right" => "3",
            "middle" => "2",
            _ => "1",
        };
        match ev.event_type.as_str() {
            "mousedown" => {
                let _ = Command::new("xdotool").args(["mousedown", btn]).status();
            }
            "mouseup" => {
                let _ = Command::new("xdotool").args(["mouseup", btn]).status();
            }
            "click" => {
                let _ = Command::new("xdotool").args(["click", btn]).status();
            }
            "dblclick" => {
                let _ = Command::new("xdotool").args(["click", "--repeat", "2", btn]).status();
            }
            "wheel" => {
                let dy = ev.delta_y.unwrap_or(0.0);
                let wheel_btn = if dy > 0.0 { "5" } else { "4" };
                let _ = Command::new("xdotool").args(["click", wheel_btn]).status();
            }
            "keydown" => {
                if let Some(key) = ev.key.as_deref() {
                    if key.chars().count() == 1 {
                        let _ = Command::new("xdotool").args(["type", "--clearmodifiers", key]).status();
                    } else {
                        let xk = match key {
                            "Enter" => "Return",
                            "Backspace" => "BackSpace",
                            "Escape" => "Escape",
                            "Tab" => "Tab",
                            "Delete" => "Delete",
                            "ArrowUp" => "Up",
                            "ArrowDown" => "Down",
                            "ArrowLeft" => "Left",
                            "ArrowRight" => "Right",
                            _ => key,
                        };
                        let _ = Command::new("xdotool").args(["key", xk]).status();
                    }
                }
            }
            _ => {}
        }
    }
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let os = std::env::consts::OS.to_string();
    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "MehDesk-PC".to_string());
    let username = std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "User".to_string());

    #[cfg(target_os = "windows")]
    let (screen_width, screen_height) = win_native::screen_size();
    #[cfg(not(target_os = "windows"))]
    let (screen_width, screen_height) = unix_native::screen_size();

    SystemInfo {
        os,
        hostname,
        username,
        screen_width,
        screen_height,
        home_dir: get_home_dir().to_string_lossy().to_string(),
        downloads_dir: get_downloads_dir().to_string_lossy().to_string(),
    }
}

#[tauri::command]
fn inject_remote_input(event: RemoteInputEvent) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    win_native::inject(&event);
    #[cfg(not(target_os = "windows"))]
    unix_native::inject(&event);
    Ok(())
}

#[tauri::command]
fn execute_shell_command(command: String) -> Result<ShellResult, String> {
    let cwd = get_home_dir();

    #[cfg(target_os = "windows")]
    let output = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                &format!("[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; {}", command),
            ])
            .current_dir(&cwd)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to execute PowerShell: {}", e))?
    };

    #[cfg(not(target_os = "windows"))]
    let output = {
        Command::new("sh")
            .args(["-c", &command])
            .current_dir(&cwd)
            .output()
            .map_err(|e| format!("Failed to execute shell: {}", e))?
    };

    Ok(ShellResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
        cwd: cwd.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn list_directory(path: Option<String>) -> Result<(String, Vec<FileEntry>), String> {
    let requested = path.unwrap_or_default().trim().to_string();

    if requested == "__ROOTS__" {
        let mut roots = Vec::new();
        let home = get_home_dir();
        let dl = get_downloads_dir();
        let desktop = home.join("Desktop");
        let docs = home.join("Documents");

        for (label, p) in [
            ("Home", home.clone()),
            ("Downloads", dl),
            ("Desktop", desktop),
            ("Documents", docs),
        ] {
            if p.exists() {
                roots.push(FileEntry {
                    name: label.to_string(),
                    path: p.to_string_lossy().to_string(),
                    size: 0,
                    is_dir: true,
                    modified: "".to_string(),
                    file_type: "folder".to_string(),
                    extension: "".to_string(),
                });
            }
        }

        #[cfg(target_os = "windows")]
        {
            for letter in b'C'..=b'Z' {
                let drive = format!("{}:\\", letter as char);
                if Path::new(&drive).exists() {
                    roots.push(FileEntry {
                        name: format!("Drive ({}:)", letter as char),
                        path: drive,
                        size: 0,
                        is_dir: true,
                        modified: "".to_string(),
                        file_type: "drive".to_string(),
                        extension: "".to_string(),
                    });
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            roots.push(FileEntry {
                name: "Root (/)".to_string(),
                path: "/".to_string(),
                size: 0,
                is_dir: true,
                modified: "".to_string(),
                file_type: "drive".to_string(),
                extension: "".to_string(),
            });
        }

        return Ok(("Computer".to_string(), roots));
    }

    let target_dir = if requested.is_empty() {
        get_downloads_dir()
    } else {
        PathBuf::from(&requested)
    };

    if !target_dir.exists() || !target_dir.is_dir() {
        return Err(format!("Directory does not exist: {}", target_dir.display()));
    }

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(&target_dir).map_err(|e| format!("Cannot read directory: {}", e))?;

    for entry in read_dir.flatten() {
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let p = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = meta.is_dir();
        let ext = if is_dir {
            String::new()
        } else {
            p.extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default()
        };

        entries.push(FileEntry {
            name,
            path: p.to_string_lossy().to_string(),
            size: if is_dir { 0 } else { meta.len() },
            is_dir,
            modified: "".to_string(),
            file_type: if is_dir { "folder".to_string() } else { "file".to_string() },
            extension: ext,
        });
    }

    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok((target_dir.to_string_lossy().to_string(), entries))
}

#[tauri::command]
fn read_file_chunk(path: String, offset: u64, length: usize) -> Result<FileChunkResult, String> {
    let mut file = fs::File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    let total_size = file.metadata().map(|m| m.len()).unwrap_or(0);
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Seek failed: {}", e))?;

    let mut buf = vec![0u8; length.min(1024 * 1024)];
    let n = file.read(&mut buf).map_err(|e| format!("Read failed: {}", e))?;
    buf.truncate(n);

    Ok(FileChunkResult {
        data_base64: base64_encode(&buf),
        bytes_read: n,
        total_size,
        eof: (offset + n as u64) >= total_size || n == 0,
    })
}

#[tauri::command]
fn write_file_chunk(
    filename: String,
    dest_dir: Option<String>,
    data_base64: String,
    append: bool,
) -> Result<String, String> {
    let safe_name = Path::new(&filename)
        .file_name()
        .ok_or_else(|| "Invalid filename".to_string())?;

    let base_dir = match dest_dir {
        Some(d) if !d.trim().is_empty() && d != "__ROOTS__" => PathBuf::from(d),
        _ => {
            let received = get_downloads_dir().join("MehDesk_Received");
            let _ = fs::create_dir_all(&received);
            received
        }
    };

    if !base_dir.exists() {
        fs::create_dir_all(&base_dir).map_err(|e| format!("Cannot create directory: {}", e))?;
    }

    let full_path = base_dir.join(safe_name);
    let bytes = base64_decode(&data_base64)?;

    let mut file = fs::OpenOptions::new()
        .create(true)
        .write(true)
        .append(append)
        .truncate(!append)
        .open(&full_path)
        .map_err(|e| format!("Cannot open file for writing: {}", e))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed writing chunk: {}", e))?;

    Ok(full_path.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            inject_remote_input,
            execute_shell_command,
            list_directory,
            read_file_chunk,
            write_file_chunk
        ])
        .setup(|_app| {
            println!("meh desk Portable Client launched with native input, shell & filesystem support.");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
