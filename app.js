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
  ]
};
let db = loadDB();
let currentUser = null;
let loginNotice = "";
let currentPage = "dashboard";
let projectFilter = "すべて";
let searchTerm = "";
let editing = null;

function loadDB(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||structuredClone(initialData)}catch{return JSON.parse(JSON.stringify(initialData))}}
function saveDB(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db))}
function money(n){return "¥"+Number(n||0).toLocaleString("ja-JP")}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2100)}
function canEdit(){return ["管理者","管理職","事務担当"].includes(currentUser?.role)}
function canSeeFinance(){return ["管理者","管理職","事務担当"].includes(currentUser?.role)}
function showLogin(message=null){
  if(message!==null) loginNotice=message;
  $("#loginView").classList.remove("hidden");
  $("#mainView").classList.add("hidden");
  const messageEl=$("#authMessage");
  if(messageEl) messageEl.textContent=loginNotice||"登録済みのGoogleアカウントでログインしてください。";
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
$("#homeButton").addEventListener("click",()=>render("dashboard"));
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
  ["analytics","経営分析","売上・粗利・案件状況","⌁"],
  ["equipment","設備台帳","冷凍機・空調機・修理履歴","⚙"],
  ["inventory","在庫・部品管理","部品・冷媒・消耗品","▦"],
  ["settings","設定","社員・権限・基本情報","⚙"]
];
function navActive(page){$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.nav===page||(page==="projectDetail"&&b.dataset.nav==="projects")))}
function render(page){
  currentPage=page;searchTerm="";navActive(page);$("#backButton").classList.toggle("hidden",!["projectDetail","customerDetail"].includes(page));
  const content=$("#content");
  const pages={dashboard:dashboardPage,menu:menuPage,projects:projectsPage,schedule:schedulePage,customers:customersPage,projectDetail:projectDetailPage,customerDetail:customerDetailPage};
  if(pages[page])content.innerHTML=pages[page]();
  else content.innerHTML=comingSoonPage(page);
  bindPageEvents();
  window.scrollTo({top:0,behavior:"instant"});
}
function dashboardPage(){
  const active=db.projects.filter(p=>p.status!=="完了").length;
  const total=db.projects.reduce((s,p)=>s+Number(p.amount||0),0);
  const today=new Date().toISOString().slice(0,10);
  const todays=db.schedules.filter(s=>s.date===today).length;
  return `<section class="welcome-panel"><div class="eyebrow">BUSINESS MANAGEMENT SYSTEM</div><h1>お疲れさまです、${esc(currentUser.name)} さん</h1><p>${esc(currentUser.role)} ｜ 今日も安全第一でいきましょう。</p></section>
  <div class="section-heading"><h2>会社の状況</h2><span class="sub">登録データに連動</span></div>
  <div class="metric-grid">
    <div class="metric-card"><div class="metric-label">登録案件数</div><div class="metric-value">${db.projects.length}<small> 件</small></div><div class="metric-foot">進行中 ${active} 件</div></div>
    <div class="metric-card"><div class="metric-label">案件登録金額</div><div class="metric-value">${money(total)}</div><div class="metric-foot">全案件の合計</div></div>
    <div class="metric-card"><div class="metric-label">顧客登録数</div><div class="metric-value">${db.customers.length}<small> 社</small></div><div class="metric-foot">顧客マスター</div></div>
    <div class="metric-card"><div class="metric-label">本日の予定</div><div class="metric-value">${todays}<small> 件</small></div><div class="metric-foot">スケジュール登録分</div></div>
  </div>
  <div class="section-heading"><h2>メインメニュー</h2><span class="sub">機能を選択</span></div>
  <div class="menu-grid">${menuItems.filter(x=>allowedMenu(x[0])).slice(0,8).map(tileHTML).join("")}</div>
  <div class="section-heading"><h2>最近の案件</h2><button class="text-btn" data-go="projects">すべて見る ›</button></div>
  <div class="record-list">${db.projects.slice(0,2).map(projectCard).join("")}</div>`;
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
 const filtered=db.projects.filter(p=>(projectFilter==="すべて"||p.status===projectFilter)&&[p.name,p.customer,p.site,p.person].join(" ").toLowerCase().includes(searchTerm.toLowerCase()));
 return `<h1 class="page-title">案件管理</h1><p class="page-subtitle">案件の登録・進捗・担当者を管理します</p>
 <div class="toolbar"><input class="search-input" id="searchBox" placeholder="案件名・顧客名で検索"><button class="small-primary" id="addProject">＋ 新規</button></div>
 <div class="filter-row">${["すべて","予定","進行中","完了"].map(f=>`<button class="filter-chip ${projectFilter===f?"active":""}" data-filter="${f}">${f}</button>`).join("")}</div>
 <div class="record-list">${filtered.length?filtered.map(projectCard).join(""):`<div class="empty-state">該当する案件がありません</div>`}</div>`;
}
function customersPage(){
 const filtered=db.customers.filter(c=>[c.name,c.person,c.address,c.tel].join(" ").toLowerCase().includes(searchTerm.toLowerCase()));
 return `<h1 class="page-title">顧客マスター</h1><p class="page-subtitle">顧客情報・連絡先を一元管理します</p>
 <div class="toolbar"><input class="search-input" id="searchBox" placeholder="会社名・担当者で検索"><button class="small-primary" id="addCustomer">＋ 新規</button></div>
 <div class="record-list">${filtered.length?filtered.map(c=>`<article class="record-card"><div class="record-title">${esc(c.name)}</div><div class="record-meta">${esc(c.person||"担当者未登録")}<br>${esc(c.tel||"電話番号未登録")}<br>${esc(c.address||"住所未登録")}</div><div class="record-actions"><button class="text-btn" data-detail-customer="${c.id}">詳細</button>${canEdit()?`<button class="text-btn" data-edit-customer="${c.id}">編集</button>`:""}</div></article>`).join(""):`<div class="empty-state">顧客情報がありません</div>`}</div>`;
}
function schedulePage(){
 const sorted=[...db.schedules].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 const groups={};sorted.forEach(s=>(groups[s.date]??=[]).push(s));
 return `<h1 class="page-title">スケジュール</h1><p class="page-subtitle">現場予定・担当者・作業内容を確認します</p><div class="toolbar"><span class="sub" style="flex:1">登録済み ${db.schedules.length} 件</span><button class="small-primary" id="addSchedule">＋ 予定追加</button></div>
 ${Object.keys(groups).length?Object.entries(groups).map(([date,items])=>`<div class="schedule-day">${date.replaceAll("-"," / ")}</div>${items.map(s=>`<article class="schedule-item"><div class="schedule-time">${esc(s.time)}</div><div class="schedule-info"><strong>${esc(s.title)}：${esc(s.project)}</strong><p>${esc(s.site)} ／ ${esc(s.person)}</p><div class="record-actions"><button class="text-btn" data-edit-schedule="${s.id}">編集</button><button class="text-btn danger" data-delete-schedule="${s.id}">削除</button></div></div></article>`).join("")}`).join(""):`<div class="empty-state">予定が登録されていません</div>`}`;
}
function projectDetailPage(){
 const p=db.projects.find(x=>x.id===Number(window.selectedId));if(!p)return projectsPage();
 return `<h1 class="page-title">案件詳細</h1><p class="page-subtitle">案件情報を確認します</p><div class="detail-card"><div class="record-top"><strong>${esc(p.name)}</strong><span class="status">${esc(p.status)}</span></div>${detailRow("顧客",p.customer)}${detailRow("現場",p.site)}${detailRow("案件種別",p.type)}${detailRow("作業予定日",p.date)}${detailRow("担当者",p.person)}${detailRow("見積・受注金額",money(p.amount))}${detailRow("備考",p.notes)}</div><div class="toolbar"><button class="secondary-btn" data-go="projects" style="flex:1">一覧へ戻る</button>${canEdit()?`<button class="primary-btn" id="editCurrentProject" style="flex:1">編集する</button><button class="secondary-btn" id="deleteCurrentProject">削除</button>`:""}</div>`;
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
 $("#searchBox")?.addEventListener("input",e=>{searchTerm=e.target.value;const y=window.scrollY;render(currentPage);const input=$("#searchBox");input.focus();input.setSelectionRange(input.value.length,input.value.length);window.scrollTo(0,y)});
 $$("[data-filter]").forEach(b=>b.addEventListener("click",()=>{projectFilter=b.dataset.filter;render("projects")}));
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
function openDialog(title,fields,record,onSave){
 editing={record,onSave};$("#dialogTitle").textContent=title;$("#dialogFields").innerHTML=fields.map(f=>fieldHTML(f,record?.[f.key])).join("");$("#formDialog").showModal();
}
function fieldHTML(f,value){const v=value??f.default??"";let input;
 if(f.type==="textarea")input=`<textarea name="${f.key}" ${f.required?"required":""}>${esc(v)}</textarea>`;
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
  {key:"amount",label:"見積・受注金額",type:"number",default:0},{key:"notes",label:"備考",type:"textarea"}
 ],p,data=>{const item={...data,id:p?.id||Date.now(),amount:Number(data.amount||0)};if(p)db.projects=db.projects.map(x=>x.id===p.id?item:x);else db.projects.unshift(item);saveDB();$("#formDialog").close();toast(p?"案件を更新しました":"案件を登録しました");render(p&&currentPage==="projectDetail"?"projectDetail":"projects")});
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
 const s=id?db.schedules.find(x=>x.id===id):null;
 openDialog(s?"予定を編集":"予定を追加",[
  {key:"date",label:"日付",type:"date",required:true,default:new Date().toISOString().slice(0,10)},
  {key:"time",label:"開始時刻",type:"time",default:"09:00"},{key:"title",label:"予定内容",required:true},
  {key:"project",label:"関連案件"},{key:"site",label:"場所"},{key:"person",label:"担当者",default:currentUser.name}
 ],s,data=>{const item={...data,id:s?.id||Date.now()};if(s)db.schedules=db.schedules.map(x=>x.id===s.id?item:x);else db.schedules.push(item);saveDB();$("#formDialog").close();toast(s?"予定を更新しました":"予定を追加しました");render("schedule")});
}
function deleteProject(id){if(!confirm("この案件を削除しますか？"))return;db.projects=db.projects.filter(x=>x.id!==id);saveDB();toast("案件を削除しました");render("projects")}
function deleteSchedule(id){if(!confirm("この予定を削除しますか？"))return;db.schedules=db.schedules.filter(x=>x.id!==id);saveDB();toast("予定を削除しました");render("schedule")}
$("#entityForm").addEventListener("submit",e=>{e.preventDefault();if(!editing)return;const data=Object.fromEntries(new FormData(e.currentTarget).entries());editing.onSave(data)});
function closeDialog(){$("#formDialog").close();editing=null}
$("#closeDialog").addEventListener("click",closeDialog);$("#cancelDialog").addEventListener("click",closeDialog);
