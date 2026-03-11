# OneDrive Migration Guide — Move Project Out of OneDrive

## Why Move?

Your project lives at `C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer`.
This happened because Windows redirected your `Documents` folder to `C:\Users\jwloy\OneDrive\Documents`
(a registry-level redirect: `HKCU\...\User Shell Folders\Personal` → `OneDrive\Documents`).

**Impact:**
- Every file write triggers OneDrive sync (scores are 22.6 MB each)
- Auto-save + version backup = ~45-68 MB of disk I/O per save, all synced to cloud
- 516 score files + 1,095 version files = **21.8 GB** of scores alone, all synced
- Total project size: **30 GB** (including 2.9 GB `.git` directory)
- New-name saves are especially slow because OneDrive must upload the full file fresh (no delta)

## Current Setup

- **Project path:** `C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer`
- **Git remote:** `https://github.com/elosine/string_quartet_no1-composer.git`
- **Git dir:** `.git` (standard, inside project folder)
- **Available disk space:** C: drive has 180 GB free, D: "sushi" has 270 GB free

## Recommended New Location

```
C:\Users\jwloy\GitHub\string_quartet_no1-composer
```

This mirrors the original path structure but sits directly under your user profile, **outside** OneDrive.
Alternative: `D:\GitHub\string_quartet_no1-composer` if you prefer the larger drive.

## Migration Steps

### Step 1: Close everything

- Close **Windsurf** completely
- Close **WebStorm** if open
- **Stop the Node server** (`Ctrl+C` in the terminal running `node server.js`)

### Step 2: Open a regular PowerShell window

Open PowerShell from the Start menu (not inside any IDE).

### Step 3: Create the destination directory (if needed)

```powershell
New-Item -ItemType Directory -Path "C:\Users\jwloy\GitHub" -ErrorAction SilentlyContinue
```

### Step 4: Move the project

```powershell
Move-Item "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer" "C:\Users\jwloy\GitHub\string_quartet_no1-composer"
```

> **Note:** Since both source and destination are on the same drive (C:), this should be
> nearly instant — Windows just updates the directory pointer, it does NOT copy 30 GB of data.
>
> If the move fails because files are locked, make sure all IDEs and the server are truly closed.
> You can also try restarting OneDrive first: right-click OneDrive tray icon → Quit OneDrive.

### Step 5: Verify git works

```powershell
cd C:\Users\jwloy\GitHub\string_quartet_no1-composer
git status
git log --oneline -1
```

You should see:
```
4c19b0e6 Pre-optimization revert point: all current work (scores 1056-1975, CLB/BP/BOP templates, version files) - SAFE REVERT POINT before performance optimizations
```

## After the Move

### Reopen in IDEs
- **Windsurf:** File → Open Folder → `C:\Users\jwloy\GitHub\string_quartet_no1-composer`
- **WebStorm:** File → Open → same path

### What won't break
- **Git** — the `.git` folder moves with the project; remote URLs are stored inside `.git/config` and don't reference the local path
- **GitHub** — completely unaffected, it only knows about the remote
- **Windsurf/Cascade** — just reopen the folder from the new location
- **WebStorm** — same, just "Open" the new directory
- **Node/npm** — `node_modules` is relative; run `npm install` if needed
- **All file references in code** — `server.js` uses `__dirname` and relative paths (`path.join(__dirname, 'scores')`) so nothing breaks
- **LilyPond** — uses relative paths from the project root

### Clean up OneDrive (optional, after confirming everything works)
1. The old folder may still exist as a cloud-only copy on OneDrive
2. After confirming the move works perfectly, you can delete the cloud copy from [OneDrive web](https://onedrive.live.com)
3. Consider turning off "Documents folder backup" in OneDrive:
   - OneDrive tray icon → Settings → Sync and backup → Manage backup → turn off **Documents**
   - This prevents future projects from accidentally landing in OneDrive

## Revert Plan

If anything goes wrong, just move it back:

```powershell
Move-Item "C:\Users\jwloy\GitHub\string_quartet_no1-composer" "C:\Users\jwloy\OneDrive\Documents\GitHub\string_quartet_no1-composer"
```

The git commit `4c19b0e6` is your safe revert point for all code changes.
