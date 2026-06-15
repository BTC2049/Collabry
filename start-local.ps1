$python = "C:\Users\zzw\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
Start-Process "http://localhost:4173"
& $python -m http.server 4173 --directory $PSScriptRoot
