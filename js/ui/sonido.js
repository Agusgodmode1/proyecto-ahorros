/* Sonido del libro (2.9): prendido por defecto, a volumen bajo; se apaga o se ajusta en Ajustes → Sonido
   (este aparato: localStorage pa-sonido = '0' apagado, pa-volumen = 0…1).
   No hay archivos de audio: los sonidos se arman en el momento con Web Audio, así funcionan sin internet y no pesan nada.
   Con navigator.audioSession.type = 'ambient' (iPhone), respeta el botón de silencio y no corta la música.
   - hoja: papel de verdad. Un roce agudo con crujidos al azar, un «flap» grave mientras gira y un toque suave al apoyarse.
     Dura lo que dura el giro, suena más fuerte si el gesto es rápido y cambia un poco cada vez.
   - sello: el golpe sordo del sello de lacre.
   - broche: dos clics metálicos del broche de la tapa.
   - estrella: un tintineo corto cuando la estrella cae sobre la flor del pacto. */
var KEY='pa-sonido',KV='pa-volumen',ac=null,ruido=null,master=null;
export var VOLUMEN_INICIAL=.35;
export function sonidoOn(){try{return localStorage.getItem(KEY)!=='0'}catch(e){return true}}
export function setSonido(v){try{localStorage.setItem(KEY,v?'1':'0')}catch(e){}}
export function volumen(){try{var v=parseFloat(localStorage.getItem(KV));return isFinite(v)?Math.max(0,Math.min(1,v)):VOLUMEN_INICIAL}catch(e){return VOLUMEN_INICIAL}}
export function setVolumen(v){try{localStorage.setItem(KV,String(Math.max(0,Math.min(1,v))))}catch(e){}if(master)master.gain.value=curva(volumen())}
function curva(v){return v*v*1.6} /* el oído escucha en escala logarítmica: así el control se siente parejo */
function audio(){
  if(!ac){
    try{if(navigator.audioSession)navigator.audioSession.type='ambient'}catch(e){}
    var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
    try{ac=new A()}catch(e){return null}
    master=ac.createGain();master.gain.value=curva(volumen());master.connect(ac.destination);
  }
  if(ac.state==='suspended')ac.resume();
  return ac;
}
function bufRuido(a){
  if(ruido)return ruido;
  ruido=a.createBuffer(1,Math.floor(a.sampleRate*1.2),a.sampleRate);
  var d=ruido.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ruido;
}
function envolvente(g,t,pico,ataque,caida){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(pico,t+ataque);g.gain.exponentialRampToValueAtTime(0.0001,t+ataque+caida)}
function al(x,y){return x+Math.random()*(y-x)}
/* un pedacito de ruido filtrado: el ladrillo de todos los sonidos de papel */
function soplo(a,t,dur,tipo,frec,q,pico,ataque,salida){
  var s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();
  s.buffer=bufRuido(a);f.type=tipo;f.frequency.setValueAtTime(frec,t);f.Q.value=q;
  s.connect(f);f.connect(g);g.connect(salida||master);
  envolvente(g,t,pico,ataque,Math.max(.004,dur-ataque));
  s.start(t,Math.max(0,al(0,1.15-dur-.05)),dur+.05);
  return {f:f,g:g};
}

function hoja(a,t,o){
  var dur=Math.max(.18,Math.min(.9,o&&o.dur||.5)),F=Math.max(.15,Math.min(1,o&&o.fuerza!=null?o.fuerza:.55));
  /* 1 · el roce agudo: sube rápido, se sostiene mientras gira y se apaga */
  var r=soplo(a,t,dur,'bandpass',al(3200,4600),al(.7,1.1),.16*F,dur*.18);
  r.f.frequency.exponentialRampToValueAtTime(al(1600,2300),t+dur);
  /* crujidos: chasquidos cortísimos al azar, más en la primera mitad */
  var n=Math.round(al(5,9)+F*6);
  for(var i=0;i<n;i++){var u=Math.pow(Math.random(),1.4)*dur*.9;soplo(a,t+u,al(.004,.012),'highpass',al(2500,5000),.7,al(.05,.16)*F,.001)}
  /* 2 · el «flap»: el aire que mueve la hoja, grave, con su punto más fuerte a mitad del giro */
  var fl=soplo(a,t+dur*.12,dur*.8,'lowpass',al(380,520),.9,.32*F,dur*.32);
  fl.f.frequency.exponentialRampToValueAtTime(al(140,220),t+dur*.92);
  /* 3 · el toque al apoyarse */
  var ta=t+dur*.94,o2=a.createOscillator(),g2=a.createGain();
  o2.type='sine';o2.frequency.setValueAtTime(al(105,135),ta);o2.frequency.exponentialRampToValueAtTime(60,ta+.09);
  o2.connect(g2);g2.connect(master);envolvente(g2,ta,.12*F,.004,.1);o2.start(ta);o2.stop(ta+.13);
  soplo(a,ta,.03,'lowpass',900,.7,.12*F,.002);
}

export function sonar(tipo,o){
  if(!sonidoOn()||volumen()<=0)return;
  var a=audio();if(!a)return;
  var t=a.currentTime+.01;
  if(tipo==='hoja'){hoja(a,t,o);return}
  var g=a.createGain();g.connect(master);
  if(tipo==='sello'){
    var os=a.createOscillator();os.type='sine';os.frequency.setValueAtTime(150,t);os.frequency.exponentialRampToValueAtTime(55,t+.18);
    os.connect(g);envolvente(g,t,.5,.008,.22);os.start(t);os.stop(t+.26);
    soplo(a,t,.07,'lowpass',900,.7,.25,.004);
  }else if(tipo==='estrella'){
    [[1568,0],[2093,.09],[2637,.17]].forEach(function(n){
      var o3=a.createOscillator(),g3=a.createGain();o3.type='sine';o3.frequency.value=n[0];o3.connect(g3);g3.connect(master);
      envolvente(g3,t+n[1],.07,.006,.5);o3.start(t+n[1]);o3.stop(t+n[1]+.55);
    });
  }else if(tipo==='broche'){
    [0,.07].forEach(function(d){
      var o4=a.createOscillator(),g4=a.createGain();o4.type='square';o4.frequency.value=2300-d*4000;o4.connect(g4);g4.connect(master);
      envolvente(g4,t+d,.06,.002,.03);o4.start(t+d);o4.stop(t+d+.05);
    });
  }
}
