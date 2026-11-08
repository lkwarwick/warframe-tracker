use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{imageops::FilterType, ImageFormat};
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    fs,
    io::Cursor,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{ipc::Response, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct UserData {
    mastered: HashMap<String, bool>,
    components: HashMap<String, i64>,
    settings: HashMap<String, Value>,
    updated_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotCapture {
    path: String,
    data_url: String,
    can_delete: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowBounds {
    x: Option<f64>,
    y: Option<f64>,
    width: f64,
    height: f64,
    #[serde(default)]
    is_maximized: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct WindowState {
    #[serde(rename = "windowBounds")]
    window_bounds: WindowBounds,
}

struct AppState {
    app_data_dir: PathBuf,
    user_data_path: PathBuf,
    previous_user_data_path: PathBuf,
    screenshot_dirs: Vec<PathBuf>,
    debug_screenshot_path: PathBuf,
    pending_screenshots: Arc<Mutex<HashSet<PathBuf>>>,
    watchers: Mutex<Vec<RecommendedWatcher>>,
    writes: Mutex<()>,
}

impl AppState {
    fn new(
        app_data_dir: PathBuf,
        previous_user_data_path: PathBuf,
        screenshot_dirs: Vec<PathBuf>,
        home_dir: &Path,
    ) -> Self {
        Self {
            user_data_path: app_data_dir.join("sync-data").join("user-data.json"),
            previous_user_data_path,
            app_data_dir,
            screenshot_dirs,
            debug_screenshot_path: debug_screenshot_path(home_dir),
            pending_screenshots: Arc::new(Mutex::new(HashSet::new())),
            watchers: Mutex::new(Vec::new()),
            writes: Mutex::new(()),
        }
    }
}

#[tauri::command]
fn load_user_data(state: State<'_, AppState>) -> Result<UserData, String> {
    if let Some(data) = read_user_data(&state.user_data_path) {
        return Ok(data);
    }

    let legacy_paths = [
        state.app_data_dir.join("config.json"),
        state.previous_user_data_path.clone(),
    ];
    for path in legacy_paths {
        if let Some(data) = read_user_data(&path) {
            save_user_data_to_path(&state, &data)?;
            return Ok(data);
        }
    }

    Ok(empty_user_data())
}

#[tauri::command]
fn save_user_data(state: State<'_, AppState>, data: UserData) -> Result<(), String> {
    save_user_data_to_path(&state, &data)
}

#[tauri::command]
fn get_user_data_path(state: State<'_, AppState>) -> String {
    state
        .user_data_path
        .parent()
        .unwrap_or(&state.app_data_dir)
        .to_string_lossy()
        .into_owned()
}

#[tauri::command]
fn delete_screenshot(state: State<'_, AppState>, file_path: String) -> bool {
    let requested = PathBuf::from(&file_path);
    if !is_screenshot_path(&requested) {
        eprintln!("[screenshots] Refused invalid delete request: {file_path}");
        return false;
    }

    let Ok(path) = fs::canonicalize(requested) else {
        eprintln!("[screenshots] Could not resolve screenshot for deletion: {file_path}");
        return false;
    };
    let debug_path = fs::canonicalize(&state.debug_screenshot_path)
        .unwrap_or_else(|_| state.debug_screenshot_path.clone());
    if path == debug_path
        || !state
            .screenshot_dirs
            .iter()
            .any(|directory| path.parent() == Some(directory.as_path()))
    {
        eprintln!("[screenshots] Refused protected or unwatched delete request: {file_path}");
        return false;
    }

    match fs::remove_file(&path) {
        Ok(()) => true,
        Err(error) => {
            eprintln!("[screenshots] Failed to delete {file_path}: {error}");
            false
        }
    }
}

#[tauri::command]
fn save_screenshot_copy(file_path: String, data_url: String) -> Result<(), String> {
    let (metadata, encoded_image) = data_url
        .split_once(',')
        .ok_or_else(|| "Invalid screenshot image data".to_string())?;
    if metadata != "data:image/png;base64" && metadata != "data:image/jpeg;base64" {
        return Err("Unsupported screenshot image format".into());
    }

    let image_bytes = BASE64
        .decode(encoded_image)
        .map_err(|error| format!("Could not decode screenshot image: {error}"))?;
    fs::write(&file_path, image_bytes)
        .map_err(|error| format!("Could not write screenshot to {file_path}: {error}"))
}

#[tauri::command]
fn save_window_state(
    window: tauri::WebviewWindow,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let _guard = state
        .writes
        .lock()
        .map_err(|error| format!("Could not lock application data: {error}"))?;
    let path = state.app_data_dir.join("window-state.json");
    let previous = read_window_state(&path);
    let is_maximized = window
        .is_maximized()
        .map_err(|error| format!("Could not read maximized state: {error}"))?;

    let bounds = if is_maximized {
        let mut bounds = previous
            .map(|saved| saved.window_bounds)
            .unwrap_or(WindowBounds {
                x: None,
                y: None,
                width: 1000.0,
                height: 700.0,
                is_maximized: true,
            });
        bounds.is_maximized = true;
        bounds
    } else {
        let scale = window
            .scale_factor()
            .map_err(|error| format!("Could not read window scale factor: {error}"))?;
        let position = window
            .outer_position()
            .map_err(|error| format!("Could not read window position: {error}"))?;
        let size = window
            .inner_size()
            .map_err(|error| format!("Could not read window size: {error}"))?;
        WindowBounds {
            x: Some(f64::from(position.x) / scale),
            y: Some(f64::from(position.y) / scale),
            width: f64::from(size.width) / scale,
            height: f64::from(size.height) / scale,
            is_maximized: false,
        }
    };

    write_json_atomic(
        &path,
        &WindowState {
            window_bounds: bounds,
        },
    )
}

fn empty_user_data() -> UserData {
    UserData {
        mastered: HashMap::new(),
        components: HashMap::new(),
        settings: HashMap::new(),
        updated_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
    }
}

fn read_user_data(path: &Path) -> Option<UserData> {
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return None,
        Err(error) => {
            eprintln!("[data] Could not read {}: {error}", path.display());
            return None;
        }
    };

    let parsed: Value = match serde_json::from_str(&contents) {
        Ok(parsed) => parsed,
        Err(error) => {
            eprintln!("[data] Could not parse {}: {error}", path.display());
            return None;
        }
    };
    let data = parsed.get("userData").cloned().unwrap_or(parsed);
    match serde_json::from_value(data) {
        Ok(data) => Some(data),
        Err(error) => {
            eprintln!("[data] Invalid user data in {}: {error}", path.display());
            None
        }
    }
}

fn save_user_data_to_path(state: &AppState, data: &UserData) -> Result<(), String> {
    let _guard = state
        .writes
        .lock()
        .map_err(|error| format!("Could not lock application data: {error}"))?;
    write_json_atomic(&state.user_data_path, &json!({ "userData": data }))
}

fn write_json_atomic(path: &Path, value: &impl Serialize) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("Invalid data path: {}", path.display()))?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Could not create {}: {error}", parent.display()))?;
    let temporary_path = path.with_extension("json.tmp");
    let serialized = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("Could not serialize {}: {error}", path.display()))?;
    fs::write(&temporary_path, serialized)
        .map_err(|error| format!("Could not write {}: {error}", temporary_path.display()))?;
    #[cfg(windows)]
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("Could not replace {}: {error}", path.display()))?;
    }
    fs::rename(&temporary_path, path)
        .map_err(|error| format!("Could not replace {}: {error}", path.display()))
}

fn read_window_state(path: &Path) -> Option<WindowState> {
    let contents = fs::read_to_string(path).ok()?;
    serde_json::from_str(&contents).ok()
}

fn restore_window(window: &tauri::WebviewWindow, app_data_dir: &Path) {
    let current_state_path = app_data_dir.join("window-state.json");
    let legacy_state_path = app_data_dir.join("config.json");
    let state = read_window_state(&current_state_path).or_else(|| {
        let contents = fs::read_to_string(&legacy_state_path).ok()?;
        let value: Value = serde_json::from_str(&contents).ok()?;
        serde_json::from_value(value.get("windowBounds")?.clone())
            .ok()
            .map(|window_bounds| WindowState { window_bounds })
    });
    let Some(state) = state else {
        return;
    };
    let bounds = state.window_bounds;
    if !bounds.width.is_finite()
        || !bounds.height.is_finite()
        || bounds.width < 320.0
        || bounds.height < 240.0
    {
        eprintln!("[window] Ignoring invalid saved window dimensions");
        return;
    }
    if let Err(error) = window.set_size(tauri::LogicalSize::new(bounds.width, bounds.height)) {
        eprintln!("[window] Could not restore window size: {error}");
    }
    if let (Some(x), Some(y)) = (bounds.x, bounds.y) {
        if x.is_finite() && y.is_finite() {
            if let Err(error) = window.set_position(tauri::LogicalPosition::new(x, y)) {
                eprintln!("[window] Could not restore window position: {error}");
            }
        }
    }
    if bounds.is_maximized {
        if let Err(error) = window.maximize() {
            eprintln!("[window] Could not restore maximized state: {error}");
        }
    }
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(path) = std::env::var_os("APPDATA") {
            return Ok(PathBuf::from(path).join("warframe-tracker"));
        }
    }
    #[cfg(target_os = "macos")]
    {
        return app
            .path()
            .home_dir()
            .map(|path| path.join("Library/Application Support/warframe-tracker"))
            .map_err(|error| error.to_string());
    }
    #[cfg(not(target_os = "macos"))]
    app.path()
        .config_dir()
        .map(|path| path.join("warframe-tracker"))
        .map_err(|error| error.to_string())
}

fn screenshot_directories(app: &tauri::AppHandle) -> Vec<PathBuf> {
    let pictures = match app.path().picture_dir() {
        Ok(path) => path,
        Err(error) => {
            eprintln!("[screenshots] Could not locate Pictures directory: {error}");
            PathBuf::new()
        }
    };
    let home = match app.path().home_dir() {
        Ok(path) => path,
        Err(error) => {
            eprintln!("[screenshots] Could not locate home directory: {error}");
            PathBuf::new()
        }
    };
    let mut candidates = Vec::new();
    if let Some(path) = std::env::var_os("WARFRAME_SCREENSHOT_DIR") {
        candidates.push(PathBuf::from(path));
    }
    if !pictures.as_os_str().is_empty() {
        candidates.extend([
            pictures.join("Warframe"),
            pictures.join("Screenshots"),
            pictures.clone(),
        ]);
    }
    if !home.as_os_str().is_empty() {
        candidates.extend([
            home.join(".steam/steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/Pictures/Warframe"),
            home.join(".steam/debian-installation/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/Pictures/Warframe"),
            home.join(".local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/Pictures/Warframe"),
        ]);
    }
    let mut directories = Vec::new();
    for candidate in candidates {
        if !candidate.is_dir() {
            continue;
        }
        match fs::canonicalize(candidate) {
            Ok(path) if !directories.contains(&path) => directories.push(path),
            Ok(_) => {}
            Err(error) => {
                eprintln!("[screenshots] Could not resolve screenshot directory: {error}")
            }
        }
    }
    directories
}

fn is_screenshot_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "jpg" | "jpeg" | "png"
            )
        })
}

fn start_screenshot_watchers(app: &tauri::AppHandle, state: &AppState) {
    if state.screenshot_dirs.is_empty() {
        eprintln!("[screenshots] No screenshot directories are available to watch.");
        return;
    }
    let mut watchers = match state.watchers.lock() {
        Ok(watchers) => watchers,
        Err(error) => {
            eprintln!("[screenshots] Could not initialize watchers: {error}");
            return;
        }
    };
    for directory in &state.screenshot_dirs {
        let app = app.clone();
        let pending = Arc::clone(&state.pending_screenshots);
        let watched_directory = directory.clone();
        match notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
            let event = match result {
                Ok(event) if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_)) => {
                    event
                }
                Ok(_) => return,
                Err(error) => {
                    eprintln!("[screenshots] Watch error: {error}");
                    return;
                }
            };
            for path in event.paths {
                if path.parent() != Some(watched_directory.as_path()) || !is_screenshot_path(&path)
                {
                    continue;
                }
                let Ok(path) = fs::canonicalize(path) else {
                    continue;
                };
                let inserted = pending
                    .lock()
                    .map(|mut pending| pending.insert(path.clone()));
                if !matches!(inserted, Ok(true)) {
                    continue;
                }
                let app = app.clone();
                let pending = Arc::clone(&pending);
                thread::spawn(move || {
                    deliver_screenshot(&app, &path);
                    if let Ok(mut pending) = pending.lock() {
                        pending.remove(&path);
                    }
                });
            }
        }) {
            Ok(mut watcher) => match watcher.watch(directory, RecursiveMode::NonRecursive) {
                Ok(()) => watchers.push(watcher),
                Err(error) => eprintln!(
                    "[screenshots] Could not watch {}: {error}",
                    directory.display()
                ),
            },
            Err(error) => eprintln!(
                "[screenshots] Could not create watcher for {}: {error}",
                directory.display()
            ),
        }
    }
    eprintln!(
        "[screenshots] Watching directories: {}",
        state
            .screenshot_dirs
            .iter()
            .map(|path| path.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    );
}

fn deliver_screenshot(app: &tauri::AppHandle, path: &Path) {
    match read_stable_screenshot(path) {
        Ok(Some(bytes)) => {
            let mime_type = match path.extension().and_then(|extension| extension.to_str()) {
                Some(extension) if extension.eq_ignore_ascii_case("png") => "image/png",
                _ => "image/jpeg",
            };
            let capture = ScreenshotCapture {
                path: path.to_string_lossy().into_owned(),
                data_url: format!("data:{mime_type};base64,{}", BASE64.encode(bytes)),
                can_delete: path != app.state::<AppState>().debug_screenshot_path,
            };
            if let Err(error) = app.emit("screenshot-created", capture) {
                eprintln!(
                    "[screenshots] Could not send capture {}: {error}",
                    path.display()
                );
            }
        }
        Ok(None) => eprintln!(
            "[screenshots] Capture did not stabilize: {}",
            path.display()
        ),
        Err(error) => eprintln!("[screenshots] Could not load {}: {error}", path.display()),
    }
}

fn read_stable_screenshot(path: &Path) -> Result<Option<Vec<u8>>, std::io::Error> {
    let mut previous_size = None;
    for attempt in 0..10 {
        match fs::metadata(path) {
            Ok(metadata) if metadata.len() > 0 && Some(metadata.len()) == previous_size => {
                match fs::read(path) {
                    Ok(bytes) => return Ok(Some(bytes)),
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound && attempt < 9 => {}
                    Err(error) => return Err(error),
                }
            }
            Ok(metadata) => previous_size = Some(metadata.len()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound && attempt < 9 => {}
            Err(error) => return Err(error),
        }
        thread::sleep(Duration::from_millis(100));
    }
    Ok(None)
}

fn debug_screenshot_path(home: &Path) -> PathBuf {
    home.join(
        ".local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/Pictures/Warframe/Relics.jpg",
    )
}

#[tauri::command]
async fn fetch_thumbnail(
    app: tauri::AppHandle,
    image_name: String,
    size: u32,
) -> Result<Response, String> {
    const CDN_HOST: &str = "cdn.warframestat.us";
    const IMAGE_HOST: &str = "raw.githubusercontent.com";
    const MAX_IMAGE_BYTES: u64 = 20 * 1024 * 1024;
    if size == 0 || size > 1024 {
        return Err("Thumbnail size must be between 1 and 1024 pixels".into());
    }
    if image_name.is_empty()
        || image_name.starts_with('/')
        || image_name
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
        || !image_name
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "-_./".contains(character))
    {
        return Err("Invalid image name".into());
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|error| error.to_string())?
        .join("thumbs");
    fs::create_dir_all(&cache_dir)
        .map_err(|error| format!("Could not create thumbnail cache: {error}"))?;

    let key = format!(
        "{:x}",
        Sha256::digest(format!("{image_name}|{size}").as_bytes())
    );
    let cache_path = cache_dir.join(format!("{key}.png"));
    match fs::read(&cache_path) {
        Ok(cached) => return Ok(Response::new(cached)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => eprintln!("[thumbnails] Could not read cache: {error}"),
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if matches!(attempt.url().host_str(), Some(CDN_HOST | IMAGE_HOST)) {
                attempt.follow()
            } else {
                attempt.stop()
            }
        }))
        .build()
        .map_err(|error| error.to_string())?;
    let url = format!("https://{CDN_HOST}/img/{image_name}");
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;
    if response
        .content_length()
        .is_some_and(|length| length > MAX_IMAGE_BYTES)
    {
        return Err("Thumbnail image exceeds the 20 MiB download limit".into());
    }
    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    if bytes.len() as u64 > MAX_IMAGE_BYTES {
        return Err("Thumbnail image exceeds the 20 MiB download limit".into());
    }

    let png = tauri::async_runtime::spawn_blocking(move || -> Result<Vec<u8>, String> {
        let image = image::load_from_memory(&bytes).map_err(|error| error.to_string())?;
        let thumbnail = image.resize(size, size, FilterType::Lanczos3);
        let mut output = Cursor::new(Vec::new());
        thumbnail
            .write_to(&mut output, ImageFormat::Png)
            .map_err(|error| error.to_string())?;
        Ok(output.into_inner())
    })
    .await
    .map_err(|error| error.to_string())??;

    if let Err(error) = fs::write(&cache_path, &png) {
        eprintln!(
            "[thumbnails] Could not write cache {}: {error}",
            cache_path.display()
        );
    }
    Ok(Response::new(png))
}

pub fn run() {
    let f7_shortcut = Shortcut::new(None, Code::F7);
    let shortcut_for_handler = f7_shortcut.clone();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &shortcut_for_handler && event.state() == ShortcutState::Pressed
                    {
                        let app = app.clone();
                        let path = app.state::<AppState>().debug_screenshot_path.clone();
                        thread::spawn(move || deliver_screenshot(&app, &path));
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            load_user_data,
            save_user_data,
            get_user_data_path,
            delete_screenshot,
            save_screenshot_copy,
            save_window_state,
            fetch_thumbnail
        ])
        .setup(move |app| {
            let data_dir = app_data_dir(app.handle()).map_err(std::io::Error::other)?;
            fs::create_dir_all(&data_dir)?;
            let home_dir = app.path().home_dir().map_err(std::io::Error::other)?;
            let previous_user_data_path = app
                .path()
                .document_dir()
                .map_err(std::io::Error::other)?
                .join("Warframe Tracker")
                .join("user-data.json");
            let screenshot_dirs = screenshot_directories(app.handle());
            let state = AppState::new(
                data_dir.clone(),
                previous_user_data_path,
                screenshot_dirs,
                &home_dir,
            );
            app.manage(state);

            let window = app
                .get_webview_window("main")
                .ok_or_else(|| std::io::Error::other("main window is unavailable"))?;
            let window_icon =
                tauri::image::Image::from_bytes(include_bytes!("../icons/128x128.png"))?;
            window.set_icon(window_icon)?;
            restore_window(&window, &data_dir);
            start_screenshot_watchers(app.handle(), &app.state::<AppState>());
            app.global_shortcut().register(f7_shortcut.clone())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Warframe Tracker");
}
