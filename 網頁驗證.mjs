// 開發驗證工具；遊戲本身全部由星泉編譯的位元碼執行。
import {createServer as 建立伺服器} from 'node:http';
import {readFile as 讀檔, writeFile as 寫檔, mkdir as 建立目錄} from 'node:fs/promises';
import 路徑 from 'node:path';
import {fileURLToPath as 檔案網址路徑, pathToFileURL as 路徑網址} from 'node:url';
import 驗證 from 'node:assert/strict';
const 根目錄 = 路徑.dirname(檔案網址路徑(import.meta.url));
const 參考目錄 = process.env.AQUARIUS_REFERENCE ?? 'C:/OfficialProjects/AquariusLangTW';
const {chromium: 瀏覽核心} = await import(路徑網址(路徑.join(參考目錄, 'AquariusWebCompiler/node_modules/playwright/index.mjs')).href);
const 網頁目錄 = 路徑.join(根目錄, 'web');
const 結果目錄 = 路徑.join(根目錄, '驗證結果');
const 結果 = [], 錯誤 = [];
const 類型 = {'.html':'text/html', '.mjs':'text/javascript', '.json':'application/json', '.wasm':'application/wasm'};
const 伺服器 = 建立伺服器(async (請求, 回應) => {
    try {
        const 網址 = new URL(請求.url, 'http://localhost');
        const 請求路徑 = decodeURIComponent(網址.pathname);
        const 檔案 = 路徑.resolve(網頁目錄, '.' + 請求路徑 + (請求路徑.endsWith('/') ? 'index.html' : ''));
        if (!檔案.startsWith(網頁目錄 + 路徑.sep)) throw Error('越界');
        回應.setHeader('Content-Type', 類型[路徑.extname(檔案)] ?? 'application/octet-stream');
        回應.end(await 讀檔(檔案));
    } catch { 回應.statusCode = 404; 回應.end('找不到檔案'); }
});
await 建立目錄(結果目錄, {recursive:true});
await new Promise(完成 => 伺服器.listen(0, '127.0.0.1', 完成));
const 網址 = `http://127.0.0.1:${伺服器.address().port}/`;
let 瀏覽器;
const 通過 = 名稱 => { 結果.push(名稱); console.log('通過：' + 名稱); };
try {
    瀏覽器 = await 瀏覽核心.launch({channel:process.env.AQUARIUS_BROWSER ?? 'chrome', headless:true, args:['--enable-unsafe-webgpu']});
    const 情境 = await 瀏覽器.newContext({viewport:{width:1240, height:860}});
    const 頁面 = await 情境.newPage();
    頁面.on('pageerror', 錯 => 錯誤.push(錯.message));
    頁面.on('console', 訊息 => { if (訊息.type() === 'error') 錯誤.push(訊息.text()); });
    const 等待畫面 = () => 頁面.waitForFunction(() => window.aquarius?.host?.processing.frameCount >= 2);
    const 安裝測試時鐘 = () => 頁面.evaluate(() => {
        window.驗證時刻 = 1000;
        window.aquarius.host.processing.module.scope.create('毫秒', () => ({type:'double', value:window.驗證時刻}));
    });
    const 讀狀態 = () => 頁面.evaluate(() => {
        const 環境 = window.aquarius.host.processing.events.get('keyPressed').env;
        const 局面 = 環境.get('局面');
        const 解值 = 值 => Array.isArray(值) ? 值.map(解值) : 值?.type === 'int' || 值?.type === 'double' ? 值.value : 值;
        const 資料 = Object.fromEntries([...局面.values()].map(([鍵, 值]) => [鍵, 解值(值)]));
        資料.最高紀錄 = 解值(環境.get('最高紀錄'));
        return 資料;
    });
    const 等狀態 = 狀態 => 頁面.waitForFunction(狀態 => {
        const 環境 = window.aquarius?.host?.processing?.events.get('keyPressed')?.env;
        return 環境?.get('局面').get('string:狀態')[1] === 狀態;
    }, 狀態);
    const 點擊 = async (左, 上) => {
        const 座標 = await 頁面.evaluate(([左, 上]) => {
            const 環境 = window.aquarius.host.processing.events.get('keyPressed').env;
            const 值 = 名稱 => { const 原值 = 環境.get(名稱); return 原值?.value ?? 原值; };
            return [值('邊左') + 左 * 值('比例'), 值('邊上') + 上 * 值('比例')];
        }, [左, 上]);
        await 頁面.mouse.click(...座標);
        await 頁面.waitForFunction(() => window.aquarius.host.processing.eventQueue.length === 0);
    };
    const 步進 = async () => 頁面.evaluate(async () => {
        const 主機 = window.aquarius.host;
        const 環境 = 主機.processing.events.get('keyPressed').env;
        window.驗證時刻 += 200;
        await 主機.runtime.invoke(環境.get('更新遊戲'));
    });
    await 頁面.goto(網址); await 等待畫面(); await 安裝測試時鐘();
    驗證.equal((await 讀狀態()).狀態, '準備');
    驗證.equal(await 頁面.title(), '青芽・貪吃蛇');
    驗證.equal(await 頁面.locator('html').getAttribute('lang'), 'zh-Hant');
    驗證.equal(await 頁面.locator('textarea').getAttribute('aria-label'), '遊戲鍵盤輸入');
    通過('正式網頁自動啟動及繁體中文外殼');
    const 色數 = await 頁面.evaluate(async () => {
        const 像素 = await window.aquarius.host.processing.screen.target.readPixels();
        const 顏色 = new Set();
        for (let 項 = 0; 項 < 像素.length; 項 += 4) 顏色.add(`${像素[項]},${像素[項+1]},${像素[項+2]}`);
        return 顏色.size;
    });
    驗證.ok(色數 > 30); 通過('實際圖形處理器畫面與中文文字渲染');
    await 頁面.screenshot({path:路徑.join(結果目錄, '網頁桌面.png')});
    await 點擊(850, 526); await 等狀態('進行');
    await 頁面.keyboard.press('ArrowUp');
    await 頁面.waitForFunction(() => window.aquarius.host.processing.events.get('keyPressed').env.get('局面').get('string:佇列')[1].length === 1);
    await 步進(); 驗證.equal((await 讀狀態()).方向, 0);
    通過('開始按鈕與實際方向鍵事件');
    await 頁面.keyboard.press('Space'); await 等狀態('暫停');
    const 暫停頭 = (await 讀狀態()).蛇身[0]; await 步進();
    驗證.deepEqual((await 讀狀態()).蛇身[0], 暫停頭);
    await 點擊(850, 526); await 等狀態('進行'); 通過('空白鍵暫停及按鈕繼續');
    await 點擊(660, 370); 驗證.equal((await 讀狀態()).速度, 1); 通過('進行時鎖定模式');
    await 點擊重設();
    async function 點擊重設() { await 點擊(850, 585); await 等狀態('準備'); }
    await 點擊(1030, 370); 驗證.equal((await 讀狀態()).速度, 2);
    await 點擊(955, 451); 驗證.equal((await 讀狀態()).穿牆, true); 通過('重新開始及速度邊界選擇');
    await 點擊(850, 526); await 等狀態('進行');
    for (let 步 = 0; 步 < 12; 步++) await 步進();
    驗證.equal((await 讀狀態()).狀態, '進行'); 通過('穿越邊界實際更新');
    await 點擊重設(); await 點擊(700, 451); await 點擊(850, 526); await 等狀態('進行');
    for (let 步 = 0; 步 < 12; 步++) await 步進();
    await 等狀態('結束'); 通過('撞牆結束畫面');
    await 頁面.screenshot({path:路徑.join(結果目錄, '網頁結束.png')});
    await 點擊(850, 526); await 等狀態('進行'); 通過('結束後再玩一次');
    await 點擊重設();
    // 以同一份規則建立吃果場景，再由正式更新函式觸發成長與紀錄寫入。
    await 頁面.evaluate(async () => {
        const 主機 = window.aquarius.host, 環境 = 主機.processing.events.get('keyPressed').env;
        const 原局 = 環境.get('局面'), 蛇身 = 原局.get('string:蛇身')[1], 頭 = 蛇身[0];
        const 果實 = [{type:'int',value:頭[0].value+1}, 頭[1]];
        const 規則 = 環境.get('規則').scope;
        const 新局 = await 主機.runtime.invoke(規則.get('建立狀態'), [原局, 蛇身, {type:'int',value:1}, [], 果實, {type:'int',value:0}, '進行', '', {type:'int',value:99}]);
        環境.set('局面', 新局);
        環境.set('前次時間', {type:'double',value:window.驗證時刻});
        環境.set('累積時間', {type:'int',value:0});
    });
    await 步進(); 驗證.equal((await 讀狀態()).分數, 10);
    驗證.equal((await 讀狀態()).最高紀錄[2], 10); 通過('成長得分及最高紀錄寫入');
    await 頁面.reload(); await 等待畫面(); await 安裝測試時鐘();
    驗證.equal((await 讀狀態()).最高紀錄[2], 10); 通過('重新載入後紀錄保留且六模式分開');
    await 頁面.setViewportSize({width:390,height:844});
    await 頁面.waitForFunction(() => window.aquarius.host.processing.events.get('keyPressed').env.get('直式') === true);
    await 頁面.screenshot({path:路徑.join(結果目錄, '網頁手機.png')});
    await 點擊(215, 785); await 等狀態('進行');
    await 點擊(215, 912); await 步進(); 驗證.equal((await 讀狀態()).方向, 0); 通過('手機直式版面與方向按鈕');
    await 頁面.keyboard.press('Space'); await 等狀態('暫停');
    await 頁面.setViewportSize({width:900,height:560});
    await 頁面.waitForFunction(() => window.aquarius.host.processing.screen.width === 900);
    驗證.equal((await 讀狀態()).狀態, '暫停'); 通過('暫停時調整視窗尺寸');
    await 頁面.setViewportSize({width:1240,height:860});
    await 點擊(850,526); await 等狀態('進行');
    await 頁面.evaluate(async () => { window.驗證時刻 += 2000; await window.aquarius.host.runtime.invoke(window.aquarius.host.processing.events.get('keyPressed').env.get('更新遊戲')); });
    await 等狀態('暫停'); 通過('分頁停頓時自動暫停');
    驗證.deepEqual(錯誤, []); 驗證.equal(await 頁面.locator('#error').isHidden(), true); 通過('無瀏覽器錯誤');
    await 頁面.evaluate(() => window.aquarius.stop());
    驗證.equal(await 頁面.locator('canvas,textarea').count(), 0); 通過('停止時釋放畫布及輸入資源');
    await 寫檔(路徑.join(結果目錄,'網頁驗證.json'), JSON.stringify({通過:真值(), 項數:結果.length, 驗證:結果, 錯誤}, null, 2));
    function 真值() { return true; }
    console.log(`網頁驗證全部通過，共 ${結果.length} 項。`);
} finally {
    await 瀏覽器?.close();
    await new Promise(完成 => 伺服器.close(完成));
}
