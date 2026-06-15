// ==UserScript==
// @name         SEO Index Counter (Google & Yandex)
// @namespace    https://github.com/xxrxtnxxov/Index-Counter-Y-G
// @version      4.7
// @description  SEO-счетчик: показывает количество проиндексированных страниц в выдаче Google и Яндекса.
// @author       xxrxtnxxov
// @license      MIT
// @match        *://*.google.com/search*
// @match        *://*.google.ru/search*
// @match        *://yandex.ru/search*
// @match        *://ya.ru/search*
// @icon         https://github.com/xxrxtnxxov/Index-Counter-Y-G/blob/main/index.jpg?raw=true
// @updateURL    https://github.com/xxrxtnxxov/Index-Counter-Y-G/raw/refs/heads/main/index.userscript.js
// @downloadURL  https://github.com/xxrxtnxxov/Index-Counter-Y-G/raw/refs/heads/main/index.userscript.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let lastCount = null;
    let observer = null;
    let lastUrl = location.href;

    function createBadge(id, textHtml, bgColor, borderStyle, textColor) {
        const div = document.createElement('div');
        div.id = id;
        div.style.cssText = `
            display: flex;
            align-items: center;
            flex: 0 0 auto;
            padding: 0 16px;
            margin: 0 8px;
            background: ${bgColor};
            border: ${borderStyle};
            border-radius: 24px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: ${textColor};
            white-space: nowrap;
            height: 44px;
            box-sizing: border-box;
            z-index: 99999;
        `;
        div.innerHTML = textHtml;
        return div;
    }

    function safeDOMUpdate(action) {
        if (observer) observer.disconnect();
        action();
        if (observer) {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    function checkUrlChange() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            lastCount = null;
            safeDOMUpdate(() => {
                document.getElementById('custom-stats-counter')?.remove();
                document.getElementById('custom-yandex-counter')?.remove();
            });
        }
    }

    // === GOOGLE ===
    function showGoogleStats() {
        let cleanCount = null;
        const pageHtml = document.documentElement.innerHTML;
        const match = pageHtml.match(/Результатов:\s*примерно\s*([^<"\\{]{1,40})/);

        if (match && match[1]) {
            cleanCount = match[1].replace(/[^\d\s]/g, '').trim();
        } else if (/(ничего не найдено|did not match any documents)/i.test(pageHtml)) {
            cleanCount = '0';
        }

        let badge = document.getElementById('custom-stats-counter');

        if (!cleanCount) {
            if (badge) {
                safeDOMUpdate(() => badge.remove());
                lastCount = null;
            }
            return;
        }

        const badgeHtml = `Индекс G: <span style="color: #8ab4f8; font-weight: bold; margin-left: 6px;">${cleanCount}</span>`;

        if (!badge) {
            const searchBar = document.querySelector('.RNNXgb');
            if (!searchBar) return;

            safeDOMUpdate(() => {
                badge = createBadge(
                    'custom-stats-counter',
                    badgeHtml,
                    '#303134',
                    '1px solid #5f6368',
                    '#e8eaed'
                );

                // Плашка не участвует в layout Google и не сдвигает popup подсказок.
                badge.style.position = 'absolute';
                badge.style.left = 'calc(100% + 8px)';
                badge.style.top = '0';
                badge.style.margin = '0';
                badge.style.pointerEvents = 'none';
                searchBar.appendChild(badge);
            });
            lastCount = cleanCount;
        } else if (lastCount !== cleanCount) {
            safeDOMUpdate(() => {
                badge.innerHTML = badgeHtml;
            });
            lastCount = cleanCount;
        }
    }

    // === YANDEX ===
    function findYandexAdvancedSearchButton() {
        return document.querySelector(
            'button[aria-label="Расширенный поиск"], ' +
            'button[title="Расширенный поиск"], ' +
            'button[class*="Actions-AdvancedSearch"]'
        );
    }

    function showYandexStats() {
        let cleanCount = null;
        const titleText = document.title || '';

        if (/ничего не найдено/i.test(titleText)) {
            cleanCount = '0';
        } else {
            const titleMatch = titleText.match(/(?:наш[а-яё]+|найдено)\s+(.*?)\s+(?:результ|ответ)/i);
            if (titleMatch && titleMatch[1]) {
                cleanCount = titleMatch[1].trim();
            } else {
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                let node;

                while ((node = walker.nextNode())) {
                    const text = node.nodeValue.trim();
                    if (/ничего не (?:нашли|найдено)/i.test(text)) {
                        cleanCount = '0';
                        break;
                    }

                    const nodeMatch = text.match(
                        /(?:наш[а-яё]+|найдено)\s+([\d\s\u00A0\xA0]+(?:тыс|млн)?\.?)\s*(?:результ|ответ|страниц)/i
                    );
                    if (nodeMatch && nodeMatch[1]) {
                        cleanCount = nodeMatch[1].trim();
                        break;
                    }
                }
            }
        }

        let badge = document.getElementById('custom-yandex-counter');

        if (!cleanCount) {
            if (badge) {
                safeDOMUpdate(() => badge.remove());
                lastCount = null;
            }
            return;
        }

        const badgeHtml = `Индекс Я: <span style="color: #ff5c5c; font-weight: bold; margin-left: 6px;">${cleanCount}</span>`;

        if (!badge) {
            const targetBtn = findYandexAdvancedSearchButton();
            if (!targetBtn) return;

            safeDOMUpdate(() => {
                badge = createBadge(
                    'custom-yandex-counter',
                    badgeHtml,
                    '#222224',
                    '2px solid #fc0',
                    '#e8eaed'
                );
                targetBtn.insertAdjacentElement('afterend', badge);
            });
            lastCount = cleanCount;
        } else if (lastCount !== cleanCount) {
            safeDOMUpdate(() => {
                badge.innerHTML = badgeHtml;
            });
            lastCount = cleanCount;
        }
    }

    // === ДИСПЕТЧЕР ===
    let isRunning = false;

    function init() {
        if (isRunning) return;
        isRunning = true;

        try {
            checkUrlChange();

            const host = window.location.hostname;
            if (host.includes('google.')) {
                showGoogleStats();
            } else if (host.includes('yandex.ru') || host.includes('ya.ru')) {
                showYandexStats();
            }
        } finally {
            isRunning = false;
        }
    }

    observer = new MutationObserver(init);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setInterval(init, 1000);
    init();
})();
