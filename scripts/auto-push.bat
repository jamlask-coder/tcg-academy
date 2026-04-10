@echo off
cd /d "C:\Users\jamla\tcg-academy"
git status --short > "%TEMP%\gitstatus.txt" 2>&1
for /f %%i in ("%TEMP%\gitstatus.txt") do set size=%%~zi
if %size% GTR 0 (
    git add .
    git commit -m "auto: sync changes %date% %time%"
    git push origin master
)
