const Liveness=(()=>{
  function euclidean(a,b){return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2)}
  function computeEAR(eye){const A=euclidean(eye[1],eye[5]),B=euclidean(eye[2],eye[4]),C=euclidean(eye[0],eye[3]);return(A+B)/(2*C);}
  function getEyes(lm){const p=lm.positions;return{left:[36,37,38,39,40,41].map(i=>p[i]),right:[42,43,44,45,46,47].map(i=>p[i])};}
  function yawScore(lm){const p=lm.positions,nose=p[30],le=p[36],re=p[45],mid=(le.x+re.x)/2,off=Math.abs(nose.x-mid),fw=Math.abs(re.x-le.x);return Math.min(off/(fw*0.12),1);}
  function lbpScore(video,box){
    const c=document.createElement('canvas');c.width=c.height=64;
    const ctx=c.getContext('2d');
    ctx.drawImage(video,box.x,box.y,box.width,box.height,0,0,64,64);
    const d=ctx.getImageData(0,0,64,64).data;
    const g=new Uint8Array(64*64);
    for(let i=0;i<64*64;i++){const o=i*4;g[i]=Math.round(.299*d[o]+.587*d[o+1]+.114*d[o+2]);}
    const h=new Float32Array(256);
    for(let y=1;y<63;y++)for(let x=1;x<63;x++){
      const cen=g[y*64+x];let code=0;
      const nb=[g[(y-1)*64+(x-1)],g[(y-1)*64+x],g[(y-1)*64+(x+1)],g[y*64+(x+1)],g[(y+1)*64+(x+1)],g[(y+1)*64+x],g[(y+1)*64+(x-1)],g[y*64+(x-1)]];
      nb.forEach((n,b)=>{if(n>=cen)code|=(1<<b);});h[code]++;
    }
    const tot=h.reduce((a,b)=>a+b,0);for(let i=0;i<256;i++)h[i]/=tot;
    const mean=h.reduce((a,b)=>a+b,0)/256;
    const v=h.reduce((s,x)=>s+(x-mean)**2,0)/256;
    return Math.min(v*1e6/12,1);
  }
  let earHist=[],blinkDet=false,headScore=0,texScore=0,frames=0;
  function reset(){earHist=[];blinkDet=false;headScore=0;texScore=0;frames=0;}
  function analyseFrame(det,video){
    if(!det||!det.landmarks)return null;
    const lm=det.landmarks;frames++;
    if(!blinkDet){
      const{left,right}=getEyes(lm);
      const ear=(computeEAR(left)+computeEAR(right))/2;
      earHist.push(ear);if(earHist.length>15)earHist.shift();
      if(earHist.filter(e=>e<0.21).length>=2)blinkDet=true;
    }
    headScore=Math.max(headScore,yawScore(lm));
    if(frames%5===0&&det.detection)texScore=Math.max(texScore,lbpScore(video,det.detection.box));
    return getScore();
  }
  function getScore(){
    const b=blinkDet?1:Math.min(earHist.filter(e=>e<0.25).length/3,.9);
    const c=.3*b+.3*Math.min(headScore,1)+.4*texScore;
    return{composite:parseFloat(c.toFixed(3)),blinkScore:parseFloat(b.toFixed(3)),headTurnScore:parseFloat(headScore.toFixed(3)),lbpScore:parseFloat(texScore.toFixed(3)),blinkDetected:blinkDet,isLive:c>0.7};
  }
  return{analyseFrame,getCompositeScore:getScore,reset};
})();
window.Liveness=Liveness;
