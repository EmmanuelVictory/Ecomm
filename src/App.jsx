

import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id:"p1",  title:"Ceramic Pour-Over Set",          category:"Home & Garden", price:64,  desc:"Hand-thrown stoneware with bamboo stand and filters.",             image:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80", featured:true,  in_stock:true  },
  { id:"p2",  title:"Merino Wool Turtleneck",         category:"Clothing",      price:128, desc:"Ultra-fine 18.5 micron merino, ethically sourced.",                image:"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80", featured:true,  in_stock:true  },
  { id:"p3",  title:"Noise-Cancelling Earbuds",       category:"Electronics",   price:179, desc:"40hr battery, hybrid ANC, IPX5 water resistance.",                image:"https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&q=80", featured:true,  in_stock:true  },
  { id:"p4",  title:"Linen Throw Blanket",            category:"Home & Garden", price:89,  desc:"Stone-washed European flax. Pre-washed for softness.",            image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80", featured:false, in_stock:true  },
  { id:"p5",  title:"Trail Running Shoes",            category:"Sports",        price:145, desc:"Carbon-fibre plate, 4mm drop, all-terrain outsole.",              image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80", featured:false, in_stock:true  },
  { id:"p6",  title:"Leather Card Wallet",            category:"Accessories",   price:55,  desc:"Full-grain veg-tan leather, 4 card slots, 1 cash pocket.",        image:"https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80", featured:false, in_stock:true  },
  { id:"p7",  title:"The Design of Everyday Things",  category:"Books",         price:22,  desc:"Don Norman's essential guide to human-centred design.",           image:"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80", featured:false, in_stock:true  },
  { id:"p8",  title:"Cast Iron Skillet 10in",         category:"Home & Garden", price:75,  desc:"Pre-seasoned, lifetime warranty, induction compatible.",          image:"https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=600&q=80", featured:false, in_stock:false },
  { id:"p9",  title:"Bamboo Mechanical Keyboard",     category:"Electronics",   price:219, desc:"Gasket mount, hot-swap, POM plate, 1000Hz polling.",              image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80", featured:false, in_stock:true  },
  { id:"p10", title:"Yoga Mat Pro",                   category:"Sports",        price:98,  desc:"6mm natural rubber, alignment lines, carrying strap.",            image:"https://images.unsplash.com/photo-1601925228565-65f4bc7a4e93?w=600&q=80", featured:false, in_stock:true  },
  { id:"p11", title:"Titanium Pen",                   category:"Accessories",   price:79,  desc:"Aircraft-grade Ti, Parker-compatible refill, machined grip.",    image:"https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&q=80", featured:false, in_stock:true  },
  { id:"p12", title:"Linen Shirt",                    category:"Clothing",      price:112, desc:"Stonewashed Belgian linen, relaxed fit, mother-of-pearl buttons.",image:"https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&q=80", featured:false, in_stock:true  },
];
const CATEGORIES = ["All","Electronics","Clothing","Home & Garden","Books","Sports","Accessories"];

// ─── Cart Context ─────────────────────────────────────────────────────────────
const CartCtx = createContext(null);
function useCart() { return useContext(CartCtx); }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hashPw(s) { let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;} return h.toString(36); }
function getInitials(n) { return (n||"").trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase()||"?"; }
function fmt(n) { return Number(n).toFixed(2); }
function fmtDate(iso) { return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function fmtDateFull(iso) { return new Date(iso).toLocaleDateString("en-US",{weekday:"short",month:"long",day:"numeric",year:"numeric"}); }
function avgRating(revs) { return revs&&revs.length ? revs.reduce((s,r)=>s+r.rating,0)/revs.length : 0; }
function pwStrength(pw) {
  if(!pw) return null;
  if(pw.length<6) return {level:1,label:"Too short",color:"#ef4444"};
  const sc=[/[A-Z]/,/[0-9]/,/[^A-Za-z0-9]/].filter(r=>r.test(pw)).length+(pw.length>=10?1:0);
  if(sc<=1) return {level:2,label:"Fair",color:"#f97316"};
  return {level:3,label:"Strong",color:"#22c55e"};
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const LS = {
  get:(k,fb)=>{ try{const v=localStorage.getItem(k);return v!=null?JSON.parse(v):fb;}catch{return fb;} },
  set:(k,v) =>{ try{localStorage.setItem(k,JSON.stringify(v));}catch{} },
  del:(k)   =>{ try{localStorage.removeItem(k);}catch{} },
};
const ordersKey = uid => `ecomm_orders_${uid}`;
const RECENT_KEY = "ecomm_recent_searches";

// ─── useDebounce ──────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(()=>{const id=setTimeout(()=>setDeb(value),delay);return()=>clearTimeout(id);},[value,delay]);
  return deb;
}

// ─── Highlight ────────────────────────────────────────────────────────────────
function Highlight({text,query}) {
  if(!query.trim()) return <>{text}</>;
  const idx=text.toLowerCase().indexOf(query.toLowerCase());
  if(idx===-1) return <>{text}</>;
  return <>{text.slice(0,idx)}<mark style={{background:"none",fontWeight:700,textDecoration:"underline",textDecorationColor:"rgba(0,0,0,.3)"}}>{text.slice(idx,idx+query.length)}</mark>{text.slice(idx+query.length)}</>;
}

// ─── StarDisplay ──────────────────────────────────────────────────────────────
function StarDisplay({rating=0,size=14,interactive=false,onRate}) {
  const [hov,setHov]=useState(0);
  const shown=interactive?(hov||rating):rating;
  return (
    <div style={{display:"flex",alignItems:"center",gap:2}}>
      {[1,2,3,4,5].map(i=>(
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i<=shown?"#f59e0b":"none"} stroke={i<=shown?"#f59e0b":"#a8a29e"} strokeWidth="1.5"
          style={{cursor:interactive?"pointer":"default",flexShrink:0}}
          onClick={()=>interactive&&onRate&&onRate(i)}
          onMouseEnter={()=>interactive&&setHov(i)}
          onMouseLeave={()=>interactive&&setHov(0)}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#0f172a;--surf:#1e293b;
  --bdr:rgba(255,255,255,.1);--bdrh:rgba(255,255,255,.2);
  --txt:#f1f5f9;--mut:#94a3b8;--sub:#64748b;
  --acc:#f97316;--acch:#fb923c;
  --ok:#34d399;--err:#f87171;
  --ibg:rgba(249,115,22,.12);--inf:#fb923c;
  --fd:'DM Serif Display',Georgia,serif;
  --fb:'DM Sans',system-ui,sans-serif;
  --r:10px;--rl:16px;
  --sh:0 1px 4px rgba(0,0,0,.4),0 1px 2px rgba(0,0,0,.3);
  --shm:0 4px 16px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.3);
  --shl:0 20px 50px rgba(0,0,0,.7),0 6px 16px rgba(0,0,0,.4);
  --dw:440px;--bnav:60px;
}
html{background:var(--bg);}
body{font-family:var(--fb);background:var(--bg);color:var(--txt);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;margin:0;padding:0;width:100%;overflow-x:hidden;}

/* ── App shell ── */
.app{min-height:100vh;width:100%;display:flex;flex-direction:column;background:var(--bg);}

/* ── Auth page — full-screen dark blue, NOT fixed so iframe sizes correctly ── */
.auth-pg{min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;padding:2rem 1.5rem;background:linear-gradient(145deg,#0f172a 0%,#1e3a5f 50%,#0f2744 100%);}
.auth-card{background:#ffffff;border:none;
  border-radius:var(--rl);
  padding:2.25rem;
  width:100%;
  max-width:420px;
  box-shadow:0 25px 60px rgba(0,0,0,.45),0 8px 20px rgba(0,0,0,.25);
}
.auth-logo{text-align:center;font-family:var(--fd);font-size:28px;margin-bottom:4px;color:var(--acc);}
.auth-sub{text-align:center;font-size:14px;color:var(--mut);margin-bottom:1.75rem;}
.auth-tabs{display:flex;border:1px solid var(--bdr);border-radius:var(--r);padding:3px;gap:3px;margin-bottom:1.5rem;background:rgba(0,0,0,.3);}
.atab{flex:1;padding:8px;font-size:13.5px;border:none;border-radius:7px;cursor:pointer;background:none;color:var(--mut);transition:all .15s;font-family:var(--fb);}
.atab.on{background:#fff;color:var(--txt);font-weight:500;box-shadow:var(--sh);}

/* ── Header ── */
header{background:var(--surf);border-bottom:1px solid var(--bdr);position:sticky;top:0;z-index:200;width:100%;left:0;right:0;}
.hd{max-width:1200px;margin:0 auto;padding:0 2rem;height:62px;display:flex;align-items:center;justify-content:space-between;}
.logo{font-family:var(--fd);font-size:22px;cursor:pointer;letter-spacing:-.3px;user-select:none;color:var(--acc);}
.main{max-width:1200px;margin:0 auto;padding:2.5rem 2rem 4rem;width:100%;flex:1;}

/* ── Desktop Nav ── */
.nav{display:flex;align-items:center;gap:4px;}
.nb{background:none;border:1px solid transparent;border-radius:var(--r);padding:7px 14px;font-size:13.5px;font-family:var(--fb);cursor:pointer;color:var(--mut);display:flex;align-items:center;gap:6px;transition:all .15s;}
.nb:hover{color:var(--txt);background:rgba(255,255,255,.06);}
.nb.on{color:var(--txt);background:rgba(255,255,255,.08);border-color:var(--bdr);font-weight:500;}
.cbtn{background:none;border:1px solid var(--bdr);border-radius:var(--r);padding:7px 14px;font-size:13.5px;font-family:var(--fb);cursor:pointer;color:var(--mut);display:flex;align-items:center;gap:6px;transition:all .15s;}
.cbtn:hover,.cbtn.has{color:var(--txt);border-color:var(--bdrh);}
@keyframes bump{0%,100%{transform:scale(1)}40%{transform:scale(1.2)}70%{transform:scale(.92)}}
.bump{animation:bump .38s ease;}
.chip{background:var(--acc);color:#fff;border-radius:999px;font-size:10px;font-weight:500;min-width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;}
.av{width:34px;height:34px;border-radius:50%;background:var(--ibg);color:var(--inf);border:1px solid var(--bdr);font-size:12px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:var(--fb);transition:all .15s;}
.av:hover{border-color:var(--bdrh);}

/* ── Mobile Bottom Nav ── */
.bnav{display:none;position:fixed;bottom:0;left:0;right:0;height:var(--bnav);background:var(--surf);border-top:1px solid var(--bdr);z-index:200;padding-bottom:env(safe-area-inset-bottom);}
.bnav-inner{display:flex;height:100%;}
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:none;border:none;cursor:pointer;font-family:var(--fb);font-size:10px;color:var(--sub);transition:color .15s;position:relative;}
.bnav-btn.on{color:var(--acc);}
.bnav-chip{position:absolute;top:4px;right:calc(50% - 18px);background:var(--acc);color:#fff;border-radius:999px;font-size:9px;font-weight:600;min-width:15px;height:15px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px;}

/* ── Dropdown ── */
.ddw{position:relative;}
.dd{position:absolute;right:0;top:42px;background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);padding:6px;min-width:200px;box-shadow:var(--shm);z-index:400;}
.dd-hd{padding:10px 12px 12px;border-bottom:1px solid var(--bdr);margin-bottom:4px;}
.dd-hd p{font-size:14px;font-weight:500;margin-bottom:1px;}
.dd-hd span{font-size:12px;color:var(--mut);}
.mi{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:8px;font-size:13.5px;cursor:pointer;color:var(--mut);width:100%;background:none;border:none;font-family:var(--fb);text-align:left;transition:all .12s;}
.mi:hover{background:rgba(255,255,255,.06);color:var(--txt);}
.mi.red:hover{background:rgba(248,113,113,.12);color:var(--err);}

/* ── Cart Drawer ── */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:300;opacity:0;pointer-events:none;transition:opacity .25s;}
.ov.open{opacity:1;pointer-events:all;}
.dr{position:fixed;top:0;right:0;bottom:0;width:var(--dw);max-width:100vw;background:var(--surf);box-shadow:var(--shl);z-index:301;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);}
.dr.open{transform:translateX(0);}
.dr-hd{padding:20px 24px 16px;border-bottom:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.dr-title{font-family:var(--fd);font-size:20px;display:flex;align-items:center;gap:10px;}
.dr-ct{font-family:var(--fb);font-size:13px;color:var(--mut);font-weight:400;}
.dr-x{width:32px;height:32px;border-radius:8px;border:1px solid var(--bdr);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--mut);}
.dr-body{flex:1;overflow-y:auto;padding:16px 24px;}
.dr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:2rem;}
.dr-empty h3{font-family:var(--fd);font-size:20px;margin-bottom:6px;}
.dr-empty p{font-size:14px;color:var(--mut);margin-bottom:1.5rem;}
.dr-ft{padding:16px 24px 20px;border-top:1px solid var(--bdr);flex-shrink:0;}
.dr-sub{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;}
.dr-sub span:first-child{font-size:13px;color:var(--mut);}
.dr-sub span:last-child{font-family:var(--fd);font-size:22px;}
.dr-tax{font-size:12px;color:var(--sub);margin-bottom:14px;}
.di{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr);}
.di:last-child{border-bottom:none;}
.di-img{width:68px;height:68px;border-radius:var(--r);overflow:hidden;flex-shrink:0;background:#1e293b;}
.di-img img{width:100%;height:100%;object-fit:cover;}
.di-info{flex:1;min-width:0;}
.di-name{font-size:14px;font-weight:500;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.di-price{font-size:12.5px;color:var(--mut);margin-bottom:8px;}
.di-row{display:flex;align-items:center;justify-content:space-between;}
.qg{display:flex;align-items:center;border:1px solid var(--bdr);border-radius:8px;overflow:hidden;background:rgba(255,255,255,.04);}
.qb{width:30px;height:28px;border:none;background:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:var(--txt);font-family:var(--fb);}
.qb:hover{background:rgba(255,255,255,.08);}
.qn{min-width:28px;text-align:center;font-size:13px;font-weight:500;}
.di-tot{font-size:14px;font-weight:500;font-family:var(--fd);}
.rb{background:none;border:none;cursor:pointer;color:var(--sub);padding:4px;border-radius:6px;display:flex;align-items:center;}
.rb:hover{color:var(--err);background:rgba(248,113,113,.12);}

/* ── Forms ── */
.field{margin-bottom:14px;}
.field label{display:block;font-size:12.5px;color:var(--mut);margin-bottom:5px;font-weight:500;}
.field input,.field select,.field textarea{width:100%;padding:10px 13px;border:1px solid var(--bdr);border-radius:var(--r);background:rgba(255,255,255,.05);font-size:14px;color:var(--txt);outline:none;transition:border-color .15s;font-family:var(--fb);appearance:none;}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--acc);background:rgba(255,255,255,.08);}
.f2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.pw-w{position:relative;}
.pw-w input{padding-right:54px;}
.pw-t{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--sub);font-size:12px;font-family:var(--fb);padding:4px 6px;}
.sr{display:flex;align-items:center;gap:8px;margin-top:6px;}
.ss{flex:1;height:3px;border-radius:2px;background:var(--bdr);}
.sl{font-size:11px;color:var(--sub);min-width:50px;}
.al{border-radius:var(--r);padding:10px 13px;font-size:13.5px;margin-bottom:14px;}
.al.err{background:rgba(248,113,113,.12);color:#fca5a5;border:1px solid rgba(248,113,113,.3);}
.al.ok{background:rgba(52,211,153,.12);color:#6ee7b7;border:1px solid rgba(52,211,153,.3);}

/* ── Buttons ── */
.btn{padding:9px 20px;border-radius:var(--r);font-size:14px;font-family:var(--fb);cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:7px;}
.btn-p{background:var(--acc);color:#fff;border:none;width:100%;padding:12px;font-size:14.5px;font-weight:500;}
.btn-p:hover{background:var(--acch);}
.btn-p:disabled{opacity:.45;cursor:not-allowed;}
.btn-o{background:none;border:1px solid var(--bdrh);color:var(--txt);}
.btn-o:hover{background:rgba(255,255,255,.07);}
.btn-d{background:none;border:1px solid rgba(248,113,113,.4);color:var(--err);}
.btn-d:hover{background:rgba(248,113,113,.12);}
.btn-g{background:none;border:1px solid transparent;color:var(--mut);}
.btn-g:hover{background:rgba(255,255,255,.06);color:var(--txt);}
.btn-sm{padding:6px 14px;font-size:13px;}
.sp{width:14px;height:14px;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Hero ── */
.hero{padding:3rem 0 2rem;}
.hero-ey{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-bottom:10px;}
.hero-h{font-family:var(--fd);font-size:clamp(30px,5vw,50px);line-height:1.1;letter-spacing:-.5px;margin-bottom:10px;}
.hero-h em{font-style:italic;color:var(--mut);}
.hero-p{font-size:15px;color:var(--mut);max-width:480px;margin-bottom:1.5rem;line-height:1.7;}

/* ── Search ── */
.sw{max-width:100%;position:relative;}
.sw-row{position:relative;}
.sw-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;}
.sw-input{width:100%;padding:12px 80px 12px 42px;border:1.5px solid var(--bdr);border-radius:999px;background:var(--surf);font-size:15px;outline:none;font-family:var(--fb);box-shadow:var(--sh);color:var(--txt);}
.sw-input:focus{border-color:var(--acc);}
.sw-actions{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:4px;}
.sw-clear{width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,.08);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--mut);}
.sw-kbd{font-size:10px;color:var(--sub);background:var(--bg);border:1px solid var(--bdr);border-radius:5px;padding:2px 6px;}
.sw-panel{position:absolute;top:calc(100% + 8px);left:0;right:0;background:#1e293b;border:1px solid var(--bdr);border-radius:var(--rl);box-shadow:var(--shm);z-index:500;overflow:hidden;max-height:400px;overflow-y:auto;}
.sw-sec-hd{padding:9px 14px 6px;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--sub);font-weight:500;border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;}
.sw-row-item{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--bdr);}
.sw-row-item:last-child{border-bottom:none;}
.sw-row-item:hover,.sw-row-item.foc{background:rgba(255,255,255,.06);}
.sw-img{width:38px;height:38px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#1e293b;}
.sw-img img{width:100%;height:100%;object-fit:cover;}
.sw-ico{width:38px;height:38px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--sub);}
.sw-body{flex:1;min-width:0;}
.sw-name{font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sw-sub{font-size:11.5px;color:var(--mut);margin-top:1px;}
.sw-prc{font-family:var(--fd);font-size:14px;color:var(--mut);flex-shrink:0;}
.sw-ft{padding:8px 14px;font-size:12px;color:var(--mut);border-top:1px solid var(--bdr);display:flex;align-items:center;justify-content:space-between;}
.sw-empty{padding:22px 14px;text-align:center;color:var(--mut);font-size:13.5px;}
.sw-banner{display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(255,255,255,.05);border:1px solid var(--bdr);border-radius:var(--r);margin-bottom:1.25rem;font-size:13.5px;flex-wrap:wrap;}
.sw-banner-clear{margin-left:auto;background:none;border:1px solid var(--bdrh);border-radius:999px;padding:3px 12px;font-size:12px;cursor:pointer;font-family:var(--fb);color:var(--mut);}
.sw-banner-clear:hover{background:var(--acc);color:#fff;border-color:var(--acc);}

/* ── Filters ── */
.fb{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin:1.5rem 0 1.75rem;scrollbar-width:none;}
.fb::-webkit-scrollbar{display:none;}
.fl{font-size:12px;color:var(--mut);margin-right:4px;letter-spacing:.05em;text-transform:uppercase;font-weight:500;white-space:nowrap;align-self:center;flex-shrink:0;}
.fc{border:1px solid var(--bdr);border-radius:999px;padding:5px 16px;font-size:13px;background:none;cursor:pointer;color:var(--mut);font-family:var(--fb);white-space:nowrap;flex-shrink:0;}
.fc:hover{border-color:var(--bdrh);color:var(--txt);}
.fc.on{background:var(--acc);color:#fff;border-color:var(--acc);}
.sh{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1.5rem;padding-bottom:12px;border-bottom:1px solid var(--bdr);}
.sh h2{font-family:var(--fd);font-size:22px;}
.sh span{font-size:13px;color:var(--sub);}

/* ── Product Grid & Card ── */
.pg{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr));gap:16px;margin-bottom:3rem;}
.pc{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);overflow:hidden;transition:border-color .2s,transform .2s;}
.pc:hover{border-color:var(--bdrh);transform:translateY(-2px);box-shadow:var(--shm);}
.pc.out{opacity:.6;}
.pc-img{position:relative;aspect-ratio:1;overflow:hidden;background:#ede8df;cursor:pointer;}
.pc-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s;display:block;}
.pc:hover .pc-img img{transform:scale(1.04);}
.cat-pill{position:absolute;bottom:10px;left:10px;background:rgba(15,23,42,.8);color:#e2e8f0;font-size:11px;font-weight:500;padding:4px 10px;border-radius:999px;border:1px solid var(--bdr);}
.feat-pill{position:absolute;top:10px;right:10px;background:var(--acc);color:#fff;font-size:10px;font-weight:500;padding:4px 10px;border-radius:999px;text-transform:uppercase;}
.ic-badge{position:absolute;top:10px;left:10px;background:rgba(15,23,42,.85);border:1px solid var(--bdr);border-radius:999px;font-size:11px;font-weight:500;padding:3px 9px;color:#e2e8f0;display:flex;align-items:center;gap:4px;cursor:pointer;}
.out-ov{position:absolute;inset:0;background:rgba(245,240,232,.65);display:flex;align-items:center;justify-content:center;}
.out-lb{background:rgba(30,41,59,.9);border:1px solid var(--bdr);border-radius:999px;font-size:12px;color:var(--mut);padding:5px 14px;}
.pc-body{padding:14px 16px 16px;}
.pc-name{font-size:15px;font-weight:500;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;}
.pc-name:hover{color:var(--acc);}
.pc-stars{display:flex;align-items:center;gap:4px;margin:3px 0 8px;}
.pc-stars span{font-size:11.5px;color:var(--mut);}
.pc-no-rev{font-size:11px;color:var(--sub);margin:3px 0 8px;}
.pc-desc{font-size:12.5px;color:var(--mut);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px;min-height:36px;}
.pc-ft{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.pc-price{font-family:var(--fd);font-size:17px;flex-shrink:0;}
.add-btn{border:1px solid var(--bdrh);border-radius:var(--r);padding:7px 14px;font-size:13px;cursor:pointer;background:none;color:var(--txt);font-family:var(--fb);transition:all .15s;display:flex;align-items:center;gap:5px;flex-shrink:0;}
.add-btn:hover:not(:disabled){background:var(--acc);color:#fff;border-color:var(--acc);}
.add-btn:disabled{opacity:.4;cursor:not-allowed;}

/* ── Checkout ── */
.ck-wrap{max-width:780px;margin:0 auto;}
.ck-steps{display:flex;align-items:center;margin-bottom:2rem;}
.ck-step{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--sub);}
.ck-step.done{color:var(--ok);}
.ck-step.act{color:var(--txt);font-weight:500;}
.ck-dot{width:24px;height:24px;border-radius:50%;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0;transition:all .2s;}
.ck-step.done .ck-dot{background:var(--ok);border-color:var(--ok);color:#fff;}
.ck-step.act .ck-dot{background:var(--acc);border-color:var(--acc);color:#fff;}
.ck-line{flex:1;height:1px;background:var(--bdr);margin:0 6px;min-width:12px;}
.ck-grid{display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start;}
.ck-side{position:sticky;top:80px;}
.fs{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);padding:20px;margin-bottom:14px;}
.fs h2{font-size:15px;font-weight:500;margin-bottom:16px;display:flex;align-items:center;gap:8px;}
.os-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bdr);}
.os-item:last-child{border-bottom:none;}
.os-img{width:46px;height:46px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#1e293b;position:relative;}
.os-img img{width:100%;height:100%;object-fit:cover;}
.os-qb{position:absolute;top:-5px;right:-5px;background:var(--acc);color:#fff;border-radius:50%;width:17px;height:17px;font-size:10px;font-weight:500;display:flex;align-items:center;justify-content:center;font-family:var(--fb);}
.os-name{flex:1;font-size:13px;font-weight:500;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.os-price{font-size:13px;font-weight:500;font-family:var(--fd);flex-shrink:0;}
.os-row{display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:7px;color:var(--mut);}
.os-total{display:flex;justify-content:space-between;font-size:18px;font-weight:500;padding-top:12px;margin-top:4px;border-top:1px solid var(--bdr);font-family:var(--fd);}

/* ── Stripe Payment ── */
.stripe-preview{border-radius:16px;padding:20px;color:#fff;margin-bottom:18px;position:relative;overflow:hidden;min-height:155px;display:flex;flex-direction:column;justify-content:space-between;}
.stripe-preview::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.07) 0%,transparent 60%);pointer-events:none;}
.brand-visa{background:linear-gradient(135deg,#1a1f71,#2d3561);}
.brand-mc{background:linear-gradient(135deg,#1a1a18,#2d2d2b);}
.brand-amex{background:linear-gradient(135deg,#0a4f3b,#0e6b50);}
.brand-discover{background:linear-gradient(135deg,#7c3a00,#a85000);}
.brand-default{background:linear-gradient(135deg,#374151,#1f2937);}
.scp-top{display:flex;justify-content:space-between;align-items:flex-start;}
.scp-chip{width:30px;height:22px;border-radius:4px;background:linear-gradient(135deg,#e8c84a,#c9a227);}
.scp-num{font-size:16px;letter-spacing:.2em;font-family:'Courier New',monospace;opacity:.9;margin:14px 0 4px;}
.scp-bot{display:flex;justify-content:space-between;align-items:flex-end;}
.scp-lbl{font-size:9px;opacity:.5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px;}
.scp-val{font-size:12px;font-weight:500;opacity:.9;}
.mc-c{display:flex;}.mc-c1,.mc-c2{width:22px;height:22px;border-radius:50%;}.mc-c1{background:#eb001b;opacity:.9;}.mc-c2{background:#f79e1b;opacity:.9;margin-left:-9px;}
.stripe-badge{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:8px;background:rgba(194,65,12,.07);border:1px solid rgba(194,65,12,.18);margin-bottom:14px;}
.stripe-badge span{font-size:12px;color:var(--acc);font-weight:500;}
.stripe-f{margin-bottom:13px;}
.stripe-f label{display:block;font-size:12px;font-weight:500;color:var(--mut);margin-bottom:5px;}
.stripe-inp{width:100%;padding:10px 13px;border:1.5px solid var(--bdr);border-radius:8px;background:var(--surf);font-size:14px;color:var(--txt);outline:none;font-family:var(--fb);}
.stripe-inp:focus{border-color:var(--acc);}
.stripe-inp.s-err{border-color:var(--err);}
.stripe-inp.s-ok{border-color:var(--ok);}
.stripe-inp-w{position:relative;}
.stripe-inp-w .stripe-inp{padding-right:40px;}
.stripe-inp-ico{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none;}
.s-err-msg{font-size:12px;color:var(--err);margin-top:4px;}
.test-cards{background:rgba(255,255,255,.04);border:1px solid var(--bdr);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;}
.test-cards-hd{font-size:11.5px;font-weight:500;color:var(--mut);margin-bottom:7px;display:flex;align-items:center;gap:5px;}
.tc-row{display:flex;align-items:center;justify-content:space-between;padding:5px 6px;border-bottom:1px solid var(--bdr);cursor:pointer;border-radius:4px;margin:0 -6px;}
.tc-row:last-child{border-bottom:none;}
.tc-row:hover{background:rgba(255,255,255,.06);}
.tc-num{font-family:'Courier New',monospace;font-size:12px;color:var(--txt);}
.tc-out{font-size:11px;padding:2px 8px;border-radius:999px;}
.tco-s{background:rgba(52,211,153,.2);color:#6ee7b7;}.tco-d{background:rgba(248,113,113,.2);color:#fca5a5;}.tco-a{background:rgba(251,191,36,.2);color:#fcd34d;}
.pay-proc{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;text-align:center;}
.pay-proc-ring{width:52px;height:52px;border:3px solid rgba(0,0,0,.1);border-top-color:var(--acc);border-radius:50%;animation:spin .8s linear infinite;margin-bottom:1rem;}
.pay-dec{display:flex;flex-direction:column;align-items:center;padding:2rem 1rem;text-align:center;}
.pay-dec-ico{width:52px;height:52px;border-radius:50%;background:rgba(248,113,113,.12);border:2px solid rgba(248,113,113,.35);display:flex;align-items:center;justify-content:center;margin-bottom:1rem;}

/* ── Order History ── */
.oh-wrap{max-width:860px;margin:0 auto;}
.oh-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:2rem;}
.oh-stat{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);padding:14px 16px;}
.oh-stat-l{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;}
.oh-stat-v{font-family:var(--fd);font-size:20px;}
.oh-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1.5rem;}
.oh-search{flex:1;min-width:160px;position:relative;}
.oh-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);}
.oh-search input{width:100%;padding:8px 12px 8px 32px;border:1px solid var(--bdr);border-radius:var(--r);background:rgba(255,255,255,.05);font-size:13.5px;outline:none;font-family:var(--fb);}
.oh-search input:focus{border-color:var(--bdrh);}
.oh-sort{padding:8px 12px;border:1px solid var(--bdr);border-radius:var(--r);background:rgba(255,255,255,.05);font-size:13.5px;font-family:var(--fb);color:var(--txt);outline:none;cursor:pointer;}
.ord-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);margin-bottom:12px;overflow:hidden;cursor:pointer;}
.ord-card:hover{border-color:var(--bdrh);box-shadow:var(--shm);}
.ord-hd{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;}
.ord-id{font-size:13px;font-weight:500;margin-bottom:2px;}
.ord-date{font-size:12px;color:var(--mut);}
.ord-hd-r{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.ord-tot{font-family:var(--fd);font-size:17px;}
.s-pill{font-size:11px;padding:3px 10px;border-radius:999px;font-weight:500;white-space:nowrap;}
.s-confirmed{background:rgba(59,130,246,.2);color:#93c5fd;}
.s-shipped{background:rgba(139,92,246,.2);color:#c4b5fd;}
.s-delivered{background:rgba(52,211,153,.2);color:#6ee7b7;}
.s-cancelled{background:rgba(248,113,113,.2);color:#fca5a5;}
.ord-thumbs{display:flex;gap:6px;padding:0 18px 14px;overflow-x:auto;}
.ord-thumb{width:42px;height:42px;border-radius:8px;overflow:hidden;background:#1e293b;flex-shrink:0;position:relative;border:1px solid var(--bdr);}
.ord-thumb img{width:100%;height:100%;object-fit:cover;}
.ord-thumb-ct{position:absolute;bottom:0;right:0;background:rgba(0,0,0,.55);color:#fff;font-size:9px;font-weight:600;padding:1px 4px;border-radius:4px 0 0 0;}
.ord-more{width:42px;height:42px;border-radius:8px;border:1px solid var(--bdr);background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--mut);flex-shrink:0;}
.ord-detail{border-top:1px solid var(--bdr);padding:18px;}
.od-grid{display:grid;grid-template-columns:1fr 260px;gap:18px;}
.od-item{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--bdr);}
.od-item:last-child{border-bottom:none;}
.od-img{width:50px;height:50px;border-radius:var(--r);overflow:hidden;flex-shrink:0;background:#1e293b;}
.od-img img{width:100%;height:100%;object-fit:cover;}
.od-name{font-size:13.5px;font-weight:500;margin-bottom:2px;}
.od-meta{font-size:12px;color:var(--mut);}
.od-price{font-size:13.5px;font-weight:500;font-family:var(--fd);margin-left:auto;flex-shrink:0;}
.od-sec{margin-bottom:16px;}
.od-sec-l{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--sub);margin-bottom:8px;font-weight:500;}
.od-sec-v{font-size:13px;color:var(--mut);line-height:1.7;}
.od-trow{display:flex;justify-content:space-between;font-size:13px;color:var(--mut);margin-bottom:5px;}
.od-trow.total{font-size:15px;font-weight:500;color:var(--txt);border-top:1px solid var(--bdr);padding-top:10px;margin-top:4px;}
.od-trow.total span:last-child{font-family:var(--fd);}
.tl{display:flex;flex-direction:column;}
.tl-step{display:flex;gap:12px;position:relative;}
.tl-step::before{content:'';position:absolute;left:9px;top:20px;bottom:-4px;width:1px;background:var(--bdr);}
.tl-step:last-child::before{display:none;}
.tl-dot{width:20px;height:20px;border-radius:50%;border:2px solid var(--bdr);background:var(--surf);flex-shrink:0;display:flex;align-items:center;justify-content:center;z-index:1;}
.tl-dot.done{background:var(--ok);border-color:var(--ok);}
.tl-dot.act{background:var(--acc);border-color:var(--acc);}
.tl-cont{padding-bottom:14px;flex:1;}
.tl-title{font-size:13px;font-weight:500;margin-bottom:1px;}
.tl-title.dim{color:var(--sub);font-weight:400;}
.tl-date{font-size:11.5px;color:var(--sub);}
.reorder-btn{width:100%;padding:9px;border:1px solid var(--bdrh);border-radius:var(--r);background:none;font-size:13.5px;font-family:var(--fb);cursor:pointer;color:var(--txt);display:flex;align-items:center;justify-content:center;gap:7px;margin-top:12px;}
.reorder-btn:hover{background:var(--acc);color:#fff;border-color:var(--acc);}
.oh-none{text-align:center;padding:2.5rem 0;}

/* ── Success ── */
.ok-wrap{max-width:500px;margin:3rem auto;text-align:center;}
.ok-ico{width:72px;height:72px;border-radius:50%;background:rgba(52,211,153,.12);border:1.5px solid rgba(52,211,153,.4);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;}
.ok-wrap h1{font-family:var(--fd);font-size:28px;margin-bottom:10px;}
.ok-msg{color:var(--mut);font-size:15px;margin-bottom:.5rem;}
.ok-id{font-size:12px;color:var(--sub);margin-bottom:2rem;}
.ok-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);padding:18px;text-align:left;margin-bottom:1.25rem;}
.ok-card h3{font-size:13.5px;font-weight:500;margin-bottom:10px;color:var(--mut);}
.ok-detail{display:flex;justify-content:space-between;font-size:13.5px;padding:5px 0;border-bottom:1px solid var(--bdr);}
.ok-detail:last-child{border-bottom:none;}

/* ── Profile ── */
.pro-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);padding:1.75rem;max-width:500px;}
.pro-av{width:64px;height:64px;border-radius:50%;background:var(--ibg);color:var(--inf);font-size:22px;font-weight:500;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;}
.pro-name{font-family:var(--fd);font-size:22px;margin-bottom:4px;}
.pro-email{font-size:13.5px;color:var(--mut);margin-bottom:1.5rem;}
.stat-g{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1.5rem;}
.stat-b{background:#1e3a5f;border-radius:var(--r);padding:12px 14px;}
.stat-l{font-size:12px;color:var(--mut);margin-bottom:4px;}
.stat-v{font-size:15px;font-weight:500;}

/* ── Empty ── */
.empty{text-align:center;padding:4rem 0;}
.ei{width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,.05);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;}
.empty h2{font-family:var(--fd);font-size:22px;margin-bottom:8px;}
.empty p{color:var(--mut);font-size:14px;margin-bottom:1.5rem;}

/* ── AI Strip ── */
.ai-strip{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);padding:13px 16px;margin-bottom:1.75rem;display:flex;gap:12px;align-items:flex-start;}
.ai-dot{width:26px;height:26px;border-radius:50%;background:var(--ibg);color:var(--inf);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ai-bd{font-size:13px;color:var(--mut);line-height:1.65;}
.typing{display:inline-flex;gap:4px;align-items:center;}
.typing span{width:5px;height:5px;border-radius:50%;background:var(--sub);animation:bl 1.2s ease-in-out infinite;}
.typing span:nth-child(2){animation-delay:.2s;}.typing span:nth-child(3){animation-delay:.4s;}
@keyframes bl{0%,80%,100%{opacity:0}40%{opacity:1}}

/* ── Toast ── */
.toast{position:fixed;bottom:calc(var(--bnav) + 12px);left:50%;transform:translateX(-50%);background:var(--acc);color:#fff;padding:10px 18px;border-radius:var(--r);font-size:13.5px;z-index:9999;transition:opacity .3s;pointer-events:none;white-space:nowrap;box-shadow:var(--shm);}

/* ── Reviews ── */
.rv-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem;}
.rv-modal{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);padding:24px;width:100%;max-width:480px;box-shadow:var(--shl);}
.rv-modal h2{font-family:var(--fd);font-size:20px;margin-bottom:4px;}
.rv-modal-sub{font-size:13px;color:var(--mut);margin-bottom:1.25rem;}
.rv-star-pick{display:flex;gap:6px;margin-bottom:1rem;}
.rv-star-pick svg{width:32px;height:32px;cursor:pointer;}
.rv-modal-btns{display:flex;gap:10px;margin-top:14px;}
.rv-item{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--rl);padding:16px;}
.rv-item.mine{border-left:3px solid var(--acc);}
.rv-item-hd{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;gap:10px;}
.rv-av{width:34px;height:34px;border-radius:50%;background:var(--ibg);color:var(--inf);font-size:12px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.rv-name{font-size:13.5px;font-weight:500;}
.rv-date{font-size:11.5px;color:var(--sub);}
.rv-title{font-size:13.5px;font-weight:500;margin-bottom:4px;}
.rv-body{font-size:13px;color:var(--mut);line-height:1.65;}
.rv-verified{font-size:11px;color:var(--ok);display:flex;align-items:center;gap:3px;margin-top:6px;}
.rv-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12px;color:var(--mut);}
.rv-bar-track{flex:1;height:6px;background:var(--bdr);border-radius:3px;overflow:hidden;}
.rv-bar-fill{height:100%;background:#f59e0b;border-radius:3px;}

/* ── Misc ── */
.pg-title{font-family:var(--fd);font-size:30px;margin-bottom:1.5rem;letter-spacing:-.3px;}
.bk{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;color:var(--mut);cursor:pointer;margin-bottom:1.25rem;background:none;border:none;font-family:var(--fb);}
.bk:hover{color:var(--txt);}
.btn-row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}

/* ── Responsive ── */
@media(max-width:1024px){.ck-grid{grid-template-columns:1fr 280px;}.od-grid{grid-template-columns:1fr 240px;}}
@media(max-width:768px){
  .main{padding:2rem 1.5rem;}.hd{padding:0 1.5rem;}
  .pg{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;}
  .ck-grid{grid-template-columns:1fr;}.ck-side{position:static;}
  .od-grid{grid-template-columns:1fr;}
  .oh-stats{grid-template-columns:repeat(2,1fr);}
  .ck-step .ck-lbl{display:none;}
  .prod-hero{grid-template-columns:1fr!important;}
}
@media(max-width:640px){
  :root{--dw:100vw;}
  .main{padding:1.25rem 1rem calc(var(--bnav) + 1.5rem);}
  .hd{padding:0 1rem;height:54px;}.logo{font-size:19px;}
  .nav .nb,.nav .cbtn,.nav .ddw{display:none;}
  .bnav{display:flex;}
  .auth-pg{padding:1.5rem 1rem;}
  .auth-card{padding:1.75rem 1.25rem;}
  .hero{padding:1.75rem 0 1.5rem;}.hero-ey{display:none;}.hero-p{font-size:14.5px;}
  .pg{grid-template-columns:repeat(2,1fr);gap:10px;}
  .pc-body{padding:10px 12px 12px;}.pc-name{font-size:13px;}.pc-desc{display:none;}.pc-price{font-size:15px;}.add-btn{padding:6px 10px;font-size:12px;}
  .ck-grid{grid-template-columns:1fr;}.ck-side{position:static;}.f2{grid-template-columns:1fr;}.fs{padding:16px;}
  .oh-stats{grid-template-columns:1fr 1fr;}.oh-sort{width:100%;}
  .ok-wrap{margin:1.5rem auto;}.btn-row{flex-direction:column;}.btn-row .btn-o{width:100%;}
  .dr{bottom:var(--bnav);}
  .rv-modal{padding:18px;}
  .toast{bottom:calc(var(--bnav) + 16px);}
}
@media(max-width:380px){.pg{grid-template-columns:1fr 1fr;}.oh-stats{grid-template-columns:1fr 1fr;}}
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const initData = (() => {
    try { return { users:LS.get("ecomm_users",[]), session:LS.get("ecomm_session",null), guestCart:LS.get("ecomm_cart",[]) }; }
    catch { return {users:[],session:null,guestCart:[]}; }
  })();

  const [users, setUsers]               = useState(initData.users);
  const [currentUser, setCurrentUser]   = useState(() => initData.session ? initData.users.find(u=>u.email===initData.session.email)||null : null);
  const [cart, setCart]                 = useState(() => { const u=initData.session&&initData.users.find(u=>u.email===initData.session?.email); return u?.cart||initData.guestCart; });
  const [orders, setOrders]             = useState(() => { const u=initData.session&&initData.users.find(u=>u.email===initData.session?.email); return u?LS.get(ordersKey(u.id),[]):[] });
  const [reviews, setReviews]           = useState(() => LS.get("ecomm_reviews",{}));
  const [cartOpen, setCartOpen]         = useState(false);
  const [cartBounce, setCartBounce]     = useState(false);
  const [page, setPage]                 = useState(currentUser?"shop":"auth");
  const [authMode, setAuthMode]         = useState("login");
  const [activeCat, setActiveCat]       = useState("All");
  const [pendingIds, setPendingIds]     = useState([]);
  const [showMenu, setShowMenu]         = useState(false);
  const [aiMsg, setAiMsg]               = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [toast, setToast]               = useState({msg:"",vis:false});
  const [lastOrder, setLastOrder]       = useState(null);
  const [selProduct, setSelProduct]     = useState(null);
  const toastRef  = useRef(null);
  const bounceRef = useRef(null);

  useEffect(()=>{ const s=document.createElement("style"); s.textContent=CSS; document.head.appendChild(s); return()=>document.head.removeChild(s); },[]);
  useEffect(()=>{ const fn=e=>{if(e.key==="Escape")setCartOpen(false);}; window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn); },[]);

  useEffect(()=>{ LS.set("ecomm_users",users); },[users]);
  useEffect(()=>{ currentUser?LS.set("ecomm_session",{email:currentUser.email}):LS.del("ecomm_session"); },[currentUser]);
  useEffect(()=>{ LS.set("ecomm_cart",cart); if(currentUser) setUsers(p=>p.map(u=>u.email===currentUser.email?{...u,cart}:u)); },[cart]);
  useEffect(()=>{ if(currentUser){ LS.set(ordersKey(currentUser.id),orders); setUsers(p=>p.map(u=>u.email===currentUser.email?{...u,orders}:u)); } },[orders]);
  useEffect(()=>{ LS.set("ecomm_reviews",reviews); },[reviews]);

  const showToast=useCallback(msg=>{ setToast({msg,vis:true}); clearTimeout(toastRef.current); toastRef.current=setTimeout(()=>setToast(t=>({...t,vis:false})),2500); },[]);
  const triggerBounce=useCallback(()=>{ setCartBounce(true); clearTimeout(bounceRef.current); bounceRef.current=setTimeout(()=>setCartBounce(false),400); },[]);

  const cartCount=cart.reduce((s,i)=>s+i.quantity,0);
  const cartTotal=cart.reduce((s,i)=>s+i.price*i.quantity,0);

  const addItem=useCallback(async product=>{ setPendingIds(p=>[...p,product.id]); setCart(prev=>{ const ex=prev.find(i=>i.product_id===product.id); if(ex) return prev.map(i=>i.product_id===product.id?{...i,quantity:i.quantity+1}:i); return [...prev,{product_id:product.id,title:product.title,price:product.price,quantity:1,image:product.image}]; }); triggerBounce(); try{ await new Promise((res,rej)=>setTimeout(()=>Math.random()<0.05?rej():res(),400)); setPendingIds(p=>p.filter(x=>x!==product.id)); }catch{ setCart(prev=>{ const item=prev.find(i=>i.product_id===product.id); if(!item) return prev; return item.quantity>1?prev.map(i=>i.product_id===product.id?{...i,quantity:i.quantity-1}:i):prev.filter(i=>i.product_id!==product.id); }); setPendingIds(p=>p.filter(x=>x!==product.id)); showToast("Could not add item."); } },[showToast,triggerBounce]);
  const removeItem=useCallback(pid=>setCart(prev=>prev.filter(i=>i.product_id!==pid)),[]);
  const updateQty=useCallback((pid,qty)=>{ if(qty<=0){removeItem(pid);return;} setCart(prev=>prev.map(i=>i.product_id===pid?{...i,quantity:qty}:i)); },[removeItem]);
  const clearCart=useCallback(()=>setCart([]),[]);

  const doLogin=useCallback(({email,password,setError,setLoading})=>{ setLoading(true); setTimeout(()=>{ const user=users.find(u=>u.email===email.trim().toLowerCase()); if(!user||user.pwHash!==hashPw(password)){setError("Incorrect email or password.");setLoading(false);return;} setCurrentUser(user); setCart(user.cart||[]); setOrders(LS.get(ordersKey(user.id),[])); setPage("shop"); setLoading(false); showToast(`Welcome back, ${user.name.split(" ")[0]}!`); fetchAI(user.name); },650); },[users,showToast]);
  const doRegister=useCallback(({name,email,password,setError,setLoading})=>{ setLoading(true); setTimeout(()=>{ const emailLc=email.trim().toLowerCase(); if(users.find(u=>u.email===emailLc)){setError("An account with that email already exists.");setLoading(false);return;} const user={id:"u_"+Date.now(),name:name.trim(),email:emailLc,pwHash:hashPw(password),cart:[],joined:new Date().toISOString()}; setUsers(prev=>[...prev,user]); setCurrentUser(user); setCart([]); setOrders([]); setPage("shop"); setLoading(false); showToast(`Welcome, ${user.name.split(" ")[0]}!`); fetchAI(user.name); },700); },[users,showToast]);
  const logout=useCallback(()=>{ setCurrentUser(null); setCart([]); setOrders([]); setShowMenu(false); setPage("auth"); setAuthMode("login"); setAiMsg(""); setCartOpen(false); },[]);

  const fetchAI=useCallback(async name=>{ setAiLoading(true); setAiMsg(""); try{ const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:120,system:"You are a concise shopping assistant for Ecomm. Greet the user by first name in one warm sentence, then one quick tip. No markdown.",messages:[{role:"user",content:`Greet ${name?.split(" ")[0]||"there"} and give a shopping tip.`}]})}); const d=await res.json(); setAiMsg(d.content?.[0]?.text||"Welcome! Explore our collection."); }catch{ setAiMsg(`Welcome, ${name?.split(" ")[0]||""}! Explore our curated collection.`); } setAiLoading(false); },[]);

  const placeOrder=useCallback(async(form,setBtnLoading)=>{ setBtnLoading(true); const tax=parseFloat((cartTotal*0.075).toFixed(2)); const total=cartTotal+tax; const order={id:"ORD-"+Math.random().toString(36).slice(2,8).toUpperCase(),date:new Date().toISOString(),status:"confirmed",items:[...cart],subtotal:cartTotal,tax,total,shipping:{name:form.name,address:form.address,city:form.city,zip:form.zip,country:form.country||""},payment:{last4:form.last4||"••••",brand:form.brand||"Card"},confirmation:""}; try{ const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:120,system:"Confirm an e-commerce order with one warm sentence including first name and total. No markdown.",messages:[{role:"user",content:`Confirm for ${form.name.split(" ")[0]}, total $${fmt(total)}, items: ${cart.map(i=>`${i.title}x${i.quantity}`).join(", ")}`}]})}); const d=await res.json(); order.confirmation=d.content?.[0]?.text||`Thanks ${form.name.split(" ")[0]}! Your order of $${fmt(total)} is confirmed.`; }catch{ order.confirmation=`Thanks ${form.name.split(" ")[0]}! Your order of $${fmt(total)} is confirmed.`; } const newOrders=[order,...orders]; setOrders(newOrders); if(currentUser){ LS.set(ordersKey(currentUser.id),newOrders); setUsers(p=>p.map(u=>u.email===currentUser.email?{...u,lastShipping:{name:form.name,address:form.address,city:form.city,zip:form.zip,country:form.country}}:u)); setCurrentUser(p=>({...p,lastShipping:{name:form.name,address:form.address,city:form.city,zip:form.zip,country:form.country}})); } clearCart(); setLastOrder(order); setBtnLoading(false); setCartOpen(false); navTo("success"); },[cart,cartTotal,currentUser,orders,clearCart]);

  const reorderItems=useCallback(async order=>{ let added=0; for(const item of order.items){ const p=PRODUCTS.find(p=>p.id===item.product_id); if(p&&p.in_stock){ setCart(prev=>{ const ex=prev.find(i=>i.product_id===p.id); if(ex) return prev.map(i=>i.product_id===p.id?{...i,quantity:i.quantity+item.quantity}:i); return [...prev,{product_id:p.id,title:p.title,price:p.price,quantity:item.quantity,image:p.image}]; }); added++; } } triggerBounce(); showToast(added>0?`${added} item${added>1?"s":""} added to cart`:"No in-stock items to reorder"); if(added>0) setCartOpen(true); },[showToast,triggerBounce]);

  const submitReview=useCallback((productId,data)=>{ if(!currentUser) return; setReviews(prev=>{ const existing=(prev[productId]||[]).filter(r=>r.userId!==currentUser.id); const rv={id:"rv_"+Date.now(),userId:currentUser.id,userName:currentUser.name,productId,rating:data.rating,title:data.title,body:data.body,date:new Date().toISOString(),verified:orders.some(o=>o.items.some(i=>i.product_id===productId))}; return {...prev,[productId]:[rv,...existing]}; }); showToast("Review submitted!"); },[currentUser,orders,showToast]);
  const deleteReview=useCallback(productId=>{ if(!currentUser) return; setReviews(prev=>({...prev,[productId]:(prev[productId]||[]).filter(r=>r.userId!==currentUser.id)})); showToast("Review deleted."); },[currentUser,showToast]);

  const navTo=useCallback(p=>{ setPage(p); setShowMenu(false); },[]);
  const cartCtx={cart,cartCount,cartTotal,cartOpen,setCartOpen,addItem,removeItem,updateQty,pendingIds,cartBounce};

  // When not logged in — render auth page as the entire screen
  if(!currentUser) {
    return (
      <div className="app">
        <AuthPage mode={authMode} setMode={setAuthMode} onLogin={doLogin} onRegister={doRegister}/>
        <div className="toast" style={{opacity:toast.vis?1:0}}>{toast.msg}</div>
      </div>
    );
  }

  return (
    <CartCtx.Provider value={cartCtx}>
      <div className="app">
        <AppHeader page={page} user={currentUser} showMenu={showMenu} setShowMenu={setShowMenu} onNav={navTo} onLogout={logout}/>
        <div className="main">
          {page==="shop"     && <ShopPage products={PRODUCTS} categories={CATEGORIES} activeCat={activeCat} setActiveCat={setActiveCat} reviews={reviews} aiMsg={aiMsg} aiLoading={aiLoading} onSelectProduct={p=>{setSelProduct(p);setPage("product");}}/>}
          {page==="product"  && selProduct && <ProductPage product={selProduct} reviews={reviews[selProduct.id]||[]} currentUser={currentUser} orders={orders} onSubmitReview={submitReview} onDeleteReview={deleteReview} onBack={()=>navTo("shop")} onAddToCart={addItem} cart={cart} pendingIds={pendingIds}/>}
          {page==="orders"   && <OrdersPage orders={orders} onNav={navTo} onReorder={reorderItems}/>}
          {page==="checkout" && <CheckoutPage cart={cart} total={cartTotal} currentUser={currentUser} onPlace={placeOrder} onBack={()=>navTo("shop")}/>}
          {page==="success"  && <SuccessPage order={lastOrder} onNav={navTo}/>}
          {page==="profile"  && <ProfilePage user={currentUser} orders={orders} onNav={navTo} onLogout={logout}/>}
        </div>
        <CartDrawer onCheckout={()=>{setCartOpen(false);navTo("checkout");}}/>
        <div className="toast" style={{opacity:toast.vis?1:0}}>{toast.msg}</div>
      </div>
    </CartCtx.Provider>
  );
}

// ─── AppHeader ────────────────────────────────────────────────────────────────
function AppHeader({page,user,showMenu,setShowMenu,onNav,onLogout}) {
  const {cartCount,setCartOpen,cartBounce}=useCart();
  return (
    <>
      <header>
        <div className="hd">
          <span className="logo" onClick={()=>onNav("shop")}>Ecomm</span>
          <nav className="nav">
            <button className={`nb${page==="shop"||page==="product"?" on":""}`} onClick={()=>onNav("shop")}><span className="lbl">Shop</span></button>
            <button className={`nb${page==="orders"?" on":""}`} onClick={()=>onNav("orders")}><span className="lbl">Orders</span></button>
            <button className={`cbtn${cartCount>0?" has":""}${cartBounce?" bump":""}`} onClick={()=>setCartOpen(o=>!o)}>
              <ICart size={15}/><span className="lbl">Cart</span>
              {cartCount>0&&<span className="chip">{cartCount}</span>}
            </button>
            <div className="ddw" style={{marginLeft:4}}>
              <button className="av" onClick={()=>setShowMenu(!showMenu)} title={user.name}>{getInitials(user.name)}</button>
              {showMenu&&<div className="dd">
                <div className="dd-hd"><p>{user.name}</p><span>{user.email}</span></div>
                <button className="mi" onClick={()=>{onNav("profile");setShowMenu(false);}}><IUser/> Profile</button>
                <button className="mi red" onClick={onLogout}><IOut/> Sign out</button>
              </div>}
            </div>
          </nav>
        </div>
      </header>
      <nav className="bnav">
        <div className="bnav-inner">
          <button className={`bnav-btn${page==="shop"||page==="product"?" on":""}`} onClick={()=>onNav("shop")}><IHome/><span>Shop</span></button>
          <button className={`bnav-btn${page==="orders"?" on":""}`} onClick={()=>onNav("orders")}><IPkg/><span>Orders</span></button>
          <button className={`bnav-btn${cartBounce?" bump":""}`} onClick={()=>setCartOpen(o=>!o)}>
            {cartCount>0&&<span className="bnav-chip">{cartCount}</span>}
            <ICart size={20}/><span>Cart</span>
          </button>
          <button className={`bnav-btn${page==="profile"?" on":""}`} onClick={()=>onNav("profile")}><IUserCircle/><span>Account</span></button>
        </div>
      </nav>
    </>
  );
}

// ─── CartDrawer ───────────────────────────────────────────────────────────────
function CartDrawer({onCheckout}) {
  const {cart,cartCount,cartTotal,cartOpen,setCartOpen,removeItem,updateQty}=useCart();
  const tax=cartTotal*0.075;
  return (
    <>
      <div className={`ov${cartOpen?" open":""}`} onClick={()=>setCartOpen(false)}/>
      <div className={`dr${cartOpen?" open":""}`} role="dialog" aria-modal="true">
        <div className="dr-hd">
          <div className="dr-title">Cart{cartCount>0&&<span className="dr-ct">{cartCount} {cartCount===1?"item":"items"}</span>}</div>
          <button className="dr-x" onClick={()=>setCartOpen(false)}><IClose/></button>
        </div>
        <div className="dr-body">
          {cart.length===0
            ? <div className="dr-empty"><h3>Your cart is empty</h3><p>Add products to get started.</p><button className="btn btn-o btn-sm" onClick={()=>setCartOpen(false)}>Continue shopping</button></div>
            : cart.map(item=>(
              <div className="di" key={item.product_id}>
                <div className="di-img"><img src={item.image} alt={item.title} onError={e=>{e.target.style.display="none";}}/></div>
                <div className="di-info">
                  <div className="di-name">{item.title}</div>
                  <div className="di-price">${fmt(item.price)} each</div>
                  <div className="di-row">
                    <div className="qg">
                      <button className="qb" onClick={()=>updateQty(item.product_id,item.quantity-1)}>−</button>
                      <span className="qn">{item.quantity}</span>
                      <button className="qb" onClick={()=>updateQty(item.product_id,item.quantity+1)}>+</button>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span className="di-tot">${fmt(item.price*item.quantity)}</span>
                      <button className="rb" onClick={()=>removeItem(item.product_id)}><ITrash/></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        {cart.length>0&&<div className="dr-ft">
          <div className="dr-sub"><span>Subtotal</span><span>${fmt(cartTotal)}</span></div>
          <div className="dr-tax">+ ${fmt(tax)} est. tax · Free shipping</div>
          <button className="btn btn-p" onClick={onCheckout}>Checkout — ${fmt(cartTotal+tax)}</button>
        </div>}
      </div>
    </>
  );
}

// ─── AuthPage ─────────────────────────────────────────────────────────────────
function AuthPage({mode,setMode,onLogin,onRegister}) {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [name,setName]=useState("");
  const [conf,setConf]=useState(""); const [showP,setShowP]=useState(false); const [showC,setShowC]=useState(false);
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const str=mode==="register"?pwStrength(pw):null;
  const goLogin=()=>{ setErr(""); if(!email||!pw){setErr("Please fill in all fields.");return;} onLogin({email,password:pw,setError:setErr,setLoading}); };
  const goReg=()=>{ setErr(""); if(!name||!email||!pw||!conf){setErr("Please fill in all fields.");return;} if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setErr("Please enter a valid email.");return;} if(pw.length<6){setErr("Password must be at least 6 characters.");return;} if(pw!==conf){setErr("Passwords do not match.");return;} onRegister({name,email,password:pw,setError:setErr,setLoading}); };
  return (
    <div className="auth-pg">
      <div className="auth-card">
        <div className="auth-logo">Ecomm</div>
        <div className="auth-sub">{mode==="login"?"Welcome back — sign in to continue":"Create your account to get started"}</div>
        <div className="auth-tabs">
          <button className={`atab${mode==="login"?" on":""}`} onClick={()=>{setMode("login");setErr("");}}>Sign in</button>
          <button className={`atab${mode==="register"?" on":""}`} onClick={()=>{setMode("register");setErr("");}}>Register</button>
        </div>
        {err&&<div className="al err">{err}</div>}
        {mode==="login"?(
          <>
            <div className="field"><label>Email</label><input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&goLogin()}/></div>
            <div className="field"><label>Password</label><div className="pw-w"><input type={showP?"text":"password"} placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&goLogin()}/><button className="pw-t" onClick={()=>setShowP(!showP)}>{showP?"Hide":"Show"}</button></div></div>
            <button className="btn btn-p" disabled={loading} onClick={goLogin}>{loading?<><span className="sp"/> Signing in…</>:"Sign in"}</button>
          </>
        ):(
          <>
            <div className="field"><label>Full name</label><input type="text" placeholder="Alex Johnson" value={name} onChange={e=>setName(e.target.value)}/></div>
            <div className="field"><label>Email</label><input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div className="field"><label>Password</label>
              <div className="pw-w"><input type={showP?"text":"password"} placeholder="Min 6 characters" value={pw} onChange={e=>setPw(e.target.value)}/><button className="pw-t" onClick={()=>setShowP(!showP)}>{showP?"Hide":"Show"}</button></div>
              {str&&<div className="sr">{[1,2,3].map(i=><div key={i} className="ss" style={{background:i<=str.level?str.color:undefined}}/>)}<span className="sl" style={{color:str.color}}>{str.label}</span></div>}
            </div>
            <div className="field"><label>Confirm password</label><div className="pw-w"><input type={showC?"text":"password"} placeholder="Repeat password" value={conf} onChange={e=>setConf(e.target.value)} onKeyDown={e=>e.key==="Enter"&&goReg()}/><button className="pw-t" onClick={()=>setShowC(!showC)}>{showC?"Hide":"Show"}</button></div></div>
            <button className="btn btn-p" disabled={loading} onClick={goReg}>{loading?<><span className="sp"/> Creating account…</>:"Create account"}</button>
          </>
        )}
        <p style={{textAlign:"center",fontSize:13,color:mode==="login"?"#78716c":"var(--mut)",marginTop:"1rem"}}>
          {mode==="login"?<>No account? <a style={{cursor:"pointer",color:"var(--acc)",textDecoration:"underline"}} onClick={()=>{setMode("register");setErr("");}}>Create one</a></>:<>Have an account? <a style={{cursor:"pointer",color:"var(--acc)",textDecoration:"underline"}} onClick={()=>{setMode("login");setErr("");}}>Sign in</a></>}
        </p>
      </div>
    </div>
  );
}

// ─── ShopPage ─────────────────────────────────────────────────────────────────
function ShopPage({products,categories,activeCat,setActiveCat,reviews,aiMsg,aiLoading,onSelectProduct}) {
  const {cart,addItem,pendingIds}=useCart();
  const [inputVal,setInputVal]=useState("");
  const [committed,setCommitted]=useState("");
  const [panelOpen,setPanelOpen]=useState(false);
  const [focusIdx,setFocusIdx]=useState(-1);
  const [recentSearches,setRecentSearches]=useState(()=>LS.get(RECENT_KEY,[]));
  const debInput=useDebounce(inputVal,280);
  const inputRef=useRef(null); const panelRef=useRef(null);

  const suggestions=useMemo(()=>{ const q=debInput.trim().toLowerCase(); if(!q) return []; return products.filter(p=>p.title.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)).sort((a,b)=>{ const as=a.title.toLowerCase().startsWith(q),bs=b.title.toLowerCase().startsWith(q); return as&&!bs?-1:!as&&bs?1:0; }).slice(0,7); },[debInput,products]);

  useEffect(()=>{ const fn=e=>{if(!panelRef.current?.contains(e.target)&&!inputRef.current?.contains(e.target)){setPanelOpen(false);setFocusIdx(-1);}}; document.addEventListener("mousedown",fn); return()=>document.removeEventListener("mousedown",fn); },[]);
  useEffect(()=>{ const fn=e=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();inputRef.current?.focus();inputRef.current?.select();setPanelOpen(true);}}; window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn); },[]);

  const commitSearch=useCallback(term=>{ const t=term.trim(); setInputVal(t); setCommitted(t); setPanelOpen(false); setFocusIdx(-1); if(t){ const prev=LS.get(RECENT_KEY,[]).filter(x=>x.toLowerCase()!==t.toLowerCase()); const next=[t,...prev].slice(0,6); LS.set(RECENT_KEY,next); setRecentSearches(next); setActiveCat("All"); } },[setActiveCat]);
  const clearSearch=useCallback(()=>{ setInputVal(""); setCommitted(""); setPanelOpen(false); setFocusIdx(-1); inputRef.current?.focus(); },[]);

  const handleKD=e=>{ const items=panelOpen?(debInput?suggestions:recentSearches):[]; if(e.key==="ArrowDown"){e.preventDefault();setPanelOpen(true);setFocusIdx(i=>Math.min(i+1,items.length-1));} else if(e.key==="ArrowUp"){e.preventDefault();setFocusIdx(i=>Math.max(i-1,-1));} else if(e.key==="Enter"){e.preventDefault();if(focusIdx>=0&&items.length){const item=items[focusIdx];commitSearch(typeof item==="string"?item:item.title);}else commitSearch(inputVal);} else if(e.key==="Escape"){setPanelOpen(false);setFocusIdx(-1);} };

  const filtered=products.filter(p=>(!committed||p.title.toLowerCase().includes(committed.toLowerCase())||p.desc.toLowerCase().includes(committed.toLowerCase())||p.category.toLowerCase().includes(committed.toLowerCase()))&&(activeCat==="All"||p.category===activeCat));
  const featured=products.filter(p=>p.featured);
  const showPanel=panelOpen&&(debInput.trim()?suggestions.length>0:recentSearches.length>0);
  const showRecent=!debInput.trim()&&recentSearches.length>0;

  return (
    <div>
      <div className="hero">
        <p className="hero-ey">New arrivals · 2025</p>
        <h1 className="hero-h">Curated for <em>you</em></h1>
        <p className="hero-p">Exceptional products, handpicked for quality and style.</p>
        <div className="sw" ref={panelRef}>
          <div className="sw-row">
            <svg className="sw-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input ref={inputRef} type="text" className="sw-input" placeholder="Search products… (⌘K)" value={inputVal} autoComplete="off"
              onChange={e=>{setInputVal(e.target.value);setPanelOpen(true);setFocusIdx(-1);}}
              onFocus={()=>setPanelOpen(true)} onKeyDown={handleKD}/>
            <div className="sw-actions">
              {inputVal?<button className="sw-clear" onClick={clearSearch}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>:<span className="sw-kbd">⌘K</span>}
            </div>
          </div>
          {showPanel&&<div className="sw-panel">
            {showRecent&&<>
              <div className="sw-sec-hd"><span>Recent searches</span><button style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--inf)",fontFamily:"var(--fb)"}} onClick={()=>{LS.del(RECENT_KEY);setRecentSearches([]);setPanelOpen(false);}}>Clear</button></div>
              {recentSearches.map((term,i)=><div key={term} className={`sw-row-item${focusIdx===i?" foc":""}`} onMouseEnter={()=>setFocusIdx(i)} onMouseDown={e=>{e.preventDefault();commitSearch(term);}}>
                <div className="sw-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.84"/></svg></div>
                <div className="sw-body"><div className="sw-name">{term}</div><div className="sw-sub">Recent</div></div>
              </div>)}
            </>}
            {!showRecent&&suggestions.length>0&&<>
              <div className="sw-sec-hd"><span>{suggestions.length} result{suggestions.length!==1?"s":""} for "{debInput}"</span></div>
              {suggestions.map((p,i)=><div key={p.id} className={`sw-row-item${focusIdx===i?" foc":""}`} onMouseEnter={()=>setFocusIdx(i)} onMouseDown={e=>{e.preventDefault();commitSearch(p.title);}}>
                <div className="sw-img"><img src={p.image} alt={p.title} onError={e=>{e.target.style.display="none";}}/></div>
                <div className="sw-body"><div className="sw-name"><Highlight text={p.title} query={debInput}/></div><div className="sw-sub">{p.category}</div></div>
                <div className="sw-prc">${fmt(p.price)}</div>
              </div>)}
              <div className="sw-ft"><span>↑↓ navigate · ↵ select</span><button style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"var(--acc)",fontFamily:"var(--fb)"}} onMouseDown={e=>{e.preventDefault();commitSearch(debInput);}}>See all →</button></div>
            </>}
            {!showRecent&&debInput.trim()&&suggestions.length===0&&<div className="sw-empty">No products match "{debInput}"</div>}
          </div>}
        </div>
      </div>
      {(aiLoading||aiMsg)&&<div className="ai-strip"><div className="ai-dot">AI</div><div className="ai-bd">{aiLoading?<div className="typing"><span/><span/><span/></div>:aiMsg}</div></div>}
      {committed&&<div className="sw-banner"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--mut)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><span>Results for <strong>"{committed}"</strong> — {filtered.length} product{filtered.length!==1?"s":""}</span><button className="sw-banner-clear" onClick={clearSearch}>Clear</button></div>}
      <div className="fb"><span className="fl">Category</span>{categories.map(c=><button key={c} className={`fc${c===activeCat?" on":""}`} onClick={()=>setActiveCat(c)}>{c}</button>)}</div>
      {!committed&&activeCat==="All"&&<><div className="sh"><h2>Featured</h2></div><div className="pg">{featured.map(p=><ProductCard key={p.id} product={p} cartQty={cart.find(i=>i.product_id===p.id)?.quantity||0} pending={pendingIds.includes(p.id)} onAdd={addItem} reviews={reviews[p.id]||[]} onSelect={onSelectProduct}/>)}</div></>}
      <div className="sh"><h2>{committed?"Search results":activeCat==="All"?"All products":activeCat}</h2><span>{filtered.length} {filtered.length===1?"product":"products"}</span></div>
      {filtered.length===0
        ? <div className="empty"><div className="ei"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><h2>Nothing found</h2><p>{committed?`No products match "${committed}".`:"Try a different category."}</p>{committed&&<button className="btn btn-o btn-sm" onClick={clearSearch}>Clear search</button>}</div>
        : <div className="pg">{filtered.map(p=><ProductCard key={p.id} product={p} cartQty={cart.find(i=>i.product_id===p.id)?.quantity||0} pending={pendingIds.includes(p.id)} onAdd={addItem} reviews={reviews[p.id]||[]} onSelect={onSelectProduct}/>)}</div>}
    </div>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({product,cartQty,pending,onAdd,reviews=[],onSelect}) {
  const {updateQty,setCartOpen}=useCart();
  const [imgErr,setImgErr]=useState(false);
  const inCart=cartQty>0;
  const avg=avgRating(reviews); const cnt=reviews.length;
  return (
    <div className={`pc${!product.in_stock?" out":""}`}>
      <div className="pc-img" onClick={()=>onSelect&&onSelect(product)}>
        {!imgErr?<img src={product.image} alt={product.title} onError={()=>setImgErr(true)} loading="lazy"/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#1e293b",fontSize:40}}>🛍️</div>}
        <span className="cat-pill">{product.category}</span>
        {product.featured&&<span className="feat-pill">Featured</span>}
        {inCart&&<span className="ic-badge" onClick={e=>{e.stopPropagation();setCartOpen(true);}}><ICart size={11}/> {cartQty}</span>}
        {!product.in_stock&&<div className="out-ov"><span className="out-lb">Out of stock</span></div>}
      </div>
      <div className="pc-body">
        <div className="pc-name" onClick={()=>onSelect&&onSelect(product)}>{product.title}</div>
        {cnt>0?<div className="pc-stars"><StarDisplay rating={Math.round(avg)} size={13}/><span>{avg.toFixed(1)} ({cnt})</span></div>:<div className="pc-no-rev">No reviews yet</div>}
        <div className="pc-desc">{product.desc}</div>
        <div className="pc-ft">
          <span className="pc-price">${fmt(product.price)}</span>
          {inCart?<div className="qg"><button className="qb" onClick={()=>updateQty(product.id,cartQty-1)}>−</button><span className="qn">{cartQty}</span><button className="qb" onClick={()=>updateQty(product.id,cartQty+1)}>+</button></div>
          :<button className="add-btn" disabled={!product.in_stock||pending} onClick={()=>onAdd(product)}>{pending?<><span className="sp"/> Adding…</>:<>+ Add</>}</button>}
        </div>
      </div>
    </div>
  );
}

// ─── ReviewModal ──────────────────────────────────────────────────────────────
function ReviewModal({product,existingReview,onSubmit,onClose}) {
  const [rating,setRating]=useState(existingReview?.rating||0);
  const [title,setTitle]=useState(existingReview?.title||"");
  const [body,setBody]=useState(existingReview?.body||"");
  const [err,setErr]=useState("");
  const LABELS=["","Poor","Fair","Good","Very good","Excellent"];
  const submit=()=>{ if(!rating){setErr("Please select a star rating.");return;} if(!title.trim()){setErr("Please add a title.");return;} if(!body.trim()){setErr("Please write your review.");return;} onSubmit(product.id,{rating,title:title.trim(),body:body.trim()}); onClose(); };
  return (
    <div className="rv-modal-ov" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="rv-modal">
        <h2>{existingReview?"Edit your review":"Write a review"}</h2>
        <div className="rv-modal-sub">{product.title}</div>
        <div className="field"><label>Your rating</label>
          <div className="rv-star-pick">
            {[1,2,3,4,5].map(i=><svg key={i} viewBox="0 0 24 24" fill={i<=rating?"#f59e0b":"none"} stroke={i<=rating?"#f59e0b":"#a8a29e"} strokeWidth="1.5" onClick={()=>setRating(i)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}
            {rating>0&&<span style={{fontSize:13,color:"var(--mut)",alignSelf:"center",marginLeft:4}}>{LABELS[rating]}</span>}
          </div>
        </div>
        <div className="field"><label>Review title</label><input type="text" placeholder="Summarise your experience" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/></div>
        <div className="field"><label>Your review</label><textarea placeholder="What did you like or dislike?" value={body} onChange={e=>setBody(e.target.value)} maxLength={600} style={{minHeight:90,resize:"vertical"}}/><div style={{fontSize:11,color:"var(--sub)",textAlign:"right",marginTop:2}}>{body.length}/600</div></div>
        {err&&<div className="al err" style={{padding:"8px 12px",marginBottom:10}}>{err}</div>}
        <div className="rv-modal-btns">
          <button className="btn btn-o btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p" style={{flex:1}} onClick={submit}>{existingReview?"Update":"Submit review"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ProductPage ──────────────────────────────────────────────────────────────
function ProductPage({product,reviews,currentUser,orders,onSubmitReview,onDeleteReview,onBack,onAddToCart,cart,pendingIds}) {
  const {updateQty,setCartOpen}=useCart();
  const [showModal,setShowModal]=useState(false);
  const [imgErr,setImgErr]=useState(false);
  const [sortBy,setSortBy]=useState("newest");
  const cartItem=cart.find(i=>i.product_id===product.id);
  const cartQty=cartItem?.quantity||0; const inCart=cartQty>0; const pending=pendingIds.includes(product.id);
  const myReview=reviews.find(r=>r.userId===currentUser?.id);
  const avg=avgRating(reviews); const cnt=reviews.length;
  const breakdown=[5,4,3,2,1].map(star=>({star,count:reviews.filter(r=>r.rating===star).length,pct:cnt?Math.round(reviews.filter(r=>r.rating===star).length/cnt*100):0}));
  const sorted=[...reviews].sort((a,b)=>sortBy==="newest"?new Date(b.date)-new Date(a.date):sortBy==="highest"?b.rating-a.rating:a.rating-b.rating);
  return (
    <div style={{maxWidth:860,margin:"0 auto"}}>
      <button className="bk" onClick={onBack}>← Back to shop</button>
      <div className="prod-hero" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28,marginBottom:"2.5rem"}}>
        <div style={{borderRadius:"var(--rl)",overflow:"hidden",aspectRatio:1,background:"#1e293b",position:"relative"}}>
          {!imgErr?<img src={product.image} alt={product.title} onError={()=>setImgErr(true)} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:64}}>🛍️</div>}
          {!product.in_stock&&<div className="out-ov"><span className="out-lb">Out of stock</span></div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",justifyContent:"center",gap:12}}>
          <span style={{fontSize:11,textTransform:"uppercase",letterSpacing:".08em",color:"var(--mut)",fontWeight:500}}>{product.category}</span>
          <h1 style={{fontFamily:"var(--fd)",fontSize:"clamp(22px,3vw,32px)",lineHeight:1.15}}>{product.title}</h1>
          {cnt>0?<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:"var(--fd)",fontSize:18}}>{avg.toFixed(1)}</span><StarDisplay rating={Math.round(avg)} size={18}/><span style={{fontSize:13,color:"var(--mut)"}}>({cnt} {cnt===1?"review":"reviews"})</span></div>:<div style={{fontSize:13,color:"var(--sub)"}}>No reviews yet — be the first!</div>}
          <p style={{fontSize:15,color:"var(--mut)",lineHeight:1.7}}>{product.desc}</p>
          <div style={{fontFamily:"var(--fd)",fontSize:28}}>${fmt(product.price)}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {inCart?<div className="qg" style={{transform:"scale(1.08)",transformOrigin:"left"}}><button className="qb" onClick={()=>updateQty(product.id,cartQty-1)}>−</button><span className="qn">{cartQty}</span><button className="qb" onClick={()=>updateQty(product.id,cartQty+1)}>+</button></div>
            :<button className="btn btn-p" disabled={!product.in_stock||pending} style={{flex:1,maxWidth:220}} onClick={()=>onAddToCart(product)}>{pending?<><span className="sp"/> Adding…</>:<><ICart size={15}/> Add to cart</>}</button>}
            {inCart&&<button className="btn btn-o btn-sm" onClick={()=>setCartOpen(true)}>View cart</button>}
          </div>
          <button className="btn btn-o btn-sm" style={{alignSelf:"flex-start",display:"flex",alignItems:"center",gap:6}} onClick={()=>setShowModal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            {myReview?"Edit your review":"Write a review"}
          </button>
        </div>
      </div>
      <div style={{borderTop:"1px solid var(--bdr)",paddingTop:"2rem"}}>
        <h2 style={{fontFamily:"var(--fd)",fontSize:22,marginBottom:"1.25rem"}}>Customer reviews{cnt>0&&<span style={{fontFamily:"var(--fb)",fontSize:14,fontWeight:400,color:"var(--mut)",marginLeft:6}}>({cnt})</span>}</h2>
        {cnt>0&&<div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:24,marginBottom:"1.75rem",alignItems:"start"}}>
          <div style={{textAlign:"center",minWidth:90}}><div style={{fontFamily:"var(--fd)",fontSize:52,lineHeight:1}}>{avg.toFixed(1)}</div><StarDisplay rating={Math.round(avg)} size={18}/><div style={{fontSize:12,color:"var(--mut)",marginTop:4}}>{cnt} {cnt===1?"review":"reviews"}</div></div>
          <div style={{paddingTop:6}}>{breakdown.map(b=><div className="rv-bar-row" key={b.star}><span style={{minWidth:10}}>{b.star}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><div className="rv-bar-track"><div className="rv-bar-fill" style={{width:b.pct+"%"}}/></div><span style={{minWidth:24,textAlign:"right"}}>{b.count}</span></div>)}</div>
        </div>}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:"1rem",flexWrap:"wrap"}}>
          {cnt>0&&<select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:"7px 12px",border:"1px solid var(--bdr)",borderRadius:"var(--r)",background:"var(--surf)",fontSize:13,fontFamily:"var(--fb)",color:"var(--txt)",outline:"none"}}><option value="newest">Newest first</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select>}
          <button className="btn btn-p btn-sm" onClick={()=>setShowModal(true)} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{myReview?"Edit review":"Write a review"}</button>
        </div>
        {sorted.length===0?<div className="empty" style={{padding:"2.5rem 0"}}><div className="ei"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><h2>No reviews yet</h2><p>Be the first to share your thoughts.</p><button className="btn btn-o btn-sm" onClick={()=>setShowModal(true)}>Write a review</button></div>
        :<div style={{display:"flex",flexDirection:"column",gap:14}}>
          {sorted.map(rv=><div className={`rv-item${rv.userId===currentUser?.id?" mine":""}`} key={rv.id}>
            <div className="rv-item-hd">
              <div style={{display:"flex",alignItems:"center",gap:10}}><div className="rv-av">{getInitials(rv.userName)}</div><div><div className="rv-name">{rv.userName}{rv.userId===currentUser?.id&&<span style={{fontSize:11,color:"var(--acc)",marginLeft:6,fontWeight:400}}>(you)</span>}</div><div className="rv-date">{fmtDate(rv.date)}</div></div></div>
              <StarDisplay rating={rv.rating} size={14}/>
            </div>
            {rv.title&&<div className="rv-title">{rv.title}</div>}
            <div className="rv-body">{rv.body}</div>
            {rv.verified&&<div className="rv-verified"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Verified purchase</div>}
            {rv.userId===currentUser?.id&&<div style={{display:"flex",gap:8,marginTop:10}}><button className="btn btn-g btn-sm" onClick={()=>setShowModal(true)}>Edit</button><button className="btn btn-d btn-sm" onClick={()=>onDeleteReview(product.id)}>Delete</button></div>}
          </div>)}
        </div>}
      </div>
      {showModal&&<ReviewModal product={product} existingReview={myReview} onSubmit={onSubmitReview} onClose={()=>setShowModal(false)}/>}
    </div>
  );
}

// ─── Luhn & card helpers ──────────────────────────────────────────────────────
function luhn(num){const d=num.replace(/\D/g,"");let s=0,a=false;for(let i=d.length-1;i>=0;i--){let n=parseInt(d[i],10);if(a){n*=2;if(n>9)n-=9;}s+=n;a=!a;}return s%10===0;}
function detectBrand(num){const d=num.replace(/\D/g,"");if(/^4/.test(d))return"visa";if(/^5[1-5]/.test(d)||/^2[2-7]/.test(d))return"mc";if(/^3[47]/.test(d))return"amex";if(/^6(?:011|5)/.test(d))return"discover";return"default";}
const TEST_CARDS=[{num:"4242 4242 4242 4242",label:"Visa",outcome:"success"},{num:"4000 0000 0000 0002",label:"Visa",outcome:"decline"},{num:"5555 5555 5555 4444",label:"Mastercard",outcome:"success"},{num:"4000 0025 0000 3155",label:"Visa 3DS",outcome:"auth"},{num:"3782 8224 6310 005",label:"Amex",outcome:"success"}];
function getOutcome(num){const d=num.replace(/\D/g,"");if(d.startsWith("4000000000000002"))return"decline";if(d.startsWith("4000002500003155"))return"auth";return"success";}

function CardPreview({num,name,exp,brand}){
  const groups=(num.replace(/\D/g,"").padEnd(16,"•")).match(/.{1,4}/g)||[];
  const BrandLogo=()=>{if(brand==="visa")return<span style={{fontSize:15,fontWeight:700,fontStyle:"italic"}}>VISA</span>;if(brand==="mc")return<div className="mc-c"><div className="mc-c1"/><div className="mc-c2"/></div>;if(brand==="amex")return<span style={{fontSize:12,fontWeight:700}}>AMEX</span>;if(brand==="discover")return<span style={{fontSize:11,fontWeight:700}}>DISCOVER</span>;return null;};
  return(
    <div className={`stripe-preview brand-${brand}`}>
      <div className="scp-top"><div className="scp-chip"/><div style={{color:"#fff"}}><BrandLogo/></div></div>
      <div className="scp-num">{groups.join(" ")}</div>
      <div className="scp-bot">
        <div><div className="scp-lbl">Card holder</div><div className="scp-val" style={{maxWidth:160,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{name.trim().toUpperCase()||"YOUR NAME"}</div></div>
        <div><div className="scp-lbl">Expires</div><div className="scp-val">{exp||"MM/YY"}</div></div>
      </div>
    </div>
  );
}

// ─── CheckoutPage ─────────────────────────────────────────────────────────────
function CheckoutPage({cart,total,currentUser,onPlace,onBack}){
  const tax=parseFloat((total*0.075).toFixed(2)); const grand=total+tax;
  const [step,setStep]=useState(0);
  const [payState,setPayState]=useState("idle");
  const [decMsg,setDecMsg]=useState("");
  const [ship,setShip]=useState({name:currentUser?.name||"",address:currentUser?.lastShipping?.address||"",city:currentUser?.lastShipping?.city||"",zip:currentUser?.lastShipping?.zip||"",country:currentUser?.lastShipping?.country||"Nigeria"});
  const [pay,setPay]=useState({num:"",exp:"",cvc:"",name:""});
  const [touched,setTouched]=useState({});
  const [err,setErr]=useState("");
  const [showTC,setShowTC]=useState(false);
  const [loading,setLoading]=useState(false);
  const brand=detectBrand(pay.num); const rawNum=pay.num.replace(/\D/g,""); const last4=rawNum.slice(-4)||"••••"; const maxLen=brand==="amex"?17:19; const cvcLen=brand==="amex"?4:3;
  const v={num:rawNum.length>=(brand==="amex"?15:16)&&luhn(rawNum),exp:/^\d{2}\/\d{2}$/.test(pay.exp)&&(()=>{const[m,y]=pay.exp.split("/").map(Number);const now=new Date();const ey=2000+y;return m>=1&&m<=12&&(ey>now.getFullYear()||(ey===now.getFullYear()&&m>=now.getMonth()+1));})(),cvc:pay.cvc.replace(/\D/g,"").length===cvcLen,name:pay.name.trim().length>=2};
  const fmtNum=raw=>{const d=raw.replace(/\D/g,"").slice(0,brand==="amex"?15:16);return brand==="amex"?d.replace(/^(\d{4})(\d{0,6})(\d{0,5})/,"$1 $2 $3").trim():d.replace(/(.{4})/g,"$1 ").trim();};
  const fmtExp=raw=>{const d=raw.replace(/\D/g,"").slice(0,4);return d.length>2?d.slice(0,2)+"/"+d.slice(2):d;};
  const touch=f=>setTouched(t=>({...t,[f]:true}));
  const valShip=()=>{if(!ship.name.trim()||!ship.address.trim()||!ship.city.trim()||!ship.zip.trim()){setErr("Please fill in all shipping fields.");return false;}setErr("");return true;};
  const valPay=()=>{setTouched({num:true,exp:true,cvc:true,name:true});if(!v.num){setErr("Please enter a valid card number.");return false;}if(!v.exp){setErr("Card expiry is invalid or in the past.");return false;}if(!v.cvc){setErr(`CVV must be ${cvcLen} digits.`);return false;}if(!v.name){setErr("Please enter the name on card.");return false;}setErr("");return true;};
  const nextStep=()=>{if(step===0&&!valShip())return;if(step===1&&!valPay())return;setStep(s=>s+1);};
  const submit=async()=>{setPayState("processing");await new Promise(r=>setTimeout(r,2000));const outcome=getOutcome(pay.num);if(outcome==="decline"){setPayState("declined");setDecMsg("Your card was declined. Please try a different card.");return;}if(outcome==="auth")await new Promise(r=>setTimeout(r,1000));setPayState("idle");onPlace({...ship,last4,brand,cardName:pay.name},setLoading);};
  const fillTC=tc=>{setPay(p=>({...p,num:tc.num,exp:"12/28",cvc:brand==="amex"?"1234":"123",name:p.name||currentUser?.name||"Test User"}));setShowTC(false);setTouched({});};
  const STEPS=["Shipping","Payment","Review"];
  const Sidebar=()=>(<div className="ck-side"><div className="fs"><h2>Order summary</h2>{cart.map(item=>(<div className="os-item" key={item.product_id}><div className="os-img"><img src={item.image} alt={item.title} onError={e=>{e.target.style.display="none";}} style={{width:"100%",height:"100%",objectFit:"cover"}}/><span className="os-qb">{item.quantity}</span></div><div className="os-name">{item.title}</div><div className="os-price">${fmt(item.price*item.quantity)}</div></div>))}<div style={{marginTop:12}}><div className="os-row"><span>Subtotal</span><span>${fmt(total)}</span></div><div className="os-row"><span>Shipping</span><span style={{color:"var(--ok)"}}>Free</span></div><div className="os-row"><span>Tax (7.5%)</span><span>${fmt(tax)}</span></div><div className="os-total"><span>Total</span><span>${fmt(grand)}</span></div></div></div></div>);
  if(payState==="processing")return(<div className="ck-wrap"><div className="fs" style={{maxWidth:460,margin:"4rem auto"}}><div className="pay-proc"><div className="pay-proc-ring"/><div style={{fontSize:15,fontWeight:500,marginBottom:4}}>Processing payment…</div><div style={{fontSize:13,color:"var(--mut)"}}>Please don't close this window</div></div></div></div>);
  if(payState==="declined")return(<div className="ck-wrap"><div className="fs" style={{maxWidth:460,margin:"4rem auto"}}><div className="pay-dec"><div className="pay-dec-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><h3 style={{fontSize:16,fontWeight:500,marginBottom:6,color:"#991b1b"}}>Payment declined</h3><p style={{fontSize:13.5,color:"var(--mut)",marginBottom:"1.25rem"}}>{decMsg}</p><button className="btn btn-p" style={{maxWidth:240}} onClick={()=>{setPayState("idle");setStep(1);setTouched({});}}>Try a different card</button><button className="btn btn-g btn-sm" style={{marginTop:8}} onClick={onBack}>Back to shop</button></div></div></div>);
  return(
    <div className="ck-wrap">
      <button className="bk" onClick={step===0?onBack:()=>setStep(s=>s-1)}>← {step===0?"Back to shop":"Back"}</button>
      <h1 className="pg-title">Checkout</h1>
      <div className="ck-steps">{STEPS.map((s,i)=>(<div key={s} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-1?1:"unset"}}><div className={`ck-step${i<step?" done":i===step?" act":""}`}><div className="ck-dot">{i<step?"✓":i+1}</div><span className="ck-lbl">{s}</span></div>{i<STEPS.length-1&&<div className="ck-line"/>}</div>))}</div>
      {err&&<div className="al err" style={{maxWidth:460}}>{err}</div>}
      <div className="ck-grid">
        <div>
          {step===0&&<div className="fs"><h2><IShip/> Shipping address</h2>
            <div className="field"><label>Full name</label><input type="text" placeholder="Alex Johnson" value={ship.name} onChange={e=>setShip(p=>({...p,name:e.target.value}))}/></div>
            <div className="field"><label>Street address</label><input type="text" placeholder="123 Main Street" value={ship.address} onChange={e=>setShip(p=>({...p,address:e.target.value}))}/></div>
            <div className="f2"><div className="field"><label>City</label><input type="text" placeholder="Lagos" value={ship.city} onChange={e=>setShip(p=>({...p,city:e.target.value}))}/></div><div className="field"><label>ZIP / Postal</label><input type="text" placeholder="100001" value={ship.zip} onChange={e=>setShip(p=>({...p,zip:e.target.value}))}/></div></div>
            <div className="field"><label>Country</label><select value={ship.country} onChange={e=>setShip(p=>({...p,country:e.target.value}))}>{["Nigeria","Ghana","Kenya","South Africa","United States","United Kingdom","Canada","Australia","Germany","France"].map(c=><option key={c}>{c}</option>)}</select></div>
            <button className="btn btn-p" onClick={nextStep} style={{marginTop:4}}>Continue to payment →</button>
          </div>}
          {step===1&&<div>
            <div className="stripe-badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Secured by Stripe</span></div>
            <CardPreview num={pay.num} name={pay.name} exp={pay.exp} brand={brand}/>
            <div className="test-cards"><div className="test-cards-hd"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>Test mode<button style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--acc)",fontFamily:"var(--fb)"}} onClick={()=>setShowTC(s=>!s)}>{showTC?"Hide":"Show"} test cards</button></div>
              {showTC&&TEST_CARDS.map(tc=><div className="tc-row" key={tc.num} onClick={()=>fillTC(tc)}><div><span className="tc-num">{tc.num}</span><span style={{fontSize:11,color:"var(--mut)",marginLeft:8}}>{tc.label}</span></div><span className={`tc-out ${tc.outcome==="success"?"tco-s":tc.outcome==="decline"?"tco-d":"tco-a"}`}>{tc.outcome==="success"?"✓ Succeeds":tc.outcome==="decline"?"✗ Declines":"3D Secure"}</span></div>)}
            </div>
            <div className="fs" style={{padding:"18px 18px 14px"}}><h2><ICard/> Card details</h2>
              <div className="stripe-f"><label>Card number</label><div className="stripe-inp-w"><input className={`stripe-inp${touched.num&&!v.num?" s-err":touched.num&&v.num?" s-ok":""}`} type="text" inputMode="numeric" placeholder="1234 1234 1234 1234" maxLength={maxLen} value={pay.num} onChange={e=>setPay(p=>({...p,num:fmtNum(e.target.value)}))} onBlur={()=>touch("num")}/><span className="stripe-inp-ico"><span style={{fontSize:10,fontWeight:700,color:"var(--mut)"}}>{brand!=="default"?brand.toUpperCase().slice(0,4):"CARD"}</span></span></div>{touched.num&&!v.num&&rawNum.length>0&&<div className="s-err-msg">Invalid card number</div>}</div>
              <div className="stripe-f"><label>Name on card</label><input className={`stripe-inp${touched.name&&!v.name?" s-err":touched.name&&v.name?" s-ok":""}`} type="text" placeholder="Alex Johnson" value={pay.name} onChange={e=>setPay(p=>({...p,name:e.target.value}))} onBlur={()=>touch("name")}/></div>
              <div className="f2">
                <div className="stripe-f"><label>Expiry</label><input className={`stripe-inp${touched.exp&&!v.exp?" s-err":touched.exp&&v.exp?" s-ok":""}`} type="text" inputMode="numeric" placeholder="MM/YY" maxLength={5} value={pay.exp} onChange={e=>setPay(p=>({...p,exp:fmtExp(e.target.value)}))} onBlur={()=>touch("exp")}/>{touched.exp&&!v.exp&&pay.exp.length>0&&<div className="s-err-msg">Invalid or expired</div>}</div>
                <div className="stripe-f"><label>CVV{brand==="amex"?" (4 digits)":""}</label><input className={`stripe-inp${touched.cvc&&!v.cvc?" s-err":touched.cvc&&v.cvc?" s-ok":""}`} type="text" inputMode="numeric" placeholder={brand==="amex"?"1234":"123"} maxLength={cvcLen} value={pay.cvc} onChange={e=>setPay(p=>({...p,cvc:e.target.value.replace(/\D/g,"").slice(0,cvcLen)}))} onBlur={()=>touch("cvc")}/></div>
              </div>
              <p style={{fontSize:12,color:"var(--mut)",display:"flex",alignItems:"center",gap:5,marginTop:4}}><ILock size={11}/> Encrypted and secure. Demo only — no real charges.</p>
            </div>
            <button className="btn btn-p" onClick={nextStep}>Continue to review →</button>
          </div>}
          {step===2&&<div>
            <div className="fs"><h2><IShip/> Shipping to</h2><p style={{fontSize:14,lineHeight:1.8,color:"var(--mut)"}}>{ship.name}<br/>{ship.address}<br/>{ship.city}, {ship.zip}<br/>{ship.country}</p><button className="btn btn-g btn-sm" style={{marginTop:10}} onClick={()=>setStep(0)}>Edit</button></div>
            <div className="fs"><h2><ICard/> Payment</h2><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:26,background:"var(--acc)",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:9,fontWeight:700}}>{brand.toUpperCase().slice(0,4)}</div><div><div style={{fontSize:14,fontWeight:500}}>{brand==="mc"?"Mastercard":brand==="amex"?"Amex":brand==="discover"?"Discover":"Visa"} ···· {last4}</div><div style={{fontSize:12,color:"var(--mut)"}}>Expires {pay.exp}</div></div></div><button className="btn btn-g btn-sm" style={{marginTop:10}} onClick={()=>setStep(1)}>Edit</button></div>
            <div className="fs"><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:6,color:"var(--mut)"}}><span>Subtotal</span><span>${fmt(total)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:6,color:"var(--mut)"}}><span>Shipping</span><span style={{color:"var(--ok)"}}>Free</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:10,color:"var(--mut)"}}><span>Tax</span><span>${fmt(tax)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:19,fontWeight:500,borderTop:"1px solid var(--bdr)",paddingTop:12,fontFamily:"var(--fd)"}}><span>Total</span><span>${fmt(grand)}</span></div></div>
            <button className="btn btn-p" disabled={loading} onClick={submit}>{loading?<><span className="sp"/> Placing order…</>:<><ILock size={13}/> Pay ${fmt(grand)}</>}</button>
            <p style={{fontSize:12,color:"var(--mut)",marginTop:10,textAlign:"center"}}>By placing your order you agree to our Terms of Service.</p>
          </div>}
        </div>
        <Sidebar/>
      </div>
    </div>
  );
}

// ─── SuccessPage ──────────────────────────────────────────────────────────────
function SuccessPage({order,onNav}){
  if(!order) return null;
  return(
    <div className="ok-wrap">
      <div className="ok-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
      <h1>Order confirmed!</h1>
      <p className="ok-msg">{order.confirmation}</p>
      <p className="ok-id">{order.id} · {fmtDate(order.date)}</p>
      <div className="ok-card"><h3>Items ordered</h3>{order.items.map((item,i)=><div className="ok-detail" key={i}><span style={{color:"var(--mut)"}}>{item.title} <strong style={{color:"var(--txt)"}}>×{item.quantity}</strong></span><span>${fmt(item.price*item.quantity)}</span></div>)}</div>
      <div className="ok-card"><h3>Summary</h3><div className="ok-detail"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div><div className="ok-detail"><span>Shipping</span><span style={{color:"var(--ok)"}}>Free</span></div><div className="ok-detail"><span>Tax</span><span>${fmt(order.tax)}</span></div><div className="ok-detail" style={{fontWeight:500,fontSize:16}}><span>Total</span><span style={{fontFamily:"var(--fd)"}}>${fmt(order.total)}</span></div></div>
      <div className="ok-card"><h3>Shipped to</h3><p style={{fontSize:14,lineHeight:1.7,color:"var(--mut)"}}>{order.shipping.name} · {order.shipping.address}, {order.shipping.city} {order.shipping.zip}, {order.shipping.country}</p></div>
      <div className="btn-row" style={{justifyContent:"center"}}><button className="btn btn-o" onClick={()=>onNav("orders")}>View orders</button><button className="btn btn-o" onClick={()=>onNav("shop")}>Keep shopping</button></div>
    </div>
  );
}

// ─── OrdersPage ───────────────────────────────────────────────────────────────
function OrdersPage({orders,onNav,onReorder}){
  const [expanded,setExpanded]=useState(null);
  const [search,setSearch]=useState("");
  const [statusFilter,setStatus]=useState("all");
  const [sort,setSort]=useState("newest");
  const totalSpend=orders.reduce((s,o)=>s+o.total,0);
  const totalItems=orders.reduce((s,o)=>s+o.items.reduce((x,i)=>x+i.quantity,0),0);
  const avgOrder=orders.length?totalSpend/orders.length:0;
  const visible=orders.filter(o=>{ const ms=!search||o.id.toLowerCase().includes(search.toLowerCase())||o.items.some(i=>i.title.toLowerCase().includes(search.toLowerCase())); const ms2=statusFilter==="all"||o.status===statusFilter; return ms&&ms2; }).sort((a,b)=>sort==="newest"?new Date(b.date)-new Date(a.date):sort==="oldest"?new Date(a.date)-new Date(b.date):sort==="highest"?b.total-a.total:a.total-b.total);
  if(orders.length===0)return(<div className="empty"><div className="ei"><IPkg/></div><h2>No orders yet</h2><p>Start shopping to see your order history here.</p><button className="btn btn-o" onClick={()=>onNav("shop")}>Start shopping</button></div>);
  return(
    <div className="oh-wrap">
      <h1 className="pg-title">Order history</h1>
      <div className="oh-stats"><div className="oh-stat"><div className="oh-stat-l">Orders</div><div className="oh-stat-v">{orders.length}</div></div><div className="oh-stat"><div className="oh-stat-l">Total spent</div><div className="oh-stat-v">${fmt(totalSpend)}</div></div><div className="oh-stat"><div className="oh-stat-l">Items ordered</div><div className="oh-stat-v">{totalItems}</div></div><div className="oh-stat"><div className="oh-stat-l">Avg order</div><div className="oh-stat-v">${fmt(avgOrder)}</div></div></div>
      <div className="oh-filters">
        <div className="oh-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input type="text" placeholder="Search orders…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="oh-sort" value={statusFilter} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="confirmed">Confirmed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select>
        <select className="oh-sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest value</option><option value="lowest">Lowest value</option></select>
      </div>
      {visible.length===0&&<div className="oh-none"><p style={{color:"var(--mut)",fontSize:14}}>No orders match your search.</p><button className="btn btn-g btn-sm" style={{marginTop:8}} onClick={()=>{setSearch("");setStatus("all");}}>Clear filters</button></div>}
      {visible.map(order=>{
        const isOpen=expanded===order.id; const cnt=order.items.reduce((s,i)=>s+i.quantity,0); const extra=order.items.length-5;
        const tlSteps=[{label:"Order placed",date:order.date,done:true,act:false},{label:"Confirmed",date:order.date,done:true,act:order.status==="confirmed"},{label:"Shipped",date:null,done:["shipped","delivered"].includes(order.status),act:order.status==="shipped"},{label:"Delivered",date:null,done:order.status==="delivered",act:order.status==="delivered"}];
        return(<div key={order.id} className="ord-card" onClick={()=>setExpanded(isOpen?null:order.id)}>
          <div className="ord-hd"><div><div className="ord-id">{order.id}</div><div className="ord-date">{fmtDateFull(order.date)}</div></div>
            <div className="ord-hd-r"><span className={`s-pill s-${order.status}`}>{order.status.charAt(0).toUpperCase()+order.status.slice(1)}</span><span className="ord-tot">${fmt(order.total)}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mut)" strokeWidth="2" style={{transform:isOpen?"rotate(180deg)":"rotate(0)",transition:"transform .2s",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg></div>
          </div>
          <div className="ord-thumbs" onClick={e=>e.stopPropagation()}>
            {order.items.slice(0,5).map((item,i)=><div className="ord-thumb" key={i} title={item.title}><img src={item.image} alt={item.title} onError={e=>{e.target.style.display="none";}}/>{item.quantity>1&&<span className="ord-thumb-ct">×{item.quantity}</span>}</div>)}
            {extra>0&&<div className="ord-more">+{extra}</div>}
            <span style={{marginLeft:"auto",fontSize:12.5,color:"var(--mut)",alignSelf:"center"}}>{cnt} {cnt===1?"item":"items"}</span>
          </div>
          {isOpen&&<div className="ord-detail" onClick={e=>e.stopPropagation()}>
            <div className="od-grid">
              <div>
                <p style={{fontSize:11,textTransform:"uppercase",letterSpacing:".08em",color:"var(--sub)",marginBottom:12,fontWeight:500}}>Items</p>
                {order.items.map((item,i)=><div className="od-item" key={i}><div className="od-img"><img src={item.image} alt={item.title} onError={e=>{e.target.style.display="none";}} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div><div style={{flex:1,minWidth:0}}><div className="od-name">{item.title}</div><div className="od-meta">Qty {item.quantity} · ${fmt(item.price)} each</div></div><div className="od-price">${fmt(item.price*item.quantity)}</div></div>)}
                <button className="reorder-btn" onClick={()=>onReorder(order)}><ICart size={14}/> Reorder all items</button>
              </div>
              <div>
                <div className="od-sec"><div className="od-sec-l">Status</div><div className="tl">{tlSteps.map((s,i)=><div className="tl-step" key={i}><div className={`tl-dot${s.done?" done":s.act?" act":""}`}>{s.done&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</div><div className="tl-cont"><div className={`tl-title${!s.done&&!s.act?" dim":""}`}>{s.label}</div>{s.date&&<div className="tl-date">{fmtDate(s.date)}</div>}</div></div>)}</div></div>
                <div className="od-sec"><div className="od-sec-l">Shipped to</div><div className="od-sec-v">{order.shipping.name}<br/>{order.shipping.address}<br/>{order.shipping.city} {order.shipping.zip}<br/>{order.shipping.country}</div></div>
                <div className="od-trow"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div><div className="od-trow"><span>Tax</span><span>${fmt(order.tax)}</span></div><div className="od-trow total"><span>Total</span><span>${fmt(order.total)}</span></div>
              </div>
            </div>
          </div>}
        </div>);
      })}
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
function ProfilePage({user,orders,onNav,onLogout}){
  const joined=new Date(user.joined||Date.now()).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const totalSpend=orders.reduce((s,o)=>s+o.total,0);
  return(
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <h1 className="pg-title">Profile</h1>
      <div className="pro-card">
        <div className="pro-av">{getInitials(user.name)}</div>
        <div className="pro-name">{user.name}</div>
        <div className="pro-email">{user.email}</div>
        <div className="stat-g">
          <div className="stat-b"><div className="stat-l">Member since</div><div className="stat-v">{joined}</div></div>
          <div className="stat-b"><div className="stat-l">Orders placed</div><div className="stat-v">{orders.length}</div></div>
          <div className="stat-b"><div className="stat-l">Total spent</div><div className="stat-v">${fmt(totalSpend)}</div></div>
          <div className="stat-b"><div className="stat-l">Items ordered</div><div className="stat-v">{orders.reduce((s,o)=>s+o.items.reduce((x,i)=>x+i.quantity,0),0)}</div></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,borderTop:"1px solid var(--bdr)",paddingTop:16}}>
          <button className="btn btn-o" style={{justifyContent:"flex-start",width:"100%"}} onClick={()=>onNav("orders")}>View order history →</button>
          <button className="btn btn-d" style={{justifyContent:"flex-start",width:"100%"}} onClick={onLogout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICart=({size=15})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const IClose=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IUser=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const IOut=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IPkg=()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="1.5"><path d="M12 2l9 4.9V17L12 22 3 17V6.9L12 2z"/><polyline points="12 22 12 11"/><polyline points="3 7 12 11 21 7"/></svg>;
const ITrash=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IShip=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const ICard=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const ILock=({size=14})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IHome=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IUserCircle=()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="3"/><path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855"/></svg>;