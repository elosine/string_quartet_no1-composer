# Miscellaneous Notes

## Managing Servers in IDE Terminal (PowerShell)

### Kill All Node Servers at Once
```powershell
Stop-Process -Name node -Force
```
Kills every `node.exe` process — Workshop (:5000), engraving app (:3001), etc.

### Kill a Specific Port
```powershell
netstat -ano | findstr :5000
# Note the PID (last column), then:
Stop-Process -Id <PID> -Force
```

### Managing Multiple Servers in VS Code / Windsurf
- **Ctrl+Shift+`** — opens a new terminal
- Run one server per terminal (e.g., Terminal 1 = `node server.js` on :5000, Terminal 2 = engraving server on :3001)
- **Ctrl+C** in each terminal stops that server
- Click the trash icon on a terminal tab to kill it outright
- **Rename terminals** by clicking the tab name (e.g., "Workshop :5000", "Engraving :3001") to keep track
