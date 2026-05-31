console.log('TEMU helper background started');

const CAPTURED_REQUEST_URLS = [
  'https://agentseller.temu.com/visage-agent-seller/product/prop/adjust/task/reject',
  'https://agentseller.temu.com/visage-agent-seller/product/prop/adjust/task/pageQuery',
  'https://agentseller.temu.com/visage-agent-seller/product/skc/pageQuery',
  'https://agentseller.temu.com/visage-agent-seller/product/remove',
  'https://agentseller.temu.com/mms/venom/api/supplier/purchase/manager/querySubOrderList',
  'https://agentseller.temu.com/bg-luna-agent-seller/goods/quality/supplyChain/qualityMetrics/pageQuery',
  'https://agentseller.temu.com/mms/venom/api/supplier/sales/management/listOverall'
];
let latestRejectRequestMeta = null;

chrome.action.onClicked.addListener((tab) => {
  const managerUrl = new URL(chrome.runtime.getURL('popup.html'));

  if (tab && typeof tab.id === 'number') {
    managerUrl.searchParams.set('tabId', String(tab.id));
  }

  chrome.windows.create({
    url: managerUrl.toString(),
    type: 'popup',
    width: 620,
    height: 860
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'getTemuCookies') {
    getTemuCookies(sender.tab)
      .then((cookieData) => {
        sendResponse({ success: true, data: cookieData });
      })
      .catch((error) => {
        console.error('Cookie error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'debugCookies') {
    debugAllCookies().then((result) => {
      sendResponse({ success: true, data: result });
    });
    return true;
  }

  if (request.action === 'getLatestRejectRequestMeta') {
    getLatestRejectRequestMeta()
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!details || details.method !== 'POST' || !CAPTURED_REQUEST_URLS.includes(details.url)) {
      return;
    }

    const headerMap = {};
    (details.requestHeaders || []).forEach((header) => {
      if (!header || !header.name) {
        return;
      }
      headerMap[String(header.name).toLowerCase()] = header.value || '';
    });

    latestRejectRequestMeta = {
      antiContent: headerMap['anti-content'] || '',
      mallid: headerMap.mallid || '',
      origin: headerMap.origin || 'https://agentseller.temu.com',
      referer: headerMap.referer || 'https://agentseller.temu.com/goods/list',
      acceptLanguage: headerMap['accept-language'] || '',
      userAgent: headerMap['user-agent'] || '',
      capturedAt: Date.now()
    };

    chrome.storage.local.set({ latestRejectRequestMeta });
    console.log('Captured reject request meta:', latestRejectRequestMeta);
  },
  { urls: CAPTURED_REQUEST_URLS },
  ['requestHeaders']
);

async function getTemuCookies(tabFromSender) {
  return new Promise((resolve, reject) => {
    const currentTab = tabFromSender;
      if (!currentTab) {
        reject(new Error('没有找到目标标签页'));
        return;
      }

      if (!currentTab.url || !currentTab.url.includes('agentseller.temu.com')) {
        reject(new Error('当前页面不是 TEMU 商家后台'));
        return;
      }

      getAllCookiesFromAllDomains(currentTab.url)
        .then((allCookies) => {
          const cookieData = processCookies(allCookies);

          if (cookieData.mallid) {
            return cookieData;
          }

          return getMallidSpecifically().then((mallid) => {
            if (mallid) {
              cookieData.mallid = mallid;
              cookieData.cookies.mallid = mallid;

              if (!cookieData.cookieString.includes('mallid=')) {
                cookieData.cookieString += `${cookieData.cookieString ? '; ' : ''}mallid=${mallid}`;
              }
            }

            return cookieData;
          });
        })
        .then(resolve)
        .catch(reject);
  });
}

async function getAllCookiesFromAllDomains(currentUrl) {
  return new Promise((resolve) => {
    const domains = [
      currentUrl,
      'https://agentseller.temu.com',
      'https://agentseller.temu.com/',
      '.agentseller.temu.com',
      '.temu.com',
      'https://temu.com'
    ];

    const allCookies = [];
    let domainsProcessed = 0;

    domains.forEach((domain) => {
      const getOptions = domain.startsWith('http') ? { url: domain } : { domain };

      chrome.cookies.getAll(getOptions, (cookies) => {
        if (!chrome.runtime.lastError && Array.isArray(cookies)) {
          cookies.forEach((newCookie) => {
            const exists = allCookies.some((existingCookie) =>
              existingCookie.name === newCookie.name && existingCookie.value === newCookie.value
            );

            if (!exists) {
              allCookies.push(newCookie);
            }
          });
        }

        domainsProcessed += 1;
        if (domainsProcessed === domains.length) {
          resolve(allCookies);
        }
      });
    });
  });
}

function processCookies(cookies) {
  const cookieData = {
    cookieString: '',
    mallid: '',
    api_uid: '',
    _bee: '',
    _nano_fp: '',
    dilx: '',
    hfsc: '',
    njrpl: '',
    seller_temp: '',
    cookies: {},
    rawCookies: cookies
  };

  const cookiePairs = [];

  cookies.forEach((cookie) => {
    cookiePairs.push(`${cookie.name}=${cookie.value}`);
    cookieData.cookies[cookie.name] = cookie.value;

    if (Object.prototype.hasOwnProperty.call(cookieData, cookie.name)) {
      cookieData[cookie.name] = cookie.value;
    }
  });

  cookieData.cookieString = cookiePairs.join('; ');
  return cookieData;
}

async function getMallidSpecifically() {
  return new Promise((resolve) => {
    chrome.cookies.get(
      {
        url: 'https://agentseller.temu.com',
        name: 'mallid'
      },
      (cookie) => {
        if (cookie) {
          resolve(cookie.value);
          return;
        }

        chrome.cookies.getAll({}, (allCookies) => {
          const mallidCookie = allCookies.find((item) => item.name === 'mallid');
          resolve(mallidCookie ? mallidCookie.value : '634418226769041');
        });
      }
    );
  });
}

async function debugAllCookies() {
  return new Promise((resolve) => {
    chrome.cookies.getAll({}, (allCookies) => {
      const temuCookies = allCookies.filter((cookie) => cookie.domain.includes('temu.com'));
      resolve({
        totalCookies: allCookies.length,
        temuCookies: temuCookies.length,
        cookies: temuCookies
      });
    });
  });
}

async function getLatestRejectRequestMeta() {
  if (latestRejectRequestMeta) {
    return latestRejectRequestMeta;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(['latestRejectRequestMeta'], (result) => {
      latestRejectRequestMeta = result && result.latestRejectRequestMeta ? result.latestRejectRequestMeta : null;
      resolve(latestRejectRequestMeta);
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed or updated');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup');
});
