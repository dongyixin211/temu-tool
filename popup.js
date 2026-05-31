document.addEventListener('DOMContentLoaded', () => {
  const HEADBAND_PROPERTY_FILL_CONFIG = {
    category: {
      id: 34566,
      name: '束发带',
      pageSize: 50
    },
    query: {
      productSiteStatus: 1,
      missingPropNames: ['确实属性'],
      queryScene: 1,
      productName: '',
      productIds: [],
      propAdjustTypes: [1]
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
      productSiteStatus: 1,
      missingPropNames: [],
      queryScene: 1,
      productName: '',
      productIds: [],
      propAdjustTypes: [1]
    },
    properties: [
      { templatePid: 1718155, pid: 89, refPid: 121, propName: '材料', vid: 2197, propValue: '涤纶', valueUnit: '', valueExtendInfo: '', numberInputValue: '' },
      { templatePid: 1718151, pid: 112, refPid: 131, propName: '矩形', vid: 2463, propValue: '矩形', valueUnit: '', valueExtendInfo: '', numberInputValue: '' },
      { templatePid: 1718152, pid: 127, refPid: 202, propName: '编织类型', vid: 18652, propValue: '机器制作', valueUnit: '', valueExtendInfo: '', numberInputValue: '' },
      { templatePid: 1718160, pid: 1224, refPid: 1192, propName: '织造方式', vid: 29810, propValue: '梭织', valueUnit: '', valueExtendInfo: '', numberInputValue: '' },
      { templatePid: 1757236, pid: 1225, refPid: 1193, propName: '制作工艺', vid: 29821, propValue: '印花', valueUnit: '', valueExtendInfo: '', numberInputValue: '', controlType: 1 },
      { templatePid: 1757236, pid: 1225, refPid: 1193, propName: '制作工艺', vid: 37644, propValue: '梭织', valueUnit: '', valueExtendInfo: '', numberInputValue: '', controlType: 1 },
      { templatePid: 1718156, pid: 2, refPid: 2021, propName: '封面材质', vid: 46248, propValue: '涤纶', valueUnit: '%', valueExtendInfo: '', numberInputValue: '100.00' },
      { templatePid: 1718165, pid: 1776, refPid: 3980, propName: '平方克重（g/㎡）', vid: 83894, propValue: '80-90g', valueUnit: '', valueExtendInfo: '', numberInputValue: '' },
      { templatePid: 1799469, pid: 2077, refPid: 6958, propName: '材质类型', vid: 198652, propValue: '纺织品材质', valueUnit: '', valueExtendInfo: '', numberInputValue: '', controlType: 1 }
    ]
  };

  const TASK_NAMES = ['extract', 'autoProcess', 'directRelist', 'propertyFill', 'tableclothPropertyFill', 'rejectPropertyAdjust', 'scanAndRelist', 'longTermNoOrderUnshelve', 'batchDeleteOffShelf', 'lowQualityUnshelve'];

  const extractBtn = document.getElementById('extractBtn');
  const autoProcessBtn = document.getElementById('autoProcessBtn');
  const directRelistBtn = document.getElementById('directRelistBtn');
  const propertyFillBtn = document.getElementById('headbandPropertyBtn');
  const tableclothPropertyBtn = document.getElementById('tableclothPropertyBtn');
  const rejectPropertyAdjustBtn = document.getElementById('rejectPropertyAdjustBtn');
  const autoScanAndRelistBtn = document.getElementById('autoScanAndRelistBtn');
  const longTermNoOrderUnshelveBtn = document.getElementById('longTermNoOrderUnshelveBtn');
  const lowQualityUnshelveBtn = document.getElementById('lowQualityUnshelveBtn');
  const batchDeleteOffShelfBtn = document.getElementById('batchDeleteOffShelfBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const copyBtn = document.getElementById('copyBtn');
  const stopAllBtn = document.getElementById('stopAllBtn');
  const checkTabBtn = document.getElementById('checkTabBtn');
  const clearLogBtn = document.getElementById('clearLogBtn');
  const exportPurchaseOrdersBtn = document.getElementById('exportPurchaseOrdersBtn');
  const analyzePendingPurchaseBtn = document.getElementById('analyzePendingPurchaseBtn');
  const exportDuplicateOnSaleSalesBtn = document.getElementById('exportDuplicateOnSaleSalesBtn');

  const result = document.getElementById('result');
  const directRelistInput = document.getElementById('directRelistInput');
  const totalCount = document.getElementById('totalCount');
  const directCount = document.getElementById('directCount');
  const processLog = document.getElementById('processLog');
  const scanSummary = document.getElementById('scanSummary');
  const directRelistSummary = document.getElementById('directRelistSummary');
  const propertySummary = document.getElementById('headbandSummary');
  const tableclothSummary = document.getElementById('tableclothSummary');
  const rejectPropertySummary = document.getElementById('rejectPropertySummary');
  const longTermNoOrderSummary = document.getElementById('longTermNoOrderSummary');
  const lowQualityUnshelveSummary = document.getElementById('lowQualityUnshelveSummary');
  const batchDeleteOffShelfSummary = document.getElementById('batchDeleteOffShelfSummary');
  const tabLabel = document.getElementById('tabLabel');
  const connectionBadge = document.getElementById('connectionBadge');
  const connectionText = document.getElementById('connectionText');
  const fixedCategoryLabel = document.getElementById('fixedCategoryLabel');
  const fixedRuleLabel = document.getElementById('fixedRuleLabel');
  const purchaseExportSummary = document.getElementById('purchaseExportSummary');
  const pendingPurchaseAnalysisSummary = document.getElementById('pendingPurchaseAnalysisSummary');
  const duplicateOnSaleSalesSummary = document.getElementById('duplicateOnSaleSalesSummary');

  const checkOnlyAppeal = document.getElementById('checkOnlyAppeal');
  const skipRecordedUnshelve = document.getElementById('skipRecordedUnshelve');
  const unshelveRecordSummary = document.getElementById('unshelveRecordSummary');
  const clearUnshelveRecordsBtn = document.getElementById('clearUnshelveRecordsBtn');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const violationTypeSelect = document.getElementById('violationType');
  const purchaseExportStartTimeInput = document.getElementById('purchaseExportStartTime');
  const purchaseExportEndTimeInput = document.getElementById('purchaseExportEndTime');

  const urlParams = new URLSearchParams(window.location.search);
  let targetTabId = Number(urlParams.get('tabId')) || null;
  let extractedSpuIds = [];
  let directRelistSpuIds = [];
  let currentMallId = '';
  const activeTasks = new Set();
  let stopRequested = false;
  const LOG_RENDER_BATCH_SIZE = 40;
  const MAX_LOG_LINES = 400;
  const LOG_FLUSH_DELAY = 120;
  const logBuffer = [];
  let logFlushTimer = null;

  const TASK_BUTTONS = {
    extract: extractBtn,
    autoProcess: autoProcessBtn,
    directRelist: directRelistBtn,
    propertyFill: propertyFillBtn,
    tableclothPropertyFill: tableclothPropertyBtn,
    rejectPropertyAdjust: rejectPropertyAdjustBtn,
    scanAndRelist: autoScanAndRelistBtn,
    longTermNoOrderUnshelve: longTermNoOrderUnshelveBtn,
    lowQualityUnshelve: lowQualityUnshelveBtn,
    batchDeleteOffShelf: batchDeleteOffShelfBtn
  };

  function parseSpuList(text) {
    return text.trim().split(/[\s,]+/).filter((id) => /^\d+$/.test(id));
  }

  async function refreshUnshelveRecordSummary() {
    if (!unshelveRecordSummary) {
      return;
    }

    if (!currentMallId) {
      unshelveRecordSummary.textContent = '当前店铺：- | 已记录下架：0 个';
      return;
    }

    const count = await TemuShopRecords.getMallUnshelveCount(currentMallId);
    unshelveRecordSummary.textContent = `当前店铺：${currentMallId} | 已记录下架：${count} 个`;
  }

  async function filterSpuIdsForCurrentShop(spuIds) {
    if (!skipRecordedUnshelve || !skipRecordedUnshelve.checked || !currentMallId) {
      return { kept: spuIds, skipped: 0 };
    }

    return TemuShopRecords.filterSpuIdsByUnshelveRecords(currentMallId, spuIds);
  }

  async function applyRecordedUnshelveFilter(spuIds, contextLabel) {
    const { kept, skipped } = await filterSpuIdsForCurrentShop(spuIds);
    if (skipped > 0) {
      appendLog(`${contextLabel}已跳过 ${skipped} 个本店已记录的下架商品。`);
    }
    return kept;
  }

  function padNumber(value) {
    return String(value).padStart(2, '0');
  }

  function formatDateTimeLocal(date) {
    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
  }

  function formatDateForFile(date) {
    return `${date.getFullYear()}${padNumber(date.getMonth() + 1)}${padNumber(date.getDate())}_${padNumber(date.getHours())}${padNumber(date.getMinutes())}${padNumber(date.getSeconds())}`;
  }

  function getDefaultExportRange() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  function escapeCsvCell(value) {
    const text = value == null ? '' : String(value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function downloadCsv(filename, rows) {
    const csvContent = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function buildPurchaseExportRows(records) {
    const header = ['备货单号', '备货母单号', '类目', 'SKC', '属性', 'SKU货号', '数量', '申报价格', '成本单价', '总成本', '订单销售额', '利润', '币种'];
    const rows = records.map((item) => [
      item.subPurchaseOrderSn || '',
      item.originalPurchaseOrderSn || '',
      item.category || '',
      item.productSkcId || '',
      item.className || '',
      item.extCode || '',
      item.quantity || '',
      item.declaredPrice || '',
      item.unitCost || '',
      item.totalCost || '',
      item.totalSales || '',
      item.profit || '',
      item.currencyType || ''
    ]);
    const totalCost = records.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const totalSales = records.reduce((sum, item) => sum + (Number(item.totalSales) || 0), 0);
    const totalProfit = records.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
    rows.push(['', '', '', '', '', '', '', '', '', '总成本', totalCost.toFixed(2), '', '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', '总销售额', totalSales.toFixed(2), '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', '总利润', totalProfit.toFixed(2), '']);
    return [header, ...rows];
  }

  function buildDuplicateOnSaleSalesExportRows(records) {
    const header = ['SPU', 'SKC', '货号', '销量'];
    const rows = records.map((item) => [
      item.spuId || '',
      item.skcId || '',
      item.itemCode || '',
      item.salesVolume == null ? '' : String(item.salesVolume)
    ]);
    return [header, ...rows];
  }

  function buildLowQualityExportRows(records) {
    const header = ['SPU', '商品名称', '类目', '品质分', '仓内库存', '处理结果', '备注'];
    const rows = records.map((item) => [
      item.productId || '',
      item.productName || '',
      item.categoryName || '',
      item.qualityScore || '',
      item.warehouseInventory || '',
      item.action || '',
      item.note || ''
    ]);
    return [header, ...rows];
  }

  function buildPendingPurchaseAnalysisRows(records) {
    const header = [
      '备货子单号',
      '备货母单号',
      'SPU',
      'SKC',
      '货号',
      '类目',
      '商品名称',
      '备货数量',
      '最晚发货时间',
      '今日可发货',
      '仓内库存',
      '近7天销量',
      '近30天销量',
      '今日销量',
      '可售天数',
      '品质分',
      '评价分',
      '评价数',
      '备货建议',
      '备注'
    ];
    const rows = records.map((item) => [
      item.subPurchaseOrderSn || '',
      item.originalPurchaseOrderSn || '',
      item.productId || '',
      item.productSkcId || '',
      item.productSn || '',
      item.category || '',
      item.productName || '',
      item.purchaseQuantity || '',
      item.expectLatestDeliverTime || '',
      item.todayCanDeliver || '',
      item.warehouseInventory === '' ? '' : String(item.warehouseInventory),
      item.lastSevenDaysSaleVolume === '' ? '' : String(item.lastSevenDaysSaleVolume),
      item.lastThirtyDaysSaleVolume === '' ? '' : String(item.lastThirtyDaysSaleVolume),
      item.todaySaleVolume === '' ? '' : String(item.todaySaleVolume),
      item.availableSaleDays === '' ? '' : String(item.availableSaleDays),
      item.qualityScore || '',
      item.avgReviewScore || '',
      item.reviewCount === '' ? '' : String(item.reviewCount),
      item.restockAdvice || '',
      item.note || ''
    ]);
    return [header, ...rows];
  }

  function downloadLowQualityExport(records) {
    if (!Array.isArray(records) || !records.length) {
      return null;
    }

    const rows = buildLowQualityExportRows(records);
    const filename = `temu_低品质商品处理_${formatDateForFile(new Date())}.csv`;
    downloadCsv(filename, rows);
    return filename;
  }

  async function runPurchaseOrderExport() {
    if (!(await initCookies())) {
      return;
    }

    if (!purchaseExportStartTimeInput.value || !purchaseExportEndTimeInput.value) {
      appendLog('请先选择导出时间范围。');
      purchaseExportSummary.textContent = '请先补全导出开始时间和结束时间。';
      return;
    }

    const start = new Date(purchaseExportStartTimeInput.value);
    const end = new Date(purchaseExportEndTimeInput.value);
    start.setSeconds(0, 0);
    end.setSeconds(59, 999);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      appendLog('导出时间格式无效，请重新选择。');
      purchaseExportSummary.textContent = '导出时间格式无效，请重新选择。';
      return;
    }

    if (start.getTime() > end.getTime()) {
      appendLog('导出开始时间不能晚于结束时间。');
      purchaseExportSummary.textContent = '导出开始时间不能晚于结束时间。';
      return;
    }

    exportPurchaseOrdersBtn.disabled = true;
    purchaseExportSummary.textContent = '正在查询并整理备货单数据，请稍候...';
    appendLog(`开始导出备货单，时间范围：${purchaseExportStartTimeInput.value} ~ ${purchaseExportEndTimeInput.value}`);

    try {
      const response = await sendMessage({
        action: 'queryPurchaseOrderExportData',
        payload: {
          purchaseTimeFrom: start.getTime(),
          purchaseTimeTo: end.getTime()
        }
      });

      if (!response || !response.success) {
        throw new Error(response && response.error ? response.error : '查询失败');
      }

      const records = Array.isArray(response.data && response.data.records) ? response.data.records : [];
      if (!records.length) {
        purchaseExportSummary.textContent = '当前时间范围没有查询到备货单数据。';
        appendLog('导出完成，但当前时间范围没有可导出的备货单。');
        return;
      }

      const rows = buildPurchaseExportRows(records);
      const filename = `temu_备货单导出_${formatDateForFile(start)}_${formatDateForFile(end)}.csv`;
      const totalCost = records.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
      const totalSales = records.reduce((sum, item) => sum + (Number(item.totalSales) || 0), 0);
      const totalProfit = records.reduce((sum, item) => sum + (Number(item.profit) || 0), 0);
      downloadCsv(filename, rows);

      purchaseExportSummary.textContent = `导出完成，共 ${records.length} 条记录，总成本 ${totalCost.toFixed(2)}，总销售额 ${totalSales.toFixed(2)}，总利润 ${totalProfit.toFixed(2)}。`;
      appendLog(`备货单导出完成，共 ${records.length} 条记录，总成本 ${totalCost.toFixed(2)}，总销售额 ${totalSales.toFixed(2)}，总利润 ${totalProfit.toFixed(2)}，文件名：${filename}`);
    } catch (error) {
      purchaseExportSummary.textContent = `导出失败：${error.message}`;
      appendLog(`备货单导出失败：${error.message}`);
    } finally {
      exportPurchaseOrdersBtn.disabled = false;
    }
  }

  async function runPendingPurchaseAnalysis() {
    if (!(await initCookies())) {
      return;
    }

    analyzePendingPurchaseBtn.disabled = true;
    pendingPurchaseAnalysisSummary.textContent = '正在查询待发货备货单并汇总销售/品质数据，请稍候...';
    appendLog('开始分析待发货普通备货单：汇总销量、库存、品质分、评价分。');

    try {
      const response = await sendMessage({ action: 'queryPendingPurchaseRestockAnalysis' });
      if (!response || !response.success) {
        throw new Error(response && response.error ? response.error : '查询失败');
      }

      const data = response.data || {};
      const records = Array.isArray(data.records) ? data.records : [];
      if (!records.length) {
        pendingPurchaseAnalysisSummary.textContent = '当前没有待发货的普通备货单。';
        appendLog('分析完成，当前没有待发货的普通备货单。');
        return;
      }

      const rows = buildPendingPurchaseAnalysisRows(records);
      const filename = `temu_待发货备货分析_${formatDateForFile(new Date())}.csv`;
      downloadCsv(filename, rows);

      const adviceSummary = data.adviceSummary || {};
      const adviceText = Object.entries(adviceSummary)
        .map(([key, count]) => `${key} ${count}`)
        .join('；');

      pendingPurchaseAnalysisSummary.textContent = `分析完成，共 ${records.length} 条备货单，涉及 ${data.uniqueProducts || 0} 个 SPU。${adviceText}`;
      appendLog(`待发货备货分析完成，共 ${records.length} 条，建议分布：${adviceText}，文件名：${filename}`);
    } catch (error) {
      pendingPurchaseAnalysisSummary.textContent = `分析失败：${error.message}`;
      appendLog(`待发货备货分析失败：${error.message}`);
    } finally {
      analyzePendingPurchaseBtn.disabled = false;
    }
  }

  async function runDuplicateOnSaleSalesExport() {
    if (!(await initCookies())) {
      return;
    }

    exportDuplicateOnSaleSalesBtn.disabled = true;
    duplicateOnSaleSalesSummary.textContent = '正在扫描在售商品并汇总销量，请稍候...';
    appendLog('开始导出同货号但不同 SPU 的在售商品销量...');

    try {
      const response = await sendMessage({ action: 'queryDuplicateOnSaleSalesExportData' });
      if (!response || !response.success) {
        throw new Error(response && response.error ? response.error : '查询失败');
      }

      const data = response.data || {};
      const records = Array.isArray(data.records) ? data.records : [];
      const duplicateGroupCount = Number(data.duplicateGroupCount || 0);
      const skippedNoItemCodeCount = Number(data.skippedNoItemCodeCount || 0);
      const failedCount = Number(data.failedCount || 0);

      if (!records.length) {
        duplicateOnSaleSalesSummary.textContent = '未找到同货号但不同 SPU 的在售商品。';
        appendLog(`扫描完成，未找到可导出的同货号商品；未识别货号 ${skippedNoItemCodeCount} 条。`);
        return;
      }

      const rows = buildDuplicateOnSaleSalesExportRows(records);
      const filename = `temu_同货号不同SPU在售销量_${formatDateForFile(new Date())}.csv`;
      downloadCsv(filename, rows);

      const totalSalesVolume = records.reduce((sum, item) => sum + (Number(item.salesVolume) || 0), 0);
      const summaryParts = [
        `导出完成，共 ${records.length} 条记录`,
        `命中 ${duplicateGroupCount} 组货号`,
        `累计销量 ${totalSalesVolume}`
      ];

      if (failedCount > 0) {
        summaryParts.push(`${failedCount} 条销量查询失败`);
      }
      if (skippedNoItemCodeCount > 0) {
        summaryParts.push(`${skippedNoItemCodeCount} 条未识别货号`);
      }

      duplicateOnSaleSalesSummary.textContent = `${summaryParts.join('，')}。`;
      appendLog(`同货号销量导出完成，共 ${records.length} 条记录，命中 ${duplicateGroupCount} 组货号，累计销量 ${totalSalesVolume}，文件名：${filename}`);
    } catch (error) {
      duplicateOnSaleSalesSummary.textContent = `导出失败：${error.message}`;
      appendLog(`同货号销量导出失败：${error.message}`);
    } finally {
      exportDuplicateOnSaleSalesBtn.disabled = false;
    }
  }

  function trimLogNodes() {
    while (processLog.childElementCount > MAX_LOG_LINES) {
      processLog.removeChild(processLog.firstElementChild);
    }
  }

  function flushLogs() {
    logFlushTimer = null;
    if (!logBuffer.length) {
      return;
    }

    if (processLog.textContent.trim() === '> 等待任务...') {
      processLog.textContent = '';
    }

    const shouldStickToBottom = processLog.scrollTop + processLog.clientHeight >= processLog.scrollHeight - 24;
    const fragment = document.createDocumentFragment();
    const batch = logBuffer.splice(0, LOG_RENDER_BATCH_SIZE);

    batch.forEach((message) => {
      const div = document.createElement('div');
      div.textContent = `> ${message}`;
      fragment.appendChild(div);
    });

    processLog.appendChild(fragment);
    trimLogNodes();

    if (shouldStickToBottom) {
      processLog.scrollTop = processLog.scrollHeight;
    }

    if (logBuffer.length) {
      logFlushTimer = window.setTimeout(flushLogs, LOG_FLUSH_DELAY);
    }
  }

  function scheduleLogFlush(immediate = false) {
    if (logFlushTimer !== null) {
      if (immediate) {
        window.clearTimeout(logFlushTimer);
        logFlushTimer = null;
      } else {
        return;
      }
    }

    if (immediate) {
      flushLogs();
      return;
    }

    logFlushTimer = window.setTimeout(flushLogs, LOG_FLUSH_DELAY);
  }

  function appendLog(message, options = {}) {
    logBuffer.push(message);
    scheduleLogFlush(Boolean(options.immediate));
  }

  function resetLogView() {
    logBuffer.length = 0;
    if (logFlushTimer !== null) {
      window.clearTimeout(logFlushTimer);
      logFlushTimer = null;
    }
    processLog.textContent = '> 等待任务...';
  }

  function setConnection(connected, text) {
    connectionBadge.classList.toggle('connected', connected);
    connectionText.textContent = text;
  }

  function syncResultStats() {
    extractedSpuIds = result.value.trim() ? parseSpuList(result.value) : [];
    totalCount.textContent = String(extractedSpuIds.length);
    scanSummary.textContent = extractedSpuIds.length > 0
      ? `已准备 ${extractedSpuIds.length} 个 SPU，可直接执行批量下架。`
      : '请从 TEMU 商家后台页面打开此窗口，再开始扫描或批量处理。';
  }

  function syncDirectRelistStats() {
    directRelistSpuIds = directRelistInput.value.trim() ? parseSpuList(directRelistInput.value) : [];
    directCount.textContent = String(directRelistSpuIds.length);
    directRelistSummary.textContent = directRelistSpuIds.length > 0
      ? `已准备 ${directRelistSpuIds.length} 个 SPU，可直接执行上架。`
      : '此模式会跳过下架列表扫描，直接按你提供的 SPU ID 发起上架。';
  }

  function setTaskRunning(taskName, running) {
    const button = TASK_BUTTONS[taskName];
    if (!button) return;

    if (running) {
      activeTasks.add(taskName);
    } else {
      activeTasks.delete(taskName);
    }

    button.disabled = running;
  }

  function formatTabLabel(tab) {
    return tab && typeof tab.id === 'number' ? `#${tab.id}` : '未绑定';
  }

  async function ensureTargetTab() {
    if (!targetTabId) {
      setConnection(false, '未绑定目标页');
      tabLabel.textContent = '未绑定';
      appendLog('请先从 TEMU 商家后台页面打开此窗口。');
      return null;
    }

    const tab = await chrome.tabs.get(targetTabId).catch(() => null);
    const isValidTemuTab = tab && tab.url && tab.url.includes('agentseller.temu.com');
    tabLabel.textContent = formatTabLabel(tab);

    if (!isValidTemuTab) {
      setConnection(false, '连接已失效');
      appendLog('目标标签页不可用，请回到 TEMU 商家后台重新点击扩展图标。');
      return null;
    }

    setConnection(true, '已连接');
    return tab;
  }

  async function sendMessage(message) {
    const tab = await ensureTargetTab();
    if (!tab) {
      return { success: false, error: '未找到可用的 TEMU 商家后台标签页' };
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: '页面通信失败，请刷新 TEMU 页面后重试。' });
          return;
        }

        resolve(response || { success: false, error: '页面未返回结果。' });
      });
    });
  }

  async function initCookies() {
    const tab = await ensureTargetTab();
    if (!tab) {
      return false;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['shopRecords.js', 'content.js']
      });
    } catch (error) {
      // already injected
    }

    const cookieRes = await sendMessage({ action: 'getCookies' });
    if (!cookieRes.success || !cookieRes.data) {
      appendLog(`Cookie 初始化失败：${cookieRes.error || '未知错误'}`);
      return false;
    }

    currentMallId = String(cookieRes.data.mallid || '').trim();
    await refreshUnshelveRecordSummary();

    const headerRes = await sendMessage({
      action: 'setRequestHeaders',
      headers: {
        mallid: cookieRes.data.mallid,
        cookies: cookieRes.data.cookies
      }
    });

    if (!headerRes.success) {
      appendLog(`请求头初始化失败：${headerRes.error || '未知错误'}`);
      return false;
    }

    return true;
  }

  async function runExtract() {
    if (activeTasks.has('extract') || !(await initCookies())) {
      return;
    }

    stopRequested = false;
    setTaskRunning('extract', true);
    extractedSpuIds = [];
    result.value = '';
    syncResultStats();
    extractBtn.textContent = '扫描中...';

    const filterConfig = {
      targetType: 'goods',
      appealStatus: checkOnlyAppeal.checked ? [0, 1, 2] : undefined
    };

    if (startTimeInput.value) filterConfig.punishStartTime = new Date(startTimeInput.value).getTime();
    if (endTimeInput.value) filterConfig.punishEndTime = new Date(endTimeInput.value).getTime();
    if (violationTypeSelect.value) filterConfig.violationType = Number(violationTypeSelect.value);

    let page = 1;
    let hasMore = true;
    let skippedRecordedCount = 0;
    appendLog('开始扫描违规列表...');

    try {
      while (hasMore) {
        if (stopRequested) {
          appendLog('违规扫描已停止。');
          break;
        }

        const res = await sendMessage({
          action: 'getViolationData',
          pageNum: page,
          pageSize: 100,
          filters: filterConfig
        });

        const list = res && res.result && res.result.punish_appeal_entrance_list;
        if (res.success && Array.isArray(list) && list.length > 0) {
          let ids = list.map((item) => item.spu_id).filter(Boolean);
          let pageSkipped = 0;
          if (skipRecordedUnshelve && skipRecordedUnshelve.checked && currentMallId) {
            const filtered = await TemuShopRecords.filterSpuIdsByUnshelveRecords(currentMallId, ids);
            pageSkipped = filtered.skipped;
            skippedRecordedCount += filtered.skipped;
            ids = filtered.kept;
          }

          extractedSpuIds.push(...ids);
          result.value = extractedSpuIds.join(' ');
          syncResultStats();
          appendLog(`第 ${page} 页新增 ${ids.length} 个 SPU${pageSkipped ? `，跳过已记录 ${pageSkipped} 个` : ''}`);

          if (list.length < 100) {
            hasMore = false;
          } else {
            page += 1;
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } else {
          hasMore = false;
        }
      }

      if (skippedRecordedCount > 0) {
        appendLog(`扫描完成，共识别 ${extractedSpuIds.length} 个 SPU，累计跳过已记录下架 ${skippedRecordedCount} 个`);
      } else {
        appendLog(`扫描完成，共识别 ${extractedSpuIds.length} 个 SPU`);
      }
    } catch (error) {
      appendLog(`扫描中断：${error.message}`);
    } finally {
      setTaskRunning('extract', false);
      extractBtn.textContent = '开始扫描违规商品';
    }
  }

  async function runBatchUnshelve() {
    const sourceSpuIds = parseSpuList(result.value);
    if (!sourceSpuIds.length) {
      appendLog('请先扫描或粘贴 SPU ID。');
      return;
    }

    const spuList = await applyRecordedUnshelveFilter(sourceSpuIds, '批量下架前');
    if (!spuList.length) {
      appendLog('剩余 SPU 均已在本店下架记录中，无需重复处理。');
      return;
    }

    if (!window.confirm(`确认批量下架 ${spuList.length} 个 SPU 吗？`) || !(await initCookies())) {
      return;
    }

    setTaskRunning('autoProcess', true);
    appendLog(`开始批量下架，共 ${spuList.length} 个 SPU。`);
    await sendMessage({ action: 'startAutoProcess', spuList, taskName: 'autoProcess' });
  }

  async function clearCurrentShopUnshelveRecords() {
    if (!currentMallId) {
      if (!(await initCookies())) {
        return;
      }
    }

    if (!currentMallId) {
      appendLog('无法识别当前店铺，请先在 TEMU 商家后台打开扩展。');
      return;
    }

    const count = await TemuShopRecords.getMallUnshelveCount(currentMallId);
    if (!count) {
      appendLog(`店铺 ${currentMallId} 暂无下架记录。`);
      await refreshUnshelveRecordSummary();
      return;
    }

    if (!window.confirm(`确认清空店铺 ${currentMallId} 的 ${count} 条下架记录吗？`)) {
      return;
    }

    await TemuShopRecords.clearMallUnshelveRecords(currentMallId);
    await refreshUnshelveRecordSummary();
    appendLog(`已清空店铺 ${currentMallId} 的下架记录。`);
  }

  async function runDirectRelist() {
    if (directRelistSpuIds.length === 0) {
      appendLog('请先粘贴要直接上架的 SPU ID。');
      return;
    }

    if (!window.confirm(`确认直接上架 ${directRelistSpuIds.length} 个 SPU 吗？`) || !(await initCookies())) {
      return;
    }

    setTaskRunning('directRelist', true);
    appendLog(`开始直接上架，共 ${directRelistSpuIds.length} 个 SPU。`);
    await sendMessage({ action: 'startDirectRelist', spuList: directRelistSpuIds, taskName: 'directRelist' });
  }

  async function runPropertyFill() {
    if (activeTasks.has('propertyFill') || !(await initCookies())) {
      return;
    }

    setTaskRunning('propertyFill', true);
    propertySummary.textContent = '任务进行中：正在按束发带固定规则批量补全属性。';
    appendLog(`开始执行束发带属性补全，类目：${HEADBAND_PROPERTY_FILL_CONFIG.category.name} (${HEADBAND_PROPERTY_FILL_CONFIG.category.id})`);

    const response = await sendMessage({
      action: 'startPropertyFill',
      config: HEADBAND_PROPERTY_FILL_CONFIG,
      taskName: 'propertyFill'
    });

    if (!response.success) {
      setTaskRunning('propertyFill', false);
      propertySummary.textContent = `任务启动失败：${response.error || '未知错误'}`;
      appendLog(`束发带属性补全启动失败：${response.error || '未知错误'}`);
    }
  }

  async function runTableclothPropertyFill() {
    if (activeTasks.has('tableclothPropertyFill') || !(await initCookies())) {
      return;
    }

    setTaskRunning('tableclothPropertyFill', true);
    tableclothSummary.textContent = '任务进行中：正在按桌布固定规则批量补充缺失属性。';
    appendLog(`开始执行桌布属性补充，类目：${TABLECLOTH_PROPERTY_FILL_CONFIG.category.name} (${TABLECLOTH_PROPERTY_FILL_CONFIG.category.id})`);

    const response = await sendMessage({
      action: 'startPropertyFill',
      config: TABLECLOTH_PROPERTY_FILL_CONFIG,
      taskName: 'tableclothPropertyFill'
    });

    if (!response.success) {
      setTaskRunning('tableclothPropertyFill', false);
      tableclothSummary.textContent = `任务启动失败：${response.error || '未知错误'}`;
      appendLog(`桌布属性补充启动失败：${response.error || '未知错误'}`);
    }
  }

  async function runRejectPropertyAdjust() {
    if (activeTasks.has('rejectPropertyAdjust') || !(await initCookies())) {
      return;
    }

    if (!window.confirm('确认开始拒绝所有属性待确认任务吗？')) {
      return;
    }

    setTaskRunning('rejectPropertyAdjust', true);
    rejectPropertySummary.textContent = '任务进行中：正在查询并拒绝所有属性待确认商品。';
    appendLog('开始执行属性待确认拒绝任务，propAdjustTypes=201,200,300');

    const response = await sendMessage({ action: 'startRejectPropertyAdjust', taskName: 'rejectPropertyAdjust' });
    if (!response.success) {
      setTaskRunning('rejectPropertyAdjust', false);
      rejectPropertySummary.textContent = `任务启动失败：${response.error || '未知错误'}`;
      appendLog(`属性待确认拒绝启动失败：${response.error || '未知错误'}`);
    }
  }

  async function runScanAndRelist() {
    if (!window.confirm('确认开始自动扫描并上架吗？') || !(await initCookies())) {
      return;
    }

    setTaskRunning('scanAndRelist', true);
    appendLog('开始自动扫描并上架流程...');
    appendLog('流程：读取下架列表 -> 检查违规 -> 上架可处理商品');
    await sendMessage({ action: 'startScanAndRelist', taskName: 'scanAndRelist' });
  }

  async function runBatchDeleteOffShelf() {
    if (activeTasks.has('batchDeleteOffShelf') || !(await initCookies())) {
      return;
    }

    if (!window.confirm('确认批量删除所有已下架和核价未通过商品吗？此操作不可恢复，请谨慎执行。')) {
      return;
    }

    setTaskRunning('batchDeleteOffShelf', true);
    batchDeleteOffShelfSummary.textContent = '任务进行中：正在查询并删除已下架 / 核价未通过商品...';
    appendLog('开始批量删除：先删已下架（skcTopStatus=200），再删核价未通过（selectStatus=9）。');

    const response = await sendMessage({ action: 'startBatchDeleteOffShelf', taskName: 'batchDeleteOffShelf' });
    if (!response.success) {
      setTaskRunning('batchDeleteOffShelf', false);
      batchDeleteOffShelfSummary.textContent = `任务启动失败：${response.error || '未知错误'}`;
      appendLog(`批量删除已下架商品启动失败：${response.error || '未知错误'}`);
    }
  }

  async function runLongTermNoOrderUnshelve() {
    if (activeTasks.has('longTermNoOrderUnshelve') || !(await initCookies())) {
      return;
    }

    if (!window.confirm('确认开始扫描在售商品，并自动下架上架超过90天且从未出单的商品吗？')) {
      return;
    }

    setTaskRunning('longTermNoOrderUnshelve', true);
    longTermNoOrderSummary.textContent = '任务进行中：正在扫描在售商品并检查历史订单...';
    appendLog('开始执行长期无单商品自动下架任务：上架超过90天且订单记录为空。');

    const response = await sendMessage({ action: 'startLongTermNoOrderUnshelve', taskName: 'longTermNoOrderUnshelve' });
    if (!response.success) {
      setTaskRunning('longTermNoOrderUnshelve', false);
      longTermNoOrderSummary.textContent = `任务启动失败：${response.error || '未知错误'}`;
      appendLog(`长期无单自动下架启动失败：${response.error || '未知错误'}`);
    }
  }

  async function runLowQualityUnshelve() {
    if (activeTasks.has('lowQualityUnshelve') || !(await initCookies())) {
      return;
    }

    if (!window.confirm('确认扫描品质分低于 70 分的商品，并对品质分低于 60 且仓内库存小于 10 的商品执行下架吗？')) {
      return;
    }

    setTaskRunning('lowQualityUnshelve', true);
    lowQualityUnshelveSummary.textContent = '任务进行中：正在扫描品质分并检查库存...';
    appendLog('开始低品质商品任务：扫描 <70 分商品，<60 分且库存 <10 自动下架。');

    const response = await sendMessage({ action: 'startLowQualityUnshelve', taskName: 'lowQualityUnshelve' });
    if (!response.success) {
      setTaskRunning('lowQualityUnshelve', false);
      lowQualityUnshelveSummary.textContent = `任务启动失败：${response.error || '未知错误'}`;
      appendLog(`低品质商品任务启动失败：${response.error || '未知错误'}`);
    }
  }

  async function stopAllTasks() {
    stopRequested = true;

    if (!(await initCookies())) {
      return;
    }

    const response = await sendMessage({ action: 'cancelTasks', taskNames: TASK_NAMES.filter((name) => name !== 'extract') });
    if (response.success) {
      appendLog('已发送停止指令，正在等待当前执行中的任务安全结束...');
      TASK_NAMES.forEach((taskName) => {
        if (TASK_BUTTONS[taskName]) {
          setTaskRunning(taskName, false);
        }
      });
      extractBtn.textContent = '开始扫描违规商品';
    } else {
      appendLog(`停止任务失败：${response.error || '未知错误'}`);
    }
  }

  async function copyResult() {
    if (!result.value.trim()) {
      appendLog('当前没有可复制的扫描结果。');
      return;
    }

    try {
      await navigator.clipboard.writeText(result.value.trim());
      appendLog('结果已复制到剪贴板。');
    } catch (error) {
      appendLog('复制失败，请手动复制。');
    }
  }

  result.addEventListener('input', syncResultStats);
  directRelistInput.addEventListener('input', syncDirectRelistStats);
  extractBtn.addEventListener('click', runExtract);
  autoProcessBtn.addEventListener('click', runBatchUnshelve);
  directRelistBtn.addEventListener('click', runDirectRelist);
  propertyFillBtn.addEventListener('click', runPropertyFill);
  tableclothPropertyBtn.addEventListener('click', runTableclothPropertyFill);
  rejectPropertyAdjustBtn.addEventListener('click', runRejectPropertyAdjust);
  autoScanAndRelistBtn.addEventListener('click', runScanAndRelist);
  batchDeleteOffShelfBtn.addEventListener('click', runBatchDeleteOffShelf);
  longTermNoOrderUnshelveBtn.addEventListener('click', runLongTermNoOrderUnshelve);
  lowQualityUnshelveBtn.addEventListener('click', runLowQualityUnshelve);
  refreshBtn.addEventListener('click', () => window.location.reload());
  copyBtn.addEventListener('click', copyResult);
  stopAllBtn.addEventListener('click', stopAllTasks);
  exportPurchaseOrdersBtn.addEventListener('click', runPurchaseOrderExport);
  analyzePendingPurchaseBtn.addEventListener('click', runPendingPurchaseAnalysis);
  exportDuplicateOnSaleSalesBtn.addEventListener('click', runDuplicateOnSaleSalesExport);
  clearLogBtn.addEventListener('click', () => {
    resetLogView();
  });
  clearUnshelveRecordsBtn.addEventListener('click', clearCurrentShopUnshelveRecords);
  checkTabBtn.addEventListener('click', async () => {
    const tab = await ensureTargetTab();
    if (tab) {
      appendLog(`已连接目标标签页：${tab.title || '未命名页面'}`);
      await initCookies();
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'processLog') {
      appendLog(request.log, { immediate: Boolean(request.immediate) });
    }

    if (request.action === 'processComplete') {
      if (request.task && TASK_BUTTONS[request.task]) {
        setTaskRunning(request.task, false);
      }

      if (request.task === 'propertyFill') {
        propertySummary.textContent = `任务完成：成功 ${request.stats.success}，失败 ${request.stats.failed}，跳过 ${request.stats.skipped}`;
      }
      if (request.task === 'tableclothPropertyFill') {
        tableclothSummary.textContent = `任务完成：成功 ${request.stats.success}，失败 ${request.stats.failed}，跳过 ${request.stats.skipped}`;
      }
      if (request.task === 'rejectPropertyAdjust') {
        rejectPropertySummary.textContent = `任务完成：成功 ${request.stats.success}，失败 ${request.stats.failed}，跳过 ${request.stats.skipped}`;
      }

      appendLog(`任务完成 | 成功 ${request.stats.success} | 失败 ${request.stats.failed} | 跳过 ${request.stats.skipped}`, { immediate: true });

      if (request.task === 'autoProcess' || request.task === 'longTermNoOrderUnshelve' || request.task === 'lowQualityUnshelve') {
        refreshUnshelveRecordSummary();
      }

      if (request.task === 'lowQualityUnshelve') {
        const exportRecords = Array.isArray(request.stats.exportRecords) ? request.stats.exportRecords : [];
        lowQualityUnshelveSummary.textContent = `任务完成：下架 ${request.stats.success}，失败 ${request.stats.failed}，跳过 ${request.stats.skipped}`;
        if (exportRecords.length) {
          const filename = downloadLowQualityExport(exportRecords);
          if (filename) {
            lowQualityUnshelveSummary.textContent += `，已导出 ${exportRecords.length} 条`;
            appendLog(`低品质商品 CSV 已下载：${filename}`);
          }
        }
      }
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'processComplete' && request.task === 'longTermNoOrderUnshelve') {
      longTermNoOrderSummary.textContent = `任务完成：下架 ${request.stats.success}，失败 ${request.stats.failed}，跳过 ${request.stats.skipped}`;
      refreshUnshelveRecordSummary();
    }
    if (request.action === 'processComplete' && request.task === 'batchDeleteOffShelf') {
      batchDeleteOffShelfSummary.textContent = `任务完成：删除 ${request.stats.success}，失败 ${request.stats.failed}，跳过 ${request.stats.skipped}`;
    }
  });

  fixedCategoryLabel.textContent = `${HEADBAND_PROPERTY_FILL_CONFIG.category.name} (${HEADBAND_PROPERTY_FILL_CONFIG.category.id})`;
  fixedRuleLabel.textContent = '材质=聚酯纤维(涤纶）；成分=聚酯纤维(涤纶） 100.00%';

  const defaultExportRange = getDefaultExportRange();
  purchaseExportStartTimeInput.value = formatDateTimeLocal(defaultExportRange.start);
  purchaseExportEndTimeInput.value = formatDateTimeLocal(defaultExportRange.end);

  ensureTargetTab().then(async (tab) => {
    if (tab) {
      appendLog('已连接到 TEMU 商家后台页面。');
      await initCookies();
    }
  });

  syncResultStats();
  syncDirectRelistStats();
});
