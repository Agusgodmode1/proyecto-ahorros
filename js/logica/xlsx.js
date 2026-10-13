/* Lector mínimo de planillas de Excel (.xlsx), sin librerías: un .xlsx es un .zip con archivos XML.
   Usa DecompressionStream (Safari 16.4+, Chrome, Node 18+). Devuelve las hojas como tablas de valores:
   números (fechas y horas de Excel quedan como número), textos o null. Todo se lee en el teléfono. */

function u16(b,o){return b[o]|(b[o+1]<<8)}
function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}

async function inflar(datos){
  var ds=new DecompressionStream('deflate-raw');
  var out=new Response(new Blob([datos]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
/* Lista y extrae los archivos del zip. Devuelve {nombre: Uint8Array} solo de los que pide `quiero(nombre)`. */
export async function leerZip(buf,quiero){
  var b=new Uint8Array(buf),eocd=-1;
  for(var i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(u32(b,i)===0x06054b50){eocd=i;break}}
  if(eocd<0)throw new Error('No es un archivo de Excel (.xlsx).');
  var n=u16(b,eocd+10),p=u32(b,eocd+16),out={},dec=new TextDecoder();
  for(var k=0;k<n;k++){
    if(u32(b,p)!==0x02014b50)throw new Error('El archivo está dañado.');
    var metodo=u16(b,p+10),tam=u32(b,p+20),ln=u16(b,p+28),le=u16(b,p+30),lc=u16(b,p+32),loc=u32(b,p+42);
    var nombre=dec.decode(b.subarray(p+46,p+46+ln));
    p+=46+ln+le+lc;
    if(quiero&&!quiero(nombre))continue;
    var ini=loc+30+u16(b,loc+26)+u16(b,loc+28),datos=b.subarray(ini,ini+tam);
    out[nombre]=metodo===0?datos.slice():metodo===8?await inflar(datos):null;
  }
  return out;
}

function ent(s){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,function(m,c){return String.fromCharCode(+c)}).replace(/&amp;/g,'&')}
function textos(xml){var t='',re=/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g,m;while((m=re.exec(xml)))t+=m[1];return ent(t)}
/* "D12" → {fila:11, col:3} (desde 0) */
function ref(r){var m=/^([A-Z]+)(\d+)$/.exec(r);var c=0;for(var i=0;i<m[1].length;i++)c=c*26+(m[1].charCodeAt(i)-64);return {fila:+m[2]-1,col:c-1}}

/* Devuelve [{nombre, filas:[[valor,…],…]}] en el orden del libro */
export async function leerXlsx(buf){
  var f=await leerZip(buf,function(n){return /^xl\/(workbook\.xml|sharedStrings\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml)$/.test(n)});
  var dec=new TextDecoder(),txt=function(n){return f[n]?dec.decode(f[n]):''};
  if(!f['xl/workbook.xml'])throw new Error('No es un archivo de Excel (.xlsx).');
  var comp=[],re=/<si>([\s\S]*?)<\/si>/g,m;
  while((m=re.exec(txt('xl/sharedStrings.xml'))))comp.push(textos(m[1]));
  var rels={};re=/<Relationship\b([^>]*)\/?>/g;
  while((m=re.exec(txt('xl/_rels/workbook.xml.rels')))){var id=/\bId="([^"]+)"/.exec(m[1]),tg=/\bTarget="([^"]+)"/.exec(m[1]);if(id&&tg)rels[id[1]]=tg[1].replace(/^\/?(xl\/)?/,'xl/')}
  var hojas=[];re=/<sheet\b([^>]*)\/?>/g;
  var wb=txt('xl/workbook.xml');
  while((m=re.exec(wb))){
    var nm=/\bname="([^"]*)"/.exec(m[1]),rid=/\br:id="([^"]+)"/.exec(m[1]);
    var ruta=rid&&rels[rid[1]];if(!ruta||!f[ruta])continue;
    hojas.push({nombre:ent(nm?nm[1]:''),filas:celdas(txt(ruta),comp)});
  }
  return hojas;
}
function celdas(xml,comp){
  var filas=[],re=/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,m;
  while((m=re.exec(xml))){
    var at=m[1],r=/\br="([A-Z]+\d+)"/.exec(at);if(!r)continue;
    var t=/\bt="([^"]+)"/.exec(at),tipo=t?t[1]:'n',cuerpo=m[2]||'',v=/<v>([\s\S]*?)<\/v>/.exec(cuerpo),val=null;
    if(tipo==='s')val=v?comp[+v[1]]:null;
    else if(tipo==='inlineStr')val=textos(cuerpo);
    else if(tipo==='str'||tipo==='e')val=v?ent(v[1]):null;
    else if(tipo==='b')val=v?v[1]==='1':null;
    else val=v?Number(v[1]):null;
    var p=ref(r[1]);
    (filas[p.fila]||(filas[p.fila]=[]))[p.col]=val;
  }
  for(var i=0;i<filas.length;i++)if(!filas[i])filas[i]=[];
  return filas;
}
