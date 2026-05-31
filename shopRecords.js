const UNSHELVE_RECORDS_STORAGE_KEY = 'mallUnshelveRecords';

function normalizeMallId(mallid) {
  return String(mallid || '').trim();
}

function normalizeSpuId(spuId) {
  return String(spuId || '').trim();
}

function getAllMallUnshelveRecords() {
  return new Promise((resolve) => {
    chrome.storage.local.get([UNSHELVE_RECORDS_STORAGE_KEY], (result) => {
      resolve(result[UNSHELVE_RECORDS_STORAGE_KEY] || {});
    });
  });
}

function saveAllMallUnshelveRecords(records) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [UNSHELVE_RECORDS_STORAGE_KEY]: records }, () => resolve(true));
  });
}

async function getMallUnshelveRecords(mallid) {
  const all = await getAllMallUnshelveRecords();
  const mallKey = normalizeMallId(mallid);
  return all[mallKey] || { updatedAt: 0, products: {} };
}

async function isSpuUnshelveRecorded(mallid, spuId) {
  const mallRecords = await getMallUnshelveRecords(mallid);
  return Boolean(mallRecords.products[normalizeSpuId(spuId)]);
}

async function recordUnshelvedProduct(mallid, payload) {
  const mallKey = normalizeMallId(mallid);
  const spuKey = normalizeSpuId(payload && payload.spuId);
  if (!mallKey || !spuKey) {
    return false;
  }

  const all = await getAllMallUnshelveRecords();
  if (!all[mallKey]) {
    all[mallKey] = { updatedAt: Date.now(), products: {} };
  }

  const existing = all[mallKey].products[spuKey] || {};
  all[mallKey].products[spuKey] = {
    spuId: spuKey,
    name: payload.name || existing.name || '',
    unshelvedAt: Date.now(),
    source: payload.source || existing.source || 'unknown'
  };
  all[mallKey].updatedAt = Date.now();

  await saveAllMallUnshelveRecords(all);
  return true;
}

async function getMallUnshelveSpuIdSet(mallid) {
  const mallRecords = await getMallUnshelveRecords(mallid);
  return new Set(Object.keys(mallRecords.products || {}));
}

async function getMallUnshelveCount(mallid) {
  const mallRecords = await getMallUnshelveRecords(mallid);
  return Object.keys(mallRecords.products || {}).length;
}

async function filterSpuIdsByUnshelveRecords(mallid, spuIds) {
  const recordedSet = await getMallUnshelveSpuIdSet(mallid);
  const kept = [];
  let skipped = 0;

  for (const spuId of spuIds || []) {
    const normalized = normalizeSpuId(spuId);
    if (!normalized) {
      continue;
    }
    if (recordedSet.has(normalized)) {
      skipped += 1;
      continue;
    }
    kept.push(normalized);
  }

  return { kept, skipped };
}

async function clearMallUnshelveRecords(mallid) {
  const mallKey = normalizeMallId(mallid);
  if (!mallKey) {
    return false;
  }

  const all = await getAllMallUnshelveRecords();
  delete all[mallKey];
  await saveAllMallUnshelveRecords(all);
  return true;
}

const TemuShopRecords = {
  getAllMallUnshelveRecords,
  getMallUnshelveRecords,
  isSpuUnshelveRecorded,
  recordUnshelvedProduct,
  getMallUnshelveSpuIdSet,
  getMallUnshelveCount,
  filterSpuIdsByUnshelveRecords,
  clearMallUnshelveRecords
};

if (typeof window !== 'undefined') {
  window.TemuShopRecords = TemuShopRecords;
}

if (typeof globalThis !== 'undefined') {
  globalThis.TemuShopRecords = TemuShopRecords;
}
