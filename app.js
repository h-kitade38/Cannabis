import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBx84q5_wWuZWYvaWVCCzycOc1562sczeY",
  authDomain: "cannabis-ea8f2.firebaseapp.com",
  projectId: "cannabis-ea8f2",
  storageBucket: "cannabis-ea8f2.firebasestorage.app",
  messagingSenderId: "394976170327",
  appId: "1:394976170327:web:bf4fca3c4dad70f866ee12"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORAGE_KEY = "cannabis-prototype-v1";
const employees = {
  admin:{name:"管理者",role:"管理者",pin:"1234"},
  manager:{name:"山田 太郎",role:"管理職",pin:"2222"},
  office:{name:"佐藤 花子",role:"事務担当",pin:"4444"},
  field:{name:"鈴木 一郎",role:"現場担当",pin:"3333"}
};
const initialData = {
  projects:[
    {id:1,name:"大阪市 冷凍庫更新工事",customer:"株式会社ABC商事",site:"大阪市此花区",type:"更新工事",status:"進行中",date:"2026-11-24",person:"鈴木 一郎",amount:1850000,notes:"既設ユニット撤去・新設"},
    {id:2,name:"神戸市 冷凍機定期点検",customer:"神戸フーズ株式会社",site:"神戸市東灘区",type:"定期点検",status:"予定",date:"2026-11-26",person:"山田 太郎",amount:120000,notes:"年次点検"},
    {id:3,name:"福岡市 ショーケース修理",customer:"有限会社DEF",site:"福岡市博多区",type:"修理",status:"完了",date:"2026-11-18",person:"鈴木 一郎",amount:85000,notes:"ファンモーター交換"}
  ],
  customers:[
    {id:1,name:"株式会社ABC商事",kana:"エービーシーショウジ",person:"田中様",tel:"06-1234-5678",email:"info@example.jp",address:"大阪府大阪市",notes:"主な取引先"},
    {id:2,name:"神戸フーズ株式会社",kana:"コウベフーズ",person:"営業部 山本様",tel:"078-123-4567",email:"",address:"兵庫県神戸市",notes:"定期点検契約あり"},
    {id:3,name:"有限会社DEF",kana:"ディーイーエフ",person:"佐々木様",tel:"092-123-4567",email:"",address:"福岡県福岡市",notes:""}
  ],
  schedules:[
    {id:1,date:"2026-11-20",time:"09:00",title:"現場調査",site:"大阪市此花区",person:"鈴木 一郎",project:"大阪市 冷凍庫更新工事"},
    {id:2,date:"2026-11-20",time:"13:00",title:"打ち合わせ",site:"本社",person:"山田 太郎",project:"社内打ち合わせ"},
    {id:3,date:"2026-11-21",time:"10:00",title:"定期点検",site:"神戸市東灘区",person:"山田 太郎",project:"神戸市 冷凍機定期点検"}
  ],
  financeByMonth:{},
  annualFixedCostByYear:{}
};
let db = loadDB();
let currentUser = null;
let loginNotice = "";
let currentPage = "dashboard";
let projectFilter = "すべて";
let projectPageMode = "board";
let searchTerm = "";
let editing = null;
let selectedFinanceMonth = new Date().toISOString().slice(0,7);
let scheduleView = "gantt";
let selectedScheduleDate = new Date().toLocaleDateString("sv-SE");
let selectedScheduleMonth = selectedScheduleDate.slice(0,7);
let showAllStaff = false;

function loadDB(){
 try{
  const stored=JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(!stored)return structuredClone(initialData);
  return {...structuredClone(initialData),...stored,financeByMonth:stored.financeByMonth||{},annualFixedCostByYear:stored.annualFixedCostByYear||{}};
 }catch{return JSON.parse(JSON.stringify(initialData))}
}
function saveDB(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}
function money(n){return "¥"+Math.round(Number(n)||0).toLocaleString("ja-JP")}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2100)}
function canEdit(){return ["管理者","管理職","事務担当"].includes(currentUser?.role)}
function canSeeFinance(){return ["管理者","管理職","事務担当"].includes(currentUser?.role)}
function showLogin(message=null){
  if(message!==null) loginNotice=message;
  $("#loginView").classList.remove("hidden");
  $("#mainView").classList.add("hidden");
  const messageEl=$("#authMessage");
  if(messageEl){messageEl.textContent=loginNotice||"";messageEl.classList.toggle("hidden",!loginNotice);}
}
function showMain(){
  $("#loginView").classList.add("hidden");
  $("#mainView").classList.remove("hidden");
  render("dashboard");
}
async function verifyEmployee(user){
  const employeeRef=doc(firestore,"employees",user.uid);
  const employeeSnap=await getDoc(employeeRef);
  if(!employeeSnap.exists()){
    const message=`社員登録がありません。管理者に次の情報を伝えてください。\\nメール：${user.email||"不明"}\\nUID：${user.uid}`;
    await signOut(auth);
    showLogin(message);
    return;
  }
  const employee=employeeSnap.data();
  if(employee.active!==true || employee.email!==user.email){
    await signOut(auth);
    showLogin("このアカウントは利用できません。管理者に確認してください。");
    return;
  }
  loginNotice="";
  currentUser={
    uid:user.uid,
    email:user.email,
    name:employee.name||user.displayName||"社員",
    role:employee.role||"現場担当"
  };
  showMain();
}
async function loginWithGoogle(){
  const button=$("#googleLoginButton");
  button.disabled=true;
  button.textContent="ログイン中…";
  try{
    await signInWithPopup(auth,googleProvider);
  }catch(error){
    console.error(error);
    showLogin(error.code==="auth/unauthorized-domain"
      ?"このURLはFirebaseに未登録です。管理者設定で h-kitade38.github.io を追加してください。"
      :"Googleログインに失敗しました。通信環境とアカウントを確認してください。");
  }finally{
    button.disabled=false;
    button.textContent="Googleアカウントでログイン";
  }
}
$("#googleLoginButton").addEventListener("click",loginWithGoogle);
onAuthStateChanged(auth,async user=>{
  if(!user){
    currentUser=null;
    showLogin();
    return;
  }
  try{
    await verifyEmployee(user);
  }catch(error){
    console.error(error);
    await signOut(auth);
    showLogin("社員情報を確認できませんでした。Firestore設定を確認してください。");
  }
});

$("#backButton").addEventListener("click",()=>render("projects"));
$$(".nav-item").forEach(b=>b.addEventListener("click",()=>render(b.dataset.nav)));

const menuItems=[
  ["projects","案件管理","案件一覧・進捗・担当者","▣"],
  ["schedule","スケジュール管理","現場予定・担当者・工程","▦"],
  ["reports","報告書作成","作業報告・写真・作業内容","▤"],
  ["applications","入店等申請書","入店申請・安全書類","▧"],
  ["estimates","見積もり作成","見積書・金額・明細","▦"],
  ["receivables","売掛管理","請求・売掛金・未回収","￥"],
  ["payments","入金処理","入金登録・消込","▣"],
  ["customers","顧客マスター","顧客情報・現場情報","♙"],
  ["partners","取引先マスター","仕入先・協力会社","♧"],
  ["attendance","勤怠管理","出退勤・勤務状況","◷"],
  ["analytics","STRAC","PQ・VQ・MQ・F・G","⌁"],
  ["equipment","設備台帳","冷凍機・空調機・修理履歴","⚙"],
  ["inventory","在庫・部品管理","部品・冷媒・消耗品","▦"],
  ["settings","設定","社員・権限・基本情報","⚙"]
];
function navActive(page){$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===page||(page==="projectDetail"&&b.dataset.nav==="projects")))}
function render(page){
  currentPage=page;searchTerm="";navActive(page);$("#backButton").classList.toggle("hidden",!["projectDetail","customerDetail"].includes(page));
  const content=$("#content");
  const pages={dashboard:dashboardPage,menu:menuPage,projects:projectsPage,schedule:schedulePage,customers:customersPage,analytics:analyticsPage,settings:settingsPage,projectDetail:projectDetailPage,customerDetail:customerDetailPage};
  if(pages[page])content.innerHTML=pages[page]();
  else content.innerHTML=comingSoonPage(page);
  bindPageEvents();
  window.scrollTo({top:0,behavior:"instant"});
}
function dashboardPage(){
  const today=localToday();
  const todays=db.schedules.filter(s=>s.date===today).sort((a,b)=>timeToMinutes(a.time)-timeToMinutes(b.time));
  const activeProjects=db.projects.filter(p=>p.workflowStage!=="archived"&&!p.salesProcessed);
  const stages=[{key:"material",name:"① 材料"},{key:"wip",name:"② 仕掛品"},{key:"goods",name:"③ 商品"}];
  const month=new Date().toISOString().slice(0,7), year=month.slice(0,4);
  const booked=db.projects.filter(p=>p.salesMonth===month||(!p.salesMonth&&month===new Date().toISOString().slice(0,7)&&(Number(p.pq||0)!==0||Number(p.vq||0)!==0)));
  const pq=Math.round(booked.reduce((sum,p)=>sum+Number(p.pq||0),0));
  const vq=Math.round(booked.reduce((sum,p)=>sum+Number(p.vq||0),0));
  const mq=pq-vq, f=Math.round(getAnnualFixedCost(year)/12), g=mq-f;
  return `<section class="welcome-panel"><div class="eyebrow">BUSINESS MANAGEMENT SYSTEM</div><h1>お疲れさまです、${esc(currentUser.name)} さん</h1><p>${esc(currentUser.role)} ｜ 今日も安全第一でいきましょう。</p></section>
  <div class="section-heading"><h2>今日の予定</h2><button class="text-btn" data-go="schedule">すべて見る ›</button></div>
  <div class="dashboard-schedule">${todays.map(s=>`<div class="dashboard-schedule-row"><strong>${esc(formatTimeDisplay(s.time))}〜${esc(formatTimeDisplay(s.endTime||""))}</strong><span>${esc(s.title)}：${esc(s.project)}</span><small>${esc(s.person)}</small></div>`).join("")||`<div class="empty-state">今日の予定はありません</div>`}</div>
  <div class="section-heading"><h2>会社盤</h2><button class="text-btn" data-go="projects">案件を開く ›</button></div>
  <div class="dashboard-kanban">${stages.map(stage=>{const items=activeProjects.filter(p=>(p.workflowStage||((p.status==="完了")?"goods":"material"))===stage.key);const preview=items.slice(0,2).map(p=>`<div class="dashboard-kanban-preview"><strong>${esc(p.name)}</strong><small>${esc(p.customer||p.site||"")}</small></div>`).join("");const more=items.length>2?`<div class="dashboard-kanban-more">ほか ${items.length-2} 件</div>`:"";return `<button class="dashboard-kanban-column dashboard-${stage.key}" data-go="projects"><div class="dashboard-kanban-head"><strong>${stage.name}</strong><b>${items.length}<small>件</small></b></div><div class="dashboard-kanban-list">${preview||`<div class="dashboard-kanban-none">案件なし</div>`}${more}</div></button>`}).join("")}</div>
  <div class="section-heading"><h2>会社の数字</h2><button class="text-btn" data-go="analytics">STRACを見る ›</button></div>
  <button class="dashboard-strac" data-go="analytics"><div class="dashboard-strac-values"><span>PQ ${money(pq)}</span><span>VQ ${money(vq)}</span><span>MQ ${money(mq)}</span><span>F ${money(f)}</span><strong class="${g<0?'negative':''}">G ${money(g)}</strong></div><div class="dashboard-strac-figure">${stracSvg(pq,vq,mq,f,g)}</div></button>`;
}
function allowedMenu(key){
  if(["receivables","payments","estimates","analytics"].includes(key))return canSeeFinance();
  if(["reports","applications","equipment","inventory","schedule","projects","customers"].includes(key))return true;
  return currentUser.role!=="現場担当";
}
function tileHTML(x){return `<button class="menu-tile" data-go="${x[0]}"><span class="tile-icon">${x[3]}</span><span><span class="tile-title">${x[1]}</span><span class="tile-desc">${x[2]}</span></span></button>`}
function menuPage(){return `<h1 class="page-title">メニュー</h1><p class="page-subtitle">業務機能を選択してください</p><div class="menu-list">${menuItems.filter(x=>allowedMenu(x[0])).map(x=>`<button class="menu-row" data-go="${x[0]}"><span class="tile-icon">${x[3]}</span><span><strong>${x[1]}</strong><small>${x[2]}</small></span><span class="chevron">›</span></button>`).join("")}</div><div class="section-heading"><h2>アカウント</h2></div><div class="profile-strip"><div class="avatar">${esc(currentUser.name.slice(0,1))}</div><div><strong>${esc(currentUser.name)}</strong><small>${esc(currentUser.role)}</small></div></div><button class="secondary-btn" id="logoutButton" style="width:100%">ログアウト</button>`}
function projectCard(p){return `<article class="record-card"><div class="record-top"><div><div class="record-title">${esc(p.name)}</div><div class="record-meta">${esc(p.customer)} ・ ${esc(p.date||"日程未定")}<br>${esc(p.person||"担当未設定")} ／ ${esc(p.site||"現場未設定")}</div></div><span class="status ${p.status==="完了"?"done":p.status==="予定"?"wait":""}">${esc(p.status)}</span></div><div class="record-actions"><button class="text-btn" data-detail-project="${p.id}">詳細</button>${canEdit()?`<button class="text-btn" data-edit-project="${p.id}">編集</button>`:""}</div></article>`}
function projectsPage(){
 const stages=[{key:"material",name:"① 材料"},{key:"wip",name:"② 仕掛品"},{key:"goods",name:"③ 商品"}];
 const active=db.projects.filter(p=>p.workflowStage!=="archived"&&!p.salesProcessed);
 const all=db.projects.filter(p=>[p.name,p.customer,p.site,p.person].join(" ").toLowerCase().includes(searchTerm.toLowerCase()));
 const list=all.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(p=>`<article class="project-list-card"><button class="project-list-main" data-detail-project="${p.id}"><strong>${esc(p.name)}</strong><small>${esc(p.customer||"")} ・ ${esc(p.date||"日程未定")}</small><small>${esc(p.workflowStage==="archived"||p.salesProcessed?"完了":p.workflowStage==="wip"?"仕掛品":p.workflowStage==="goods"?"商品":"材料")} ／ ${p.salesProcessed?"売上処理済":"進行中"}</small></button><div class="record-actions"><button class="text-btn" data-detail-project="${p.id}">詳細</button>${canEdit()?`<button class="text-btn" data-edit-project="${p.id}">編集</button>`:""}</div></article>`).join("");
 return `<h1 class="page-title">案件管理</h1><p class="page-subtitle">会社盤で進捗を確認し、全案件一覧から過去の案件も検索できます</p>
 <div class="project-mode-switch"><button data-project-mode="board" class="${projectPageMode==="board"?"active":""}">会社盤</button><button data-project-mode="list" class="${projectPageMode==="list"?"active":""}">全案件一覧（${db.projects.length}）</button></div>
 <div class="toolbar"><input class="search-input" id="searchBox" placeholder="案件名・顧客名で検索"><button class="small-primary" id="addProject">＋ 新規</button></div>
 ${projectPageMode==="list"?`<div class="project-list">${list||`<div class="empty-state">案件がありません</div>`}</div>`:`<div class="kanban-board">${stages.map(stage=>{const items=active.filter(p=>(p.workflowStage||((p.status==="完了")?"goods":"material"))===stage.key).filter(p=>[p.name,p.customer,p.site,p.person].join(" ").toLowerCase().includes(searchTerm.toLowerCase()));return `<section class="kanban-column kanban-${stage.key}"><header><strong>${stage.name}</strong><b>${items.length}</b></header><div class="kanban-cards">${items.length?items.map(p=>`<article class="kanban-card"><strong>${esc(p.name)}</strong><small>${esc(p.customer||"")}</small><small>${esc(p.person||"担当未設定")} ・ ${esc(p.date||"日程未定")}</small><div class="kanban-card-actions"><button class="text-btn" data-detail-project="${p.id}">詳細</button>${canEdit()?`<button class="text-btn" data-edit-project="${p.id}">編集</button>`:""}${stage.key==="material"?`<button class="text-btn" data-stage-project="${p.id}" data-stage="wip">見積承認 →</button>`:""}${stage.key==="wip"?`<div class="prep-checks"><label><input type="checkbox" data-prep="docs" data-id="${p.id}" ${p.prepDocs?"checked":""}>申請書類</label><label><input type="checkbox" data-prep="date" data-id="${p.id}" ${p.prepDate?"checked":""}>日程調整</label><label><input type="checkbox" data-prep="staff" data-id="${p.id}" ${p.prepStaff?"checked":""}>人員調整</label><button class="text-btn" data-stage-project="${p.id}" data-stage="goods" ${p.prepDocs&&p.prepDate&&p.prepStaff?"":"disabled"}>準備完了 →</button></div>`:""}${stage.key==="goods"?`<button class="text-btn" data-complete-project="${p.id}">作業完了・売上処理</button>`:""}</div></article>`).join(""):`<div class="kanban-empty">案件なし</div>`}</div></section>`}).join("")}</div>`}`;
}
function yenShort(n){return Math.round(Number(n)||0).toLocaleString("ja-JP")}
function stracSvg(pq,vq,mq,f,g){
 // 元図の比率と配置を維持：PQ列／右上VQ／左下MQ／右下FとG。
 const W=760, H=440, top=28, pqW=235, chartX=pqW, chartW=500;
 const innerW=chartW, half=innerW/2, splitX=chartX+half;
 const safePQ=Math.max(0,Math.round(Number(pq)||0));
 const safeVQ=Math.max(0,Math.min(safePQ,Math.round(Number(vq)||0)));
 const safeMQ=Math.max(0,safePQ-safeVQ);
 const safeF=Math.max(0,Math.round(Number(f)||0));
 const safeG=safeMQ-safeF;
 const fmt=yenShort;
 const label=(x,y,t,size=25,weight=500,fill="#17251e")=>`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;
 if(safePQ<=0){
   return `<svg viewBox="0 0 ${W} 500" role="img" aria-label="STRAC図 PQ 0" xmlns="http://www.w3.org/2000/svg"><text x="380" y="250" text-anchor="middle" fill="#77847b" font-size="22">PQ 0</text></svg>`;
 }
 const scale=H/safePQ;
 const vH=safeVQ*scale, mH=safeMQ*scale, fH=safeF*scale;
 const baseline=top+H;
 const negativeH=Math.max(0,-safeG*scale);
 const bottom=baseline+negativeH;
 const viewH=bottom+36;
 const ratioV=Math.round(safeVQ/safePQ*100), ratioM=Math.round(safeMQ/safePQ*100);
 const parts=[`<svg viewBox="0 0 ${W} ${viewH}" role="img" aria-label="STRAC図 PQ ${fmt(safePQ)} VQ ${fmt(safeVQ)} MQ ${fmt(safeMQ)} F ${fmt(safeF)} G ${fmt(safeG)}" xmlns="http://www.w3.org/2000/svg">`];
 // PQ column
 parts.push(`<rect x="0" y="${top}" width="${pqW}" height="${H}" fill="#b6c9e8" stroke="#858585" stroke-width="4"/>`);
 // VQ block: upper-right, proportional height
 if(vH>0) parts.push(`<rect x="${chartX}" y="${top}" width="${chartW}" height="${vH}" fill="#d8d8d8" stroke="#858585" stroke-width="4"/>`);
 // MQ block: lower-left, proportional height
 if(mH>0) parts.push(`<rect x="${chartX}" y="${top+vH}" width="${half}" height="${mH}" fill="#c4dfb5" stroke="#858585" stroke-width="4"/>`);
 // F occupies the lower-right from the MQ top. If loss, it extends below the PQ baseline.
 if(fH>0) parts.push(`<rect x="${splitX}" y="${top+vH}" width="${half}" height="${fH}" fill="#f9e2d2" stroke="#858585" stroke-width="4"/>`);
 // Positive G is the remaining part within MQ; negative G is the protruding part of F below baseline.
 if(safeG>0){
   const gh=safeG*scale;
   parts.push(`<rect x="${splitX}" y="${baseline-gh}" width="${half}" height="${gh}" fill="#ffe18c" stroke="#858585" stroke-width="4"/>`);
 }else if(safeG<0){
   parts.push(`<line x1="${chartX}" y1="${baseline}" x2="${chartX+chartW}" y2="${baseline}" stroke="#454545" stroke-width="3" stroke-dasharray="8 6"/>`);
 }
 // Outer outline of the right-hand STRAC panel and baseline
 parts.push(`<rect x="${chartX}" y="${top}" width="${chartW}" height="${H}" fill="none" stroke="#858585" stroke-width="4"/>`);
 if(safeG<0) parts.push(`<line x1="${chartX}" y1="${baseline}" x2="${chartX+chartW}" y2="${baseline}" stroke="#454545" stroke-width="3" stroke-dasharray="8 6"/>`);
 // Main labels
 parts.push(label(pqW/2,top+H*.25,"PQ",31,600));
 parts.push(label(pqW/2,top+H*.25+43,fmt(safePQ),28,500));
 if(vH>48) parts.push(label(chartX+chartW/2,top+vH*.52,`VQ　${fmt(safeVQ)}`,27,500));
 if(mH>48) parts.push(label(chartX+half/2,top+vH+mH*.52,`MQ　${fmt(safeMQ)}`,27,500));
 const fMainH=Math.min(fH,mH);
 if(fMainH>50) parts.push(label(splitX+half/2,top+vH+fMainH*.48,`F　${fmt(safeF)}`,27,500));
 if(safeG>0 && safeG*scale>34) parts.push(label(splitX+half/2,baseline-(safeG*scale)/2,`G=${fmt(safeG)}`,24,600));
 if(safeG<0 && negativeH>20) parts.push(label(splitX+half/2,baseline+negativeH/2,`G=${fmt(safeG)}`,24,700,"#8f2525"));
 // Percent callouts along PQ / right-panel boundary, matching the supplied reference.
 const r=31;
 if(vH>r*2) parts.push(`<circle cx="${chartX}" cy="${top+vH/2}" r="${r}" fill="#f7f7f7" stroke="#858585" stroke-width="3"/>${label(chartX,top+vH/2+1,`${ratioV}%`,22)}`);
 if(mH>r*2) parts.push(`<circle cx="${chartX}" cy="${top+vH+mH*.72}" r="${r}" fill="#f7f7f7" stroke="#858585" stroke-width="3"/>${label(chartX,top+vH+mH*.72+1,`${ratioM}%`,22)}`);
 parts.push('</svg>');
 return parts.join('');
}
function getAnnualFixedCost(year){return Number(db.annualFixedCostByYear?.[String(year)]||0)}
function analyticsPage(){
 const month=selectedFinanceMonth;
 const year=month.slice(0,4);
 // PQ/VQ are included immediately when entered for the selected sales month.
 // Sales-processing status is a separate workflow flag and does not hide entered figures.
 const currentMonth=new Date().toISOString().slice(0,7);
 const booked=db.projects.filter(p=>p.salesMonth===month||(!p.salesMonth&&month===currentMonth&&(Number(p.pq||0)!==0||Number(p.vq||0)!==0)));
 const pq=Math.round(booked.reduce((sum,p)=>sum+Number(p.pq||0),0));
 const vq=Math.round(booked.reduce((sum,p)=>sum+Number(p.vq||0),0));
 const mq=Math.round(pq-vq), annualF=getAnnualFixedCost(year), f=Math.round(annualF/12), g=Math.round(mq-f);
 return `<h1 class="page-title">STRAC</h1>
 <div class="strac-toolbar"><input id="financeMonth" type="month" value="${esc(month)}" aria-label="対象月"><span class="strac-count">${booked.length}件</span></div>
 <div class="strac-figure">${stracSvg(pq,vq,mq,f,g)}</div>
 <div class="strac-values"><div><span>PQ</span><strong>${money(pq)}</strong></div><div><span>VQ</span><strong>${money(vq)}</strong></div><div><span>MQ</span><strong>${money(mq)}</strong></div><div><span>F</span><strong>${money(f)}</strong></div><div><span>G</span><strong class="${g<0?'negative':''}">${money(g)}</strong></div></div>
 <p class="strac-foot">${booked.length}件</p>`;
}
function settingsPage(){
 const year=selectedFinanceMonth.slice(0,4);
 const annualF=getAnnualFixedCost(year);
 return `<h1 class="page-title">設定</h1><p class="page-subtitle">年間固定費の設定</p>
 <section class="settings-card"><div class="settings-year-row"><strong>対象年度</strong><input id="settingsYear" type="number" min="2020" max="2100" step="1" value="${esc(year)}" aria-label="設定対象年">年</div>
 <label class="settings-field" for="annualFixedCostInput">年間固定費（円）<input id="annualFixedCostInput" type="number" min="0" step="1" inputmode="numeric" value="${annualF}"></label>
 <div class="settings-preview"><span>月額 F</span><strong>${money(annualF/12)}</strong></div>
 <button class="primary-btn full" id="saveAnnualFixedCost">保存する</button></section>
 <p class="settings-note">設定した年間固定費を12で割り、該当年の各月のSTRACに適用します。</p>`;
}
function customersPage(){
 const filtered=db.customers.filter(c=>[c.name,c.person,c.address,c.tel].join(" ").toLowerCase().includes(searchTerm.toLowerCase()));
 return `<h1 class="page-title">顧客マスター</h1><p class="page-subtitle">顧客情報・連絡先を一元管理します</p>
 <div class="toolbar"><input class="search-input" id="searchBox" placeholder="会社名・担当者で検索"><button class="small-primary" id="addCustomer">＋ 新規</button></div>
 <div class="record-list">${filtered.length?filtered.map(c=>`<article class="record-card"><div class="record-title">${esc(c.name)}</div><div class="record-meta">${esc(c.person||"担当者未登録")}<br>${esc(c.tel||"電話番号未登録")}<br>${esc(c.address||"住所未登録")}</div><div class="record-actions"><button class="text-btn" data-detail-customer="${c.id}">詳細</button>${canEdit()?`<button class="text-btn" data-edit-customer="${c.id}">編集</button>`:""}</div></article>`).join(""):`<div class="empty-state">顧客情報がありません</div>`}</div>`;
}
function localToday(){return new Date().toLocaleDateString("sv-SE")}
function timeToMinutes(t){
 if(!t)return 0;
 const value=String(t).trim();
 if(value.includes(":")){const [h,m]=value.split(":").map(Number);return (h||0)*60+(m||0)}
 const digits=value.replace(/\D/g,"");
 if(digits.length===3)return Number(digits.slice(0,1))*60+Number(digits.slice(1));
 if(digits.length===4)return Number(digits.slice(0,2))*60+Number(digits.slice(2));
 return 0;
}
function formatTimeDisplay(t){if(!t)return "";const mins=timeToMinutes(t);const h=Math.floor(mins/60),m=mins%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`}
function normalizeTimeInput(value){const digits=String(value||"").replace(/\D/g,"");if(digits.length!==4)return null;const h=Number(digits.slice(0,2)),m=Number(digits.slice(2));if(m>59||h>36||(h===36&&m>0))return null;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`}
function formatWorkTime(t){return formatTimeDisplay(t)}
function scheduleColor(s){
 const colors={全体:"#d9534f",研修:"#26965c",日中作業:"#3478d4",閉店後作業:"#e4b52b"};
 return colors[s.color]||colors.日中作業;
}
function schedulePage(){
 const people=[...new Set(["全体",...db.schedules.map(s=>s.person).filter(n=>n&&n!=="全体"),currentUser?.name].filter(Boolean))];
 const staff=showAllStaff?people:people.filter(n=>n!=="（内勤）");
 const dayItems=db.schedules.filter(s=>s.date===selectedScheduleDate).sort((a,b)=>timeToMinutes(a.time)-timeToMinutes(b.time));
 const monthStart=new Date(selectedScheduleMonth+"-01T00:00:00");const first=monthStart.getDay();const days=new Date(monthStart.getFullYear(),monthStart.getMonth()+1,0).getDate();
 const monthCells=Array.from({length:Math.ceil((first+days)/7)*7},(_,i)=>{const d=i-first+1;return d>0&&d<=days?d:null});
 const dayEvents=dayItems.length?dayItems.map(s=>`<article class="schedule-item compact-schedule-item"><div class="schedule-time">${s.allDay?"終日\n09:00〜18:00":`${esc(formatTimeDisplay(s.time))}〜${esc(formatTimeDisplay(s.endTime||""))}`}</div><div class="schedule-info"><strong>${esc(s.title)}</strong><p>${esc(s.project||"一般予定")} ／ ${esc(s.site||"場所未設定")} ／ ${esc(s.person)}</p>${s.projectId?`<button class="text-btn" data-detail-project="${s.projectId}">関連案件を開く ›</button>`:""}<div class="record-actions"><button class="text-btn" data-edit-schedule="${s.id}">編集</button><button class="text-btn danger" data-delete-schedule="${s.id}">削除</button></div></div><i class="schedule-color-dot" style="background:${scheduleColor(s)}"></i></article>`).join(""):`<div class="empty-state">この日の予定はありません</div>`;
 const timed=dayItems.filter(s=>!s.allDay);
 const earliest=timed.length?Math.min(...timed.map(s=>timeToMinutes(s.time))):8*60;
 const latest=timed.length?Math.max(...timed.map(s=>{let e=timeToMinutes(s.endTime||s.time);if(e<=timeToMinutes(s.time))e+=24*60;return e})):18*60;
 const timelineStart=Math.min(8*60,Math.floor(Math.min(earliest,9*60)/60)*60),timelineEnd=Math.max(18*60,Math.ceil(Math.max(latest,18*60)/60)*60),total=Math.max(60,timelineEnd-timelineStart);
 const ticks=[timelineStart/60];for(let h=Math.ceil(timelineStart/120)*2;h<timelineEnd/60;h+=2)if(!ticks.includes(h))ticks.push(h);if(!ticks.includes(timelineEnd/60))ticks.push(timelineEnd/60);
 const position=mins=>(mins-timelineStart)/total*100;
 const gantt=`<div class="gantt-wrap"><div class="gantt-inner" style="--gantt-hours:${total/60}"><div class="gantt-head"><div class="gantt-name">社員</div><div class="gantt-track">${ticks.map(h=>`<span style="left:${position(h*60)}%">${String(h).padStart(2,"0")}:00</span>`).join("")}</div></div>${staff.map(name=>{
   const mine=dayItems.filter(s=>s.person===name);const active=(db.staffAvailability||{})[name]??(name===currentUser.name||name==="全体");
   const timedMine=mine.filter(s=>!s.allDay),lanes=[];
   timedMine.forEach(s=>{const a=timeToMinutes(s.time);let b=timeToMinutes(s.endTime||s.time);if(b<=a)b+=1440;let lane=0;while(lanes[lane]?.some(x=>a<x.end&&b>x.start))lane++;(lanes[lane]??=[]).push({start:a,end:b,s});s._lane=lane;});
   const laneCount=Math.max(1,lanes.length)+(mine.some(s=>s.allDay)?1:0);
   const bars=mine.map(s=>{
     if(s.allDay){const x=Math.max(timelineStart,9*60),y=Math.min(timelineEnd,18*60);return `<button class="gantt-bar all-day-bar" style="left:${position(x)}%;width:${Math.max(.8,(y-x)/total*100)}%;top:${2+lanes.length*27}px;background:${scheduleColor(s)}" data-edit-schedule="${s.id}" title="終日（09:00〜18:00）">${esc(s.title)}（終日）</button>`;}
     const a=timeToMinutes(s.time);let b=timeToMinutes(s.endTime||s.time);if(b<=a)b+=1440;const x=Math.max(timelineStart,a),y=Math.min(timelineEnd,b);if(y<=x)return "";
     return `<button class="gantt-bar" style="left:${position(x)}%;width:${Math.max(.8,(y-x)/total*100)}%;top:${2+s._lane*27}px;background:${scheduleColor(s)}" data-edit-schedule="${s.id}" title="${esc(s.title)}">${esc(s.title)}</button>`;
   }).join("");
   return `<div class="gantt-row" style="min-height:${Math.max(40,laneCount*27+8)}px"><div class="gantt-name ${active?"is-working":"is-away"}"><span>${esc(name)}</span></div><div class="gantt-track">${ticks.map(h=>`<i style="left:${position(h*60)}%"></i>`).join("")}${bars}</div></div>`;
 }).join("")}</div></div>`;
 const calendar=`<div class="month-calendar"><div class="month-heading"><button class="secondary-btn" id="prevMonth">‹</button><strong>${selectedScheduleMonth.replace("-","年 ")}月</strong><button class="secondary-btn" id="nextMonth">›</button></div><div class="month-list">${Array.from({length:days},(_,i)=>{const d=i+1;const date=`${selectedScheduleMonth}-${String(d).padStart(2,"0")}`;const events=db.schedules.filter(s=>s.date===date).sort((a,b)=>timeToMinutes(a.time)-timeToMinutes(b.time));const weekday=["日","月","火","水","木","金","土"][new Date(date+"T12:00:00").getDay()];return `<button class="month-day ${date===selectedScheduleDate?"selected":""}" data-pick-date="${date}"><span class="month-date-number">${d}日（${weekday}）</span><span class="month-day-events">${events.length?events.map(s=>`<small class="month-event" style="background:${scheduleColor(s)}"><strong>${esc(s.title)}</strong><span>${esc(s.person||"担当未設定")}</span><span>${esc(s.site||"場所未設定")}</span>${s.allDay?`<span>終日 09:00〜18:00</span>`:`<span>${esc(formatTimeDisplay(s.time))}〜${esc(formatTimeDisplay(s.endTime||""))}</span>`}</small>`).join(""):`<i class="month-no-event">予定なし</i>`}</span></button>`}).join("")}</div></div>`;
 return `<h1 class="page-title">スケジュール</h1><p class="page-subtitle">社員ごとの予定と空き時間を確認します</p><div class="schedule-toolbar"><div class="view-switch"><button data-sview="day" class="${scheduleView==="day"?"active":""}">1日一覧</button><button data-sview="gantt" class="${scheduleView==="gantt"?"active":""}">タイムライン</button><button data-sview="month" class="${scheduleView==="month"?"active":""}">月間</button></div><button class="small-primary" id="addSchedule">＋ 予定追加</button></div>
 <div class="schedule-date-control"><button id="prevDay">‹</button><input type="date" id="scheduleDate" value="${selectedScheduleDate}"><button id="nextDay">›</button><label><input type="checkbox" id="showAllStaff" ${showAllStaff?"checked":""}>全社員</label></div>
 ${scheduleView==="day"?`<div class="schedule-day">${selectedScheduleDate.replaceAll("-"," / ")}</div>${dayEvents}`:scheduleView==="gantt"?`<div class="gantt-legend"><span><i class="legend-working"></i>勤務中</span><span><i class="legend-away"></i>それ以外</span><small>表示 ${String(Math.floor(timelineStart/60)).padStart(2,"0")}:00〜${String(Math.floor(timelineEnd/60)).padStart(2,"0")}:00</small></div><div class="schedule-color-legend"><span>赤 全体</span><span>緑 研修</span><span>青 日中作業</span><span>黄 閉店後作業</span></div>${gantt}`:calendar}`;
}
function projectDetailPage(){
 const p=db.projects.find(x=>x.id===Number(window.selectedId));if(!p)return projectsPage();
 return `<h1 class="page-title">案件詳細</h1><p class="page-subtitle">案件情報を確認します</p><div class="detail-card"><div class="record-top"><strong>${esc(p.name)}</strong><span class="status">${esc(p.status)}</span></div>${detailRow("顧客",p.customer)}${detailRow("現場",p.site)}${detailRow("案件種別",p.type)}${detailRow("作業予定日",p.date)}${detailRow("担当者",p.person)}${detailRow("見積・受注金額",money(p.amount))}${detailRow("売上計上月",p.salesMonth||"")}${detailRow("PQ",money(p.pq||0))}${detailRow("VQ",money(p.vq||0))}${detailRow("売上処理",p.salesProcessed?"処理済":"未処理")}${detailRow("備考",p.notes)}<div class="detail-row"><span>関連スケジュール</span><strong>${db.schedules.filter(x=>x.projectId===p.id).length}件</strong></div>${db.schedules.filter(x=>x.projectId===p.id).map(x=>`<div class="related-schedule">${esc(x.date)}　${x.allDay?"終日":esc(formatTimeDisplay(x.time))}　${esc(x.title)}</div>`).join("")}</div><div class="toolbar"><button class="secondary-btn" data-go="projects" style="flex:1">一覧へ戻る</button>${canEdit()?`<button class="primary-btn" id="editCurrentProject" style="flex:1">編集する</button><button class="secondary-btn" id="deleteCurrentProject">削除</button>`:""}</div>`;
}
function customerDetailPage(){
 const c=db.customers.find(x=>x.id===Number(window.selectedId));if(!c)return customersPage();
 return `<h1 class="page-title">顧客詳細</h1><p class="page-subtitle">顧客情報を確認します</p><div class="detail-card"><strong>${esc(c.name)}</strong>${detailRow("フリガナ",c.kana)}${detailRow("担当者",c.person)}${detailRow("電話番号",c.tel)}${detailRow("メール",c.email)}${detailRow("住所",c.address)}${detailRow("備考",c.notes)}</div><div class="toolbar"><button class="secondary-btn" data-go="customers" style="flex:1">一覧へ戻る</button>${canEdit()?`<button class="primary-btn" id="editCurrentCustomer" style="flex:1">編集する</button>`:""}</div>`;
}
function detailRow(k,v){return `<div class="detail-row"><span>${k}</span><strong>${esc(v??"")}</strong></div>`}
function comingSoonPage(key){const item=menuItems.find(x=>x[0]===key);return `<h1 class="page-title">${item?.[1]||"機能"}</h1><p class="page-subtitle">${item?.[2]||""}</p><div class="empty-state"><div style="font-size:28px;margin-bottom:8px;color:var(--green)">✧</div>この機能は次の開発段階で実装します。<br>メニュー構成と画面デザインは準備済みです。<br><button class="secondary-btn" data-go="menu" style="margin-top:16px">メニューに戻る</button></div>`}
function bindPageEvents(){
 $$("[data-go]").forEach(b=>b.addEventListener("click",()=>render(b.dataset.go)));
 $("#logoutButton")?.addEventListener("click",async()=>{await signOut(auth);currentUser=null;showLogin()});
 $("#addProject")?.addEventListener("click",()=>openProjectForm());
 $("#addCustomer")?.addEventListener("click",()=>openCustomerForm());
 $("#addSchedule")?.addEventListener("click",()=>openScheduleForm());
 $$('[data-sview]').forEach(b=>b.addEventListener('click',()=>{scheduleView=b.dataset.sview;render('schedule')}));
 $("#scheduleDate")?.addEventListener("change",e=>{selectedScheduleDate=e.target.value;selectedScheduleMonth=selectedScheduleDate.slice(0,7);render("schedule")});
 $("#prevDay")?.addEventListener("click",()=>{const d=new Date(selectedScheduleDate+"T12:00:00");d.setDate(d.getDate()-1);selectedScheduleDate=d.toLocaleDateString("sv-SE");selectedScheduleMonth=selectedScheduleDate.slice(0,7);render("schedule")});
 $("#nextDay")?.addEventListener("click",()=>{const d=new Date(selectedScheduleDate+"T12:00:00");d.setDate(d.getDate()+1);selectedScheduleDate=d.toLocaleDateString("sv-SE");selectedScheduleMonth=selectedScheduleDate.slice(0,7);render("schedule")});
 $("#showAllStaff")?.addEventListener("change",e=>{showAllStaff=e.target.checked;render("schedule")});
 $("#prevMonth")?.addEventListener("click",()=>{const d=new Date(selectedScheduleMonth+"-01T12:00:00");d.setMonth(d.getMonth()-1);selectedScheduleMonth=d.toLocaleDateString("sv-SE").slice(0,7);render("schedule")});
 $("#nextMonth")?.addEventListener("click",()=>{const d=new Date(selectedScheduleMonth+"-01T12:00:00");d.setMonth(d.getMonth()+1);selectedScheduleMonth=d.toLocaleDateString("sv-SE").slice(0,7);render("schedule")});
 $$('[data-pick-date]').forEach(b=>b.addEventListener('click',()=>{selectedScheduleDate=b.dataset.pickDate;scheduleView='day';render('schedule')}));
 $$('[data-presence]').forEach(b=>b.addEventListener('click',()=>{db.staffAvailability=db.staffAvailability||{};const n=b.dataset.presence;db.staffAvailability[n]=db.staffAvailability[n]===false?true:false;saveDB();render('schedule')}));
 $$('[data-stage-project]').forEach(b=>b.addEventListener('click',()=>moveProjectStage(Number(b.dataset.stageProject),b.dataset.stage)));
 $$('[data-prep]').forEach(b=>b.addEventListener('change',()=>{const p=db.projects.find(x=>x.id===Number(b.dataset.id));if(!p)return;p[{docs:'prepDocs',date:'prepDate',staff:'prepStaff'}[b.dataset.prep]]=b.checked;saveDB();render('projects')}));
 $$('[data-complete-project]').forEach(b=>b.addEventListener('click',()=>{const p=db.projects.find(x=>x.id===Number(b.dataset.completeProject));if(!p)return;if(!confirm('作業完了・売上処理済みにして案件ボードから除外しますか？'))return;p.workCompleted=true;p.salesProcessed=true;p.workflowStage='archived';saveDB();render('projects');toast('売上処理済みとして保存しました')}));
 $("#financeMonth")?.addEventListener("change",e=>{selectedFinanceMonth=e.target.value||new Date().toISOString().slice(0,7);render("analytics")});
 $("#settingsYear")?.addEventListener("change",e=>{const y=String(e.target.value||new Date().getFullYear()).slice(0,4);selectedFinanceMonth=`${y}-01`;render("settings")});
 $("#saveAnnualFixedCost")?.addEventListener("click",()=>{const value=Number($("#annualFixedCostInput").value||0);if(value<0||!Number.isFinite(value)){toast("年間固定費を正しく入力してください");return}const year=selectedFinanceMonth.slice(0,4);db.annualFixedCostByYear=db.annualFixedCostByYear||{};db.annualFixedCostByYear[year]=value;saveDB();toast(`${year}年の年間固定費を保存しました`);render("settings")});
 $("#searchBox")?.addEventListener("input",e=>{searchTerm=e.target.value;const y=window.scrollY;render(currentPage);const input=$("#searchBox");input.focus();input.setSelectionRange(input.value.length,input.value.length);window.scrollTo(0,y)});
 $$("[data-filter]").forEach(b=>b.addEventListener("click",()=>{projectFilter=b.dataset.filter;render("projects")}));
 $$("[data-project-mode]").forEach(b=>b.addEventListener("click",()=>{projectPageMode=b.dataset.projectMode;render("projects")}));
 $$("[data-detail-project]").forEach(b=>b.addEventListener("click",()=>{window.selectedId=b.dataset.detailProject;render("projectDetail")}));
 $$("[data-edit-project]").forEach(b=>b.addEventListener("click",()=>openProjectForm(Number(b.dataset.editProject))));
 $$("[data-detail-customer]").forEach(b=>b.addEventListener("click",()=>{window.selectedId=b.dataset.detailCustomer;render("customerDetail")}));
 $$("[data-edit-customer]").forEach(b=>b.addEventListener("click",()=>openCustomerForm(Number(b.dataset.editCustomer))));
 $$("[data-edit-schedule]").forEach(b=>b.addEventListener("click",()=>openScheduleForm(Number(b.dataset.editSchedule))));
 $$("[data-delete-schedule]").forEach(b=>b.addEventListener("click",()=>deleteSchedule(Number(b.dataset.deleteSchedule))));
 $("#editCurrentProject")?.addEventListener("click",()=>openProjectForm(Number(window.selectedId)));
 $("#deleteCurrentProject")?.addEventListener("click",()=>deleteProject(Number(window.selectedId)));
 $("#editCurrentCustomer")?.addEventListener("click",()=>openCustomerForm(Number(window.selectedId)));
}
function moveProjectStage(id,stage){const p=db.projects.find(x=>x.id===id);if(!p)return;if(stage==='goods'&&!(p.prepDocs&&p.prepDate&&p.prepStaff)){toast('申請書類・日程・人員の準備をすべて完了してください');return}p.workflowStage=stage;if(stage==='wip')p.estimateApproved=true;saveDB();render('projects');toast('案件を移動しました')}
function openDialog(title,fields,record,onSave){
 editing={record,onSave};$("#dialogTitle").textContent=title;$("#dialogFields").innerHTML=fields.map(f=>fieldHTML(f,record?.[f.key])).join("");$("#formDialog").showModal();
}
function fieldHTML(f,value){const v=value??f.default??"";let input;
 if(f.type==="time4"){const digits=String(v).replace(/\D/g,"");input=`<input name="${f.key}" type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="例：1900" value="${esc(digits)}">`}
 else if(f.type==="textarea")input=`<textarea name="${f.key}" ${f.required?"required":""}>${esc(v)}</textarea>`;
 else if(f.type==="select")input=`<select name="${f.key}">${f.options.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
 else input=`<input name="${f.key}" type="${f.type||"text"}" value="${esc(v)}" ${f.required?"required":""} ${f.step?`step="${f.step}"`:""}>`;
 return `<label>${f.label}${f.required?" *":""}${input}</label>`}
function openProjectForm(id){
 if(!canEdit()){toast("編集権限がありません");return}
 const p=id?db.projects.find(x=>x.id===id):null;
 openDialog(p?"案件を編集":"案件を新規登録",[
  {key:"name",label:"案件名",required:true},{key:"customer",label:"顧客名",required:true},
  {key:"site",label:"現場住所・場所"},{key:"type",label:"案件種別",type:"select",options:["修理","定期点検","更新工事","新設工事","その他"],default:"修理"},
  {key:"status",label:"進捗状況",type:"select",options:["予定","進行中","完了"],default:"予定"},
  {key:"date",label:"作業予定日",type:"date"},{key:"person",label:"担当者",default:currentUser.name},
  {key:"amount",label:"見積・受注金額",type:"number",default:0},
  {key:"salesMonth",label:"売上計上月",type:"month",required:true,default:p?.salesMonth||p?.date?.slice(0,7)||new Date().toISOString().slice(0,7)},
  {key:"pq",label:"PQ（売上金額）",type:"number",default:0},
  {key:"vq",label:"VQ（案件原価）",type:"number",default:0},
  {key:"salesProcessed",label:"売上処理",type:"select",options:["未処理","処理済"],default:"未処理"},
  {key:"notes",label:"備考",type:"textarea"}
 ],p?{...p,salesProcessed:p.salesProcessed?"処理済":"未処理"}:null,data=>{const item={...data,...(p?{workflowStage:p.workflowStage||"material",prepDocs:!!p.prepDocs,prepDate:!!p.prepDate,prepStaff:!!p.prepStaff,workCompleted:!!p.workCompleted}: {workflowStage:"material",prepDocs:false,prepDate:false,prepStaff:false}),id:p?.id||Date.now(),amount:Number(data.amount||0),pq:Number(data.pq||0),vq:Number(data.vq||0),salesMonth:data.salesMonth||p?.salesMonth||p?.date?.slice(0,7)||new Date().toISOString().slice(0,7),salesProcessed:data.salesProcessed==="処理済"};if(p)db.projects=db.projects.map(x=>x.id===p.id?item:x);else db.projects.unshift(item);saveDB();$("#formDialog").close();toast(p?"案件を更新しました":"案件を登録しました");render(p&&currentPage==="projectDetail"?"projectDetail":"projects")});
}
function openCustomerForm(id){
 if(!canEdit()){toast("編集権限がありません");return}
 const c=id?db.customers.find(x=>x.id===id):null;
 openDialog(c?"顧客情報を編集":"顧客を新規登録",[
  {key:"name",label:"会社名・顧客名",required:true},{key:"kana",label:"フリガナ"},
  {key:"person",label:"担当者名"},{key:"tel",label:"電話番号",type:"tel"},
  {key:"email",label:"メールアドレス",type:"email"},{key:"address",label:"住所"},
  {key:"notes",label:"備考",type:"textarea"}
 ],c,data=>{const item={...data,id:c?.id||Date.now()};if(c)db.customers=db.customers.map(x=>x.id===c.id?item:x);else db.customers.unshift(item);saveDB();$("#formDialog").close();toast(c?"顧客情報を更新しました":"顧客を登録しました");render("customers")});
}
function openScheduleForm(id){
 const old=id?db.schedules.find(x=>x.id===id):null;
 const projectOptions=["紐付けなし",...db.projects.map(p=>p.name)];
 const staffOptions=["全体",...Object.values(employees).map(e=>e.name),currentUser.name].filter((v,i,a)=>a.indexOf(v)===i);
 openDialog(old?"予定を編集":"予定を追加",[
  {key:"date",label:"日付",type:"date",required:true,default:selectedScheduleDate||new Date().toLocaleDateString("sv-SE")},
  {key:"allDay",label:"時間区分",type:"select",options:["時間指定","終日"],default:old?.allDay?"終日":"時間指定"},
  {key:"time",label:"開始時刻（4桁入力：例 1900）",type:"time4",default:"0900"},
  {key:"endTime",label:"終了時刻（4桁入力：例 2600）",type:"time4",default:"1000"},
  {key:"title",label:"予定名",required:true},
  {key:"color",label:"予定の色・分類",type:"select",options:["全体","研修","日中作業","閉店後作業"],default:"日中作業"},
  {key:"person",label:"担当社員",type:"select",options:staffOptions,default:currentUser.name},
  {key:"project",label:"関連案件（任意）",type:"select",options:projectOptions,default:"紐付けなし"},
  {key:"site",label:"場所"}
 ],old?{...old,time:String(old.time||"").replace(":",""),endTime:String(old.endTime||"").replace(":",""),allDay:old.allDay?"終日":"時間指定",project:old.project||"紐付けなし",color:old.color||"日中作業"}:null,data=>{
   const allDay=data.allDay==="終日";
   const normalizedStart=allDay?"09:00":normalizeTimeInput(data.time),normalizedEnd=allDay?"18:00":normalizeTimeInput(data.endTime);
   if(!allDay&&(!normalizedStart||!normalizedEnd)){toast("時刻は4桁で入力してください（例：1900）");return}
   const linked=db.projects.find(p=>p.name===data.project);
   const item={...data,allDay,time:normalizedStart,endTime:normalizedEnd,project:linked?.name||"",projectId:linked?.id||null,id:old?.id||Date.now()};
   if(old)db.schedules=db.schedules.map(x=>x.id===old.id?item:x);else db.schedules.push(item);
   saveDB();selectedScheduleDate=item.date;selectedScheduleMonth=item.date.slice(0,7);$("#formDialog").close();toast(old?"予定を更新しました":"予定を追加しました");render("schedule");
 });
 const dialogFields=$("#dialogFields"),allDaySelect=dialogFields.querySelector('[name="allDay"]');
 const toggleTimeFields=()=>{const hide=allDaySelect?.value==="終日";["time","endTime"].forEach(key=>{const input=dialogFields.querySelector(`[name="${key}"]`);if(input){input.closest("label").style.display=hide?"none":"";input.required=!hide;}})};
 allDaySelect?.addEventListener("change",toggleTimeFields);toggleTimeFields();
 if(old&&canEdit()){
   const actions=$("#formDialog .dialog-actions");
   const del=document.createElement("button");del.type="button";del.className="text-btn danger";del.textContent="削除";
   del.addEventListener("click",()=>{if(confirm("この予定を削除しますか？")){deleteSchedule(old.id);$("#formDialog").close();}});
   actions.insertBefore(del,actions.firstChild);
 }
}
function deleteProject(id){if(!confirm("この案件を削除しますか？"))return;db.projects=db.projects.filter(x=>x.id!==id);saveDB();toast("案件を削除しました");render("projects")}
function deleteSchedule(id){if(!confirm("この予定を削除しますか？"))return;db.schedules=db.schedules.filter(x=>x.id!==id);saveDB();toast("予定を削除しました");render("schedule")}
$("#entityForm").addEventListener("submit",e=>{e.preventDefault();if(!editing)return;const data=Object.fromEntries(new FormData(e.currentTarget).entries());editing.onSave(data)});
function closeDialog(){$("#formDialog").close();editing=null}
$("#closeDialog").addEventListener("click",closeDialog);$("#cancelDialog").addEventListener("click",closeDialog);
