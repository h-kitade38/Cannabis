const $=id=>document.getElementById(id);
const today=new Date();
$('todayLabel').textContent=`${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
const sample=[
 {time:'08:30〜11:30',job:'冷凍機定期点検',staff:'山田',type:'日中作業',start:8.5,end:11.5},
 {time:'13:00〜16:00',job:'ショーケース修理',staff:'佐藤',type:'日中作業',start:13,end:16},
 {time:'20:00〜26:00',job:'店舗冷設入替工事',staff:'鈴木',type:'閉店後作業',start:20,end:26},
 {time:'09:00〜12:00',job:'空調機フィルター交換',staff:'田中',type:'休日出勤',start:9,end:12}
];
let events=[...sample];
function tagClass(t){return t==='閉店後作業'?'after':t==='休日出勤'?'holiday':'day'}
function renderHome(){
 $('homeSchedule').innerHTML=events.slice(0,4).map(e=>`<div class="schedule-row"><div class="time">${e.time}</div><div><span class="job-name">${e.job}</span><span class="tag ${tagClass(e.type)}">${e.type}</span></div><div class="assignee">${e.staff}</div></div>`).join('');
}
function renderTimeline(){
 const start=Number($('range').value), end= start===16?32:30, hours=end-start, ticks=[];
 for(let h=start;h<=end;h+=2)ticks.push(`<span>${h}:00</span>`);
 const people=['山田','佐藤','鈴木','田中'];
 $('timeline').innerHTML=`<div class="time-head"><div class="person">社員</div><div class="hours">${ticks.join('')}</div></div>`+people.map(p=>`<div class="person-row"><div class="person">${p}</div><div class="track">${events.filter(e=>e.staff===p).map(e=>{let left=(e.start-start)/hours*100,width=(e.end-e.start)/hours*100;return `<div class="event ${tagClass(e.type)}" style="left:${left}%;width:${width}%" title="${e.time} ${e.job}">${e.time} ${e.job}</div>`}).join('')}</div></div>`).join('');
}
renderHome();renderTimeline();
document.querySelectorAll('.menu-tile').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.menu-tile').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
 const show=btn.dataset.target==='schedule';$('schedulePage').classList.toggle('hidden',!show);
 $('todaySchedule').classList.toggle('hidden',show);$('companyStatus').classList.toggle('hidden',show);
 if(show)window.scrollTo({top:0,behavior:'smooth'});
}));
$('openSchedule').onclick=()=>{document.querySelector('[data-target="schedule"]').click()};
$('range').onchange=renderTimeline;
$('addEvent').onclick=()=>{
 const parse=v=>{if(!/^\d{1,2}:\d{2}$/.test(v))return NaN;let [h,m]=v.split(':').map(Number);return h*60+m};
 let s=parse($('startTime').value),e=parse($('endTime').value);
 if(!Number.isFinite(s)||!Number.isFinite(e)||s<0||e>2879||e<=s){alert('時刻は0:00〜47:59で、終了時刻は開始時刻より後に入力してください。例：20:00〜26:00');return}
 const fmt=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
 events.push({time:`${fmt(s)}〜${fmt(e)}`,job:$('job').value,staff:$('staff').value,type:$('workType').value,start:s/60,end:e/60});
 renderHome();renderTimeline();
};
$('workDate').onchange=()=>{};
