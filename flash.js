'use strict';

const puppeteer = require('puppeteer-core');
const path = require('path');


(async () => {
    function findChromiumExecutable(list) {
        const fs = require('fs');
        for (let file of list) {
            if (fs.existsSync(file)) {
                return file;
            }
        }
    }

    let chromiumExecutablePath = null;
    switch (require('os').platform()) {
        case 'darwin':
            chromiumExecutablePath = findChromiumExecutable([
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
                '/Applications/Chromium.app/Contents/MacOS/Chromium',
                '/usr/bin/google-chrome-stable',
                '/usr/bin/google-chrome',
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser'
            ]);
            break;
        case 'linux':
            chromiumExecutablePath = findChromiumExecutable([
                '/usr/bin/google-chrome-stable',
                '/usr/bin/google-chrome',
                '/usr/bin/chromium',
                '/usr/bin/chromium-browser',
                '/snap/bin/chromium'
            ]);
            break;
        case 'win32':
            chromiumExecutablePath = findChromiumExecutable([
                process.env['LOCALAPPDATA'] + '/Google/Chrome/Application/chrome.exe',
                process.env['ProgramFiles'] + '/Google/Chrome/Application/chrome.exe',
                process.env['ProgramFiles(x86)'] + '/Google/Chrome/Application/chrome.exe',
                process.env['LOCALAPPDATA'] + '/Chromium/Application/chrome.exe',
                process.env['ProgramFiles'] + '/Chromium/Application/chrome.exe',
                process.env['ProgramFiles(x86)'] + '/Chromium/Application/chrome.exe',
                process.env['ProgramFiles(x86)'] + '/Microsoft/Edge/Application/msedge.exe'
            ]);
            break;
    }

    if (!chromiumExecutablePath) {
        console.log('[!] 找不到 Chromium 可执行文件路径');
        process.exit(0);
    }

    const userData = path.join(require('os').tmpdir(), 'YktFlash_HNU');
    const extension = path.join(__dirname, 'extension');
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: chromiumExecutablePath,
        defaultViewport: {
            width: 1440,
            height: 900
        },
        ignoreDefaultArgs: [ '--disable-extensions' ],
        args: [
            `--user-data-dir=${userData}`,
            `--load-extension=${extension}`
        ]
    });
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(function () {
        window.open = new Proxy(
            window.open, {
                apply(target, context, args) {
                    window.location.href = args[0];
                    return null;
                }
            }
        );
    });

    // 打开网页并登录
    console.log('[*] 正在跳转到登录页');
    try {
        await page.goto('https://hnu.yuketang.cn/pro/courselist');
        await (await page.waitForSelector('.login-btn', { timeout: 5000 })).click();
    } catch (err) { console.log('[!] 宁已经登录啦！'); }

    console.log('[*] 等待进入课程任务');
    while (true) {
        try {
            await page.waitForSelector('.btn-next > span', { timeout: 30000 });
        } catch (err) {
            break;
        }

        await page.waitForSelector('.header-bar .text-ellipsis');
        let title = await page.$eval('.header-bar .text-ellipsis', dom => dom.innerHTML);
        console.log(`[*] 正在播放：${title}`);

        if (page.url().match(/https?:\/\/.*\/video\/.*/)) {
            try {
                await page.waitForSelector('.progress-wrap i.icon--gou', { timeout: 5000 });
                console.log('[*] 该视频已经看过啦，即将播放下一个');
                await page.click('.btn-next > span');
                await page.waitForTimeout(2000);
            } catch (err) {
                if (await page.$eval('video', video => video['playbackRate'] !== 2)) {
                    console.log('[*] 尝试开启二倍速');
                    let speed = await page.waitForSelector('li[data-speed="2"]', {timeout: 0, visible: false});
                    await speed.click();
                } else {
                    console.log('[*] 等待视频播放完毕');
                    await page.waitForFunction(
                        function () {
                            let video = document.querySelector('video');
                            return video['currentTime'] === video['duration'];
                        }, { timeout: 0 }
                    );
                }
            }
        } else {
            console.log('[*] 不是视频，下一个');
            await page.click('.btn-next');
            await page.waitForTimeout(2000);
        }
    }
})();