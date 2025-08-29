document.addEventListener('DOMContentLoaded', function(){
  // Static prototype script with sample data and Chart.js
  const sample = {
  netWorth: 248450,
  roi: 12.4,
  netDelta: 4.2,
  revenueSeries: [
    { date: '2024-01-01', value: 12000 },
    { date: '2024-02-01', value: 15000 },
    { date: '2024-03-01', value: 18000 },
    { date: '2024-04-01', value: 22000 },
    { date: '2024-05-01', value: 20000 },
    { date: '2024-06-01', value: 24000 },
    { date: '2024-07-01', value: 27000 }
  ],
  cashFlowSeries: [
    { label: 'Jan', inflow: 15000, outflow: 9000 },
    { label: 'Feb', inflow: 17000, outflow: 10000 },
    { label: 'Mar', inflow: 19000, outflow: 12000 },
    { label: 'Apr', inflow: 21000, outflow: 13000 },
    { label: 'May', inflow: 20500, outflow: 15000 },
    { label: 'Jun', inflow: 23000, outflow: 14000 },
    { label: 'Jul', inflow: 25000, outflow: 12000 }
  ]
};

// Populate KPIs (guard elements in case layout changed)
var elNet = document.getElementById('net-worth');
var elNetDelta = document.getElementById('net-delta');
var elRoi = document.getElementById('roi');
var elRoiDelta = document.getElementById('roi-delta');
var elCash = document.getElementById('cash');

// Simple storage helpers
var STORAGE_KEY = 'ed_businesses_v1';
function loadBusinesses(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ return []; }
}
function saveBusinesses(b){ localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); }

// Compute and show KPIs based on user-entered data
function computeNetWorth(){
  if(!Array.isArray(businesses)) return 0;
  return businesses.reduce(function(sum, biz){
    if(!biz || !Array.isArray(biz.entries)) return sum;
    return sum + biz.entries.reduce(function(s, e){ return s + (Number(e.amount) || 0); }, 0);
  }, 0);
}

function formatCurrency(n){
  var num = Number(n) || 0;
  if(Number.isInteger(num)) return 'MAD ' + num.toLocaleString();
  return 'MAD ' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateKPIs(){
  if(elNet) elNet.textContent = formatCurrency(computeNetWorth());

  // Net delta: compare last month revenue vs previous month revenue
  try{
    var agg = aggregateOverviewMonths();
    var labels = agg.labels || [];
    var data = agg.data || [];
    var netDeltaText = '—';
    if(labels.length >= 2){
      var last = Number(data[data.length-1] || 0);
      var prev = Number(data[data.length-2] || 0);
      if(prev === 0){ netDeltaText = last === 0 ? '+0%' : '+100%'; }
      else { netDeltaText = ( (last - prev) / Math.abs(prev) * 100 ); netDeltaText = (netDeltaText>=0?'+':'') + Number(netDeltaText.toFixed(1)) + '%'; }
    }
    if(elNetDelta) {
      elNetDelta.textContent = netDeltaText;
      setPctClass(elNetDelta, netDeltaText);
    }
  }catch(e){ if(elNetDelta) elNetDelta.textContent = '+0%'; }

  // Profit Margin (YTD): define as (Revenue - Expenses) / Revenue for entries in current year
  try{
    var now = new Date();
    var startOfYear = new Date(now.getFullYear(), 0, 1);
    var endOfYear = now;
    var pm = computeProfitMarginForRange(startOfYear, endOfYear);
    if(elRoi) {
      var pmText = (pm === null) ? '—%' : (Number(pm.toFixed(1)) + '%');
      elRoi.textContent = pmText;
      setPctClass(elRoi, pmText);
    }

    // Profit Margin delta vs previous year
    var prevStart = new Date(now.getFullYear()-1, 0, 1);
    var prevEnd = new Date(now.getFullYear()-1, 11, 31, 23, 59, 59);
    var prevPM = computeProfitMarginForRange(prevStart, prevEnd);
    var pmDeltaText = '—';
    if(pm !== null && prevPM !== null){ var diff = pm - prevPM; pmDeltaText = (diff>=0?'+':'') + Number(diff.toFixed(1)) + '%'; }
    else if(pm !== null && prevPM === null){ pmDeltaText = '+∞'; }
    if(elRoiDelta){ elRoiDelta.textContent = pmDeltaText; setPctClass(elRoiDelta, pmDeltaText); }
  }catch(ex){ if(elRoi) elRoi.textContent = '—%'; if(elRoiDelta) elRoiDelta.textContent = '+0%'; }
}

// helper to set pct classes on an element based on percent-text like '+1.2%' or '-3.4%'
function setPctClass(el, text){
  if(!el) return;
  var raw = String(text || '').trim();
  // remove percent sign and non-digit characters except + - .
  var cleaned = raw.replace('%','').replace(/[^0-9+\-\.eE]/g,'');
  var n = parseFloat(cleaned);
  var cls = 'pct-neutral';
  if(!isNaN(n)){
    if(n < 0) cls = 'pct-negative';
    else if(n > 0) cls = 'pct-positive';
    else cls = 'pct-neutral';
  }
  // preserve base class if present (value or delta)
  var base = (el.className || '').split(' ').filter(function(c){ return c === 'value' || c === 'delta'; })[0] || '';
  el.className = (base ? base + ' ' : '') + cls;
}

// helper: get all entries across businesses
function getAllEntries(){ var out = []; businesses.forEach(function(b){ if(b && Array.isArray(b.entries)) out = out.concat(b.entries); }); return out; }

// compute ROI for a date range; returns percentage (e.g., 12.4) or null when not computable
function computeROIForRange(startDate, endDate){
  var entries = getAllEntries().filter(function(e){ var d = new Date(e.date); return d >= startDate && d <= endDate; });
  if(entries.length === 0) return null;
  var revenue = 0, expense = 0;
  entries.forEach(function(e){ var v = Number(e.amount) || 0; if(v >= 0) revenue += v; else expense += Math.abs(v); });
  if(expense === 0) return null; // cannot compute ROI without costs
  var roi = (revenue - expense) / expense * 100;
  return roi;
}

// compute Profit Margin = (Revenue - Expenses) / Revenue * 100
function computeProfitMarginForRange(startDate, endDate){
  var entries = getAllEntries().filter(function(e){ var d = new Date(e.date); return d >= startDate && d <= endDate; });
  if(entries.length === 0) return null;
  var revenue = 0, expense = 0;
  entries.forEach(function(e){ var v = Number(e.amount) || 0; if(v >= 0) revenue += v; else expense += Math.abs(v); });
  if(revenue === 0) return null; // cannot compute margin without revenue
  var pm = (revenue - expense) / revenue * 100;
  return pm;
}

// ensure KPIs and overview update whenever we save
var _origSave = saveBusinesses;
saveBusinesses = function(b){ _origSave(b); updateKPIs(); if(typeof renderOverviewChart === 'function') renderOverviewChart(); if(typeof renderWealthChart === 'function') renderWealthChart(); };

// Overview aggregation: monthly totals across all businesses
function aggregateOverviewMonths(){
  var map = new Map();
  businesses.forEach(function(b){ if(!b || !Array.isArray(b.entries)) return; b.entries.forEach(function(e){ var d = new Date(e.date); if(isNaN(d)) return; var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); map.set(key, (map.get(key) || 0) + Number(e.amount)); }); });
  if(map.size === 0){ return { labels: sample.revenueSeries.map(function(s){return s.date}), data: sample.revenueSeries.map(function(s){return s.value}) }; }
  var labels = Array.from(map.keys()).sort(); var data = labels.map(function(l){ return map.get(l); });
  return { labels: labels, data: data };
}

var salesChart = null;
function renderOverviewChart(){
  var agg = aggregateOverviewMonths();
  var ctxOverview = document.getElementById('salesChart').getContext('2d');
  if(salesChart){ salesChart.destroy(); salesChart = null; }
  salesChart = new Chart(ctxOverview, {
    type: 'line',
    data: { labels: agg.labels, datasets: [{ label: 'Revenue', data: agg.data, borderColor: '#23C172', backgroundColor: 'rgba(35,193,114,0.12)', fill: true, tension: 0.3, pointRadius: 2 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx){ return formatCurrency(ctx.raw); } } } },
      scales: {
        x: { type: 'category', grid: { display: false }, ticks: { callback: function(val, idx, ticks){ try{ var d = new Date(this.getLabelForValue(idx)); return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }catch(e){ return this.getLabelForValue(idx); } } } },
        y: { ticks: { callback: function(v){ return formatCurrency(v); } }, grid: { color: 'rgba(15,23,42,0.04)' } }
      },
      animation: { duration: 450 }
    }
  });
}

// Wealth chart: cumulative net worth over the same monthly labels
var wealthChart = null;
function renderWealthChart(){
  var agg = aggregateOverviewMonths();
  // cumulative over the months
  var cumulative = [];
  var running = 0;
  agg.data.forEach(function(v){ running += Number(v) || 0; cumulative.push(running); });
  var ctx = document.getElementById('wealthChart').getContext('2d');
  if(wealthChart){ wealthChart.destroy(); wealthChart = null; }
  wealthChart = new Chart(ctx, {
    type: 'line',
    data: { labels: agg.labels, datasets: [{ label: 'Wealth', data: cumulative, borderColor: '#0B2B4A', backgroundColor: 'rgba(11,43,74,0.08)', fill: true, tension: 0.25, pointRadius: 2 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx){ return formatCurrency(ctx.raw); } } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: function(v){ return formatCurrency(v); } } } }, animation: { duration: 450 } }
  });
}

var businesses = loadBusinesses();

// DOM references
var bizList = document.getElementById('business-list');
var btnAdd = document.getElementById('btn-add-business');
var inputName = document.getElementById('business-name');
var overview = document.getElementById('overview');
var detail = document.getElementById('business-detail');
var bizTitle = document.getElementById('biz-title');
var bizMeta = document.getElementById('biz-meta');
var periodSelect = document.getElementById('period-select');
var btnDeleteBiz = document.getElementById('btn-delete-biz');
var btnExportBiz = document.getElementById('btn-export-biz');
var btnExportAll = document.getElementById('btn-export-all');
var entryDate = document.getElementById('entry-date');
var entryAmount = document.getElementById('entry-amount');
var entryDesc = document.getElementById('entry-desc');
var entryChannel = document.getElementById('entry-channel');
var entriesList = document.getElementById('entries-list');
var entryExpense = document.getElementById('entry-expense');
var btnAddEntry = document.getElementById('btn-add-entry');
var btnCancelEntry = document.getElementById('btn-cancel-entry');
var btnBackOverview = document.getElementById('btn-back-overview');

// edit state
var editingEntryId = null;

var currentBizId = null;

function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

function renderBizList(){
  bizList.innerHTML = '';
  businesses.forEach(function(b){
    var li = document.createElement('li');
    var nameSpan = document.createElement('span');
    nameSpan.textContent = b.name;
    var actions = document.createElement('span');
    actions.style.display = 'flex'; actions.style.gap = '6px';
    var openBtn = document.createElement('button'); openBtn.textContent = 'Open'; openBtn.className = 'open';
    openBtn.addEventListener('click', function(){ openBusiness(b.id); });
  var removeBtn = document.createElement('button'); removeBtn.textContent = 'Remove'; removeBtn.className = 'small danger';
  removeBtn.addEventListener('click', function(){ if(!confirm('Delete this business and all its entries?')) return; removeBusiness(b.id); });
    actions.appendChild(openBtn); actions.appendChild(removeBtn);
    li.appendChild(nameSpan); li.appendChild(actions);
    bizList.appendChild(li);
  });
}

function createBusiness(name){
  var b = { id: 'biz_' + Date.now(), name: name, entries: [] };
  businesses.push(b); saveBusinesses(businesses); renderBizList();
}

function removeBusiness(id){
  businesses = businesses.filter(function(x){ return x.id !== id; });
  if(currentBizId === id) closeDetail();
  saveBusinesses(businesses); renderBizList();
}

btnAdd.addEventListener('click', function(){
  var name = inputName.value.trim(); if(!name) return alert('Enter a business name');
  createBusiness(name); inputName.value = '';
});

btnExportAll.addEventListener('click', function(){
  var blob = new Blob([JSON.stringify(businesses, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'businesses.json'; a.click(); URL.revokeObjectURL(url);
});

btnExportBiz.addEventListener('click', function(){
  if(!currentBizId) return; var b = businesses.find(function(x){return x.id===currentBizId});
  if(!b) return; var blob = new Blob([JSON.stringify(b, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = b.name.replace(/\s+/g,'_') + '.json'; a.click(); URL.revokeObjectURL(url);
});

function openBusiness(id){
  var b = businesses.find(function(x){return x.id===id}); if(!b) return; currentBizId = id; overview.style.display='none'; detail.style.display='block'; bizTitle.textContent = b.name; bizMeta.textContent = b.entries.length + ' entries'; renderBizChart();
  // render the entries list for this business
  renderEntriesList(b);
  if(btnBackOverview) btnBackOverview.style.display = 'inline-block';
  // set default entry date to today
  if(entryDate) entryDate.value = new Date().toISOString().slice(0,10);
}

function closeDetail(){ currentBizId = null; overview.style.display='block'; detail.style.display='none'; }

if(btnBackOverview){ btnBackOverview.addEventListener('click', function(){ closeDetail(); renderOverviewChart(); btnBackOverview.style.display = 'none'; }); }

btnDeleteBiz.addEventListener('click', function(){
  if(!currentBizId) return; if(!confirm('Delete this business and all its entries?')) return; removeBusiness(currentBizId);
});

btnAddEntry.addEventListener('click', function(){
  if(!currentBizId) return alert('Open a business first');
  var d = entryDate.value; var amt = parseFloat(entryAmount.value); if(!d || isNaN(amt)) return alert('Enter date and amount');
  var desc = entryDesc ? entryDesc.value.trim() : '';
  var channel = entryChannel ? entryChannel.value : '';
  var isExpense = entryExpense ? entryExpense.checked : false;
  var b = businesses.find(function(x){return x.id===currentBizId}); if(!b) return;
  if(editingEntryId){
    var e = b.entries.find(function(en){ return en.id === editingEntryId; }); if(!e) return;
    e.date = d; e.amount = (isExpense ? -Math.abs(amt) : Math.abs(amt)); e.description = desc; e.channel = channel;
    editingEntryId = null;
    if(btnAddEntry) btnAddEntry.textContent = 'Add Entry';
    if(btnCancelEntry) btnCancelEntry.style.display = 'none';
  } else {
    b.entries.push({ id: 'e_' + Date.now(), date: d, amount: (isExpense ? -Math.abs(amt) : Math.abs(amt)), description: desc, channel: channel });
  }
  saveBusinesses(businesses);
  // clear inputs
  if(entryAmount) entryAmount.value = '';
  if(entryDesc) entryDesc.value = '';
  if(entryChannel) entryChannel.value = '';
  if(entryExpense) entryExpense.checked = false;
  renderBizChart(); renderEntriesList(b); renderBizList(); bizMeta.textContent = b.entries.length + ' entries';
});

function renderEntriesList(b){
  if(!entriesList) return;
  entriesList.innerHTML = '';
  if(!b || !Array.isArray(b.entries) || b.entries.length === 0){
    var p = document.createElement('p'); p.className = 'small'; p.textContent = 'No entries yet'; entriesList.appendChild(p); return;
  }
  // show latest first
  var rows = b.entries.slice().sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
  rows.forEach(function(e){
    var row = document.createElement('div'); row.className = 'entry-row';
    var left = document.createElement('div'); left.className = 'entry-left';
    var dt = document.createElement('div'); dt.textContent = new Date(e.date).toLocaleDateString(); dt.className = 'entry-date';
    var meta = document.createElement('div'); meta.className = 'entry-meta';
    var desc = document.createElement('div'); desc.textContent = e.description || ''; desc.className = 'entry-desc';
    var chan = document.createElement('div'); chan.textContent = e.channel ? ('Channel: ' + e.channel) : ''; chan.className = 'entry-channel';
    meta.appendChild(desc); meta.appendChild(chan);
    left.appendChild(dt); left.appendChild(meta);

  var amt = document.createElement('div'); amt.className = 'entry-amount';
  var amtVal = Number(e.amount) || 0;
  amt.textContent = (amtVal < 0 ? '-MAD ' : 'MAD ') + Math.abs(amtVal).toLocaleString();
  if(amtVal < 0) amt.style.color = '#EF4444';

  var actions = document.createElement('div'); actions.className = 'entry-actions';
  var edit = document.createElement('button'); edit.textContent = 'Edit'; edit.className = 'small';
  edit.addEventListener('click', function(){ startEditEntry(e.id); });
  var del = document.createElement('button'); del.textContent = 'Delete'; del.className = 'small danger';
  del.addEventListener('click', function(){ if(!confirm('Delete this entry?')) return; deleteEntry(e.id); });
  actions.appendChild(edit); actions.appendChild(del);

    row.appendChild(left); row.appendChild(amt); row.appendChild(actions);
    entriesList.appendChild(row);
  });
}

function deleteEntry(entryId){
  var b = businesses.find(function(x){ return x.id === currentBizId; }); if(!b) return;
  b.entries = b.entries.filter(function(en){ return en.id !== entryId; });
  saveBusinesses(businesses);
  renderEntriesList(b);
  renderBizChart();
  renderBizList();
  bizMeta.textContent = b.entries.length + ' entries';
}

function startEditEntry(entryId){
  var b = businesses.find(function(x){ return x.id === currentBizId; }); if(!b) return;
  var e = b.entries.find(function(en){ return en.id === entryId; }); if(!e) return;
  editingEntryId = entryId;
  if(entryDate) entryDate.value = e.date;
  if(entryAmount) entryAmount.value = Math.abs(Number(e.amount) || 0);
  if(entryDesc) entryDesc.value = e.description || '';
  if(entryChannel) entryChannel.value = e.channel || 'sale';
  if(entryExpense) entryExpense.checked = Number(e.amount) < 0;
  if(btnAddEntry) btnAddEntry.textContent = 'Save';
  if(btnCancelEntry) btnCancelEntry.style.display = 'inline-block';
}

if(btnCancelEntry){ btnCancelEntry.addEventListener('click', function(){ editingEntryId = null; if(entryDate) entryDate.value = new Date().toISOString().slice(0,10); if(entryAmount) entryAmount.value = ''; if(entryDesc) entryDesc.value = ''; if(entryChannel) entryChannel.value = 'sale'; if(entryExpense) entryExpense.checked = false; if(btnAddEntry) btnAddEntry.textContent = 'Add Entry'; btnCancelEntry.style.display = 'none'; }); }

function aggregateEntries(entries, period){
  var map = new Map();
  // first accumulate into map using the grouping key
  entries.forEach(function(e){ var d = new Date(e.date); var key = '';
    if(period === 'day') key = e.date;
    else if(period === 'week'){ var y = d.getFullYear(); var w = getWeekStart(d); key = y + '-W' + w; }
    else if(period === 'month') key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    else key = String(d.getFullYear());
    map.set(key, (map.get(key) || 0) + Number(e.amount));
  });

  // For 'day' period we want a point for every day in the range (no gaps)
  if(period === 'day'){
    var labels = [];
    var data = [];
    if(entries.length === 0){
      // default to last 30 days
      var end = new Date();
      var start = new Date(); start.setDate(end.getDate() - 29);
    } else {
      // find min and max dates from entries
      var dates = entries.map(function(e){ return new Date(e.date); });
      var min = new Date(Math.min.apply(null, dates));
      var max = new Date(Math.max.apply(null, dates));
      var start = new Date(min.getFullYear(), min.getMonth(), min.getDate());
      var end = new Date(max.getFullYear(), max.getMonth(), max.getDate());
    }
    // iterate day-by-day
    for(var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)){
      var key = d.toISOString().slice(0,10);
      labels.push(key);
      data.push(map.get(key) || 0);
    }
    return { labels: labels, data: data };
  }

  var labels = Array.from(map.keys()).sort(); var data = labels.map(function(l){ return map.get(l); });
  return { labels: labels, data: data };
}

function getWeekStart(d){ var onejan = new Date(d.getFullYear(),0,1); return Math.ceil((((d - onejan) / 86400000) + onejan.getDay()+1)/7); }

var bizChart = null;
function renderBizChart(){
  var b = businesses.find(function(x){ return x.id===currentBizId }); if(!b) return;
  var period = periodSelect.value; var agg = aggregateEntries(b.entries, period);
  var ctx = document.getElementById('bizChart').getContext('2d');
  if(bizChart){ bizChart.destroy(); bizChart = null; }

  // helper to format x-axis labels depending on period
  function formatXLabel(label, index, labels){
    try{
      if(period === 'day'){
        var d = new Date(label);
        // limit tick density
        var maxTicks = 10; var step = Math.max(1, Math.ceil(labels.length / maxTicks));
        if(index % step !== 0) return '';
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
      if(period === 'month'){
        var parts = String(label).split('-'); // YYYY-M
        var y = parts[0]; var m = parts[1];
        var mm = new Date(y, Number(m)-1, 1);
        return mm.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      }
      return String(label);
    }catch(err){ return String(label); }
  }

  // small plugin to draw "No data" when all zeros
  var noDataPlugin = {
    id: 'noDataPlugin',
    beforeDraw: function(chart){
      var total = 0;
      chart.data.datasets.forEach(function(ds){ ds.data.forEach(function(v){ total += Number(v) || 0; }); });
      if(total === 0){
        var ctx = chart.ctx; var width = chart.width; var height = chart.height;
        ctx.save(); ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'center'; ctx.font = '14px sans-serif';
        ctx.fillText('No revenue data', width/2, height/2); ctx.restore();
      }
    }
  };

  // compute per-bar colors: red for negative, green for positive
  var barColors = agg.data.map(function(v){ return (Number(v) < 0) ? '#EF4444' : '#23C172'; });

  // compute cumulative running total (across the labels order)
  var cumulative = [];
  var running = 0;
  agg.data.forEach(function(v){ running += Number(v) || 0; cumulative.push(running); });

  bizChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: agg.labels, datasets: [
      { label: 'Revenue', data: agg.data, backgroundColor: barColors, borderRadius: 4 },
      { label: 'Cumulative', data: cumulative, type: 'line', borderColor: '#0E3A5F', backgroundColor: 'rgba(14,58,95,0.08)', tension: 0.3, pointRadius: 0 }
    ] },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx){ return formatCurrency(ctx.raw); }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { callback: function(val, index, ticks){ return formatXLabel(this.getLabelForValue(index), index, agg.labels); } } },
        y: { beginAtZero: true, ticks: { callback: function(v){ return formatCurrency(v); } }, grid: { color: 'rgba(15,23,42,0.06)' } }
      },
      animation: { duration: 400, easing: 'easeOutQuart' },
      datasets: { bar: { categoryPercentage: 0.65, maxBarThickness: 28 } }
    },
    plugins: [noDataPlugin]
  });
}

periodSelect.addEventListener('change', function(){ renderBizChart(); });

// initial render
renderBizList();
updateKPIs();

// Render realistic overview charts (revenue + wealth) based on saved businesses
renderOverviewChart();
renderWealthChart();

});

// Chat removed per user request.


