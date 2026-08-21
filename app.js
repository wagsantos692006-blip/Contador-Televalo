const SB_URL=localStorage.getItem("sb_url");
const SB_KEY=localStorage.getItem("sb_key");
const ROOM=localStorage.getItem("room")||"principal";

function configured(){return !!(SB_URL&&SB_KEY)}
function money(n){return "R$ "+Math.round(Number(n)||0).toLocaleString("pt-BR")}

async function api(path, options={}){
  if(!configured()) throw new Error("Configure o Supabase primeiro.");
  const headers={"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json",...(options.headers||{})};
  const r=await fetch(SB_URL+"/rest/v1/"+path,{...options,headers});
  if(!r.ok) throw new Error(await r.text());
  return r.status===204?null:r.json();
}

async function getState(){
  const rows=await api("contador?room=eq."+encodeURIComponent(ROOM)+"&select=*&limit=1");
  if(!rows.length){
    await api("contador",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({room:ROOM,value:0,speed:900,updated_at:new Date().toISOString()})});
    return {value:0,speed:900};
  }
  return rows[0];
}

async function setState(patch){
  await api("contador?room=eq."+encodeURIComponent(ROOM),{
    method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})
  });
}

async function poll(callback){
  let last="";
  async function tick(){
    try{
      const s=await getState();
      const sig=JSON.stringify([s.value,s.speed,s.updated_at]);
      if(sig!==last){last=sig;callback(s)}
    }catch(e){console.error(e)}
  }
  await tick();
  setInterval(tick,1000);
}

function add(n){return getState().then(s=>setState({value:Number(s.value)+Number(n)}))}
function setValue(n){return setState({value:Math.max(0,Math.floor(Number(n)||0))})}
