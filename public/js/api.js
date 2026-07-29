const API=(()=>{
  const BASE='/api';
  async function req(method,path,body=null,token=null){
    const headers={'Content-Type':'application/json'};
    const jwt=token||await DB.getMeta('jwt');
    if(jwt)headers['Authorization']='Bearer '+jwt;
    const opts={method,headers};
    if(body)opts.body=JSON.stringify(body);
    let res;
    try{res=await fetch(BASE+path,opts);}catch(e){throw new Error('Network unavailable');}
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||'HTTP '+res.status);
    return data;
  }
  return{
    login:(e,p)=>req('POST','/auth/login',{email:e,password:p}),
    me:()=>req('GET','/auth/me'),
    register:b=>req('POST','/auth/register',b),
    getUsers:role=>req('GET','/users'+(role?'?role='+role:'')),
    getUser:id=>req('GET','/users/'+id),
    updateUser:(id,b)=>req('PUT','/users/'+id,b),
    deleteUser:id=>req('DELETE','/users/'+id),
    getCourses:()=>req('GET','/courses'),
    createCourse:b=>req('POST','/courses',b),
    deleteCourse:id=>req('DELETE','/courses/'+id),
    enrollStudents:(id,ids)=>req('POST','/courses/'+id+'/enrol',{student_ids:ids}),
    getCourseStudents:id=>req('GET','/courses/'+id+'/students'),
    createSession:b=>req('POST','/sessions',b),
    getSessions:cid=>req('GET','/sessions'+(cid?'?course_id='+cid:'')),
    getSession:id=>req('GET','/sessions/'+id),
    getSessionQR:(id,idx)=>req('GET','/sessions/'+id+'/qr?token_index='+(idx||0)),
    syncRecords:r=>req('POST','/attendance/sync',r),
    validateToken:(u,s)=>req('POST','/attendance/validate-token',{token_uuid:u,session_id:s}),
    getStudentSummary:id=>req('GET','/attendance/student/'+id),
    getStudentSessions:(id,cid)=>req('GET','/attendance/student/'+id+'/sessions'+(cid?'?course_id='+cid:'')),
    getSessionAttendance:id=>req('GET','/attendance/session/'+id),
    getCourseReport:id=>req('GET','/attendance/course/'+id+'/report'),
    registerEmbedding:h=>req('POST','/attendance/embedding-registered',{device_hash:h}),
  };
})();
window.API=API;
