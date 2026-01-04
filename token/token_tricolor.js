const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let extractedToken = null;

    page.on('request', request => {
        if (request.url().includes('GetLivePlayList')) {
            const url = new URL(request.url());
            extractedToken = url.searchParams.get('drmreq');
        }
    });

    try {
        await page.goto('https://kino.tricolor.ru/channels/watch/pervyy-kanal/play/', { waitUntil: 'networkidle' });
        
        for (let i = 0; i < 30; i++) {
            if (extractedToken) break;
            await page.waitForTimeout(1000);
        }

         if (extractedToken) {
            console.log("Токен получен!");
            // Сохраняем просто в текущую рабочую директорию
            fs.writeFileSync('tri_token.txt', extractedToken);
            console.log("Файл tri_token.txt создан в: " + process.cwd());
        }
    } finally {
        await browser.close();
    }
}
run();
