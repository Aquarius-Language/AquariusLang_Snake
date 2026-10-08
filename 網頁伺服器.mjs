// 僅提供 ./web 的靜態檔案；遊戲不需要後端。
import {createServer as 建立伺服器} from 'node:http';
import {readFile as 讀檔} from 'node:fs/promises';
import 路徑 from 'node:path';
import {fileURLToPath as 檔案網址路徑} from 'node:url';
const 網頁目錄 = 路徑.join(路徑.dirname(檔案網址路徑(import.meta.url)), 'web');
const 連接埠 = Number(process.argv[2] ?? 8080);
if (!Number.isInteger(連接埠) || 連接埠 < 1 || 連接埠 > 65535) throw Error('連接埠必須介於一至六五五三五。');
const 類型 = {'.html':'text/html; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.wasm':'application/wasm', '.txt':'text/plain; charset=utf-8'};
const 伺服器 = 建立伺服器(async (請求, 回應) => {
    try {
        const 請求路徑 = decodeURIComponent(new URL(請求.url, 'http://localhost').pathname);
        const 檔案 = 路徑.resolve(網頁目錄, '.' + 請求路徑 + (請求路徑.endsWith('/') ? 'index.html' : ''));
        if (!檔案.startsWith(網頁目錄 + 路徑.sep)) throw Error('越界');
        const 內容 = await 讀檔(檔案);
        回應.setHeader('Content-Type', 類型[路徑.extname(檔案)] ?? 'application/octet-stream');
        回應.setHeader('X-Content-Type-Options', 'nosniff');
        回應.end(內容);
    } catch { 回應.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); 回應.end('找不到檔案。'); }
});
伺服器.on('error', 錯誤 => { console.error('無法啟動伺服器：' + 錯誤.message); process.exitCode = 1; });
伺服器.listen(連接埠, '127.0.0.1', () => console.log(`青芽・貪吃蛇：http://localhost:${連接埠}`));
