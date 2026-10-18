// ═══════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════
var FB_CFG = {
  apiKey:"AIzaSyC48zpV-bhFVoP6cNx9IGunljVk7_xyHAw",
  authDomain:"soru-takip-uygulamasi.firebaseapp.com",
  databaseURL:"https://soru-takip-uygulamasi-default-rtdb.firebaseio.com",
  projectId:"soru-takip-uygulamasi",
  storageBucket:"soru-takip-uygulamasi.firebasestorage.app",
  messagingSenderId:"716938527262",
  appId:"1:716938527262:web:2e252a594e0e3df8f0640f"
};

var STUDENTS = {
  omer:   {name:"Ömer Doruk Saldanlı",   short:"Ömer Doruk",  emoji:"👦", grad:"linear-gradient(135deg,#4F46E5,#7C3AED)"},
  zeynep: {name:"Zeynep Alya Saldanlı",  short:"Zeynep Alya", emoji:"👧", grad:"linear-gradient(135deg,#DB2777,#9D174D)"},
  admin:  {name:"Arif Saldanlı",         short:"Yönetici",    emoji:"👑", grad:"linear-gradient(135deg,#d97706,#b45309)"},
  teacher:{name:"Öğretmen",              short:"Öğretmen",    emoji:"👩‍🏫", grad:"linear-gradient(135deg,#0891b2,#0e7490)"}
};
// ── GİRİŞ: şifreler kodda tutulmaz, Firebase Authentication doğrular ──
// Hesap e-postaları Firebase konsolundaki kullanıcılarla birebir aynı olmalıdır. Kurulum: firebase/KURULUM.md
// Öğrenci ve öğretmen hesapları posta kutusu olmayan takma adreslerdir (gerçek adresler herkese açık kodda yer almasın diye)
var AUTH_EMAILS = {
  omer:    "omer@lgs.local",
  zeynep:  "zeynep@lgs.local",
  teacher: "teacher@lgs.local",
  admin:   "saldanli@istanbul.edu.tr"
};
function authEmail(who){ return AUTH_EMAILS[who]; }
var _authTok = 0; // yeni bir giriş, bekleyen gecikmeli çıkışı iptal eder
function authSignIn(who,pw){
  if(!pw) return Promise.reject({code:"auth/missing-password"});
  _authTok++;
  return firebase.auth().signInWithEmailAndPassword(authEmail(who),pw);
}
function authSignOut(){ try{ firebase.auth().signOut(); }catch(e){} }
// Bekleyen kayıtların (700 ms gecikmeli) yazılabilmesi için çıkış kısa süre sonra yapılır
function authSignOutSoon(){
  var tok=++_authTok;
  setTimeout(function(){ if(tok===_authTok) authSignOut(); },1500);
}
function authErrMsg(e){
  var c=(e&&e.code)||"";
  if(c==="auth/missing-password") return "Şifreyi girin.";
  if(c==="auth/wrong-password"||c==="auth/invalid-credential"||c==="auth/user-not-found"||c==="auth/invalid-login-credentials") return "Yanlış şifre, tekrar deneyin.";
  if(c==="auth/too-many-requests") return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.";
  if(c==="auth/network-request-failed") return "İnternet bağlantısı yok.";
  if(c==="auth/operation-not-allowed"||c==="auth/configuration-not-found") return "Firebase'de e-posta/şifre girişi henüz açılmamış (firebase/KURULUM.md).";
  return "Giriş yapılamadı"+(c?" ("+c+")":".");
}
// Görüntüleme bağlantısında (?izle) öğrenci girişleri de salt okunur öğretmen hesabıyla yapılır
function authWho(target){ return (READONLY&&(target==="omer"||target==="zeynep"))?"teacher":target; }
// Profil resimleri (Firebase'den yüklenir)
var PROFILE_PICS = { omer: null, zeynep: null };

var SUBJ = [
  {id:"matematik", n:"Matematik",      e:"📐",c:"#FF6B6B",d:"#C15151",bg:"#FFF0F0",li:"#FFE0E0"},
  {id:"turkce",    n:"Türkçe",          e:"📖",c:"#4ECDC4",d:"#307F79",bg:"#F0FFFE",li:"#D0F5F3"},
  {id:"fen",       n:"Fen Bilgisi",     e:"🔬",c:"#45B7D1",d:"#308092",bg:"#F0F8FF",li:"#D0EEFF"},
  {id:"sosyal",    n:"Sosyal Bilgiler", e:"🌍",c:"#56C596",d:"#388262",bg:"#F0FFF8",li:"#C8F0E0"},
  {id:"ingilizce", n:"İngilizce",       e:"🌎",c:"#F4A261",d:"#A16A40",bg:"#FFF8F0",li:"#FDE8CC"},
  {id:"din",       n:"Din Kültürü",     e:"⭐",c:"#9B72CF",d:"#8864B6",bg:"#F8F0FF",li:"#E8D5FF"},
  {id:"deneme",    n:"Genel Deneme",    e:"📝",c:"#E84393",d:"#D03C84",bg:"#FFF0F8",li:"#FFD0EB"}
];
var MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
var DAYS_SHORT = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
var DAYS_LONG  = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
var START = "2026-01-01";
var NET_DIVISOR = 3; // 3 yanlış = 1 doğru
var READONLY = (new URLSearchParams(window.location.search)).has("izle");
function injectReadonlyCSS(){
  if(document.getElementById("ro-style")) return; // already injected
  var s=document.createElement("style");
  s.id="ro-style";
  s.textContent='.stpr button,.stpr input,.goal-save,.btn-sw{pointer-events:none!important;opacity:0.4!important}.stpr input{background:#f9f9f9!important}';
  document.head.appendChild(s);
}
if(READONLY){
  document.addEventListener("DOMContentLoaded",function(){ injectReadonlyCSS(); });
}

// ═══════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════
var db, curStudent = null;
var recs = {}, goals = {};
var recRef, goalRef, recListener, goalListener;
var selDate, selMonth, selWeekStart;
var curView = "daily", expSubj = null;
var saveTimers = {};

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
function today(){
  var d=new Date(); d.setMinutes(d.getMinutes()+d.getTimezoneOffset()+180);
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
}
function pad(n){ return String(n).padStart(2,"0"); }
function ymNow(){ var d=new Date(); d.setMinutes(d.getMinutes()+d.getTimezoneOffset()+180); return d.getFullYear()+"-"+pad(d.getMonth()+1); }
function ym(y,m){ return y+"-"+pad(m+1); }
function dim(y,m){ return new Date(y,m+1,0).getDate(); }
function ds(y,m,d){ return y+"-"+pad(m+1)+"-"+pad(d); }
function fmtD(s){ var p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
function parseYM(s){ return {y:parseInt(s),m:parseInt(s.slice(5))-1}; }
function cw(t,c){ return Math.max(0,(t||0)-(c||0)); }
function calcNet(c,w){ return c - w/NET_DIVISOR; }
function fnet(n){ return Math.round(n*100)/100; }

function availMonths(){
  // Başlangıç ayından (START) içinde bulunulan aya kadar, yıl sınırını (2027 vb.) kendiliğinden aşar
  var res=[],y=parseInt(START),m=parseInt(START.slice(5))-1,now=parseYM(ymNow());
  while(y<now.y||(y===now.y&&m<=now.m)){
    res.push(ym(y,m)); if(++m>11){m=0;y++;}
  }
  return res;
}

// Get Monday of the week containing date string d
function weekStart(d){
  var dt=new Date(d);
  var day=dt.getDay(); // 0=Sun
  var diff=day===0?-6:1-day; // Monday
  dt.setDate(dt.getDate()+diff);
  return dt.toISOString().split("T")[0];
}
function addDays(d,n){
  var dt=new Date(d); dt.setDate(dt.getDate()+n);
  return dt.toISOString().split("T")[0];
}
function weekDays(ws){ var r=[]; for(var i=0;i<7;i++) r.push(addDays(ws,i)); return r; }

function dstats(d){
  var r=recs[d]||{},t=0,c=0,w=0;
  SUBJ.forEach(function(s){
    var sr=r[s.id]||{}; t+=sr.total||0; c+=sr.correct||0; w+=cw(sr.total||0,sr.correct||0);
  });
  return {total:t,correct:c,wrong:w,net:calcNet(c,w)};
}

function mstats(ymStr,sid){
  var p=parseYM(ymStr),days=dim(p.y,p.m),t=0,c=0,w=0;
  for(var d=1;d<=days;d++){
    var key=ds(p.y,p.m,d),r=recs[key];
    if(!r)continue;
    var list=sid?[SUBJ.find(function(s){return s.id===sid;})]:SUBJ;
    list.forEach(function(s){
      if(!s)return; var sr=r[s.id]||{};
      t+=sr.total||0; c+=sr.correct||0; w+=cw(sr.total||0,sr.correct||0);
    });
  }
  return {total:t,correct:c,wrong:w,net:calcNet(c,w)};
}

function wstats(ws,sid){
  var days=weekDays(ws),t=0,c=0,w=0;
  days.forEach(function(d){
    var r=recs[d]||{};
    var list=sid?[SUBJ.find(function(s){return s.id===sid;})]:SUBJ;
    list.forEach(function(s){
      if(!s)return; var sr=r[s.id]||{};
      t+=sr.total||0; c+=sr.correct||0; w+=cw(sr.total||0,sr.correct||0);
    });
  });
  return {total:t,correct:c,wrong:w,net:calcNet(c,w)};
}

// ═══════════════════════════════════════════════════════════════════
//  FIREBASE + STUDENT SELECT
// ═══════════════════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", function(){
  try{
    if(typeof firebase === "undefined"){
      document.body.innerHTML='<div style="font-family:sans-serif;text-align:center;padding:60px 20px"><div style="font-size:48px;margin-bottom:16px">⚠️</div><h2 style="color:#dc2626;margin-bottom:12px">Firebase yüklenemedi</h2><p style="color:#666;max-width:360px;margin:0 auto 20px">İnternet bağlantınızı kontrol edin ve sayfayı yenileyin.</p><button onclick="location.reload()" style="padding:12px 28px;background:#4F46E5;color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">🔄 Yenile</button></div>';
      return;
    }
    var app; try{app=firebase.app();}catch(e){app=firebase.initializeApp(FB_CFG);}
    db = firebase.database(app);
    db.ref(".info/connected").on("value",function(s){ syncState(s.val()?"ok":"saving"); });
    // Öğretmen bağlantısı (?o=şifre): şifre adres çubuğundan hemen silinir, giriş otomatik yapılır
    var linkPw = (new URLSearchParams(window.location.search)).get("o");
    if(linkPw!==null){
      try{ history.replaceState(null,"",window.location.pathname+(READONLY?"?izle":"")); }catch(e){}
    }
    startAuthFlow(linkPw);
    // Show picker
    document.getElementById("picker").style.display="flex";
    document.getElementById("app").style.display="none";
    // Profil resimleri giriş yapıldıktan sonra yüklenir (veritabanı girişsiz okunamaz)
    if(READONLY){
      document.getElementById("readonly-badge").style.display="block";
      document.getElementById("pick-sub").textContent="Hangi öğrenciyi görüntülemek istiyorsunuz?";
      var us=document.getElementById("upload-section"); if(us)us.style.display="none";
    }
  }catch(e){ console.error(e); }
});

// ── "Bu cihazda beni hatırla": işaretlenirse oturum cihazda kalır ve sonraki açılışta şifre sorulmaz ──
// İşaretlenmezse oturum yalnızca açık sekmede tutulur ve sayfa açılışında çıkış yapılmış başlanır.
var REMEMBER_KEY = "lgs_hatirla";
function getRemembered(){
  try{ var v=JSON.parse(localStorage.getItem(REMEMBER_KEY)||"null"); return (v&&AUTH_EMAILS[v.who])?v.who:null; }
  catch(e){ return null; }
}
function setRemembered(who){ try{ localStorage.setItem(REMEMBER_KEY,JSON.stringify({who:who})); }catch(e){} }
function clearRemembered(){ try{ localStorage.removeItem(REMEMBER_KEY); }catch(e){} }

function resumeRemembered(who){
  if(who==="teacher"){
    loadProfilePics();
    document.getElementById("teacher-modal").style.display="flex";
  } else {
    pickStudent(who);
  }
}

// Açılışta: hatırlanan cihazsa kayıtlı oturumla doğrudan girer, değilse çıkış yapılmış başlar
function startAuthFlow(linkPw){
  var auth=firebase.auth(), P=firebase.auth.Auth.Persistence;
  var rem=(linkPw===null&&!READONLY)?getRemembered():null;
  if(rem){
    auth.setPersistence(P.LOCAL).catch(function(){}).then(function(){
      return new Promise(function(res){ var off=auth.onAuthStateChanged(function(u){ off(); res(u); }); });
    }).then(function(u){
      if(u&&u.email===authEmail(rem)){ resumeRemembered(rem); return; }
      clearRemembered(); // oturum geçersiz (şifre değişmiş ya da silinmiş olabilir)
      return auth.signOut().catch(function(){});
    });
    return;
  }
  auth.setPersistence(P.SESSION).catch(function(){})
    .then(function(){ return auth.signOut(); }).catch(function(){})
    .then(function(){ if(linkPw) teacherLinkLogin(linkPw); });
}

// Gizli öğretmen bağlantısı: şifreyi yazdırmadan öğretmen hesabıyla girer ve öğrenci seçtirir
function teacherLinkLogin(pw){
  var sub=document.getElementById("pick-sub");
  var normal=READONLY?"Hangi öğrenciyi görüntülemek istiyorsunuz?":"Hangi öğrencinin takibini yapıyorsunuz?";
  if(sub) sub.textContent="Öğretmen girişi yapılıyor...";
  authSignIn("teacher",pw).then(function(){
    if(sub) sub.textContent=normal;
    _teacherMode=false;
    loadProfilePics();
    document.getElementById("teacher-modal").style.display="flex";
  }).catch(function(e){
    if(sub) sub.textContent="Bağlantı geçersiz ya da süresi dolmuş. Öğretmen şifresiyle giriş yapabilirsiniz.";
    console.warn("Öğretmen bağlantısı: "+authErrMsg(e));
  });
}

function showPicker(){
  // Detach old listeners
  if(recRef&&recListener) recRef.off("value",recListener);
  if(goalRef&&goalListener) goalRef.off("value",goalListener);
  if(denemeRef&&denemeListener) denemeRef.off("value",denemeListener);
  if(goalRefZ&&goalListenerZ) goalRefZ.off("value",goalListenerZ);
  recs={}; goals={}; goalsBy={omer:{},zeynep:{}}; cmpRecs={}; denemeler={}; closeDenemeForm();
  var wasTeacher=_teacherMode;
  curStudent=null; _teacherMode=false;
  if(!wasTeacher){
    clearRemembered(); // "Değiştir" cihazı unutturur
    authSignOutSoon();
  } // öğretmen oturumu açık kalır, diğer öğrenciyi şifresiz seçebilsin
  resetSessionUI();
  ["omer","zeynep"].forEach(function(sid){ applyAvatar(sid,PROFILE_PICS[sid]); }); // oturumda yüklenmiş resimler
  document.getElementById("app").style.display="none";
  document.getElementById("picker").style.display="flex";
  if(wasTeacher) document.getElementById("teacher-modal").style.display="flex";
}

// Önceki oturumdan kalan görünüm ve durumları sıfırlar (öğrenci/yönetici/öğretmen geçişinde)
function resetSessionUI(){
  var student=["daily","weekly","monthly","stats"];
  var admin=["cmp-daily","cmp-weekly","cmp-monthly","cmp-all","cmp-subj","cmp-stats","cmp-goals"];
  student.forEach(function(t){ var el=document.getElementById("nb-"+t); if(el){ el.style.display=""; el.className=t==="daily"?"act":""; } });
  admin.forEach(function(t){ var el=document.getElementById("nb-"+t); if(el){ el.style.display="none"; el.className=""; } });
  var pill=document.getElementById("ro-pill");
  if(pill){ pill.style.display="none"; pill.textContent="👁️ Salt Okunur"; }
  var ro=document.getElementById("ro-style"); if(ro&&!READONLY) ro.parentNode.removeChild(ro);
  var av=document.getElementById("hdr-avatar");
  if(av){ av.style.backgroundImage="none"; av.textContent=""; av.style.cursor="pointer"; av.onclick=openAvatarModal; }
  Object.keys(_charts).forEach(function(k){ destroyChart(k); });
  statsSelMonths=[]; statsInit=false; admSelMonths=[]; admInit=false; admStudent='omer'; expSubj=null; curView="daily";
  admGoalStudent="omer"; admGoalMonth=null; admGoalDraft=null; admGoalMsg="";
  document.getElementById("vw").innerHTML="";
}

function pickStudent(sid){
  if(sid==="teacher"){ askPassword("teacher"); return; } // öğretmenin kendi verisi yok, önce öğrenci seçilir
  try{
    if(!db){
      try{var a2;try{a2=firebase.app();}catch(e){a2=firebase.initializeApp(FB_CFG);}db=firebase.database(a2);}
      catch(e2){alert("Firebase baglantisi kurulamadi: "+e2.message);return;}
    }
    if(recRef&&recListener)recRef.off("value",recListener);
    if(goalRef&&goalListener)goalRef.off("value",goalListener);
    if(denemeRef&&denemeListener) denemeRef.off("value",denemeListener);
    if(goalRefZ&&goalListenerZ) goalRefZ.off("value",goalListenerZ);
    recs={}; goals={}; goalsBy={omer:{},zeynep:{}}; cmpRecs={}; denemeler={};
    resetSessionUI();
    selDate=today(); selMonth=ymNow(); selWeekStart=weekStart(today());
    expSubj=null;
    document.getElementById("picker").style.display="none";
    document.getElementById("app").style.display="block";

    // ── Admin mode ──
    if(sid==="admin"){
      curStudent="omer";
      document.getElementById("hdr-bg").style.background="linear-gradient(135deg,#d97706,#b45309)";
      document.getElementById("hdr-sub").textContent="👑";
      document.getElementById("hdr-name").textContent="Yönetici Paneli";
      document.getElementById("ro-pill").style.display="inline-flex";
      ["cmp-daily","cmp-weekly","cmp-monthly","cmp-all","cmp-subj","cmp-stats","cmp-goals"].forEach(function(t){
        var el=document.getElementById("nb-"+t); if(el) el.style.display="flex";
      });
      ["daily","weekly","monthly","stats"].forEach(function(t){
        var el=document.getElementById("nb-"+t); if(el) el.style.display="none";
      });
      recRef=db.ref("records/omer");
      goalRef=db.ref("goals/omer");
      syncState("saving");
      var adminFirstLoad=true;
      recListener=recRef.on("value",function(snap){
        recs=snap.val()||{};
        db.ref("records/zeynep").once("value",function(s2){
          cmpRecs=s2.val()||{}; updateHdr(); syncState("ok");
          // İlk yüklemede günlük karşılaştırma açılır; sonraki veri değişikliklerinde açık ekran yenilenir
          if(adminFirstLoad){ adminFirstLoad=false; gv("cmp-daily"); } else render();
        });
      },function(){ syncState("error"); });
      // Yönetici her iki öğrencinin hedeflerini görür ve düzenler
      goalListener=goalRef.on("value",function(snap){
        goals=snap.val()||{}; goalsBy.omer=goals; if(curView==="cmp-goals") renderCmpGoals();
      });
      goalRefZ=db.ref("goals/zeynep");
      goalListenerZ=goalRefZ.on("value",function(snap){
        goalsBy.zeynep=snap.val()||{}; if(curView==="cmp-goals") renderCmpGoals();
      });
      return;
    }

    // ── Normal student ──
    curStudent=sid;
    var st=STUDENTS[sid];
    document.getElementById("hdr-bg").style.background=st.grad;
    document.getElementById("hdr-sub").textContent=st.emoji;
    document.getElementById("hdr-name").textContent=st.name;
    // Header avatar
    var hdrAv=document.getElementById("hdr-avatar");
    if(hdrAv){ hdrAv.style.backgroundImage="none"; hdrAv.textContent=st.emoji; }
    if(READONLY||_teacherMode){
      document.getElementById("ro-pill").style.display="inline-flex";
      if(_teacherMode){
        document.getElementById("ro-pill").textContent="👩‍🏫 Öğretmen Modu";
        injectReadonlyCSS();
      }
    }
    // Hide change-picture if teacher or readonly
    var hdrAvEl=document.getElementById("hdr-avatar");
    if(hdrAvEl){ hdrAvEl.style.cursor=(READONLY||_teacherMode)?"default":"pointer"; hdrAvEl.onclick=(READONLY||_teacherMode)?null:openAvatarModal; }
    curView="daily";
    recRef=db.ref("records/"+sid);
    goalRef=db.ref("goals/"+sid);
    syncState("saving");
    recListener=recRef.on("value",function(snap){
      recs=snap.val()||{}; updateHdr(); render(); syncState("ok");
    },function(){ syncState("error"); });
    goalListener=goalRef.on("value",function(snap){
      goals=snap.val()||{}; render();
    });
    // Genel Deneme ders bazlı sonuçları (denemeler/<öğrenci>)
    denemeErr=false;
    denemeRef=db.ref("denemeler/"+sid);
    denemeListener=denemeRef.on("value",function(snap){
      denemeler=snap.val()||{}; denemeErr=false; if(curView==="stats") renderStats();
    },function(){ denemeler={}; denemeErr=true; });
    loadProfilePics();
    gv("daily");
  }catch(e){alert("Giris hatasi: "+e.message); console.error(e);}
}

// ═══════════════════════════════════════════════════════════════════
//  SYNC UI
// ═══════════════════════════════════════════════════════════════════
function syncState(s){
  var dot=document.getElementById("sync-dot"),txt=document.getElementById("sync-txt");
  if(!dot)return;
  if(s==="saving"){dot.style.background="#FDE68A";txt.textContent="Bağlanıyor...";}
  else if(s==="ok"){dot.style.background="#86EFAC";txt.textContent="Senkronize ✓";}
  else{dot.style.background="#FCA5A5";txt.textContent="Bağlantı hatası!";}
}

function saveField(sid,field,val){
  if(!curStudent||READONLY||_teacherMode)return;
  val=Math.max(0,parseInt(val)||0);
  var cur=(recs[selDate]&&recs[selDate][sid])||{total:0,correct:0};
  var t=cur.total||0,c=cur.correct||0;
  if(field==="total"){t=val;if(c>t)c=t;}
  else{c=val;if(c>t)t=c;}
  if(!recs[selDate])recs[selDate]={};
  recs[selDate][sid]={total:t,correct:c};
  updateHdr();
  var wEl=document.getElementById("wv-"+sid);
  if(wEl)wEl.textContent=cw(t,c);
  var nEl=document.getElementById("nv-"+sid);
  if(nEl)nEl.textContent="Net: "+fnet(calcNet(c,cw(t,c)));
  // Kayıt hedefi şimdi sabitlenir: 700 ms içinde öğrenci değişse bile veri doğru profile yazılır
  var targetRef=recRef.child(selDate).child(sid);
  var dateAtEdit=selDate, studentAtEdit=curStudent;
  var achKey=studentAtEdit+"|"+dateAtEdit+"|"+sid;
  clearTimeout(_achTimers[achKey]);   // yeni bir düzenleme geldi, bekleyen kutlama iptal (yanlış girilip düzeltilebilir)
  _pendingWrites[achKey]={ref:targetRef,data:{total:t,correct:c}};
  clearTimeout(saveTimers[achKey]); syncState("saving");
  saveTimers[achKey]=setTimeout(function(){
    var w=writeRecord(achKey); if(!w) return;
    w.then(function(){
      syncState("ok");
      // Kayıt başarılı olunca rekor kontrolü, düzenleme durduktan birkaç saniye sonra yapılır
      scheduleAchievement(achKey,dateAtEdit,sid,studentAtEdit);
    }).catch(function(){syncState("error");});
  },700);
}

// Bekleyen kayıtlar 700 ms gecikmeyle yazılır. Sekme kapanırken ya da arka plana alınırken hemen yazılır,
// böylece son girilen değer kaybolmaz. Anahtar: öğrenci|gün|ders (gün ya da ders değişse de kayıt karışmaz)
var _pendingWrites={};
function writeRecord(key){
  var p=_pendingWrites[key]; if(!p) return null;
  delete _pendingWrites[key]; clearTimeout(saveTimers[key]);
  return p.ref.set(p.data);
}
function flushPendingWrites(){
  Object.keys(_pendingWrites).forEach(function(k){ var w=writeRecord(k); if(w) w.catch(function(){}); });
}
window.addEventListener("pagehide",flushPendingWrites);
document.addEventListener("visibilitychange",function(){ if(document.visibilityState==="hidden") flushPendingWrites(); });

// Kutlama, son düzenlemeden yaklaşık 2,5 sn sonra (700 ms kayıt gecikmesi + 1,8 sn) gösterilir
var _achTimers={};
function scheduleAchievement(key,d,sid,student){
  clearTimeout(_achTimers[key]);
  _achTimers[key]=setTimeout(function(){
    if(curStudent===student) checkAchievements(d,sid);   // bu arada öğrenci değiştiyse atlanır
  },1800);
}

// ═══════════════════════════════════════════════════════════════════
//  BAŞARI / REKOR BİLDİRİMİ (popup + ses)
//  Bir dersin ya da günlük toplamın, aynı ay veya yıldaki diğer tüm günlerin en yükseğini aşması
// ═══════════════════════════════════════════════════════════════════
// Hesap saf bir fonksiyondur: r = kayıtlar, d = düzenlenen gün, sid = ders (null ise günlük toplam)
function dayCount(r,d,sid){
  var x=r[d]; if(!x) return 0;
  if(sid) return (x[sid]&&x[sid].total)||0;
  var t=0; SUBJ.forEach(function(s){ t+=(x[s.id]&&x[s.id].total)||0; }); return t;
}
// Dönüş: {level:"year"|"month", value, prev} ya da null. Önceki veri yoksa (ilk gün) rekor sayılmaz.
function recordLevel(r,d,sid){
  var val=dayCount(r,d,sid); if(val<=0) return null;
  var ymKey=d.slice(0,7), yKey=d.slice(0,4), prevM=0, prevY=0;
  Object.keys(r).forEach(function(k){
    if(k===d||k<START) return;
    var v=dayCount(r,k,sid); if(!v) return;
    if(k.slice(0,4)===yKey){ if(v>prevY) prevY=v; if(k.slice(0,7)===ymKey&&v>prevM) prevM=v; }
  });
  if(prevY>0&&val>prevY) return {level:"year",value:val,prev:prevY};
  if(prevM>0&&val>prevM) return {level:"month",value:val,prev:prevM};
  return null;
}
// Kutlanan değerler cihazda tutulur (sayfa yenilenince aynı değer için tekrar çıkmasın)
function celebratedStore(){
  try{ return JSON.parse(localStorage.getItem("lgs_kutlama_"+curStudent)||"{}"); }catch(e){ return {}; }
}
function saveCelebrated(st){
  try{ localStorage.setItem("lgs_kutlama_"+curStudent,JSON.stringify(st)); }catch(e){}
}
function achievementsFor(r,d,sid,store){
  var list=[];
  var items=[{key:"total",sid:null,label:"📚 Günlük toplam"}];
  var sj=SUBJ.find(function(s){return s.id===sid;});
  if(sj) items.unshift({key:sid,sid:sid,label:sj.e+" "+sj.n});
  items.forEach(function(it){
    var k=d+"|"+it.key, was=store[k], wasVal=(was&&typeof was==="object")?was.v:0;
    var rec=recordLevel(r,d,it.sid);
    // Rekor değilse kayıt silinir: değer sonradan yeniden rekor olursa yine kutlanır
    if(!rec){ if(was!==undefined) delete store[k]; return; }
    // Aynı değer için bir kez kutlanır. Değer değişirse (örneğin yanlış girilip düzeltilirse) yeniden kutlanır
    if(wasVal===rec.value) return;
    store[k]={v:rec.value};
    list.push({label:it.label,level:rec.level,value:rec.value,prev:rec.prev});
  });
  return list;
}
function checkAchievements(d,sid){
  if(!curStudent||READONLY||_teacherMode) return;
  var store=celebratedStore();
  var list=achievementsFor(recs,d,sid,store);
  saveCelebrated(store);
  if(list.length) showAchievement(list,d);
}

// ── Ses: dosya gerektirmeyen kısa bir fanfar (Web Audio). Açma/kapama cihazda hatırlanır ──
function soundOn(){ try{ return localStorage.getItem("lgs_ses")!=="kapali"; }catch(e){ return true; } }
function setSoundOn(on){ try{ localStorage.setItem("lgs_ses",on?"acik":"kapali"); }catch(e){} }
var _audioCtx=null;
function playAchieveSound(level){
  if(!soundOn()) return;
  try{
    var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    if(!_audioCtx) _audioCtx=new AC();
    if(_audioCtx.state==="suspended") _audioCtx.resume();
    var notes=level==="year"?[523.25,659.25,783.99,1046.5,1318.5]:[523.25,659.25,783.99];
    var t0=_audioCtx.currentTime+0.02;
    notes.forEach(function(f,i){
      var o=_audioCtx.createOscillator(), g=_audioCtx.createGain(), st=t0+i*0.13;
      o.type="triangle"; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,st);
      g.gain.exponentialRampToValueAtTime(0.25,st+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,st+(i===notes.length-1?0.7:0.22));
      o.connect(g); g.connect(_audioCtx.destination);
      o.start(st); o.stop(st+0.75);
    });
  }catch(e){}
}

// ── Popup ──
var _achTimer=null;
function closeAchievement(){
  var el=document.getElementById("ach-pop"); if(el) el.parentNode.removeChild(el);
  clearTimeout(_achTimer);
}
function toggleAchSound(btn){
  var on=!soundOn(); setSoundOn(on); btn.textContent=on?"🔔 Ses açık":"🔕 Ses kapalı";
  if(on) playAchieveSound("month");
}
function showAchievement(list,d){
  closeAchievement();
  var year=list.some(function(a){return a.level==="year";});
  var head=year?"🏆 Yıllık rekor!":"🎉 Aylık rekor!";
  var col=year?"#d97706":"#4F46E5";
  if(!document.getElementById("ach-style")){
    var st=document.createElement("style"); st.id="ach-style";
    st.textContent="@keyframes achIn{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}"
      +"@keyframes achPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}"
      +"#ach-card{animation:achIn .25s ease-out}#ach-emoji{animation:achPulse 1s ease-in-out 2}"
      +"@media (prefers-reduced-motion:reduce){#ach-card,#ach-emoji{animation:none}}";
    document.head.appendChild(st);
  }
  var lines=list.map(function(a){
    var tag=a.level==="year"?"bu yılın":"bu ayın";
    return '<div style="padding:8px 10px;background:#f9fafb;border-radius:10px;margin-bottom:6px;text-align:left">'
      +'<div style="font-size:14px;font-weight:900;color:#222">'+a.label+': '+a.value+' soru</div>'
      +'<div style="font-size:12px;font-weight:700;color:#666">'+tag+' en yüksek günü (önceki: '+a.prev+')</div></div>';
  }).join("");
  var dateNote=d!==today()?'<div style="font-size:12px;color:#767676;font-weight:700;margin-bottom:8px">'+fmtD(d)+' günü</div>':"";
  var pop=document.createElement("div");
  pop.id="ach-pop"; pop.setAttribute("role","dialog"); pop.setAttribute("aria-live","polite");
  pop.style.cssText="position:fixed;inset:0;background:#0006;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px";
  pop.innerHTML='<div id="ach-card" style="background:white;border-radius:24px;padding:26px 22px 18px;max-width:320px;width:100%;box-shadow:0 20px 60px #0004;text-align:center;border-top:6px solid '+col+'">'
    +'<div id="ach-emoji" style="font-size:52px;line-height:1.1">'+(year?"🏆":"🎉")+'</div>'
    +'<div style="font-size:19px;font-weight:900;color:'+col+';margin:6px 0 4px">'+head.replace(/^\S+\s/,"")+'</div>'
    +'<div style="font-size:13px;color:#666;font-weight:700;margin-bottom:10px">Harika gidiyorsun, devam et!</div>'
    +dateNote+lines
    +'<div style="display:flex;gap:8px;margin-top:12px">'
    +'<button onclick="toggleAchSound(this)" style="flex:1;padding:10px;border-radius:12px;border:2px solid #e5e7eb;background:white;font-size:13px;font-weight:800;color:#666;font-family:Nunito,sans-serif;cursor:pointer">'+(soundOn()?"🔔 Ses açık":"🔕 Ses kapalı")+'</button>'
    +'<button onclick="closeAchievement()" style="flex:1;padding:10px;border-radius:12px;border:none;background:'+col+';color:white;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer">Tamam</button></div></div>';
  pop.addEventListener("click",function(e){ if(e.target===pop) closeAchievement(); });
  document.body.appendChild(pop);
  playAchieveSound(year?"year":"month");
  _achTimer=setTimeout(closeAchievement,6000);
}

function adj(sid,field,delta){
  var inp=document.getElementById("inp-"+sid+"-"+field);
  if(!inp)return;
  inp.value=Math.max(0,(parseInt(inp.value)||0)+delta);
  saveField(sid,field,inp.value);
}

// Hedef ekranında gezilebilen aylar: başlangıçtan LGS ayına kadar (gelecek aylara da hedef girilebilir)
function goalMonths(){
  var res=availMonths(), end=LGS_DATE.slice(0,7);
  var last=parseYM(res[res.length-1]), y=last.y, m=last.m;
  while(ym(y,m)<end){ if(++m>11){m=0;y++;} res.push(ym(y,m)); }
  return res;
}
// ═══════════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════════
function gv(v){
  curView=v; expSubj=null;
  ["daily","weekly","monthly","stats","cmp-daily","cmp-weekly","cmp-monthly","cmp-all","cmp-subj","cmp-stats","cmp-goals"].forEach(function(x){
    var el=document.getElementById("nb-"+x); if(el) el.className=x===v?"act":"";
  });
  render();
}
function render(){ if(!db||!curStudent)return; var fn={daily:renderDaily,weekly:renderWeekly,monthly:renderMonthly,stats:renderStats,"cmp-daily":renderCmpDaily,"cmp-weekly":renderCmpWeekly,"cmp-monthly":renderCmpMonthly,"cmp-all":renderCmpAll,"cmp-subj":renderCmpSubj,"cmp-stats":renderCmpStats,"cmp-goals":renderCmpGoals}; (fn[curView]||renderDaily)(); updateHdr(); }

function updateHdr(){
  var s=dstats(selDate);
  document.getElementById("hdr-total").textContent=s.total;
  document.getElementById("hdr-c").textContent=s.correct;
  document.getElementById("hdr-w").textContent=s.wrong;
  document.getElementById("hdr-n").textContent=fnet(s.net);
}

// ═══════════════════════════════════════════════════════════════════
//  DAILY VIEW
// ═══════════════════════════════════════════════════════════════════
function renderDaily(){
  var p=parseYM(selDate.slice(0,7)),calDays=dim(p.y,p.m);
  var fdow=new Date(p.y,p.m,1).getDay(),td=today();
  var cells="";
  for(var i=0;i<fdow;i++)cells+="<div></div>";
  for(var d=1;d<=calDays;d++){
    var dstr=ds(p.y,p.m,d),st=dstats(dstr);
    var cls="cday";
    if(dstr===selDate)cls+=" sel"; else if(dstr===td)cls+=" tdy";
    if(dstr>td||dstr<START)cls+=" off";
    if(st.total>0)cls+=" dot";
    var dis=dstr>td||dstr<START;
    cells+='<button class="'+cls+'"'+(dis?'':' onclick="selD(\''+dstr+'\')"')+'>'+d+'</button>';
  }
  var tod=dstats(selDate);
  var scards="";
  SUBJ.forEach(function(s){
    var r=(recs[selDate]&&recs[selDate][s.id])||{};
    var t=r.total||0,c=r.correct||0,w=cw(t,c);
    var has=t>0,exp=expSubj===s.id,pct=t>0?parseFloat((c/t*100).toFixed(2)):0,n=calcNet(c,w);
    var body="";
    if(exp){
      var cpct=t>0?parseFloat((c/t*100).toFixed(2)):0,wpct=t>0?parseFloat((w/t*100).toFixed(2)):0;
      body='<div class="sbody" style="background:'+s.bg+'">'
        +'<div class="grid2">'
        +'<div class="fbox" style="background:white;border:2px solid '+s.c+'22">'
        +'<div class="flbl" style="color:#666">📋 TOPLAM SORU</div>'
        +'<div class="stpr"><button style="background:#e5e7eb;color:#666" aria-label="Toplam soru azalt" onclick="adj(\''+s.id+'\',\'total\',-1)">−</button>'
        +'<input id="inp-'+s.id+'-total" aria-label="'+s.n+' toplam soru" type="number" min="0" value="'+t+'" style="border-color:'+s.c+';color:'+s.d+'" oninput="saveField(\''+s.id+'\',\'total\',this.value)">'
        +'<button style="background:'+s.c+';color:white" aria-label="Toplam soru artır" onclick="adj(\''+s.id+'\',\'total\',1)">+</button></div></div>'
        +'<div class="fbox" style="background:#f0fdf4;border:2px solid #22c55e22">'
        +'<div class="flbl" style="color:#15803d">✓ DOĞRU</div>'
        +'<div class="stpr"><button style="background:#dcfce7;color:#15803d" aria-label="Doğru sayısı azalt" onclick="adj(\''+s.id+'\',\'correct\',-1)">−</button>'
        +'<input id="inp-'+s.id+'-correct" aria-label="'+s.n+' doğru sayısı" type="number" min="0" value="'+c+'" style="border-color:#22c55e;color:#15803d" oninput="saveField(\''+s.id+'\',\'correct\',this.value)">'
        +'<button style="background:#22c55e;color:white" aria-label="Doğru sayısı artır" onclick="adj(\''+s.id+'\',\'correct\',1)">+</button></div></div></div>'
        +'<div class="wbox"><div>'
        +'<div style="font-size:12px;font-weight:800;color:#dc2626">✗ YANLIŞ (Otomatik)</div>'
        +'<div style="font-size:12px;color:#767676;font-weight:600">= Toplam − Doğru</div>'
        +'</div><div class="wval" id="wv-'+s.id+'">'+w+'</div></div>'
        +(t>0?'<div class="bar"><div class="bg" style="width:'+cpct+'%"></div><div class="br" style="width:'+wpct+'%"></div></div>'
          +'<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:4px">'
          +'<div style="display:flex;gap:10px"><span style="color:#15803d">✓%'+cpct+'</span><span style="color:#dc2626">✗%'+wpct+'</span></div>'
          +'<span id="nv-'+s.id+'" style="color:'+(n>=0?"#15803d":"#dc2626")+'">Net: '+fnet(n)+'</span></div>':"")
        +(s.id==="deneme"&&!READONLY&&!_teacherMode?'<button onclick="openDenemeForm()" style="width:100%;margin-top:10px;padding:10px;border-radius:12px;border:2px solid '+s.c+';background:white;color:'+s.d+';font-size:13px;font-weight:800;cursor:pointer;font-family:Nunito,sans-serif">📝 Ders bazlı deneme sonucu ekle</button>':"")
        +'<div style="background:#EEF2FF;border-radius:10px;padding:6px 10px;margin-top:10px;font-size:12px;color:#4F46E5;font-weight:700">ℹ️ Net = Doğru − Yanlış ÷ 3</div>'
        +'</div>';
    }
    scards+='<div class="scard'+(has?" has":"")+'" style="border-color:'+(has?s.c+'55':"transparent")+'">'
      +'<div class="shead" onclick="tog(\''+s.id+'\')">'
      +'<div class="sicon" style="background:'+s.li+'">'+s.e+'</div>'
      +'<div style="flex:1;min-width:0"><div style="font-weight:900;font-size:14px;color:#222">'+s.n+'</div>'
      +(has?'<div style="display:flex;gap:8px;margin-top:3px;flex-wrap:wrap">'
        +'<span style="font-size:12px;font-weight:700;color:#666">📋'+t+'</span>'
        +'<span style="font-size:12px;font-weight:700;color:#15803d">✓'+c+'</span>'
        +'<span style="font-size:12px;font-weight:700;color:#dc2626">✗'+w+'</span>'
        +'<span style="font-size:12px;font-weight:700;color:'+s.d+'">%'+pct+'</span></div>'
       :'<div style="font-size:12px;color:#767676;font-weight:600;margin-top:3px">Dokunarak veri gir</div>')
      +'</div>'
      +'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">'
      +(has?'<span style="font-weight:900;font-size:13px;color:'+(n>=0?"#15803d":"#dc2626")+'">Net:'+fnet(n)+'</span>':"")
      +'<span style="font-size:18px;color:#767676;line-height:1;transform:'+(exp?"rotate(180deg)":"none")+'">⌄</span>'
      +'</div></div>'+body+'</div>';
  });
  document.getElementById("vw").innerHTML=
    (curStudent==="omer"?lgsWidget():"")
    +streakWidget()
    +'<div class="period-nav">'
    +'<button aria-label="Önceki" onclick="calPrev()">‹</button>'
    +'<span>'+MONTHS[p.m]+' '+p.y+'</span>'
    +'<button aria-label="Sonraki" onclick="calNext()">›</button></div>'
    +'<div class="cal"><div class="cal-hdr">'+DAYS_SHORT.map(function(d){return'<div>'+d+'</div>';}).join("")+'</div>'
    +'<div class="cal-grid">'+cells+'</div></div>'
    +'<div style="background:white;border-radius:12px;padding:9px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px #0001">'
    +'<span style="font-size:14px;color:#666;font-weight:700">'+DAYS_SHORT[new Date(selDate).getDay()]+', '+fmtD(selDate)+(selDate===td?' <span style="color:var(--p)">● Bugün</span>':"")+'</span>'
    +(tod.total>0?'<span style="font-weight:900;font-size:13px;color:'+(tod.net>=0?"#15803d":"#dc2626")+'">Net: '+fnet(tod.net)+'</span>':"")
    +'</div>'
    +scards
    +'<div style="text-align:center;font-size:12px;color:#767676;font-weight:700;margin-top:8px">✅ Otomatik kaydediliyor · Net = Doğru − Yanlış÷3</div>'
    +'<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:6px">📊 Son 14 Gün — Toplam Soru</div><div style="position:relative;height:170px"><canvas id="std-daily-bar" role="img" aria-label="Son 14 gün toplam soru grafiği"></canvas></div></div>'
    +goalRemainingCard();   // aylık hedef durumu en altta, ders başına pasta grafik
  setTimeout(function(){ drawStdDailyBar(); },50);
}

function selD(d){if(d>today()||d<START)return;selDate=d;expSubj=null;renderDaily();updateHdr();}
function tog(sid){expSubj=expSubj===sid?null:sid;renderDaily();}
function calPrev(){
  var p=parseYM(selDate.slice(0,7)),nm=p.m-1,ny=p.y;
  if(nm<0){nm=11;ny--;}
  if(ym(ny,nm)<START.slice(0,7))return;
  selDate=ds(ny,nm,1);renderDaily();
}
function calNext(){
  var p=parseYM(selDate.slice(0,7)),nm=p.m+1,ny=p.y;
  if(nm>11){nm=0;ny++;}
  var now=parseYM(ymNow());
  if(ny>now.y||(ny===now.y&&nm>now.m))return;
  selDate=ds(ny,nm,1);renderDaily();
}

// ═══════════════════════════════════════════════════════════════════
//  WEEKLY VIEW
// ═══════════════════════════════════════════════════════════════════
function renderWeekly(){
  var days=weekDays(selWeekStart),td=today();
  var ws=wstats(selWeekStart);
  var weekLabel=fmtD(selWeekStart)+" – "+fmtD(days[6]);

  // Day cards
  var dayCards='<div class="week-grid">';
  days.forEach(function(d,i){
    var st=dstats(d);
    var isOff=d>td||d<START;
    var isSel=d===selDate;
    var isTd=d===td;
    dayCards+='<div class="wday-card'+(isSel?" sel":"")+(isTd&&!isSel?" today-wk":"")+(isOff?" off":"")+'"'
      +(!isOff?' onclick="selD(\''+d+'\');gv(\'daily\')"':'')+'>'
      +'<div style="font-size:12px;font-weight:800;color:#767676;margin-bottom:4px">'+["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"][i]+'</div>'
      +'<div style="font-size:16px;font-weight:900;color:#333">'+parseInt(d.split("-")[2])+'</div>'
      +(st.total>0?'<div style="font-size:11px;font-weight:800;color:var(--p);margin-top:4px">'+st.total+'s</div>':'<div style="height:14px"></div>')
      +(st.total>0?'<div style="font-size:11px;font-weight:700;color:'+(st.net>=0?"#15803d":"#dc2626")+'">'+fnet(st.net)+'</div>':"")
      +'</div>';
  });
  dayCards+='</div>';

  // Weekly subject table
  var table='<div class="card"><div class="card-ttl" style="margin-bottom:10px">Ders Detayları</div>';
  SUBJ.forEach(function(s){
    var t=0,c=0,w=0;
    days.forEach(function(d){ var r=(recs[d]&&recs[d][s.id])||{}; t+=r.total||0; c+=r.correct||0; w+=cw(r.total||0,r.correct||0); });
    if(!t)return;
    var pct=parseFloat((c/t*100).toFixed(2)),n=calcNet(c,w);
    table+='<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6">'
      +'<div style="width:34px;height:34px;border-radius:10px;background:'+s.li+';display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">'+s.e+'</div>'
      +'<div style="flex:1"><div style="font-weight:800;font-size:14px;color:#222">'+s.n+'</div>'
      +'<div class="bar" style="margin-top:4px;height:7px"><div class="bg" style="width:'+pct+'%"></div><div class="br" style="width:'+(100-pct)+'%"></div></div></div>'
      +'<div style="text-align:right;min-width:70px">'
      +'<div style="font-size:12px;font-weight:700;color:#666">'+t+' soru</div>'
      +'<div style="font-size:13px;font-weight:900;color:'+(n>=0?"#15803d":"#dc2626")+'">'+fnet(n)+' net</div>'
      +'<div style="font-size:12px;font-weight:700;color:#767676">✓'+c+' ✗'+w+'</div>'
      +'</div></div>';
  });
  if(!ws.total) table+='<div class="empty" style="padding:20px"><div>Bu hafta veri yok</div></div>';
  table+='</div>';

  // Daily breakdown for the week
  var dayDetail='<div class="card"><div class="card-ttl" style="margin-bottom:10px">Günlük Özet</div>';
  days.forEach(function(d,i){
    var st=dstats(d);
    var isOff=d>td||d<START;
    if(isOff&&!st.total)return;
    dayDetail+='<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6;cursor:'+(isOff?'default':'pointer')+'" '
      +(!isOff?'onclick="selD(\''+d+'\');gv(\'daily\')"':'')+' >'
      +'<div style="min-width:38px;text-align:center">'
      +'<div style="font-size:12px;font-weight:800;color:#767676">'+["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"][i]+'</div>'
      +'<div style="font-size:15px;font-weight:900;color:'+(d===td?"var(--p)":"#333")+'">'+parseInt(d.split("-")[2])+'</div>'
      +'</div>'
      +(st.total>0
        ?'<div style="flex:1"><div class="bar" style="height:7px"><div class="bg" style="width:'+(st.total>0?Math.round((st.correct/st.total)*100):0)+'%"></div><div class="br" style="width:'+(st.total>0?Math.round((st.wrong/st.total)*100):0)+'%"></div></div></div>'
        +'<div style="text-align:right;min-width:80px"><span class="tag" style="color:#666;background:#f3f4f6">'+st.total+'s</span> <span style="font-size:12px;font-weight:900;color:'+(st.net>=0?"#15803d":"#dc2626")+'">'+fnet(st.net)+'</span></div>'
        :'<div style="flex:1;font-size:12px;color:#767676;font-weight:600">Veri yok</div>')
      +'</div>';
  });
  dayDetail+='</div>';

  document.getElementById("vw").innerHTML=
    '<div class="period-nav">'
    +'<button aria-label="Önceki" onclick="wkPrev()">‹</button>'
    +'<span style="font-size:14px">'+weekLabel+'</span>'
    +'<button aria-label="Sonraki" onclick="wkNext()">›</button></div>'
    +'<div class="sgrid3">'
    +sb("📋"+ws.total,"Toplam","#EEF2FF","var(--p)")
    +sb("✓"+ws.correct,"Doğru","#f0fdf4","#22c55e")
    +sb(fnet(ws.net),"Net","#F0FDF4","#16a34a")
    +'</div>'
    +dayCards+table+dayDetail
    +'<div class="card" style="margin-top:4px">'
    +'<div class="card-ttl">📊 Son 12 Hafta — Toplam Soru</div>'
    +'<div style="position:relative;height:200px"><canvas id="weekBarChart" role="img" aria-label="Son 12 hafta toplam soru grafiği"></canvas></div></div>'
    +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:10px">'
    +'<button class="btn-pdf" onclick="exportWeekPDF()">📄 PDF İndir</button>'
    +'</div>';
  setTimeout(function(){ drawWeekBarChart(); }, 50);
}


function drawWeekBarChart(){
  var el=document.getElementById('weekBarChart'); if(!el)return;
  destroyChart('weekBar');
  // Build last 12 weeks ending with selWeekStart (inclusive)
  var weeks=[];
  var ws2=selWeekStart;
  for(var i=0;i<12;i++){
    weeks.unshift(ws2);
    ws2=addDays(ws2,-7);
  }
  var labels=weeks.map(function(w){
    var d=w.split('-'); return d[2]+'/'+d[1];
  });
  var totals=weeks.map(function(w){ return wstats(w).total; });
  var corrects=weeks.map(function(w){ return wstats(w).correct; });
  var wrongs=weeks.map(function(w){ return wstats(w).wrong; });
  // Highlight current week
  var bgColors=totals.map(function(_,i){
    return i===11?'rgba(79,70,229,0.85)':'rgba(79,70,229,0.35)';
  });
  var borderColors=totals.map(function(_,i){
    return i===11?'rgba(79,70,229,1)':'rgba(79,70,229,0.5)';
  });
  _charts['weekBar']=new Chart(el,{
    type:'bar',
    data:{
      labels:labels,
      datasets:[
        {label:'Doğru',data:corrects,backgroundColor:'rgba(34,197,94,0.75)',borderColor:'rgba(34,197,94,1)',borderWidth:1,borderRadius:4,stack:'s'},
        {label:'Yanlış',data:wrongs,backgroundColor:'rgba(239,68,68,0.65)',borderColor:'rgba(239,68,68,1)',borderWidth:1,borderRadius:4,stack:'s'}
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{position:'bottom',labels:{font:{family:'Nunito',size:12},boxWidth:10,padding:8}},
        tooltip:{callbacks:{
          title:function(ctx){ return 'Hafta: '+ctx[0].label; },
          footer:function(ctx){
            var total=ctx.reduce(function(a,c){return a+c.parsed.y;},0);
            return 'Toplam: '+total;
          }
        }}
      },
      scales:{
        x:{grid:{display:false},ticks:{font:{family:'Nunito',size:11},maxRotation:0}},
        y:{grid:{color:'#f3f4f6'},ticks:{font:{family:'Nunito',size:11}},beginAtZero:true,stacked:true}
      }
    }
  });
}
function wkPrev(){
  var prev=addDays(selWeekStart,-7);
  if(prev<START)return;
  selWeekStart=prev; renderWeekly();
}
function wkNext(){
  var next=addDays(selWeekStart,7),td=today();
  if(next>weekStart(td))return;
  selWeekStart=next; renderWeekly();
}

// ═══════════════════════════════════════════════════════════════════
//  MONTHLY VIEW
// ═══════════════════════════════════════════════════════════════════
function renderMonthly(){
  var p=parseYM(selMonth),ms=mstats(selMonth);
  var html='<div class="period-nav">'
    +'<button aria-label="Önceki" onclick="mPrev()">‹</button><span>'+MONTHS[p.m]+' '+p.y+'</span><button aria-label="Sonraki" onclick="mNext()">›</button></div>'
    +'<div class="sgrid3">'
    +sb("📋"+ms.total,"Toplam","#EEF2FF","var(--p)")
    +sb("✓"+ms.correct,"Doğru","#f0fdf4","#22c55e")
    +sb(fnet(ms.net),"Net","#F0FDF4","#16a34a")
    +'</div>';

  SUBJ.forEach(function(s){
    var ss=mstats(selMonth,s.id);
    var gf=goalFor(effectiveGoals(selMonth),s.id), g={targetTotal:gf.t,targetAccuracy:gf.a};
    var ap=ss.total>0?parseFloat((ss.correct/ss.total*100).toFixed(2)):0;
    var tp=g.targetTotal>0?Math.min(100,Math.round((ss.total/g.targetTotal)*100)):null;
    html+='<div class="card" style="border:2px solid '+(ss.total>0?s.c+'44':"#f3f4f6")+'">'
      +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:'+(ss.total>0?12:0)+'px">'
      +'<div class="sicon" style="background:'+s.li+';width:40px;height:40px;border-radius:12px">'+s.e+'</div>'
      +'<div style="flex:1"><div style="font-weight:900;font-size:14px;color:#222">'+s.n+'</div>'
      +(ss.total>0
        ?'<div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap">'
          +'<span class="tag" style="color:#666;background:#f3f4f6">'+ss.total+' soru</span>'
          +'<span class="tag" style="color:#15803d;background:#f0fdf4">✓'+ss.correct+'</span>'
          +'<span class="tag" style="color:#dc2626;background:#fff5f5">✗'+ss.wrong+'</span>'
          +'<span class="tag" style="color:#4F46E5;background:#EEF2FF">'+fnet(ss.net)+' net</span></div>'
        :'<div style="font-size:12px;color:#767676;font-weight:600;margin-top:2px">Bu ay henüz veri yok</div>')
      +'</div>'+(ss.total>0?ring(ap,s.c,46):"")+'</div>';
    if(ss.total>0){
      if(tp!==null)html+='<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#666;margin-bottom:4px"><span>📋 '+ss.total+' / '+g.targetTotal+' soru</span><span style="color:'+(tp>=100?"#15803d":s.c)+'">%'+tp+'</span></div><div class="pbr"><div class="pfill" style="width:'+tp+'%;background:'+(tp>=100?"#22c55e":s.c)+'"></div></div></div>';
      var gAcc=g.targetAccuracy||0; if(gAcc>0){var ad=parseFloat((ap-gAcc).toFixed(2)); html+='<div><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:4px"><span style="color:#666">🎯 Doğruluk Hedefi %'+gAcc+'</span><span style="color:'+(ad>=0?"#15803d":"#dc2626")+'">'+(ad>=0?"+":"")+ad+' '+(ad>=0?"✓":"✗")+'</span></div><div class="pbr"><div class="pfill" style="width:'+Math.min(100,ap)+'%;background:'+(ap>=gAcc?"#22c55e":"var(--a)")+'"></div><div class="pmark" style="left:'+Math.min(100,gAcc)+'%"></div></div></div>';}
    }
    html+='</div>';
  });
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:6px">📊 Aylık Ders Soru Dağılımı</div><div style="position:relative;height:200px"><canvas id="std-monthly-bar" role="img" aria-label="Aylık ders soru dağılımı grafiği"></canvas></div></div>';
  html+='<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:10px">'
    +'<button class="btn-pdf" onclick="exportMonthPDF()">📄 PDF İndir</button></div>';
  document.getElementById("vw").innerHTML=html;
  setTimeout(function(){ drawStdMonthlyBar(); },50);
}
function mPrev(){var ms=availMonths(),i=ms.indexOf(selMonth);if(i>0){selMonth=ms[i-1];renderMonthly();}}
function mNext(){var ms=availMonths(),i=ms.indexOf(selMonth);if(i<ms.length-1){selMonth=ms[i+1];renderMonthly();}}

// ═══════════════════════════════════════════════════════════════════
//  İSTATİSTİK: AY SEÇİMİ İLE DERS BAZINDA DOĞRU / YANLIŞ
// ═══════════════════════════════════════════════════════════════════
var statsSelMonths = []; // boş = tüm aylar

function statsDataMonths(){
  return availMonths().filter(function(m){ return mstats(m).total>0; });
}
function toggleStatsMonth(m){
  var i=statsSelMonths.indexOf(m);
  if(i>=0) statsSelMonths.splice(i,1); else statsSelMonths.push(m);
  renderStats(); // üst kartlar, radar ve sıralama da seçime göre yenilenir
}
function setStatsMonths(list){ statsSelMonths=list; renderStats(); }

// Varsayılan seçim: içinde bulunulan ay; o ayda veri yoksa veri olan son ay
var statsInit = false;
function defaultMonthSel(all){
  var cur=ymNow();
  if(all.indexOf(cur)>=0) return [cur];
  return all.length?[all[all.length-1]]:[];
}

// Sayfanın en üstündeki ay-yıl seçim butonları
function statsMonthPicker(){
  var all=statsDataMonths();
  var sel=statsSelMonths.filter(function(m){ return all.indexOf(m)>=0; });
  return '<div class="card" style="padding:12px 14px"><div style="font-size:13px;font-weight:900;color:#333;margin-bottom:8px">🗓️ Ay Seçimi <span style="font-size:12px;color:#767676;font-weight:700">· aşağıdaki tüm özetler seçilen aylara göre</span></div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
    +'<button class="chart-tab'+(sel.length?'':' act')+'" onclick="setStatsMonths([])">Tümü</button>'
    +all.map(function(m){
      var p=parseYM(m);
      return '<button class="chart-tab'+(sel.indexOf(m)>=0?' act':'')+'" onclick="toggleStatsMonth(\''+m+'\')">'+MONTHS[p.m]+' '+p.y+'</button>';
    }).join("")+'</div></div>';
}
function refreshStatsMonthCard(){
  var el=document.getElementById("sm-card");
  if(el) el.outerHTML=statsMonthCard();
  drawSmCharts();
}
var smMetric = 'acc'; // acc | wrong | net
function setSmMetric(m){ smMetric=m; refreshStatsMonthCard(); }

// Seçili ayları (seçim yoksa veri olan tüm ayları) döndürür
function smUseMonths(){
  var all=statsDataMonths();
  var sel=statsSelMonths.filter(function(m){ return all.indexOf(m)>=0; });
  return sel.length?sel:all;
}
function smLabel(m){ var p=parseYM(m); return MONTHS[p.m].slice(0,3)+" "+String(p.y).slice(2); }

// Ders bazında doğru/yanlış oranı (yığılmış yatay çubuk) ve aylara göre değişim (çizgi) grafikleri.
// Siyah-beyaz baskıda ayırt edilebilsin diye çizgiler farklı desen ve işaretçi kullanır.
function drawSmCharts(){
  var use=smUseMonths();
  drawStackChart('sm-stack','smStack',use,mstats);
  drawTrendChart('sm-trend','smTrend',use,smMetric,mstats);
}

// Ders bazında doğru/yanlış oranı (yığılmış yatay çubuk). statFn(ay, dersId) -> {total,correct,wrong,net}
function drawStackChart(elId,key,use,statFn){
  destroyChart(key);
  var subs=SUBJ.map(function(sj){
    var t=0,c=0,w=0;
    use.forEach(function(m){ var x=statFn(m,sj.id); t+=x.total; c+=x.correct; w+=x.wrong; });
    return {sj:sj,t:t,c:c,w:w};
  }).filter(function(o){ return o.t>0; });
  var el=document.getElementById(elId);
  if(el&&subs.length){
    _charts[key]=new Chart(el,{
      type:'bar',
      data:{labels:subs.map(function(o){return o.sj.n;}),datasets:[
        {label:'Doğru %',data:subs.map(function(o){return parseFloat((o.c/o.t*100).toFixed(2));}),backgroundColor:'rgba(34,197,94,0.75)',borderColor:'#16a34a',borderWidth:1},
        {label:'Yanlış %',data:subs.map(function(o){return parseFloat((o.w/o.t*100).toFixed(2));}),backgroundColor:'rgba(239,68,68,0.7)',borderColor:'#dc2626',borderWidth:1}
      ]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'bottom',labels:{font:{family:'Nunito',size:12},boxWidth:10}},
          tooltip:{callbacks:{label:function(c){var o=subs[c.dataIndex];return c.dataset.label+': '+c.parsed.x+' ('+(c.datasetIndex===0?o.c:o.w)+' / '+o.t+' soru)';}}}},
        scales:{x:{stacked:true,min:0,max:100,ticks:{font:{family:'Nunito',size:11},callback:function(v){return v+'%';}},grid:{color:'#f3f4f6'}},
                y:{stacked:true,ticks:{font:{family:'Nunito',size:12}},grid:{display:false}}}}
    });
  }
}

// Metrik değeri: acc = doğruluk %, wrong = yanlış %, net = net. Veri yoksa null.
function metricVal(x,metric){
  if(!x.total) return null;
  if(metric==='acc') return parseFloat((x.correct/x.total*100).toFixed(2));
  if(metric==='wrong') return parseFloat((x.wrong/x.total*100).toFixed(2));
  return fnet(x.net);
}
var TREND_DASH=[[],[6,3],[2,2],[8,3,2,3],[],[6,3],[2,2]];
var TREND_PTS=['circle','rect','triangle','rectRot','star','cross','crossRot'];

// Dersler için aylara göre değişim çizgi grafiği. statFn(ay, dersId) -> {total,correct,wrong,net}
function drawTrendChart(elId,key,use,metric,statFn){
  destroyChart(key);
  var el=document.getElementById(elId);
  if(!el||use.length<2) return;
  var ds=SUBJ.map(function(sj,i){
    return {label:sj.n,data:use.map(function(m){return metricVal(statFn(m,sj.id),metric);}),
      borderColor:sj.c,backgroundColor:sj.c,borderWidth:2,borderDash:TREND_DASH[i],pointStyle:TREND_PTS[i],pointRadius:4,tension:0.25,spanGaps:true};
  }).filter(function(d){ return d.data.some(function(v){return v!==null;}); });
  _charts[key]=lineChart(el,use.map(smLabel),ds,metric);
}
function lineChart(el,labels,ds,metric){
  var yTitle=metric==='acc'?'Doğruluk %':metric==='wrong'?'Yanlış %':'Net';
  return new Chart(el,{
    type:'line',
    data:{labels:labels,datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{position:'bottom',labels:{font:{family:'Nunito',size:12},boxWidth:14,usePointStyle:true}}},
      scales:{x:{grid:{display:false},ticks:{font:{family:'Nunito',size:11}}},
              y:{grid:{color:'#f3f4f6'},ticks:{font:{family:'Nunito',size:11}},title:{display:true,text:yTitle,font:{size:11}},beginAtZero:metric!=='acc'}}}
  });
}
// Seçili ayların kısa etiketi (seçim yoksa "Tüm aylar")
function statsSelLabel(){
  var all=statsDataMonths();
  var sel=statsSelMonths.filter(function(m){ return all.indexOf(m)>=0; });
  return sel.length?sel.map(smLabel).join(", "):"Tüm aylar";
}
// ═══════════════════════════════════════════════════════════════════
//  GENEL DENEME: ders bazlı doğru/yanlış, ders netleri ve tahmini LGS puanı
//  Her dersin 1 netinin 2026 LGS'de kaç puan getirdiği (kullanıcının paylaştığı 2026 LGS görseli):
//  Türkçe 4,18; Matematik 4,98; Fen Bilimleri 3,83; İnkılap Tarihi 1,68; Din Kültürü 1,93; İngilizce 1,62.
//  Soru sayıları: Türkçe, Matematik, Fen 20; İnkılap, Din, İngilizce 10 (toplam 90).
//  Tahmini puan = taban + toplam(ders neti x ders net puanı). Taban, 90 net = 500 puan olacak şekilde
//  hesaplanır (500 - toplam(soru sayısı x net puanı) = 187,9).
//  Bu değerler sınav yılına göre değişir; resmi puan her yıl standart puan yöntemiyle belirlenir. Ekranda "yaklaşık" yazar.
//  Yeni yılın değerleri için yalnızca p alanları ve LGS_PUAN_YILI güncellenir.
// ═══════════════════════════════════════════════════════════════════
var LGS_PUAN_YILI=2026;
var LGS_DERSLER=[
  {id:"turkce",n:"Türkçe",s:"Tür",p:4.18,q:20},
  {id:"matematik",n:"Matematik",s:"Mat",p:4.98,q:20},
  {id:"fen",n:"Fen Bilimleri",s:"Fen",p:3.83,q:20},
  {id:"sosyal",n:"İnkılap Tarihi",s:"İnk",p:1.68,q:10},
  {id:"din",n:"Din Kültürü",s:"Din",p:1.93,q:10},
  {id:"ingilizce",n:"İngilizce",s:"İng",p:1.62,q:10}
];
var LGS_TABAN=Math.round((500-LGS_DERSLER.reduce(function(a,s){ return a+s.q*s.p; },0))*100)/100;
var denemeler={}, denemeRef=null, denemeListener=null, denemeErr=false;

// d: {turkce:{c:doğru,w:yanlış},...}. Boş soru ayrıca tutulmaz (net hesabını etkilemez)
function denemeSonuc(d){
  var nets={}, total=0, puan=LGS_TABAN;
  LGS_DERSLER.forEach(function(s){
    var x=(d&&d[s.id])||{}, net=calcNet(x.c||0,x.w||0);
    nets[s.id]=net; total+=net; puan+=net*s.p;
  });
  return {nets:nets,total:total,puan:Math.round(Math.max(100,Math.min(500,puan)))};
}
function escHtml(x){
  return String(x==null?"":x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
// Bir günün tüm denemelerinin toplamı günlük "Genel Deneme" kaydına yazılır (soru: doğru+yanlış, doğru: doğru)
function syncDenemeDaily(date){
  var tot=0, cor=0;
  Object.keys(denemeler).forEach(function(k){
    var r=denemeler[k]; if(!r||r.date!==date) return;
    LGS_DERSLER.forEach(function(s){ var x=r.d&&r.d[s.id]; if(x){ tot+=(x.c||0)+(x.w||0); cor+=(x.c||0); } });
  });
  var ref=recRef.child(date).child("deneme");
  if(tot>0){ if(!recs[date]) recs[date]={}; recs[date].deneme={total:tot,correct:cor}; return ref.set({total:tot,correct:cor}); }
  if(recs[date]) delete recs[date].deneme;
  return ref.remove();
}

var _dnEditId=null;
function closeDenemeForm(){
  var el=document.getElementById("dn-pop"); if(el&&el.parentNode) el.parentNode.removeChild(el);
}
function dnInputVals(){
  var out={}, err="";
  LGS_DERSLER.forEach(function(s){
    var c=document.getElementById("dn-c-"+s.id).value, w=document.getElementById("dn-w-"+s.id).value;
    var ci=c===""?0:parseInt(c,10), wi=w===""?0:parseInt(w,10);
    if(isNaN(ci)||isNaN(wi)||ci<0||wi<0){ err="Sayılar 0 ya da daha büyük tam sayı olmalı."; }
    else if(ci+wi>s.q){ err=s.n+": doğru ve yanlış toplamı "+s.q+" soruyu geçemez."; }
    out[s.id]={c:Math.max(0,ci||0),w:Math.max(0,wi||0)};
  });
  return {d:out,err:err};
}
function updateDenemePreview(){
  var v=dnInputVals(), r=denemeSonuc(v.d);
  var el=document.getElementById("dn-preview"), er=document.getElementById("dn-err");
  if(er) er.textContent=v.err;
  if(el) el.innerHTML='<b>Toplam net: '+fnet(r.total)+' / 90</b>'
    +'<br><span style="color:var(--p);font-weight:900">≈ '+r.puan+' puan</span> <span style="color:#666">(yaklaşık)</span>';
}
function openDenemeForm(id){
  if(!curStudent||READONLY||_teacherMode) return;
  closeDenemeForm();
  _dnEditId=id||null;
  var ex=id?denemeler[id]:null;
  var date=ex?ex.date:(selDate<=today()?selDate:today());
  var inp='width:100%;padding:8px 4px;border-radius:10px;border:2px solid #e5e7eb;text-align:center;font-size:16px;font-weight:800;font-family:Nunito,sans-serif';
  var rows=LGS_DERSLER.map(function(s){
    var x=(ex&&ex.d&&ex.d[s.id])||null;
    return '<div style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;align-items:center;margin-bottom:6px">'
      +'<div style="font-size:13px;font-weight:800;color:#333;text-align:left">'+s.n+' <span style="color:#666;font-weight:700">('+s.q+')</span></div>'
      +'<input id="dn-c-'+s.id+'" type="number" inputmode="numeric" min="0" max="'+s.q+'" aria-label="'+s.n+' doğru" placeholder="Doğru" value="'+(x?x.c:"")+'" oninput="updateDenemePreview()" style="'+inp+';border-color:#86c99a">'
      +'<input id="dn-w-'+s.id+'" type="number" inputmode="numeric" min="0" max="'+s.q+'" aria-label="'+s.n+' yanlış" placeholder="Yanlış" value="'+(x?x.w:"")+'" oninput="updateDenemePreview()" style="'+inp+';border-color:#f0a0a0">'
      +'</div>';
  }).join("");
  var pop=document.createElement("div");
  pop.id="dn-pop"; pop.setAttribute("role","dialog"); pop.setAttribute("aria-modal","true"); pop.setAttribute("aria-label","Deneme sonucu");
  pop.style.cssText="position:fixed;inset:0;background:#0007;z-index:998;display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto";
  pop.innerHTML='<div style="background:white;border-radius:22px;padding:20px 16px;max-width:380px;width:100%;box-shadow:0 20px 60px #0004;margin:auto">'
    +'<div style="font-size:16px;font-weight:900;color:#222;margin-bottom:10px">📝 '+(id?"Deneme sonucunu düzenle":"Deneme sonucu ekle")+'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:6px;margin-bottom:10px">'
    +'<input id="dn-date" type="date" min="'+START+'" max="'+today()+'" value="'+date+'" aria-label="Deneme tarihi" style="'+inp+';font-size:14px">'
    +'<input id="dn-name" type="text" maxlength="60" placeholder="Deneme adı (isteğe bağlı)" aria-label="Deneme adı" value="'+escHtml(ex&&ex.name)+'" style="'+inp+';font-size:13px;font-weight:700">'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;font-size:12px;font-weight:800;color:#666;margin-bottom:4px"><div></div><div style="text-align:center;color:#15803d">Doğru</div><div style="text-align:center;color:#dc2626">Yanlış</div></div>'
    +rows
    +'<div id="dn-preview" style="background:#EEF2FF;border-radius:12px;padding:10px;font-size:13px;font-weight:700;color:#333;margin-top:8px;text-align:center"></div>'
    +'<div id="dn-err" role="alert" style="font-size:12px;font-weight:800;color:#dc2626;min-height:16px;margin-top:6px;text-align:center"></div>'
    +'<div style="font-size:11px;color:#666;font-weight:700;margin:4px 0 10px">Boş sorular yazılmaz, net hesabını etkilemez. Kaydedince o günün "Genel Deneme" toplamı otomatik güncellenir. Puan, '+LGS_PUAN_YILI+' LGS net puanlarıyla yapılan yaklaşık bir tahmindir.</div>'
    +'<div style="display:flex;gap:8px"><button onclick="closeDenemeForm()" style="flex:1;padding:12px;border-radius:12px;border:2px solid #e5e7eb;background:white;font-size:13px;font-weight:800;color:#666;font-family:Nunito,sans-serif;cursor:pointer">İptal</button>'
    +'<button id="dn-save" onclick="saveDeneme()" style="flex:2;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,var(--p),var(--v));color:white;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer">💾 Kaydet</button></div></div>';
  document.body.appendChild(pop);
  updateDenemePreview();
}
function saveDeneme(){
  if(!curStudent||READONLY||_teacherMode||!denemeRef) return;
  var v=dnInputVals(), er=document.getElementById("dn-err");
  var date=document.getElementById("dn-date").value, name=document.getElementById("dn-name").value.trim().slice(0,60);
  var any=LGS_DERSLER.some(function(s){ return v.d[s.id].c+v.d[s.id].w>0; });
  if(v.err){ er.textContent=v.err; return; }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<START||date>today()){ er.textContent="Geçerli bir tarih seçin."; return; }
  if(!any){ er.textContent="En az bir derse doğru ya da yanlış sayısı girin."; return; }
  var btn=document.getElementById("dn-save"); btn.disabled=true; btn.textContent="⏳ Kaydediliyor...";
  var rec={date:date,d:v.d}; if(name) rec.name=name;
  var oldDate=_dnEditId&&denemeler[_dnEditId]?denemeler[_dnEditId].date:null;
  var ref=_dnEditId?denemeRef.child(_dnEditId):denemeRef.push();
  ref.set(rec).then(function(){
    denemeler[ref.key]=rec;
    var jobs=[syncDenemeDaily(date)];
    if(oldDate&&oldDate!==date) jobs.push(syncDenemeDaily(oldDate));
    return Promise.all(jobs);
  }).then(function(){
    closeDenemeForm(); render();
  }).catch(function(e){
    btn.disabled=false; btn.textContent="💾 Kaydet";
    er.textContent="Kaydedilemedi"+((e&&e.code==="PERMISSION_DENIED")?": izin yok. Firebase kuralları 'denemeler' yolunu içermiyor olabilir (firebase/KURULUM.md).":".");
  });
}
function deleteDeneme(id){
  var r=denemeler[id]; if(!r||READONLY||_teacherMode) return;
  if(!confirm(fmtD(r.date)+" tarihli deneme sonucu silinsin mi?")) return;
  denemeRef.child(id).remove().then(function(){
    delete denemeler[id];
    return syncDenemeDaily(r.date);
  }).then(function(){ render(); }).catch(function(){ alert("Silinemedi."); });
}

// İstatistik sayfası: seçili aylardaki deneme sonuçları, ders netleri ve tahmini puan
function statsDenemeCard(){
  var use=smUseMonths(), edit=!READONLY&&!_teacherMode;
  var list=Object.keys(denemeler).map(function(k){ return {id:k,r:denemeler[k]}; })
    .filter(function(x){ return x.r&&x.r.date&&use.indexOf(x.r.date.slice(0,7))>=0; })
    .sort(function(a,b){ return a.r.date<b.r.date?1:a.r.date>b.r.date?-1:0; });
  var head='<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div class="card-ttl" style="margin:0;flex:1">📝 Deneme Sonuçları <span style="font-size:12px;color:#666;font-weight:700">· '+statsSelLabel()+'</span></div>'
    +(edit?'<button onclick="openDenemeForm()" style="padding:8px 12px;border-radius:10px;border:none;background:var(--p);color:white;font-size:12px;font-weight:800;cursor:pointer;font-family:Nunito,sans-serif">➕ Ekle</button>':'')+'</div>';
  if(denemeErr) return head+'<div style="font-size:12px;color:#dc2626;font-weight:700;padding:8px 0">Deneme sonuçları okunamadı (Firebase kuralları güncellenmemiş olabilir).</div></div>';
  if(!list.length) return head+'<div style="font-size:12px;color:#666;font-weight:700;padding:8px 0">Seçili aylarda ders bazlı deneme sonucu yok.'+(edit?' "Ekle" ile ilk denemeni girebilirsin.':'')+'</div></div>';
  var rows=list.map(function(x){
    var r=x.r, s=denemeSonuc(r.d);
    var chips=LGS_DERSLER.map(function(d){
      var n=s.nets[d.id];
      return '<span style="display:inline-block;background:#f3f4f6;border-radius:8px;padding:3px 7px;font-size:11px;font-weight:800;color:#333;margin:0 4px 4px 0">'+d.s+' <span style="color:'+(n>=0?"#15803d":"#dc2626")+'">'+fnet(n)+'</span></span>';
    }).join("");
    return '<div style="padding:10px 0;border-bottom:1px solid #f3f4f6">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="flex:1;font-size:13px;font-weight:900;color:#333">'+fmtD(r.date)+(r.name?' <span style="color:#666;font-weight:700">· '+escHtml(r.name)+'</span>':'')+'</div>'
      +'<div style="font-size:14px;font-weight:900;color:var(--p)">≈ '+s.puan+'</div></div>'
      +'<div style="font-size:12px;font-weight:700;color:#666;margin-bottom:4px">Toplam net <b style="color:#333">'+fnet(s.total)+'</b> / 90</div>'
      +'<div>'+chips+'</div>'
      +(edit?'<div style="display:flex;gap:6px;margin-top:2px"><button onclick="openDenemeForm(\''+x.id+'\')" style="padding:5px 10px;border-radius:8px;border:2px solid #e5e7eb;background:white;font-size:11px;font-weight:800;color:#555;cursor:pointer;font-family:Nunito,sans-serif">Düzenle</button>'
        +'<button onclick="deleteDeneme(\''+x.id+'\')" style="padding:5px 10px;border-radius:8px;border:2px solid #fecaca;background:white;font-size:11px;font-weight:800;color:#dc2626;cursor:pointer;font-family:Nunito,sans-serif">Sil</button></div>':'')
      +'</div>';
  }).join("");
  var chart=list.length>1?'<div style="font-size:12px;font-weight:800;color:#666;margin:12px 0 6px">Gelişim: toplam net ve tahmini puan</div><div style="position:relative;height:220px"><canvas id="dn-trend" role="img" aria-label="Deneme toplam net ve tahmini puan grafiği"></canvas></div>':"";
  return head+rows+chart
    +'<div style="font-size:11px;color:#666;font-weight:700;margin-top:8px">Net = Doğru − Yanlış ÷ 3. ≈ puan, '+LGS_PUAN_YILI+' LGS\'de 1 netin ders başına puan getirisiyle hesaplanır: '+LGS_DERSLER.map(function(d){ return d.n+' '+String(d.p).replace(".",","); }).join(", ")+' (90 net = 500 puan olacak şekilde). Resmi puan her yıl sınavın dağılımına göre değişir, bu yalnızca bir tahmindir.</div></div>';
}
function drawDenemeChart(){
  destroyChart("dn");
  var el=document.getElementById("dn-trend"); if(!el) return;
  var use=smUseMonths();
  var list=Object.keys(denemeler).map(function(k){ return denemeler[k]; })
    .filter(function(r){ return r&&r.date&&use.indexOf(r.date.slice(0,7))>=0; })
    .sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
  if(list.length<2) return;
  var res=list.map(function(r){ return denemeSonuc(r.d); });
  _charts["dn"]=new Chart(el,{
    type:"line",
    data:{labels:list.map(function(r){ return shortD(r.date).slice(0,5); }),datasets:[
      {label:"Toplam net",data:res.map(function(s){ return fnet(s.total); }),borderColor:"#4F46E5",backgroundColor:"#4F46E5",borderWidth:2.5,pointStyle:"circle",pointRadius:5,tension:0.2,yAxisID:"y"},
      {label:"Tahmini puan",data:res.map(function(s){ return s.puan; }),borderColor:"#d97706",backgroundColor:"#d97706",borderWidth:2.5,borderDash:[6,3],pointStyle:"rect",pointRadius:5,tension:0.2,yAxisID:"y2"}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
      plugins:{legend:{position:"bottom",labels:{font:{family:"Nunito",size:12},boxWidth:14,usePointStyle:true}}},
      scales:{x:{grid:{display:false},ticks:{font:{family:"Nunito",size:11}}},
        y:{beginAtZero:true,max:90,grid:{color:"#f3f4f6"},ticks:{font:{family:"Nunito",size:11}},title:{display:true,text:"Net",font:{size:11}}},
        y2:{position:"right",min:100,max:500,grid:{display:false},ticks:{font:{family:"Nunito",size:11}},title:{display:true,text:"Puan",font:{size:11}}}}}
  });
}

// ── Rekorlar: en yüksek günlük soru sayısı (ders bazında ve günlük toplam) ──
function shortD(d){ var p=d.split("-"); return p[2]+"/"+p[1]+"/"+p[0].slice(2); }
// monthsFilter: ay listesi (null ise tüm zamanlar). Dönüş: {value, date} (eşitlikte en erken gün)
function bestDay(r,sid,monthsFilter){
  var best={value:0,date:null};
  Object.keys(r).sort().forEach(function(d){
    if(d<START) return;
    if(monthsFilter&&monthsFilter.indexOf(d.slice(0,7))<0) return;
    var v=dayCount(r,d,sid);
    if(v>best.value){ best.value=v; best.date=d; }
  });
  return best;
}
function statsRecordsCard(){
  var use=smUseMonths();
  var items=SUBJ.map(function(s){ return {sid:s.id,label:s.e+" "+s.n}; });
  items.push({sid:null,label:"📚 Günlük toplam"});
  var rows="", any=false;
  items.forEach(function(it){
    var sel=bestDay(recs,it.sid,use), all=bestDay(recs,it.sid,null);
    if(!all.value) return;
    any=true;
    var inSel=sel.value>0&&sel.value===all.value;   // tüm zamanların rekoru seçili aylarda kırılmış
    rows+='<div style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6">'
      +'<div style="font-size:13px;font-weight:800;color:#333">'+it.label+'</div>'
      +'<div style="text-align:center">'+(sel.value
        ?'<div style="font-size:14px;font-weight:900;color:var(--p)">'+sel.value+'</div><div style="font-size:11px;color:#767676;font-weight:700">'+shortD(sel.date)+'</div>'
        :'<div style="font-size:12px;color:#767676">—</div>')+'</div>'
      +'<div style="text-align:center"><div style="font-size:14px;font-weight:900;color:#b45309">'+(inSel?"🏆 ":"")+all.value+'</div><div style="font-size:11px;color:#767676;font-weight:700">'+shortD(all.date)+'</div></div>'
      +'</div>';
  });
  if(!any) return "";
  // Seçili her ay için günlük toplam rekoru
  var perMonth="";
  if(use.length>1){
    perMonth='<div style="font-size:12px;font-weight:800;color:#666;margin:12px 0 6px">Aylık günlük toplam rekorları</div><div style="display:flex;gap:6px;flex-wrap:wrap">'
      +use.map(function(m){
        var b=bestDay(recs,null,[m]); if(!b.value) return "";
        return '<div style="background:#EEF2FF;border-radius:10px;padding:6px 10px;text-align:center"><div style="font-size:12px;font-weight:800;color:var(--p)">'+smLabel(m)+'</div>'
          +'<div style="font-size:14px;font-weight:900;color:#222">'+b.value+'</div><div style="font-size:11px;color:#767676;font-weight:700">'+shortD(b.date)+'</div></div>';
      }).join("")+'</div>';
  }
  return '<div class="card"><div class="card-ttl" style="margin-bottom:4px">🏅 Rekorlar <span style="font-size:12px;color:#767676;font-weight:700">· '+statsSelLabel()+'</span></div>'
    +'<div style="font-size:12px;color:#767676;font-weight:700;margin-bottom:8px">En yüksek günlük soru sayısı</div>'
    +'<div style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;font-size:12px;font-weight:800;color:#767676;padding-bottom:4px;border-bottom:2px solid #f3f4f6">'
    +'<div></div><div style="text-align:center">Seçili aylar</div><div style="text-align:center">Tüm zamanlar</div></div>'
    +rows
    +'<div style="font-size:12px;color:#767676;font-weight:700;margin-top:6px">🏆 tüm zamanların rekoru seçili aylarda kırılmış</div>'
    +perMonth+'</div>';
}

function statsMonthCard(){
  var all=statsDataMonths();
  var sel=statsSelMonths.filter(function(m){ return all.indexOf(m)>=0; });
  var use=sel.length?sel:all;
  var rows="", gt=0, gc=0, gw=0;
  SUBJ.forEach(function(sj){
    var t=0,c=0,w=0,series=[];
    use.forEach(function(m){
      var x=mstats(m,sj.id); t+=x.total; c+=x.correct; w+=x.wrong;
      if(x.total>0) series.push(x.correct/x.total*100);
    });
    if(!t) return;
    gt+=t; gc+=c; gw+=w;
    var pct=parseFloat((c/t*100).toFixed(2)), n=calcNet(c,w);
    // Değişim: seçilen aylardaki ilk ve son veri olan ayın doğruluk farkı (yüzde puan)
    var dl="";
    if(series.length>1){
      var dv=parseFloat((series[series.length-1]-series[0]).toFixed(2));
      dl='<span style="font-size:12px;font-weight:900;color:'+(dv>0?"#15803d":dv<0?"#dc2626":"#666")+'">'+(dv>0?"▲ +":dv<0?"▼ ":"= ")+dv+' puan</span>';
    }
    rows+='<div style="padding:10px 0;border-bottom:1px solid #f3f4f6">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
      +'<span style="font-size:18px">'+sj.e+'</span>'
      +'<span style="flex:1;font-weight:800;font-size:14px;color:#333">'+sj.n+' '+dl+'</span>'
      +'<span style="font-size:13px;font-weight:900;color:'+(n>=0?"#15803d":"#dc2626")+'">Net '+fnet(n)+'</span></div>'
      +'<div class="bar" style="height:8px"><div class="bg" style="width:'+pct+'%"></div><div class="br" style="width:'+(100-pct)+'%"></div></div>'
      +'<div style="display:flex;gap:10px;margin-top:4px;font-size:12px;font-weight:700;flex-wrap:wrap">'
      +'<span style="color:#666">📋'+t+'</span>'
      +'<span style="color:#15803d">✓'+c+'</span>'
      +'<span style="color:#dc2626">✗'+w+'</span>'
      +'<span style="color:'+sj.d+'">%'+pct+'</span></div></div>';
  });
  var gpct=gt>0?parseFloat((gc/gt*100).toFixed(2)):0, gn=calcNet(gc,gw);
  var label=statsSelLabel();
  return '<div class="card" id="sm-card">'
    +'<div class="card-ttl" style="margin-bottom:8px">📚 Ders İstatistiği <span style="font-size:12px;color:#767676;font-weight:700">· '+label+'</span></div>'
    +(gt>0
      ?'<div style="background:#EEF2FF;border-radius:12px;padding:10px 12px;margin-bottom:6px">'
        +'<div style="font-size:12px;font-weight:800;color:var(--p);margin-bottom:4px">SEÇİLİ AYLARIN TOPLAMI</div>'
        +'<div style="display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;font-size:14px;font-weight:900">'
        +'<span style="color:#555">📋 '+gt+' soru</span><span style="color:#15803d">✓ '+gc+'</span><span style="color:#dc2626">✗ '+gw+'</span>'
        +'<span style="color:#555">%'+gpct+'</span><span style="color:var(--p)">Net '+fnet(gn)+'</span></div></div>'
        +rows
        +'<div style="font-size:12px;color:#767676;font-weight:700;margin-top:6px">▲▼ ilk ve son veri olan ay arasındaki doğruluk değişimi (yüzde puan)</div>'
        +'<div class="card-ttl" style="font-size:14px;margin:16px 0 6px">📊 Ders Bazında Doğru / Yanlış Oranı</div>'
        +'<div style="position:relative;height:'+(60+SUBJ.length*30)+'px"><canvas id="sm-stack" role="img" aria-label="Ders bazında doğru ve yanlış oranı grafiği"></canvas></div>'
        +'<div class="card-ttl" style="font-size:14px;margin:16px 0 6px">📈 Aylara Göre Değişim</div>'
        +'<div style="display:flex;gap:6px;margin-bottom:8px">'
        +[['acc','Doğruluk %'],['wrong','Yanlış %'],['net','Net']].map(function(o){
          return '<button class="chart-tab'+(smMetric===o[0]?' act':'')+'" onclick="setSmMetric(\''+o[0]+'\')">'+o[1]+'</button>';
        }).join("")+'</div>'
        +(use.length>1
          ?'<div style="position:relative;height:260px"><canvas id="sm-trend" role="img" aria-label="Aylara göre ders değişim grafiği"></canvas></div>'
          :'<div style="font-size:13px;color:#767676;font-weight:700;padding:14px 0">Değişim grafiği için en az 2 ay gerekir. Ay seçimini genişletin.</div>')
        +'<div style="font-size:12px;color:#767676;font-weight:700;margin-top:8px">Net = Doğru − Yanlış ÷ '+NET_DIVISOR+' (3 yanlış 1 doğruyu götürür)</div>'
      :'<div class="empty" style="padding:16px"><div>Seçilen aylarda veri yok</div></div>')
    +'</div>';
}

// ═══════════════════════════════════════════════════════════════════
//  STATS VIEW
// ═══════════════════════════════════════════════════════════════════
function renderStats(){
  // Üst kartlar, radar ve sıralama seçili aylara göre hesaplanır (seçim yoksa tüm aylar)
  if(!statsInit){ statsSelMonths=defaultMonthSel(statsDataMonths()); statsInit=true; }
  var selUse=smUseMonths();
  var allDays=Object.keys(recs).filter(function(d){return d>=START&&selUse.indexOf(d.slice(0,7))>=0;}).sort();
  var sat=SUBJ.map(function(s){
    var t=allDays.reduce(function(a,d){return a+((recs[d]&&recs[d][s.id]&&recs[d][s.id].total)||0);},0);
    var c2=allDays.reduce(function(a,d){return a+((recs[d]&&recs[d][s.id]&&recs[d][s.id].correct)||0);},0);
    var w=cw(t,c2);
    return {id:s.id,n:s.n,e:s.e,c:s.c,bg:s.bg,li:s.li,total:t,correct:c2,wrong:w,net:calcNet(c2,w)};
  });
  var gt=sat.reduce(function(a,s){return a+s.total;},0);
  var gc=sat.reduce(function(a,s){return a+s.correct;},0);
  var gw=sat.reduce(function(a,s){return a+s.wrong;},0);
  var gn=calcNet(gc,gw),gap=gt>0?parseFloat((gc/gt*100).toFixed(2)):0;
  var active=allDays.filter(function(d){return dstats(d).total>0;}).length;
  var maxT=Math.max.apply(null,sat.map(function(s){return s.total;}).concat([1]));

  // Monthly data for line chart
  var activeMonths=availMonths().filter(function(ym){return mstats(ym).total>0;});

  // Ranking HTML
  var rnk="";
  sat.slice().sort(function(a,b){return b.total-a.total;}).forEach(function(s,i){
    var ap=s.total>0?parseFloat((s.correct/s.total*100).toFixed(2)):0;
    rnk+='<div style="margin-bottom:14px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
      +'<span style="font-size:16px;min-width:26px">'+(i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+".")+'</span>'
      +'<span style="font-size:18px">'+s.e+'</span>'
      +'<span style="flex:1;font-weight:800;font-size:14px;color:#333">'+s.n+'</span>'
      +ring(ap,s.c,44)
      +'<div style="text-align:right;min-width:60px">'
      +'<div style="font-size:13px;font-weight:900;color:'+s.d+'">'+s.total+'s</div>'
      +'<div style="font-size:12px;font-weight:800;color:'+(s.net>=0?"#15803d":"#dc2626")+'">'+fnet(s.net)+' net</div>'
      +'</div></div>'
      +'<div class="bar"><div class="bg" style="width:'+(s.total>0?(s.correct/maxT)*100:0)+'%"></div>'
      +'<div class="br" style="width:'+(s.total>0?(s.wrong/maxT)*100:0)+'%"></div>'
      +'<div style="flex:1;background:#e5e7eb"></div></div>'
      +'<div style="display:flex;gap:10px;margin-top:3px;font-size:12px;font-weight:700">'
      +'<span style="color:#15803d">✓'+s.correct+' (%'+ap+')</span>'
      +'<span style="color:#dc2626">✗'+s.wrong+'</span>'
      +'<span style="color:var(--p)">Net:'+fnet(s.net)+'</span>'
      +'</div></div>';
  });

  // Monthly summary rows
  var mrows="";
  availMonths().slice().reverse().forEach(function(ymStr){
    var ms=mstats(ymStr),p2=parseYM(ymStr);
    if(!ms.total)return;
    mrows+='<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f3f4f6">'
      +'<div style="min-width:76px;font-weight:800;font-size:14px;color:var(--p)">'+MONTHS[p2.m]+' '+p2.y+'</div>'
      +'<div style="flex:1;display:flex;gap:5px;flex-wrap:wrap">'
      +'<span class="tag" style="color:var(--p);background:#EEF2FF">📋'+ms.total+'</span>'
      +'<span class="tag" style="color:#15803d;background:#f0fdf4">✓'+ms.correct+'</span>'
      +'<span class="tag" style="color:#dc2626;background:#fff5f5">✗'+ms.wrong+'</span>'
      +'</div>'
      +'<div style="font-size:13px;font-weight:900;color:'+(ms.net>=0?"#15803d":"#dc2626")+';min-width:56px;text-align:right">'+fnet(ms.net)+' net</div>'
      +'</div>';
  });

  document.getElementById("vw").innerHTML=
    // Ay-yıl seçimi + seçili aylara göre üst özet kartları
    statsMonthPicker()
    +'<div style="font-size:12px;font-weight:800;color:#767676;margin:0 2px 6px">'+statsSelLabel()+'</div>'
    +'<div class="sgrid2">'
    +'<div style="background:linear-gradient(135deg,var(--p),var(--v));border-radius:18px;padding:16px;color:white;box-shadow:0 4px 20px #4F46E544"><div style="font-size:12px;opacity:.75;margin-bottom:4px">Toplam Soru</div><div style="font-size:34px;font-weight:900">'+gt+'</div></div>'
    +'<div style="background:linear-gradient(135deg,var(--a),#d97706);border-radius:18px;padding:16px;color:white;box-shadow:0 4px 20px #f59e0b44"><div style="font-size:12px;opacity:.75;margin-bottom:4px">Aktif Gün</div><div style="font-size:34px;font-weight:900">'+active+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:18px;padding:16px;color:white;box-shadow:0 4px 20px #22c55e44"><div style="font-size:12px;opacity:.75;margin-bottom:4px">Toplam Doğru</div><div style="font-size:34px;font-weight:900">'+gc+'</div>'+(gt>0?'<div style="font-size:13px;opacity:.85">%'+Math.round((gc/gt)*100)+'</div>':"")+'</div>'
    +'<div style="background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:18px;padding:16px;color:white;box-shadow:0 4px 20px #ef444444"><div style="font-size:12px;opacity:.75;margin-bottom:4px">Toplam Yanlış</div><div style="font-size:34px;font-weight:900">'+gw+'</div>'+(gt>0?'<div style="font-size:13px;opacity:.85">%'+Math.round((gw/gt)*100)+'</div>':"")+'</div>'
    +'</div>'
    // Net score card
    +'<div class="card" style="display:flex;align-items:center;gap:16px">'
    +'<div style="flex:1"><div style="font-size:14px;color:#666;font-weight:700">Genel Net Puan</div>'
    +'<div style="font-size:34px;font-weight:900;color:var(--p)">'+fnet(gn)+'</div>'
    +'<div style="font-size:12px;color:#767676;font-weight:700;margin-top:2px">= Doğru − Yanlış÷3</div></div>'
    +ring(gap,"var(--p)",70)+'</div>'
    +statsMonthCard()
    +statsRecordsCard()
    +statsDenemeCard()
    // Radar chart (all subjects except Deneme)
    +(gt>0?'<div class="card"><div class="card-ttl">🕸️ Ders Radar Analizi <span style="font-size:12px;color:#767676;font-weight:600">(Deneme hariç · '+statsSelLabel()+')</span></div><div style="position:relative;height:280px"><canvas id="radarChart" role="img" aria-label="Ders doğruluk radar grafiği"></canvas></div></div>':"")
    // Monthly line chart
    +(activeMonths.length>1?'<div class="card"><div class="card-ttl">📈 Aylık Net Gelişim</div><div class="chart-tabs" style="display:flex;gap:6px;margin-bottom:10px">'
      +'<button class="chart-tab act" onclick="switchLineChart(this,\'net\')">Net</button>'
      +'<button class="chart-tab" onclick="switchLineChart(this,\'total\')">Toplam Soru</button>'
      +'<button class="chart-tab" onclick="switchLineChart(this,\'acc\')">Doğruluk %</button>'
      +'</div><div style="position:relative;height:220px"><canvas id="lineChart" role="img" aria-label="Aylık gelişim grafiği"></canvas></div></div>':"")
    // Subject line chart per-month
    +(activeMonths.length>1?'<div class="card"><div class="card-ttl">📊 Aylık Ders Net Karşılaştırması</div><div style="position:relative;height:260px"><canvas id="subjectLineChart" role="img" aria-label="Aylık ders net karşılaştırma grafiği"></canvas></div></div>':"")
    // Rankings
    +'<div class="card"><div class="card-ttl">🏆 Ders Sıralaması <span style="font-size:12px;color:#767676;font-weight:600">('+statsSelLabel()+')</span></div>'+(gt>0?rnk:'<div class="empty"><div style="font-size:44px;margin-bottom:10px">📭</div><div>Henüz veri yok</div></div>')+'</div>'
    +(mrows?'<div class="card"><div class="card-ttl">📅 Aylık Özet</div>'+mrows+'</div>':"")
    +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:10px">'
    +'<button class="btn-pdf" onclick="exportStatsPDF()">📄 Tüm İstatistik PDF</button></div>'
    +'<div style="text-align:center;margin-top:8px;font-size:12px;color:#767676;font-weight:700">Aylık gelişim grafikleri ve aylık özet tüm ayları gösterir · Net = Doğru − Yanlış÷3</div>';

  // Draw charts after DOM update
  setTimeout(drawDenemeChart,60);
  if(gt>0) setTimeout(function(){ drawCharts(sat, activeMonths); }, 50);
}

// Chart instances (destroy before redraw)
var _charts = {};
function destroyChart(id){if(_charts[id]){_charts[id].destroy();delete _charts[id];}}

var _lineMode = 'net';
function switchLineChart(btn, mode){
  _lineMode = mode;
  document.querySelectorAll('.chart-tab').forEach(function(b){b.classList.remove('act');});
  btn.classList.add('act');
  var allDays=Object.keys(recs).filter(function(d){return d>=START;}).sort();
  var sat=SUBJ.map(function(s){
    var t=allDays.reduce(function(a,d){return a+((recs[d]&&recs[d][s.id]&&recs[d][s.id].total)||0);},0);
    var c2=allDays.reduce(function(a,d){return a+((recs[d]&&recs[d][s.id]&&recs[d][s.id].correct)||0);},0);
    var w=cw(t,c2);
    return {id:s.id,n:s.n,c:s.c,total:t,correct:c2,wrong:w,net:calcNet(c2,w)};
  });
  var activeMonths=availMonths().filter(function(ym){return mstats(ym).total>0;});
  drawLineChart(activeMonths, mode);
}

function drawCharts(sat, activeMonths){
  drawRadarChart(sat);
  drawSmCharts();
  if(activeMonths.length>1){
    drawLineChart(activeMonths, _lineMode);
    drawSubjectLineChart(activeMonths);
  }
}

function drawRadarChart(sat){
  var el=document.getElementById('radarChart'); if(!el)return;
  destroyChart('radar');
  var subjData=sat.filter(function(s){return s.id!=='deneme';});
  var labels=subjData.map(function(s){return s.n;});
  var accVals=subjData.map(function(s){
    return s.total>0?parseFloat((s.correct/s.total*100).toFixed(2)):0;
  });
  _charts['radar']=new Chart(el,{
    type:'radar',
    data:{
      labels:labels,
      datasets:[
        {label:'Doğruluk %',data:accVals,backgroundColor:'rgba(79,70,229,0.18)',borderColor:'rgba(79,70,229,0.9)',borderWidth:2.5,pointBackgroundColor:'rgba(79,70,229,1)',pointRadius:5,pointHoverRadius:7}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.parsed.r.toFixed(2)+'%';}}}},
      scales:{r:{min:80,max:100,ticks:{stepSize:5,font:{size:11},color:'#aaa',backdropColor:'transparent'},grid:{color:'#e5e7eb'},pointLabels:{font:{family:'Nunito',size:11,weight:'bold'},color:'#333'},angleLines:{color:'#e5e7eb'}}}}
  });
}

function drawMonthlyRadarChart(selMonth){
  var el=document.getElementById('monthRadarChart'); if(!el)return;
  destroyChart('monthRadar');
  var subjData=SUBJ.filter(function(s){return s.id!=='deneme';});
  var labels=subjData.map(function(s){return s.n;});
  var eg=effectiveGoals(selMonth)||{};
  var g_acc=eg.__acc||0;
  // Hedef gerçekleşme: soru hedefi için tamamlanma yüzdesi, doğruluk için gerçekleşme
  var goalVals=subjData.map(function(s){
    var g=eg[s.id]||{targetTotal:0};
    var ss=mstats(selMonth,s.id);
    if(!g.targetTotal) return 0;
    return Math.min(100,parseFloat((ss.total/g.targetTotal*100).toFixed(2)));
  });
  var accVals=subjData.map(function(s){
    var ss=mstats(selMonth,s.id);
    return ss.total>0?parseFloat((ss.correct/ss.total*100).toFixed(2)):0;
  });
  var hasGoals=subjData.some(function(s){
    return (eg[s.id]&&eg[s.id].targetTotal>0);
  });
  var colors=subjData.map(function(s){return s.c;});
  var datasets=[
    {label:'Doğruluk %',data:accVals,backgroundColor:'rgba(79,70,229,0.15)',borderColor:'rgba(79,70,229,0.85)',borderWidth:2.5,pointBackgroundColor:'rgba(79,70,229,1)',pointRadius:5}
  ];
  if(hasGoals){
    datasets.push({label:'Soru Hedefi Gerç. %',data:goalVals,backgroundColor:'rgba(34,197,94,0.12)',borderColor:'rgba(34,197,94,0.85)',borderWidth:2,pointBackgroundColor:'rgba(34,197,94,1)',pointRadius:4,borderDash:[5,3]});
  }
  _charts['monthRadar']=new Chart(el,{
    type:'radar',
    data:{labels:labels,datasets:datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{font:{family:'Nunito',size:11},boxWidth:10,padding:8}},
        tooltip:{callbacks:{label:function(ctx){return ' '+ctx.dataset.label+': '+ctx.parsed.r.toFixed(2)+'%';}}}},
      scales:{r:{min:0,max:100,ticks:{stepSize:25,font:{size:11},color:'#aaa',backdropColor:'transparent'},grid:{color:'#e5e7eb'},pointLabels:{font:{family:'Nunito',size:11,weight:'bold'},color:'#333'},angleLines:{color:'#e5e7eb'}}}}
  });
}

function drawLineChart(activeMonths, mode){
  var el=document.getElementById('lineChart'); if(!el)return;
  destroyChart('line');
  var labels=activeMonths.map(function(ym){var p=parseYM(ym);return MONTHS[p.m].substring(0,3)+' '+String(p.y).slice(2);});
  var vals=activeMonths.map(function(ym){
    var ms=mstats(ym);
    if(mode==='net') return fnet(ms.net);
    if(mode==='total') return ms.total;
    return ms.total>0?parseFloat((ms.correct/ms.total*100).toFixed(2)):0;
  });
  var yLabel=mode==='net'?'Net Puan':mode==='total'?'Soru Sayısı':'Doğruluk %';
  var color='rgba(79,70,229,1)';
  _charts['line']=new Chart(el,{
    type:'line',
    data:{labels:labels,datasets:[{label:yLabel,data:vals,borderColor:color,backgroundColor:'rgba(79,70,229,0.08)',borderWidth:2.5,pointBackgroundColor:color,pointRadius:5,pointHoverRadius:7,fill:true,tension:0.35}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ' '+ctx.parsed.y+(mode==='acc'?'%':'');},titleFont:{family:'Nunito'},bodyFont:{family:'Nunito'}}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{family:'Nunito',size:12}}},
        y:{grid:{color:'#f3f4f6'},ticks:{font:{family:'Nunito',size:12}},min:50,beginAtZero:false}
      }
    }
  });
}

function drawSubjectLineChart(activeMonths){
  var el=document.getElementById('subjectLineChart'); if(!el)return;
  destroyChart('subjLine');
  var labels=activeMonths.map(function(ym){var p=parseYM(ym);return MONTHS[p.m].substring(0,3)+' '+String(p.y).slice(2);});
  var datasets=SUBJ.filter(function(s){return s.id!=='deneme';}).map(function(s){
    var vals=activeMonths.map(function(ym){return fnet(mstats(ym,s.id).net);});
    var hasData=vals.some(function(v){return v!==0;});
    return {label:s.n,data:vals,borderColor:s.c,backgroundColor:'transparent',borderWidth:2,pointBackgroundColor:s.c,pointRadius:3,pointHoverRadius:5,tension:0.3,hidden:!hasData};
  });
  _charts['subjLine']=new Chart(el,{
    type:'line',
    data:{labels:labels,datasets:datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{font:{family:'Nunito',size:12},boxWidth:10,padding:8}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{family:'Nunito',size:12}}},
        y:{grid:{color:'#f3f4f6'},ticks:{font:{family:'Nunito',size:12}},title:{display:true,text:'Net Puan',font:{family:'Nunito',size:12}}}
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  PDF EXPORT
// ═══════════════════════════════════════════════════════════════════
// ── PDF UTILITIES ─────────────────────────────────────────────────
// Turkish character fix for jsPDF (helvetica doesn't support ş,ğ,ü,ö,ç,ı)
// Türkçe karakterleri ASCII karşılıklarına çevirir (dosya adları ve yazı tipi yüklenemezse PDF metni için)
function trAscii(s){
  return String(s||"")
    .replace(/ş/g,"s").replace(/Ş/g,"S")
    .replace(/ğ/g,"g").replace(/Ğ/g,"G")
    .replace(/ü/g,"u").replace(/Ü/g,"U")
    .replace(/ö/g,"o").replace(/Ö/g,"O")
    .replace(/ç/g,"c").replace(/Ç/g,"C")
    .replace(/ı/g,"i").replace(/İ/g,"I")
    .replace(/â/g,"a").replace(/î/g,"i").replace(/û/g,"u");
}
// PDF metni: Türkçe yazı tipi yüklüyse olduğu gibi, değilse ASCII'ye çevrilmiş
function tr(s){ return PDF_FONT==="NotoSans" ? String(s||"") : trAscii(s); }

// ── PDF yazı tipi: Türkçe karakterler için Noto Sans (yalnızca gerekli harfler, ~16 KB; SIL OFL, fonts/LISANS.txt) ──
var PDF_FONT="helvetica";
var APP_VERSION=(function(){ try{ var el=document.querySelector('script[src*="app.js"]'); return (el&&el.src.split("?v=")[1])||"0"; }catch(e){ return "0"; } })();
var _pdfFonts=null, _pdfFontsState="idle", _pdfWaiters=[];   // idle | loading | ready | failed
function bufToB64(buf){
  var b=new Uint8Array(buf), s="", i, CH=0x8000;
  for(i=0;i<b.length;i+=CH) s+=String.fromCharCode.apply(null,b.subarray(i,i+CH));
  return btoa(s);
}
function loadPdfFonts(done){
  if(_pdfFontsState==="ready"||_pdfFontsState==="failed"){ done(); return; }
  _pdfWaiters.push(done);
  if(_pdfFontsState==="loading") return;
  _pdfFontsState="loading";
  Promise.all(["Regular","Bold"].map(function(w){
    return fetch("fonts/NotoSans-"+w+"-tr.ttf?v="+APP_VERSION).then(function(r){
      if(!r.ok) throw new Error("font "+r.status);
      return r.arrayBuffer();
    }).then(bufToB64);
  })).then(function(r){ _pdfFonts={Regular:r[0],Bold:r[1]}; _pdfFontsState="ready"; })
    .catch(function(){ _pdfFontsState="failed"; })
    .then(function(){ var w=_pdfWaiters; _pdfWaiters=[]; w.forEach(function(f){ f(); }); });
}
// Dışa aktarma, yazı tipi yüklenene kadar bekler ve sonra kendini yeniden çağırır
function pdfFontsPending(retry){
  if(_pdfFontsState==="ready"||_pdfFontsState==="failed") return false;
  loadPdfFonts(retry); return true;
}
function applyPdfFont(doc){
  if(_pdfFontsState!=="ready"){
    PDF_FONT="helvetica";
    // yazı tipi yoksa tüm metinler ASCII'ye çevrilir (eski davranış)
    var orig=doc.text.bind(doc);
    doc.text=function(t,x,y,o){ return orig(Array.isArray(t)?t.map(trAscii):trAscii(t),x,y,o); };
    return;
  }
  doc.addFileToVFS("NotoSans-Regular.ttf",_pdfFonts.Regular); doc.addFont("NotoSans-Regular.ttf","NotoSans","normal");
  doc.addFileToVFS("NotoSans-Bold.ttf",_pdfFonts.Bold); doc.addFont("NotoSans-Bold.ttf","NotoSans","bold");
  PDF_FONT="NotoSans";
}
function hexRgb(h){ h=h.replace("#",""); return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }

function getJsPDF(){
  if(window.jspdf&&window.jspdf.jsPDF) return window.jspdf.jsPDF;
  if(window.jsPDF) return window.jsPDF;
  return null;
}

// Draw colored header bar
function pdfHeader(doc,title,sub){
  var st=STUDENTS[curStudent];
  doc.setFillColor(79,70,229);
  doc.rect(0,0,210,36,'F');
  doc.setFillColor(99,91,255);
  doc.rect(0,28,210,8,'F');
  doc.setTextColor(255,255,255);
  doc.setFont(PDF_FONT,"bold");
  doc.setFontSize(15); doc.text(tr(title),14,14);
  doc.setFontSize(9);
  doc.text(tr(st.name)+" | "+tr(sub),14,22);
  doc.text("Net = Doğru - Yanlış / 3",14,31);
  doc.text(new Date().toLocaleDateString("tr-TR"),196,31,{align:"right"});
  doc.setTextColor(30,30,30);
  return 44;
}

// Section title with colored background
function pdfSection(doc,y,title,r,g,b){
  if(y>268){doc.addPage();y=16;}
  r=r||79;g=g||70;b=b||229;
  doc.setFillColor(r,g,b);
  doc.roundedRect(14,y,182,8,2,2,'F');
  doc.setFont(PDF_FONT,"bold"); doc.setFontSize(10);
  doc.setTextColor(255,255,255);
  doc.text(tr(title),17,y+5.5);
  doc.setTextColor(30,30,30);
  return y+12;
}

// Summary stats box
function pdfSummaryBox(doc,y,total,correct,wrong,net,extra){
  doc.setFillColor(238,242,255);
  doc.roundedRect(14,y,182,extra?26:18,3,3,'F');
  doc.setFont(PDF_FONT,"bold"); doc.setFontSize(10);
  doc.setTextColor(60,60,60);
  doc.text("Toplam: "+total+" soru",18,y+7);
  doc.text("Doğru: "+correct,68,y+7);
  doc.text("Yanlış: "+wrong,108,y+7);
  doc.setTextColor(79,70,229);
  doc.text("Net: "+fnet(net),152,y+7);
  doc.setTextColor(60,60,60);
  if(extra){
    extra.forEach(function(e,i){ doc.text(tr(e),18+i*60,y+17); });
  }
  doc.setTextColor(30,30,30);
  return y+(extra?30:22);
}

// Subject row with rich comparison
function pdfSubjRow(doc,y,s,t,c,w,n,pct,prevN,goalT,goalA){
  if(y>260){doc.addPage();y=16;}
  // Subject label box
  doc.setFillColor(245,245,255);
  doc.roundedRect(14,y-4,182,22,2,2,'F');
  // Label
  doc.setFont(PDF_FONT,"bold"); doc.setFontSize(10);
  doc.setTextColor(50,50,50);
  var rgb=hexRgb(s.c);   // emoji yerine ders renginde küçük bir nokta
  doc.setFillColor(rgb[0],rgb[1],rgb[2]); doc.circle(18,y+2.6,1.7,'F');
  doc.text(tr(s.n),22,y+4);
  // Stats
  doc.setFont(PDF_FONT,"normal"); doc.setFontSize(9);
  doc.setTextColor(80,80,80);
  doc.text("Top:"+t,74,y+4);
  doc.text("Doğ:"+c,95,y+4);
  doc.text("Yan:"+w,116,y+4);
  doc.text("%"+pct,138,y+4);
  // Net with color
  doc.setFont(PDF_FONT,"bold"); doc.setFontSize(10);
  doc.setTextColor(n>=0?22:220, n>=0?163:38, n>=0?74:38);
  doc.text("Net:"+fnet(n),152,y+4);
  // Change vs prev
  if(prevN!==null&&prevN!==undefined){
    var delta=fnet(n-prevN);
    var sign=n>=prevN?"+":"";
    doc.setTextColor(n>=prevN?22:220, n>=prevN?163:38, n>=prevN?74:38);
    doc.setFontSize(8);
    doc.text(tr("Önceki:"+fnet(prevN)+" ("+sign+delta+")"),16,y+11);
  }
  // Goal comparison
  if(goalT||goalA){
    var gparts=[];
    if(goalT) gparts.push("Hedef:"+goalT+"s "+(t>=goalT?"OK":Math.round((t/goalT)*100)+"%"));
    if(goalA) gparts.push("Hdf%"+goalA+" "+(pct>=goalA?"OK":"Şu an %"+pct));
    doc.setTextColor(100,100,150); doc.setFontSize(8);
    doc.text(gparts.join("  "),prevN!==null&&prevN!==undefined?90:16,y+11);
  }
  doc.setTextColor(30,30,30);
  // Progress bar (full width)
  doc.setFillColor(220,220,220); doc.roundedRect(14,y+13,182,3,1,1,'F');
  if(pct>0){
    doc.setFillColor(34,197,94);
    doc.roundedRect(14,y+13,182*(pct/100),3,1,1,'F');
  }
  // Goal marker on bar
  if(goalA&&goalA>0){
    doc.setFillColor(79,70,229);
    doc.rect(14+182*(Math.min(goalA,100)/100)-1,y+12,2,5,'F');
  }
  return y+22;
}

// ── MONTHLY PDF ──────────────────────────────────────────────────
function exportMonthPDF(){
  var JsPDF=getJsPDF(); if(!JsPDF){alert("PDF kütüphanesi yüklenemedi.");return;}
  if(pdfFontsPending(exportMonthPDF)) return;
  var doc=new JsPDF(); applyPdfFont(doc);
  var p=parseYM(selMonth), ms=mstats(selMonth);
  // Previous month comparison
  var allM=availMonths(), mIdx=allM.indexOf(selMonth);
  var prevM=mIdx>0?allM[mIdx-1]:null;
  var prevMs=prevM?mstats(prevM):null;

  var y=pdfHeader(doc, tr(MONTHS[p.m])+" "+p.y+" - Aylık Rapor", tr(MONTHS[p.m])+" "+p.y);

  // Summary with comparison
  var extras=null;
  if(prevMs&&prevMs.total){
    var netDiff=fnet(ms.net-prevMs.net);
    var sign=ms.net>=prevMs.net?"+":"";
    extras=[
      tr("Önceki ay: "+(prevM?"":"")+prevMs.total+" soru"),
      tr("Net değişim: "+sign+netDiff),
      tr("Aktif gün: "+Object.keys(recs).filter(function(d){return d.startsWith(selMonth)&&dstats(d).total>0;}).length)
    ];
  } else {
    extras=[tr("Aktif gün: "+Object.keys(recs).filter(function(d){return d.startsWith(selMonth)&&dstats(d).total>0;}).length)];
  }
  y=pdfSummaryBox(doc,y,ms.total,ms.correct,ms.wrong,ms.net,extras);
  y+=4;

  // Goals progress
  var monthGoals=effectiveGoals(selMonth)||{};
  var hasGoals=Object.keys(monthGoals).some(function(k){return monthGoals[k].targetTotal||monthGoals[k].targetAccuracy;});
  if(hasGoals){
    y=pdfSection(doc,y,"Hedef Karşılaştırma",16,163,74);
    var totalGoal=SUBJ.reduce(function(a,s){return a+((monthGoals[s.id]&&monthGoals[s.id].targetTotal)||0);},0);
    if(totalGoal){
      var overallPct=Math.round((ms.total/totalGoal)*100);
      doc.setFont(PDF_FONT,"normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
      doc.text(tr("Toplam hedef: "+totalGoal+" soru | Tamamlanan: "+ms.total+" (%"+Math.min(overallPct,100)+")"),16,y);
      // Overall goal bar
      doc.setFillColor(220,220,220); doc.roundedRect(14,y+2,182,4,1,1,'F');
      doc.setFillColor(overallPct>=100?34:79,overallPct>=100?197:70,overallPct>=100?94:229);
      doc.roundedRect(14,y+2,182*(Math.min(overallPct,100)/100),4,1,1,'F');
      y+=12;
    }
  }

  // Ders detaylari
  y=pdfSection(doc,y,"Ders Detayları");
  SUBJ.forEach(function(s){
    var ss=mstats(selMonth,s.id);
    if(!ss.total)return;
    var pct=ss.total>0?Math.round((ss.correct/ss.total)*100):0;
    var prevSN=prevMs?null:null;
    if(prevM){var pss=mstats(prevM,s.id); prevSN=pss.total?pss.net:null;}
    var g=monthGoals[s.id]||{};
    var gA2=goalFor(monthGoals,s.id).a; y=pdfSubjRow(doc,y,s,ss.total,ss.correct,ss.wrong,ss.net,pct,prevSN,g.targetTotal||0,gA2);
  });

  // Haftalik dagilim
  y+=4;
  y=pdfSection(doc,y,"Haftalık Dağılım",245,158,11);
  // Find weeks in this month
  var p2=parseYM(selMonth);
  var firstDay=ds(p2.y,p2.m,1);
  var lastDay=ds(p2.y,p2.m,dim(p2.y,p2.m));
  var ws2=weekStart(firstDay);
  var weekNum=1;
  while(ws2<=lastDay){
    var wDays=weekDays(ws2);
    var wt=0,wc=0,ww=0;
    wDays.forEach(function(d){
      if(d<firstDay||d>lastDay)return;
      var st2=dstats(d); wt+=st2.total; wc+=st2.correct; ww+=st2.wrong;
    });
    if(wt>0){
      if(y>270){doc.addPage();y=16;}
      doc.setFont(PDF_FONT,"bold"); doc.setFontSize(9); doc.setTextColor(60,60,60);
      doc.text(weekNum+". Hafta ("+fmtD(ws2)+")",16,y);
      doc.setFont(PDF_FONT,"normal");
      doc.text("Top:"+wt+"  Dog:"+wc+"  Yan:"+ww,70,y);
      doc.setTextColor(calcNet(wc,ww)>=0?22:220,calcNet(wc,ww)>=0?163:38,calcNet(wc,ww)>=0?74:38);
      doc.text("Net:"+fnet(calcNet(wc,ww)),148,y);
      doc.setTextColor(30,30,30);
      y+=7;
    }
    ws2=addDays(ws2,7); weekNum++;
    if(weekNum>6)break;
  }

  // En iyi / en kotu gun
  y+=4;
  var mDays=Object.keys(recs).filter(function(d){return d.startsWith(selMonth)&&dstats(d).total>0;}).sort();
  if(mDays.length>1){
    y=pdfSection(doc,y,"En İyi / En Zayıf Gün",220,38,38);
    var byNet=mDays.map(function(d){var s=dstats(d);return{d:d,net:s.net,total:s.total};});
    byNet.sort(function(a,b){return b.net-a.net;});
    doc.setFont(PDF_FONT,"bold"); doc.setFontSize(9); doc.setTextColor(22,163,74);
    doc.text("En iyi: "+fmtD(byNet[0].d)+" | Net "+fnet(byNet[0].net)+" ("+byNet[0].total+" soru)",16,y);
    doc.setTextColor(220,38,38);
    doc.text("En zayıf: "+fmtD(byNet[byNet.length-1].d)+" | Net "+fnet(byNet[byNet.length-1].net),16,y+7);
    doc.setTextColor(30,30,30);
    y+=16;
  }

  doc.save(trAscii(STUDENTS[curStudent].short).replace(/ /g,"_")+"_"+selMonth+"_rapor.pdf");
}

// ── WEEKLY PDF ──────────────────────────────────────────────────
function exportWeekPDF(){
  var JsPDF=getJsPDF(); if(!JsPDF){alert("PDF kütüphanesi yüklenemedi.");return;}
  if(pdfFontsPending(exportWeekPDF)) return;
  var doc=new JsPDF(); applyPdfFont(doc);
  var days=weekDays(selWeekStart), ws=wstats(selWeekStart);
  var label=fmtD(selWeekStart)+" - "+fmtD(days[6]);
  // Previous week
  var prevWS=addDays(selWeekStart,-7);
  var prevWst=wstats(prevWS);
  var y=pdfHeader(doc,"Haftalık Rapor",label);

  var extras=[tr("Önceki hafta: "+prevWst.total+" soru, Net:"+fnet(prevWst.net))];
  if(prevWst.total){
    var sign=ws.net>=prevWst.net?"+":"";
    extras.push(tr("Değişim: "+sign+fnet(ws.net-prevWst.net)));
  }
  extras.push(tr("Aktif gün: "+days.filter(function(d){return dstats(d).total>0;}).length+"/7"));
  y=pdfSummaryBox(doc,y,ws.total,ws.correct,ws.wrong,ws.net,extras);
  y+=4;

  // Gunluk dagilim
  y=pdfSection(doc,y,"Günlük Dağılım",245,158,11);
  var dnames=["Pzt","Sal","Car","Per","Cum","Cmt","Paz"];
  var maxDayTotal=Math.max.apply(null,days.map(function(d){return dstats(d).total;}).concat([1]));
  days.forEach(function(d,i){
    var st=dstats(d);
    if(y>268){doc.addPage();y=16;}
    doc.setFillColor(st.total>0?238:250,st.total>0?242:250,st.total>0?255:250);
    doc.roundedRect(14,y-3,182,10,2,2,'F');
    doc.setFont(PDF_FONT,"bold"); doc.setFontSize(9);
    doc.setTextColor(st.total>0?50:180,st.total>0?50:180,st.total>0?50:180);
    doc.text(dnames[i]+" "+fmtD(d),16,y+4);
    if(st.total>0){
      doc.setFont(PDF_FONT,"normal");
      doc.text("Top:"+st.total+"  Dog:"+st.correct+"  Yan:"+st.wrong,60,y+4);
      doc.setFont(PDF_FONT,"bold");
      doc.setTextColor(st.net>=0?22:220,st.net>=0?163:38,st.net>=0?74:38);
      doc.text("Net:"+fnet(st.net),148,y+4);
      // Mini bar
      doc.setFillColor(200,200,200); doc.rect(14,y+5,182*(st.total/maxDayTotal),2,'F');
      var cpct=st.total>0?st.correct/st.total:0;
      doc.setFillColor(34,197,94); doc.rect(14,y+5,182*(st.total/maxDayTotal)*cpct,2,'F');
    } else {
      doc.setTextColor(180,180,180); doc.setFont(PDF_FONT,"normal"); doc.setFontSize(8);
      doc.text("Çalışma yok",60,y+4);
    }
    doc.setTextColor(30,30,30); y+=12;
  });
  y+=4;

  // Ders bazli
  y=pdfSection(doc,y,"Ders Detayları");
  SUBJ.forEach(function(s){
    var t=0,c=0,w=0;
    days.forEach(function(d){var r=(recs[d]&&recs[d][s.id])||{};t+=r.total||0;c+=r.correct||0;w+=cw(r.total||0,r.correct||0);});
    if(!t)return;
    // Prev week same subject
    var pT=0,pC=0,pW=0;
    weekDays(prevWS).forEach(function(d){var r=(recs[d]&&recs[d][s.id])||{};pT+=r.total||0;pC+=r.correct||0;pW+=cw(r.total||0,r.correct||0);});
    var prevN2=pT>0?calcNet(pC,pW):null;
    var pct=Math.round((c/t)*100);
    y=pdfSubjRow(doc,y,s,t,c,w,calcNet(c,w),pct,prevN2,0,0);
  });

  doc.save(trAscii(STUDENTS[curStudent].short).replace(/ /g,"_")+"_haftalik_"+selWeekStart+".pdf");
}

// ── STATS PDF ──────────────────────────────────────────────────
function exportStatsPDF(){
  var JsPDF=getJsPDF(); if(!JsPDF){alert("PDF kütüphanesi yüklenemedi.");return;}
  if(pdfFontsPending(exportStatsPDF)) return;
  var doc=new JsPDF(); applyPdfFont(doc);
  var allDays=Object.keys(recs).filter(function(d){return d>=START;}).sort();
  var sat=SUBJ.map(function(s){
    var t=allDays.reduce(function(a,d){return a+((recs[d]&&recs[d][s.id]&&recs[d][s.id].total)||0);},0);
    var c2=allDays.reduce(function(a,d){return a+((recs[d]&&recs[d][s.id]&&recs[d][s.id].correct)||0);},0);
    var w=cw(t,c2);
    return {id:s.id,n:s.n,e:s.e,c:s.c,total:t,correct:c2,wrong:w,net:calcNet(c2,w)};
  });
  var gt=sat.reduce(function(a,s){return a+s.total;},0);
  var gc=sat.reduce(function(a,s){return a+s.correct;},0);
  var gw=sat.reduce(function(a,s){return a+s.wrong;},0);
  var active=allDays.filter(function(d){return dstats(d).total>0;}).length;
  var gn=calcNet(gc,gw);
  var y=pdfHeader(doc,"Genel İstatistik Raporu","Tüm Zamanlar");

  var extras=[
    tr("Aktif gün: "+active),
    tr("Toplam yanlış: "+gw),
    gt>0?tr("Doğru oranı: %"+Math.round((gc/gt)*100)):""
  ];
  y=pdfSummaryBox(doc,y,gt,gc,gw,gn,extras);
  y+=4;

  // Ders siralaması
  y=pdfSection(doc,y,"Ders Sıralaması (Toplama Göre)");
  sat.slice().sort(function(a,b){return b.total-a.total;}).forEach(function(s,i){
    if(!s.total)return;
    var pct=Math.round((s.correct/s.total)*100);
    y=pdfSubjRow(doc,y,s,s.total,s.correct,s.wrong,s.net,pct,null,0,0);
  });

  // Monthly breakdown — page 2
  doc.addPage(); y=16;
  doc.setFillColor(79,70,229); doc.rect(0,0,210,12,'F');
  doc.setFont(PDF_FONT,"bold"); doc.setFontSize(10); doc.setTextColor(255,255,255);
  doc.text(tr(STUDENTS[curStudent].name)+" | Aylık Gelişim",14,8);
  doc.setTextColor(30,30,30); y=20;

  // Table header
  doc.setFillColor(238,242,255); doc.rect(14,y,182,8,'F');
  doc.setFont(PDF_FONT,"bold"); doc.setFontSize(8); doc.setTextColor(60,60,60);
  doc.text("Ay",16,y+5.5);
  doc.text("Toplam",50,y+5.5); doc.text("Doğru",80,y+5.5);
  doc.text("Yanlış",108,y+5.5); doc.text("Net",136,y+5.5);
  doc.text("Ort/Gün",155,y+5.5); doc.text("Değişim",178,y+5.5);
  y+=10;

  var prevMonthNet=null;
  availMonths().forEach(function(ymStr){
    var ms2=mstats(ymStr),p3=parseYM(ymStr);
    if(!ms2.total){prevMonthNet=null;return;}
    if(y>278){doc.addPage();y=16;}
    var activeDaysM=Object.keys(recs).filter(function(d){return d.startsWith(ymStr)&&dstats(d).total>0;}).length;
    var avgPerDay=activeDaysM>0?Math.round(ms2.total/activeDaysM):0;
    var delta=prevMonthNet!==null?fnet(ms2.net-prevMonthNet):"-";
    var sign=(prevMonthNet!==null&&ms2.net>=prevMonthNet)?"+":"";
    // Alternate row bg
    var rowIdx=availMonths().indexOf(ymStr);
    if(rowIdx%2===0){doc.setFillColor(248,248,255); doc.rect(14,y-3,182,8,'F');}
    doc.setFont(PDF_FONT,"bold"); doc.setFontSize(8);
    doc.setTextColor(79,70,229); doc.text(tr(MONTHS[p3.m])+" "+p3.y,16,y+2);
    doc.setFont(PDF_FONT,"normal"); doc.setTextColor(60,60,60);
    doc.text(String(ms2.total),50,y+2);
    doc.setTextColor(22,163,74); doc.text(String(ms2.correct),80,y+2);
    doc.setTextColor(220,38,38); doc.text(String(ms2.wrong),108,y+2);
    doc.setFont(PDF_FONT,"bold");
    doc.setTextColor(ms2.net>=0?22:220,ms2.net>=0?163:38,ms2.net>=0?74:38);
    doc.text(String(fnet(ms2.net)),136,y+2);
    doc.setFont(PDF_FONT,"normal"); doc.setTextColor(60,60,60);
    doc.text(String(avgPerDay)+"/gün",155,y+2);
    if(prevMonthNet!==null){
      doc.setTextColor(ms2.net>=prevMonthNet?22:220,ms2.net>=prevMonthNet?163:38,ms2.net>=prevMonthNet?74:38);
      doc.text((ms2.net>=prevMonthNet?"+":"")+delta,178,y+2);
    } else {
      doc.setTextColor(160,160,160); doc.text("-",178,y+2);
    }
    doc.setTextColor(30,30,30);
    y+=8; prevMonthNet=ms2.net;
  });

  doc.save(trAscii(STUDENTS[curStudent].short).replace(/ /g,"_")+"_istatistik.pdf");
}

// ═══════════════════════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════════════════════
function sb(val,lbl,bg,c){return '<div class="sbox" style="background:'+bg+'"><div class="sval" style="color:'+c+'">'+val+'</div><div class="slbl" style="color:'+c+'">'+lbl+'</div></div>';}
function ring(pct,c,sz){
  var r=(sz-6)/2,ci=2*Math.PI*r,d=Math.min((pct/100)*ci,ci);
  var valFs=sz>50?11:9, pctFs=sz>50?9:8;
  // Split value and % symbol into two lines so both fit inside the circle
  var valStr=String(pct);
  return '<div style="position:relative;width:'+sz+'px;height:'+sz+'px;flex-shrink:0">'
    +'<svg width="'+sz+'" height="'+sz+'" style="transform:rotate(-90deg)">'
    +'<circle cx="'+(sz/2)+'" cy="'+(sz/2)+'" r="'+r+'" fill="none" stroke="#f3f4f6" stroke-width="5"/>'
    +'<circle cx="'+(sz/2)+'" cy="'+(sz/2)+'" r="'+r+'" fill="none" stroke="'+c+'" stroke-width="5" stroke-dasharray="'+d+' '+ci+'" stroke-linecap="round"/>'
    +'</svg>'
    +'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1">'
    +'<span style="font-size:'+valFs+'px;font-weight:900;color:'+c+'">'+valStr+'</span>'
    +'<span style="font-size:'+pctFs+'px;font-weight:700;color:'+c+'">%</span>'
    +'</div></div>';
}
// ═══════════════════════════════════════════════════════════════════
//  EXCEL TEMPLATE DOWNLOAD
// ═══════════════════════════════════════════════════════════════════
function dlTemplate(){
  try{
    var XLSXlib = window.XLSX;
    if(!XLSXlib){ document.getElementById("upload-msg").innerHTML='<span style="color:#dc2626">Excel kütüphanesi yüklenmedi, lütfen sayfayı yenileyip tekrar deneyin.</span>'; return; }
    var wb = XLSXlib.utils.book_new();
    // ── Talimatlar sheet ──
    var ws0data = [
      ["Soru Takip — Veri Yükleme Şablonu"],
      [""],
      ["NASIL KULLANILIR?"],
      ["1. Öğrenci sekmesini seçin", "Ömer Doruk veya Zeynep Alya sekmesine gidin"],
      ["2. Tarih sütununa günleri girin", "Format: YYYY-AA-GG  Örnek: 2026-01-15"],
      ["3. Her ders için Toplam ve Doğru sayısını girin", "Yanlış otomatik hesaplanır"],
      ["4. Dosyayı kaydedin ve uygulamada Excel Yükle butonuna tıklayın"],
      [""],
      ["Net Formülü", "Net = Doğru - Yanlış ÷ 3"],
      ["Başlangıç Tarihi", "2026-01-01 tarihinden önceki veriler kabul edilmez"],
    ];
    var ws0 = XLSXlib.utils.aoa_to_sheet(ws0data);
    ws0["!cols"] = [{wch:44},{wch:52}];
    XLSXlib.utils.book_append_sheet(wb, ws0, "Talimatlar");
    // ── Öğrenci sheets ──
    var subjNames = SUBJ.map(function(s){ return s.n; });
    var students = [{name:"Ömer Doruk Saldanlı",sheet:"Ömer Doruk"},{name:"Zeynep Alya Saldanlı",sheet:"Zeynep Alya"}];
    students.forEach(function(st){
      var headers1 = [""];
      var headers2 = ["Tarih"];
      subjNames.forEach(function(n){ headers1.push(n,""); headers2.push("Toplam","Doğru"); });
      var rows = [headers1, headers2];
      // 5 örnek satır
      var examples = [
        ["2026-01-15",20,16,15,12,10,8,12,10,8,6,5,4,0,0],
        ["2026-01-16",25,20,0,0,12,9,0,0,10,8,0,0,0,0],
        ["2026-01-20",30,24,20,17,0,0,0,0,12,9,0,0,0,0],
      ];
      examples.forEach(function(r){ rows.push(r); });
      // 50 boş satır
      for(var i=0;i<50;i++) rows.push(["","","","","","","","","","","","","","",""]);
      var ws = XLSXlib.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{wch:13}];
      for(var c=1;c<15;c++) ws["!cols"].push({wch:9});
      XLSXlib.utils.book_append_sheet(wb, ws, st.sheet);
    });
    XLSXlib.writeFile(wb, "soru-takip-sablon.xlsx");
    document.getElementById("upload-msg").innerHTML='<span style="color:#15803d">✅ Şablon indirildi!</span>';
    setTimeout(function(){ document.getElementById("upload-msg").innerHTML=""; },3000);
  }catch(e){
    document.getElementById("upload-msg").innerHTML='<span style="color:#dc2626">Hata: '+e.message+'</span>';
  }
}

// ═══════════════════════════════════════════════════════════════════
//  EXCEL UPLOAD & IMPORT
// ═══════════════════════════════════════════════════════════════════
var SUBJ_IDS = SUBJ.map(function(s){ return s.id; });
// Column mapping: col index 0=date, 1=mat_total, 2=mat_correct, 3=tur_total ...
// Each subject has 2 cols (total, correct), starting at col index 1

function uploadExcel(input){
  var file = input.files[0];
  if(!file){ return; }
  var msg = document.getElementById("upload-msg");
  msg.innerHTML = '<span style="color:#f59e0b">⏳ Dosya okunuyor...</span>';

  var reader = new FileReader();
  reader.onload = function(e){
    try{
      var data = new Uint8Array(e.target.result);
      var wb = XLSX.read(data, {type:"array", cellDates:true});

      // Detect which student sheet to use
      var sheetNames = wb.SheetNames;
      // Try to match student name in sheet name
      var studentMap = {
        "omer": null, "zeynep": null
      };
      sheetNames.forEach(function(sn){
        var snl = sn.toLowerCase();
        if(snl.indexOf("omer")>-1 || snl.indexOf("ömer")>-1 || snl.indexOf("doruk")>-1) studentMap["omer"] = sn;
        if(snl.indexOf("zeynep")>-1 || snl.indexOf("alya")>-1) studentMap["zeynep"] = sn;
      });

      // Ask user which student to import for
      var targetStudent = null;
      var targetSheet = null;
      if(studentMap["omer"] && studentMap["zeynep"]){
        // Both found — ask
        targetStudent = prompt("Hangi öğrencinin verilerini yüklemek istiyorsunuz?\n1 = Ömer Doruk\n2 = Zeynep Alya\n\nSayı girin (1 veya 2):","1");
        if(targetStudent==="2"){ targetStudent="zeynep"; targetSheet=studentMap["zeynep"]; }
        else { targetStudent="omer"; targetSheet=studentMap["omer"]; }
      } else if(studentMap["omer"]){
        targetStudent="omer"; targetSheet=studentMap["omer"];
      } else if(studentMap["zeynep"]){
        targetStudent="zeynep"; targetSheet=studentMap["zeynep"];
      } else {
        // Fallback: use second sheet (index 1)
        targetSheet = sheetNames[1] || sheetNames[0];
        targetStudent = prompt("Hangi öğrencinin verilerini yüklemek istiyorsunuz?\n1 = Ömer Doruk\n2 = Zeynep Alya\n\nSayı girin (1 veya 2):","1");
        if(targetStudent==="2") targetStudent="zeynep"; else targetStudent="omer";
      }

      var ws = wb.Sheets[targetSheet];
      var rows = XLSX.utils.sheet_to_json(ws, {header:1, raw:false, defval:""});

      // Find header row (row with "Tarih" or row index 2, i.e. index 2 = row 3)
      var dataStart = -1;
      for(var i=0;i<rows.length;i++){
        var first = String(rows[i][0]||"").trim().toLowerCase();
        if(first === "tarih"){ dataStart = i+1; break; }
      }
      if(dataStart < 0) dataStart = 3; // default: row 4 (0-indexed 3)

      var imported = 0, skipped = 0;
      var batch = {};

      for(var ri=dataStart; ri<rows.length; ri++){
        var row = rows[ri];
        var dateRaw = String(row[0]||"").trim();
        if(!dateRaw) continue;

        // Normalize date: accept YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY
        var dateStr = null;
        if(/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)){
          dateStr = dateRaw;
        } else if(/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)){
          var parts=dateRaw.split("/"); dateStr=parts[2]+"-"+parts[1]+"-"+parts[0];
        } else if(/^\d{2}\.\d{2}\.\d{4}$/.test(dateRaw)){
          var parts=dateRaw.split("."); dateStr=parts[2]+"-"+parts[1]+"-"+parts[0];
        } else {
          // Try parsing as date object string
          var d = new Date(dateRaw);
          if(!isNaN(d.getTime())){
            dateStr = d.toISOString().split("T")[0];
          }
        }
        if(!dateStr || dateStr < "2026-01-01"){ skipped++; continue; }

        var dayData = {};
        var hasAny = false;
        for(var si=0; si<SUBJ_IDS.length; si++){
          var colT = 1 + si*2;
          var colC = 2 + si*2;
          var t = parseInt(row[colT])||0;
          var c2 = parseInt(row[colC])||0;
          if(c2>t) c2=t;
          if(t>0){
            dayData[SUBJ_IDS[si]] = {total:t, correct:c2};
            hasAny = true;
          }
        }
        if(hasAny){ batch[dateStr] = dayData; imported++; }
        else skipped++;
      }

      if(imported === 0){
        msg.innerHTML = '<span style="color:#dc2626">❌ Hiç veri bulunamadı. Tarih formatını kontrol edin (YYYY-AA-GG).</span>';
        return;
      }

      // Confirm before writing
      var ok = confirm(
        imported+" günlük veri bulundu.\n\nÖğrenci: "+STUDENTS[targetStudent].name+
        "\n\nMevcut verilerle birleştirilecek (üzerine yazılmayacak).\n\nDevam edilsin mi?"
      );
      if(!ok){ msg.innerHTML="<span style=\"color:#767676\">İptal edildi.</span>"; return; }

      // Veritabanına yazma yetkisi yönetici hesabındadır; şifre sorulur
      withAdmin(function(){
        // Write to Firebase — merge (don't overwrite existing)
        var targetRef = db.ref("records/"+targetStudent);
        var writeCount = 0;
        var keys = Object.keys(batch);
        keys.forEach(function(dateKey){
          var dayRef = targetRef.child(dateKey);
          // Use update (merge) not set (overwrite)
          dayRef.update(batch[dateKey]).then(function(){
            writeCount++;
            if(writeCount === keys.length){
              msg.innerHTML = '<span style="color:#15803d">✅ '+imported+' gün başarıyla yüklendi! Öğrenci girişinden görebilirsiniz.</span>';
              authSignOut();
            }
          }).catch(function(e){
            msg.innerHTML = '<span style="color:#dc2626">❌ Yükleme hatası: '+e.message+'</span>';
            authSignOut();
          });
        });
      }, function(t,c){ msg.innerHTML='<span style="color:'+c+'">'+t+'</span>'; });

    }catch(err){
      msg.innerHTML = '<span style="color:#dc2626">❌ Dosya okunamadı: '+err.message+'</span>';
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}



// ═══════════════════════════════════════════════════════════════════
//  LGS GERİ SAYIM + STREAK + HAFTALIK HEDEF
// ═══════════════════════════════════════════════════════════════════

var LGS_DATE = "2027-06-12"; // LGS Tarihi — buradan değiştirin

function daysUntilLGS(){
  var now = new Date(); now.setHours(0,0,0,0);
  var lgs = new Date(LGS_DATE);
  return Math.max(0, Math.round((lgs-now)/(1000*60*60*24)));
}

function calcStreak(){
  var td = today();
  var streak = 0;
  var d = td;
  while(true){
    if(dstats(d).total > 0){ streak++; }
    else if(d !== td){ break; }
    var prev = addDays(d,-1);
    if(prev < START) break;
    d = prev;
    if(d === td && dstats(d).total === 0) break;
  }
  // If today has no data, start from yesterday
  if(dstats(td).total === 0){
    streak = 0;
    d = addDays(td,-1);
    while(d >= START){
      if(dstats(d).total > 0) streak++;
      else break;
      d = addDays(d,-1);
    }
  }
  return streak;
}

function calcLongestStreak(){
  var allDays = Object.keys(recs).filter(function(d){return d>=START&&dstats(d).total>0;}).sort();
  if(!allDays.length) return 0;
  var max=1, cur=1;
  for(var i=1;i<allDays.length;i++){
    var diff = Math.round((new Date(allDays[i])-new Date(allDays[i-1]))/(1000*60*60*24));
    if(diff===1){ cur++; if(cur>max) max=cur; }
    else cur=1;
  }
  return max;
}

// ═══════════════════════════════════════════════════════════════════
//  HEDEFLER
//  Hedefler yalnızca yönetici hesabında girilir: goals/<öğrenci>/<ay>/<ders>/{targetTotal, targetAccuracy}.
//  Bir ay için kayıt yoksa önceki aylardan en yakın kayıtlı hedefler aynen devam eder; öğrenci ekranları da
//  aynı mantığı kullanır. Öğrenci hesapları hedefleri yalnızca görür.
// ═══════════════════════════════════════════════════════════════════
var goalsBy={omer:{},zeynep:{}}, goalRefZ=null, goalListenerZ=null;
var admGoalStudent="omer", admGoalMonth=null, admGoalDraft=null, admGoalMsg="";

// Hedefin geçerli olduğu kaynak ay: ay için kayıt varsa kendisi, yoksa önceki aylardan en yakın kayıtlı ay, yoksa null
function goalSourceMonth(ymStr,src){
  src=src||goals;
  if(src[ymStr]&&Object.keys(src[ymStr]).length) return ymStr;
  var ms=goalMonths(), i=ms.indexOf(ymStr);
  for(var k=i-1;k>=0;k--){
    if(src[ms[k]]&&Object.keys(src[ms[k]]).length) return ms[k];
  }
  return null;
}
function effectiveGoals(ymStr,src){
  src=src||goals;
  var m=goalSourceMonth(ymStr,src);
  return m?src[m]:null;
}
// Bir ders için hedef: t = aylık soru hedefi, a = doğruluk hedefi (ders için yoksa eski genel doğruluk hedefi)
function goalFor(g,sid){
  var x=(g&&g[sid])||{};
  return {t:x.targetTotal||0,a:x.targetAccuracy||(g&&g.__acc)||0};
}

// Günlük ekranın altında: seçili günün ayındaki hedeflere göre ders başına pasta (halka) grafik, en fazla iki satır
function donutHtml(pct,color,center){
  return '<div style="width:62px;height:62px;border-radius:50%;background:conic-gradient('+color+' '+(Math.min(100,pct)*3.6)+'deg,#e5e7eb 0);display:flex;align-items:center;justify-content:center;margin:0 auto">'
    +'<div style="width:42px;height:42px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#333">'+center+'</div></div>';
}
function goalRemainingCard(){
  var m=selDate.slice(0,7), td=today(), curM=td.slice(0,7);
  if(m>curM) return "";
  var g=effectiveGoals(m); if(!g) return "";
  var p=parseYM(m), daysLeft=(m===curM)?(dim(p.y,p.m)-parseInt(td.slice(8))+1):0;
  var cells="", any=false;
  SUBJ.forEach(function(s){
    var gf=goalFor(g,s.id), target=gf.t; if(target<=0) return;
    any=true;
    var ss=mstats(m,s.id), solved=ss.total, left=Math.max(0,target-solved);
    var pct=Math.round(solved/target*100);
    var acc=ss.total>0?Math.round(ss.correct/ss.total*100):null;
    var leftTxt=left===0?'<span style="color:#15803d">✓ Tamam</span>'
      :'<span style="color:'+s.d+'">Kalan '+left+'</span>'+(daysLeft>0?'<div style="font-size:11px;color:#666;font-weight:700">günde ~'+Math.ceil(left/daysLeft)+'</div>':'');
    var accTxt=(gf.a>0&&acc!==null)?'<div style="font-size:11px;font-weight:800;color:'+(acc>=gf.a?"#15803d":"#b45309")+'">%'+acc+' / hedef %'+gf.a+'</div>'
      :(gf.a>0?'<div style="font-size:11px;font-weight:700;color:#666">hedef %'+gf.a+'</div>':'');
    cells+='<div role="img" aria-label="'+s.n+': '+solved+' / '+target+' soru, kalan '+left+'" style="text-align:center;min-width:0">'
      +donutHtml(pct,left===0?"#22c55e":s.c,Math.min(pct,999)+'%')
      +'<div style="font-size:12px;font-weight:800;color:#333;margin-top:4px">'+s.e+' '+s.n+'</div>'
      +'<div style="font-size:11px;font-weight:700;color:#666">'+solved+' / '+target+'</div>'
      +'<div style="font-size:12px;font-weight:900">'+leftTxt+'</div>'+accTxt+'</div>';
  });
  if(!any) return "";
  return '<div class="card" style="padding:12px 10px"><div style="font-size:13px;font-weight:900;color:#333;margin:0 4px 2px">🎯 Aylık hedef durumu <span style="font-size:12px;color:#666;font-weight:700">· '+MONTHS[p.m]+' '+p.y+'</span></div>'
    +(daysLeft>0?'<div style="font-size:12px;color:#666;font-weight:700;margin:0 4px 8px">Bugün dahil '+daysLeft+' gün kaldı</div>':'<div style="height:8px"></div>')
    +'<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 4px">'+cells+'</div></div>';
}

// ── Yönetici hedef ekranı: her öğrenci için ders bazında aylık soru ve doğruluk hedefi ──
function admGoalSrc(){ return goalsBy[admGoalStudent]||{}; }
function admGoalInit(){
  if(!admGoalMonth) admGoalMonth=ymNow();
  if(!admGoalDraft){
    // Kayıtlı hedef yoksa önceki aydaki hedefler taslak olarak açılır; kaydedilirse bu aya özel olur
    var eff=effectiveGoals(admGoalMonth,admGoalSrc());
    admGoalDraft=eff?JSON.parse(JSON.stringify(eff)):{};
  }
}
function admGoalSetStudent(sid){ admGoalStudent=sid; admGoalDraft=null; admGoalMsg=""; renderCmpGoals(); }
function admGoalMove(delta){
  var ms=goalMonths(), i=ms.indexOf(admGoalMonth)+delta;
  if(i<0||i>=ms.length) return;
  admGoalMonth=ms[i]; admGoalDraft=null; admGoalMsg=""; renderCmpGoals();
}
// Taslağa yazar (yazarken ekran yenilenmez)
function admGoalSet(sid,field,val){
  var g=admGoalDraft[sid]||(admGoalDraft[sid]={});
  var v=parseInt(val,10); if(isNaN(v)) v=0;
  g[field]=field==="targetAccuracy"?Math.min(100,Math.max(0,v)):Math.min(10000,Math.max(0,v));
  admGoalMsg="";
}
function admGoalAdj(sid,field,delta){
  var cur=(admGoalDraft[sid]&&admGoalDraft[sid][field])||0;
  admGoalSet(sid,field,cur+delta); renderCmpGoals();
}
function admGoalSave(){
  if(READONLY||!db) return;
  var sid=admGoalStudent, m=admGoalMonth, out={};
  SUBJ.forEach(function(s){
    var g=admGoalDraft[s.id]||{};
    out[s.id]={targetTotal:g.targetTotal||0,targetAccuracy:g.targetAccuracy||0};
  });
  if(admGoalDraft.__acc) out.__acc=admGoalDraft.__acc;   // eski genel doğruluk hedefi varsa korunur
  syncState("saving");
  db.ref("goals/"+sid+"/"+m).set(out).then(function(){
    goalsBy[sid][m]=out; syncState("ok");
    var p=parseYM(m);
    admGoalMsg="✅ "+STUDENTS[sid].short+" için "+MONTHS[p.m]+" "+p.y+" hedefleri kaydedildi. Sonraki aylar değiştirilmezse bu hedeflerle devam eder.";
    renderCmpGoals();
  }).catch(function(){ syncState("error"); admGoalMsg="❌ Kaydedilemedi."; renderCmpGoals(); });
}
function renderCmpGoals(){
  admGoalInit();
  var sid=admGoalStudent, m=admGoalMonth, p=parseYM(m), src=admGoalSrc(), st=STUDENTS[sid];
  var srcM=goalSourceMonth(m,src), srcP=srcM?parseYM(srcM):null;
  var studentRecs=sid==="omer"?recs:cmpRecs;
  var btn='width:30px;height:30px;border-radius:9px;border:none;font-size:16px;font-weight:900;cursor:pointer';
  var html=adminHeader("Hedefler","Her öğrenci için ders bazında aylık soru ve doğruluk hedefi")
    +'<div style="display:flex;gap:6px;margin-bottom:10px">'
    +["omer","zeynep"].map(function(k){
      return '<button class="chart-tab'+(k===sid?' act':'')+'" onclick="admGoalSetStudent(\''+k+'\')">'+STUDENTS[k].emoji+' '+STUDENTS[k].short+'</button>';
    }).join("")+'</div>'
    +'<div class="period-nav"><button aria-label="Önceki ay" onclick="admGoalMove(-1)">‹</button><span>🎯 '+MONTHS[p.m]+' '+p.y+'</span><button aria-label="Sonraki ay" onclick="admGoalMove(1)">›</button></div>'
    +'<div class="tip">'+(srcM===m?'Bu ay için kayıtlı hedefler gösteriliyor.'
      :srcM?'Bu ay için hedef kaydedilmedi: <b>'+MONTHS[srcP.m]+' '+srcP.y+'</b> hedefleri aynen devam ediyor. Değiştirip kaydedersen bu aydan itibaren yeni hedefler geçerli olur.'
      :'Bu öğrenci için henüz hedef yok. Değerleri girip kaydedin.')+'</div>';
  SUBJ.forEach(function(s){
    var g=admGoalDraft[s.id]||{}, ss=mstFrom(studentRecs,m,s.id);
    var ap=ss.total>0?Math.round(ss.correct/ss.total*100):0;
    var inp='width:70px;text-align:center;border-radius:10px;border:2px solid '+s.c+';font-size:16px;font-weight:900;color:'+s.d+';padding:5px 0;outline:none;font-family:Nunito,sans-serif';
    html+='<div class="card" style="border:2px solid '+s.c+'33">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
      +'<div class="sicon" style="background:'+s.li+';width:38px;height:38px;border-radius:12px">'+s.e+'</div>'
      +'<div style="flex:1"><div style="font-weight:900;font-size:14px;color:#222">'+s.n+'</div>'
      +'<div style="font-size:12px;color:#666;font-weight:600">Bu ay: '+ss.total+' soru'+(ss.total>0?' · %'+ap+' doğruluk':'')+'</div></div></div>'
      +'<div style="background:'+s.bg+';border-radius:12px;padding:10px 12px">'
      +'<div style="font-size:12px;font-weight:800;color:'+s.d+';margin-bottom:6px">📋 AYLIK HEDEF SORU</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">'
      +'<button aria-label="'+s.n+' hedef soruyu azalt" style="'+btn+';background:#e5e7eb;color:#555" onclick="admGoalAdj(\''+s.id+'\',\'targetTotal\',-10)">−</button>'
      +'<input type="number" min="0" aria-label="'+s.n+' aylık hedef soru sayısı" value="'+(g.targetTotal||0)+'" style="'+inp+'" oninput="admGoalSet(\''+s.id+'\',\'targetTotal\',this.value)">'
      +'<button aria-label="'+s.n+' hedef soruyu artır" style="'+btn+';background:'+s.c+';color:white" onclick="admGoalAdj(\''+s.id+'\',\'targetTotal\',10)">+</button>'
      +'<span style="font-size:12px;font-weight:700;color:'+s.d+'">soru</span></div>'
      +'<div style="font-size:12px;font-weight:800;color:'+s.d+';margin-bottom:6px">🎯 DOĞRULUK HEDEFİ</div>'
      +'<div style="display:flex;align-items:center;gap:6px">'
      +'<button aria-label="'+s.n+' doğruluk hedefini azalt" style="'+btn+';background:#e5e7eb;color:#555" onclick="admGoalAdj(\''+s.id+'\',\'targetAccuracy\',-1)">−</button>'
      +'<input type="number" min="0" max="100" aria-label="'+s.n+' doğruluk hedefi yüzde" value="'+(g.targetAccuracy||0)+'" style="'+inp+'" oninput="admGoalSet(\''+s.id+'\',\'targetAccuracy\',this.value)">'
      +'<button aria-label="'+s.n+' doğruluk hedefini artır" style="'+btn+';background:'+s.c+';color:white" onclick="admGoalAdj(\''+s.id+'\',\'targetAccuracy\',1)">+</button>'
      +'<span style="font-size:12px;font-weight:700;color:'+s.d+'">% doğru</span></div>'
      +'</div></div>';
  });
  html+='<button onclick="admGoalSave()" style="width:100%;padding:15px;border-radius:16px;border:none;background:linear-gradient(135deg,var(--p),var(--v));color:white;font-size:16px;font-weight:900;box-shadow:0 4px 20px #4F46E555;font-family:Nunito,sans-serif;cursor:pointer">🎯 '+st.short+' hedeflerini kaydet</button>'
    +'<div role="status" style="text-align:center;font-size:13px;font-weight:800;margin:10px 4px;color:'+(admGoalMsg.indexOf("❌")===0?"#dc2626":"#15803d")+'">'+admGoalMsg+'</div>';
  document.getElementById("vw").innerHTML=html;
}

// Render LGS countdown widget
function lgsWidget(){
  var d = daysUntilLGS();
  var weeks = Math.floor(d/7), days = d%7;
  var urgency = d<=30?"#ef4444":d<=60?"#f59e0b":"#4F46E5";
  var emoji = d===0?"🎓":d<=7?"🔥":d<=30?"⚡":"📅";
  return '<div style="background:linear-gradient(135deg,'+urgency+','+urgency+'dd);border-radius:18px;padding:14px 18px;color:white;margin-bottom:12px;display:flex;align-items:center;gap:14px;box-shadow:0 4px 20px '+urgency+'44">'
    +'<div style="font-size:32px">'+emoji+'</div>'
    +'<div style="flex:1">'
    +'<div style="font-size:12px;font-weight:800;opacity:.8;letter-spacing:1px">LGS\'YE KALAN</div>'
    +'<div style="font-size:26px;font-weight:900;line-height:1.1">'+d+' <span style="font-size:14px;opacity:.85">gün</span></div>'
    +(weeks>0?'<div style="font-size:12px;opacity:.8;font-weight:700">'+weeks+' hafta '+days+' gün</div>':"")
    +'</div>'
    +'<div style="text-align:right">'
    +'<div style="font-size:12px;opacity:.75;font-weight:700">'+LGS_DATE.split("-").reverse().join(".")+'</div>'
    +(d>0?'<div style="font-size:12px;opacity:.85;font-weight:800;margin-top:2px">Devam et! 💪</div>'
      :'<div style="font-size:14px;font-weight:900;margin-top:2px">Başarılar! 🎓</div>')
    +'</div></div>';
}

// Streak widget
function streakWidget(){
  var s=calcStreak(), ls=calcLongestStreak();
  var fire = s>=7?"🔥":s>=3?"⚡":"📖";
  return '<div style="background:white;border-radius:14px;padding:11px 14px;margin-bottom:12px;box-shadow:0 2px 8px #0001;display:flex;align-items:center;gap:10px">'
    +'<div style="font-size:28px">'+fire+'</div>'
    +'<div style="flex:1">'
    +'<div style="font-size:12px;color:#666;font-weight:700">Çalışma Serisi</div>'
    +'<div style="font-size:20px;font-weight:900;color:'+(s>=3?"#f59e0b":"#4F46E5")+'">'+s+' <span style="font-size:13px">gün üst üste</span></div>'
    +'</div>'
    +'<div style="text-align:right">'
    +'<div style="font-size:12px;color:#767676;font-weight:700">En uzun seri</div>'
    +'<div style="font-size:16px;font-weight:900;color:#15803d">'+ls+' <span style="font-size:12px">gün</span></div>'
    +'</div></div>';
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN COMPARISON — SHARED HELPERS
//  Yönetici panelinde Ömer = recs, Zeynep = cmpRecs
// ═══════════════════════════════════════════════════════════════════
var cmpRecs = {};

function cmpMPrev(){var ms=availMonths(),i=ms.indexOf(selMonth);if(i>0){selMonth=ms[i-1];renderCmpMonthly();}}
function cmpMNext(){var ms=availMonths(),i=ms.indexOf(selMonth);if(i<ms.length-1){selMonth=ms[i+1];renderCmpMonthly();}}

// Stats from an arbitrary recs object
function stFrom(r,d){
  var t=0,c=0,w=0;
  SUBJ.forEach(function(s){var sr=(r[d]&&r[d][s.id])||{};t+=sr.total||0;c+=sr.correct||0;w+=cw(sr.total||0,sr.correct||0);});
  return {total:t,correct:c,wrong:w,net:calcNet(c,w)};
}
function mstFrom(r,ymStr,sid){
  var p=parseYM(ymStr),t=0,c=0,w=0;
  for(var d=1;d<=dim(p.y,p.m);d++){
    var key=ds(p.y,p.m,d),rec=r[key]; if(!rec)continue;
    var list=sid?[SUBJ.find(function(s){return s.id===sid;})]:SUBJ;
    list.forEach(function(s){if(!s)return;var sr=rec[s.id]||{};t+=sr.total||0;c+=sr.correct||0;w+=cw(sr.total||0,sr.correct||0);});
  }
  return {total:t,correct:c,wrong:w,net:calcNet(c,w)};
}
function wstFrom(r,ws,sid){
  var days=weekDays(ws),t=0,c=0,w=0;
  days.forEach(function(d){
    var rec=r[d]||{};
    var list=sid?[SUBJ.find(function(s){return s.id===sid;})]:SUBJ;
    list.forEach(function(s){if(!s)return;var sr=rec[s.id]||{};t+=sr.total||0;c+=sr.correct||0;w+=cw(sr.total||0,sr.correct||0);});
  });
  return {total:t,correct:c,wrong:w,net:calcNet(c,w)};
}
function allFrom(r){
  var allDays=Object.keys(r).filter(function(d){return d>=START;});
  var t=0,c=0,w=0;
  allDays.forEach(function(d){var s=stFrom(r,d);t+=s.total;c+=s.correct;w+=s.wrong;});
  return {total:t,correct:c,wrong:w,net:calcNet(c,w),days:allDays.filter(function(d){return stFrom(r,d).total>0;}).length};
}

function adminHeader(title,sub){
  return '<div style="background:linear-gradient(135deg,#d97706,#b45309);border-radius:18px;padding:12px 16px;color:white;margin-bottom:12px;display:flex;align-items:center;gap:12px">'
    +'<div style="font-size:28px">👑</div>'
    +'<div><div style="font-size:12px;opacity:.8;font-weight:700;letter-spacing:1px">YÖNETİCİ PANELİ</div>'
    +'<div style="font-size:15px;font-weight:900">'+title+'</div>'
    +(sub?'<div style="font-size:12px;opacity:.75">'+sub+'</div>':"")
    +'</div></div>';
}

function sideBySide(oSt,zSt){
  var ost=STUDENTS["omer"],zst=STUDENTS["zeynep"];
  var oAp=oSt.total>0?parseFloat((oSt.correct/oSt.total*100).toFixed(2)):0;
  var zAp=zSt.total>0?parseFloat((zSt.correct/zSt.total*100).toFixed(2)):0;
  function card(st,stats,ap,bg,tc){
    return '<div style="border-radius:14px;overflow:hidden;box-shadow:0 2px 10px #0001">'
      +'<div style="background:'+st.grad+';padding:10px;color:white;text-align:center">'
      +'<div style="font-size:24px">'+st.emoji+'</div>'
      +'<div style="font-size:12px;font-weight:900">'+st.short+'</div>'
      +'</div>'
      +'<div style="padding:10px;background:white;text-align:center">'
      +'<div style="font-size:24px;font-weight:900;color:#222">'+stats.total+'</div>'
      +'<div style="font-size:11px;color:#767676;font-weight:700;margin-bottom:4px">soru</div>'
      +'<div style="display:flex;justify-content:center;gap:6px;font-size:12px;font-weight:800;margin-bottom:3px">'
      +'<span style="color:#15803d">✓'+stats.correct+'</span>'
      +'<span style="color:#dc2626">✗'+stats.wrong+'</span>'
      +'</div>'
      +(stats.total>0?'<div style="font-size:12px;font-weight:700;color:#666;margin-bottom:3px">%'+ap+' doğru</div>':"")
      +'<div style="font-size:14px;font-weight:900;color:'+(stats.net>=0?"#15803d":"#dc2626")+'">'+fnet(stats.net)+' net</div>'
      +'</div></div>';
  }
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
    +card(ost,oSt,oAp)+card(zst,zSt,zAp)+'</div>';
}

function subjTable(oRecs,zRecs,label,getStat){
  var ost=STUDENTS["omer"],zst=STUDENTS["zeynep"];
  var html='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:10px">'+label+'</div>';
  var any=false;
  SUBJ.forEach(function(s){
    var oS=getStat(oRecs,s.id),zS=getStat(zRecs,s.id);
    if(!oS.total&&!zS.total)return;
    any=true;
    var oPct=oS.total>0?parseFloat((oS.correct/oS.total*100).toFixed(2)):0;
    var zPct=zS.total>0?parseFloat((zS.correct/zS.total*100).toFixed(2)):0;
    html+='<div style="padding:9px 0;border-bottom:1px solid #f3f4f6">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
      +'<span style="font-size:18px">'+s.e+'</span>'
      +'<span style="font-size:13px;font-weight:900;color:#333;flex:1">'+s.n+'</span>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      +'<div style="background:#EEF2FF;border-radius:8px;padding:6px 8px">'
      +'<div style="font-size:11px;font-weight:800;color:#4F46E5;margin-bottom:2px">'+ost.emoji+' '+ost.short+'</div>'
      +'<div style="font-size:12px;font-weight:700;color:#555">'+oS.total+' soru · %'+oPct+'</div>'
      +'<div style="font-size:14px;font-weight:900;color:'+(oS.net>=0?"#15803d":"#dc2626")+'">'+fnet(oS.net)+' net</div>'
      +'</div>'
      +'<div style="background:#FDF2F8;border-radius:8px;padding:6px 8px">'
      +'<div style="font-size:11px;font-weight:800;color:#DB2777;margin-bottom:2px">'+zst.emoji+' '+zst.short+'</div>'
      +'<div style="font-size:12px;font-weight:700;color:#555">'+zS.total+' soru · %'+zPct+'</div>'
      +'<div style="font-size:14px;font-weight:900;color:'+(zS.net>=0?"#15803d":"#dc2626")+'">'+fnet(zS.net)+' net</div>'
      +'</div></div></div>';
  });
  if(!any) html+='<div class="empty" style="padding:16px">Henüz veri yok</div>';
  html+='</div>';
  return html;
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN VIEW 1 — GÜNLÜK
// ═══════════════════════════════════════════════════════════════════
function renderCmpDaily(){
  var td=today();
  var oTd=stFrom(recs,selDate), zTd=stFrom(cmpRecs,selDate);
  var p=parseYM(selDate.slice(0,7));

  // Calendar
  var calDays=dim(p.y,p.m);
  var fdow=new Date(p.y,p.m,1).getDay();
  var cells="";
  for(var i=0;i<fdow;i++) cells+="<div></div>";
  for(var d2=1;d2<=calDays;d2++){
    var dstr=ds(p.y,p.m,d2);
    var oS=stFrom(recs,dstr).total>0, zS=stFrom(cmpRecs,dstr).total>0;
    var isSel=dstr===selDate, isTd=dstr===td, isOff=dstr>td||dstr<START;
    var cls="cday"+(isSel?" sel":isTd?" tdy":isOff?" off":"");
    var dot=oS&&zS?"●":oS?"◐":zS?"◑":"";
    cells+='<div style="position:relative">'
      +'<button class="'+cls+'"'+(isOff?"":" onclick=\"selCmpDay('"+dstr+"')\"")+'>'
      +d2+'</button>'
      +(dot?'<div style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);font-size:6px;color:'+(isSel?"white":"var(--p)")+'">'+dot+'</div>':"")
      +'</div>';
  }

  var html=adminHeader("Günlük Karşılaştırma","Bugün: "+td.split("-").reverse().join("."))
    +'<div class="period-nav">'
    +'<button aria-label="Önceki" onclick="cmpCalPrev()">‹</button>'
    +'<span>'+MONTHS[p.m]+' '+p.y+'</span>'
    +'<button aria-label="Sonraki" onclick="cmpCalNext()">›</button></div>'
    +'<div class="cal" style="margin-bottom:10px">'
    +'<div class="cal-hdr">'+["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"].map(function(d){return'<div>'+d+'</div>';}).join("")+'</div>'
    +'<div class="cal-grid">'+cells+'</div></div>'
    +'<div style="background:white;border-radius:12px;padding:8px 14px;margin-bottom:10px;box-shadow:0 2px 8px #0001;font-size:13px;font-weight:800;color:#666">'
    +'Seçili: '+selDate.split("-").reverse().join(".")
    +(selDate===td?' <span style="color:var(--p)">● Bugün</span>':"")
    +'</div>';

  html+=sideBySide(oTd,zTd);
  html+=subjTable(recs,cmpRecs,"📚 Ders Bazında",function(r,sid){
    var sr=(r[selDate]&&r[selDate][sid])||{total:0,correct:0};
    var w=cw(sr.total||0,sr.correct||0);
    return {total:sr.total||0,correct:sr.correct||0,wrong:w,net:calcNet(sr.correct||0,w)};
  });
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:6px">📊 Son 14 Gün — Toplam Soru</div><div style="position:relative;height:180px"><canvas id="adm-daily-bar" role="img" aria-label="Günlük karşılaştırma grafiği"></canvas></div></div>';
  document.getElementById("vw").innerHTML=html;
  setTimeout(function(){ drawAdmDailyBar(); },50);
}

function selCmpDay(d){ selDate=d; renderCmpDaily(); }
function cmpCalPrev(){
  var p=parseYM(selDate.slice(0,7)),nm=p.m-1,ny=p.y;
  if(nm<0){nm=11;ny--;}
  if(ds(ny,nm,1)<START)return;
  selDate=ds(ny,nm,1); renderCmpDaily();
}
function cmpCalNext(){
  var p=parseYM(selDate.slice(0,7)),nm=p.m+1,ny=p.y;
  if(nm>11){nm=0;ny++;}
  var now=parseYM(ymNow());
  if(ny>now.y||(ny===now.y&&nm>now.m))return;
  selDate=ds(ny,nm,1); renderCmpDaily();
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN VIEW 2 — HAFTALIK
// ═══════════════════════════════════════════════════════════════════
function renderCmpWeekly(){
  var days=weekDays(selWeekStart);
  var oW=wstFrom(recs,selWeekStart), zW=wstFrom(cmpRecs,selWeekStart);
  var label=fmtD(selWeekStart)+" – "+fmtD(days[6]);
  var dnames=["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

  var html=adminHeader("Haftalık Karşılaştırma",label)
    +'<div class="period-nav">'
    +'<button aria-label="Önceki" onclick="cmpWkPrev()">‹</button>'
    +'<span style="font-size:14px">'+label+'</span>'
    +'<button aria-label="Sonraki" onclick="cmpWkNext()">›</button></div>';

  html+=sideBySide(oW,zW);

  // Daily breakdown for week
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:8px">Günlük Detay</div>';
  days.forEach(function(d,i){
    var oD=stFrom(recs,d), zD=stFrom(cmpRecs,d);
    var isTd=d===today(), isOff=d>today()||d<START;
    html+='<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f3f4f6'+(isOff?";opacity:.4":"")+(d===selDate?";background:#f8f8ff":"")+'">'
      +'<div style="min-width:40px;text-align:center">'
      +'<div style="font-size:11px;font-weight:800;color:#767676">'+dnames[i]+'</div>'
      +'<div style="font-size:14px;font-weight:900;color:'+(isTd?"var(--p)":"#333")+'">'+parseInt(d.split("-")[2])+'</div>'
      +'</div>'
      +'<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      +'<div style="background:#EEF2FF;border-radius:7px;padding:4px 7px;text-align:center">'
      +'<div style="font-size:11px;font-weight:800;color:#4F46E5">👦</div>'
      +(oD.total?'<div style="font-size:13px;font-weight:900;color:'+(oD.net>=0?"#15803d":"#dc2626")+'">'+fnet(oD.net)+'</div><div style="font-size:11px;color:#666">'+oD.total+'s</div>'
        :'<div style="font-size:11px;color:#767676">—</div>')
      +'</div>'
      +'<div style="background:#FDF2F8;border-radius:7px;padding:4px 7px;text-align:center">'
      +'<div style="font-size:11px;font-weight:800;color:#DB2777">👧</div>'
      +(zD.total?'<div style="font-size:13px;font-weight:900;color:'+(zD.net>=0?"#15803d":"#dc2626")+'">'+fnet(zD.net)+'</div><div style="font-size:11px;color:#666">'+zD.total+'s</div>'
        :'<div style="font-size:11px;color:#767676">—</div>')
      +'</div></div></div>';
  });
  html+='</div>';
  html+=subjTable(recs,cmpRecs,"📚 Haftalık Ders Bazında",function(r,sid){
    return wstFrom(r,selWeekStart,sid);
  });
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:6px">📊 Son 12 Hafta — Toplam Soru</div><div style="position:relative;height:200px"><canvas id="adm-weekly-bar" role="img" aria-label="Haftalık karşılaştırma grafiği"></canvas></div></div>';
  document.getElementById("vw").innerHTML=html;
  setTimeout(function(){ drawAdmWeeklyBar(); },50);
}
function cmpWkPrev(){var p=addDays(selWeekStart,-7);if(p<START)return;selWeekStart=p;renderCmpWeekly();}
function cmpWkNext(){var n=addDays(selWeekStart,7),td=today();if(n>weekStart(td))return;selWeekStart=n;renderCmpWeekly();}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN VIEW 3 — AYLIK
// ═══════════════════════════════════════════════════════════════════
function renderCmpMonthly(){
  var pm=parseYM(selMonth);
  var oM=mstFrom(recs,selMonth), zM=mstFrom(cmpRecs,selMonth);

  var html=adminHeader("Aylık Karşılaştırma",MONTHS[pm.m]+" "+pm.y)
    +'<div class="period-nav">'
    +'<button aria-label="Önceki" onclick="cmpMPrev()">‹</button>'
    +'<span>'+MONTHS[pm.m]+' '+pm.y+'</span>'
    +'<button aria-label="Sonraki" onclick="cmpMNext()">›</button></div>';

  html+=sideBySide(oM,zM);
  html+=subjTable(recs,cmpRecs,"📚 Aylık Ders Bazında",function(r,sid){
    return mstFrom(r,selMonth,sid);
  });

  // Active days per student
  var oDays=Object.keys(recs).filter(function(d){return d.startsWith(selMonth)&&stFrom(recs,d).total>0;}).length;
  var zDays=Object.keys(cmpRecs).filter(function(d){return d.startsWith(selMonth)&&stFrom(cmpRecs,d).total>0;}).length;
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:6px">📊 Aylık Soru Karşılaştırması</div><div style="position:relative;height:200px"><canvas id="adm-monthly-bar" role="img" aria-label="Aylık karşılaştırma grafiği"></canvas></div></div>';
  html+='<div class="card"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div style="text-align:center"><div style="font-size:12px;color:#666;font-weight:700;margin-bottom:4px">👦 Aktif Gün</div><div style="font-size:26px;font-weight:900;color:#4F46E5">'+oDays+'</div></div>'
    +'<div style="text-align:center"><div style="font-size:12px;color:#666;font-weight:700;margin-bottom:4px">👧 Aktif Gün</div><div style="font-size:26px;font-weight:900;color:#DB2777">'+zDays+'</div></div>'
    +'</div></div>';

  document.getElementById("vw").innerHTML=html;
  setTimeout(function(){ drawAdmMonthlyBar(); },50);
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN VIEW 4 — GENEL (TÜM ZAMANLAR)
// ═══════════════════════════════════════════════════════════════════
function renderCmpAll(){
  var oAll=allFrom(recs), zAll=allFrom(cmpRecs);

  var html=adminHeader("Genel Karşılaştırma","Tüm zamanlar · 1 Ocak 2026\'dan itibaren");
  html+=sideBySide(oAll,zAll);

  // Active days
  html+='<div class="sgrid2" style="margin-bottom:12px">'
    +'<div style="background:#EEF2FF;border-radius:14px;padding:14px;text-align:center"><div style="font-size:12px;color:#4F46E5;font-weight:700">👦 Aktif Gün</div><div style="font-size:28px;font-weight:900;color:#4F46E5">'+oAll.days+'</div></div>'
    +'<div style="background:#FDF2F8;border-radius:14px;padding:14px;text-align:center"><div style="font-size:12px;color:#DB2777;font-weight:700">👧 Aktif Gün</div><div style="font-size:28px;font-weight:900;color:#DB2777">'+zAll.days+'</div></div>'
    +'</div>';

  // Monthly trend table
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:8px">📈 Aylık Net Karşılaştırması</div>';
  html+='<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:4px;font-size:12px;font-weight:800;color:#767676;padding:0 0 6px;border-bottom:2px solid #f3f4f6">'
    +'<div>Ay</div><div style="text-align:center">👦</div><div style="text-align:center">👧</div></div>';
  availMonths().forEach(function(ymStr){
    var oM2=mstFrom(recs,ymStr), zM2=mstFrom(cmpRecs,ymStr);
    if(!oM2.total&&!zM2.total)return;
    var p2=parseYM(ymStr);
    html+='<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:4px;padding:7px 0;border-bottom:1px solid #f3f4f6;align-items:center">'
      +'<div style="font-size:12px;font-weight:800;color:var(--p);min-width:60px">'+MONTHS[p2.m].substring(0,3)+'</div>'
      +'<div style="text-align:center">'
      +(oM2.total?'<div style="font-size:13px;font-weight:900;color:'+(oM2.net>=0?"#15803d":"#dc2626")+'">'+fnet(oM2.net)+'</div><div style="font-size:11px;color:#767676">'+oM2.total+'s</div>'
        :'<div style="font-size:12px;color:#767676">—</div>')
      +'</div>'
      +'<div style="text-align:center">'
      +(zM2.total?'<div style="font-size:13px;font-weight:900;color:'+(zM2.net>=0?"#15803d":"#dc2626")+'">'+fnet(zM2.net)+'</div><div style="font-size:11px;color:#767676">'+zM2.total+'s</div>'
        :'<div style="font-size:12px;color:#767676">—</div>')
      +'</div></div>';
  });
  html+='</div>';
  document.getElementById("vw").innerHTML=html;
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN VIEW 5 — DERS BAZINDA
// ═══════════════════════════════════════════════════════════════════
function renderCmpSubj(){
  var html=adminHeader("Ders Bazında Karşılaştırma","Tüm dersler · Tüm zamanlar");

  // Per-subject full stats
  SUBJ.forEach(function(s){
    var oAll=allFromSid(recs,s.id), zAll=allFromSid(cmpRecs,s.id);
    if(!oAll.total&&!zAll.total)return;
    var oPct=oAll.total>0?parseFloat((oAll.correct/oAll.total*100).toFixed(2)):0;
    var zPct=zAll.total>0?parseFloat((zAll.correct/zAll.total*100).toFixed(2)):0;
    html+='<div class="card" style="margin-bottom:10px;border-top:3px solid '+s.c+'">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
      +'<div style="width:38px;height:38px;border-radius:11px;background:'+s.li+';display:flex;align-items:center;justify-content:center;font-size:20px">'+s.e+'</div>'
      +'<div style="font-weight:900;font-size:15px;color:#222">'+s.n+'</div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +'<div style="background:#EEF2FF;border-radius:12px;padding:12px;text-align:center">'
      +'<div style="font-size:12px;font-weight:800;color:#4F46E5;margin-bottom:6px">👦 Ömer Doruk</div>'
      +'<div style="font-size:22px;font-weight:900;color:#222">'+oAll.total+'</div>'
      +'<div style="font-size:12px;color:#767676;margin-bottom:4px">soru</div>'
      +'<div style="display:flex;justify-content:center;gap:6px;font-size:12px;font-weight:800">'
      +'<span style="color:#15803d">✓'+oAll.correct+'</span><span style="color:#dc2626">✗'+oAll.wrong+'</span></div>'
      +(oAll.total?'<div style="font-size:12px;color:#666;font-weight:700;margin:3px 0">%'+oPct+' doğru</div>':"")
      +'<div style="font-size:15px;font-weight:900;color:'+(oAll.net>=0?"#15803d":"#dc2626")+'">'+fnet(oAll.net)+' net</div>'
      +ring(oPct,"#4F46E5",52)
      +'</div>'
      +'<div style="background:#FDF2F8;border-radius:12px;padding:12px;text-align:center">'
      +'<div style="font-size:12px;font-weight:800;color:#DB2777;margin-bottom:6px">👧 Zeynep Alya</div>'
      +'<div style="font-size:22px;font-weight:900;color:#222">'+zAll.total+'</div>'
      +'<div style="font-size:12px;color:#767676;margin-bottom:4px">soru</div>'
      +'<div style="display:flex;justify-content:center;gap:6px;font-size:12px;font-weight:800">'
      +'<span style="color:#15803d">✓'+zAll.correct+'</span><span style="color:#dc2626">✗'+zAll.wrong+'</span></div>'
      +(zAll.total?'<div style="font-size:12px;color:#666;font-weight:700;margin:3px 0">%'+zPct+' doğru</div>':"")
      +'<div style="font-size:15px;font-weight:900;color:'+(zAll.net>=0?"#15803d":"#dc2626")+'">'+fnet(zAll.net)+' net</div>'
      +ring(zPct,"#DB2777",52)
      +'</div></div>'
      // Monthly breakdown for this subject
      +'<div style="margin-top:12px"><div style="font-size:12px;font-weight:800;color:#767676;margin-bottom:6px">AYLIK NET</div>'
      +'<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:3px;font-size:12px">';
    availMonths().forEach(function(ymStr){
      var oM=mstFrom(recs,ymStr,s.id), zM=mstFrom(cmpRecs,ymStr,s.id);
      if(!oM.total&&!zM.total)return;
      var p3=parseYM(ymStr);
      html+='<div style="color:#666;font-weight:700;padding:3px 0;border-bottom:1px solid #f3f4f6">'+MONTHS[p3.m].substring(0,3)+'</div>'
        +'<div style="text-align:center;padding:3px 0;border-bottom:1px solid #f3f4f6;font-weight:900;color:'+(oM.net>=0?"#15803d":"#dc2626")+'">'+(oM.total?fnet(oM.net):"—")+'</div>'
        +'<div style="text-align:center;padding:3px 0;border-bottom:1px solid #f3f4f6;font-weight:900;color:'+(zM.net>=0?"#15803d":"#dc2626")+'">'+(zM.total?fnet(zM.net):"—")+'</div>';
    });
    html+='</div></div></div>';
  });
  document.getElementById("vw").innerHTML=html;
}

function allFromSid(r,sid){
  var allDays=Object.keys(r).filter(function(d){return d>=START;});
  var t=0,c=0;
  allDays.forEach(function(d){var sr=(r[d]&&r[d][sid])||{};t+=sr.total||0;c+=sr.correct||0;});
  var w=cw(t,c);
  return {total:t,correct:c,wrong:w,net:calcNet(c,w)};
}


// ═══════════════════════════════════════════════════════════════════
//  ADMIN VIEW 6 — İSTATİSTİK (ay seçimi, ders bazlı oran, aylık değişim)
//  Ömer = recs, Zeynep = cmpRecs
// ═══════════════════════════════════════════════════════════════════
var admSelMonths = [], admStudent = 'omer', admMetric = 'acc';

function admRecs(sid){ return sid==='omer'?recs:cmpRecs; }
function admStat(sid){ var r=admRecs(sid); return function(m,subj){ return mstFrom(r,m,subj); }; }
function admDataMonths(){
  return availMonths().filter(function(m){ return mstFrom(recs,m).total>0||mstFrom(cmpRecs,m).total>0; });
}
function admUseMonths(){
  var all=admDataMonths();
  var sel=admSelMonths.filter(function(m){ return all.indexOf(m)>=0; });
  return sel.length?sel:all;
}
function admToggleMonth(m){
  var i=admSelMonths.indexOf(m);
  if(i>=0) admSelMonths.splice(i,1); else admSelMonths.push(m);
  renderCmpStats();
}
function admSetMonths(l){ admSelMonths=l; renderCmpStats(); }
function admSetStudent(s){ admStudent=s; renderCmpStats(); }
function admSetMetric(m){ admMetric=m; renderCmpStats(); }

function admAgg(sid,months,subj){
  var f=admStat(sid), t=0,c=0,w=0;
  months.forEach(function(m){ var x=f(m,subj); t+=x.total; c+=x.correct; w+=x.wrong; });
  return {total:t,correct:c,wrong:w,net:calcNet(c,w)};
}
// İlk ve son veri olan ay arasındaki doğruluk farkı (yüzde puan); en az 2 ay verisi yoksa boş
function admDelta(sid,months,subj){
  var f=admStat(sid), s=[];
  months.forEach(function(m){ var v=metricVal(f(m,subj),'acc'); if(v!==null) s.push(v); });
  if(s.length<2) return "";
  var dv=parseFloat((s[s.length-1]-s[0]).toFixed(2));
  return ' <span style="font-size:12px;font-weight:900;color:'+(dv>0?"#15803d":dv<0?"#dc2626":"#666")+'">'+(dv>0?"▲ +":dv<0?"▼ ":"= ")+dv+'</span>';
}

var admInit = false;
function renderCmpStats(){
  if(!admInit){ admSelMonths=defaultMonthSel(admDataMonths()); admInit=true; }
  var all=admDataMonths(), use=admUseMonths();
  var sel=admSelMonths.filter(function(m){ return all.indexOf(m)>=0; });
  var ost=STUDENTS.omer, zst=STUDENTS.zeynep;
  var html=adminHeader("İstatistik","Ay seçimi, ders bazlı oran ve aylık değişim");

  // Ay seçimi
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:8px">🗓️ Ay Seçimi</div>'
    +'<div style="font-size:12px;color:#767676;font-weight:700;margin-bottom:8px">Bir veya birden fazla ay seçin. Seçim yoksa tüm aylar gösterilir.</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
    +'<button class="chart-tab'+(sel.length?'':' act')+'" onclick="admSetMonths([])">Tümü</button>'
    +all.map(function(m){
      var p=parseYM(m);
      return '<button class="chart-tab'+(sel.indexOf(m)>=0?' act':'')+'" onclick="admToggleMonth(\''+m+'\')">'+MONTHS[p.m]+' '+p.y+'</button>';
    }).join("")+'</div></div>';

  // İki öğrenci yan yana (seçili aylar toplamı)
  html+=sideBySide(admAgg('omer',use),admAgg('zeynep',use));

  // Ders bazlı tablo
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:10px">📚 Ders Bazında Doğru / Yanlış</div>';
  var any=false;
  SUBJ.forEach(function(sj){
    var o=admAgg('omer',use,sj.id), z=admAgg('zeynep',use,sj.id);
    if(!o.total&&!z.total) return;
    any=true;
    function box(st,x,bg,tc,sid){
      var pct=x.total>0?parseFloat((x.correct/x.total*100).toFixed(2)):0;
      return '<div style="background:'+bg+';border-radius:8px;padding:6px 8px">'
        +'<div style="font-size:11px;font-weight:800;color:'+tc+';margin-bottom:2px">'+st.emoji+' '+st.short+'</div>'
        +'<div style="font-size:12px;font-weight:700;color:#555">'+x.total+' soru · %'+pct+(x.total?admDelta(sid,use,sj.id):'')+'</div>'
        +'<div style="font-size:12px;font-weight:800"><span style="color:#15803d">✓'+x.correct+'</span> <span style="color:#dc2626">✗'+x.wrong+'</span></div>'
        +'<div style="font-size:14px;font-weight:900;color:'+(x.net>=0?"#15803d":"#dc2626")+'">'+fnet(x.net)+' net</div></div>';
    }
    html+='<div style="padding:9px 0;border-bottom:1px solid #f3f4f6">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><span style="font-size:18px">'+sj.e+'</span><span style="font-size:13px;font-weight:900;color:#333">'+sj.n+'</span></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'+box(ost,o,'#EEF2FF','#4F46E5','omer')+box(zst,z,'#FDF2F8','#DB2777','zeynep')+'</div></div>';
  });
  if(!any) html+='<div class="empty" style="padding:16px">Seçilen aylarda veri yok</div>';
  else html+='<div style="font-size:12px;color:#767676;font-weight:700;margin-top:6px">▲▼ ilk ve son veri olan ay arasındaki doğruluk değişimi (yüzde puan)</div>';
  html+='</div>';

  // Öğrenci seçimi + grafikler
  var stBtn=function(sid,st){ return '<button class="chart-tab'+(admStudent===sid?' act':'')+'" onclick="admSetStudent(\''+sid+'\')">'+st.emoji+' '+st.short+'</button>'; };
  var mBtns=[['acc','Doğruluk %'],['wrong','Yanlış %'],['net','Net']].map(function(o){
    return '<button class="chart-tab'+(admMetric===o[0]?' act':'')+'" onclick="admSetMetric(\''+o[0]+'\')">'+o[1]+'</button>';
  }).join("");
  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:8px">📊 Öğrenci Bazında Ders Grafikleri</div>'
    +'<div style="display:flex;gap:6px;margin-bottom:10px">'+stBtn('omer',ost)+stBtn('zeynep',zst)+'</div>'
    +'<div style="font-size:13px;font-weight:800;color:#555;margin-bottom:4px">Doğru / Yanlış Oranı</div>'
    +'<div style="position:relative;height:'+(60+SUBJ.length*30)+'px"><canvas id="adm-stack" role="img" aria-label="Ders bazında doğru ve yanlış oranı grafiği"></canvas></div>'
    +'<div style="font-size:13px;font-weight:800;color:#555;margin:16px 0 6px">Aylara Göre Değişim</div>'
    +'<div style="display:flex;gap:6px;margin-bottom:8px">'+mBtns+'</div>'
    +(use.length>1?'<div style="position:relative;height:260px"><canvas id="adm-trend" role="img" aria-label="Aylara göre ders değişim grafiği"></canvas></div>'
      :'<div style="font-size:13px;color:#767676;font-weight:700;padding:14px 0">Değişim grafiği için en az 2 ay gerekir.</div>')
    +'</div>';

  html+='<div class="card"><div class="card-ttl" style="font-size:14px;margin-bottom:8px">👦👧 İki Öğrenci, Aylık Genel Değişim</div>'
    +(use.length>1?'<div style="position:relative;height:240px"><canvas id="adm-both" role="img" aria-label="İki öğrenci aylık genel değişim grafiği"></canvas></div>'
      :'<div style="font-size:13px;color:#767676;font-weight:700;padding:14px 0">Değişim grafiği için en az 2 ay gerekir.</div>')
    +'<div style="font-size:12px;color:#767676;font-weight:700;margin-top:8px">Metrik seçimi yukarıdaki düğmelerle aynıdır · Net = Doğru − Yanlış ÷ '+NET_DIVISOR+'</div></div>';

  document.getElementById("vw").innerHTML=html;
  setTimeout(function(){ drawAdmStatsCharts(); },30);
}

function drawAdmStatsCharts(){
  var use=admUseMonths();
  drawStackChart('adm-stack','admStack',use,admStat(admStudent));
  drawTrendChart('adm-trend','admTrend',use,admMetric,admStat(admStudent));
  destroyChart('admBoth');
  var el=document.getElementById('adm-both');
  if(!el||use.length<2) return;
  var mk=function(sid,color,dash,pt){
    var f=admStat(sid);
    return {label:STUDENTS[sid].short,data:use.map(function(m){return metricVal(f(m),admMetric);}),
      borderColor:color,backgroundColor:color,borderWidth:2.5,borderDash:dash,pointStyle:pt,pointRadius:5,tension:0.25,spanGaps:true};
  };
  _charts['admBoth']=lineChart(el,use.map(smLabel),[mk('omer','#4F46E5',[],'circle'),mk('zeynep','#DB2777',[6,3],'rect')],admMetric);
}




// ═══════════════════════════════════════════════════════════════════
//  VERİ YEDEKLEMESİ
// ═══════════════════════════════════════════════════════════════════
var _backupPending = false;

function backupAndSend(){
  if(_backupPending) return;
  if(!db){ setBackupMsg("❌ Veritabanı bağlantısı yok.","#ef4444"); return; }
  // Okuma yetkisi yönetici hesabındadır; şifre sorulur
  withAdmin(function(){
    _backupPending = true;
    setBackupMsg("⏳ Veriler toplanıyor...","#f59e0b");
    var allData = {omer:{}, zeynep:{}};
    var loaded = 0, failed = false;
    ["omer","zeynep"].forEach(function(sid){
      db.ref("records/"+sid).once("value", function(snap){
        allData[sid] = snap.val()||{};
        if(++loaded===2 && !failed){ generateBackupExcel(allData); authSignOut(); }
      }, function(err){
        // Okunamayan veriyle boş yedek üretilmez
        if(!failed){
          failed = true; _backupPending = false; authSignOut();
          setBackupMsg("❌ Veri okunamadı: "+((err&&err.message)||"izin yok"),"#ef4444");
        }
      });
    });
  }, setBackupMsg);
}

// Yönetici şifresiyle giriş yapar (yedek ve Excel yükleme için); başarılıysa cb çalışır
function withAdmin(cb, onMsg){
  var pw = prompt("Yönetici şifresi:");
  if(pw === null){ onMsg("İptal edildi.","#aaa"); return; }
  onMsg("⏳ Giriş yapılıyor...","#f59e0b");
  authSignIn("admin",pw).then(cb).catch(function(e){ onMsg("❌ "+authErrMsg(e),"#ef4444"); });
}

function setBackupMsg(msg, color){
  var el = document.getElementById("backup-msg");
  if(el) el.innerHTML = '<span style="color:'+color+'">'+msg+'</span>';
}

function generateBackupExcel(allData){
  setBackupMsg("⏳ Excel oluşturuluyor...","#f59e0b");
  try{
    var XLSXlib = window.XLSX;
    if(!XLSXlib){ setBackupMsg("❌ Excel kütüphanesi yüklenmedi.","#ef4444"); _backupPending=false; return; }

    var wb = XLSXlib.utils.book_new();
    var subjNames = SUBJ.map(function(s){ return s.n; });
    var subjIds   = SUBJ_IDS;
    var now = new Date();
    var dateStr = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");

    // ── Özet sayfası ──
    var sumRows = [
      ["LGS Hazırlık Soru Takip — Yedekleme"],
      ["Tarih: "+dateStr],
      [""],
      ["Öğrenci","Toplam Soru","Doğru","Yanlış","Net","Aktif Gün"]
    ];
    ["omer","zeynep"].forEach(function(sid){
      var r=allData[sid]; var t=0,corr=0;
      var activeDays=Object.keys(r).filter(function(d){
        var dt=0; subjIds.forEach(function(s){dt+=(r[d][s]&&r[d][s].total)||0;}); return dt>0;
      }).length;
      Object.keys(r).forEach(function(d){
        subjIds.forEach(function(s){ t+=(r[d][s]&&r[d][s].total)||0; corr+=(r[d][s]&&r[d][s].correct)||0; });
      });
      var w=t-corr; var net=Math.round(calcNet(corr,w)*100)/100;
      sumRows.push([STUDENTS[sid].name, t, corr, w, net, activeDays]);
    });
    var ws0 = XLSXlib.utils.aoa_to_sheet(sumRows);
    ws0["!cols"] = [{wch:26},{wch:14},{wch:10},{wch:10},{wch:10},{wch:12}];
    XLSXlib.utils.book_append_sheet(wb, ws0, "Özet");

    // ── Her öğrenci için ayrı sayfa ──
    ["omer","zeynep"].forEach(function(sid){
      var r = allData[sid];
      // Row 1: subject group headers (merged pairs)
      var hdr1 = [""];
      subjNames.forEach(function(n){ hdr1.push(n,""); });
      // Row 2: column headers
      var hdr2 = ["Tarih"];
      subjIds.forEach(function(){ hdr2.push("Toplam","Doğru"); });
      var rows = [hdr1, hdr2];
      // Data rows sorted by date
      Object.keys(r).sort().forEach(function(d){
        var row = [d]; var hasAny=false;
        subjIds.forEach(function(s){
          var t=(r[d][s]&&r[d][s].total)||0;
          var co=(r[d][s]&&r[d][s].correct)||0;
          row.push(t||"", co||"");
          if(t>0) hasAny=true;
        });
        if(hasAny) rows.push(row);
      });
      var ws = XLSXlib.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{wch:13}];
      for(var i=0;i<14;i++) ws["!cols"].push({wch:9});
      XLSXlib.utils.book_append_sheet(wb, ws, STUDENTS[sid].short);
    });

    XLSXlib.writeFile(wb, "LGS_Yedek_"+dateStr+".xlsx");
    setBackupMsg("✅ Yedek indirildi: LGS_Yedek_"+dateStr+".xlsx","#22c55e");
    setTimeout(function(){ setBackupMsg("","#000"); }, 5000);
    _backupPending = false;
  } catch(e){
    setBackupMsg("❌ Hata: "+e.message,"#ef4444");
    _backupPending = false;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PROFİL RESMİ (Firebase Realtime DB'de base64 saklanır)
// ═══════════════════════════════════════════════════════════════════
var _avatarPendingData = null; // base64 string waiting to save

function loadProfilePics(){
  if(!db) return;
  ["omer","zeynep"].forEach(function(sid){
    db.ref("profiles/"+sid+"/avatar").once("value",function(snap){
      var b64 = snap.val();
      PROFILE_PICS[sid] = b64||null;
      applyAvatar(sid, b64);
    },function(){}); // oturum yoksa ya da süresi dolmuşsa resimler yüklenmez, sessizce geçilir
  });
}

function applyAvatar(sid, b64){
  var st = STUDENTS[sid];
  // picker button avatar
  var pickEl = document.getElementById("pick-avatar-"+sid);
  if(pickEl){
    if(b64){ pickEl.style.backgroundImage="url('"+b64+"')"; pickEl.style.backgroundSize="cover"; pickEl.textContent=""; }
    else    { pickEl.style.backgroundImage="none"; pickEl.textContent=st.emoji; }
  }
  // teacher modal avatar
  var tmEl = document.getElementById("tm-avatar-"+sid);
  if(tmEl){
    if(b64){ tmEl.style.backgroundImage="url('"+b64+"')"; tmEl.style.backgroundSize="cover"; tmEl.textContent=""; }
    else    { tmEl.style.backgroundImage="none"; tmEl.textContent=st.emoji; }
  }
  // header avatar (only if current student)
  if(sid===curStudent){
    var hEl = document.getElementById("hdr-avatar");
    if(hEl){
      if(b64){ hEl.style.backgroundImage="url('"+b64+"')"; hEl.style.backgroundSize="cover"; hEl.textContent=""; }
      else    { hEl.style.backgroundImage="none"; hEl.textContent=st.emoji; }
    }
  }
}

function openAvatarModal(){
  if(!curStudent||curStudent==="admin"||READONLY||_teacherMode) return;
  _avatarPendingData = null;
  var prev = PROFILE_PICS[curStudent];
  var previewEl = document.getElementById("avatar-preview");
  if(prev){ previewEl.style.backgroundImage="url('"+prev+"')"; previewEl.style.backgroundSize="cover"; previewEl.textContent=""; }
  else     { previewEl.style.backgroundImage="none"; previewEl.textContent=STUDENTS[curStudent].emoji; }
  document.getElementById("avatar-modal").style.display="flex";
}

function closeAvatarModal(){
  document.getElementById("avatar-modal").style.display="none";
  _avatarPendingData=null;
}

function previewAvatar(input){
  var file=input.files[0]; if(!file) return;
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var sz=200; // output square size
      var canvas=document.createElement("canvas");
      canvas.width=sz; canvas.height=sz;
      var ctx=canvas.getContext("2d");
      // Center-crop: take the largest centered square from the source
      var srcSize=Math.min(img.width,img.height);
      var sx=(img.width-srcSize)/2;
      var sy=(img.height-srcSize)/2;
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, sz, sz);
      _avatarPendingData=canvas.toDataURL("image/jpeg",0.85);
      var prev=document.getElementById("avatar-preview");
      prev.style.backgroundImage="url('"+_avatarPendingData+"')";
      prev.style.backgroundSize="cover";
      prev.style.backgroundPosition="center";
      prev.textContent="";
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveAvatar(){
  if(!_avatarPendingData||!curStudent){ closeAvatarModal(); return; }
  var btn=document.getElementById("avatar-save-btn");
  btn.textContent="⏳ Kaydediliyor..."; btn.disabled=true;
  db.ref("profiles/"+curStudent+"/avatar").set(_avatarPendingData)
    .then(function(){
      PROFILE_PICS[curStudent]=_avatarPendingData;
      applyAvatar(curStudent,_avatarPendingData);
      closeAvatarModal();
      btn.textContent="💾 Kaydet"; btn.disabled=false;
    })
    .catch(function(e){ alert("Kayıt hatası: "+e.message); btn.textContent="💾 Kaydet"; btn.disabled=false; });
}

function removeAvatar(){
  if(!curStudent) return;
  db.ref("profiles/"+curStudent+"/avatar").remove()
    .then(function(){
      PROFILE_PICS[curStudent]=null;
      applyAvatar(curStudent,null);
      closeAvatarModal();
    });
}


// ═══════════════════════════════════════════════════════════════════
//  ÖĞRENCI / ÖĞRETMEN GRAFİKLERİ
// ═══════════════════════════════════════════════════════════════════
function drawStdDailyBar(){
  var el=document.getElementById("std-daily-bar"); if(!el)return;
  destroyChart("std-daily-bar");
  var days=[]; var d=selDate;
  for(var i=13;i>=0;i--) days.push(addDays(d,-i));
  var labels=days.map(function(x){return x.slice(8)+"/"+x.slice(5,7);});
  var totals=days.map(function(x){return dstats(x).total;});
  var corrects=days.map(function(x){return dstats(x).correct;});
  var wrongs=days.map(function(x){return dstats(x).wrong;});
  _charts["std-daily-bar"]=new Chart(el,{
    type:"bar",
    data:{labels:labels,datasets:[
      {label:"Doğru",data:corrects,backgroundColor:"rgba(34,197,94,0.8)",borderRadius:4,stack:"s"},
      {label:"Yanlış",data:wrongs,backgroundColor:"rgba(239,68,68,0.65)",borderRadius:4,stack:"s"}
    ]},
    options:admBarOpts("Soru",true)
  });
}


function drawStdMonthlyBar(){
  var el=document.getElementById("std-monthly-bar"); if(!el)return;
  destroyChart("std-monthly-bar");
  var labels=SUBJ.map(function(s){return s.n;});
  var totals=SUBJ.map(function(s){return mstats(selMonth,s.id).total;});
  var corrects=SUBJ.map(function(s){return mstats(selMonth,s.id).correct;});
  var wrongs=SUBJ.map(function(s){return mstats(selMonth,s.id).wrong;});
  _charts["std-monthly-bar"]=new Chart(el,{
    type:"bar",
    data:{labels:labels,datasets:[
      {label:"Doğru",data:corrects,backgroundColor:"rgba(34,197,94,0.8)",borderRadius:4,stack:"s"},
      {label:"Yanlış",data:wrongs,backgroundColor:"rgba(239,68,68,0.65)",borderRadius:4,stack:"s"}
    ]},
    options:admBarOpts("Soru",true)
  });
}
// ═══════════════════════════════════════════════════════════════════
//  ADMIN CHARTS
// ═══════════════════════════════════════════════════════════════════
function admBarOpts(yLabel,stacked){
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{position:"bottom",labels:{font:{family:"Nunito",size:12},boxWidth:10,padding:8}},
      tooltip:{callbacks:{footer:function(ctx){
        if(!stacked)return"";
        var sum=ctx.reduce(function(a,c){return a+c.parsed.y;},0);
        return "Toplam: "+sum;
      }}}},
    scales:{
      x:{grid:{display:false},ticks:{font:{family:"Nunito",size:11},maxRotation:0}},
      y:{grid:{color:"#f3f4f6"},ticks:{font:{family:"Nunito",size:11}},
        title:{display:!!yLabel,text:yLabel||"",font:{size:11}},
        beginAtZero:true,stacked:!!stacked}
    }
  };
}

function drawAdmDailyBar(){
  var el=document.getElementById("adm-daily-bar"); if(!el)return;
  destroyChart("adm-daily-bar");
  var days=[]; var d=today();
  for(var i=13;i>=0;i--) days.push(addDays(d,-i));
  var labels=days.map(function(x){return x.slice(8)+"/"+x.slice(5,7);});
  var oVals=days.map(function(x){return stFrom(recs,x).total;});
  var zVals=days.map(function(x){return stFrom(cmpRecs,x).total;});
  _charts["adm-daily-bar"]=new Chart(el,{
    type:"bar",
    data:{labels:labels,datasets:[
      {label:"👦 Ömer Doruk",data:oVals,backgroundColor:"rgba(79,70,229,0.75)",borderRadius:4},
      {label:"👧 Zeynep Alya",data:zVals,backgroundColor:"rgba(219,39,119,0.65)",borderRadius:4}
    ]},
    options:admBarOpts("Soru",false)
  });
}

function drawAdmWeeklyBar(){
  var el=document.getElementById("adm-weekly-bar"); if(!el)return;
  destroyChart("adm-weekly-bar");
  var weeks=[]; var ws2=selWeekStart;
  for(var i=0;i<12;i++){weeks.unshift(ws2);ws2=addDays(ws2,-7);}
  var labels=weeks.map(function(w){return w.slice(8)+"/"+w.slice(5,7);});
  var oVals=weeks.map(function(w){return wstFrom(recs,w).total;});
  var zVals=weeks.map(function(w){return wstFrom(cmpRecs,w).total;});
  _charts["adm-weekly-bar"]=new Chart(el,{
    type:"bar",
    data:{labels:labels,datasets:[
      {label:"👦 Ömer Doruk",data:oVals,backgroundColor:"rgba(79,70,229,0.75)",borderRadius:4},
      {label:"👧 Zeynep Alya",data:zVals,backgroundColor:"rgba(219,39,119,0.65)",borderRadius:4}
    ]},
    options:admBarOpts("Soru",false)
  });
}

function drawAdmMonthlyBar(){
  var el=document.getElementById("adm-monthly-bar"); if(!el)return;
  destroyChart("adm-monthly-bar");
  var pm=parseYM(selMonth);
  var daysInMonth=dim(pm.y,pm.m);
  var labels=[],oVals=[],zVals=[];
  for(var d2=1;d2<=daysInMonth;d2++){
    var dstr=ds(pm.y,pm.m,d2);
    var oD=stFrom(recs,dstr), zD=stFrom(cmpRecs,dstr);
    if(!oD.total&&!zD.total)continue;
    labels.push(String(d2));
    oVals.push(oD.total);
    zVals.push(zD.total);
  }
  if(!labels.length){labels=["Veri yok"];oVals=[0];zVals=[0];}
  _charts["adm-monthly-bar"]=new Chart(el,{
    type:"bar",
    data:{labels:labels,datasets:[
      {label:"👦 Ömer Doruk",data:oVals,backgroundColor:"rgba(79,70,229,0.75)",borderRadius:3},
      {label:"👧 Zeynep Alya",data:zVals,backgroundColor:"rgba(219,39,119,0.65)",borderRadius:3}
    ]},
    options:admBarOpts("Soru",false)
  });
}

function drawAdmAllBar(){
  var el=document.getElementById("adm-all-bar"); if(!el)return;
  destroyChart("adm-all-bar");
  var months=availMonths().filter(function(ym){
    return mstFrom(recs,ym).total>0||mstFrom(cmpRecs,ym).total>0;
  });
  var labels=months.map(function(ym){var p=parseYM(ym);return MONTHS[p.m].substring(0,3)+" "+String(p.y).slice(2);});
  var oVals=months.map(function(ym){return mstFrom(recs,ym).total;});
  var zVals=months.map(function(ym){return mstFrom(cmpRecs,ym).total;});
  var oNet=months.map(function(ym){return fnet(mstFrom(recs,ym).net);});
  var zNet=months.map(function(ym){return fnet(mstFrom(cmpRecs,ym).net);});
  _charts["adm-all-bar"]=new Chart(el,{
    type:"bar",
    data:{labels:labels,datasets:[
      {label:"👦 Ömer Soru",data:oVals,backgroundColor:"rgba(79,70,229,0.75)",borderRadius:4,yAxisID:"y"},
      {label:"👧 Zeynep Soru",data:zVals,backgroundColor:"rgba(219,39,119,0.65)",borderRadius:4,yAxisID:"y"},
      {label:"👦 Ömer Net",data:oNet,type:"line",borderColor:"rgba(79,70,229,1)",backgroundColor:"transparent",borderWidth:2.5,pointRadius:4,yAxisID:"y2"},
      {label:"👧 Zeynep Net",data:zNet,type:"line",borderColor:"rgba(219,39,119,1)",backgroundColor:"transparent",borderWidth:2.5,pointRadius:4,yAxisID:"y2"}
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{position:"bottom",labels:{font:{family:"Nunito",size:12},boxWidth:10,padding:6}}},
      scales:{
        x:{grid:{display:false},ticks:{font:{family:"Nunito",size:11},maxRotation:0}},
        y:{grid:{color:"#f3f4f6"},ticks:{font:{family:"Nunito",size:11}},beginAtZero:true,title:{display:true,text:"Soru",font:{size:11}}},
        y2:{position:"right",grid:{display:false},ticks:{font:{family:"Nunito",size:11}},title:{display:true,text:"Net",font:{size:11}}}
      }
    }
  });
}


// ── ŞİFRE MODAL FONKSİYONLARI ──────────────────────────────────────
var _pwTarget = null;

var _pwBusy = false;
function askPassword(sid){
  // Her hesap şifre sorar. Öğretmen girişinden sonra önce öğrenci seçtirilir (pwSubmit)
  _teacherMode = false;
  _pwTarget = sid;
  var st = STUDENTS[sid];
  var avatarEl = document.getElementById("pw-avatar");
  if(st.emoji){ avatarEl.textContent = st.emoji; avatarEl.style.backgroundImage="none"; avatarEl.style.fontSize="40px"; }
  document.getElementById("pw-name").textContent = st.name;
  document.getElementById("pw-input").value = "";
  document.getElementById("pw-err").textContent = "";
  document.getElementById("pw-remember").checked = false;
  document.getElementById("pw-remember-row").style.display = READONLY ? "none" : "flex";
  var btn = document.getElementById("pw-btn");
  var grads = {omer:"linear-gradient(135deg,#4F46E5,#7C3AED)",zeynep:"linear-gradient(135deg,#DB2777,#9D174D)",admin:"linear-gradient(135deg,#d97706,#b45309)",teacher:"linear-gradient(135deg,#0891b2,#0e7490)"};
  btn.style.background = grads[sid]||grads.omer;
  var inp = document.getElementById("pw-input");
  inp.style.borderColor = "#e5e7eb";
  inp.type = "password";
  document.getElementById("pw-modal").style.display = "flex";
  setTimeout(function(){ inp.focus(); }, 120);
}

function closeTeacherModal(){
  document.getElementById("teacher-modal").style.display="none";
}

function teacherPick(sid){
  document.getElementById("teacher-modal").style.display="none";
  // Teacher enters as readonly for the chosen student
  _teacherMode = true;
  pickStudent(sid);
}
var _teacherMode = false;

function closePwModal(){
  document.getElementById("pw-modal").style.display = "none";
  _pwTarget = null;
}

function pwErr(show, msg){
  var inp = document.getElementById("pw-input");
  var err = document.getElementById("pw-err");
  if(show){
    err.textContent = msg || "Yanlış şifre, tekrar deneyin.";
    inp.style.borderColor = "#ef4444";
    inp.value = "";
    setTimeout(function(){ inp.focus(); }, 50);
  } else {
    err.textContent = "";
    inp.style.borderColor = "#e5e7eb";
  }
}

function togglePwVis(){
  var inp = document.getElementById("pw-input");
  inp.type = inp.type === "password" ? "text" : "password";
}

function pwSubmit(){
  if(!_pwTarget||_pwBusy) return;
  var target = _pwTarget;
  var val = document.getElementById("pw-input").value;
  var btn = document.getElementById("pw-btn");
  _pwBusy = true; btn.disabled = true; btn.style.opacity = ".6";
  var remember = !READONLY && document.getElementById("pw-remember").checked;
  var P = firebase.auth.Auth.Persistence;
  firebase.auth().setPersistence(remember?P.LOCAL:P.SESSION).catch(function(){}).then(function(){
    return authSignIn(authWho(target), val);
  }).then(function(){
    if(remember) setRemembered(target); else clearRemembered();
    document.getElementById("pw-modal").style.display = "none";
    _pwTarget = null;
    if(target==="teacher"){
      loadProfilePics();
      document.getElementById("teacher-modal").style.display = "flex";
    } else {
      pickStudent(target);
    }
  }).catch(function(e){
    pwErr(true, authErrMsg(e));
  }).then(function(){
    _pwBusy = false; btn.disabled = false; btn.style.opacity = "";
  });
}

// Close on backdrop click
document.addEventListener("click", function(e){
  var modal = document.getElementById("pw-modal");
  if(e.target === modal) closePwModal();
});
