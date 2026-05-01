#!/bin/bash
set -e

echo "🚀 Step 1: Building Vison CLI..."
cd vison-core && cargo build --quiet
cd ..

echo "🔍 Step 2: Validating example.vison.json..."
./vison-core/target/debug/vison example.vison.json

echo "🌐 Step 3: Launching Preview in Browser..."
# 这里我们直接使用 python 起一个简单的 server 来解决 fetch 跨域问题
# 如果没有 python，也可以尝试直接用 google-chrome --allow-file-access-from-files
python3 -m http.server 8080 > /dev/null 2>&1 &
SERVER_PID=$!

echo "Previewing at http://localhost:8080/playground.html"
# 自动打开浏览器
if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:8080/playground.html"
elif command -v open > /dev/null; then
    open "http://localhost:8080/playground.html"
fi

echo "Press Ctrl+C to stop the server."
wait $SERVER_PID
