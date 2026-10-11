(function(){
'use strict';
const keys = {done:'lc100.done.v2', doneAt:'lc100.doneAt', reviews:'lc100.reviews', wrong:'lc100.wrong', recites:'lc100.recites', activity:'lc100.activity'};
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const order = v => Number.isInteger(v) && window.LC_PROBLEMS.some(p => p.order === v);
const count = v => Number.isSafeInteger(v) && v >= 0;
const time = v => Number.isSafeInteger(v) && v > 0 && v <= 8640000000000000;
const day = d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
const validDay = k => /^\d{4}-\d{2}-\d{2}$/.test(k) && day(new Date(k+'T12:00:00')) === k;
function validEntry(field, k, v){
  if(field === 'activity') return validDay(k) && v === true;
  if(field === 'wrong') return object(v) && order(v.order) && count(v.qi) && time(v.t) && k === v.order+':'+v.qi;
  return String(Number(k)) === k && order(Number(k)) && (field === 'doneAt' ? time(v) : count(v));
}
function clean(field, value, strict){
  const fail = () => { if(strict) throw new Error('Invalid progress field: '+field); };
  if(field === 'done'){
    if(!Array.isArray(value)){ fail(); return []; }
    if(value.some(v => !order(v)) || new Set(value).size !== value.length) fail();
    return [...new Set(value.filter(order))];
  }
  if(!object(value)){ fail(); return {}; }
  const out = {};
  for(const [k,v] of Object.entries(value)){
    if(validEntry(field,k,v)) out[k] = v;
    else fail();
  }
  return out;
}
function read(field){
  try{ return clean(field, JSON.parse(localStorage.getItem(keys[field]) || (field === 'done' ? '[]' : '{}')), false); }
  catch(e){ return field === 'done' ? [] : {}; }
}
function activity(){
  const days = read('activity');
  // Preserve only dates supported by legacy timestamps, not invented history.
  for(const t of Object.values(read('doneAt'))) days[day(new Date(t))] = true;
  return days;
}
function recordActivity(recordToday = true){
  const days = activity();
  if(recordToday) days[day(new Date())] = true;
  localStorage.setItem(keys.activity, JSON.stringify(days));
}
function normalize(data){
  if(!object(data) || (data.version != null && ![1,2,3].includes(data.version))) throw new Error('Unsupported backup format');
  const out = {};
  for(const field of Object.keys(keys)) out[field] = clean(field, data[field] === undefined && field !== 'done' ? {} : data[field], true);
  for(const t of Object.values(out.doneAt)) out.activity[day(new Date(t))] = true;
  return out;
}
function restore(data){
  const normalized = normalize(data), before = {}, written = [];
  for(const key of Object.values(keys)) before[key] = localStorage.getItem(key);
  try{
    for(const [field,key] of Object.entries(keys)){
      localStorage.setItem(key, JSON.stringify(normalized[field])); written.push(key);
    }
  }catch(error){
    for(const key of written.reverse()){
      if(before[key] === null) localStorage.removeItem(key);
      else localStorage.setItem(key, before[key]);
    }
    throw error;
  }
}
window.LCProgress = {read, activity, recordActivity, normalize, restore, day};
})();
