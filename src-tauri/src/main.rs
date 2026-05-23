// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use chrono::Local;
use tauri::api::path::app_data_dir;

#[tauri::command]
fn auto_backup(data: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app_data_dir(&app_handle.config())
        .ok_or("无法获取应用数据目录")?;
    
    // 创建备份目录
    let backup_dir = app_dir.join("FinSpace").join("backups");
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    
    // 生成备份文件名
    let date = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_path = backup_dir.join(format!("finspace_backup_{}.json", date));
    
    // 保存备份
    fs::write(&backup_path, data).map_err(|e| e.to_string())?;
    
    // 只保留最近7天的备份
    let mut backups = fs::read_dir(&backup_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().unwrap_or_default() == "json")
        .collect::<Vec<_>>();
    
    backups.sort_by_key(|e| e.metadata().unwrap().created().unwrap());
    
    if backups.len() > 7 {
        for old_backup in backups.iter().take(backups.len() - 7) {
            let _ = fs::remove_file(old_backup.path());
        }
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![auto_backup])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
