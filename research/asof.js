// As-of and first-release views (docs/measures-and-vintages.md, sections 5 and 7; stage 7): pure functions over the
// vintage rows of one economy's file. A period's vintages are ordered by publication date, then by the stage order of
// coverage/stages.csv (an unknown or missing stage after every known one), then by release id; the last is the newest.
const STAGE_ORDER={flash:10,advance:20,preliminary:30,first:40,full:50,revised:60,final:70,correction:80,decision:90,restated:95,recalculated:96};
function vintageOrder(order=STAGE_ORDER){const rank=s=>s&&Number.isInteger(order[s])?[0,order[s]]:[1,0];return (a,b)=>{const pa=String(a.published_on||''),pb=String(b.published_on||'');if(pa!==pb)return pa<pb?-1:1;const ra=rank(a.stage),rb=rank(b.stage);if(ra[0]!==rb[0])return ra[0]-rb[0];if(ra[1]!==rb[1])return ra[1]-rb[1];const ia=String(a.release_id||''),ib=String(b.release_id||'');return ia<ib?-1:ia>ib?1:0}}
// A decision announcement in a series that also has other vintages (a policy rate dated by the day each level took effect) is
// never a row: it stays in the Revisions table, so the line keeps its effective-date steps.
function periodHistories(vintages,seriesId,keep,order){const own=(vintages||[]).filter(r=>r.series_id===seriesId),levels=own.some(r=>r.stage!=='decision'),by=new Map();for(const r of own)if(!(levels&&r.stage==='decision')&&keep(r)){if(!by.has(r.period))by.set(r.period,[]);by.get(r.period).push(r)}const cmp=vintageOrder(order);return [...by.keys()].sort().map(p=>by.get(p).sort(cmp))}
const viewRow=(h,r)=>({period:r.period,period_label:r.period_label??h.findLast(x=>x.period_label)?.period_label,value:typeof r.value==='number'?r.value:null,published_on:r.published_on,stage:r.stage??null});
// The rows of a series as they stood on `date` (YYYY-MM-DD): each period's newest vintage published on or before it. A period
// first published after the date is absent; a vintage without a value (a withdrawal) leaves the period empty; a period that
// later rolled out of a collected table's window stays, as it stood. Each row also carries the revision tick as of that date,
// as the export gives it for the latest vintage (scripts/vintages.py, summarise): first_value is the oldest non-baseline
// vintage's value, or the baseline's before it when that vintage is a run's change (`collectedRoutes`: the collected and the
// calculated routes) or holds another value than the baseline, and revised is true when a counted earlier vintage holds
// another value.
function asOfRows(vintages,seriesId,date,order=STAGE_ORDER,collectedRoutes=null){const d=String(date||'');return periodHistories(vintages,seriesId,r=>String(r.published_on||'')<=d,order).map(h=>{const l=h.at(-1),row=viewRow(h,l);let start=h.findIndex(r=>!r.baseline);if(start>0&&(collectedRoutes?.has?.(h[start].route)||typeof h[start-1].value==='number'&&h[start-1].value!==h[start].value))start--;const counted=start<0?[]:h.slice(start);row.first_value=counted.length&&typeof counted[0].value==='number'?counted[0].value:null;row.revised=counted.some(r=>r!==l&&typeof r.value==='number'&&r.value!==row.value);return row})}
// Each period as first published, or as first held where our record starts later: its oldest vintage of any kind (published
// on or before `until`, when given). A row from a baseline (the earliest value held, not a first publication) says so, so a
// collected table's first estimate is the earliest value held, never its first changed value.
function firstRows(vintages,seriesId,until=null,order=STAGE_ORDER){const d=until?String(until):null;return periodHistories(vintages,seriesId,r=>d===null||String(r.published_on||'')<=d,order).map(h=>({...viewRow(h,h[0]),baseline:!!h[0].baseline}))}
if(typeof module==='object'&&module.exports)module.exports={asOfRows,firstRows,vintageOrder,STAGE_ORDER};
