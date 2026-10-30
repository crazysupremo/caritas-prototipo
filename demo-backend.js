/* Versión demo: imita Firebase guardando todo en este navegador. */
(function(){
"use strict";
window.APOIA_DEMO=true;
const KEY="apoia-demo-v2", SESSION="apoia-demo-session-v2";
function pad(n){return String(n).padStart(2,"0")}
function day(o){const d=new Date();d.setDate(d.getDate()+o);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function ago(h){return new Date(Date.now()-h*3600e3).toISOString()}
function poster(c1,c2,word,bars){
  const cv=document.createElement("canvas");cv.width=900;cv.height=560;const x=cv.getContext("2d");
  const g=x.createLinearGradient(0,0,900,560);g.addColorStop(0,c1);g.addColorStop(1,c2);x.fillStyle=g;x.fillRect(0,0,900,560);
  x.globalAlpha=.2;x.fillStyle="#fff";
  for(let i=0;i<7;i++){x.beginPath();if(bars)x.rect(60+i*120,140+((i*53)%160),70,440);else x.arc(110+i*125,250+Math.sin(i*1.7)*130,50+i*14,0,7);x.fill()}
  x.globalAlpha=1;x.fillStyle="#fff";x.font="800 86px system-ui, sans-serif";x.fillText(word,50,500);
  return cv.toDataURL("image/jpeg",.78);
}
function seed(){
  const A=(nombre,tipo,registro,descripcion,extra)=>Object.assign({nombre,tipo,registro,descripcion,direccion:"",telefono:"",email:"",web:"",estado:"aprobada",creado:ago(900)},extra||{});
  const asociaciones={
    a_ribera:A("Asociación Cultural La Ribera","Cultural","BU-0412","Música en directo, teatro y talleres junto al río.",{direccion:"Calle de la Ribera, 12",telefono:"947 00 00 01",email:"hola@lariberademo.es",web:"www.lariberademo.es"}),
    a_corredores:A("Club Corredores del Ebro","Deportiva","BU-0877","Carreras populares y entrenamientos abiertos a todo el mundo.",{email:"club@corredoresdemo.es"}),
    a_vecinos:A("Asociación Vecinal Barrio de Aquende","Vecinal","BU-0153","Fiestas de barrio, mercadillo solidario y actividades para mayores.",{direccion:"Centro cívico de Aquende"}),
    a_familias:A("AMPA Colegio del Puente","Educativa","BU-1290","Actividades para familias y peques.",{}),
    a_nueva:A("Asociación Juvenil Ebro Joven","Juvenil","BU-1502","",{estado:"pendiente",creado:ago(20)})
  };
  const E=(id,org,titulo,cat,off,offFin,hora,horaFin,lugar,precio,descripcion,img)=>[id,{asociacionId:org,titulo,categoria:cat,fecha:day(off),fechaFin:offFin===""?"":day(offFin),hora,horaFin,lugar,precio,descripcion,enlace:"",img:img?"s1":"",publicado:ago(100)},img];
  const evs=[
    E("e01","a_ribera","Concierto acústico de otoño","musica",0,"","20:30","22:00","Sala La Ribera","8 €","Una noche de canciones propias y versiones en formato acústico.",["#7C4DCC","#D9467A","CONCIERTO"]),
    E("e02","a_ribera","Exposición «Riberas del Ebro»","cultura",-3,12,"","","Casa de Cultura","Gratis","Fotografías del río y sus paisajes a lo largo del año.",["#0E7C86","#3565C4","EXPOSICIÓN",1]),
    E("e03","a_familias","Cuentacuentos en la biblioteca","infantil",1,"","17:30","18:30","Biblioteca municipal","Gratis","Para niños y niñas de 4 a 8 años. Plazas limitadas.",null),
    E("e04","a_vecinos","Mercadillo solidario","fiestas",2,"","10:00","14:00","Plaza de Aquende","Entrada libre","Lo recaudado irá al banco de alimentos.",["#D23B2E","#EFAE22","MERCADILLO"]),
    E("e05","a_corredores","Carrera popular 10K","deporte",4,"","10:00","","Parque junto al río","Desde 5 €","Recorrido urbano y ribera. Categorías infantiles.",["#2F8A3B","#0E7C86","10K",1]),
    E("e06","a_ribera","Noche de monólogos","teatro",6,"","21:00","","Sala La Ribera","10 €","Tres cómicos, una noche. Reserva recomendada.",null),
    E("e07","a_vecinos","Charla: historia del barrio","formacion",8,"","19:00","20:00","Centro cívico de Aquende","Gratis","Un paseo por la historia de Aquende con fotos antiguas.",null),
    E("e08","a_corredores","Entrenamiento abierto","deporte",9,"","19:00","20:00","Pista municipal","Gratis","Para todos los niveles.",null),
    E("e09","a_vecinos","Comida popular de San Martín","gastro",11,"","14:00","17:00","Plaza de Aquende","12 €","Menú con alubias, postre y café. Venta de tiques en el centro cívico.",["#B7791F","#8C2D19","COMIDA"]),
    E("e10","a_familias","Taller de reciclaje creativo","infantil",13,"","11:00","13:00","Colegio del Puente","Gratis","Trae envases limpios y salimos con juguetes nuevos.",null),
    E("e11","a_ribera","Jam session","musica",16,"","20:00","","Sala La Ribera","Gratis","Trae tu instrumento.",null),
    E("e12","a_corredores","Marcha nórdica","deporte",-5,"","9:30","","Montes Obarenes","Gratis","",null)
  ];
  const eventos={},imagenes={};
  evs.forEach(([id,d,img])=>{eventos[id]=d;if(img)imagenes[id]={asociacionId:d.asociacionId,data:poster(...img)}});
  const noticias={
    n01:{asociacionId:"a_vecinos",titulo:"Abiertas las inscripciones para el mercadillo solidario",texto:"Si quieres poner un puesto en el mercadillo solidario de este sábado, pásate por el centro cívico antes del jueves. Los puestos son gratuitos y lo recaudado irá íntegro al banco de alimentos.",img:"s1",publicado:ago(5)},
    n02:{asociacionId:"a_corredores",titulo:"Cambio de recorrido en la carrera 10K",texto:"Por obras en la avenida, el tramo final de la carrera pasará por la ribera. La salida y la meta no cambian. Los dorsales se recogen el día anterior de 17:00 a 20:00.",img:"",publicado:ago(30)},
    n03:{asociacionId:"a_ribera",titulo:"Buscamos voluntarios para la programación de invierno",texto:"Necesitamos ayuda con la taquilla, el montaje y la difusión de los conciertos de invierno. Si te apetece colaborar, escríbenos y te contamos.",img:"",publicado:ago(72)}
  };
  imagenes.n01={asociacionId:"a_vecinos",data:poster("#D23B2E","#B7791F","SOLIDARIO")};
  return {asociaciones,eventos,noticias,imagenes,admins:{a_ribera:{activo:true}},
    users:{"demo@apoia.mais":{uid:"a_ribera",pass:"demo123"}}};
}
let db;
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}}
try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){db=null}
if(!db||!db.asociaciones){db=seed();save()}
const L={};
function snap(c){return{docs:Object.entries(db[c]||{}).map(([id,d])=>({id,exists:true,data:()=>JSON.parse(JSON.stringify(d))}))}}
function emit(c){save();(L[c]||[]).forEach(f=>setTimeout(()=>f(snap(c)),0))}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const err=code=>Object.assign(new Error(code),{code});
let current=null; const cbs=[];
const mk=(email,u)=>({uid:u,email,sendEmailVerification:async()=>{}});
function setUser(u){current=u;try{u?localStorage.setItem(SESSION,JSON.stringify({email:u.email,uid:u.uid})):localStorage.removeItem(SESSION)}catch(e){}cbs.forEach(f=>f(u))}
try{const s=JSON.parse(localStorage.getItem(SESSION));if(s&&db.users[s.email])current=mk(s.email,s.uid)}catch(e){}
window.firebase={
  initializeApp(){},
  auth(){return{
    onAuthStateChanged(f){cbs.push(f);setTimeout(()=>f(current),30)},
    async createUserWithEmailAndPassword(email,pass){await wait(300);email=String(email).toLowerCase();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw err("auth/invalid-email");
      if(db.users[email])throw err("auth/email-already-in-use");
      if(String(pass).length<6)throw err("auth/weak-password");
      const u=uid();db.users[email]={uid:u,pass};save();const user=mk(email,u);setUser(user);return{user}},
    async signInWithEmailAndPassword(email,pass){await wait(300);email=String(email).toLowerCase();const r=db.users[email];if(!r||r.pass!==pass)throw err("auth/invalid-credential");setUser(mk(email,r.uid))},
    async signOut(){setUser(null)},
    async sendPasswordResetEmail(){await wait(300)}
  }},
  firestore(){return{collection(c){db[c]=db[c]||{};return{
    onSnapshot(f){(L[c]=L[c]||[]).push(f);setTimeout(()=>f(snap(c)),40);return()=>{}},
    doc(id){id=id||uid();return{id,
      async get(){await wait(40);const d=db[c][id];return{exists:!!d,data:()=>d}},
      async set(d){await wait(120);db[c][id]=JSON.parse(JSON.stringify(d));emit(c)},
      async update(d){await wait(120);if(!db[c][id])throw err("not-found");Object.assign(db[c][id],d);emit(c)},
      async delete(){await wait(80);delete db[c][id];emit(c)}}}
  }}}}
};
window.apoiaDemoReset=function(){try{localStorage.removeItem(KEY);localStorage.removeItem(SESSION)}catch(e){}location.hash="inicio";location.reload()};
})();
