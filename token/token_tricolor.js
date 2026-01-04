const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

async function run() {
    console.log("Запуск в режиме Stealth (Январь 2026)...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    let extractedToken = null;

    // Перехват сетевого запроса
    page.on('request', request => {
        const url = request.url();
        if (url.includes('GetLivePlayList')) {
            try {
                const urlObj = new URL(url);
                const token = urlObj.searchParams.get('drmreq');
                if (token) {
                    extractedToken = token;
                    console.log("\n[!] ТОКЕН ОБНАРУЖЕН В СЕТЕВОМ ТРАФИКЕ");
                }
            } catch (e) { }
        }
    });

    try {
        console.log("Переход на страницу канала...");
        // ИСПРАВЛЕНО: удалена лишняя кавычка
        await page.goto('https://kino.tricolor.ru/channels/watch/pervyy-kanal/play/', { 
            waitUntil: 'load', 
            timeout: 90000 
        });

        console.log("Эмуляция активности для запуска плеера...");
        await page.mouse.move(640, 360);
        await page.mouse.down();
        await page.mouse.up();

        console.log("Ожидание токена (до 60 секунд)...");
        for (let i = 0; i < 60; i++) {
            if (extractedToken) break;
            if (i % 10 === 0) {
                // Пытаемся закрыть возможные баннеры "Принять куки"
                const btn = page.locator('button:has-text("Принять"), .close-button').first();
                if (await btn.isVisible()) await btn.click();
            }
            await page.waitForTimeout(1000);
        }

        if (extractedToken) {
            console.log("Успех! Записываю файл tri_token.txt");
            fs.writeFileSync('tri_token.txt', extractedToken);
        } else {
            console.log("Токен не найден. Сохраняю скриншот для отладки...");
            await page.screenshot({ path: 'error_page.png' });
            process.exit(1);
        }
    } catch (err) {
        console.error("Критическая ошибка:", err.message);
        await page.screenshot({ path: 'error_page.png' }).catch(() => {});
        process.exit(1);
    } finally {
        await browser.close();
        console.log("Браузер закрыт.");
    }
}

run();
