const $=s=>document.querySelector(s);let C,plan;
const show=(h)=>{$('#step1').hidden=true;$('#step2').hidden=false;$('#step2').innerHTML=h};
fetch('/api/config').then(r=>r.json()).then(c=>{C=c;$('#dc').href=$('#dc2').href=c.discord;
 $('#plans').innerHTML=Object.entries(c.plans).map(([k,p])=>`<div class="card ${k==='lifetime'?'feat':''}"><h3>${p.name}</h3><div class="price">$${p.price}<small> ${k==='lifetime'?'once':'/ month'}</small></div><p>${p.note}</p><ul><li>All modules</li><li>Custom macro builder</li><li>1 device</li></ul><button class="btn" data-p="${k}">Buy ${p.name.toLowerCase()}</button></div>`).join('');
 document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{plan=b.dataset.p;$('#dt').textContent='MolnarMacros '+C.plans[plan].name+' ($'+C.plans[plan].price+')';
  $('#ms').innerHTML=Object.entries(C.methods).map(([k,m],i)=>`<label class="opt"><input type="radio" name="m" value="${k}" ${i?'':'checked'}> ${m.label}</label>`).join('');
  $('#step1').hidden=false;$('#step2').hidden=true;$('#msg').textContent='';$('#dlg').showModal()})});
$('#x').onclick=()=>$('#dlg').close();
$('#go').onclick=async()=>{$('#msg').textContent='';const r=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('#em').value,plan,method:document.querySelector('[name=m]:checked').value})});const d=await r.json();
 if(!r.ok)return $('#msg').textContent=d.error;if(d.url)return location=d.url;
 show(`<p>${d.instructions}</p><p>Your order ID:</p><div class="key">${d.orderId}</div><p class="fine">Once we confirm your payment, your key is available at <a href="/?order=${d.orderId}">this link</a>. Bookmark it.</p>`)};
const oid=new URLSearchParams(location.search).get('order');
if(oid){const t=async()=>{const o=await (await fetch('/api/order/'+oid)).json();
 $('#dt').textContent='Your order';$('#dlg').showModal();
 if(o.status==='paid')show(`<p>Payment confirmed. Your license key:</p><div class="key">${o.key}</div><p><a class="btn" href="/download/${oid}">Download MolnarMacros</a></p><p class="fine">Bookmark this page. You can download again from it any time.</p>`);
 else{show('<p>Waiting for payment confirmation. This page updates by itself.</p>');setTimeout(t,5000)}};t()}
