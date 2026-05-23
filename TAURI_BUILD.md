# Tauri 桌面端打包指南

FinSpace Pro 支持使用 Tauri 打包为 Windows/macOS 桌面应用，获得更原生的体验和系统级功能支持。

## 前置依赖
1. 安装 Rust 环境：https://www.rust-lang.org/tools/install
2. 安装 Tauri CLI：`cargo install tauri-cli`

## 初始化 Tauri 项目
1. 在项目根目录运行：
```bash
cargo tauri init
```

2. 按照提示填写信息：
- 应用名称：FinSpace
- 窗口标题：FinSpace 个人理财管家
- 前端资源路径：`../dist`
- 开发前端命令：`npm run dev`
- 前端构建命令：`npm run build`

3. 初始化完成后会自动生成 `src-tauri` 目录

## 配置修改
### 1. 修改 `src-tauri/tauri.conf.json`
添加以下配置以支持本地存储、自动备份等功能：
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "FinSpace",
    "version": "1.1.0"
  },
  "tauri": {
    "allowlist": {
      "fs": {
        "all": true,
        "scope": ["$APPDATA/*", "$DOCUMENT/*"]
      },
      "path": {
        "all": true
      },
      "os": {
        "all": true
      },
      "notification": {
        "all": true
      }
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "FinSpace 个人理财管家",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ],
    "security": {
      "csp": null
    }
  }
}
```

### 2. 自动备份功能
Tauri 版本支持系统级自动备份，可在 `src-tauri/src/main.rs` 中添加定时备份逻辑：
```rust
use std::fs;
use std::path::PathBuf;
use tauri::api::path::app_data_dir;
use chrono::Local;

#[tauri::command]
fn auto_backup(data: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app_data_dir(&app_handle.config())
        .ok_or("无法获取应用数据目录")?;
    
    // 创建备份目录
    let backup_dir = app_dir.join("backups");
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
        .invoke_handler(tauri::generate_handler![auto_backup])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 打包应用
### 开发模式运行
```bash
cargo tauri dev
```

### 生产构建
```bash
cargo tauri build
```

构建完成后，安装包会生成在 `src-tauri/target/release/bundle` 目录下：
- Windows: `.msi` 安装包和便携版 `.exe`
- macOS: `.dmg` 磁盘镜像和 `.app` 应用
- Linux: `.deb` 和 `.AppImage` 包

## 特性增强
Tauri 桌面版相比网页版额外支持：
1. ✅ 系统级加密存储，数据更安全
2. ✅ 自动定时备份到本地目录
3. ✅ 系统通知提醒（还款日、定投日等）
4. ✅ 全局快捷键支持
5. ✅ 开机自启动选项
6. ✅ 文件关联支持，直接打开 `.enc` 加密备份文件
