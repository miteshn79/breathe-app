
(function(){
  const btn=document.getElementById('feedback-btn');
  const dlg=document.getElementById('feedback-modal');
  const form=document.getElementById('feedback-form');
  if(!btn||!dlg||!form)return;
  btn.onclick=()=>dlg.showModal();
  form.onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const payload={type:fd.get('type'),title:fd.get('title'),body:fd.get('details')};
    try{
      const r=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      alert((await r.json()).ok?'Thanks!':'Error');
    }catch{alert('Error');}
    dlg.close();
  };
})();