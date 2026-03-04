@echo off
echo --- STARTING GIT UPDATE ---
git add .
set /p msg="Enter commit message: "
git commit -m "%msg%"
git push
echo --- DONE! ---
pause