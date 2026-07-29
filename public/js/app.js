(async()=>{
  if('serviceWorker'in navigator){
    navigator.serviceWorker.register('/sw.js').catch(console.error);
    navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='SYNC_COMPLETE')toast('\u2713 '+e.data.synced+' record(s) synced','success');});
  }
  const ob=document.getElementById('offline-banner');
  function updateOnline(){if(!navigator.onLine){ob&&ob.classList.add('show');}else{ob&&ob.classList.remove('show');DB.requestSync();}}
  window.addEventListener('online',updateOnline);window.addEventListener('offline',updateOnline);updateOnline();

  window.toast=function(msg,type='info',dur=3500){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.className='show toast-'+type;clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),dur);};
  window.getUser=async()=>await DB.getMeta('user');
  window.logout=async()=>{await DB.setMeta('jwt',null);await DB.setMeta('user',null);window.location.href='/pages/login.html';};

  const pub=['/pages/login.html','/index.html','/'];
  const cur=window.location.pathname;
  if(!pub.some(p=>cur.endsWith(p))){
    const jwt=await DB.getMeta('jwt'),user=await DB.getMeta('user');
    if(!jwt||!user){window.location.href='/pages/login.html';return;}
    const av=document.getElementById('user-avatar'),un=document.getElementById('user-name'),ur=document.getElementById('user-role');
    if(av)av.textContent=user.full_name?.charAt(0).toUpperCase()||'U';
    if(un)un.textContent=user.full_name||user.email;
    if(ur)ur.textContent=user.role?.charAt(0).toUpperCase()+user.role?.slice(1)||'';
    document.querySelectorAll('[data-role]').forEach(el=>{const allowed=el.dataset.role.split(',');if(!allowed.includes(user.role))el.style.display='none';});
    document.querySelectorAll('.nav-item').forEach(el=>{
      if(el.dataset.page&&cur.includes(el.dataset.page))el.classList.add('active');
      el.addEventListener('click',()=>{if(el.dataset.page)window.location.href='/pages/'+el.dataset.page;});
    });
    document.getElementById('menu-toggle')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.toggle('open'));
  }
  window.openModal=id=>document.getElementById(id)?.classList.remove('hidden');
  window.closeModal=id=>document.getElementById(id)?.classList.add('hidden');
  document.querySelectorAll('.modal-close').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.modal-overlay')?.classList.add('hidden')));
  window.pctBadge=pct=>{if(pct===null||pct===undefined)return '<span class="badge badge-navy">\u2014</span>';const n=parseFloat(pct);if(n>=75)return '<span class="badge badge-green">'+n+'%</span>';if(n>=60)return '<span class="badge badge-yellow">'+n+'%</span>';return '<span class="badge badge-red">'+n+'%</span>';};
  window.pctBar=pct=>{const n=parseFloat(pct)||0,cl=n>=75?'green':n>=60?'yellow':'red';return '<div class="progress-wrap"><div class="progress-bar '+cl+'" style="width:'+Math.min(n,100)+'%"></div></div>';};
  window.fmt={date:d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'\u2014',time:t=>t?t.slice(0,5):'\u2014',dt:d=>d?new Date(d).toLocaleString('en-GB'):'\u2014'};
})();
