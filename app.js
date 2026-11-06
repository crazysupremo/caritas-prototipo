/* =========================================================
   CONFIGURACIÓN DE FIREBASE
   Consola de Firebase → Configuración del proyecto → Tus apps → Web
   (En la versión demo esto no se usa.)
   ========================================================= */
const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  appId: "PEGA_AQUI_TU_APP_ID"
};

(function(){
"use strict";

/* ---------- Datos fijos ---------- */
const CATS = [
  {id:"deporte",   name:"Deportes",               color:"#2F8A3B"},
  {id:"cultura",   name:"Cultura y exposiciones", color:"#0E7C86"},
  {id:"musica",    name:"Música",                 color:"#7C4DCC"},
  {id:"teatro",    name:"Teatro y cine",          color:"#C2410C"},
  {id:"infantil",  name:"Infantil y familia",     color:"#D9467A"},
  {id:"gastro",    name:"Gastronomía",            color:"#B7791F"},
  {id:"fiestas",   name:"Fiestas y tradición",    color:"#D23B2E"},
  {id:"formacion", name:"Charlas y talleres",     color:"#3565C4"},
  {id:"otros",     name:"Otros",                  color:"#6B7785"}
];
const CAT = Object.fromEntries(CATS.map(c=>[c.id,c]));
const ASSOC_TYPES = ["Cultural","Deportiva","Vecinal","Juvenil","De mayores","Social o solidaria","Educativa","Otra"];
const PAGES = {inicio:"Agenda", mapa:"Mapa de eventos", calendario:"Calendario", noticias:"Noticias", asociaciones:"Asociaciones", publicar:"Área de asociaciones"};
const MIRANDA = [42.6858, -2.9466];

/* ---------- Estado ---------- */
const S = {
  db:null, auth:null, user:null, authReady:false, isAdmin:false,
  assocs:new Map(), events:[], news:[], ready:{a:false,e:false,n:false},
  route:"inicio", month:firstOfMonth(new Date()), selected:ymd(new Date()), q:"",
  authMode:"login", editingProfile:false, kind:"evento", editId:null, pendingDel:null, busy:false,
  panelKey:"", formKey:"", img:null, logo:null, loc:null, imgCache:new Map(), mapCat:"todas"
};

/* ---------- Utilidades ---------- */
function pad(n){return String(n).padStart(2,"0")}
function ymd(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function parse(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function addDays(s,n){const d=parse(s);d.setDate(d.getDate()+n);return ymd(d)}
function firstOfMonth(d){return new Date(d.getFullYear(),d.getMonth(),1)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeUrl(u){if(!u)return"";let s=String(u).trim();if(!/^https?:\/\//i.test(s))s="https://"+s;try{const x=new URL(s);return /^https?:$/.test(x.protocol)?x.href:""}catch(e){return""}}
const fLong=new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long"});
const fMonth=new Intl.DateTimeFormat("es-ES",{month:"long"});
const fShort=new Intl.DateTimeFormat("es-ES",{month:"short"});
const fDow=new Intl.DateTimeFormat("es-ES",{weekday:"short"});
function longDate(s){const t=fLong.format(parse(s));return t.charAt(0).toUpperCase()+t.slice(1)}
function $(id){return document.getElementById(id)}
function val(id){const el=$(id);return el?el.value.trim():""}
function setMsg(id,t,k){const m=$(id);if(m){m.textContent=t;m.className="msg"+(k?" "+k:"")}}
function today(){return ymd(new Date())}
function coords(e){return e&&typeof e.lat==="number"&&typeof e.lng==="number"&&isFinite(e.lat)&&isFinite(e.lng)?[e.lat,e.lng]:null}
function initials(n){return String(n||"?").replace(/^(Asociaci[oó]n|Club|AMPA)\s+/i,"").split(/\s+/).filter(w=>w&&!/^(de|del|la|las|el|los|y|e|en)$/i.test(w)).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"?"}
function logoHtml(a,cls){
  cls=cls||"logo";
  return a.logo?`<img class="${cls}" alt="Logo de ${esc(a.nombre)}" data-logo="${esc(a.id)}">`:`<span class="${cls} ph" aria-hidden="true">${esc(initials(a.nombre))}</span>`;
}
function directionsUrl(e){
  const c=coords(e);
  if(c) return "https://www.google.com/maps/dir/?api=1&destination="+c[0]+","+c[1];
  const q=[e.direccion||e.lugar,"Miranda de Ebro"].filter(Boolean).join(", ");
  return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
}
function loaded(){return S.ready.a&&S.ready.e&&S.ready.n}

/* ---------- Datos derivados ---------- */
function okAssoc(id){const a=S.assocs.get(id);return a&&a.estado==="aprobada"&&a.nombre?a:null}
function pubEvents(){
  return S.events.map(e=>{const a=okAssoc(e.asociacionId);return a&&e.fecha&&e.titulo?Object.assign({},e,{org:a}):null})
    .filter(Boolean).sort((x,y)=>(x.fecha+(x.hora||"")).localeCompare(y.fecha+(y.hora||"")));
}
function upcoming(){const t=today();return pubEvents().filter(e=>(e.fechaFin||e.fecha)>=t)}
function pubNews(){
  return S.news.map(n=>{const a=okAssoc(n.asociacionId);return a&&n.titulo?Object.assign({},n,{org:a}):null})
    .filter(Boolean).sort((x,y)=>(y.publicado||"").localeCompare(x.publicado||""));
}
function onDay(e,d){return e.fecha<=d&&d<=(e.fechaFin||e.fecha)}
function search(list){
  if(!S.q) return list; const q=S.q.toLowerCase();
  return list.filter(e=>[e.titulo,e.lugar,e.descripcion,e.org.nombre].join(" ").toLowerCase().includes(q));
}
function myAssoc(){return S.user?S.assocs.get(S.user.uid):null}
function mine(kind){const list=kind==="noticia"?S.news:S.events;return S.user?list.filter(x=>x.asociacionId===S.user.uid):[]}
function findItem(id){return S.events.find(x=>x.id===id)||S.news.find(x=>x.id===id)}

/* ---------- Navegación ---------- */
function routeFromHash(){
  const h=(location.hash||"").replace("#","");
  if(PAGES[h]) return h;
  if(h.startsWith("cat-")&&CAT[h.slice(4)]) return h;
  return "inicio";
}
function go(r){
  if(location.hash!=="#"+r) location.hash=r; else onRoute();
}
function onRoute(){
  S.route=routeFromHash(); S.panelKey=""; S.formKey=""; closeNav(); clearTimeout(S.qT);
  document.querySelectorAll(".nav a[data-route]").forEach(a=>a.setAttribute("aria-current",a.dataset.route===S.route?"page":"false"));
  const title=S.route.startsWith("cat-")?CAT[S.route.slice(4)].name:PAGES[S.route];
  $("pageTitle").textContent=title;
  render(); window.scrollTo(0,0);
}
function isWide(){return window.matchMedia("(min-width:901px)").matches}
function openNav(){document.body.classList.add("nav-open")}
function closeNav(){document.body.classList.remove("nav-open")}
function toggleNav(){
  if(isWide()){
    const c=!document.body.classList.contains("nav-collapsed");
    document.body.classList.toggle("nav-collapsed",c);
    try{localStorage.setItem("apoia-nav",c?"cerrado":"abierto")}catch(e){}
  } else document.body.classList.toggle("nav-open");
}
try{if(localStorage.getItem("apoia-nav")==="cerrado")document.body.classList.add("nav-collapsed")}catch(e){}
function renderNav(){
  const counts={}; upcoming().forEach(e=>{counts[e.categoria]=(counts[e.categoria]||0)+1});
  $("navCats").innerHTML=CATS.filter(c=>c.id!=="otros"||counts.otros).map(c=>
    `<a href="#cat-${c.id}" data-route="cat-${c.id}" aria-current="${S.route==="cat-"+c.id?"page":"false"}"><span class="dot" style="background:${c.color}"></span><span>${esc(c.name)}</span>${counts[c.id]?`<span class="count">${counts[c.id]}</span>`:""}</a>`).join("");
}

/* ---------- Tarjetas ---------- */
function eventCard(e){
  const d=parse(e.fecha), c=CAT[e.categoria]||CAT.otros;
  const when=(e.fechaFin&&e.fechaFin!==e.fecha)?`Hasta el ${parse(e.fechaFin).getDate()} ${fShort.format(parse(e.fechaFin))}`:(e.hora?e.hora+(e.horaFin?"–"+e.horaFin:""):"Todo el día");
  return `<button class="card-ev" data-ev="${esc(e.id)}">
    <span class="cover" style="--c:${c.color}">
      ${e.img?`<img alt="" data-img="${esc(e.id)}">`:""}
      <span class="date-badge"><b>${d.getDate()}</b><span>${esc(fShort.format(d))}</span></span>
    </span>
    <span class="body">
      <span class="cat-label" style="--c:${c.color}">${esc(c.name)}</span>
      <span class="t">${esc(e.titulo)}</span>
      <span class="meta">${esc(when)}${e.lugar?" · "+esc(e.lugar):""}</span>
      <span class="by">${logoHtml(e.org,"logo xs")}<span>${esc(e.org.nombre)}</span></span>
    </span>
  </button>`;
}
function eventRow(e){
  const d=parse(e.fecha), c=CAT[e.categoria]||CAT.otros;
  const meta=[e.hora?(e.hora+(e.horaFin?"–"+e.horaFin:"")):"Todo el día",e.lugar,e.org.nombre].filter(Boolean).map(esc).join(" · ");
  return `<button class="ev-row" data-ev="${esc(e.id)}" style="--c:${c.color}">
    <span class="d"><b>${d.getDate()}</b><span>${esc(fShort.format(d))}</span></span>
    <span class="txt"><span class="t">${esc(e.titulo)}</span><span class="meta">${meta}</span></span>
    ${e.img?`<img class="thumb" alt="" data-img="${esc(e.id)}">`:""}
  </button>`;
}
function newsCard(n){
  const d=n.publicado?new Date(n.publicado):null;
  return `<button class="card-news" data-news="${esc(n.id)}">
    ${n.img?`<span class="ncover"><img alt="" data-img="${esc(n.id)}"></span>`:""}
    <span class="body">
      <span class="ndate">${d?esc(longDate(ymd(d))):""} · ${esc(n.org.nombre)}</span>
      <span class="t">${esc(n.titulo)}</span>
      <span class="excerpt">${esc((n.texto||"").slice(0,170))}${(n.texto||"").length>170?"…":""}</span>
    </span>
  </button>`;
}
function empty(text,action){return `<div class="empty"><p>${text}</p>${action||""}</div>`}

/* ---------- Vistas ---------- */
function viewInicio(){
  return `<section class="intro">
      <h2>Qué hacer en Miranda</h2>
      <p>Eventos abiertos al público, publicados por las asociaciones de la ciudad.</p>
      <label class="sr" for="q">Buscar</label>
      <input class="search" id="q" type="search" placeholder="Buscar evento, lugar o asociación" value="${esc(S.q)}">
    </section>
    <div id="results"></div>`;
}
function fillInicio(){
  const box=$("results"); if(!box) return;
  if(!loaded()){box.innerHTML=empty("Cargando eventos…");return}
  const list=search(upcoming()), t=today(), wk=addDays(t,7);
  if(!list.length){box.innerHTML=S.q?empty("No hay eventos que coincidan con tu búsqueda."):empty("Todavía no hay eventos publicados.",`<a class="btn alt" href="#publicar">Publicar como asociación</a>`);return}
  const groups=[["Hoy",list.filter(e=>onDay(e,t))],["Esta semana",list.filter(e=>!onDay(e,t)&&e.fecha<=wk)],["Más adelante",list.filter(e=>!onDay(e,t)&&e.fecha>wk)]];
  box.innerHTML=groups.filter(g=>g[1].length).map(([h,l])=>`<section class="group"><h3>${h} <span>${l.length}</span></h3><div class="cards">${l.map(eventCard).join("")}</div></section>`).join("");
  hydrateImages(box);
}
function viewCategoria(id){
  const c=CAT[id];
  return `<section class="intro"><p class="eyebrow" style="--c:${c.color}">Categoría</p><h2>${esc(c.name)}</h2></section><div id="results"></div>`;
}
function fillCategoria(id){
  const box=$("results"); if(!box) return;
  if(!loaded()){box.innerHTML=empty("Cargando eventos…");return}
  const list=upcoming().filter(e=>e.categoria===id);
  box.innerHTML=list.length?`<div class="cards">${list.map(eventCard).join("")}</div>`:empty("No hay eventos próximos en esta categoría.",`<a class="btn alt" href="#inicio">Ver todos los eventos</a>`);
  hydrateImages(box);
}
function viewCalendario(){
  return `<div class="cal-layout">
    <div>
      <div class="month-head">
        <h2 class="month-title" id="monthTitle"></h2>
        <div class="month-nav">
          <button class="icon-btn" data-act="prev" aria-label="Mes anterior">‹</button>
          <button class="text-btn" data-act="today">Hoy</button>
          <button class="icon-btn" data-act="next" aria-label="Mes siguiente">›</button>
        </div>
      </div>
      <div class="grid" id="grid"></div>
    </div>
    <aside><h3 class="day-title" id="dayTitle"></h3><div class="rows" id="dayList"></div></aside>
  </div>`;
}
function fillCalendario(){
  if(!$("grid")) return;
  const m=S.month, evs=pubEvents(), t=today();
  $("monthTitle").innerHTML=esc(fMonth.format(m))+`<small>${m.getFullYear()}</small>`;
  const start=new Date(m); start.setDate(1-((m.getDay()+6)%7));
  let h=["L","M","X","J","V","S","D"].map(d=>`<div class="dow">${d}</div>`).join("");
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const k=ymd(d), inM=d.getMonth()===m.getMonth();
    if(i>=35&&!inM&&i%7===0) break;
    const l=evs.filter(e=>onDay(e,k));
    h+=`<button class="day${inM?"":" out"}${k===t?" today":""}" data-day="${k}" aria-pressed="${k===S.selected}" aria-label="${esc(longDate(k)+(l.length?", "+l.length+" eventos":""))}"><span class="n">${d.getDate()}</span>${l.length?`<span class="dots">${l.slice(0,5).map(e=>`<i style="background:${(CAT[e.categoria]||CAT.otros).color}"></i>`).join("")}</span>`:""}</button>`;
  }
  $("grid").innerHTML=h;
  $("dayTitle").textContent=longDate(S.selected);
  const day=evs.filter(e=>onDay(e,S.selected));
  $("dayList").innerHTML=day.length?day.map(eventRow).join(""):`<p class="muted">${loaded()?"No hay eventos este día.":"Cargando…"}</p>`;
  hydrateImages($("dayList"));
}
function viewNoticias(){return `<section class="intro"><h2>Noticias</h2><p>Novedades y avisos de las asociaciones.</p></section><div id="results"></div>`}
function fillNoticias(){
  const box=$("results"); if(!box) return;
  if(!loaded()){box.innerHTML=empty("Cargando noticias…");return}
  const l=pubNews();
  box.innerHTML=l.length?`<div class="news-list">${l.map(newsCard).join("")}</div>`:empty("Todavía no hay noticias publicadas.");
  hydrateImages(box);
}
function viewAsociaciones(){return `<section class="intro"><h2>Asociaciones</h2><p>Entidades que publican en Apoia+.</p></section><div id="results"></div>`}
function fillAsociaciones(){
  const box=$("results"); if(!box) return;
  if(!loaded()){box.innerHTML=empty("Cargando…");return}
  const t=today();
  const l=[...S.assocs.values()].filter(a=>a.estado==="aprobada"&&a.nombre).sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
  box.innerHTML=l.length?`<div class="orgs">${l.map(a=>{
    const n=S.events.filter(e=>e.asociacionId===a.id&&(e.fechaFin||e.fecha)>=t).length, web=safeUrl(a.web);
    return `<article class="org"><div class="org-head">${logoHtml(a,"logo lg")}<div><p class="type">Asociación ${esc((a.tipo||"").toLowerCase())}</p><h3>${esc(a.nombre)}</h3></div></div>
      ${a.descripcion?`<p class="desc">${esc(a.descripcion)}</p>`:""}
      <dl class="facts">${a.direccion?`<dt>Dirección</dt><dd>${esc(a.direccion)}</dd>`:""}${a.telefono?`<dt>Teléfono</dt><dd>${esc(a.telefono)}</dd>`:""}${a.email?`<dt>Email</dt><dd>${esc(a.email)}</dd>`:""}${web?`<dt>Web</dt><dd><a href="${esc(web)}" target="_blank" rel="noopener">${esc(a.web)}</a></dd>`:""}</dl>
      <p>${n?`<span class="badge">${n} evento${n>1?"s":""} próximo${n>1?"s":""}</span>`:`<span class="muted">Sin eventos próximos</span>`}</p></article>`}).join("")}</div>`:empty("Aún no hay asociaciones registradas.");
  hydrateImages(box);
}

/* ---------- Detalle (modal) ---------- */
function openEvent(id){
  const e=pubEvents().find(x=>x.id===id); if(!e) return; const o=e.org, c=CAT[e.categoria]||CAT.otros;
  const when=longDate(e.fecha)+(e.fechaFin&&e.fechaFin!==e.fecha?" – "+longDate(e.fechaFin):"");
  const link=safeUrl(e.enlace), web=safeUrl(o.web);
  modal(`${e.img?`<img class="hero-img" alt="${esc(e.titulo)}" data-img="${esc(e.id)}">`:""}
    <span class="cat-label" style="--c:${c.color}">${esc(c.name)}</span>
    <h2 id="mTitle">${esc(e.titulo)}</h2>
    <dl class="facts"><dt>Cuándo</dt><dd>${esc(when)}</dd><dt>Hora</dt><dd>${esc(e.hora?(e.hora+(e.horaFin?" – "+e.horaFin:"")):"Todo el día")}</dd>${e.lugar?`<dt>Dónde</dt><dd>${esc(e.lugar)}</dd>`:""}<dt>Precio</dt><dd>${esc(e.precio||"Gratis")}</dd>${e.direccion?`<dt>Dirección</dt><dd>${esc(e.direccion)}</dd>`:""}</dl>
    ${coords(e)?`<div class="map small" id="detailMap" aria-label="Mapa del lugar del evento"></div>`:""}
    ${(coords(e)||e.lugar||e.direccion)?`<div class="actions loc-actions"><a class="btn" id="dirLink" href="${esc(directionsUrl(e))}" target="_blank" rel="noopener">Cómo llegar</a>${coords(e)?`<a class="btn alt" href="#mapa" data-close="1" data-mapfocus="${esc(e.id)}">Ver en el mapa de eventos</a>`:""}</div>`:""}
    ${e.descripcion?`<p class="long">${esc(e.descripcion)}</p>`:""}
    <div class="org-card"><div class="org-row">${logoHtml(o,"logo md")}<div><span class="muted">Organiza</span><b>${esc(o.nombre)}</b></div></div><span>${[o.telefono,o.email].filter(Boolean).map(esc).join(" · ")}</span>${web?`<a href="${esc(web)}" target="_blank" rel="noopener">${esc(o.web)}</a>`:""}</div>
    <div class="actions">
      ${link?`<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Más información o entradas</a>`:""}
      <a class="btn alt" href="${esc(gcalUrl(e,o))}" target="_blank" rel="noopener">Añadir a Google Calendar</a>
      <button class="btn alt" data-close="1">Cerrar</button>
    </div>`);
  const pos=coords(e);
  if(pos){const m=makeMap("detailMap",pos,16);if(m)L.marker(pos,{icon:pinIcon(c2color(e)),keyboard:false}).addTo(m)}
}
function c2color(e){return (CAT[e.categoria]||CAT.otros).color}
function openNews(id){
  const n=pubNews().find(x=>x.id===id); if(!n) return;
  modal(`${n.img?`<img class="hero-img" alt="${esc(n.titulo)}" data-img="${esc(n.id)}">`:""}
    <span class="muted">${n.publicado?esc(longDate(ymd(new Date(n.publicado)))):""} · ${esc(n.org.nombre)}</span>
    <h2 id="mTitle">${esc(n.titulo)}</h2>
    <p class="long">${esc(n.texto||"")}</p>
    <div class="actions"><button class="btn alt" data-close="1">Cerrar</button></div>`);
}
function modal(inner){
  $("modalRoot").innerHTML=`<div class="overlay" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">${inner}</div></div>`;
  hydrateImages($("modalRoot"));
  const f=$("modalRoot").querySelector(".modal button, .modal a"); if(f) f.focus();
}
function closeModal(){dropMap("detailMap");$("modalRoot").innerHTML=""}
function stamp(d,t){return d.replace(/-/g,"")+(t?"T"+t.replace(":","")+"00":"")}
function gcalUrl(e,o){
  const end=e.fechaFin||e.fecha; let a,b;
  if(e.hora){let et=e.horaFin,ed=end;if(!et){const [h,m]=e.hora.split(":").map(Number);et=pad((h+2)%24)+":"+pad(m);if(h+2>=24)ed=addDays(end,1)}a=stamp(e.fecha,e.hora);b=stamp(ed,et)}
  else{a=stamp(e.fecha);b=stamp(addDays(end,1))}
  return "https://calendar.google.com/calendar/render?"+new URLSearchParams({action:"TEMPLATE",text:e.titulo,dates:a+"/"+b,details:(e.descripcion||"")+"\n\nOrganiza: "+o.nombre,location:e.lugar||"Miranda de Ebro",ctz:"Europe/Madrid"});
}

/* ---------- Imágenes ---------- */
function loadImage(item){
  if(!item||!item.img||!S.db) return Promise.resolve(null);
  const k=item.id+"|"+item.img; if(S.imgCache.has(k)) return S.imgCache.get(k);
  const p=S.db.collection("imagenes").doc(item.id).get().then(s=>{const u=s.exists?s.data().data:null;return(typeof u==="string"&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u))?u:null}).catch(()=>{S.imgCache.delete(k);return null});
  S.imgCache.set(k,p); return p;
}
function loadLogo(a){
  if(!a||!a.logo||!S.db) return Promise.resolve(null);
  const k="logo|"+a.id+"|"+a.logo; if(S.imgCache.has(k)) return S.imgCache.get(k);
  const p=S.db.collection("logos").doc(a.id).get().then(s=>{const u=s.exists?s.data().data:null;return(typeof u==="string"&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u))?u:null}).catch(()=>{S.imgCache.delete(k);return null});
  S.imgCache.set(k,p); return p;
}
function hydrateImages(root){
  (root||document).querySelectorAll("img[data-img]:not([src])").forEach(img=>{
    loadImage(findItem(img.dataset.img)).then(u=>{if(u){img.src=u;img.classList.add("in")}else img.remove()});
  });
  (root||document).querySelectorAll("img[data-logo]:not([src])").forEach(img=>{
    const a=S.assocs.get(img.dataset.logo);
    loadLogo(a).then(u=>{if(u){img.src=u;img.classList.add("in")}else{const ph=document.createElement("span");ph.className=img.className.replace(" in","")+" ph";ph.textContent=initials(a&&a.nombre);img.replaceWith(ph)}});
  });
}
function compressImage(file,maxSide,maxLen){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{URL.revokeObjectURL(url);let w=im.naturalWidth,h=im.naturalHeight,max=maxSide||1200,q=.8,out="",lim=maxLen||300000;
      for(let t=0;t<9;t++){const sc=Math.min(1,max/Math.max(w,h)),cv=document.createElement("canvas");cv.width=Math.round(w*sc);cv.height=Math.round(h*sc);const x=cv.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,cv.width,cv.height);x.drawImage(im,0,0,cv.width,cv.height);out=cv.toDataURL("image/jpeg",q);if(out.length<lim)return res(out);if(q>.55)q-=.1;else max=Math.round(max*.8)}
      out.length<lim*1.3?res(out):rej(new Error("big"))};
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("read"))}; im.src=url;
  });
}
function renderImgField(){
  const box=$("imgField"); if(!box) return; const im=S.img;
  box.innerHTML=(im&&im.url?`<img src="${im.url}" alt="Vista previa">`:`<span class="hint">${im&&im.loading?"Cargando imagen…":"Sin imagen"}</span>`)
    +`<div class="row-btns"><label class="small-btn" for="f_img">${im&&im.url?"Cambiar imagen":"Añadir imagen"}</label>${im&&im.url?`<button class="small-btn del" type="button" data-act="removeImg">Quitar</button>`:""}</div><input id="f_img" class="file" type="file" accept="image/*">`;
}
async function onPickImage(file){
  if(!file) return;
  if(!/^image\//.test(file.type)){setMsg("formMsg","Elige un archivo de imagen.","err");return}
  S.img={loading:true}; renderImgField();
  try{S.img={url:await compressImage(file),changed:true};setMsg("formMsg","")}catch(e){S.img=null;setMsg("formMsg","No se ha podido leer esa imagen. Prueba con otra.","err")}
  renderImgField();
}

function renderLogoField(){
  const box=$("logoField"); if(!box) return; const im=S.logo;
  box.innerHTML=(im&&im.url?`<img src="${im.url}" alt="Vista previa del logo" class="logo-preview">`:`<span class="hint">${im&&im.loading?"Cargando logo…":"Sin logo. Se mostrarán las iniciales."}</span>`)
    +`<div class="row-btns"><label class="small-btn" for="p_logo">${im&&im.url?"Cambiar logo":"Subir logo o foto"}</label>${im&&im.url?`<button class="small-btn del" type="button" data-act="removeLogo">Quitar</button>`:""}</div><input id="p_logo" class="file" type="file" accept="image/*">`;
}
async function onPickLogo(file){
  if(!file) return;
  if(!/^image\//.test(file.type)){setMsg("profileMsg","Elige un archivo de imagen.","err");return}
  S.logo={loading:true}; renderLogoField();
  try{S.logo={url:await compressImage(file,400,120000),changed:true};setMsg("profileMsg","")}catch(e){S.logo=null;setMsg("profileMsg","No se ha podido leer esa imagen. Prueba con otra.","err")}
  renderLogoField();
}

/* ---------- Mapas ---------- */
const maps={};
function haveMap(){return typeof window.L!=="undefined"&&typeof L.map==="function"}
function dropMap(id){if(maps[id]){try{maps[id].remove()}catch(e){}delete maps[id]}}
function makeMap(id,center,zoom){
  const el=$(id); if(!el) return null;
  dropMap(id);
  const old=el.nextElementSibling; if(old&&old.classList.contains("map-note")) old.remove();
  if(!haveMap()){el.classList.add("map-off");el.innerHTML='<p>El mapa no está disponible ahora. Comprueba la conexión a internet.</p>';return null}
  const m=L.map(el,{scrollWheelZoom:false,tap:true}).setView(center,zoom);
  const t=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(m);
  let warned=false;
  t.on("tileerror",()=>{if(warned)return;warned=true;const n=document.createElement("p");n.className="map-note";n.textContent="No se han podido cargar las calles del mapa. El marcador y «Cómo llegar» siguen funcionando.";el.after(n)});
  maps[id]=m; setTimeout(()=>{try{m.invalidateSize()}catch(e){}},80);
  return m;
}
function pinIcon(color){return L.divIcon({className:"pin-wrap",html:`<span class="pin" style="--c:${color}"></span>`,iconSize:[28,28],iconAnchor:[14,30],popupAnchor:[0,-28]})}

/* Mapa en el formulario del evento */
function initFormMap(e){
  const c=coords(e); S.loc=c?{lat:c[0],lng:c[1]}:null; S.formMarker=null;
  const m=makeMap("formMap",c||MIRANDA,c?16:14);
  if(m) m.on("click",ev=>{setLoc(ev.latlng.lat,ev.latlng.lng,false)});
  showLoc(false);
}
function setLoc(lat,lng,fly){S.loc={lat:+(+lat).toFixed(6),lng:+(+lng).toFixed(6)};showLoc(fly)}
function showLoc(fly,msg,err){
  if($("e_lat")){$("e_lat").value=S.loc?S.loc.lat:"";$("e_lng").value=S.loc?S.loc.lng:""}
  const m=maps.formMap;
  if(m){
    if(S.formMarker){m.removeLayer(S.formMarker);S.formMarker=null}
    if(S.loc){
      S.formMarker=L.marker([S.loc.lat,S.loc.lng],{icon:pinIcon((CAT[val("e_cat")]||CAT.otros).color),draggable:true}).addTo(m);
      S.formMarker.on("dragend",ev=>{const p=ev.target.getLatLng();setLoc(p.lat,p.lng,false)});
      if(fly) m.setView([S.loc.lat,S.loc.lng],16);
    }
  }
  const i=$("locInfo"); if(i){i.className="hint"+(err?" err":"");i.textContent=msg||(S.loc?`Ubicación marcada (${S.loc.lat.toFixed(5)}, ${S.loc.lng.toFixed(5)}). Puedes arrastrar el marcador para ajustarla.`:"Sin ubicación. Toca el mapa o busca la dirección.")}
  const b=$("clearLocBtn"); if(b) b.hidden=!S.loc;
}
async function geocode(){
  const q=val("e_dir")||val("e_lugar");
  if(!q) return showLoc(false,"Escribe la dirección o el lugar para buscarlo.",true);
  showLoc(false,"Buscando la dirección…");
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?"+new URLSearchParams({format:"json",limit:"1",countrycodes:"es",viewbox:"-3.05,42.73,-2.86,42.64",bounded:"0",q:q+", Miranda de Ebro"}),{headers:{"Accept-Language":"es"}});
    if(!r.ok) throw new Error("http");
    const j=await r.json();
    if(!Array.isArray(j)||!j.length) return showLoc(false,"No hemos encontrado esa dirección. Toca el mapa para marcar el sitio.",true);
    setLoc(+j[0].lat,+j[0].lon,true);
  }catch(e){showLoc(false,"No se ha podido buscar ahora. Toca el mapa para marcar el sitio.",true)}
}

/* Página «Mapa de eventos» */
function viewMapa(){
  return `<section class="intro"><h2>Mapa de eventos</h2><p>Dónde son los próximos eventos. Toca un marcador para ver los detalles.</p></section>
    <div class="filters" id="mapFilters"></div>
    <div class="map big" id="allMap" aria-label="Mapa con los próximos eventos"></div>
    <h3 class="map-list-title" id="mapCount"></h3>
    <div class="rows" id="mapList"></div>`;
}
function fillMapa(){
  if(!$("allMap")) return;
  const all=[{id:"todas",name:"Todas",color:null}].concat(CATS.filter(c=>c.id!=="otros"));
  $("mapFilters").innerHTML=all.map(c=>`<button class="chip" data-mapcat="${c.id}" aria-pressed="${S.mapCat===c.id}">${c.color?`<span class="dot" style="background:${c.color}"></span>`:""}${esc(c.name)}</button>`).join("");
  const list=upcoming().filter(e=>coords(e)&&(S.mapCat==="todas"||e.categoria===S.mapCat));
  const sinLoc=upcoming().filter(e=>!coords(e)).length;
  let m=maps.allMap;
  if(!m||m.getContainer()!==$("allMap")){m=makeMap("allMap",MIRANDA,14);S.mapLayer=null;S.mapFitted=false}
  if(m){
    if(S.mapLayer) S.mapLayer.clearLayers(); else S.mapLayer=L.layerGroup().addTo(m);
    list.forEach(e=>{
      const box=document.createElement("div"); box.className="pop";
      const d=parse(e.fecha);
      box.innerHTML=`<b>${esc(e.titulo)}</b><span>${esc(d.getDate()+" "+fShort.format(d))}${e.hora?" · "+esc(e.hora):""}${e.lugar?" · "+esc(e.lugar):""}</span>`;
      const btn=document.createElement("button"); btn.className="small-btn"; btn.type="button"; btn.textContent="Ver evento";
      btn.addEventListener("click",()=>openEvent(e.id)); box.appendChild(btn);
      L.marker(coords(e),{icon:pinIcon(c2color(e)),title:e.titulo}).bindPopup(box).addTo(S.mapLayer);
    });
    if(S.focusId){const f=list.find(x=>x.id===S.focusId);if(f){m.setView(coords(f),17);S.mapFitted=true}S.focusId=null}
    if(!S.mapFitted&&list.length){m.fitBounds(L.latLngBounds(list.map(coords)),{padding:[40,40],maxZoom:16});S.mapFitted=true}
  }
  $("mapCount").textContent=loaded()?(list.length?`${list.length} evento${list.length>1?"s":""} en el mapa`:"No hay eventos con ubicación en esta categoría"):"Cargando…";
  $("mapList").innerHTML=list.map(eventRow).join("")+(sinLoc&&S.mapCat==="todas"?`<p class="muted">${sinLoc} evento${sinLoc>1?"s":""} sin ubicación en el mapa.</p>`:"");
  hydrateImages($("mapList"));
}

/* ---------- Acceso de asociaciones ---------- */
function authErr(e){
  const c=(e&&e.code)||"";
  return ({"auth/email-already-in-use":"Ya existe una cuenta con ese email. Entra con ella o recupera la contraseña.","auth/invalid-email":"Ese email no es válido.","auth/weak-password":"La contraseña debe tener al menos 6 caracteres.","auth/invalid-credential":"Email o contraseña incorrectos.","auth/wrong-password":"Email o contraseña incorrectos.","auth/user-not-found":"No hay ninguna cuenta con ese email.","auth/too-many-requests":"Demasiados intentos. Espera unos minutos.","auth/network-request-failed":"Sin conexión. Comprueba internet.","permission-denied":"No tienes permiso para esta acción."})[c]||"Algo ha fallado. Inténtalo de nuevo.";
}
function authCard(){
  if(S.authMode==="reset") return `<div class="card narrow"><h2>Recuperar contraseña</h2><p class="lead">Te enviaremos un email para crear una contraseña nueva.</p>
    <form id="resetForm" novalidate><div class="f"><label for="a_email">Email</label><input id="a_email" type="email" autocomplete="email"></div>
    <div class="actions"><button class="btn" type="submit">Enviar email</button><button class="btn alt" type="button" data-mode="login">Volver</button></div><p class="msg" id="authMsg" role="status"></p></form></div>`;
  const up=S.authMode==="signup";
  return `<div class="card narrow">
    <div class="seg" role="tablist"><button type="button" role="tab" data-mode="login" aria-selected="${!up}">Entrar</button><button type="button" role="tab" data-mode="signup" aria-selected="${up}">Registrar asociación</button></div>
    <p class="lead">${up?"El registro está abierto solo a asociaciones. La administración revisará la solicitud antes de que podáis publicar.":"Entra con el email y la contraseña de tu asociación."}</p>
    <form id="${up?"signupForm":"loginForm"}" novalidate>
      ${up?`<div class="f"><label for="a_nombre">Nombre de la asociación</label><input id="a_nombre" maxlength="90"></div>
      <div class="row"><div class="f"><label for="a_tipo">Tipo</label><select id="a_tipo">${ASSOC_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></div>
      <div class="f"><label for="a_reg">Nº de registro de asociaciones</label><input id="a_reg" maxlength="40" placeholder="Ej.: BU-1234"><span class="hint">Registro municipal o autonómico</span></div></div>`:""}
      <div class="f"><label for="a_email">Email</label><input id="a_email" type="email" autocomplete="email"></div>
      <div class="f"><label for="a_pass">Contraseña</label><input id="a_pass" type="password" autocomplete="${up?"new-password":"current-password"}">${up?`<span class="hint">Mínimo 6 caracteres</span>`:""}</div>
      ${up?`<div class="f"><label for="a_pass2">Repite la contraseña</label><input id="a_pass2" type="password" autocomplete="new-password"></div>
      <label class="check"><input id="a_ok" type="checkbox"> <span>Declaro que represento a esta asociación y que está inscrita en un registro oficial.</span></label>`:""}
      <div class="actions"><button class="btn" type="submit">${up?"Enviar solicitud":"Entrar"}</button>${up?"":`<button class="btn alt" type="button" data-mode="reset">He olvidado la contraseña</button>`}</div>
      <p class="msg" id="authMsg" role="status"></p>
    </form></div>`;
}
async function doLogin(){
  const email=val("a_email"),pass=$("a_pass").value;
  if(!email||!pass) return setMsg("authMsg","Escribe el email y la contraseña.","err");
  S.busy=true;setMsg("authMsg","Entrando…");
  try{await S.auth.signInWithEmailAndPassword(email,pass)}catch(e){setMsg("authMsg",authErr(e),"err")}
  S.busy=false;
}
async function doSignup(){
  const nombre=val("a_nombre"),tipo=val("a_tipo"),registro=val("a_reg"),email=val("a_email"),p1=$("a_pass").value,p2=$("a_pass2").value;
  if(!nombre) return setMsg("authMsg","Escribe el nombre de la asociación.","err");
  if(!registro) return setMsg("authMsg","Indica el número de registro de la asociación.","err");
  if(!email) return setMsg("authMsg","Escribe un email.","err");
  if(p1.length<6) return setMsg("authMsg","La contraseña debe tener al menos 6 caracteres.","err");
  if(p1!==p2) return setMsg("authMsg","Las contraseñas no coinciden.","err");
  if(!$("a_ok").checked) return setMsg("authMsg","Marca la casilla para confirmar que representas a la asociación.","err");
  S.busy=true;setMsg("authMsg","Enviando solicitud…");
  try{
    const cred=await S.auth.createUserWithEmailAndPassword(email,p1);
    await S.db.collection("asociaciones").doc(cred.user.uid).set({nombre,tipo,registro,estado:"pendiente",descripcion:"",direccion:"",telefono:"",email:"",web:"",creado:new Date().toISOString()});
    try{await cred.user.sendEmailVerification()}catch(e){}
  }catch(e){setMsg("authMsg",authErr(e),"err")}
  S.busy=false;
}
async function doReset(){
  const email=val("a_email"); if(!email) return setMsg("authMsg","Escribe tu email.","err");
  try{await S.auth.sendPasswordResetEmail(email);setMsg("authMsg","Listo. Revisa tu correo, también la carpeta de spam.","ok")}catch(e){setMsg("authMsg",authErr(e),"err")}
}

/* ---------- Área de asociaciones ---------- */
function viewPublicar(){return `<div id="panel"></div>`}
function fillPublicar(){
  const box=$("panel"); if(!box) return;
  if(!S.db){box.innerHTML=`<div class="notice"><b>Falta configurar Firebase.</b> Pega la configuración de tu proyecto al principio de app.js.</div>`;return}
  if(!S.authReady){box.innerHTML=`<p class="muted">Cargando…</p>`;S.panelKey="";return}
  if(!S.user){const k="auth|"+S.authMode;if(S.panelKey!==k){S.panelKey=k;box.innerHTML=authCard()}return}
  const a=myAssoc(), estado=a?a.estado:"sin-datos";
  const k=["in",estado,S.editingProfile,S.kind,S.isAdmin].join("|");
  if(S.panelKey!==k){
    S.panelKey=k; S.formKey="";
    box.innerHTML=`<div class="session"><span>Conectado como <b>${esc(S.user.email||"")}</b></span><button class="small-btn" data-act="logout">Cerrar sesión</button></div>
      ${statusBanner(estado)}
      <div class="panel"><div class="card" id="profileCard"></div><div id="pubCol"></div></div>
      ${S.isAdmin?`<div class="card" id="adminCard"></div>`:""}`;
  }
  renderProfileCard(); renderPubCol(); if(S.isAdmin) renderAdmin();
}
function statusBanner(e){
  if(e==="pendiente") return `<div class="notice warn"><b>Solicitud pendiente de aprobación.</b> Cuando la administración la revise podrás publicar eventos y noticias. Mientras tanto, completa los datos de tu asociación.</div>`;
  if(e==="rechazada") return `<div class="notice err"><b>La solicitud no ha sido aprobada.</b> Contacta con la administración si crees que es un error.</div>`;
  if(e==="oculta") return `<div class="notice err"><b>Tu asociación está oculta en la agenda pública.</b> Contacta con la administración.</div>`;
  if(e==="sin-datos") return `<div class="notice">Esta cuenta no tiene una asociación registrada.</div>`;
  return "";
}
function renderProfileCard(){
  const a=myAssoc(), el=$("profileCard"); if(!el) return;
  if(!a){el.innerHTML=`<h2>Sin asociación</h2><p class="lead">Cierra sesión y registra tu asociación.</p>`;return}
  if(S.editingProfile){
    if(el.querySelector("#profileForm")) return;
    el.innerHTML=`<h2>Datos de la asociación</h2><p class="lead">Aparecen junto a cada evento y en el listado de asociaciones.</p>
    <form id="profileForm" novalidate>
      <div class="f"><span class="label">Logo o foto de la asociación</span><div class="img-field" id="logoField"></div><span class="hint">Se ve en el listado de asociaciones y en vuestros eventos.</span></div>
      <div class="f"><label for="p_nombre">Nombre</label><input id="p_nombre" maxlength="90" value="${esc(a.nombre)}"></div>
      <div class="row"><div class="f"><label for="p_tipo">Tipo</label><select id="p_tipo">${ASSOC_TYPES.map(t=>`<option ${a.tipo===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="f"><label for="p_reg">Nº de registro</label><input id="p_reg" maxlength="40" value="${esc(a.registro||"")}"></div></div>
      <div class="f"><label for="p_desc">Descripción</label><textarea id="p_desc" maxlength="400">${esc(a.descripcion||"")}</textarea></div>
      <div class="f"><label for="p_dir">Dirección o sede</label><input id="p_dir" maxlength="120" value="${esc(a.direccion||"")}"></div>
      <div class="row"><div class="f"><label for="p_tel">Teléfono</label><input id="p_tel" type="tel" maxlength="30" value="${esc(a.telefono||"")}"></div>
      <div class="f"><label for="p_mail">Email público</label><input id="p_mail" type="email" maxlength="80" value="${esc(a.email||"")}"></div></div>
      <div class="f"><label for="p_web">Web o red social</label><input id="p_web" maxlength="150" value="${esc(a.web||"")}"></div>
      <div class="actions"><button class="btn" type="submit">Guardar</button><button class="btn alt" type="button" data-act="cancelProfile">Cancelar</button></div>
      <p class="msg" id="profileMsg" role="status"></p></form>`;
    S.logo=a.logo?{loading:true}:null; renderLogoField();
    if(a.logo) loadLogo(a).then(u=>{if(S.editingProfile&&S.logo&&!S.logo.changed){S.logo=u?{url:u}:null;renderLogoField()}});
    return;
  }
  const web=safeUrl(a.web);
  el.innerHTML=`<div class="org-head">${logoHtml(a,"logo lg")}<div><p class="type">Asociación ${esc((a.tipo||"").toLowerCase())} · Reg. ${esc(a.registro||"—")}</p><h2>${esc(a.nombre)}</h2></div></div>
    ${a.descripcion?`<p class="lead">${esc(a.descripcion)}</p>`:`<p class="lead">Añade una descripción y datos de contacto para que la gente os encuentre.</p>`}
    <dl class="facts">${a.direccion?`<dt>Sede</dt><dd>${esc(a.direccion)}</dd>`:""}${a.telefono?`<dt>Teléfono</dt><dd>${esc(a.telefono)}</dd>`:""}${a.email?`<dt>Email</dt><dd>${esc(a.email)}</dd>`:""}${web?`<dt>Web</dt><dd>${esc(a.web)}</dd>`:""}</dl>
    <div class="actions"><button class="btn alt" data-act="editProfile">Editar datos y logo</button></div>`;
  hydrateImages(el);
}
function renderPubCol(){
  const col=$("pubCol"), a=myAssoc(); if(!col) return;
  if(!a||a.estado!=="aprobada"){col.innerHTML=`<div class="card"><h2>Publicar</h2><p class="lead">Podrás publicar cuando la asociación esté aprobada.</p></div>`;S.formKey="";return}
  const list=mine(S.kind), editing=S.editId?list.find(x=>x.id===S.editId):null, fk=S.kind+"|"+(S.editId||"new");
  if(S.formKey!==fk||!$("pubForm")){
    col.innerHTML=`<div class="card" id="formCard">
      <div class="seg" role="tablist"><button type="button" role="tab" data-kind="evento" aria-selected="${S.kind==="evento"}">Evento</button><button type="button" role="tab" data-kind="noticia" aria-selected="${S.kind==="noticia"}">Noticia</button></div>
      <h2>${editing?(S.kind==="evento"?"Editar evento":"Editar noticia"):(S.kind==="evento"?"Nuevo evento":"Nueva noticia")}</h2>
      ${S.kind==="evento"?eventForm(editing):newsForm(editing)}</div>
      <div class="card"><h2>${S.kind==="evento"?"Tus eventos":"Tus noticias"}</h2><div class="mine" id="mineList"></div></div>`;
    S.formKey=fk; S.img=editing&&editing.img?{loading:true}:null; renderImgField();
    if(S.kind==="evento") initFormMap(editing); else dropMap("formMap");
    if(editing&&editing.img) loadImage(editing).then(u=>{if(S.editId===editing.id&&S.img&&!S.img.changed){S.img=u?{url:u}:null;renderImgField()}});
  }
  const t=today();
  const sorted=list.slice().sort((x,y)=>S.kind==="evento"?(y.fecha||"").localeCompare(x.fecha||""):(y.publicado||"").localeCompare(x.publicado||""));
  $("mineList").innerHTML=sorted.length?sorted.map(x=>{
    const past=S.kind==="evento"&&(x.fechaFin||x.fecha)<t;
    const sub=S.kind==="evento"?longDate(x.fecha)+(x.hora?" · "+x.hora:"")+(past?" · terminado":""):(x.publicado?longDate(ymd(new Date(x.publicado))):"");
    return `<div class="mine-item${past?" past":""}"><div><p class="t">${esc(x.titulo)}</p><p class="muted">${esc(sub)}</p></div><div class="acts">${S.pendingDel===x.id?`<button class="small-btn del" data-delok="${esc(x.id)}">Eliminar</button><button class="small-btn" data-delno="1">No</button>`:`<button class="small-btn" data-edit="${esc(x.id)}">Editar</button><button class="small-btn del" data-del="${esc(x.id)}">Borrar</button>`}</div></div>`}).join(""):`<p class="muted">Todavía no has publicado nada.</p>`;
}
function imgFieldHtml(){return `<div class="f"><span class="label">Imagen o cartel</span><div class="img-field" id="imgField"></div></div>`}
function eventForm(e){
  e=e||{};
  return `<form id="pubForm" novalidate>
    <div class="f"><label for="e_titulo">Título *</label><input id="e_titulo" maxlength="100" value="${esc(e.titulo||"")}"></div>
    ${imgFieldHtml()}
    <div class="f"><label for="e_desc">Descripción</label><textarea id="e_desc" maxlength="1500" placeholder="Qué se va a hacer, para quién es, qué hay que llevar…">${esc(e.descripcion||"")}</textarea></div>
    <fieldset class="fieldset"><legend>Fecha y horario</legend>
      <div class="row"><div class="f"><label for="e_fecha">Fecha *</label><input id="e_fecha" type="date" value="${esc(e.fecha||S.selected)}"></div>
      <div class="f"><label for="e_hora">Hora de inicio</label><input id="e_hora" type="time" value="${esc(e.hora||"")}"><span class="hint">Vacío = todo el día</span></div></div>
      <div class="row"><div class="f"><label for="e_fin">Fecha de fin</label><input id="e_fin" type="date" value="${esc(e.fechaFin||"")}"><span class="hint">Solo si dura varios días</span></div>
      <div class="f"><label for="e_horafin">Hora de fin</label><input id="e_horafin" type="time" value="${esc(e.horaFin||"")}"></div></div>
    </fieldset>
    <div class="row"><div class="f"><label for="e_cat">Categoría</label><select id="e_cat">${CATS.map(c=>`<option value="${c.id}" ${e.categoria===c.id?"selected":""}>${esc(c.name)}</option>`).join("")}</select></div>
    <div class="f"><label for="e_precio">Precio</label><input id="e_precio" maxlength="60" value="${esc(e.precio||"")}" placeholder="Gratis, 10 €…"></div></div>
    <fieldset class="fieldset"><legend>Lugar y ubicación</legend>
      <div class="f"><label for="e_lugar">Nombre del lugar</label><input id="e_lugar" maxlength="120" value="${esc(e.lugar||"")}" placeholder="Ej.: Casa de Cultura"></div>
      <div class="f"><label for="e_dir">Dirección</label><div class="search-row"><input id="e_dir" maxlength="150" value="${esc(e.direccion||"")}" placeholder="Ej.: Calle Real Aquende, 10"><button class="small-btn" type="button" data-act="geocode">Buscar en el mapa</button></div></div>
      <div class="map" id="formMap" aria-label="Mapa para marcar el lugar del evento"></div>
      <input type="hidden" id="e_lat" value="${esc(coords(e)?e.lat:"")}"><input type="hidden" id="e_lng" value="${esc(coords(e)?e.lng:"")}">
      <div class="loc-row"><span class="hint" id="locInfo"></span><button class="small-btn del" type="button" id="clearLocBtn" data-act="clearLoc" hidden>Quitar ubicación</button></div>
    </fieldset>
    <div class="f"><label for="e_link">Enlace para más información o entradas</label><input id="e_link" maxlength="300" value="${esc(e.enlace||"")}"></div>
    <div class="actions"><button class="btn" type="submit">${e.id?"Guardar evento":"Publicar evento"}</button>${e.id?`<button class="btn alt" type="button" data-act="cancelEdit">Cancelar</button>`:""}</div>
    <p class="msg" id="formMsg" role="status"></p></form>`;
}
function newsForm(n){
  n=n||{};
  return `<form id="pubForm" novalidate>
    <div class="f"><label for="n_titulo">Titular *</label><input id="n_titulo" maxlength="120" value="${esc(n.titulo||"")}"></div>
    ${imgFieldHtml()}
    <div class="f"><label for="n_texto">Texto *</label><textarea id="n_texto" maxlength="4000" style="min-height:180px">${esc(n.texto||"")}</textarea></div>
    <div class="actions"><button class="btn" type="submit">${n.id?"Guardar noticia":"Publicar noticia"}</button>${n.id?`<button class="btn alt" type="button" data-act="cancelEdit">Cancelar</button>`:""}</div>
    <p class="msg" id="formMsg" role="status"></p></form>`;
}
function renderAdmin(){
  const el=$("adminCard"); if(!el) return;
  const all=[...S.assocs.values()].filter(a=>a.nombre).sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
  const pend=all.filter(a=>a.estado==="pendiente"), rest=all.filter(a=>a.estado!=="pendiente");
  const row=(a,btns)=>`<div class="admin-row"><div><p class="t">${esc(a.nombre)}</p><p class="muted">${esc(a.tipo||"")} · Reg. ${esc(a.registro||"—")}${a.estado!=="pendiente"?" · "+esc(a.estado):""}</p></div><div class="acts">${btns}</div></div>`;
  el.innerHTML=`<h2>Administración</h2><p class="lead">Solo las cuentas administradoras ven esto.</p>
    <h3 class="sub">Solicitudes pendientes <span>${pend.length}</span></h3>
    ${pend.length?pend.map(a=>row(a,`<button class="small-btn ok" data-estado="aprobada" data-id="${esc(a.id)}">Aprobar</button><button class="small-btn del" data-estado="rechazada" data-id="${esc(a.id)}">Rechazar</button>`)).join(""):`<p class="muted">No hay solicitudes pendientes.</p>`}
    <h3 class="sub">Asociaciones</h3>
    ${rest.map(a=>row(a,a.estado==="aprobada"?`<button class="small-btn del" data-estado="oculta" data-id="${esc(a.id)}">Ocultar</button>`:`<button class="small-btn ok" data-estado="aprobada" data-id="${esc(a.id)}">Aprobar</button>`)).join("")||`<p class="muted">Sin asociaciones.</p>`}`;
}

/* ---------- Guardar ---------- */
async function saveProfile(){
  const nombre=val("p_nombre"); if(!nombre) return setMsg("profileMsg","Escribe el nombre de la asociación.","err");
  if(S.logo&&S.logo.loading) return setMsg("profileMsg","Espera a que termine de cargar el logo.","err");
  const uid=S.user.uid, a=myAssoc()||{};
  const data={nombre,tipo:val("p_tipo"),registro:val("p_reg"),descripcion:val("p_desc"),direccion:val("p_dir"),telefono:val("p_tel"),email:val("p_mail"),web:val("p_web"),actualizado:new Date().toISOString()};
  S.busy=true;setMsg("profileMsg","Guardando…");
  try{
    if(S.logo&&S.logo.changed&&S.logo.url){setMsg("profileMsg","Subiendo logo…");await S.db.collection("logos").doc(uid).set({data:S.logo.url,asociacionId:uid});data.logo=Date.now().toString(36);S.imgCache.set("logo|"+uid+"|"+data.logo,Promise.resolve(S.logo.url))}
    else if(!S.logo&&a.logo){await S.db.collection("logos").doc(uid).delete().catch(()=>{});data.logo=""}
    await S.db.collection("asociaciones").doc(uid).update(data);S.editingProfile=false;S.panelKey="";S.logo=null}
  catch(e){setMsg("profileMsg",authErr(e),"err")}
  S.busy=false; render();
}
async function savePub(){
  const uid=S.user.uid, isEv=S.kind==="evento", col=isEv?"eventos":"noticias";
  let data;
  if(isEv){
    const titulo=val("e_titulo"),fecha=val("e_fecha"),fin=val("e_fin");
    if(!titulo) return setMsg("formMsg","Escribe el título del evento.","err");
    if(!fecha) return setMsg("formMsg","Elige la fecha del evento.","err");
    if(fin&&fin<fecha) return setMsg("formMsg","La fecha de fin no puede ser anterior a la de inicio.","err");
    data={titulo,categoria:val("e_cat")||"otros",fecha,hora:val("e_hora"),fechaFin:(fin&&fin!==fecha)?fin:"",horaFin:val("e_horafin"),lugar:val("e_lugar"),direccion:val("e_dir"),precio:val("e_precio"),descripcion:val("e_desc"),enlace:val("e_link"),lat:null,lng:null};
    const la=val("e_lat"),ln=val("e_lng");
    if(la||ln){
      const lat=Number(la),lng=Number(ln);
      if(!la||!ln||!isFinite(lat)||!isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) return setMsg("formMsg","La ubicación del mapa no es válida. Márcala de nuevo.","err");
      data.lat=lat; data.lng=lng;
    }
  } else {
    const titulo=val("n_titulo"),texto=val("n_texto");
    if(!titulo) return setMsg("formMsg","Escribe el titular.","err");
    if(!texto) return setMsg("formMsg","Escribe el texto de la noticia.","err");
    data={titulo,texto};
  }
  if(S.img&&S.img.loading) return setMsg("formMsg","Espera a que termine de cargar la imagen.","err");
  const prev=S.editId?mine(S.kind).find(x=>x.id===S.editId):null;
  const ref=S.editId?S.db.collection(col).doc(S.editId):S.db.collection(col).doc();
  Object.assign(data,{asociacionId:uid,img:(prev&&prev.img)||"",publicado:(prev&&prev.publicado)||new Date().toISOString(),actualizado:new Date().toISOString()});
  S.busy=true;setMsg("formMsg","Guardando…");
  try{
    const imgRef=S.db.collection("imagenes").doc(ref.id);
    if(S.img&&S.img.changed&&S.img.url){setMsg("formMsg","Subiendo imagen…");await imgRef.set({data:S.img.url,asociacionId:uid});data.img=Date.now().toString(36);S.imgCache.set(ref.id+"|"+data.img,Promise.resolve(S.img.url))}
    else if(!S.img&&prev&&prev.img){await imgRef.delete().catch(()=>{});data.img=""}
    await ref.set(data);
  }catch(e){S.busy=false;return setMsg("formMsg",authErr(e),"err")}
  S.busy=false; const was=!!S.editId; S.editId=null; S.formKey="";
  if(isEv){S.selected=data.fecha;S.month=firstOfMonth(parse(data.fecha))}
  render();
  setMsg("formMsg",was?"Cambios guardados.":(isEv?"Evento publicado. Ya aparece en la agenda.":"Noticia publicada."),"ok");
}
async function deletePub(id){
  const col=S.kind==="evento"?"eventos":"noticias", x=mine(S.kind).find(i=>i.id===id);
  S.busy=true;
  try{await S.db.collection(col).doc(id).delete();if(x&&x.img)await S.db.collection("imagenes").doc(id).delete().catch(()=>{});if(S.editId===id){S.editId=null;S.formKey=""}}
  catch(e){setMsg("formMsg",authErr(e),"err")}
  S.busy=false;S.pendingDel=null;render();
}
async function setEstado(id,estado){
  S.busy=true; try{await S.db.collection("asociaciones").doc(id).update({estado})}catch(e){} S.busy=false;
}

/* ---------- Render principal ---------- */
function render(){
  renderNav();
  const r=S.route, v=$("view");
  if(v.dataset.route!==r){
    v.dataset.route=r;
    v.innerHTML=r==="inicio"?viewInicio():r==="mapa"?viewMapa():r==="calendario"?viewCalendario():r==="noticias"?viewNoticias():r==="asociaciones"?viewAsociaciones():r==="publicar"?viewPublicar():viewCategoria(r.slice(4));
  }
  if(r==="inicio") fillInicio(); else if(r==="calendario") fillCalendario(); else if(r==="noticias") fillNoticias();
  else if(r==="mapa") fillMapa(); else if(r==="asociaciones") fillAsociaciones(); else if(r==="publicar") fillPublicar(); else fillCategoria(r.slice(4));
}

/* ---------- Eventos del usuario ---------- */
document.addEventListener("click",ev=>{
  const t=ev.target.closest("button,a,[data-close]"); if(!t) return;
  if(t.dataset.close&&(ev.target===t||t.tagName==="BUTTON")) return closeModal();
  if(t.matches(".nav a")) {closeNav();return}
  const a=t.dataset.act;
  if(a==="openNav") return openNav();
  if(a==="toggleNav") return toggleNav();
  if(a==="closeNav") return closeNav();
  if(a==="prev"){S.month=new Date(S.month.getFullYear(),S.month.getMonth()-1,1);return fillCalendario()}
  if(a==="next"){S.month=new Date(S.month.getFullYear(),S.month.getMonth()+1,1);return fillCalendario()}
  if(a==="today"){S.month=firstOfMonth(new Date());S.selected=today();return fillCalendario()}
  if(a==="logout"){S.auth.signOut();return}
  if(a==="editProfile"){S.editingProfile=true;return render()}
  if(a==="cancelProfile"){S.editingProfile=false;return render()}
  if(a==="cancelEdit"){S.editId=null;S.formKey="";return render()}
  if(a==="removeImg"){S.img=null;return renderImgField()}
  if(a==="removeLogo"){S.logo=null;return renderLogoField()}
  if(a==="geocode") return geocode();
  if(a==="clearLoc"){S.loc=null;return showLoc(false)}
  if(t.dataset.mapcat){S.mapCat=t.dataset.mapcat;S.mapFitted=false;return fillMapa()}
  if(t.dataset.mapfocus){S.focusId=t.dataset.mapfocus;S.mapFitted=true;closeModal();if(S.route==="mapa")fillMapa();return}
  if(t.dataset.mode){S.authMode=t.dataset.mode;S.panelKey="";return render()}
  if(t.dataset.kind){S.kind=t.dataset.kind;S.editId=null;S.pendingDel=null;S.panelKey="";return render()}
  if(t.dataset.day){S.selected=t.dataset.day;const d=parse(S.selected);if(d.getMonth()!==S.month.getMonth())S.month=firstOfMonth(d);return fillCalendario()}
  if(t.dataset.ev) return openEvent(t.dataset.ev);
  if(t.dataset.news) return openNews(t.dataset.news);
  if(t.dataset.edit){S.editId=t.dataset.edit;S.formKey="";render();const f=$("formCard");if(f)f.scrollIntoView({behavior:"smooth",block:"start"});return}
  if(t.dataset.del){S.pendingDel=t.dataset.del;return render()}
  if(t.dataset.delno){S.pendingDel=null;return render()}
  if(t.dataset.delok&&!S.busy) return deletePub(t.dataset.delok);
  if(t.dataset.estado&&!S.busy) return setEstado(t.dataset.id,t.dataset.estado);
});
document.addEventListener("submit",ev=>{
  ev.preventDefault(); if(S.busy) return; const id=ev.target.id;
  if(id==="loginForm")doLogin();else if(id==="signupForm")doSignup();else if(id==="resetForm")doReset();else if(id==="profileForm")saveProfile();else if(id==="pubForm")savePub();
});
document.addEventListener("change",ev=>{
  if(ev.target.id==="f_img")onPickImage(ev.target.files&&ev.target.files[0]);
  if(ev.target.id==="p_logo")onPickLogo(ev.target.files&&ev.target.files[0]);
  if(ev.target.id==="e_cat"&&S.loc)showLoc(false);
});
document.addEventListener("input",ev=>{if(ev.target.id==="q"){S.q=ev.target.value.trim();clearTimeout(S.qT);S.qT=setTimeout(()=>{if(S.route==="inicio")fillInicio()},150)}});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"){if($("modalRoot").innerHTML)closeModal();else closeNav()}});
window.addEventListener("hashchange",onRoute);

/* ---------- Arranque ---------- */
S.route=routeFromHash(); onRoute();
const isDemo=!!window.APOIA_DEMO;
if(!isDemo&&(typeof firebase==="undefined"||/^PEGA/.test(firebaseConfig.apiKey))){
  S.ready={a:true,e:true,n:true};
  const st=$("status");st.hidden=false;st.innerHTML="<b>Falta conectar la base de datos.</b> Pega la configuración de Firebase al principio de app.js y vuelve a subir los archivos.";
  render(); return;
}
firebase.initializeApp(firebaseConfig);
S.auth=firebase.auth(); S.db=firebase.firestore();
const listen=(col,key,setter)=>S.db.collection(col).onSnapshot(s=>{setter(s.docs.map(d=>Object.assign({id:d.id},d.data())));S.ready[key]=true;render()},()=>{S.ready[key]=true;render()});
listen("asociaciones","a",l=>{S.assocs=new Map(l.map(x=>[x.id,x]))});
listen("eventos","e",l=>{S.events=l});
listen("noticias","n",l=>{S.news=l});
S.auth.onAuthStateChanged(async u=>{
  S.user=u;S.authReady=true;S.isAdmin=false;if(u)S.authMode="login";S.editingProfile=false;S.editId=null;S.panelKey="";S.formKey="";
  if(u){try{S.isAdmin=(await S.db.collection("admins").doc(u.uid).get()).exists}catch(e){}}
  render();
});
})();
