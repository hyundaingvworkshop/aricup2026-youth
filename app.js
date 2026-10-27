(function(){
"use strict";
var DAY='2026-10-31';
var IMG_LAYOUT='/layout.jpg', IMG_PARK='/parking.jpg';

/* ---------- 대회 데이터 ---------- */
/* adv: 각 조에서 4강에 오르는 순위 수 */
var DIV={
  y1:{name:'1학년',desc:'6팀 1개조 · 예선 팀당 4경기',adv:4,groups:{
    A:['김신욱FC 레드','나인티FC','김신욱FC 블루','천안CFA','동탄플레이풋볼','노아풋볼']}},
  y2:{name:'2학년',desc:'8팀 2개조 · 예선 팀당 3경기',adv:2,groups:{
    A:['나인티FC','동탄JFC','하남KSA','천안CFA'],
    B:['김신욱FC','JJFC','엘프만주니어','팀식스']}}
};
var DIVS=['y1','y2'];
/* 유소년부 텐트존 번호 (축구장 아래쪽 1–14번) */
var TENT={y1:{A1:7,A2:2,A3:8,A4:3,A5:11,A6:10},y2:{A1:1,A2:5,A3:6,A4:4,B1:9,B2:13,B3:14,B4:12}};
var M=[];
/* 예선: [시작, 구장, 조, 홈 번호, 원정 번호] — 타임테이블 그대로 */
[['14:40',1,'A',1,2],['14:40',2,'A',3,4],['14:40',3,'A',5,6],
 ['15:20',1,'A',4,1],['15:20',2,'A',2,5],['15:20',3,'A',6,3],
 ['16:00',1,'A',1,6],['16:00',2,'A',4,2],['16:00',3,'A',3,5],
 ['16:40',1,'A',6,4],['16:40',2,'A',2,3],['16:40',3,'A',5,1]
].forEach(function(x){M.push({div:'y1',stage:'pre',g:x[2],t:x[0],f:x[1],h:x[2]+x[3],a:x[2]+x[4]});});
[['15:00',1,'A',1,4],['15:00',2,'A',2,3],['15:00',3,'B',1,4],['15:00',4,'B',2,3],
 ['15:40',1,'A',3,1],['15:40',2,'A',4,2],['15:40',3,'B',3,1],['15:40',4,'B',4,2],
 ['16:20',1,'A',1,2],['16:20',2,'A',3,4],['16:20',3,'B',1,2],['16:20',4,'B',3,4]
].forEach(function(x){M.push({div:'y2',stage:'pre',g:x[2],t:x[0],f:x[1],h:x[2]+x[3],a:x[2]+x[4]});});
/* 본선(4강·결승): h/a가 'A1'이면 A조 1위 자리, 'W:경기번호'면 그 경기 승자 */
[['y2','SF','17:00',1,'A1','B2'],['y2','SF','17:00',2,'B1','A2'],['y2','F','17:25',1,'W:1700-1','W:1700-2'],
 ['y1','SF','17:20',3,'A1','A4'],['y1','SF','17:20',4,'A2','A3'],['y1','F','17:45',3,'W:1720-3','W:1720-4']
].forEach(function(x){M.push({div:x[0],stage:'ko',g:x[1],t:x[2],f:x[3],h:x[4],a:x[5]});});
M.forEach(function(m){m.id=m.t.replace(':','')+'-'+m.f;});
M.sort(function(x,y){return x.t<y.t?-1:x.t>y.t?1:x.f-y.f;});
var BYID={};M.forEach(function(m){BYID[m.id]=m;});

var TL=[
 ['13:30','14:30','검인','1학년·2학년 모든 팀',''],
 ['14:40','16:55','1학년 예선','1–3구장 · 6팀 팀당 4경기 (15분)','a'],
 ['15:00','16:35','2학년 예선','A조 1·2구장 / B조 3·4구장 · 팀당 3경기 (15분)','t'],
 ['17:00','17:15','2학년 4강','1구장 A조 1위 vs B조 2위 · 2구장 B조 1위 vs A조 2위','t'],
 ['17:20','17:35','1학년 4강','3구장 1위 vs 4위 · 4구장 2위 vs 3위','a'],
 ['17:25','17:40','2학년 결승','1구장 · 4강 승자끼리','t'],
 ['17:45','18:00','1학년 결승','3구장 · 4강 승자끼리','a'],
 ['18:20','','시상식','1학년 · 2학년','']
];

/* ---------- 상태 ---------- */
var STATE={results:{},notice:'',draws:{},slots:{}},LOADED=false,OFFLINE=false,VER=-1,PENDING=false;
var ui={tab:'home',div:'y1',sub:'group',field:0,admin:false,mydiv:null};
var MY=null, EDITOR=false, PW=null, LOGIN_ERR='', C={};
var MODE=document.body.getAttribute('data-mode')==='admin'?'admin':'view';
ui.page=MODE;
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){return null;}}

/* ---------- 유틸 ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function toMin(t){var p=t.split(':');return (+p[0])*60+(+p[1]);}
function fmt(min){var h=Math.floor(min/60),m=min%60;return h+':'+(m<10?'0':'')+m;}
function now(){var d=new Date(Date.now()+9*3600e3);var ds=d.toISOString().slice(0,10);return{ds:ds,day:ds===DAY,before:ds<DAY,after:ds>DAY,min:d.getUTCHours()*60+d.getUTCMinutes()};}
function res(m){var r=STATE.results[m.id];return r&&r.st!=='live'&&r.h!=null&&r.a!=null?r:null;}
function liveRec(m){var r=STATE.results[m.id];return r&&r.st==='live'?r:null;}
function nameOf(div,key){var g=DIV[div].groups[key[0]];return g?g[+key.slice(1)-1]:key;}
function fieldName(f){return f+'구장';}
function multiG(div){return Object.keys(DIV[div].groups).length>1;}
function gLabel(div,g){return multiG(div)?g+'조 ':'';}
function stageTag(m){var d=DIV[m.div].name;if(m.stage==='pre')return d+' '+gLabel(m.div,m.g)+'예선';return d+' '+(m.g==='F'?'결승':'4강');}
function tentOf(div,key){return (TENT[div]||{})[key]||0;}

/* ---------- 순위 계산 ---------- */
/* 순위 규칙: 승점 → 골득실 → 다득점 → 추첨
   - 승 3점 / 무 1점 / 패 0점
   - 세 기준이 모두 같으면 '추첨 대기'(운영진이 추첨 순서를 지정하면 그 순서) */
function rankTeams(keys,games,ord){
  var S={},idx={};keys.forEach(function(k,i){idx[k]=i;S[k]={k:k,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0};});
  games.forEach(function(g){var r=g.r,H=S[g.h],A=S[g.a];if(!r||!H||!A)return;
    H.p++;A.p++;H.gf+=r.h;H.ga+=r.a;A.gf+=r.a;A.ga+=r.h;
    if(r.h>r.a){H.w++;A.l++;H.pts+=3;}else if(r.h<r.a){A.w++;H.l++;A.pts+=3;}else{H.d++;A.d++;H.pts++;A.pts++;}});
  function sig(k){var s=S[k];return [s.pts,s.gf-s.ga,s.gf];}
  function cmp(x,y){var a=sig(x),b=sig(y);for(var i=0;i<3;i++){if(a[i]!==b[i])return b[i]-a[i];}return 0;}
  var sorted=keys.slice().sort(function(x,y){return cmp(x,y)||idx[x]-idx[y];});
  var rows=[],bi=0,i=0;
  while(i<sorted.length){var j=i+1;while(j<sorted.length&&cmp(sorted[i],sorted[j])===0)j++;
    var rs=sorted.slice(i,j).map(function(k){return S[k];});
    if(rs.length>1&&rs.every(function(r){return r.p>0;})){var id='b'+(bi++);rs.forEach(function(r){r.run=id;});
      if(ord&&rs.every(function(r){return ord.indexOf(r.k)>=0;})){rs.sort(function(x,y){return ord.indexOf(x.k)-ord.indexOf(y.k);});rs.forEach(function(r){r.drawn=true;});}
      else rs.forEach(function(r){r.tie=true;});}
    rows=rows.concat(rs);i=j;}
  return rows;
}
function table(keys,ms,dk){
  return rankTeams(keys,ms.map(function(m){return{h:m.h,a:m.a,r:res(m)};}),dk&&STATE.draws&&STATE.draws[dk]);
}
/* 추첨 대기(동률) 팀은 같은 순위로 표시: 4·4·6 */
function dispRank(rows,i){var r=rows[i];if(r&&r.tie){for(var j=0;j<i;j++){if(rows[j].run===r.run)return j+1;}}return i+1;}
function groupMs(div,g){return M.filter(function(m){return m.div===div&&m.stage==='pre'&&m.g===g;});}
function groupTable(div,g){var k='gt'+div+g;if(!C[k]){C[k]=table(DIV[div].groups[g].map(function(_,i){return g+(i+1);}),groupMs(div,g),'pre:'+div+':'+g);}return C[k];}
function groupDone(div,g){return groupMs(div,g).every(function(m){return res(m);});}
function autoSlot(div,slot){var g=slot[0],r=+slot.slice(1);if(!groupDone(div,g))return null;var t=groupTable(div,g)[r-1];return t&&!t.tie?t.k:null;}
function slotOv(div,slot){return (STATE.slots&&STATE.slots[div+':'+slot])||'';}
function slotTeam(div,slot){var o=slotOv(div,slot);if(o)return o==='X'?null:o;return autoSlot(div,slot);}
function slotName(div,k){return (multiG(div)?k[0]+'조 ':'예선 ')+k.slice(1)+'위';}
function slotPh(div,k){var o=slotOv(div,k);return slotName(div,k)+(o==='X'?' · 실격(빈 자리)':groupDone(div,k[0])?' (추첨 대기)':'');}
function teamSlot(div,key){var g=key[0];for(var r=1;r<=DIV[div].adv;r++){if(slotTeam(div,g+r)===key)return g+r;}return null;}
function winSide(m){var r=res(m);if(!r)return null;return r.h>r.a?'h':r.a>r.h?'a':(r.w==='h'||r.w==='a'?r.w:null);}
function side(m,w){var k=m[w];
  if(m.stage==='pre')return{name:nameOf(m.div,k),key:k,ok:true};
  if(k.indexOf('W:')===0){var src=BYID[k.slice(2)],ws=winSide(src),ws2=ws&&side(src,ws);
    return ws2&&ws2.key?{name:ws2.name,key:ws2.key,ok:true,from:src.id}:{name:src.t+' '+fieldName(src.f)+' 승자',key:null,ok:false,from:src.id};}
  var t=slotTeam(m.div,k);
  return t?{name:nameOf(m.div,t),key:t,ok:true,slot:k}:{name:slotPh(m.div,k),key:null,ok:false,slot:k};}
function koMs(div){return M.filter(function(m){return m.div===div&&m.stage==='ko';});}
function finalOf(div){return koMs(div).filter(function(m){return m.g==='F';})[0];}
/* 결승이 끝나면 {win:{name,key}, lose:{name,key}} */
function podium(div){var f=finalOf(div),w=winSide(f);if(!w)return null;var W=side(f,w),L=side(f,w==='h'?'a':'h');return W.ok?{win:W,lose:L}:null;}
function mstate(m){if(res(m))return'done';if(liveRec(m))return'live';return'sched';}
function liveStrip(ms){var L=ms.filter(liveRec);if(!L.length)return '';
  return '<div class="livebox"><div class="lb-k"><span class="livedot"></span>지금 경기 중 '+L.length+'</div><div class="mlist">'+L.map(function(m){return matchCard(m);}).join('')+'</div></div>';}
function isMine(div,key){return MY&&key&&MY===div+':'+key;}

/* ---------- 렌더: 공통 조각 ---------- */
function matchCard(m,opt){opt=opt||{};
  var r=res(m),st=mstate(m),sc=r||liveRec(m),h=side(m,'h'),a=side(m,'a');
  var mine=isMine(m.div,h.key)||isMine(m.div,a.key);
  var ws=winSide(m),hw=ws==='h',aw=ws==='a';
  var click=ui.admin;
  var stTxt=st==='done'?'종료':st==='live'?'<span class="livedot"></span>경기 중':'예정';
  function row(s,score,win){return '<div class="m-row'+(win?' win':'')+'"><span class="m-team'+(s.ok?'':' ph')+'">'+esc(s.name)+(isMine(m.div,s.key)?'<span class="me">★</span>':'')+'</span><span class="m-score">'+(sc?score:'')+'</span></div>';}
  var draw='';
  if(r&&r.h===r.a&&m.stage==='ko')draw=r.w?'<div class="m-tag">무승부 · 승부차기 승</div>':'<div class="m-tag" style="color:var(--live)">무승부 · 승부차기 결과 입력 대기</div>';
  if(ui.admin&&sc&&(sc.hy||sc.hr||sc.ay||sc.ar))draw+='<div class="m-cards">경고 '+(sc.hy||0)+'·'+(sc.ay||0)+' · 퇴장 '+(sc.hr||0)+'·'+(sc.ar||0)+'</div>';
  return '<'+(click?'button type="button"':'div')+' class="match s-'+st+(mine?' mine':'')+(click?' click':'')+'" data-mid="'+m.id+'">'+
    '<div class="m-meta"><span class="m-time">'+(opt.noTime?fieldName(m.f).replace('구장',''):m.t)+'</span><span class="m-field">'+(opt.noTime?'구장':fieldName(m.f))+'</span></div>'+
    '<div class="m-body"><div class="m-tag">'+esc(opt.tag||stageTag(m))+'</div>'+row(h,sc&&sc.h,hw)+row(a,sc&&sc.a,aw)+draw+'</div>'+
    '<div class="m-st '+st+'">'+stTxt+'</div></'+(click?'button':'div')+'>';}
function standings(rows,div,opt){opt=opt||{};
  var h='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th class="l">팀</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득</th><th>실</th><th>득실</th><th>승점</th></tr></thead><tbody>';
  var anyTie=false;
  rows.forEach(function(r,i){var s={n:nameOf(div,r.k),key:r.k};
    if(r.tie)anyTie=true;
    var q=opt.complete&&!r.tie&&i<DIV[div].adv&&teamSlot(div,r.k)?'<span class="qual">4강</span>':'';
    h+='<tr'+(isMine(div,s.key)?' class="mine"':'')+'><td class="rk">'+dispRank(rows,i)+(r.tie?'<span class="tie">*</span>':'')+(r.drawn?'<span class="drawn">추첨</span>':'')+'</td><td class="l">'+esc(s.n)+q+'</td><td>'+r.p+'</td><td>'+r.w+'</td><td>'+r.d+'</td><td>'+r.l+'</td><td>'+r.gf+'</td><td>'+r.ga+'</td><td>'+(r.gf-r.ga>0?'+':'')+(r.gf-r.ga)+'</td><td class="pts">'+r.pts+'</td></tr>';});
  h+='</tbody></table></div><div class="legend">순위: 승점 → 골득실 → 다득점 → 추첨'+(anyTie?' · <span class="tie">* 모든 기준 동률, 추첨 대기</span>':'')+
    (opt.dk&&ui.admin&&rows.some(function(r){return r.run!=null;})?'<br><button type="button" class="chipbtn drawbtn" data-draw="'+opt.dk+'">동률 팀 추첨 순위 지정</button>':'')+'</div>';
  return h;}
function seg(name,opts,cur,cls){return '<div class="seg'+(cls?' '+cls:'')+'" role="group">'+opts.map(function(o){return '<button type="button" data-seg="'+name+'" data-v="'+o[0]+'" aria-pressed="'+(cur===o[0])+'">'+o[1]+'</button>';}).join('')+'</div>';}
function divSeg(){return seg('div',[['y1','1학년 · 6팀'],['y2','2학년 · 8팀']],ui.div,'div');}

/* ---------- 홈 ---------- */
function heroHTML(){var n=now();
  if(n.before){var days=Math.round((Date.parse(DAY)-Date.parse(n.ds))/864e5);
    return '<div class="hero"><div class="k">대회일 2026. 10. 31.(토)</div><div class="big">D-'+days+'</div><div class="line">13:30 검인 → 14:40 첫 경기 → 18:20 시상식<br>관문체육공원 축구장 1–4구장</div></div>';}
  if(n.after)return '<div class="hero"><div class="k">대회 종료</div><div class="big">FULL TIME</div><div class="line">최종 결과는 본선 탭에서 확인하세요. 참가해 주셔서 감사합니다.</div></div>';
  var live=M.filter(liveRec);
  var nxtT=null;M.forEach(function(m){if(mstate(m)==='sched'&&(!nxtT||m.t<nxtT))nxtT=m.t;});
  var nxt=nxtT?M.filter(function(m){return m.t===nxtT&&mstate(m)==='sched';}):[];
  function rows(list){return '<div class="now-list">'+list.map(function(m){var h=side(m,'h'),a=side(m,'a'),r=res(m)||liveRec(m);
    return '<div class="nowrow"><span class="f">'+m.f+'구장</span><span class="t">'+esc(h.name)+(r?' <b class="num">'+r.h+':'+r.a+'</b> ':' vs ')+esc(a.name)+'<div class="d">'+esc(stageTag(m))+'</div></span></div>';}).join('')+'</div>';}
  var ev=TL.filter(function(e){var s=toMin(e[0]),en=e[1]?toMin(e[1]):s+30;return !e[4]&&n.min>=s&&n.min<en;});
  var h='<div class="hero"><div class="k">오늘 · '+fmt(n.min)+'</div>';
  if(ev.length)h+='<div class="big" style="font-size:28px">'+esc(ev[0][2])+(ev[0][1]?' ~ '+ev[0][1]:'')+'</div><div class="line">'+esc(ev[0][3])+'</div>';
  else if(!live.length&&nxt.length&&n.min<toMin(M[0].t))h+='<div class="big" style="font-size:28px">첫 경기 '+M[0].t+'</div><div class="line">'+(n.min<toMin('13:30')?'13:30 검인 시작 · ':'')+'관문체육공원 축구장 1–4구장</div>';
  if(live.length)h+='<div class="k" style="margin-top:12px"><span class="livedot"></span>지금 경기 중 · '+live.length+'경기</div>'+rows(live);
  if(nxt.length){var dm=toMin(nxtT)-n.min;h+='<div class="k" style="margin-top:14px">다음 경기 · '+nxtT+' '+(dm>0?'('+dm+'분 후)':'(시작 대기)')+'</div>'+rows(nxt);}
  if(!live.length&&!nxt.length&&!ev.length)h+='<div class="big" style="font-size:28px">'+(n.min<toMin('18:20')?'18:20 시상식':'오늘 일정 종료')+'</div><div class="line">최종 결과는 본선 탭에서 확인하세요.</div>';
  return h+'</div>';}
function teamOptions(d){var o='<option value="">'+DIV[d].name+' 팀을 선택하세요</option>',mg=multiG(d);
  Object.keys(DIV[d].groups).forEach(function(g){if(mg)o+='<optgroup label="'+g+'조">';DIV[d].groups[g].forEach(function(t,i){var v=d+':'+g+(i+1);o+='<option value="'+v+'"'+(MY===v?' selected':'')+'>'+esc(t)+'</option>';});if(mg)o+='</optgroup>';});return o;}
function myHTML(){
  var md=MY?MY.split(':')[0]:ui.mydiv;
  var h='<section class="my"><h2>우리 팀 일정 <span class="sub">선택하면 이 기기에 저장돼요</span></h2>'+seg('mydiv',[['y1','1학년'],['y2','2학년']],md,'div');
  if(!md)return h+'<p class="small muted">먼저 학년을 고르세요. 그다음 우리 팀을 선택하면 경기 시간·구장·상대 팀과 현재 순위가 여기에 모여요.</p></section>';
  h+='<select id="mysel" aria-label="우리 팀 선택">'+teamOptions(md)+'</select>';
  if(!MY)return h+'<p class="small muted">팀을 고르면 경기 시간·구장·상대 팀과 현재 순위가 여기에 모여요. 일정표와 순위표에서도 우리 팀이 ★로 표시됩니다.</p></section>';
  var p=MY.split(':'),div=p[0],key=p[1],g=key[0];
  var tb=groupTable(div,g),rk=0;tb.forEach(function(r,i){if(r.k===key)rk=i+1;});var me=tb[rk-1];
  var ms=M.filter(function(m){return m.div===div&&(m.stage==='pre'?(m.h===key||m.a===key):(side(m,'h').key===key||side(m,'a').key===key));});
  var done=groupDone(div,g),tent=tentOf(div,key);
  h+='<div class="mysum"><span class="pill '+div+'">'+DIV[div].name+(multiG(div)?' '+g+'조':'')+'</span>'+(tent?'<span class="pill">텐트 '+tent+'번</span>':'')+'<span class="pill">예선 '+(done?'최종 ':'현재 ')+dispRank(tb,rk-1)+'위 · 승점 '+me.pts+'</span>';
  if(done){var sl=teamSlot(div,key),pd=podium(div);
    if(pd&&pd.win.key===key)h+='<span class="pill gold">우승</span>';
    else if(pd&&pd.lose.key===key)h+='<span class="pill gold">준우승</span>';
    else if(sl)h+='<span class="pill gold">4강 진출</span>';
    else if(me.tie&&dispRank(tb,rk-1)<=DIV[div].adv)h+='<span class="pill live">순위 추첨 대기</span>';}
  h+='</div>';
  var next=ms.filter(function(m){return !res(m);})[0];
  if(next){var opp=side(next,'h').key===key?side(next,'a'):side(next,'h');
    if(liveRec(next))h+='<div class="callout" style="border-color:var(--live)"><b style="color:var(--live)"><span class="livedot"></span>지금 경기 중 · '+fieldName(next.f)+'</b> vs '+esc(opp.name)+'</div>';
    else h+='<div class="callout"><b>다음 경기 '+next.t+' · '+fieldName(next.f)+'</b> vs '+esc(opp.name)+'<br><span class="small">'+esc(stageTag(next))+'</span></div>';}
  h+='<div class="mlist">'+ms.map(function(m){return matchCard(m);}).join('')+'</div>';
  if(!done)h+='<p class="small muted" style="margin-top:8px">'+(div==='y1'?'예선 1–4위가 4강에 올라요.':'각 조 1·2위가 4강에 올라요.')+' 예선이 모두 끝나면 4강·결승 일정이 이곳에 이어서 표시돼요.</p>';
  return h+'</section>';}
function timelineHTML(){var n=now();
  return '<section><h2>당일 진행 순서 <span class="sub">10.31(토)</span></h2><div class="card tl">'+TL.map(function(e){var s=toMin(e[0]),en=e[1]?toMin(e[1]):s+30;
    var cls=n.day&&n.min>=s&&n.min<en?' now':(n.day&&n.min>=en||n.after?' past':'');
    var tg=e[4]==='a'?'<span class="tag-a">● </span>':e[4]==='t'?'<span class="tag-t">● </span>':'';
    return '<div class="tl-i'+cls+'"><div class="w">'+e[0]+(e[1]?'<small>~ '+e[1]+'</small>':'')+'</div><div>'+tg+'<b>'+esc(e[2])+'</b><p>'+esc(e[3])+'</p></div></div>';}).join('')+'</div></section>';}
function teamsHTML(){var h='<section><h2>참가팀 · 조 편성 <span class="sub">텐트 번호 함께 표시</span></h2>';
  DIVS.forEach(function(d){h+='<div class="divlabel"><b class="'+(d==='y1'?'tag-a':'tag-t')+'">'+DIV[d].name+'</b><span class="small muted">'+DIV[d].desc+'</span></div><div class="groups">';
    Object.keys(DIV[d].groups).forEach(function(g){h+='<div class="grp '+d+'"><h4>'+(multiG(d)?g+'조':'1학년 (조 1개)')+'</h4><ol>'+DIV[d].groups[g].map(function(t,i){var tn=tentOf(d,g+(i+1));return '<li'+(isMine(d,g+(i+1))?' class="mine"':'')+'><span>'+(i+1)+'</span><em>'+esc(t)+'</em>'+(tn?'<small class="tent">텐트 '+tn+'</small>':'')+'</li>';}).join('')+'</ol></div>';});h+='</div>';});
  return h+'</section>';}
function rule(title,body,open){return '<details class="rule"'+(open?' open':'')+'><summary>'+title+'</summary><div class="rb">'+body+'</div></details>';}
function rulesHTML(){return '<section><h2>대회 규정</h2>'+
  '<div class="quick"><div><b>15분</b><span>예선 · 본선 경기</span></div><div><b>3·1·0</b><span>승 · 무 · 패</span></div><div><b>4강</b><span>예선 후 토너먼트</span></div></div>'+
  rule('순위 결정','<ul><li>승 3점 / 무 1점 / 패 0점</li><li>순위: <b>승점 → 골득실 → 다득점 → 추첨</b></li><li>세 기준이 모두 같으면 운영본부 추첨으로 순위를 정해요</li></ul>',true)+
  rule('1학년 진행 방식','<ul><li>6팀 1개조 예선, 경기당 15분</li><li>팀당 예선 4경기 (팀마다 1팀씩 랜덤으로 빼고 4경기 매칭)</li><li>예선 1–4위 4강 진출</li><li>4강 17:20: 3구장 1위 vs 4위 · 4구장 2위 vs 3위</li><li>결승 17:45 3구장: 4강 승자끼리</li></ul>')+
  rule('2학년 진행 방식','<ul><li>8팀 A·B조(4팀씩) 예선 풀리그, 경기당 15분 · 팀당 3경기</li><li>A조 1·2구장, B조 3·4구장</li><li>각 조 1·2위 4강 진출</li><li>4강 17:00: 1구장 A조 1위 vs B조 2위 · 2구장 B조 1위 vs A조 2위</li><li>결승 17:25 1구장: 4강 승자끼리</li></ul>')+
  rule('4강 · 결승 무승부','<ul><li>4강·결승에서 비기면 <b>승부차기</b>로 승리 팀을 정해요</li><li>먼저 3명씩 차고, 그래도 같으면 1명씩 서든데스</li></ul>')+
  '</section>';}
function parkHTML(){return '<section><h2>장소 · 주차</h2><div class="card"><dl class="kv">'+
  '<dt>장소</dt><dd><b>관문체육공원 축구장</b><br><span class="sel">경기도 과천시 중앙로 294</span></dd>'+
  '<dt>구장</dt><dd>축구장 1–4구장 · 1학년·2학년 모든 경기</dd>'+
  '<dt>시설</dt><dd>본부석 · 대회 운영본부 · 의료지원(구급) · 한의 의료지원 · 참가 기념품 배부처 · 이벤트 부스<br><span class="small muted">축구장 위쪽(본부석 쪽)</span></dd>'+
  '<dt>텐트</dt><dd>유소년부 텐트존 14개 · 팀별 번호 지정<br><span class="small muted">축구장 아래쪽 1–14번 · 번호는 홈 탭 참가팀 목록에 있어요</span></dd>'+
  '<dt>주차</dt><dd>1 · 2 · 3 주차장에 주차한 뒤 도보로 이동<br><span class="small muted">1·2 주차장이 축구장과 가까워요</span></dd>'+
  '</dl><div class="linkrow"><a href="https://map.naver.com/p/search/%EA%B4%80%EB%AC%B8%EC%B2%B4%EC%9C%A1%EA%B3%B5%EC%9B%90" target="_blank" rel="noopener">네이버 지도</a><a href="https://map.kakao.com/?q=%EA%B4%80%EB%AC%B8%EC%B2%B4%EC%9C%A1%EA%B3%B5%EC%9B%90" target="_blank" rel="noopener">카카오맵</a><button type="button" data-copy="경기도 과천시 중앙로 294">주소 복사</button></div></div></section>';}
function placeHTML(){return '<section><h2>문의</h2><div class="card"><dl class="kv"><dt>대회 담당</dt><dd>권예은 · <span class="sel num" style="font-size:17px">010-5913-3303</span></dd></dl><div class="linkrow"><button type="button" data-copy="010-5913-3303">번호 복사</button></div></div></section>'+
  '<p class="foot">주최 과천시 · 주관 과천시체육회, 과천시축구협회 · 진행 과천아리여성축구단, 김신욱 축구교실 · 협찬 주키트 Jukit<br>대회 일정은 현장 사정에 따라 변경될 수 있어요.</p>';}
/* ---------- 대회장 배치도 (이미지) ---------- */
function venueHTML(){var v=ui.map==='park'?'park':'field',h='<section class="venue"><h2>대회장 배치도</h2>'+seg('map',[['field','축구장 1–4구장'],['park','위치 · 주차']],v);
  var mt='';if(MY){var p=MY.split(':'),tn=tentOf(p[0],p[1]);if(tn)mt=' <b>우리 팀('+esc(nameOf(p[0],p[1]))+') 텐트는 '+tn+'번</b>이에요.';}
  if(v==='field')h+='<div class="card vcard"><a href="'+IMG_LAYOUT+'" target="_blank" rel="noopener"><img src="'+IMG_LAYOUT+'" alt="대회장 배치도: 축구장 1–4구장, 위쪽 본부석·운영본부·의료지원, 아래쪽 유소년부 텐트존 1–14번" loading="lazy" width="1484" height="1060"></a></div><p class="small muted vnote">모든 경기는 축구장 1–4구장에서 해요. 유소년부 텐트존은 축구장 아래쪽 1–14번이에요.'+mt+' 사진을 누르면 크게 볼 수 있어요.</p>';
  else h+='<div class="card vcard"><a href="'+IMG_PARK+'" target="_blank" rel="noopener"><img src="'+IMG_PARK+'" alt="관문체육공원 위성 지도: 축구장 1–4구장과 1·2·3 주차장, 주차 후 도보 이동 동선" loading="lazy" width="958" height="1642"></a></div><p class="small muted vnote">1 · 2 · 3 주차장에 주차한 뒤 걸어서 축구장으로 와 주세요. 사진을 누르면 크게 볼 수 있어요.</p>';
  return h+'</section>';}
function placeTabHTML(){return parkHTML()+venueHTML();}
function homeHTML(){return '<section>'+heroHTML()+'</section>'+myHTML()+timelineHTML()+teamsHTML()+rulesHTML()+placeHTML();}

/* ---------- 예선 / 본선 ---------- */
function timeList(ms){
  var fields=[];ms.forEach(function(m){if(fields.indexOf(m.f)<0)fields.push(m.f);});fields.sort();
  if(ui.field&&fields.indexOf(ui.field)<0)ui.field=0;
  var h='<div class="chips" role="group">'+[[0,'전체 구장']].concat(fields.map(function(f){return[f,f+'구장'];})).map(function(o){return '<button type="button" data-field="'+o[0]+'" aria-pressed="'+(ui.field===o[0])+'">'+o[1]+'</button>';}).join('')+'</div>';
  var list=ms.filter(function(m){return !ui.field||m.f===ui.field;}),by={},order=[];
  list.forEach(function(m){if(!by[m.t]){by[m.t]=[];order.push(m.t);}by[m.t].push(m);});
  order.forEach(function(t){var live=by[t].some(liveRec);
    h+='<div class="tgroup"><div class="tt'+(live?' live':'')+'">'+t+'</div><div class="mlist">'+by[t].map(function(m){return matchCard(m,{noTime:true});}).join('')+'</div></div>';});
  return h;}
function preHTML(){var d=ui.div,h=divSeg()+liveStrip(M.filter(function(m){return m.div===d&&m.stage==='pre';}))+seg('sub',[['group','조별 순위'],['time','시간표']],ui.sub);
  var ms=M.filter(function(m){return m.div===d&&m.stage==='pre';});
  if(ui.sub==='time'){
    h+='<p class="small muted" style="margin:0 0 10px">'+(d==='y1'?'14:40 – 16:55 · 1–3구장 · 경기당 15분':'15:00 – 16:35 · A조 1·2구장, B조 3·4구장 · 경기당 15분')+'</p>';
    h+=timeList(ms);
    h+='<div class="banner">'+(d==='y1'?'17:20 4강 (3·4구장) → 본선 탭':'17:00 4강 (1·2구장) → 본선 탭')+'</div>';
    return h;}
  Object.keys(DIV[d].groups).forEach(function(g){var gms=groupMs(d,g),played=gms.filter(function(m){return res(m);}).length;
    var fl=d==='y1'?'1–3구장':({A:'1·2구장',B:'3·4구장'})[g];
    h+='<div class="gcard"><div class="ghead '+d+'"><h3>'+(multiG(d)?g+'조':'1학년 예선')+'</h3><span class="gs">'+fl+' · '+played+'/'+gms.length+' 경기 종료</span></div>'+standings(groupTable(d,g),d,{dk:'pre:'+d+':'+g,complete:played===gms.length})+
      '<details class="gm"'+(MY&&MY.indexOf(d+':'+g)===0?' open':'')+'><summary>'+(multiG(d)?g+'조 ':'')+'경기 '+gms.length+'개 보기</summary><div class="mlist">'+gms.map(function(m){return matchCard(m,{tag:gLabel(d,g)+'예선'});}).join('')+'</div></details></div>';});
  h+='<p class="small muted">'+(d==='y1'?'예선 1–4위가 4강에 올라요 (1위 vs 4위, 2위 vs 3위). 팀마다 1팀과는 경기하지 않아요.':'A·B조 1·2위가 4강에 올라요 (A조 1위 vs B조 2위, B조 1위 vs A조 2위).')+'</p>';
  return h;}
function mainHTML(){var d=ui.div,ko=koMs(d),h=divSeg()+liveStrip(ko);
  var sf=ko.filter(function(m){return m.g==='SF';}),f=finalOf(d);
  h+='<div class="card small" style="margin-bottom:12px">'+(d==='y1'?'예선 1–4위 4강 진출 · 17:20 4강(3·4구장) → 17:45 결승(3구장)':'A·B조 1·2위 4강 진출 · 17:00 4강(1·2구장) → 17:25 결승(1구장)')+' · 경기당 15분 · 무승부 시 승부차기(3인 → 서든데스)</div>';
  h+='<h2>4강</h2><div class="mlist">'+sf.map(function(m){return matchCard(m,{tag:DIV[d].name+' 4강 · '+slotName(d,m.h)+' vs '+slotName(d,m.a)});}).join('')+'</div>';
  h+='<h2 style="margin-top:18px">결승</h2><div class="mlist">'+matchCard(f,{tag:DIV[d].name+' 결승'})+'</div>';
  var pd=podium(d);
  h+='<h2 style="margin-top:18px">'+DIV[d].name+' 최종 결과</h2><div class="rank-list">';
  if(pd){h+='<div class="rrow'+(isMine(d,pd.win.key)?' mine':'')+'"><span class="p">1</span><span class="n">'+esc(pd.win.name)+'<span class="medal g">우승</span></span></div>';
    h+='<div class="rrow'+(isMine(d,pd.lose.key)?' mine':'')+'"><span class="p">2</span><span class="n">'+esc(pd.lose.name)+'<span class="medal s">준우승</span></span></div>';}
  else h+='<div class="rrow"><span class="p">1–2</span><span class="n muted">결승 결과가 나오면 우승·준우승 팀이 표시돼요</span><span class="pill">'+(res(f)?'승부차기 결과 대기':f.t+' '+fieldName(f.f))+'</span></div>';
  h+='</div><div class="banner" style="margin-top:12px">18:20 시상식</div><p class="small muted">예선 조 경기가 모두 끝나야 4강 자리에 팀 이름이 채워져요. 그 전에는 "'+slotName(d,'A1')+'"처럼 표시돼요.</p>';
  return h;}

/* ---------- 전체 렌더 ---------- */
var ICON={place:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  pre:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg>',
  main:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6"/></svg>'};
/* ---------- 관리자 페이지 (#admin) ---------- */
function arows(list,empty){return list.length?'<div class="mlist">'+list.map(function(m){return matchCard(m);}).join('')+'</div>':'<p class="small muted">'+empty+'</p>';}
function adminBody(){
  var live=M.filter(liveRec),done=M.filter(function(m){return res(m);}).length,nxtT=null;
  M.forEach(function(m){if(mstate(m)==='sched'&&(!nxtT||m.t<nxtT))nxtT=m.t;});
  var h='<div class="quick"><div><b>'+live.length+'</b><span>경기 중</span></div><div><b>'+done+'/'+M.length+'</b><span>종료</span></div><div><b>'+(nxtT||'–')+'</b><span>다음 시작</span></div></div>';
  h+='<section><h2>팀 검색 <span class="sub">팀 경기를 모아 보고 바로 수정</span></h2><input id="tq" class="search" type="search" enterkeyhint="search" placeholder="팀명 입력 (예: 김신욱, 나인티)" autocomplete="off" value="'+esc(ui.q||'')+'"><div id="tqres">'+teamSearchHTML()+'</div></section>';
  var dv=ui.adiv||'all',av=ui.aview||'now',ms=M.filter(function(m){return dv==='all'||m.div===dv;});
  h+='<section><h2>경기 상태 · 결과 입력 <span class="sub">경기를 누르면 입력 창이 열려요</span></h2>'+seg('adiv',[['all','전체'],['y1','1학년'],['y2','2학년']],dv)+seg('aview',[['now','지금 할 경기'],['all','전체 일정']],av);
  if(av==='now'){
    var L=ms.filter(liveRec),nt=null;ms.forEach(function(m){if(mstate(m)==='sched'&&(!nt||m.t<nt))nt=m.t;});
    var N=nt?ms.filter(function(m){return m.t===nt&&mstate(m)==='sched';}):[];
    var D=ms.filter(function(m){return res(m);}).sort(function(x,y){return x.t<y.t?1:x.t>y.t?-1:0;}).slice(0,6);
    h+='<div class="lb-k"><span class="livedot"></span>경기 중 '+L.length+' · 끝나면 눌러서 최종 스코어 저장</div>'+arows(L,'진행 중인 경기가 없어요.');
    h+='<div class="lb-k blue">다음 시작'+(nt?' · '+nt:'')+' · 시작하면 눌러서 경기 중으로 표시</div>'+arows(N,'남은 경기가 없어요.');
    h+='<div class="lb-k muted2">최근 종료 · 잘못 넣었으면 눌러서 수정</div>'+arows(D,'아직 종료된 경기가 없어요.');
  } else h+=timeList(ms);
  h+='</section>';
  h+='<section><h2>상단 공지 <span class="sub">참가자 화면 맨 위에 표시</span></h2><div class="card"><textarea id="noticeta" placeholder="예) 3구장 경기가 10분씩 지연되고 있어요">'+esc(STATE.notice||'')+'</textarea><div class="sh-actions"><button type="button" class="pri" data-act="savenotice">공지 저장</button></div><p class="small muted" style="margin:8px 0 0">비우고 저장하면 공지가 내려가요.</p></div></section>';
  var dks=[];DIVS.forEach(function(d){Object.keys(DIV[d].groups).forEach(function(g){dks.push('pre:'+d+':'+g);});});
  var tied=dks.filter(function(dk){return tableFor(dk).some(function(r){return r.run!=null;});});
  h+='<section><h2>동률 추첨 <span class="sub">모든 기준이 같은 팀</span></h2>'+(tied.length?'<div class="alist">'+tied.map(function(dk){var pend=tableFor(dk).some(function(r){return r.tie;});
    return '<button type="button" class="arow" data-draw="'+dk+'"><span>'+esc(drawTitle(dk))+'</span><span class="pill'+(pend?' live':'')+'">'+(pend?'추첨 대기':'지정됨')+'</span></button>';}).join('')+'</div>':'<p class="card small muted" style="margin:0">승점·골득실·다득점까지 모두 같은 팀이 생기면 여기에 나타나요.</p>')+'</section>';
  function cnt(d){return Object.keys(STATE.slots||{}).filter(function(k){return k.indexOf(d+':')===0;}).length;}
  h+='<section><h2>4강 팀 배정 <span class="sub">실격·부정선수 등</span></h2><div class="alist">'+DIVS.map(function(d){return '<button type="button" class="arow" data-slots="'+d+'"><span>'+DIV[d].name+' 4강 진출 자리</span><span class="pill">'+(cnt(d)?'조정 '+cnt(d)+'자리':'자동 배정')+'</span></button>';}).join('')+'</div></section>';
  var anyRec=Object.keys(STATE.results).length;
  h+='<section><h2>결과 일괄 초기화 <span class="sub">모두 예정으로 되돌리기</span></h2><div class="card"><p class="small muted" style="margin:0 0 10px">테스트 기록을 지우거나 처음부터 다시 입력할 때 써요. 고른 범위의 경기가 모두 "예정"으로 돌아가고 순위가 0부터 다시 계산돼요. 지금 입력된 경기 '+anyRec+'개.</p><button type="button" class="chipbtn danger" data-reset="1">일괄 초기화…</button></div></section>';
  h+='<p class="small muted">저장하면 참가자 화면에 몇 초 안에 반영돼요. 운영진 여러 명이 동시에 다른 경기를 입력해도 서로 덮어쓰지 않아요.</p>';
  h+='<div class="linkrow"><a href="/" target="_blank" rel="noopener">참가자 화면 새 창으로 보기</a><button type="button" data-act="logout">로그아웃</button></div>';
  return h;}
function offlineBar(){return OFFLINE?'<div class="notice"><div class="wrap"><b>연결</b><p>최신 결과를 불러오지 못했어요. 인터넷 연결을 확인해 주세요. 자동으로 다시 시도해요.</p></div></div>':'';}
function adminHTML(){
  var h='<header id="hdr" class="adm"><div class="wrap"><div class="brand"><small>2026 과천아리컵 · 운영진 전용</small><b>유소년부 운영 관리</b><span>결과 입력 · 공지 · 추첨 · 4강 배정</span></div><a class="adm-btn" href="/">참가자 화면</a></div></header>'+offlineBar()+'<main class="wrap" id="view">';
  if(EDITOR)h+=adminBody();
  else h+='<form class="card login" id="loginform" autocomplete="off"><h3>관리자 로그인</h3><p class="small muted" style="margin:4px 0 12px">운영진 비밀번호를 입력하면 결과 입력·공지·추첨·4강 배정을 할 수 있어요. 이 기기에서는 로그아웃 전까지 로그인이 유지돼요.</p>'+
    '<label for="pw" class="small" style="font-weight:600">비밀번호</label><input id="pw" type="password" inputmode="numeric" autocomplete="current-password" required>'+
    (LOGIN_ERR?'<p class="small" style="color:var(--live);margin:8px 0 0">'+esc(LOGIN_ERR)+'</p>':'')+
    '<div class="sh-actions"><button type="submit" class="pri">들어가기</button></div></form>';
  return h+'</main><div id="sheet"></div><div id="toast" hidden></div>';}

function render(){C={};
  var app=document.getElementById('app');
  ui.admin=ui.page==='admin'&&EDITOR;
  if(ui.page==='admin'){app.innerHTML=adminHTML();return;}
  var h='<header id="hdr"><div class="wrap"><div class="brand"><small>2026 과천아리컵 축구대회</small><b>과천아리컵 · 유소년부</b><span>10.31(토) · 관문체육공원</span></div></div></header>';
  h+=offlineBar();
  if(STATE.notice)h+='<div class="notice"><div class="wrap"><b>공지</b><p>'+esc(STATE.notice)+'</p></div></div>';
  h+='<main class="wrap" id="view">'+(ui.tab==='place'?placeTabHTML():ui.tab==='home'?homeHTML():ui.tab==='pre'?preHTML():mainHTML())+'</main>';
  h+='<nav id="nav" aria-label="메뉴"><div class="in">'+[['place','장소'],['home','홈'],['pre','예선'],['main','본선']].map(function(t){return '<button type="button" data-tab="'+t[0]+'"'+(ui.tab===t[0]?' aria-current="page"':'')+'>'+ICON[t[0]]+t[1]+'</button>';}).join('')+'</div></nav>';
  h+='<div id="sheet"></div><div id="toast" hidden></div>';
  app.innerHTML=h;
  try{ls('arijr-ui',JSON.stringify({tab:ui.tab,div:ui.div,sub:ui.sub,mydiv:ui.mydiv}));}catch(e){}
}
var toastT;function toast(msg){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},4200);}

/* ---------- 결과 입력 시트 ---------- */
var draft=null;
function openSheet(id){var m=BYID[id];if(!m)return;var r=STATE.results[id]||{};
  var cur=mstate(m);
  draft={id:id,h:r.h!=null?r.h:0,a:r.a!=null?r.a:0,hy:r.hy||0,hr:r.hr||0,ay:r.ay||0,ar:r.ar||0,w:r.w||'',cur:cur,st:cur==='sched'?'live':'done'};drawSheet();}
function stepper(k,v,sm){return '<div class="step'+(sm?' sm':'')+'"><button type="button" data-st="'+k+'" data-d="-1" aria-label="빼기">−</button><output class="num">'+v+'</output><button type="button" data-st="'+k+'" data-d="1" aria-label="더하기">+</button></div>';}
function drawSheet(){var el=document.getElementById('sheet');if(!draft){el.innerHTML='';return;}
  var m=BYID[draft.id],hs=side(m,'h'),as=side(m,'a');
  function team(s,p){return '<div class="sh-team"><div class="nm">'+esc(s.name)+'</div><div class="sh-grid"><span>득점</span>'+stepper(p,draft[p])+'<span class="muted">경고</span>'+stepper(p+'y',draft[p+'y'],1)+'<span class="muted">퇴장</span>'+stepper(p+'r',draft[p+'r'],1)+'</div></div>';}
  var h='<div class="sheet-bg" id="sheetbg"><div class="sheet" role="dialog" aria-modal="true" aria-label="경기 결과 입력"><h3>'+m.t+' · '+fieldName(m.f)+'</h3><div class="small muted">'+esc(stageTag(m))+' · 현재 '+({sched:'예정',live:'경기 중',done:'종료'})[draft.cur]+'</div>'+
    '<div class="seg" role="group" aria-label="경기 상태">'+[['sched','예정'],['live','경기 중'],['done','종료']].map(function(o){return '<button type="button" data-dst="'+o[0]+'" aria-pressed="'+(draft.st===o[0])+'">'+o[1]+'</button>';}).join('')+'</div>';
  if(draft.st==='sched')h+='<div class="sh-note">'+(draft.cur==='sched'?'아직 시작 전인 경기예요. 시작하면 <b>경기 중</b>을 눌러 표시해 주세요.':'저장하면 진행 표시와 입력된 점수가 지워지고 <b>예정</b>으로 돌아가요.')+'</div>';
  else if(draft.st==='live')h+='<div class="sh-note">참가자 화면에 <b style="color:var(--live)">● 경기 중</b>으로 표시돼요. 점수는 비워둬도 되고, 중간 스코어를 넣으면 함께 보여요. 순위에는 <b>종료</b>로 저장한 경기만 반영돼요.</div>'+team(hs,'h')+team(as,'a');
  else h+='<div class="sh-note">최종 스코어를 저장하면 순위표와 본선 대진에 바로 반영돼요.</div>'+team(hs,'h')+team(as,'a');
  if(draft.st==='done'&&m.stage==='ko'&&draft.h===draft.a)h+='<div class="sh-team"><div class="nm">무승부 · 승부차기 승리 팀 (3인 → 서든데스)</div><div class="radio"><label><input type="radio" name="w" value="h"'+(draft.w==='h'?' checked':'')+'>'+esc(hs.name)+' 승부차기 승</label><label><input type="radio" name="w" value="a"'+(draft.w==='a'?' checked':'')+'>'+esc(as.name)+' 승부차기 승</label></div><div class="small muted" style="margin-top:6px">승부차기가 끝나면 선택. 비워두면 결과 입력 대기로 표시돼요.</div></div>';
  var lbl=draft.st==='sched'?(draft.cur==='sched'?'':'예정으로 되돌리기'):draft.st==='live'?(draft.cur==='live'?'중간 스코어 저장':'경기 중으로 표시'):'최종 결과 저장';
  h+='<div class="sh-actions"><button type="button" data-act="close">취소</button>'+(lbl?'<button type="button" class="pri" data-act="save">'+lbl+'</button>':'')+'</div></div></div>';
  el.innerHTML=h;}
var slotDraft=null;
function openSlots(dv){slotDraft={div:dv||ui.div,map:JSON.parse(JSON.stringify(STATE.slots||{}))};drawSlotSheet();}
function slotEff(d,s){var o=d.map[d.div+':'+s];if(o)return o==='X'?null:o;return autoSlot(d.div,s);}
function drawSlotSheet(){C={};var d=slotDraft,div=d.div,gs=Object.keys(DIV[div].groups),n=DIV[div].adv,r;
  var seen={},dup={};gs.forEach(function(g){for(var q=1;q<=n;q++){var t=slotEff(d,g+q);if(t){if(seen[t])dup[t]=1;seen[t]=1;}}});
  var h='<div class="sheet-bg" id="sheetbg"><div class="sheet" role="dialog" aria-modal="true" aria-label="본선 팀 배정 수정"><h3>'+DIV[div].name+' 4강 팀 배정</h3><div class="small muted">"자동"이면 예선 순위대로 들어가요. 실격 팀 자리는 다른 팀으로 바꾸거나 "실격 · 빈 자리"로 두세요. 바꾼 자리는 참가자 화면에 "조정"으로 표시돼요.</div>';
  for(r=1;r<=n;r++){h+='<div class="sh-team"><div class="nm">'+(multiG(div)?'각 조 '+r+'위 자리':'예선 '+r+'위 자리')+'</div><div class="slotgrid">';
    gs.forEach(function(g){var s=g+r,key=div+':'+s,o=d.map[key]||'',a=autoSlot(div,s),eff=slotEff(d,s);
      var opts='<option value="">자동 · '+(a?esc(nameOf(div,a)):'예선 미확정')+'</option>'+DIV[div].groups[g].map(function(t,i){var v=g+(i+1);return '<option value="'+v+'"'+(o===v?' selected':'')+'>'+esc(t)+'</option>';}).join('')+'<option value="X"'+(o==='X'?' selected':'')+'>실격 · 빈 자리</option>';
      h+='<label class="slotrow'+(o?' adj':'')+(eff&&dup[eff]?' dup':'')+'"><span>'+esc(slotName(div,s))+'</span><select data-slot="'+key+'">'+opts+'</select></label>';});
    h+='</div></div>';}
  var dk=Object.keys(dup);
  if(dk.length)h+='<div class="sh-note" style="color:var(--live)">같은 팀이 두 자리에 들어가 있어요: '+dk.map(function(k){return esc(nameOf(div,k));}).join(', ')+'. 한 자리를 바꿔야 저장할 수 있어요.</div>';
  h+='<div class="sh-actions"><button type="button" data-act="close">닫기</button><button type="button" class="pri" data-act="saveslots"'+(dk.length?' disabled':'')+'>배정 저장</button></div></div></div>';
  document.getElementById('sheet').innerHTML=h;}
/* ---------- 관리자: 팀 검색 ---------- */
function norm(s){return String(s||'').toLowerCase().replace(/[\s_\-]+/g,'');}
function teamSearchHTML(){var q=norm(ui.q);
  if(!q)return '<p class="small muted" style="margin:8px 2px 0">팀명 일부만 입력해도 찾아요. 경기를 누르면 스코어·경고·퇴장을 고칠 수 있어요.</p>';
  var hits=[];DIVS.forEach(function(d){Object.keys(DIV[d].groups).forEach(function(g){DIV[d].groups[g].forEach(function(t,i){if(norm(t).indexOf(q)>=0)hits.push({d:d,k:g+(i+1),n:t});});});});
  if(!hits.length)return '<p class="small muted" style="margin:8px 2px 0">"'+esc(ui.q)+'"와 일치하는 팀이 없어요.</p>';
  var more=hits.length-4;hits=hits.slice(0,4);
  return hits.map(function(x){var g=x.k[0],tb=groupTable(x.d,g),rk=0;tb.forEach(function(r,i){if(r.k===x.k)rk=i+1;});var me=tb[rk-1];
    var ms=M.filter(function(m){return m.div===x.d&&(m.stage==='pre'?(m.h===x.k||m.a===x.k):(side(m,'h').key===x.k||side(m,'a').key===x.k));});
    var sl=groupDone(x.d,g)?teamSlot(x.d,x.k):null,gd=me.gf-me.ga;
    return '<div class="tcard"><div class="tc-h"><b>'+esc(x.n)+'</b><span class="pill '+x.d+'">'+DIV[x.d].name+(multiG(x.d)?' '+g+'조':'')+'</span>'+(tentOf(x.d,x.k)?'<span class="pill">텐트 '+tentOf(x.d,x.k)+'</span>':'')+(sl?'<span class="pill gold">4강 진출</span>':'')+'</div>'+
      '<div class="tc-s small">예선 '+dispRank(tb,rk-1)+'위'+(me.tie?' (추첨 대기)':'')+' · 승점 '+me.pts+' · '+me.w+'승 '+me.d+'무 '+me.l+'패 · 득실 '+(gd>0?'+':'')+gd+' · 득점 '+me.gf+'</div>'+
      '<div class="mlist">'+ms.map(function(m){return matchCard(m);}).join('')+'</div></div>';}).join('')+
    (more>0?'<p class="small muted">일치하는 팀이 '+more+'개 더 있어요. 이름을 더 입력해 주세요.</p>':'');}

/* ---------- 관리자: 일괄 초기화 ---------- */
var resetDraft=null;
function resetIds(scope){return Object.keys(STATE.results).filter(function(id){var m=BYID[id];return scope==='all'||(m&&m.div===scope);});}
function openReset(){resetDraft={scope:'all',extra:false,txt:''};drawResetSheet();}
function drawResetSheet(){var d=resetDraft,n=resetIds(d.scope).length,ok=d.txt.trim()==='초기화';
  var h='<div class="sheet-bg" id="sheetbg"><div class="sheet" role="dialog" aria-modal="true" aria-label="결과 일괄 초기화"><h3>결과 일괄 초기화</h3><div class="small muted">고른 범위의 경기가 모두 "예정"으로 돌아가요. 되돌릴 수 없어요.</div>'+
    '<div class="seg" role="group" aria-label="범위">'+[['all','전체'],['y1','1학년'],['y2','2학년']].map(function(o){return '<button type="button" data-rscope="'+o[0]+'" aria-pressed="'+(d.scope===o[0])+'">'+o[1]+'</button>';}).join('')+'</div>'+
    '<div class="sh-note">입력된 경기 <b>'+n+'개</b>(경기 중 포함)가 예정으로 바뀌어요.</div>'+
    '<label class="chk"><input type="checkbox" id="rextra"'+(d.extra?' checked':'')+'> 동률 추첨 순서와 4강 팀 배정(조정)도 함께 초기화</label>'+
    '<label class="small" for="rconfirm" style="display:block;margin-top:12px;font-weight:600">확인을 위해 <b>초기화</b>라고 입력하세요</label><input id="rconfirm" class="search" autocomplete="off" value="'+esc(d.txt)+'">'+
    '<div class="sh-actions"><button type="button" data-act="close">취소</button><button type="button" class="pri dangerbtn" data-act="doreset"'+(ok?'':' disabled')+'>'+(d.scope==='all'?'전체':DIV[d.scope].name)+' 초기화</button></div></div></div>';
  document.getElementById('sheet').innerHTML=h;}

var drawDraft=null;
function tableFor(dk){var p=dk.split(':');return groupTable(p[1],p[2]);}
function drawTitle(dk){var p=dk.split(':');return DIV[p[1]].name+' '+gLabel(p[1],p[2])+'예선';}
function drawLabel(dk,k){var p=dk.split(':');return nameOf(p[1],k);}
function openDraw(dk){C={};var rows=tableFor(dk),runs={},order=[];
  rows.forEach(function(r,i){if(r.run!=null){if(!runs[r.run]){runs[r.run]={start:i,keys:[]};order.push(r.run);}runs[r.run].keys.push(r.k);}});
  drawDraft={dk:dk,runs:order.map(function(id){return runs[id];})};drawDrawSheet();}
function drawDrawSheet(){var el=document.getElementById('sheet'),d=drawDraft;
  var h='<div class="sheet-bg" id="sheetbg"><div class="sheet" role="dialog" aria-modal="true" aria-label="추첨 순위 지정"><h3>추첨 순위 지정</h3><div class="small muted">'+esc(drawTitle(d.dk))+' · 승점·골득실·다득점이 모두 같은 팀</div>';
  if(!d.runs.length)h+='<div class="sh-note">지금은 추첨이 필요한 동률 팀이 없어요.</div>';
  d.runs.forEach(function(run,ri){h+='<div class="sh-team"><div class="nm">'+(run.start+1)+'–'+(run.start+run.keys.length)+'위 동률</div><ol class="drawlist">'+
    run.keys.map(function(k,i){return '<li><span class="dp num">'+(run.start+i+1)+'위</span><span class="dn">'+esc(drawLabel(d.dk,k))+'</span><button type="button" data-mv="'+ri+':'+i+':-1"'+(i===0?' disabled':'')+' aria-label="한 칸 위로">▲</button><button type="button" data-mv="'+ri+':'+i+':1"'+(i===run.keys.length-1?' disabled':'')+' aria-label="한 칸 아래로">▼</button></li>';}).join('')+'</ol></div>';});
  if(d.runs.length)h+='<div class="sh-note">현장 추첨 결과대로 ▲▼로 순서를 맞춘 뒤 저장하세요. 순위표와 4강 배정에 바로 반영돼요.</div>';
  var has=STATE.draws&&STATE.draws[d.dk];
  h+='<div class="sh-actions">'+(has?'<button type="button" class="del" data-act="cleardraw">지정 취소</button>':'')+'<button type="button" data-act="close">닫기</button>'+(d.runs.length?'<button type="button" class="pri" data-act="savedraw">추첨 결과 저장</button>':'')+'</div></div></div>';
  el.innerHTML=h;}
function noticeSheet(){var el=document.getElementById('sheet');
  el.innerHTML='<div class="sheet-bg" id="sheetbg"><div class="sheet" role="dialog" aria-modal="true" aria-label="공지 편집"><h3>상단 공지</h3><div class="small muted">모든 참가자 화면 맨 위에 표시돼요. 비우고 저장하면 공지가 사라져요.</div><textarea id="noticeta" placeholder="예) 3구장 경기 10분씩 지연되고 있어요">'+esc(STATE.notice||'')+'</textarea><div class="sh-actions"><button type="button" data-act="close">취소</button><button type="button" class="pri" data-act="savenotice">저장</button></div></div></div>';}

/* ---------- 서버 통신 ---------- */
function busy(on){var b=document.getElementById('busy');if(on&&!b){b=document.createElement('div');b.id='busy';b.className='busy';b.textContent='저장 중…';document.body.appendChild(b);}else if(!on&&b)b.remove();}
function api(path,opt){return fetch(path,opt).then(function(r){return r.json().catch(function(){return{};}).then(function(j){if(!r.ok){var e=new Error(j.error||('서버 오류 '+r.status));e.status=r.status;throw e;}return j;});});}
function applyServer(j){if(!j||!j.state)return;VER=j.ver;var s=j.state;STATE={results:s.results||{},notice:s.notice||'',draws:s.draws||{},slots:s.slots||{}};LOADED=true;}
function uiBusy(){var ae=document.activeElement,tag=ae&&ae.tagName;return tag==='TEXTAREA'||tag==='SELECT'||tag==='INPUT'||!!document.getElementById('sheetbg')||!!document.getElementById('busy');}
function refresh(){if(uiBusy()){PENDING=true;return;}PENDING=false;var y=window.scrollY;render();window.scrollTo(0,y);}
function closeSheet(){draft=null;drawDraft=null;slotDraft=null;resetDraft=null;var s=document.getElementById('sheet');if(s)s.innerHTML='';if(PENDING)setTimeout(refresh,0);}
function save(op,okMsg){
  if(!EDITOR||!PW){toast('관리자 로그인이 필요해요.');return;}
  busy(true);
  api('/api/op',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Password':encodeURIComponent(PW)},body:JSON.stringify(op)}).then(function(j){
    applyServer(j);OFFLINE=false;draft=null;drawDraft=null;slotDraft=null;busy(false);var y=window.scrollY;render();window.scrollTo(0,y);toast(okMsg);
  },function(e){busy(false);
    if(e.status===401||e.status===429){logout(e.message);}
    else toast('저장하지 못했어요. '+e.message+' 다시 시도해 주세요.');});}
function login(pw){
  return api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})}).then(function(){PW=pw;EDITOR=true;LOGIN_ERR='';ls('arijr-pw',pw);});}
function logout(msg){PW=null;EDITOR=false;LOGIN_ERR=msg||'';ls('arijr-pw',null);closeSheet();render();}

/* ---------- 이벤트 ---------- */
document.addEventListener('click',function(e){var t=e.target.closest('button,[data-mid],#sheetbg');if(!t)return;
  if(t.id==='sheetbg'){if(e.target===t)closeSheet();return;}
  if(t.dataset.tab){ui.tab=t.dataset.tab;render();window.scrollTo(0,0);return;}
  if(t.dataset.seg){ui[t.dataset.seg]=t.dataset.v;if(t.dataset.seg==='div')ui.field=0;
    if(t.dataset.seg==='mydiv'&&MY&&MY.split(':')[0]!==t.dataset.v){MY=null;ls('arijr-my',null);}
    render();return;}
  if(t.dataset.field!=null){ui.field=+t.dataset.field;render();return;}
  if(t.dataset.copy){var v=t.dataset.copy;var p=navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(v):Promise.reject();p.then(function(){toast('복사했어요: '+v);},function(){toast(v);});return;}
  if(t.dataset.slots){openSlots(t.dataset.slots);return;}
  if(t.dataset.reset){openReset();return;}
  if(t.dataset.rscope&&resetDraft){resetDraft.scope=t.dataset.rscope;drawResetSheet();return;}
  if(t.dataset.draw){openDraw(t.dataset.draw);return;}
  if(t.dataset.mv){var q=t.dataset.mv.split(':'),run=drawDraft.runs[+q[0]],i1=+q[1],j1=i1+(+q[2]);var tmp=run.keys[i1];run.keys[i1]=run.keys[j1];run.keys[j1]=tmp;drawDrawSheet();return;}
  if(t.dataset.dst){draft.st=t.dataset.dst;drawSheet();return;}
  if(t.dataset.st){var k=t.dataset.st;draft[k]=Math.max(0,Math.min(k.length>1?5:30,draft[k]+(+t.dataset.d)));if(draft.h!==draft.a)draft.w='';drawSheet();return;}
  if(t.dataset.act){var a=t.dataset.act;
    if(a==='close'){closeSheet();return;}
    if(a==='logout'){logout('');return;}
    if(a==='doreset'&&resetDraft){if(resetDraft.txt.trim()!=='초기화')return;var sc=resetDraft.scope;
      save({type:'reset',scope:sc,ids:sc==='all'?[]:resetIds(sc),extra:!!resetDraft.extra},(sc==='all'?'전체':DIV[sc].name)+' 경기를 모두 예정으로 되돌렸어요');return;}
    if(a==='saveslots'&&slotDraft){var mp={};Object.keys(slotDraft.map).forEach(function(k){if(k.indexOf(slotDraft.div+':')===0)mp[k]=slotDraft.map[k];});
      save({type:'slots',div:slotDraft.div,map:mp},DIV[slotDraft.div].name+' 4강 팀 배정을 저장했어요');return;}
    if(a==='savedraw'&&drawDraft){var all=[];drawDraft.runs.forEach(function(r){all=all.concat(r.keys);});
      var order=(STATE.draws[drawDraft.dk]||[]).filter(function(k){return all.indexOf(k)<0;}).concat(all);
      save({type:'draw',dk:drawDraft.dk,order:order},drawTitle(drawDraft.dk)+' 추첨 결과를 저장했어요');return;}
    if(a==='cleardraw'&&drawDraft){save({type:'draw',dk:drawDraft.dk,order:null},drawTitle(drawDraft.dk)+' 추첨 지정을 취소했어요');return;}
    if(a==='savenotice'){var txt=(document.getElementById('noticeta').value||'').trim().slice(0,400);document.activeElement&&document.activeElement.blur&&document.activeElement.blur();
      save({type:'notice',text:txt},txt?'공지를 게시했어요':'공지를 내렸어요');return;}
    if(a==='save'&&draft){var m=BYID[draft.id],where=m.t+' '+fieldName(m.f)+' ';
      if(draft.st==='sched'){save({type:'result',id:draft.id,rec:null},where+'경기를 예정으로 되돌렸어요');return;}
      var w=document.querySelector('input[name="w"]:checked');var rec={h:draft.h,a:draft.a,hy:draft.hy,hr:draft.hr,ay:draft.ay,ar:draft.ar};
      if(draft.st==='live'){rec.st='live';save({type:'result',id:draft.id,rec:rec},where+'경기 중으로 표시했어요');return;}
      if(m.stage==='ko'&&draft.h===draft.a&&w)rec.w=w.value;
      save({type:'result',id:draft.id,rec:rec},where+'최종 결과를 저장했어요');return;}}
  if(t.dataset.mid&&ui.admin){openSheet(t.dataset.mid);}
});
document.addEventListener('input',function(e){var id=e.target.id;
  if(id==='tq'){ui.q=e.target.value;C={};var box=document.getElementById('tqres');if(box)box.innerHTML=teamSearchHTML();return;}
  if(id==='rconfirm'&&resetDraft){resetDraft.txt=e.target.value;var b=document.querySelector('[data-act="doreset"]');if(b)b.disabled=resetDraft.txt.trim()!=='초기화';}});
document.addEventListener('change',function(e){if(e.target.id==='mysel'){MY=e.target.value||null;ls('arijr-my',MY);render();return;}
  if(e.target.id==='rextra'&&resetDraft){resetDraft.extra=e.target.checked;return;}
  var sk=e.target.dataset&&e.target.dataset.slot;
  if(sk&&slotDraft){var v=e.target.value;if(v)slotDraft.map[sk]=v;else delete slotDraft.map[sk];
    var sh=document.querySelector('.sheet'),y=sh?sh.scrollTop:0;drawSlotSheet();var sh2=document.querySelector('.sheet');if(sh2)sh2.scrollTop=y;}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('sheetbg'))closeSheet();});
document.addEventListener('submit',function(e){if(e.target.id!=='loginform')return;e.preventDefault();
  var pw=(document.getElementById('pw').value||'').trim();if(!pw)return;busy(true);
  login(pw).then(function(){busy(false);render();load();},function(err){busy(false);LOGIN_ERR=err.message||'로그인하지 못했어요.';render();var f=document.getElementById('pw');if(f)f.focus();});});
document.addEventListener('focusout',function(){setTimeout(function(){if(PENDING&&!uiBusy())refresh();},50);});

/* ---------- 시작 ---------- */
var lastMin=-1;
function tick(){var n=now();if(n.min!==lastMin){lastMin=n.min;refresh();}}
function load(){
  return api('/api/state',{cache:'no-store'}).then(function(j){var wasOff=OFFLINE;OFFLINE=false;
    if(j.ver!==VER||!LOADED){applyServer(j);refresh();}else if(PENDING||wasOff)refresh();},
    function(){if(!OFFLINE){OFFLINE=true;refresh();}});}
function start(){
  MY=ls('arijr-my')||null;
  try{var s=JSON.parse(ls('arijr-ui')||'null');if(s){ui.tab=s.tab||ui.tab;ui.div=s.div||ui.div;ui.sub=s.sub||ui.sub;ui.mydiv=s.mydiv||null;}}catch(e){}
  if(['place','home','pre','main'].indexOf(ui.tab)<0)ui.tab='home';if(ui.map!=='park')ui.map='field';
  if(DIVS.indexOf(ui.div)<0)ui.div='y1';if(ui.mydiv&&DIVS.indexOf(ui.mydiv)<0)ui.mydiv=null;if(MY&&!/^(y1|y2):[AB][1-6]$/.test(MY))MY=null;
  render();lastMin=now().min;
  if(MODE==='admin'){var saved=ls('arijr-pw');if(saved){login(saved).then(function(){render();},function(e){if(e.status===401)logout('비밀번호가 바뀌었어요. 다시 로그인해 주세요.');});}}
  load();
  setInterval(function(){if(!document.hidden)load();},MODE==='admin'?5000:8000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)load();});
  setInterval(tick,20000);
}
start();
})();
