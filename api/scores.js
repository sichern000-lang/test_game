// Global leaderboard. Needs an Upstash Redis REST database linked to the Vercel project
// (env: KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
const URL_=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
const TOKEN=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
const TRACKS=['Red Bull Ring','Monza Speedway','Monte Carlo Streets','Spa Forest','Silverstone Flow'];
const KEEP=200,SHOW=20;

async function redis(cmds){
  const r=await fetch(URL_+'/pipeline',{method:'POST',headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},body:JSON.stringify(cmds)});
  if(!r.ok)throw new Error('redis '+r.status);
  return (await r.json()).map(x=>{if(x.error)throw new Error(x.error);return x.result});
}
const keyOf=(t,l)=>`f1lb:${t}:${l}`;
function parseKey(q){
  const t=TRACKS.indexOf(String(q.track)),l=Number(q.laps);
  if(t<0||![2,3,5].includes(l))return null;
  return keyOf(t,l);
}
async function top(key){
  const [rows]=await redis([['ZRANGE',key,0,SHOW-1,'WITHSCORES']]);
  const out=[];
  for(let i=0;i<rows.length;i+=2){try{const o=JSON.parse(rows[i]);out.push({n:o.n,t:Number(rows[i+1]),b:o.b,w:o.w})}catch(e){}}
  return out;
}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!URL_||!TOKEN)return res.status(503).json({error:'leaderboard not configured'});
  try{
    if(req.method==='GET'){
      const key=parseKey(req.query||{});if(!key)return res.status(400).json({error:'bad track/laps'});
      return res.status(200).json({top:await top(key)});
    }
    if(req.method==='POST'){
      const b=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
      const key=parseKey(b);if(!key)return res.status(400).json({error:'bad track/laps'});
      const t=Number(b.time),best=Number(b.best);
      const n=String(b.nick||'').replace(/[\u0000-\u001f<>&"'`]/g,'').trim().slice(0,12)||'Player';
      const w=['sunny','cloudy','rain','fog','sunset','night'].includes(b.weather)?b.weather:'sunny';
      // sanity limits: no faster than a lap of ~30s, no slower than 15 min total
      if(!(t>=30*Number(b.laps)*0.5&&t<900)||!(best>=15&&best<t))return res.status(400).json({error:'implausible time'});
      const member=JSON.stringify({n,b:Math.round(best*1000)/1000,w,id:Math.random().toString(36).slice(2,8)});
      await redis([['ZADD',key,Math.round(t*1000)/1000,member],['ZREMRANGEBYRANK',key,KEEP,-1]]);
      return res.status(200).json({top:await top(key)});
    }
    res.status(405).json({error:'method'});
  }catch(e){res.status(500).json({error:'server'})}
};
