const FaceEngine=(()=>{
  const MODEL_URL='/models';
  let loaded=false;
  async function loadModels(onProgress){
    if(loaded)return;
    if(onProgress)onProgress('Loading detection model…',10);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    if(onProgress)onProgress('Loading landmark model…',50);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    if(onProgress)onProgress('Loading recognition model…',80);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    if(onProgress)onProgress('Models ready ✓',100);
    loaded=true;
  }
  async function detectFull(input){
    return await faceapi.detectSingleFace(input,new faceapi.SsdMobilenetv1Options({minConfidence:.5})).withFaceLandmarks().withFaceDescriptor()||null;
  }
  function distance(a,b){let s=0;for(let i=0;i<a.length;i++)s+=(a[i]-b[i])**2;return Math.sqrt(s);}
  async function enrolFromVideo(video,n=5,onProgress){
    const descs=[];
    for(let i=0;i<n;i++){
      if(onProgress)onProgress('Capturing frame '+(i+1)+' of '+n+'…');
      await new Promise(r=>setTimeout(r,900));
      const det=await detectFull(video);
      if(!det)throw new Error('No face on frame '+(i+1)+' — centre your face');
      descs.push(det.descriptor);
    }
    const mean=new Float32Array(128);
    descs.forEach(d=>d.forEach((v,i)=>mean[i]+=v));
    mean.forEach((_,i)=>mean[i]/=descs.length);
    return mean;
  }
  async function recognise(video,ref,threshold=0.6){
    const det=await detectFull(video);
    if(!det)return{matched:false,reason:'No face detected',score:null,detection:null};
    const dist=distance(det.descriptor,ref);
    return{matched:dist<threshold,score:parseFloat((1-dist).toFixed(4)),distance:parseFloat(dist.toFixed(4)),reason:dist<threshold?'Match':'Not recognised',detection:det};
  }
  return{loadModels,detectFull,enrolFromVideo,recognise,distance};
})();
window.FaceEngine=FaceEngine;
