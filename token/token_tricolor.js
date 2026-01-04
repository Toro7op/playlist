const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
    console.log("Запуск расширенной проверки (2026)...");
    const browser = await chromium.launch({ headless: true });
    
    // Эмулируем реальное устройство
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();
    let extractedToken = null;

    page.on('request', request => {
        if (request.url().includes('GetLivePlayList')) {
            const urlObj = new URL(request.url());
            extractedToken = urlObj.searchParams.get('drmreq');
            if (extractedToken) console.log("\n[!] ТОКЕН ПЕРЕХВАЧЕН!");
        }
    });

    try {
        console.log("Открытие страницы...");
        await page.goto('https://kino.tricolor.ru/channels/watch/pervyy-kanal/play/', { 
            waitUntil: 'networkidle', 
            timeout: 60000 
        });

        // 1. Пытаемся закрыть возможные всплывающие окна (куки, регионы)
        console.log("Проверка на наличие блокирующих баннеров...");
        try {
            const buttons = page.locator('button:has-text("Принять"), button:has-text("OK"), .close-button');
            if (await buttons.count() > 0) {
                await buttons.first().click();
                console.log("Баннер закрыт.");
            }
        } catch (e) { /* игнорируем если нет */ }

        // 2. Ждем токен
        console.log("Ожидание токена...");
        for (let i = 0; i < 40; i++) {
            if (extractedToken) break;
            
            // Каждые 5 секунд имитируем микродвижение мыши, если токена нет
            if (i % 5 === 0) await page.mouse.move(Math.random() * 500, Math.random() * 500);
            
            await page.waitForTimeout(1000);
        }

        if (extractedToken) {
            fs.writeFileSync('tri_token.txt', extractedToken);
            console.log("Готово! Файл tri_token.txt создан.");
        } else {
            console.log("Токен не найден. Делаю скриншот ошибки...");
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
