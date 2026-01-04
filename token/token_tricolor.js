const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const fs = require('fs');

chromium.use(stealth);

async function run() {
    console.log("Запуск в режиме Stealth (2026)...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    let extractedToken = null;

    page.on('request', request => {
        if (request.url().includes('GetLivePlayList')) {
            const urlObj = new URL(request.url());
            extractedToken = urlObj.searchParams.get('drmreq');
        }
    });

    try {
        console.log("Переход на страницу...");
        await page.goto(''https://kino.tricolor.ru/channels/watch/pervyy-kanal/play/', { 
            waitUntil: 'load', 
            timeout: 90000 
        });

        // Эмуляция движения и клика для активации плеера
        console.log("Эмуляция активности...");
        await page.mouse.move(100, 100);
        await page.mouse.down();
        await page.mouse.up();

        // Ждем дольше, так как в облаке плеер грузится медленно
        for (let i = 0; i < 60; i++) {
            if (extractedToken) break;
            await page.waitForTimeout(1000);
        }

        if (extractedToken) {
            console.log("Токен получен!");
            fs.writeFileSync('tri_token.txt', extractedToken);
        } else {
            console.log("Токен не найден. Сохраняю скриншот...");
            await page.screenshot({ path: 'error_page.png' });
            process.exit(1);
        }
    } catch (err) {
        console.error("Ошибка:", err.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}
run();
