/* Sonido del libro (opcional, apagado por defecto; se prende en Ajustes → Sonido y se guarda en este aparato, localStorage pa-sonido).
   No hay archivos de audio: los sonidos se arman en el momento con Web Audio (ruido filtrado y tonos cortos),
   así funcionan sin internet y no pesan nada.
   - hoja: el roce de una hoja al pasar.
   - sello: el golpe sordo del sello de lacre.
   - broche: dos clics metálicos del broche de la tapa.
   - estrella: un tintineo corto cuando la estrella cae sobre la flor del pacto. */
var KEY='pa-sonido',ac=null,ruido=null;
export function sonidoOn(){try{return localStorage.getItem(KEY)==='1'}catch(e){return false}}
export function setSonido(v){try{if(v)localStorage.setItem(KEY,'1');else localStorage.removeItem(KEY)}catch(e){}}
function audio(){
  if(!ac){var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;try{ac=new A()}catch(e){return null}}
  if(ac.state==='suspended')ac.resume();
  return ac;
}
function bufRuido(a){
  if(ruido)return ruido;
  ruido=a.createBuffer(1,Math.floor(a.sampleRate*.4),a.sampleRate);
  var d=ruido.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return ruido;
}
function envolvente(a,g,t,pico,ataque,caida){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(pico,t+ataque);g.gain.exponentialRampToValueAtTime(0.0001,t+ataque+caida)}
export function sonar(tipo){
  if(!sonidoOn())return;
  var a=audio();if(!a)return;
  var t=a.currentTime+.01,g=a.createGain();g.connect(a.destination);
  if(tipo==='hoja'){
    var s=a.createBufferSource(),f=a.createBiquadFilter();s.buffer=bufRuido(a);
    f.type='bandpass';f.Q.value=.8;f.frequency.setValueAtTime(2600,t);f.frequency.exponentialRampToValueAtTime(700,t+.26);
    s.connect(f);f.connect(g);envolvente(a,g,t,.18,.05,.24);s.start(t);s.stop(t+.32);
  }else if(tipo==='sello'){
    var o=a.createOscillator();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(55,t+.18);
    o.connect(g);envolvente(a,g,t,.5,.008,.22);o.start(t);o.stop(t+.26);
    var s2=a.createBufferSource(),f2=a.createBiquadFilter(),g2=a.createGain();s2.buffer=bufRuido(a);f2.type='lowpass';f2.frequency.value=900;
    s2.connect(f2);f2.connect(g2);g2.connect(a.destination);envolvente(a,g2,t,.25,.004,.06);s2.start(t);s2.stop(t+.08);
  }else if(tipo==='estrella'){
    [[1568,0],[2093,.09],[2637,.17]].forEach(function(n){
      var o3=a.createOscillator(),g3=a.createGain();o3.type='sine';o3.frequency.value=n[0];o3.connect(g3);g3.connect(a.destination);
      envolvente(a,g3,t+n[1],.07,.006,.5);o3.start(t+n[1]);o3.stop(t+n[1]+.55);
    });
  }else if(tipo==='broche'){
    [0,.07].forEach(function(d){
      var o2=a.createOscillator(),gg=a.createGain();o2.type='square';o2.frequency.value=2300-d*4000;o2.connect(gg);gg.connect(a.destination);
      envolvente(a,gg,t+d,.06,.002,.03);o2.start(t+d);o2.stop(t+d+.05);
    });
  }
}
