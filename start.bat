@echo off
echo Starting Guloogulu Blink-to-Type Server...
start http://localhost:8080/index.html
npx -y http-server . -p 8080 -c-1
