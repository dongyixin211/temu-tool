console.log('TEMU 违规处理助手 Content Script 已加载');

let dynamicHeaders = { mallid: '', cookies: '', userAgent: navigator.userAgent, rejectRequestMeta: null };
const TASK_NAMES = ['autoProcess', 'scanAndRelist', 'directRelist', 'propertyFill', 'tableclothPropertyFill', 'rejectPropertyAdjust', 'longTermNoOrderUnshelve', 'batchDeleteOffShelf', 'lowQualityUnshelve'];
const LOW_QUALITY_SCAN_SCORE_ENUMS = [1, 2];
const LOW_QUALITY_UNSHELVE_SCORE_THRESHOLD = 60;
const LOW_QUALITY_UNSHELVE_INVENTORY_THRESHOLD = 10;
const cancelledTasks = new Set();
const LOG_FLUSH_INTERVAL = 180;
const LOG_IMMEDIATE_PATTERN = /失败|异常|终止|停止|完成|成功|❌|✅/;
const pendingLogMessages = [];
let logFlushTimer = null;
const DEFAULT_PROPERTY_FILL_CONFIG = {
  category: {
    id: 34566,
    name: '束发带',
    pageSize: 50
  },
  material: {
    templatePid: 1768575,
    pid: 1,
    refPid: 12,
    propName: '材质',
    vid: 55,
    propValue: '聚酯纤维(涤纶）',
    valueUnit: '',
    valueExtendInfo: '',
    numberInputValue: ''
  },
  component: {
    templatePid: 1768578,
    pid: 2,
    refPid: 15,
    propName: '成分',
    vid: 98,
    propValue: '聚酯纤维(涤纶）',
    valueUnit: '%',
    valueExtendInfo: '',
    numberInputValue: '100.00',
    controlType: 16
  }
};
const TABLECLOTH_PROPERTY_FILL_CONFIG = {
  category: {
    id: 10498,
    name: '桌布',
    pageSize: 10
  },
  query: {
    propAdjustTypes: [1]
  },
  execution: {
    concurrency: 4,
    queryPagesPerRound: 3,
    recentCooldownMs: 180000,
    chunkDelayMs: 120,
    roundDelayMs: 300,
    emptyRoundDelayMs: 900
  },
  properties: [
    {
      templatePid: 1718155,
      pid: 89,
      refPid: 121,
      propName: '材料',
      vid: 2197,
      propValue: '涤纶',
      valueUnit: '',
      valueExtendInfo: '',
      numberInputValue: ''
    },
    {
      templatePid: 1718151,
      pid: 112,
      refPid: 131,
      propName: '形状',
      vid: 2463,
      propValue: '矩形',
      valueUnit: '',
      valueExtendInfo: '',
      numberInputValue: ''
    },
    {
      templatePid: 1718152,
      pid: 127,
      refPid: 202,
      propName: '编织类型',
      vid: 18652,
      propValue: '机器制作',
      valueUnit: '',
      valueExtendInfo: '',
      numberInputValue: ''
    },
    {
      templatePid: 1718160,
      pid: 1224,
      refPid: 1192,
      propName: '织造方式',
      vid: 29810,
      propValue: '梭织',
      valueUnit: '',
      valueExtendInfo: '',
      numberInputValue: ''
    },
    {
      templatePid: 1757236,
      pid: 1225,
      refPid: 1193,
      propName: '制作工艺',
      vid: 29821,
      propValue: '印花',
      valueUnit: '',
      valueExtendInfo: '',
      numberInputValue: '',
      controlType: 1
    },
    {
      templatePid: 1757236,
      pid: 1225,
      refPid: 1193,
      propName: '制作工艺',
      vid: 37644,
      propValue: '梭织',
      valueUnit: '',
      valueExtendInfo: '',
      numberInputValue: '',
      controlType: 1
    },
    {
      templatePid: 1718156,
      pid: 2,
      refPid: 2021,
      propName: '封面材质',
      vid: 46248,
      propValue: '涤纶',
      valueUnit: '%',
      valueExtendInfo: '',
      numberInputValue: '100.00'
    },
    {
      templatePid: 1718165,
      pid: 1776,
      refPid: 3980,
      propName: '平方克重（g/㎡）',
      vid: 83894,
      propValue: '80-90g',
      valueUnit: '',
      valueExtendInfo: '',
      numberInputValue: ''
    },
    {
      templatePid: 1799469,
      pid: 2077,
      refPid: 6958,
      propName: '材质类型',
      vid: 198652,
      propValue: '纺织品材质',
      valueUnit: '',
      valueExtendInfo: '',
      numberInputValue: '',
      controlType: 1
    }
  ]
};

// ==========================================
// 1. 消息监听器 (路由分发)
// ==========================================
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // 基础：设置Header
  if (request.action === 'setRequestHeaders') {
    dynamicHeaders = Object.assign({}, dynamicHeaders, request.headers);
    sendResponse({ success: true });
    return true;
  }

  // 基础：获取Cookie
  if (request.action === 'getCookies') {
    getCookiesFromBackground().then(data => sendResponse({success: true, data: data}));
    return true;
  }

  // 功能1：第一步扫描违规数据 (Popup调用)
  if (request.action === 'getViolationData') {
    getViolationData(request.pageNum, request.pageSize, request.filters)
      .then(data => sendResponse(data))
      .catch(err => sendResponse({success: false, error: err.message}));
    return true;
  }

  if (request.action === 'getCategoryChildren') {
    getCategoryChildren(request.parentCatId)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'queryPropertyTasksPage') {
    queryPropertyTasksPage(request.payload || {})
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'queryPurchaseOrderExportData') {
    queryPurchaseOrderExportData(request.payload || {})
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'queryDuplicateOnSaleSalesExportData') {
    queryDuplicateOnSaleSalesExportData()
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'queryPendingPurchaseRestockAnalysis') {
    queryPendingPurchaseRestockAnalysis()
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 功能2：第二步执行下架 (原有功能)
  if (request.action === 'startAutoProcess') {
    startOptimizedBatchProcess(request.spuList, request.taskName || 'autoProcess'); 
    sendResponse({ success: true });
    return true;
  }

  // 功能3：第三步执行自动扫描上架 (新增功能)
  if (request.action === 'startScanAndRelist') {
    startScanAndRelistLoop(request.taskName || 'scanAndRelist');
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'startLongTermNoOrderUnshelve') {
    startLongTermNoOrderUnshelve(request.taskName || 'longTermNoOrderUnshelve');
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'startBatchDeleteOffShelf') {
    startBatchDeleteOffShelfLoop(request.taskName || 'batchDeleteOffShelf');
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'startLowQualityUnshelve') {
    startLowQualityUnshelve(request.taskName || 'lowQualityUnshelve');
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'startDirectRelist') {
    startDirectRelist(request.spuList, request.taskName || 'directRelist')
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'startPropertyFill') {
    const taskName = request.taskName || 'propertyFill';
    const runtimeConfig = taskName === 'tableclothPropertyFill'
      ? TABLECLOTH_PROPERTY_FILL_CONFIG
      : request.config;
    startPropertyFill(runtimeConfig, taskName)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'startRejectPropertyAdjust') {
    startRejectPropertyAdjust(request.taskName || 'rejectPropertyAdjust')
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'cancelTasks') {
    const taskNames = Array.isArray(request.taskNames) && request.taskNames.length
      ? request.taskNames.map((item) => String(item))
      : TASK_NAMES;
    taskNames.forEach((taskName) => cancelledTasks.add(taskName));
    sendResponse({ success: true });
    return true;
  }
});

// ==========================================
// 2. 公共基础函数
// ==========================================

// 获取最新的会话ID (下架和上架都需要)
function getLatestChatMsgId() {
  return new Promise((resolve, reject) => {
    const apiUrl = 'https://agentseller.temu.com/bg/cute/api/merchantService/chat/queryMessage';
    const requestBody = { "direction": 2, "limit": 20 };

    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'mallid': dynamicHeaders.mallid,
        'origin': 'https://agentseller.temu.com'
      },
      body: JSON.stringify(requestBody)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.result && data.result.messageList && data.result.messageList.length > 0) {
        const list = data.result.messageList;
        // 按时间倒序
        list.sort((a, b) => b.timestamp - a.timestamp);
        const latestMsgId = list[0].msgId;
        console.log('获取到最新 msgId:', latestMsgId);
        resolve(latestMsgId);
      } else {
        reject(new Error('未能获取聊天记录，无法提取 parentMsgId'));
      }
    })
    .catch(err => reject(err));
  });
}

// 从Background获取Cookie
function getCookiesFromBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getTemuCookies' }, (response) => {
      if (response && response.success) {
        dynamicHeaders.mallid = response.data.mallid;
        resolve(response.data);
      } else {
        resolve(null);
      }
    });
  });
}

function getLatestRejectRequestMetaFromBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getLatestRejectRequestMeta' }, (response) => {
      if (response && response.success) {
        resolve(response.data || null);
      } else {
        resolve(null);
      }
    });
  });
}

async function ensureRequestHeadersReady() {
  if (dynamicHeaders.mallid) {
    dynamicHeaders.rejectRequestMeta = await getLatestRejectRequestMetaFromBackground();
    return true;
  }

  const cookieData = await getCookiesFromBackground();
  if (!cookieData || !cookieData.mallid) {
    throw new Error('无法获取 mallid，请先确认当前页是 TEMU 商家后台');
  }

  dynamicHeaders.mallid = cookieData.mallid;
  dynamicHeaders.cookies = cookieData.cookies || dynamicHeaders.cookies;
  dynamicHeaders.rejectRequestMeta = await getLatestRejectRequestMetaFromBackground();
  return true;
}

 
// 扫描违规数据 API (供Popup使用)
function getViolationData(pageNum, pageSize, filters) {
  return new Promise((resolve, reject) => {
    if (!dynamicHeaders.mallid) return reject(new Error('No Mall ID'));

    const requestBody = {
      "page_num": pageNum,
      "page_size": pageSize,
      "target_type": filters.targetType || "goods",
      "appeal_status_list": filters.appealStatus
    };

    // 添加时间筛选
    if (filters.punishStartTime) requestBody.punish_start_min_time = filters.punishStartTime;
    if (filters.punishEndTime) requestBody.punish_start_max_time = filters.punishEndTime;
    
    // 添加违规类型筛选
    if (filters.violationType !== undefined) {
        requestBody.violation_type = filters.violationType;
    }

    fetch('https://agentseller.temu.com/mms/tmod_punish/agent/merchant_appeal/entrance/list', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'mallid': dynamicHeaders.mallid,
        'origin': 'https://agentseller.temu.com'
      },
      body: JSON.stringify(requestBody)
    })
    .then(res => res.json())
    .then(data => resolve(data))
    .catch(err => reject(err));
  });
}

async function postJson(url, body) {
  await ensureRequestHeadersReady();

  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'mallid': dynamicHeaders.mallid,
      'origin': 'https://agentseller.temu.com'
    },
    body: JSON.stringify(body)
  }).then(res => res.json());
}

async function postJsonWithCapturedHeaders(url, body, extraHeaders, options = {}) {
  await ensureRequestHeadersReady();
  const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
  const controller = new AbortController();
  const rawTimeoutMs = Number(options && options.timeoutMs);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 20000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      headers: Object.assign({
        'accept': '*/*',
        'content-type': 'application/json',
        'mallid': dynamicHeaders.mallid,
        'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
        'referer': rejectRequestMeta.referer || 'https://agentseller.temu.com/goods/list',
        'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9'
      }, extraHeaders || {}),
      body: JSON.stringify(body)
    });

    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (error) {
      throw new Error(`请求返回了无法解析的响应：${error.message}`);
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(`页面请求超时（${Math.round(timeoutMs / 1000)}s）`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isRetryableRequestError(error) {
  const message = error && error.message ? String(error.message) : '';
  if (!message) {
    return false;
  }

  return (
    message.includes('超时')
    || message.includes('Failed to fetch')
    || message.includes('NetworkError')
    || message.includes('network')
    || message.includes('fetch')
  );
}

async function requestWithRetry(executor, options = {}) {
  const retries = Number.isFinite(Number(options.retries)) ? Math.max(0, Number(options.retries)) : 2;
  const baseDelayMs = Number.isFinite(Number(options.baseDelayMs)) ? Math.max(0, Number(options.baseDelayMs)) : 800;
  const label = options.label || '请求';
  const shouldRetry = typeof options.shouldRetry === 'function'
    ? options.shouldRetry
    : (error) => isRetryableRequestError(error);
  const maxAttempts = retries + 1;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await executor(attempt, maxAttempts);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error, attempt, maxAttempts)) {
        throw error;
      }

      const delayMs = baseDelayMs * attempt;
      logProcess(`⚠️ ${label} 失败：${error.message}，准备重试 ${attempt + 1}/${maxAttempts}`);
      await sleep(delayMs);
    }
  }

  throw lastError || new Error(`${label}失败`);
}

async function queryRejectPropertyTasksPage(page, pageSize) {
  await ensureRequestHeadersReady();
  const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
  if (!rejectRequestMeta.antiContent) {
    logProcess('当前未采集到 anti-content，先尝试直接查询 pageQuery。');
  }

  return postJsonWithCapturedHeaders('https://agentseller.temu.com/visage-agent-seller/product/prop/adjust/task/pageQuery', {
    page: Number(page),
    pageSize: Number(pageSize),
    propAdjustTypes: [201, 200, 300]
  }, {
    ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
    'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
    'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
    'referer': rejectRequestMeta.referer || 'https://agentseller.temu.com/goods/list'
  });
}

function formatPurchasePrice(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return String(amount);
  }

  return (numericAmount / 100).toFixed(2);
}

function formatAmount(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '';
  }

  return numericValue.toFixed(2);
}

function normalizeText(value) {
  return value == null ? '' : String(value).trim();
}

function resolveUnitCost(order, detail) {
  const category = normalizeText(order && order.category);
  const className = normalizeText(detail && detail.className);

  if (category === '束发带') {
    return 3.6;
  }

  if (category === '女士户外多功能头饰') {
    return 7.4;
  }

  if (className === '35.83x35.83 英寸 / 91x91 厘米') {
    return 7.4;
  }

  if (category === '桌布') {
    if (className.includes('90x140')) return 9.5;
    if (className.includes('140x140')) return 14;
    if (className.includes('140x180')) return 16;
    if (className.includes('140x200')) return 20;
    if (className.includes('140x220')) return 21;
    if (className.includes('140x240')) return 22;
  }

  if (category.includes('毛毯') || category.includes('盖毯') || category.includes('午休毯')) {
    if (className.includes('75x100')) return 10;
    if (className.includes('100x130')) return 15.5;
    if (className.includes('75x150')) return 12.5;
    if (className.includes('150x230')) return 33;
    if (className.includes('100x150')) return 16;
    if (className.includes('120x150')) return 19;
    if (className.includes('80x120')) return 13;
    if (className.includes('130x150')) return 20;
    if (className.includes('70x100')) return 9.5;
    if (className.includes('150x200')) return 28;
  }

  if (category.includes('挂毯') || category.includes('壁毯')) {
    if (className.includes('50x75')) return 8.5;
    if (className.includes('75x100')) return 11.5;
    if (className.includes('80x120')) return 16;
    if (className.includes('100x130')) return 20;
    if (className.includes('110x145')) return 22.6;
    if (className.includes('130x150')) return 25.7;
    if (className.includes('150x200')) return 35;
  }

  if (category === '化妆包') {
    return 3.6;
  }

  return null;
}

async function queryPurchaseOrderListPage(payload) {
  await ensureRequestHeadersReady();
  const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};

  const requestBody = {
    pageNo: Number(payload.pageNo || 1),
    pageSize: Number(payload.pageSize || 100),
    urgencyType: payload.urgencyType !== undefined && payload.urgencyType !== null
      ? Number(payload.urgencyType)
      : 1,
    isCustomGoods: false,
    oneDimensionSort: payload.oneDimensionSort || {
      firstOrderByParam: 'createdAt',
      firstOrderByDesc: 1
    }
  };

  if (Array.isArray(payload.statusList) && payload.statusList.length) {
    requestBody.statusList = payload.statusList.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  }

  const purchaseTimeFrom = Number(payload.purchaseTimeFrom);
  const purchaseTimeTo = Number(payload.purchaseTimeTo);
  const productSkcIdList = Array.isArray(payload.productSkcIdList)
    ? payload.productSkcIdList.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : [];
  const rawTimeoutMs = Number(payload.timeoutMs);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0
    ? rawTimeoutMs
    : (productSkcIdList.length ? 40000 : 30000);

  if (Number.isFinite(purchaseTimeFrom)) {
    requestBody.purchaseTimeFrom = purchaseTimeFrom;
  }

  if (Number.isFinite(purchaseTimeTo)) {
    requestBody.purchaseTimeTo = purchaseTimeTo;
  }

  if (productSkcIdList.length) {
    requestBody.productSkcIdList = productSkcIdList;
  }

  return postJsonWithCapturedHeaders('https://agentseller.temu.com/mms/venom/api/supplier/purchase/manager/querySubOrderList', requestBody, {
    ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
    'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
    'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
    'referer': payload.referer || (Number(requestBody.urgencyType) === 0
      ? 'https://agentseller.temu.com/stock/fully-mgt/order-manage'
      : 'https://agentseller.temu.com/stock/fully-mgt/order-manage-urgency')
  }, {
    timeoutMs
  });
}

async function queryOnSaleProductPage(page, pageSize, options = {}) {
  await ensureRequestHeadersReady();
  const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
  const rawTimeoutMs = Number(options.timeoutMs);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 45000;

  return postJsonWithCapturedHeaders('https://agentseller.temu.com/visage-agent-seller/product/skc/pageQuery', {
    page: Number(page || 1),
    pageSize: Number(pageSize || 20),
    skcTopStatus: 100
  }, {
    ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
    'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
    'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
    'referer': 'https://agentseller.temu.com/goods/list'
  }, {
    timeoutMs
  });
}

async function queryOffShelfProductPage(page, pageSize, options = {}) {
  await ensureRequestHeadersReady();
  const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
  const rawTimeoutMs = Number(options.timeoutMs);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 45000;

  return postJsonWithCapturedHeaders('https://agentseller.temu.com/visage-agent-seller/product/skc/pageQuery', {
    page: Number(page || 1),
    pageSize: Number(pageSize || 20),
    skcTopStatus: 200,
    skcSecondaryStatus: 1
  }, {
    ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
    'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
    'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
    'referer': 'https://agentseller.temu.com/goods/list'
  }, {
    timeoutMs
  });
}

async function queryPriceReviewFailedProductPage(pageNum, pageSize, options = {}) {
  await ensureRequestHeadersReady();
  const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
  const rawTimeoutMs = Number(options.timeoutMs);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 45000;

  return postJsonWithCapturedHeaders('https://agentseller.temu.com/api/kiana/mms/robin/searchForChainSupplier', {
    pageSize: Number(pageSize || 10),
    pageNum: Number(pageNum || 1),
    removeStatus: 0,
    secondarySelectStatusList: [9],
    supplierTodoTypeList: []
  }, {
    ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
    'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
    'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
    'referer': rejectRequestMeta.referer || 'https://agentseller.temu.com/newon/product-select'
  }, {
    timeoutMs
  });
}

async function queryQualityMetricsPage(page, pageSize, qualityScoreEnum, options = {}) {
  await ensureRequestHeadersReady();
  const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
  const rawTimeoutMs = Number(options.timeoutMs);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 45000;

  return postJsonWithCapturedHeaders('https://agentseller.temu.com/bg-luna-agent-seller/goods/quality/supplyChain/qualityMetrics/pageQuery', {
    page: Number(page || 1),
    pageSize: Number(pageSize || 10),
    qualityScoreEnum: Number(qualityScoreEnum || 1)
  }, {
    ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
    'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
    'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
    'referer': 'https://agentseller.temu.com/main/quality/dashboard'
  }, {
    timeoutMs
  });
}

async function querySalesListOverallByProductId(productId, options = {}) {
  await ensureRequestHeadersReady();
  const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
  const rawTimeoutMs = Number(options.timeoutMs);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 45000;
  const normalizedProductId = Number(productId);

  return postJsonWithCapturedHeaders('https://agentseller.temu.com/mms/venom/api/supplier/sales/management/listOverall', {
    pageNo: 1,
    pageSize: 10,
    isLack: 0,
    orderByParam: 'lastSevenDaysSaleVolume',
    orderByDesc: 1,
    productIdList: [normalizedProductId]
  }, {
    ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
    'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
    'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
    'referer': 'https://agentseller.temu.com/stock/fully-mgt/sale-manage/main'
  }, {
    timeoutMs
  });
}

function resolveWarehouseInventoryFromListOverall(response) {
  const result = response && response.result ? response.result : {};
  const subOrderList = Array.isArray(result.subOrderList) ? result.subOrderList : [];
  if (!subOrderList.length) {
    return { inventory: 0, productSkcId: null, salesItem: null };
  }

  const salesItem = subOrderList[0];
  const totalInfo = salesItem.skuQuantityTotalInfo || {};
  const inventoryInfo = totalInfo.inventoryNumInfo
    || (Array.isArray(salesItem.skuQuantityDetailList) && salesItem.skuQuantityDetailList[0]
      ? salesItem.skuQuantityDetailList[0].inventoryNumInfo
      : null)
    || {};
  const inventory = Number(inventoryInfo.warehouseInventoryNum || 0);

  return {
    inventory: Number.isFinite(inventory) ? inventory : 0,
    productSkcId: salesItem.productSkcId || null,
    salesItem
  };
}

function resolveSalesMetricsFromListOverall(response) {
  const base = resolveWarehouseInventoryFromListOverall(response);
  const salesItem = base.salesItem;
  if (!salesItem) {
    return {
      ...base,
      lastSevenDaysSaleVolume: 0,
      lastThirtyDaysSaleVolume: 0,
      todaySaleVolume: 0,
      availableSaleDays: null,
      mark: null,
      commentNum: null
    };
  }

  const totalInfo = salesItem.skuQuantityTotalInfo || {};
  const availableSaleDays = totalInfo.availableSaleDays != null
    ? Number(totalInfo.availableSaleDays)
    : (salesItem.availableSaleDays != null ? Number(salesItem.availableSaleDays) : null);

  return {
    ...base,
    lastSevenDaysSaleVolume: Number(totalInfo.lastSevenDaysSaleVolume || 0),
    lastThirtyDaysSaleVolume: Number(totalInfo.lastThirtyDaysSaleVolume || 0),
    todaySaleVolume: Number(totalInfo.todaySaleVolume || 0),
    availableSaleDays: Number.isFinite(availableSaleDays) ? availableSaleDays : null,
    mark: salesItem.mark != null ? Number(salesItem.mark) : null,
    commentNum: salesItem.commentNum != null ? Number(salesItem.commentNum) : null
  };
}

function formatTimestampForExport(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function fetchAllPendingPurchaseOrders() {
  const pageSize = 100;
  let pageNo = 1;
  let totalPages = 1;
  const orders = [];

  while (pageNo <= totalPages) {
    const response = await queryPurchaseOrderListPage({
      pageNo,
      pageSize,
      urgencyType: 0,
      statusList: [1],
      oneDimensionSort: {
        firstOrderByParam: 'expectLatestDeliverTime',
        firstOrderByDesc: 0
      },
      referer: 'https://agentseller.temu.com/stock/fully-mgt/order-manage'
    });

    if (!response || !response.success) {
      const errorMsg = response && response.errorMsg ? response.errorMsg : '未知错误';
      throw new Error(`待发货备货单第 ${pageNo} 页查询失败：${errorMsg}`);
    }

    const result = response.result || {};
    const pageList = Array.isArray(result.subOrderForSupplierList) ? result.subOrderForSupplierList : [];
    const total = Number(result.total || 0);
    totalPages = Math.max(1, Math.ceil(total / pageSize));
    orders.push(...pageList);
    pageNo += 1;

    if (pageList.length) {
      await sleep(150);
    }
  }

  return orders;
}

async function fetchQualityMetricsMapForProducts(productIdSet) {
  const map = new Map();
  if (!productIdSet || !productIdSet.size) {
    return map;
  }

  for (const qualityScoreEnum of [1, 2, 3, 4]) {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await queryQualityMetricsPage(page, 100, qualityScoreEnum);
      if (!response || !response.success) {
        break;
      }

      const result = response.result || {};
      const pageItems = Array.isArray(result.pageItems) ? result.pageItems : [];
      totalPages = Math.max(1, Math.ceil(Number(result.total || 0) / 100));

      pageItems.forEach((item) => {
        const productId = item && item.productId ? String(item.productId) : '';
        if (productId && productIdSet.has(productId) && !map.has(productId)) {
          map.set(productId, item);
        }
      });

      if (map.size >= productIdSet.size) {
        return map;
      }

      page += 1;
      if (pageItems.length) {
        await sleep(120);
      }
    }
  }

  return map;
}

function buildRestockAdvice(record) {
  const qualityScore = Number(record.qualityScore);
  const inventory = Number(record.warehouseInventory);
  const last7 = Number(record.lastSevenDaysSaleVolume);
  const avgReview = Number(record.avgReviewScore);
  const revCnt = Number(record.reviewCount);
  const purchaseQty = Number(record.purchaseQuantity);
  const saleDays = record.availableSaleDays != null ? Number(record.availableSaleDays) : null;

  if (Number.isFinite(qualityScore) && qualityScore < 60) {
    return '不建议备货（品质分低于60）';
  }
  if (Number.isFinite(avgReview) && revCnt >= 5 && avgReview < 4.0) {
    return '不建议备货（评价偏低）';
  }
  if (inventory >= 30 && last7 <= 5) {
    return '不建议备货（仓内库存高且近7天销量低）';
  }
  if (saleDays != null && saleDays >= 15 && last7 < purchaseQty) {
    return '谨慎备货（可售天数较充足）';
  }
  if (last7 >= 10 && inventory < 30) {
    return '建议备货';
  }
  if (Number.isFinite(qualityScore) && qualityScore >= 70 && last7 >= 3) {
    return '建议备货';
  }
  if (last7 === 0 && inventory >= 10) {
    return '谨慎备货（近7天无销量）';
  }
  return '待观察';
}

async function queryPendingPurchaseRestockAnalysis() {
  await ensureRequestHeadersReady();

  const pendingOrders = await fetchAllPendingPurchaseOrders();
  const productIdSet = new Set(
    pendingOrders
      .map((order) => (order && order.productId ? String(order.productId) : ''))
      .filter(Boolean)
  );
  const qualityMap = await fetchQualityMetricsMapForProducts(productIdSet);
  const salesCache = new Map();
  const records = [];

  for (const order of pendingOrders) {
    const productId = order && order.productId ? String(order.productId) : '';
    if (!productId) {
      continue;
    }

    let salesMetrics;
    if (salesCache.has(productId)) {
      salesMetrics = salesCache.get(productId);
    } else {
      try {
        const salesResponse = await querySalesListOverallByProductId(productId);
        salesMetrics = salesResponse && salesResponse.success
          ? resolveSalesMetricsFromListOverall(salesResponse)
          : {
            inventory: '',
            lastSevenDaysSaleVolume: '',
            lastThirtyDaysSaleVolume: '',
            todaySaleVolume: '',
            availableSaleDays: '',
            mark: '',
            commentNum: ''
          };
      } catch (error) {
        salesMetrics = {
          inventory: '',
          lastSevenDaysSaleVolume: '',
          lastThirtyDaysSaleVolume: '',
          todaySaleVolume: '',
          availableSaleDays: '',
          mark: '',
          commentNum: '',
          error: error.message
        };
      }
      salesCache.set(productId, salesMetrics);
      await sleep(120);
    }

    const qualityItem = qualityMap.get(productId) || null;
    const qualityScore = qualityItem && qualityItem.goodsAfsScore != null
      ? Number(qualityItem.goodsAfsScore)
      : null;
    const avgReviewScore = qualityItem && qualityItem.avgRevScr != null
      ? Number(qualityItem.avgRevScr)
      : (salesMetrics.mark != null && salesMetrics.mark !== '' ? Number(salesMetrics.mark) : null);
    const reviewCount = qualityItem && qualityItem.revCnt != null
      ? Number(qualityItem.revCnt)
      : (salesMetrics.commentNum != null && salesMetrics.commentNum !== '' ? Number(salesMetrics.commentNum) : null);
    const purchaseQuantity = Number(order.skuQuantityTotalInfo && order.skuQuantityTotalInfo.purchaseQuantity);
    const expectDeliverTime = order.expectLatestDeliverTime && order.expectLatestDeliverTime.time
      ? Number(order.expectLatestDeliverTime.time)
      : (order.deliverInfo && order.deliverInfo.expectLatestDeliverTimeOrDefault
        ? Number(order.deliverInfo.expectLatestDeliverTimeOrDefault)
        : null);

    const record = {
      subPurchaseOrderSn: order.subPurchaseOrderSn || '',
      originalPurchaseOrderSn: order.originalPurchaseOrderSn || '',
      productId,
      productSkcId: order.productSkcId ? String(order.productSkcId) : '',
      productSn: order.productSn || '',
      category: order.category || '',
      productName: order.productName || '',
      purchaseQuantity: Number.isFinite(purchaseQuantity) ? purchaseQuantity : '',
      expectLatestDeliverTime: formatTimestampForExport(expectDeliverTime),
      todayCanDeliver: order.todayCanDeliver === true ? '是' : (order.todayCanDeliver === false ? '否' : ''),
      warehouseInventory: salesMetrics.inventory === '' ? '' : salesMetrics.inventory,
      lastSevenDaysSaleVolume: salesMetrics.lastSevenDaysSaleVolume === '' ? '' : salesMetrics.lastSevenDaysSaleVolume,
      lastThirtyDaysSaleVolume: salesMetrics.lastThirtyDaysSaleVolume === '' ? '' : salesMetrics.lastThirtyDaysSaleVolume,
      todaySaleVolume: salesMetrics.todaySaleVolume === '' ? '' : salesMetrics.todaySaleVolume,
      availableSaleDays: salesMetrics.availableSaleDays === '' || salesMetrics.availableSaleDays == null
        ? ''
        : salesMetrics.availableSaleDays,
      qualityScore: Number.isFinite(qualityScore) ? qualityScore.toFixed(2) : '',
      avgReviewScore: Number.isFinite(avgReviewScore) ? avgReviewScore.toFixed(2) : '',
      reviewCount: Number.isFinite(reviewCount) ? reviewCount : '',
      restockAdvice: '',
      note: salesMetrics.error || ''
    };

    record.restockAdvice = buildRestockAdvice(record);
    records.push(record);
  }

  const adviceSummary = records.reduce((acc, item) => {
    const key = item.restockAdvice || '待观察';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalOrders: records.length,
    uniqueProducts: productIdSet.size,
    adviceSummary,
    records
  };
}

function buildUnshelveInfoFromQualityItem(qualityItem, inventoryInfo) {
  const productId = qualityItem && qualityItem.productId ? String(qualityItem.productId) : '';
  const productSkcId = inventoryInfo && inventoryInfo.productSkcId ? Number(inventoryInfo.productSkcId) : 0;
  if (!productId || !Number.isFinite(productSkcId) || productSkcId <= 0) {
    return null;
  }

  return {
    isOnSale: true,
    spuId: productId,
    skcId: productSkcId,
    name: qualityItem && qualityItem.productName ? qualityItem.productName : 'Product',
    img: qualityItem && qualityItem.carouselImageUrl ? qualityItem.carouselImageUrl : ''
  };
}

async function fetchAllLowQualityProducts(taskName) {
  const pageSize = 100;
  const productMap = new Map();

  for (const qualityScoreEnum of LOW_QUALITY_SCAN_SCORE_ENUMS) {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      if (isTaskCancelled(taskName)) {
        return null;
      }

      let response;
      try {
        response = await queryQualityMetricsPage(page, pageSize, qualityScoreEnum);
      } catch (error) {
        throw new Error(`品质分区间 ${qualityScoreEnum} 第 ${page} 页查询失败：${error.message}`);
      }

      if (!response || !response.success) {
        const errorMsg = response && response.errorMsg ? response.errorMsg : '未知错误';
        throw new Error(`品质分区间 ${qualityScoreEnum} 第 ${page} 页查询失败：${errorMsg}`);
      }

      const result = response.result || {};
      const pageItems = Array.isArray(result.pageItems) ? result.pageItems : [];
      const total = Number(result.total || 0);
      totalPages = Math.max(1, Math.ceil(total / pageSize));

      pageItems.forEach((item) => {
        const productId = item && item.productId ? String(item.productId) : '';
        if (productId) {
          productMap.set(productId, item);
        }
      });

      logProcess(`品质分区间 ${qualityScoreEnum}：第 ${page}/${totalPages} 页，新增 ${pageItems.length} 条，累计 ${productMap.size} 条`);
      page += 1;
      if (pageItems.length) {
        await sleep(200);
      }
    }
  }

  return Array.from(productMap.values());
}

function removeOffShelfProduct(productId) {
  return ensureRequestHeadersReady().then(() => {
    const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
    if (!rejectRequestMeta.antiContent) {
      logProcess(`[${productId}] 当前未采集到 anti-content，先尝试直接发起删除。`);
    }
    return postJsonWithCapturedHeaders('https://agentseller.temu.com/visage-agent-seller/product/remove', {
      productId: Number(productId)
    }, {
      ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
      'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
      'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
      'referer': rejectRequestMeta.referer || 'https://agentseller.temu.com/goods/list'
    });
  });
}

const DELETE_NOT_SUPPORTED_PATTERN = /does not support the operation of deletion/i;
const DELETE_PERMANENT_BLOCK_PATTERN = /当前商品状态不可删除/;
const DELETE_RETRY_DELAYS_MS = [400];
const DELETE_DEFER_SKIP_SWEEPS = 1;
const DELETE_DEFER_MAX_ATTEMPTS = 8;

function isDeleteNotSupportedError(errorMsg) {
  return DELETE_NOT_SUPPORTED_PATTERN.test(String(errorMsg || ''));
}

function isDeletePermanentlyBlockedError(errorMsg) {
  return DELETE_PERMANENT_BLOCK_PATTERN.test(String(errorMsg || ''));
}

function resolveRemoveProductError(removeRes, fallbackMessage) {
  if (removeRes && removeRes.errorMsg) {
    return removeRes.errorMsg;
  }
  return fallbackMessage || '未知错误';
}

async function removeOffShelfProductWithRetry(productId) {
  let lastResult = await removeOffShelfProduct(productId);
  if (lastResult && lastResult.success) {
    return lastResult;
  }

  const errorMsg = resolveRemoveProductError(lastResult, '未知错误');
  if (!isDeleteNotSupportedError(errorMsg)) {
    return lastResult;
  }

  await sleep(DELETE_RETRY_DELAYS_MS[0]);
  lastResult = await removeOffShelfProduct(productId);
  return lastResult;
}

async function queryOrderHistoryBySkc(productSkcId) {
  return queryPurchaseOrderListPage({
    pageNo: 1,
    pageSize: 20,
    productSkcIdList: [Number(productSkcId)]
  });
}

async function locateLastNonEmptyOnSalePage(totalPages, pageSize, taskName) {
  const probeStep = 50;

  for (let page = totalPages; page >= 1; page -= probeStep) {
    if (isTaskCancelled(taskName)) {
      return null;
    }

    let response;
    try {
      response = await queryOnSaleProductPage(page, pageSize);
    } catch (error) {
      logProcess(`⚠️ 尾页探测失败，第 ${page} 页请求异常: ${error.message}`);
      continue;
    }

    if (!response || !response.success) {
      const errorMsg = response && response.errorMsg ? response.errorMsg : '未知错误';
      logProcess(`⚠️ 尾页探测失败，第 ${page} 页返回异常: ${errorMsg}`);
      continue;
    }

    const pageItems = Array.isArray(response.result && response.result.pageItems)
      ? response.result.pageItems
      : [];

    if (pageItems.length > 0) {
      logProcess(`✅ 尾页探测命中：第 ${page} 页有 ${pageItems.length} 条记录`);
      return page;
    }

    logProcess(`ℹ️ 尾页探测：第 ${page} 页为空，继续向前探测`);
    await sleep(250);
  }

  return null;
}

function resolveProductCreatedAt(item) {
  const candidates = [
    item && item.productCreateTime,
    item && item.createdAt,
    item && item.createdAtTs
  ];

  for (const value of candidates) {
    const timestamp = Number(value);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }

  return 0;
}

function buildUnshelveInfoFromOnSaleItem(item) {
  const productSkcId = Number(item && item.productSkcId);
  if (!Number.isFinite(productSkcId) || productSkcId <= 0) {
    return null;
  }

  return {
    isOnSale: true,
    spuId: item && item.productId ? String(item.productId) : '',
    skcId: productSkcId,
    name: item && item.productName ? item.productName : 'Product',
    img: item && item.mainImageUrl ? item.mainImageUrl : ''
  };
}

function flattenPurchaseOrderRows(list) {
  const rows = [];

  list.forEach((order) => {
    const skuDetails = Array.isArray(order && order.skuQuantityDetailList) ? order.skuQuantityDetailList : [];
    if (!skuDetails.length) {
      rows.push({
        subPurchaseOrderSn: order && order.subPurchaseOrderSn ? order.subPurchaseOrderSn : '',
        originalPurchaseOrderSn: order && order.originalPurchaseOrderSn ? order.originalPurchaseOrderSn : '',
        productSkcId: order && order.productSkcId ? String(order.productSkcId) : '',
        category: order && order.category ? String(order.category) : '',
        className: '',
        extCode: '',
        quantity: '',
        declaredPrice: '',
        unitCost: '',
        totalCost: '',
        totalSales: '',
        profit: '',
        currencyType: ''
      });
      return;
    }

    skuDetails.forEach((detail) => {
      const quantity = Number(detail && detail.purchaseQuantity);
      const declaredPrice = formatPurchasePrice(detail && detail.supplierPrice);
      const unitCost = resolveUnitCost(order, detail);
      const totalCost = Number.isFinite(quantity) && Number.isFinite(unitCost)
        ? formatAmount(quantity * unitCost)
        : '';
      const totalSales = Number.isFinite(quantity) && declaredPrice !== ''
        ? formatAmount(quantity * Number(declaredPrice))
        : '';
      const profit = totalSales !== '' && totalCost !== ''
        ? formatAmount(Number(totalSales) - Number(totalCost))
        : '';

      rows.push({
        subPurchaseOrderSn: order && order.subPurchaseOrderSn ? order.subPurchaseOrderSn : '',
        originalPurchaseOrderSn: order && order.originalPurchaseOrderSn ? order.originalPurchaseOrderSn : '',
        productSkcId: order && order.productSkcId ? String(order.productSkcId) : '',
        category: order && order.category ? String(order.category) : '',
        className: detail && detail.className ? detail.className : '',
        extCode: detail && detail.extCode ? detail.extCode : '',
        quantity: Number.isFinite(quantity) ? String(quantity) : '',
        declaredPrice,
        unitCost: Number.isFinite(unitCost) ? formatAmount(unitCost) : '',
        totalCost,
        totalSales,
        profit,
        currencyType: detail && detail.currencyType ? detail.currencyType : ''
      });
    });
  });

  return rows;
}

async function queryPurchaseOrderExportData(payload) {
  const purchaseTimeFrom = Number(payload.purchaseTimeFrom);
  const purchaseTimeTo = Number(payload.purchaseTimeTo);

  if (!Number.isFinite(purchaseTimeFrom) || !Number.isFinite(purchaseTimeTo)) {
    throw new Error('导出时间范围无效');
  }

  if (purchaseTimeFrom > purchaseTimeTo) {
    throw new Error('开始时间不能晚于结束时间');
  }

  const pageSize = 100;
  let pageNo = 1;
  let total = 0;
  const allOrders = [];

  while (true) {
    const response = await queryPurchaseOrderListPage({
      pageNo,
      pageSize,
      purchaseTimeFrom,
      purchaseTimeTo
    });

    if (!response || !response.success) {
      throw new Error(response && response.errorMsg ? response.errorMsg : '备货单查询失败');
    }

    const result = response.result || {};
    const pageList = Array.isArray(result.subOrderForSupplierList) ? result.subOrderForSupplierList : [];
    total = Number(result.total || total || 0);
    allOrders.push(...pageList);

    if (!pageList.length || allOrders.length >= total || pageList.length < pageSize) {
      break;
    }

    pageNo += 1;
  }

  return {
    total,
    orderCount: allOrders.length,
    records: flattenPurchaseOrderRows(allOrders)
  };
}

function normalizeSimpleText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value).trim() : '';
  }

  return '';
}

function buildItemCodeGroupKey(value) {
  return normalizeSimpleText(value).toUpperCase();
}

function searchValueByKeyPattern(node, keyPattern, visited = new Set()) {
  if (!node || typeof node !== 'object') {
    return '';
  }

  if (visited.has(node)) {
    return '';
  }
  visited.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = searchValueByKeyPattern(item, keyPattern, visited);
      if (found) {
        return found;
      }
    }
    return '';
  }

  for (const [key, rawValue] of Object.entries(node)) {
    if (!keyPattern.test(key)) {
      continue;
    }

    const normalizedValue = normalizeSimpleText(rawValue);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  for (const rawValue of Object.values(node)) {
    const found = searchValueByKeyPattern(rawValue, keyPattern, visited);
    if (found) {
      return found;
    }
  }

  return '';
}

function resolveOnSaleItemCode(item) {
  const directCandidates = [
    item && item.extCode,
    item && item.skcExtCode,
    item && item.goodsSn,
    item && item.goodsCode,
    item && item.outGoodsSn,
    item && item.outSkuSn,
    item && item.outSkuCode,
    item && item.outerSkuId,
    item && item.outerGoodsSn,
    item && item.productExtCode,
    item && item.productCode,
    item && item.productSn,
    item && item.skuCode,
    item && item.skuNo,
    item && item.cargoNo,
    item && item.sellerSku,
    item && item.sellerSkuCode,
    item && item.supplierSkuCode,
    item && item.merchantSku,
    item && item.merchantSkuCode,
    item && item.referenceCode,
    item && item.specificationCode
  ];

  for (const candidate of directCandidates) {
    const normalizedValue = normalizeSimpleText(candidate);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return searchValueByKeyPattern(
    item,
    /(extCode|goodsSn|goodsCode|outGoodsSn|outSkuSn|outSkuCode|outerSkuId|outerGoodsSn|skuCode|skuNo|cargoNo|sellerSku|sellerSkuCode|supplierSkuCode|merchantSku|merchantSkuCode|itemCode|productCode|productExtCode|productSn|referenceCode|specificationCode)$/i
  );
}

function collectDuplicateOnSaleSalesCandidates(items) {
  const groupedByItemCode = new Map();
  const seenRecordKeys = new Set();
  let skippedNoItemCodeCount = 0;
  let skippedIncompleteCount = 0;

  (items || []).forEach((item) => {
    const spuId = normalizeSimpleText(item && item.productId);
    const skcId = normalizeSimpleText(item && item.productSkcId);

    if (!spuId || !skcId) {
      skippedIncompleteCount += 1;
      return;
    }

    const dedupeKey = `${spuId}__${skcId}`;
    if (seenRecordKeys.has(dedupeKey)) {
      return;
    }
    seenRecordKeys.add(dedupeKey);

    const itemCode = resolveOnSaleItemCode(item);
    if (!itemCode) {
      skippedNoItemCodeCount += 1;
      return;
    }

    const groupKey = buildItemCodeGroupKey(itemCode);
    if (!groupKey) {
      skippedNoItemCodeCount += 1;
      return;
    }

    if (!groupedByItemCode.has(groupKey)) {
      groupedByItemCode.set(groupKey, {
        itemCode,
        spus: new Set(),
        records: []
      });
    }

    const group = groupedByItemCode.get(groupKey);
    group.spus.add(spuId);
    group.records.push({
      spuId,
      skcId,
      itemCode
    });
  });

  const matchedRecords = [];
  let duplicateGroupCount = 0;

  groupedByItemCode.forEach((group) => {
    if (group.spus.size <= 1) {
      return;
    }

    duplicateGroupCount += 1;
    matchedRecords.push(...group.records);
  });

  matchedRecords.sort((left, right) => (
    left.itemCode.localeCompare(right.itemCode, undefined, { numeric: true, sensitivity: 'base' })
    || left.spuId.localeCompare(right.spuId, undefined, { numeric: true })
    || left.skcId.localeCompare(right.skcId, undefined, { numeric: true })
  ));

  return {
    duplicateGroupCount,
    matchedRecords,
    skippedNoItemCodeCount,
    skippedIncompleteCount
  };
}

function sumPurchaseOrderQuantity(orderList) {
  return (orderList || []).reduce((totalQuantity, order) => {
    const skuDetails = Array.isArray(order && order.skuQuantityDetailList) ? order.skuQuantityDetailList : [];

    if (skuDetails.length) {
      return totalQuantity + skuDetails.reduce((detailTotal, detail) => {
        const quantity = Number(detail && detail.purchaseQuantity);
        return Number.isFinite(quantity) ? detailTotal + quantity : detailTotal;
      }, 0);
    }

    const fallbackQuantity = Number(order && (order.purchaseQuantity ?? order.quantity));
    return Number.isFinite(fallbackQuantity) ? totalQuantity + fallbackQuantity : totalQuantity;
  }, 0);
}

async function querySalesVolumeBySkc(productSkcId) {
  const pageSize = 100;
  let pageNo = 1;
  let totalOrderCount = 0;
  let totalSalesVolume = 0;

  while (true) {
    const response = await requestWithRetry(async () => {
      const result = await queryPurchaseOrderListPage({
        pageNo,
        pageSize,
        productSkcIdList: [Number(productSkcId)],
        timeoutMs: 40000
      });

      if (!result || !result.success) {
        throw new Error(result && result.errorMsg ? result.errorMsg : '销量查询失败');
      }

      return result;
    }, {
      retries: 2,
      baseDelayMs: 1000,
      label: `销量分页查询 SKC ${productSkcId} 第 ${pageNo} 页`
    });

    const result = response.result || {};
    const pageList = Array.isArray(result.subOrderForSupplierList) ? result.subOrderForSupplierList : [];
    totalOrderCount = Number(result.total || totalOrderCount || 0);
    totalSalesVolume += sumPurchaseOrderQuantity(pageList);

    const totalPages = totalOrderCount > 0 ? Math.max(1, Math.ceil(totalOrderCount / pageSize)) : 0;
    if (!pageList.length || (totalPages > 0 && pageNo >= totalPages)) {
      break;
    }

    pageNo += 1;
  }

  return {
    orderCount: totalOrderCount,
    salesVolume: totalSalesVolume
  };
}

async function queryAllOnSaleProductItems() {
  const pageSize = 100;
  let page = 1;
  let total = 0;
  let totalPages = 1;
  const allItems = [];

  while (page <= totalPages) {
    const response = await requestWithRetry(async () => {
      const result = await queryOnSaleProductPage(page, pageSize, { timeoutMs: 45000 });
      if (!result || !result.success) {
        throw new Error(result && result.errorMsg ? result.errorMsg : `第 ${page} 页在售商品查询失败`);
      }
      return result;
    }, {
      retries: 3,
      baseDelayMs: 1200,
      label: `在售商品查询第 ${page} 页`
    });

    const result = response.result || {};
    const pageItems = Array.isArray(result.pageItems) ? result.pageItems : [];
    total = Number(result.total || total || 0);
    totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : page;
    allItems.push(...pageItems);

    logProcess(`在售商品扫描进度：第 ${page}/${totalPages} 页，新增 ${pageItems.length} 条，累计 ${allItems.length} 条`);

    if (page >= totalPages) {
      break;
    }

    page += 1;
    await sleep(120);
  }

  return {
    total,
    items: allItems
  };
}

async function queryDuplicateOnSaleSalesExportData() {
  const { total, items } = await queryAllOnSaleProductItems();
  logProcess(`在售商品扫描完成，共拿到 ${items.length} 条记录（接口总数 ${total || items.length}）。`);

  const candidateSummary = collectDuplicateOnSaleSalesCandidates(items);
  const matchedRecords = candidateSummary.matchedRecords;

  if (!matchedRecords.length) {
    logProcess(`未找到“同货号但不同 SPU”的在售商品。未识别到货号的记录 ${candidateSummary.skippedNoItemCodeCount} 条。`);
    return {
      totalOnSaleItems: items.length,
      duplicateGroupCount: 0,
      matchedItemCount: 0,
      skippedNoItemCodeCount: candidateSummary.skippedNoItemCodeCount,
      skippedIncompleteCount: candidateSummary.skippedIncompleteCount,
      failedCount: 0,
      records: []
    };
  }

  logProcess(`识别到 ${candidateSummary.duplicateGroupCount} 组同货号不同 SPU 的在售商品，共 ${matchedRecords.length} 条，开始查询销量。`);

  const concurrency = 4;
  const exportRecords = [];
  let failedCount = 0;

  for (let index = 0; index < matchedRecords.length; index += concurrency) {
    const chunk = matchedRecords.slice(index, index + concurrency);
    const chunkResults = await Promise.all(chunk.map(async (record) => {
      try {
        const salesSummary = await querySalesVolumeBySkc(record.skcId);
        return {
          spuId: record.spuId,
          skcId: record.skcId,
          itemCode: record.itemCode,
          salesVolume: String(salesSummary.salesVolume)
        };
      } catch (error) {
        failedCount += 1;
        logProcess(`[${record.spuId}/${record.skcId}] 查询销量失败：${error.message}`, { immediate: true });
        return {
          spuId: record.spuId,
          skcId: record.skcId,
          itemCode: record.itemCode,
          salesVolume: ''
        };
      }
    }));

    exportRecords.push(...chunkResults);
    logProcess(`销量查询进度：${Math.min(index + chunk.length, matchedRecords.length)}/${matchedRecords.length}`);

    if (index + chunk.length < matchedRecords.length) {
      await sleep(150);
    }
  }

  return {
    totalOnSaleItems: items.length,
    duplicateGroupCount: candidateSummary.duplicateGroupCount,
    matchedItemCount: matchedRecords.length,
    skippedNoItemCodeCount: candidateSummary.skippedNoItemCodeCount,
    skippedIncompleteCount: candidateSummary.skippedIncompleteCount,
    failedCount,
    records: exportRecords
  };
}

function getCategoryChildren(parentCatId) {
  const requestBody = parentCatId ? { parentCatId: Number(parentCatId) } : {};
  return postJson('https://agentseller.temu.com/anniston-agent-seller/category/children/list', requestBody);
}

function flushPendingLogs() {
  logFlushTimer = null;
  if (!pendingLogMessages.length) {
    return;
  }

  const batchedMessage = pendingLogMessages.splice(0, pendingLogMessages.length).join('\n');
  chrome.runtime.sendMessage({ action: 'processLog', log: batchedMessage });
}

function scheduleLogFlush() {
  if (logFlushTimer !== null) {
    return;
  }

  logFlushTimer = setTimeout(flushPendingLogs, LOG_FLUSH_INTERVAL);
}

function flushLogsImmediately() {
  if (logFlushTimer !== null) {
    clearTimeout(logFlushTimer);
    logFlushTimer = null;
  }

  if (!pendingLogMessages.length) {
    return;
  }

  const batchedMessage = pendingLogMessages.splice(0, pendingLogMessages.length).join('\n');
  chrome.runtime.sendMessage({ action: 'processLog', log: batchedMessage, immediate: true });
}

function logProcess(message, options = {}) {
  const text = String(message || '');
  if (!text) {
    return;
  }

  const immediate = Boolean(options.immediate) || LOG_IMMEDIATE_PATTERN.test(text);
  if (immediate) {
    flushLogsImmediately();
    chrome.runtime.sendMessage({ action: 'processLog', log: text, immediate: true });
    return;
  }

  pendingLogMessages.push(text);
  scheduleLogFlush();
}

function finishProcess(stats, task) {
  flushLogsImmediately();
  chrome.runtime.sendMessage({ action: 'processComplete', stats: stats, task: task });
}

function clearTaskCancellation(taskName) {
  cancelledTasks.delete(taskName);
}

function isTaskCancelled(taskName) {
  return cancelledTasks.has(taskName);
}

function handleTaskCancellation(taskName, stats, message) {
  if (!isTaskCancelled(taskName)) {
    return false;
  }

  logProcess(message || `任务 ${taskName} 已收到停止指令，正在结束。`);
  finishProcess(stats, taskName);
  clearTaskCancellation(taskName);
  return true;
}


// ==========================================
// 3. 业务逻辑 A：自动下架 (原有功能)
// ==========================================

async function startOptimizedBatchProcess(spuList, taskName) {
  clearTaskCancellation(taskName);
  const stats = { success: 0, failed: 0, skipped: 0 };
  let parentMsgId;

  await ensureRequestHeadersReady();
  const mallid = dynamicHeaders.mallid;
  
  try {
    parentMsgId = await getLatestChatMsgId();
    logProcess(`会话ID获取成功: ${parentMsgId}`);
  } catch (e) {
    logProcess(`❌ 无法获取会话ID: ${e.message}，任务终止`, { immediate: true });
    finishProcess(stats, taskName);
    return;
  }

  const CONCURRENCY = 1;
  for (let i = 0; i < spuList.length; i += CONCURRENCY) {
    if (handleTaskCancellation(taskName, stats, '批量下架已停止。')) {
      return;
    }
    const chunk = spuList.slice(i, i + CONCURRENCY);
    
    const promises = chunk.map(async (spuId, idx) => {
      const globalIdx = i + idx + 1;
      const normalizedSpuId = String(spuId || '').trim();
      try {
        if (await TemuShopRecords.isSpuUnshelveRecorded(mallid, normalizedSpuId)) {
          stats.skipped += 1;
          logProcess(`[${globalIdx}] ${normalizedSpuId} 跳过 (本店已下架记录)`);
          return;
        }

        const status = await checkProductStatusForUnshelve(normalizedSpuId);

        if (!status.isOnSale) {
          stats.skipped += 1;
          logProcess(`[${globalIdx}] ${normalizedSpuId} 跳过 (不在售)`);
          return;
        }

        const res = await unshelveProduct(status, parentMsgId);
        if (res && res.success) {
          await TemuShopRecords.recordUnshelvedProduct(mallid, {
            spuId: normalizedSpuId,
            name: status.name || '',
            source: 'autoProcess'
          });
          stats.success += 1;
          logProcess(`[${globalIdx}] ${normalizedSpuId} ✅ 下架成功`);
        } else {
          stats.failed += 1;
          logProcess(`[${globalIdx}] ${normalizedSpuId} ❌ 下架失败: ${res && res.msg ? res.msg : '未知错误'}`, { immediate: true });
        }
      } catch (err) {
        stats.failed += 1;
        logProcess(`[${globalIdx}] ${normalizedSpuId} 异常: ${err.message}`, { immediate: true });
      }
    });

    await Promise.all(promises);
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
  }
  finishProcess(stats, taskName);
  clearTaskCancellation(taskName);
}

// 下架专用：查询商品状态
function checkProductStatusForUnshelve(spuId) {
  return new Promise((resolve) => {
    const apiUrl = 'https://agentseller.temu.com/api/kiana/mms/robin/searchForChainSupplier';
    const requestBody = {
      "pageSize": 10, "pageNum": 1,
      "secondarySelectStatusList": [], // 12=在售
      "supplierTodoTypeList": [],
      "productSpuIdList": [parseInt(spuId)]
    };

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'mallid': dynamicHeaders.mallid, 'origin': 'https://agentseller.temu.com' },
      body: JSON.stringify(requestBody)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.result && data.result.total > 0 && data.result.dataList && data.result.dataList.length > 0) {
        const item = data.result.dataList[0];
        let skcId = null;
        let img = '';
        if (item.skcList && item.skcList.length > 0) {
          skcId = item.skcList[0].skcId;
          img = item.skcList[0].skuPreviewImage;
        }
        if (!skcId) skcId = item.goodsId;
        if (!img && item.carouselImageUrlList && item.carouselImageUrlList.length > 0) {
            img = item.carouselImageUrlList[0];
        }
        resolve({ isOnSale: true, spuId: spuId, skcId: skcId, name: item.productName, img: img });
      } else {
        resolve({ isOnSale: false, spuId: spuId });
      }
    })
    .catch(err => resolve({ isOnSale: false, spuId: spuId, error: err.message }));
  });
}

// 执行下架请求
function unshelveProduct(info, parentMsgId) {
  return new Promise((resolve) => {
    if (!info.skcId) return resolve({ success: false, msg: '无SKC ID' });

    const apiUrl = 'https://agentseller.temu.com/bg/cute/api/merchantService/chat/sendMessage';
    const contentPayload = {
        name: info.name || "Product",
        img: info.img || "",
        dataType: 1,
        dataId: String(info.skcId),
        toolId: 2406230000031 // 下架 ToolId
    };

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'mallid': dynamicHeaders.mallid, 'origin': 'https://agentseller.temu.com' },
      body: JSON.stringify({
        parentMsgId: parentMsgId,
        contentType: 7,
        content: JSON.stringify(contentPayload)
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) resolve({ success: true });
      else resolve({ success: false, msg: data.error_msg || 'API Error' });
    })
    .catch(err => resolve({ success: false, msg: err.message }));
  });
}

// ==========================================
// 4. 业务逻辑 B：自动扫描并上架 (新增功能)
// ==========================================

async function startScanAndRelistLoop(taskName) {
    clearTaskCancellation(taskName);
    const stats = { success: 0, failed: 0, skipped: 0 };
    let page = 1;
    let hasMore = true;
    let parentMsgId = null;

    // 1. 获取会话ID
    try {
        parentMsgId = await getLatestChatMsgId();
        logProcess(`会话ID获取成功: ${parentMsgId}`);
    } catch (e) {
        logProcess(`❌ 无法获取会话ID，任务终止`, { immediate: true });
        finishProcess(stats, taskName);
        return;
    }

    // 2. 循环翻页处理
    while (hasMore) {
        if (handleTaskCancellation(taskName, stats, '自动扫描上架已停止。')) {
            return;
        }
        logProcess(`🔍 正在扫描第 ${page} 页已下架商品...`);

        try {
            // 获取一页下架商品 (status 13)
            const res = await getOffShelfList(page, 100); 
            
            if (res.success && res.result && res.result.dataList && res.result.dataList.length > 0) {
                const list = res.result.dataList;
                logProcess(`📄 第 ${page} 页获取到 ${list.length} 个商品，开始处理...`);

                // 提取关键信息
                const candidates = list.map(item => {
                    let skcId = null;
                    let img = null;
                    // 解析 JSON 结构提取 skcId 和 img
                    if (item.skcList && item.skcList.length > 0) {
                        skcId = item.skcList[0].skcId;
                        img = item.skcList[0].skuPreviewImage;
                    }
                    if (!img && item.carouselImageUrlList && item.carouselImageUrlList.length > 0) {
                        img = item.carouselImageUrlList[0];
                    }
                    return {
                        spuId: item.productId, // 这里 productId 即 SPU ID
                        skcId: skcId || item.goodsId,
                        name: item.productName,
                        img: img
                    };
                });

                // 批量处理这一页的商品 (查违规 -> 上架)
                await processRelistBatch(candidates, parentMsgId, stats, taskName);

                // 判断是否还有下一页
                if (list.length < 100) {
                    hasMore = false;
                    logProcess(`✅ 扫描完成，无更多数据。`, { immediate: true });
                } else {
                    page++;
                    // 翻页间隔，避免请求过快
                    await new Promise(r => setTimeout(r, 1000)); 
                }
            } else {
                logProcess(`⚠️ 第 ${page} 页无数据，扫描结束。`, { immediate: true });
                hasMore = false;
            }
        } catch (err) {
            logProcess(`❌ 第 ${page} 页请求失败: ${err.message}`, { immediate: true });
            hasMore = false; // 出错则停止，防止死循环
        }
    }

    finishProcess(stats, taskName);
    clearTaskCancellation(taskName);
}

async function runBatchDeleteLoop(taskName, stats, options) {
    const {
        label,
        queryPage,
        extractPageItems,
        emptyMessage,
        stopMessage,
        queryFailPrefix,
        pageSize
    } = options;
    const DELETE_CONCURRENCY = 8;
    const deferredProducts = new Map();
    const permanentlySkippedProductIds = new Set();
    let sweepRound = 0;
    let currentPage = 1;
    let deleteAttemptsThisSweep = 0;

    logProcess(`开始批量删除${label}商品（快速翻页模式）...`);

    function finishSweepIfStuck() {
        const retryableDeferredCount = Array.from(deferredProducts.keys()).filter((productId) => {
            return !permanentlySkippedProductIds.has(productId);
        }).length;

        if (deleteAttemptsThisSweep === 0 && retryableDeferredCount === 0) {
            const skippedCount = permanentlySkippedProductIds.size;
            if (skippedCount > 0) {
                logProcess(`✅ ${label}处理完成，${skippedCount} 个商品因状态限制已跳过。`, { immediate: true });
            } else {
                logProcess(`✅ ${emptyMessage}`, { immediate: true });
            }
            return true;
        }

        return false;
    }

    while (true) {
        if (handleTaskCancellation(taskName, stats, stopMessage)) {
            return 'cancelled';
        }

        let queryResult;
        try {
            queryResult = await queryPage(currentPage, pageSize);
        } catch (error) {
            logProcess(`❌ ${queryFailPrefix}：${error.message}`, { immediate: true });
            return 'error';
        }

        if (!queryResult || !queryResult.success) {
            const errorMsg = queryResult && queryResult.errorMsg ? queryResult.errorMsg : '未知错误';
            logProcess(`❌ ${queryFailPrefix}：${errorMsg}`, { immediate: true });
            return 'error';
        }

        const result = queryResult.result ? queryResult.result : {};
        const pageItems = extractPageItems(result);
        const total = Number(result.total || 0);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        if (currentPage === 1 && sweepRound === 0) {
            logProcess(`📊 当前${label}商品总数约 ${total} 个，共 ${totalPages} 页。`);
        }

        if (!pageItems.length) {
            if (currentPage < totalPages) {
                currentPage += 1;
                continue;
            }

            const retryableDeferredCount = Array.from(deferredProducts.keys()).filter((productId) => {
                return !permanentlySkippedProductIds.has(productId);
            }).length;

            if (retryableDeferredCount > 0) {
                sweepRound += 1;
                currentPage = 1;
                deleteAttemptsThisSweep = 0;
                logProcess(`🔄 ${label}完成一轮扫描，${retryableDeferredCount} 个延迟商品进入下一轮重试（第 ${sweepRound} 轮）。`);
                continue;
            }

            if (finishSweepIfStuck()) {
                break;
            }

            logProcess(`✅ ${emptyMessage}`, { immediate: true });
            break;
        }

        logProcess(`📄 ${label} 第 ${currentPage}/${totalPages} 页：${pageItems.length} 个商品，剩余约 ${total} 个`);

        const deleteTasks = [];
        const seenProductIds = new Set();
        let skippedByDefer = 0;

        for (const item of pageItems) {
            const productId = item && item.productId ? Number(item.productId) : 0;
            if (!productId) {
                stats.skipped += 1;
                continue;
            }
            if (seenProductIds.has(productId) || permanentlySkippedProductIds.has(productId)) {
                continue;
            }

            const deferredInfo = deferredProducts.get(productId);
            if (deferredInfo && sweepRound < deferredInfo.skipUntilSweep) {
                skippedByDefer += 1;
                continue;
            }

            seenProductIds.add(productId);
            deleteTasks.push({
                productId,
                name: item && item.productName ? item.productName : 'Product'
            });
        }

        if (!deleteTasks.length) {
            if (skippedByDefer > 0) {
                logProcess(`⏭️ ${label} 第 ${currentPage} 页商品暂跳过，立即翻页。`);
            }
            if (currentPage >= totalPages) {
                sweepRound += 1;
                currentPage = 1;
                if (finishSweepIfStuck()) {
                    break;
                }
                deleteAttemptsThisSweep = 0;
            } else {
                currentPage += 1;
            }
            continue;
        }

        let pageSuccess = 0;
        let pageDeferred = 0;
        let pageFailed = 0;

        for (let i = 0; i < deleteTasks.length; i += DELETE_CONCURRENCY) {
            if (handleTaskCancellation(taskName, stats, stopMessage)) {
                return 'cancelled';
            }

            const chunk = deleteTasks.slice(i, i + DELETE_CONCURRENCY);
            deleteAttemptsThisSweep += chunk.length;
            const results = await Promise.allSettled(
                chunk.map(({ productId }) => removeOffShelfProductWithRetry(productId))
            );

            results.forEach((resultItem, index) => {
                const { productId, name } = chunk[index];
                const shortName = name.length > 30 ? `${name.slice(0, 30)}...` : name;

                if (resultItem.status === 'fulfilled') {
                    const removeRes = resultItem.value;
                    if (removeRes && removeRes.success) {
                        stats.success += 1;
                        pageSuccess += 1;
                        deferredProducts.delete(productId);
                        logProcess(`[${productId}] ✅ 删除成功：${shortName}`);
                        return;
                    }

                    const errorMsg = resolveRemoveProductError(removeRes, '未知错误');
                    if (isDeletePermanentlyBlockedError(errorMsg)) {
                        permanentlySkippedProductIds.add(productId);
                        deferredProducts.delete(productId);
                        stats.skipped += 1;
                        logProcess(`[${productId}] ⏭️ 状态不可删，永久跳过：${shortName}`);
                        return;
                    }

                    if (isDeleteNotSupportedError(errorMsg)) {
                        const previousInfo = deferredProducts.get(productId) || { attempts: 0, skipUntilSweep: sweepRound };
                        const attempts = previousInfo.attempts + 1;

                        if (attempts >= DELETE_DEFER_MAX_ATTEMPTS) {
                            permanentlySkippedProductIds.add(productId);
                            deferredProducts.delete(productId);
                            stats.skipped += 1;
                            logProcess(`[${productId}] ⏭️ 永久跳过：${shortName}`);
                            return;
                        }

                        deferredProducts.set(productId, {
                            attempts,
                            skipUntilSweep: sweepRound + DELETE_DEFER_SKIP_SWEEPS
                        });
                        stats.skipped += 1;
                        pageDeferred += 1;
                        return;
                    }

                    stats.failed += 1;
                    pageFailed += 1;
                    logProcess(`[${productId}] ❌ 删除失败：${errorMsg}`, { immediate: true });
                    return;
                }

                stats.failed += 1;
                pageFailed += 1;
                const errorMsg = resultItem.reason && resultItem.reason.message ? resultItem.reason.message : '未知错误';
                logProcess(`[${productId}] ❌ 删除异常：${errorMsg}`, { immediate: true });
            });

            if (i + DELETE_CONCURRENCY < deleteTasks.length) {
                await sleep(80);
            }
        }

        if (pageDeferred > 0) {
            logProcess(`⏭️ ${label} 第 ${currentPage} 页有 ${pageDeferred} 个暂不可删，已跳过并继续翻页。`);
        }

        if (pageSuccess > 0) {
            await sleep(300);
            continue;
        }

        if (currentPage >= totalPages) {
            sweepRound += 1;
            currentPage = 1;
            if (finishSweepIfStuck()) {
                break;
            }
            deleteAttemptsThisSweep = 0;
            if (pageDeferred > 0 && pageFailed === 0) {
                logProcess(`🔄 ${label}本轮扫描结束，${pageDeferred} 个商品将在后续页码重试。`);
            }
        } else {
            currentPage += 1;
        }
    }

    return 'done';
}

async function startBatchDeleteOffShelfLoop(taskName) {
    clearTaskCancellation(taskName);
    const stats = { success: 0, failed: 0, skipped: 0 };
    const stopMessage = '批量删除商品任务已停止。';

    await ensureRequestHeadersReady();

    const offShelfResult = await runBatchDeleteLoop(taskName, stats, {
        label: '已下架',
        pageSize: 100,
        queryPage: queryOffShelfProductPage,
        extractPageItems: (result) => (Array.isArray(result.pageItems) ? result.pageItems : []),
        emptyMessage: '已下架商品已全部删除或列表为空。',
        stopMessage,
        queryFailPrefix: '查询已下架商品失败'
    });

    if (offShelfResult !== 'done') {
        finishProcess(stats, taskName);
        clearTaskCancellation(taskName);
        return;
    }

    const priceReviewFailedResult = await runBatchDeleteLoop(taskName, stats, {
        label: '核价未通过',
        pageSize: 100,
        queryPage: queryPriceReviewFailedProductPage,
        extractPageItems: (result) => (Array.isArray(result.dataList) ? result.dataList : []),
        emptyMessage: '核价未通过商品已全部删除或列表为空。',
        stopMessage,
        queryFailPrefix: '查询核价未通过商品失败'
    });

    finishProcess(stats, taskName);
    clearTaskCancellation(taskName);
}

// 并发处理一批待上架商品
async function processRelistBatch(candidates, parentMsgId, stats, taskName) {
    const CONCURRENCY = 3; // 并发数，保持适中
    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
        if (isTaskCancelled(taskName)) {
            return;
        }
        const chunk = candidates.slice(i, i + CONCURRENCY);
        
        const promises = chunk.map(async (item) => {
            try {
                // Step 1: 查违规
                const isSafe = await checkViolationSafe(item.spuId);
                
                if (isSafe) {
                    // Step 2: 上架
                    const res = await relistProduct(item, parentMsgId);
                    if (res.success) {
                        stats.success++;
                        logProcess(`[${item.spuId}] ✅ 上架成功`);
                    } else {
                        stats.failed++;
                        logProcess(`[${item.spuId}] ❌ 上架失败: ${res.msg}`, { immediate: true });
                    }
                } else {
                    stats.skipped++;
                    logProcess(`[${item.spuId}] 跳过 (存在违规)`);
                }
            } catch (e) {
                stats.failed++;
                logProcess(`[${item.spuId}] 异常: ${e.message}`, { immediate: true });
            }
        });

        await Promise.all(promises);
        // 批次间隔
        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
    }
}

async function startLongTermNoOrderUnshelve(taskName) {
    clearTaskCancellation(taskName);
    const stats = { success: 0, failed: 0, skipped: 0 };
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const PAGE_SIZE = 50;
    let totalPages = 1;
    let parentMsgId = null;

    try {
        parentMsgId = await getLatestChatMsgId();
        logProcess(`长期无单下架任务会话ID获取成功: ${parentMsgId}`);
    } catch (error) {
        logProcess(`❌ 无法获取会话ID: ${error.message}`, { immediate: true });
        finishProcess(stats, taskName);
        return;
    }

    let firstPageResponse;
    try {
        firstPageResponse = await queryOnSaleProductPage(1, PAGE_SIZE);
    } catch (error) {
        logProcess(`❌ 查询在售商品总页数失败: ${error.message}`, { immediate: true });
        finishProcess(stats, taskName);
        clearTaskCancellation(taskName);
        return;
    }

    if (!firstPageResponse || !firstPageResponse.success) {
        const errorMsg = firstPageResponse && firstPageResponse.errorMsg ? firstPageResponse.errorMsg : '未知错误';
        logProcess(`❌ 查询在售商品总页数失败: ${errorMsg}`, { immediate: true });
        finishProcess(stats, taskName);
        clearTaskCancellation(taskName);
        return;
    }

    const firstPageResult = firstPageResponse.result || {};
    const totalItems = Number(firstPageResult.total || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    logProcess(`在售商品总页数 ${totalPages}，开始定位可用尾页`);

    const startPage = await locateLastNonEmptyOnSalePage(totalPages, PAGE_SIZE, taskName);
    if (!startPage) {
        logProcess('❌ 未能定位到可用的尾页，任务终止。', { immediate: true });
        finishProcess(stats, taskName);
        clearTaskCancellation(taskName);
        return;
    }

    logProcess(`将从第 ${startPage} 页开始倒序扫描`);

    let emptyTailCount = 0;

    for (let page = startPage; page >= 1; page -= 1) {
        if (handleTaskCancellation(taskName, stats, '长期无单自动下架已停止。')) {
            return;
        }

        let response;
        try {
            response = await queryOnSaleProductPage(page, PAGE_SIZE);
        } catch (error) {
            logProcess(`❌ 查询在售商品第 ${page} 页失败: ${error.message}`, { immediate: true });
            finishProcess(stats, taskName);
            clearTaskCancellation(taskName);
            return;
        }

        if (!response || !response.success) {
            const errorMsg = response && response.errorMsg ? response.errorMsg : '未知错误';
            logProcess(`❌ 查询在售商品第 ${page} 页失败: ${errorMsg}`, { immediate: true });
            finishProcess(stats, taskName);
            clearTaskCancellation(taskName);
            return;
        }

        const result = response.result || {};
        const pageItems = Array.isArray(result.pageItems) ? result.pageItems : [];
        logProcess(`📄 在售商品第 ${page}/${startPage} 页，共 ${pageItems.length} 条，累计总数 ${totalItems}`);

        if (pageItems.length === 0) {
            emptyTailCount += 1;

            if (emptyTailCount >= 10) {
                logProcess(`⚠️ 连续 ${emptyTailCount} 页为空，停止本次倒序扫描。`, { immediate: true });
                break;
            }
            continue;
        }

        emptyTailCount = 0;

        for (const item of pageItems) {
            if (handleTaskCancellation(taskName, stats, '长期无单自动下架已停止。')) {
                return;
            }

            const productId = item && item.productId ? String(item.productId) : '';
            const productSkcId = item && item.productSkcId ? String(item.productSkcId) : '';
            const createdAt = resolveProductCreatedAt(item);

            if (!productId || !productSkcId || !createdAt) {
                stats.skipped++;
                logProcess(`[${productId || 'unknown'}] 跳过：商品关键信息不完整`);
                continue;
            }

            const listedDays = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000));
            if (Date.now() - createdAt < NINETY_DAYS_MS) {
                stats.skipped++;
                continue;
            }

            let orderResponse;
            try {
                orderResponse = await queryOrderHistoryBySkc(productSkcId);
            } catch (error) {
                stats.failed++;
                logProcess(`[${productId}] 查询订单失败: ${error.message}`, { immediate: true });
                continue;
            }

            if (!orderResponse || !orderResponse.success) {
                stats.failed++;
                logProcess(`[${productId}] 查询订单失败: ${orderResponse && orderResponse.errorMsg ? orderResponse.errorMsg : '未知错误'}`, { immediate: true });
                continue;
            }

            const orderResult = orderResponse.result || {};
            const orderList = Array.isArray(orderResult.subOrderForSupplierList) ? orderResult.subOrderForSupplierList : [];
            if (orderList.length > 0) {
                stats.skipped++;
                logProcess(`[${productId}] 跳过：上架 ${listedDays} 天，但已有 ${orderList.length} 条订单记录`);
                continue;
            }

            const unshelveInfo = buildUnshelveInfoFromOnSaleItem(item);
            if (!unshelveInfo) {
                stats.failed++;
                logProcess(`[${productId}] 下架失败：无法构造下架信息`, { immediate: true });
                continue;
            }

            const unshelveResult = await unshelveProduct(unshelveInfo, parentMsgId);
            if (unshelveResult && unshelveResult.success) {
                await TemuShopRecords.recordUnshelvedProduct(dynamicHeaders.mallid, {
                    spuId: productId,
                    name: unshelveInfo.name || '',
                    source: 'longTermNoOrderUnshelve'
                });
                stats.success++;
                logProcess(`[${productId}] ✅ 已下架：上架 ${listedDays} 天且从未出单`);
            } else {
                stats.failed++;
                logProcess(`[${productId}] ❌ 下架失败: ${unshelveResult && unshelveResult.msg ? unshelveResult.msg : '未知错误'}`, { immediate: true });
            }

            await sleep(250);
        }

        if (page > 1) {
            await sleep(500);
        }
    }

    finishProcess(stats, taskName);
    clearTaskCancellation(taskName);
}

async function startLowQualityUnshelve(taskName) {
    clearTaskCancellation(taskName);
    const stats = { success: 0, failed: 0, skipped: 0 };
    const exportRecords = [];
    let parentMsgId = null;

    await ensureRequestHeadersReady();
    const mallid = dynamicHeaders.mallid;

    try {
        parentMsgId = await getLatestChatMsgId();
        logProcess(`会话ID获取成功: ${parentMsgId}`);
    } catch (error) {
        logProcess(`❌ 无法获取会话ID: ${error.message}，任务终止`, { immediate: true });
        finishProcess({ ...stats, exportRecords }, taskName);
        clearTaskCancellation(taskName);
        return;
    }

    logProcess('开始扫描品质分低于 70 分的商品...');
    let qualityItems;
    try {
        qualityItems = await fetchAllLowQualityProducts(taskName);
    } catch (error) {
        logProcess(`❌ ${error.message}`, { immediate: true });
        finishProcess({ ...stats, exportRecords }, taskName);
        clearTaskCancellation(taskName);
        return;
    }

    if (qualityItems === null) {
        handleTaskCancellation(taskName, stats, '低品质商品下架任务已停止。');
        return;
    }

    logProcess(`共扫描到 ${qualityItems.length} 个品质分低于 70 分的商品，开始检查库存并处理...`);

    for (const item of qualityItems) {
        if (handleTaskCancellation(taskName, stats, '低品质商品下架任务已停止。')) {
            return;
        }

        const productId = item && item.productId ? String(item.productId) : '';
        const qualityScore = Number(item && item.goodsAfsScore);
        const shortName = item && item.productName
            ? (item.productName.length > 30 ? `${item.productName.slice(0, 30)}...` : item.productName)
            : 'Product';

        const baseRecord = {
            productId,
            productName: item && item.productName ? item.productName : '',
            categoryName: item && item.categoryName ? item.categoryName : '',
            qualityScore: Number.isFinite(qualityScore) ? qualityScore.toFixed(2) : '',
            warehouseInventory: '',
            action: '跳过',
            note: ''
        };

        if (!productId) {
            stats.skipped += 1;
            baseRecord.note = '缺少 productId';
            exportRecords.push(baseRecord);
            continue;
        }

        if (await TemuShopRecords.isSpuUnshelveRecorded(mallid, productId)) {
            stats.skipped += 1;
            baseRecord.note = '本店已下架记录';
            exportRecords.push(baseRecord);
            logProcess(`[${productId}] 跳过 (本店已下架记录)`);
            continue;
        }

        if (!Number.isFinite(qualityScore) || qualityScore >= LOW_QUALITY_UNSHELVE_SCORE_THRESHOLD) {
            stats.skipped += 1;
            baseRecord.action = '仅导出';
            baseRecord.note = '品质分不低于 60';
            exportRecords.push(baseRecord);
            continue;
        }

        let salesResponse;
        try {
            salesResponse = await querySalesListOverallByProductId(productId);
        } catch (error) {
            stats.failed += 1;
            baseRecord.action = '失败';
            baseRecord.note = `库存查询异常：${error.message}`;
            exportRecords.push(baseRecord);
            logProcess(`[${productId}] 库存查询异常：${error.message}`, { immediate: true });
            continue;
        }

        if (!salesResponse || !salesResponse.success) {
            stats.failed += 1;
            const errorMsg = salesResponse && salesResponse.errorMsg ? salesResponse.errorMsg : '未知错误';
            baseRecord.action = '失败';
            baseRecord.note = `库存查询失败：${errorMsg}`;
            exportRecords.push(baseRecord);
            logProcess(`[${productId}] 库存查询失败：${errorMsg}`, { immediate: true });
            continue;
        }

        const inventoryInfo = resolveWarehouseInventoryFromListOverall(salesResponse);
        baseRecord.warehouseInventory = String(inventoryInfo.inventory);

        if (inventoryInfo.inventory >= LOW_QUALITY_UNSHELVE_INVENTORY_THRESHOLD) {
            stats.skipped += 1;
            baseRecord.note = `库存 ${inventoryInfo.inventory} >= ${LOW_QUALITY_UNSHELVE_INVENTORY_THRESHOLD}`;
            exportRecords.push(baseRecord);
            logProcess(`[${productId}] 跳过：品质分 ${qualityScore.toFixed(2)}，库存 ${inventoryInfo.inventory}`);
            continue;
        }

        let unshelveInfo = buildUnshelveInfoFromQualityItem(item, inventoryInfo);
        if (!unshelveInfo) {
            const status = await checkProductStatusForUnshelve(productId);
            if (status.isOnSale && status.skcId) {
                unshelveInfo = status;
            }
        }

        if (!unshelveInfo || !unshelveInfo.skcId) {
            stats.failed += 1;
            baseRecord.action = '失败';
            baseRecord.note = '无法构造下架信息';
            exportRecords.push(baseRecord);
            logProcess(`[${productId}] 下架失败：无法构造下架信息`, { immediate: true });
            continue;
        }

        const unshelveResult = await unshelveProduct(unshelveInfo, parentMsgId);
        if (unshelveResult && unshelveResult.success) {
            await TemuShopRecords.recordUnshelvedProduct(mallid, {
                spuId: productId,
                name: unshelveInfo.name || '',
                source: 'lowQualityUnshelve'
            });
            stats.success += 1;
            baseRecord.action = '下架成功';
            baseRecord.note = `品质分 ${qualityScore.toFixed(2)}，库存 ${inventoryInfo.inventory}`;
            exportRecords.push(baseRecord);
            logProcess(`[${productId}] ✅ 下架成功：${shortName}（品质分 ${qualityScore.toFixed(2)}，库存 ${inventoryInfo.inventory}）`);
        } else {
            stats.failed += 1;
            const errorMsg = unshelveResult && unshelveResult.msg ? unshelveResult.msg : '未知错误';
            baseRecord.action = '下架失败';
            baseRecord.note = errorMsg;
            exportRecords.push(baseRecord);
            logProcess(`[${productId}] ❌ 下架失败：${errorMsg}`, { immediate: true });
        }

        await sleep(300);
    }

    logProcess(`低品质商品处理完成：下架 ${stats.success}，失败 ${stats.failed}，跳过 ${stats.skipped}，导出 ${exportRecords.length} 条`, { immediate: true });
    finishProcess({ ...stats, exportRecords }, taskName);
    clearTaskCancellation(taskName);
}

async function startDirectRelist(spuList, taskName) {
    clearTaskCancellation(taskName);
    const stats = { success: 0, failed: 0, skipped: 0 };
    let parentMsgId = null;

    try {
        parentMsgId = await getLatestChatMsgId();
        logProcess(`Direct relist session ready: ${parentMsgId}`);
    } catch (e) {
        logProcess(`Direct relist aborted: cannot get session ID: ${e.message}`, { immediate: true });
        finishProcess(stats, taskName);
        throw e;
    }

    const uniqueSpuList = Array.from(new Set((spuList || []).map(item => String(item).trim()).filter(item => /^\d+$/.test(item))));
    for (const spuId of uniqueSpuList) {
        if (handleTaskCancellation(taskName, stats, '直接上架已停止。')) {
            return;
        }
        try {
            logProcess(`[${spuId}] Looking up product info...`);
            const productInfo = await getProductInfoForRelist(spuId);

            if (!productInfo || !productInfo.skcId) {
                stats.failed++;
                logProcess(`[${spuId}] Failed: product info or skcId not found`, { immediate: true });
                continue;
            }

            const res = await relistProduct(productInfo, parentMsgId);
            if (res.success) {
                stats.success++;
                logProcess(`[${spuId}] Relist success`);
            } else {
                stats.failed++;
                logProcess(`[${spuId}] Relist failed: ${res.msg}`, { immediate: true });
            }
        } catch (e) {
            stats.failed++;
            logProcess(`[${spuId}] Error: ${e.message}`, { immediate: true });
        }

        await new Promise(r => setTimeout(r, 300 + Math.random() * 300));
    }

    finishProcess(stats, taskName);
    clearTaskCancellation(taskName);
}

function normalizePropertyFillConfig() {
    return {
        category: {
            id: Number(DEFAULT_PROPERTY_FILL_CONFIG.category.id),
            name: DEFAULT_PROPERTY_FILL_CONFIG.category.name,
            pageSize: Number(DEFAULT_PROPERTY_FILL_CONFIG.category.pageSize)
        },
        query: {
            productSiteStatus: 1,
            missingPropNames: ['\u786e\u5b9e\u5c5e\u6027'],
            queryScene: 1,
            productName: '',
            productIds: [],
            propAdjustTypes: [1]
        },
        material: {
            templatePid: Number(DEFAULT_PROPERTY_FILL_CONFIG.material.templatePid),
            pid: Number(DEFAULT_PROPERTY_FILL_CONFIG.material.pid),
            refPid: Number(DEFAULT_PROPERTY_FILL_CONFIG.material.refPid),
            propName: DEFAULT_PROPERTY_FILL_CONFIG.material.propName,
            vid: Number(DEFAULT_PROPERTY_FILL_CONFIG.material.vid),
            propValue: DEFAULT_PROPERTY_FILL_CONFIG.material.propValue,
            valueUnit: DEFAULT_PROPERTY_FILL_CONFIG.material.valueUnit,
            valueExtendInfo: DEFAULT_PROPERTY_FILL_CONFIG.material.valueExtendInfo,
            numberInputValue: DEFAULT_PROPERTY_FILL_CONFIG.material.numberInputValue
        },
        component: {
            templatePid: Number(DEFAULT_PROPERTY_FILL_CONFIG.component.templatePid),
            pid: Number(DEFAULT_PROPERTY_FILL_CONFIG.component.pid),
            refPid: Number(DEFAULT_PROPERTY_FILL_CONFIG.component.refPid),
            propName: DEFAULT_PROPERTY_FILL_CONFIG.component.propName,
            vid: Number(DEFAULT_PROPERTY_FILL_CONFIG.component.vid),
            propValue: DEFAULT_PROPERTY_FILL_CONFIG.component.propValue,
            valueUnit: DEFAULT_PROPERTY_FILL_CONFIG.component.valueUnit,
            valueExtendInfo: DEFAULT_PROPERTY_FILL_CONFIG.component.valueExtendInfo,
            numberInputValue: DEFAULT_PROPERTY_FILL_CONFIG.component.numberInputValue,
            controlType: Number(DEFAULT_PROPERTY_FILL_CONFIG.component.controlType)
        },
        properties: [
            Object.assign({}, DEFAULT_PROPERTY_FILL_CONFIG.material),
            Object.assign({}, DEFAULT_PROPERTY_FILL_CONFIG.component)
        ]
    };
}

function normalizeCustomProperty(property, fallback) {
    const source = property || {};
    const base = fallback || {};
    const normalized = {
        templatePid: Number(source.templatePid ?? base.templatePid ?? 0),
        pid: Number(source.pid ?? base.pid ?? 0),
        refPid: Number(source.refPid ?? base.refPid ?? 0),
        propName: source.propName ?? base.propName ?? '',
        vid: Number(source.vid ?? base.vid ?? 0),
        propValue: source.propValue ?? base.propValue ?? '',
        valueUnit: source.valueUnit ?? base.valueUnit ?? '',
        valueExtendInfo: source.valueExtendInfo ?? base.valueExtendInfo ?? '',
        numberInputValue: source.numberInputValue ?? base.numberInputValue ?? ''
    };

    if (source.controlType !== undefined || base.controlType !== undefined) {
        normalized.controlType = Number(source.controlType ?? base.controlType);
    }

    return normalized;
}

function normalizePropertyFillConfig(config) {
    const input = config || {};
    const category = input.category || {};
    const query = input.query || {};
    const execution = input.execution || {};

    const normalized = {
        category: {
            id: Number(category.id || DEFAULT_PROPERTY_FILL_CONFIG.category.id),
            name: category.name || DEFAULT_PROPERTY_FILL_CONFIG.category.name,
            pageSize: Number(category.pageSize || DEFAULT_PROPERTY_FILL_CONFIG.category.pageSize)
        },
        query: {
            productSiteStatus: query.productSiteStatus === '' || query.productSiteStatus === null || query.productSiteStatus === undefined
                ? 1
                : Number(query.productSiteStatus),
            missingPropNames: Array.isArray(query.missingPropNames) && query.missingPropNames.length
                ? query.missingPropNames.filter(Boolean)
                : ['确实属性'],
            queryScene: Number(query.queryScene || 1),
            productName: query.productName || '',
            productIds: Array.isArray(query.productIds) ? query.productIds.map((item) => Number(item)).filter(Boolean) : [],
            propAdjustTypes: Array.isArray(query.propAdjustTypes) && query.propAdjustTypes.length
                ? query.propAdjustTypes.map((item) => Number(item)).filter(Boolean)
                : [1]
        },
        execution: {
            concurrency: Math.max(1, Number(execution.concurrency || 1)),
            queryPagesPerRound: Math.max(1, Number(execution.queryPagesPerRound || 1)),
            recentCooldownMs: Math.max(1000, Number(execution.recentCooldownMs || 120000)),
            chunkDelayMs: Math.max(0, Number(execution.chunkDelayMs || 120)),
            roundDelayMs: Math.max(0, Number(execution.roundDelayMs || 800)),
            emptyRoundDelayMs: Math.max(0, Number(execution.emptyRoundDelayMs || 1200))
        }
    };

    if (Array.isArray(input.properties) && input.properties.length) {
        normalized.properties = input.properties.map((property) => normalizeCustomProperty(property));
        return normalized;
    }

    const material = input.material || {};
    const component = input.component || {};
    const normalizedMaterial = normalizeCustomProperty(material, DEFAULT_PROPERTY_FILL_CONFIG.material);
    const normalizedComponent = normalizeCustomProperty(component, DEFAULT_PROPERTY_FILL_CONFIG.component);

    normalized.material = normalizedMaterial;
    normalized.component = normalizedComponent;
    normalized.properties = [normalizedMaterial, normalizedComponent];

    return normalized;
}

async function startPropertyFill(config, taskName) {
    const normalizedConfig = normalizePropertyFillConfig(config);
    clearTaskCancellation(taskName);
    const stats = { success: 0, failed: 0, skipped: 0 };
    const recentlyTouchedProducts = new Map();
    const activeProductIds = new Set();
    let round = 1;

    logProcess(`开始查询类目“${normalizedConfig.category.name}”待补属性商品...`);

    while (true) {
        if (handleTaskCancellation(taskName, stats, `类目“${normalizedConfig.category.name}”属性补充已停止。`)) {
            return;
        }
        let queryResults;
        try {
            queryResults = await Promise.all(
                Array.from({ length: normalizedConfig.execution.queryPagesPerRound }, (_, index) => queryPropertyTasksPage({
                    page: index + 1,
                    pageSize: normalizedConfig.category.pageSize,
                    catIds: [normalizedConfig.category.id],
                    missingPropNames: normalizedConfig.query.missingPropNames,
                    propAdjustTypes: normalizedConfig.query.propAdjustTypes
                }))
            );
        } catch (error) {
            logProcess(`查询待补属性商品失败：${error.message}`);
            finishProcess(stats, taskName);
            throw error;
        }

        const successfulResults = queryResults.filter((result) => result && result.success);
        const total = successfulResults.reduce((maxTotal, result) => {
            const currentTotal = Number(result && result.result ? result.result.total : 0);
            return Math.max(maxTotal, currentTotal);
        }, 0);
        const fetchedItems = [];
        const seenProductIds = new Set();

        for (const resultItem of successfulResults) {
            const pageItems = Array.isArray(resultItem.result && resultItem.result.pageItems)
                ? resultItem.result.pageItems
                : [];
            for (const item of pageItems) {
                const productId = item && item.productId ? String(item.productId) : '';
                if (!productId || seenProductIds.has(productId)) {
                    continue;
                }
                seenProductIds.add(productId);
                fetchedItems.push(item);
            }
        }

        if (!successfulResults.length || fetchedItems.length === 0) {
            logProcess(`类目“${normalizedConfig.category.name}”待补属性商品已处理完成。`);
            break;
        }

        pruneExpiredRecentProducts(recentlyTouchedProducts, normalizedConfig.execution.recentCooldownMs);
        const candidateItems = fetchedItems.filter((item) => {
            const productId = item && item.productId ? String(item.productId) : '';
            if (!productId) {
                return true;
            }
            if (activeProductIds.has(productId)) {
                return false;
            }
            return !recentlyTouchedProducts.has(productId);
        });

        logProcess(`第 ${round} 轮扫描到 ${fetchedItems.length} 个候选商品，去重冷却后可处理 ${candidateItems.length} 个，当前总待处理约 ${total} 个。`);

        if (!candidateItems.length) {
            logProcess(`第 ${round} 轮命中的商品仍在处理中，等待后重试，避免重复提交。`);
            round += 1;
            await sleep(normalizedConfig.execution.emptyRoundDelayMs);
            continue;
        }

        for (let i = 0; i < candidateItems.length; i += normalizedConfig.execution.concurrency) {
            if (handleTaskCancellation(taskName, stats, `类目“${normalizedConfig.category.name}”属性补充已停止。`)) {
                return;
            }

            const chunk = candidateItems.slice(i, i + normalizedConfig.execution.concurrency);
            const results = await Promise.allSettled(
                chunk.map((item) => processPropertyFillItem(item, normalizedConfig, taskName, activeProductIds, recentlyTouchedProducts))
            );

            results.forEach((resultItem) => {
                if (resultItem.status !== 'fulfilled') {
                    stats.failed++;
                    logProcess(`属性补全异常：${resultItem.reason && resultItem.reason.message ? resultItem.reason.message : '未知错误'}`);
                    return;
                }

                const output = resultItem.value;
                if (output.status === 'success') {
                    stats.success++;
                    return;
                }
                if (output.status === 'failed') {
                    stats.failed++;
                    return;
                }
                stats.skipped++;
            });

            if (i + normalizedConfig.execution.concurrency < candidateItems.length) {
                await sleep(normalizedConfig.execution.chunkDelayMs);
            }
        }

        round += 1;
        await sleep(normalizedConfig.execution.roundDelayMs);
    }

    finishProcess(stats, taskName);
    clearTaskCancellation(taskName);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneExpiredRecentProducts(recentlyTouchedProducts, cooldownMs) {
    const now = Date.now();
    recentlyTouchedProducts.forEach((timestamp, productId) => {
        if (now - timestamp >= cooldownMs) {
            recentlyTouchedProducts.delete(productId);
        }
    });
}

function markProductRecentlyTouched(recentlyTouchedProducts, productId) {
    recentlyTouchedProducts.set(productId, Date.now());
}

async function processPropertyFillItem(item, config, taskName, activeProductIds, recentlyTouchedProducts) {
    if (isTaskCancelled(taskName)) {
        return { status: 'skipped' };
    }

    const productId = item && item.productId ? String(item.productId) : '';
    if (!productId) {
        logProcess('跳过一条无 productId 的记录。');
        return { status: 'skipped' };
    }

    activeProductIds.add(productId);
    markProductRecentlyTouched(recentlyTouchedProducts, productId);

    try {
        const editPayload = buildPropertyEditPayload(item, config);
        if (!editPayload) {
            logProcess(`[${productId}] 跳过：当前商品已存在对应属性组，接口不支持修改已有属性`);
            return { status: 'skipped' };
        }

        const pendingNames = editPayload.productProperties
            .filter((property) => !Array.isArray(item.productProperties) || !item.productProperties.some((existing) => getPropertyGroupKey(existing) === getPropertyGroupKey(property)))
            .map((property) => property.propName)
            .filter(Boolean);
        if (pendingNames.length) {
            logProcess(`[${productId}] 准备补充属性：${pendingNames.join('、')}`);
        }

        const editRes = await saveProductProperties(editPayload);
        if (editRes.success && editRes.result && editRes.result.success) {
            logProcess(`[${productId}] 属性补全成功`);
            return { status: 'success' };
        }

        const errorMsg = editRes.errorMsg || (editRes.result && editRes.result.errorMsg) || '未知错误';
        if (isProductAlreadyEditingError(errorMsg)) {
            logProcess(`[${productId}] 跳过：商品正在修改流程中，稍后再试`);
            return { status: 'skipped' };
        }

        logProcess(`[${productId}] 属性补全失败：${errorMsg}`);
        return { status: 'failed' };
    } catch (error) {
        logProcess(`[${productId}] 属性补全异常：${error.message}`);
        return { status: 'failed' };
    } finally {
        activeProductIds.delete(productId);
        markProductRecentlyTouched(recentlyTouchedProducts, productId);
    }
}

function isProductAlreadyEditingError(message) {
    const normalizedMessage = String(message || '');
    return normalizedMessage.includes('当前商品已提交修改')
        || normalizedMessage.includes('当前信息修改完成后再行修改')
        || normalizedMessage.includes('已提交修改');
}

// 获取已下架列表 (对应 searchForChainSupplier 接口)
function getOffShelfList(pageNum, pageSize) {
    return new Promise((resolve, reject) => {
        const apiUrl = 'https://agentseller.temu.com/api/kiana/mms/robin/searchForChainSupplier';
        const requestBody = {
            "pageSize": pageSize,
            "pageNum": pageNum,
            "secondarySelectStatusList": [13], // 13 = 已下架
            "supplierTodoTypeList": []
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'mallid': dynamicHeaders.mallid,
                'origin': 'https://agentseller.temu.com'
            },
            body: JSON.stringify(requestBody)
        })
        .then(res => res.json())
        .then(data => resolve(data))
        .catch(err => reject(err));
    });
}

function queryPropertyTasks(categoryId, pageNum, pageSize) {
    return postJson('https://agentseller.temu.com/visage-agent-seller/product/prop/adjust/task/pageQuery', {
        page: pageNum,
        pageSize: pageSize,
        catIds: [categoryId],
        propAdjustTypes: [1]
    });
}

function queryPropertyTasksPage(payload) {
    const requestBody = {
        page: Number(payload.page || 1),
        pageSize: Number(payload.pageSize || 10),
        propAdjustTypes: Array.isArray(payload.propAdjustTypes) && payload.propAdjustTypes.length
            ? payload.propAdjustTypes.map((item) => Number(item)).filter(Boolean)
            : [1]
    };

    if (Array.isArray(payload.catIds) && payload.catIds.length) {
        requestBody.catIds = payload.catIds.map((item) => Number(item)).filter(Boolean);
    }

    if (payload.productSiteStatus !== '' && payload.productSiteStatus !== null && payload.productSiteStatus !== undefined) {
        requestBody.productSiteStatus = Number(payload.productSiteStatus);
    }

    if (Array.isArray(payload.missingPropNames) && payload.missingPropNames.length) {
        requestBody.missingPropNames = payload.missingPropNames.filter(Boolean);
    }

    if (payload.queryScene !== '' && payload.queryScene !== null && payload.queryScene !== undefined) {
        requestBody.queryScene = Number(payload.queryScene);
    }

    if (payload.productName) {
        requestBody.productName = String(payload.productName).trim();
    }

    if (Array.isArray(payload.productIds)) {
        requestBody.productIds = payload.productIds.map((item) => Number(item)).filter(Boolean);
    }

    return postJson('https://agentseller.temu.com/visage-agent-seller/product/prop/adjust/task/pageQuery', requestBody);
}

function rejectPropertyAdjustTask(productId, propAdjustType) {
    return ensureRequestHeadersReady().then(() => {
    const rejectRequestMeta = dynamicHeaders.rejectRequestMeta || {};
    if (!rejectRequestMeta.antiContent) {
        logProcess(`[${productId}] 当前未采集到 anti-content，先尝试直接发起拒绝。`);
    }
    return postJsonWithCapturedHeaders('https://agentseller.temu.com/visage-agent-seller/product/prop/adjust/task/reject', {
        productId: Number(productId),
        propAdjustType: 201
    }, {
        ...(rejectRequestMeta.antiContent ? { 'anti-content': rejectRequestMeta.antiContent } : {}),
        'accept-language': rejectRequestMeta.acceptLanguage || 'en-US,en;q=0.9',
        'origin': rejectRequestMeta.origin || 'https://agentseller.temu.com',
        'referer': rejectRequestMeta.referer || 'https://agentseller.temu.com/goods/list'
    });
    });
}

async function startRejectPropertyAdjust(taskName) {
    clearTaskCancellation(taskName);
    const stats = { success: 0, failed: 0, skipped: 0 };
    const REJECT_CONCURRENCY = 8;
    const QUERY_PAGE_SIZE = 10;

    logProcess('开始查询属性待确认商品...');
    await ensureRequestHeadersReady();

    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages) {
        if (handleTaskCancellation(taskName, stats, '属性待确认拒绝任务已停止。')) {
            return;
        }

        let queryResult;
        try {
            queryResult = await queryRejectPropertyTasksPage(currentPage, QUERY_PAGE_SIZE);
        } catch (error) {
            logProcess(`查询属性待确认商品失败：${error.message}`);
            finishProcess(stats, taskName);
            throw error;
        }

        if (!queryResult || !queryResult.success) {
            const errorMsg = queryResult && queryResult.errorMsg ? queryResult.errorMsg : '未知错误';
            logProcess(`查询属性待确认商品失败：${errorMsg}`);
            finishProcess(stats, taskName);
            throw new Error(errorMsg);
        }

        const result = queryResult.result ? queryResult.result : {};
        const pageItems = Array.isArray(result.pageItems) ? result.pageItems : [];
        const total = Number(result.total || 0);
        totalPages = Math.max(1, Math.ceil(total / QUERY_PAGE_SIZE));

        logProcess(`第 ${currentPage} 页查询到 ${pageItems.length} 条商品，当前总待处理约 ${total} 个。`);

        if (!pageItems.length) {
            if (total === 0) {
                logProcess('属性待确认商品已处理完成。');
                break;
            }
            currentPage += 1;
            continue;
        }

        const rejectTasks = [];
        const seenProductIds = new Set();

        for (const item of pageItems) {
            const productId = item && item.productId ? Number(item.productId) : 0;
            if (!productId) {
                stats.skipped++;
                logProcess('跳过一条无 productId 的待确认记录。');
                continue;
            }
            if (seenProductIds.has(productId)) {
                continue;
            }
            seenProductIds.add(productId);
            rejectTasks.push({ productId, propAdjustType: 201 });
        }

        logProcess(`第 ${currentPage} 页准备拒绝 ${rejectTasks.length} 条商品。`);

        for (let i = 0; i < rejectTasks.length; i += REJECT_CONCURRENCY) {
            if (handleTaskCancellation(taskName, stats, '属性待确认拒绝任务已停止。')) {
                return;
            }
            const chunk = rejectTasks.slice(i, i + REJECT_CONCURRENCY);
            chunk.forEach(({ productId }) => {
                logProcess(`[${productId}] 开始拒绝，propAdjustType=201`);
            });
            const results = await Promise.allSettled(
                chunk.map(({ productId, propAdjustType }) => rejectPropertyAdjustTask(productId, propAdjustType))
            );

            results.forEach((resultItem, index) => {
                const { productId, propAdjustType } = chunk[index];

                if (resultItem.status === 'fulfilled') {
                    const rejectRes = resultItem.value;
                    if (rejectRes && rejectRes.success) {
                        stats.success++;
                        logProcess(`[${productId}] 拒绝成功，propAdjustType=201`);
                    } else {
                        stats.failed++;
                        logProcess(`[${productId}] 拒绝失败，propAdjustType=201：${rejectRes && rejectRes.errorMsg ? rejectRes.errorMsg : '未知错误'}`);
                    }
                } else {
                    stats.failed++;
                    logProcess(`[${productId}] 拒绝异常，propAdjustType=201：${resultItem.reason && resultItem.reason.message ? resultItem.reason.message : '未知错误'}`);
                }
            });

            await new Promise((resolve) => setTimeout(resolve, 120));
        }

        if (currentPage >= totalPages) {
            logProcess('属性待确认商品已处理完成。');
            break;
        }

        currentPage += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
    }

    finishProcess(stats, taskName);
    clearTaskCancellation(taskName);
}

function buildPropertyEditPayload(item, config) {
    const existingProperties = Array.isArray(item.productProperties) ? item.productProperties.map(cloneProductProperty) : [];
    const targetProperties = Array.isArray(config.properties) && config.properties.length
        ? config.properties.map((property) => cloneProductProperty(property))
        : [];

    // The platform endpoint only supports filling missing attributes.
    // If the product already has the same attribute group, sending a different
    // value may be treated as modifying/deleting an existing attribute.
    const existingGroupKeys = new Set(existingProperties.map((property) => getPropertyGroupKey(property)));
    const missingProperties = targetProperties.filter((property) => !existingGroupKeys.has(getPropertyGroupKey(property)));
    const finalProperties = [
        ...existingProperties,
        ...missingProperties
    ];

    if (!missingProperties.length) {
        return null;
    }

    return {
        productId: item.productId,
        productProperties: finalProperties,
        editScene: 1
    };
}

function cloneProductProperty(property) {
    const cloned = {
        templatePid: property.templatePid ?? null,
        pid: property.pid ?? null,
        refPid: property.refPid ?? null,
        propName: property.propName ?? '',
        vid: property.vid ?? null,
        propValue: property.propValue ?? '',
        valueUnit: property.valueUnit ?? '',
        valueExtendInfo: property.valueExtendInfo ?? '',
        numberInputValue: property.numberInputValue ?? ''
    };

    if (property.controlType !== undefined) {
        cloned.controlType = property.controlType;
    }

    return cloned;
}

function getPropertyGroupKey(property) {
    return `${property.pid ?? ''}_${property.refPid ?? ''}`;
}

function saveProductProperties(payload) {
    return postJson('https://agentseller.temu.com/visage-agent-seller/product/property/edit', payload);
}

window.TEMU_PROPERTY_FILL_PRESETS = {
    headband: normalizePropertyFillConfig(DEFAULT_PROPERTY_FILL_CONFIG),
    tablecloth: normalizePropertyFillConfig(TABLECLOTH_PROPERTY_FILL_CONFIG)
};

function getProductInfoForRelist(spuId) {
    return new Promise((resolve, reject) => {
        const apiUrl = 'https://agentseller.temu.com/api/kiana/mms/robin/searchForChainSupplier';
        const requestBody = {
            "pageSize": 10,
            "pageNum": 1,
            "secondarySelectStatusList": [],
            "supplierTodoTypeList": [],
            "productSpuIdList": [parseInt(spuId)]
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'mallid': dynamicHeaders.mallid,
                'origin': 'https://agentseller.temu.com'
            },
            body: JSON.stringify(requestBody)
        })
        .then(res => res.json())
        .then(data => {
            if (!(data.success && data.result && data.result.dataList && data.result.dataList.length > 0)) {
                reject(new Error('product not found'));
                return;
            }

            const item = data.result.dataList[0];
            let skcId = null;
            let img = '';

            if (item.skcList && item.skcList.length > 0) {
                skcId = item.skcList[0].skcId;
                img = item.skcList[0].skuPreviewImage || '';
            }

            if (!skcId) {
                skcId = item.goodsId;
            }

            if (!img && item.carouselImageUrlList && item.carouselImageUrlList.length > 0) {
                img = item.carouselImageUrlList[0];
            }

            resolve({
                spuId: String(spuId),
                skcId: skcId,
                name: item.productName || 'Product',
                img: img || ''
            });
        })
        .catch(err => reject(err));
    });
}

// 检查违规 (安全检查)
// 返回 true = 安全(可上架)，false = 不安全
function checkViolationSafe(spuId) {
    return new Promise((resolve) => {
        const apiUrl = 'https://agentseller.temu.com/mms/tmod_punish/agent/merchant_appeal/entrance/list';
        const requestBody = {
            "page_num": 1,
            "page_size": 10,
            "target_type": "goods",
            "appeal_status_list": [1, 2, 0],
            "spu_ids": [parseInt(spuId)]
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'mallid': dynamicHeaders.mallid,
                'origin': 'https://agentseller.temu.com'
            },
            body: JSON.stringify(requestBody)
        })
        .then(res => res.json())
        .then(data => {
            const punishList = data?.result?.punish_appeal_entrance_list || [];
            const hasDuplicateListingViolation = punishList.some(item => {
                const violationDesc = String(item?.violation_desc || '').trim();
                return violationDesc === '存在商品重复铺货的情况' || violationDesc.includes('重复铺货');
            });

            // 情况1: 特定错误码表示SPU不存在于违规库中 -> 安全
            // error_code: 1000002 -> "SPU ID not exist"
            if (data.success === false && data.error_code === 1000002) {
                resolve(true);
            }
            // 情况2: 请求成功但列表为空 -> 安全
            else if (data.success && punishList.length === 0) {
                resolve(true);
            }
            // 情况3: 只把“重复铺货”相关违规视为不安全，其他违规不阻止上架
            else if (data.success) {
                resolve(!hasDuplicateListingViolation);
            }
            // 其他情况: 未知错误 -> 不安全
            else {
                resolve(false);
            }
        })
        .catch(() => resolve(false)); // 出错保守处理，视为不安全
    });
}

// 执行上架 (ToolId: 2406230000016)
function relistProduct(info, parentMsgId) {
    return new Promise((resolve) => {
        if (!info.skcId) return resolve({ success: false, msg: '无SKC ID' });

        const apiUrl = 'https://agentseller.temu.com/bg/cute/api/merchantService/chat/sendMessage';
        const contentPayload = {
            name: info.name || "Product",
            img: info.img || "",
            dataType: 1,
            dataId: String(info.skcId),
            toolId: 2406230000016 // 上架工具ID
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'mallid': dynamicHeaders.mallid,
                'origin': 'https://agentseller.temu.com'
            },
            body: JSON.stringify({
                parentMsgId: parentMsgId,
                contentType: 7,
                content: JSON.stringify(contentPayload)
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) resolve({ success: true });
            else resolve({ success: false, msg: data.error_msg || 'API Error' });
        })
        .catch(err => resolve({ success: false, msg: err.message }));
    });
}
