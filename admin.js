(function () {
  'use strict';
  const h=window.ReportHub;
  const $=id=>document.getElementById(id);
  const login=$('loginPanel'),panel=$('adminPanel'),err=$('authError');
  let db=null,groups=[],links=[],currentUser=null;
  const writeFields={
    link:['group_id','title','description','url','source','sort_order','is_required','active'],
    group:['title','subtitle','deadline','kind','sort_order','active']
  };
  function errorMessage(e){return e&&e.message?e.message:'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';}
  function showError(e){h.toast(errorMessage(e));}
  function setLoginError(text){err.textContent=text;err.classList.remove('hidden');}
  function loginState(active){login.classList.toggle('hidden',active);panel.classList.toggle('hidden',!active);if(active)err.classList.add('hidden');}
  async function isAdmin(){
    const {data,error}=await db.from('report_hub_admins').select('user_id').eq('user_id',currentUser.id).maybeSingle();
    if(error)throw error;return !!data;
  }
  async function authorize(){
    const {data,error}=await db.auth.getUser();if(error||!data.user){loginState(false);return;}
    currentUser=data.user;
    if(!await isAdmin()) {loginState(false);setLoginError('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล กรุณาเพิ่ม user_id ลงตาราง report_hub_admins ตามคู่มือ');return;}
    loginState(true);$('whoami').textContent=currentUser.email||'';await refresh();
  }
  async function refresh(){
    const [gr,lr]=await Promise.all([
      db.from('report_hub_groups').select('*').order('sort_order'),
      db.from('report_hub_links').select('*').order('sort_order')
    ]);
    if(gr.error)throw gr.error;if(lr.error)throw lr.error;
    groups=gr.data||[];links=lr.data||[];
    renderGroups();renderLinks();
  }
  function chip(text){return h.el('span','meta',text);}
  function itemButton(label,action,css='outline-btn'){
    const b=h.el('button',css,label);b.type='button';b.addEventListener('click',action);return b;
  }
  function listItem(title,detail,meta,active){
    const row=h.el('article','admin-item');if(!active)row.classList.add('inactive');
    const body=h.el('div','item-main');body.append(h.el('h3','',title),h.el('p','',detail||''),chip(meta));
    const actions=h.el('div','item-actions');row.append(body,actions);return {row,actions};
  }
  function renderLinks(){
    const host=$('adminLinks');host.replaceChildren();
    if(!links.length)host.append(h.el('p','empty','ยังไม่มีปุ่มลิงก์'));
    groups.slice().sort(h.byOrder).forEach(g=>{
      const inGroup=links.filter(l=>l.group_id===g.id).sort(h.byOrder);
      if(!inGroup.length)return;
      host.append(h.el('h3','admin-list-group',g.title));
      inGroup.forEach((l,i)=>{
        const x=listItem(l.title,l.description,`${l.source} · ลำดับ ${l.sort_order}${l.is_required?' · นับเช็กลิสต์':''}${l.active?'':' · ซ่อนอยู่'}`,l.active);
        x.actions.append(
          itemButton('↑',()=>move('link',inGroup,i,-1),'subtle-btn'),
          itemButton('↓',()=>move('link',inGroup,i,1),'subtle-btn'),
          itemButton('แก้ไข',()=>editLink(l)),
          itemButton(l.active?'ซ่อน':'แสดง',()=>toggle('link',l)),
          itemButton('ลบ',()=>remove('link',l),'subtle-btn')
        );host.append(x.row);
      });
    });
  }
  function renderGroups(){
    const host=$('adminGroups');host.replaceChildren();
    const items=groups.slice().sort(h.byOrder);if(!items.length)host.append(h.el('p','empty','ยังไม่มีหมวดเมนู'));
    items.forEach((g,i)=>{
      const count=links.filter(l=>l.group_id===g.id).length;
      const x=listItem(g.title,g.subtitle,`${g.deadline||'ไม่กำหนดเวลา'} · ${count} ปุ่ม · ${g.active?'เปิดแสดง':'ซ่อนอยู่'}`,g.active);
      x.actions.append(itemButton('↑',()=>move('group',items,i,-1),'subtle-btn'),itemButton('↓',()=>move('group',items,i,1),'subtle-btn'),itemButton('แก้ไข',()=>editGroup(g)),itemButton(g.active?'ซ่อน':'แสดง',()=>toggle('group',g)),itemButton('ลบ',()=>remove('group',g),'subtle-btn'));
      host.append(x.row);
    });
  }
  function table(kind){return kind==='link'?'report_hub_links':'report_hub_groups';}
  async function change(kind,id,values){
    const {error}=await db.from(table(kind)).update(values).eq('id',id);
    if(error)throw error;
  }
  async function toggle(kind,record){
    try{await change(kind,record.id,{active:!record.active});await refresh();h.toast('อัปเดตการแสดงผลแล้ว');}catch(e){showError(e);}
  }
  async function remove(kind,record){
    const count=kind==='group'?links.filter(l=>l.group_id===record.id).length:0;
    const msg=kind==='group'?`ลบหมวด “${record.title}” และลิงก์ภายใน ${count} รายการอย่างถาวร?`:`ลบปุ่ม “${record.title}” อย่างถาวร?`;
    if(!confirm(msg))return;
    try{const {error}=await db.from(table(kind)).delete().eq('id',record.id);if(error)throw error;await refresh();h.toast('ลบรายการแล้ว');}catch(e){showError(e);}
  }
  async function move(kind,items,index,dir){
    const other=index+dir;if(other<0||other>=items.length)return;
    const ordered=items.slice();[ordered[index],ordered[other]]=[ordered[other],ordered[index]];
    try{
      // Unique 10-point sort sequence; temporary values avoid collisions with repeated sort values.
      for(let i=0;i<ordered.length;i++){
        const desired=(i+1)*10;
        if(ordered[i].sort_order!==desired)await change(kind,ordered[i].id,{sort_order:desired});
      }
      await refresh();h.toast('จัดลำดับแล้ว');
    }catch(e){showError(e);await refresh().catch(showError);}
  }
  function showDialog(id){$(id).showModal();}
  function editLink(l){
    $('linkDialogTitle').textContent=l?'แก้ไขปุ่ม':'เพิ่มปุ่มใหม่';$('linkForm').reset();
    $('linkId').value=l?.id||'';
    $('linkGroup').replaceChildren();
    groups.slice().sort(h.byOrder).forEach(g=>{const opt=h.el('option','',g.title);opt.value=g.id;$('linkGroup').append(opt);});
    if(!groups.length){h.toast('กรุณาสร้างหมวดเมนูก่อน');return;}
    $('linkGroup').value=l?.group_id||groups[0].id;
    $('linkTitle').value=l?.title||'';$('linkUrl').value=l?.url||'';
    $('linkDescription').value=l?.description||'';$('linkSource').value=l?.source||'เว็บไซต์';
    $('linkOrder').value=l?.sort_order??((links.filter(x=>x.group_id===$('linkGroup').value).length+1)*10);
    $('linkRequired').checked=l?.is_required??true;$('linkActive').checked=l?.active??true;
    showDialog('linkDialog');
  }
  function editGroup(g){
    $('groupDialogTitle').textContent=g?'แก้ไขหมวดเมนู':'เพิ่มหมวดเมนู';$('groupForm').reset();
    $('groupId').value=g?.id||'';$('groupTitle').value=g?.title||'';$('groupSubtitle').value=g?.subtitle||'';
    $('groupDeadline').value=g?.deadline||'';$('groupKind').value=g?.kind||'report';
    $('groupOrder').value=g?.sort_order??((groups.length+1)*10);$('groupActive').checked=g?.active??true;
    showDialog('groupDialog');
  }
  async function save(kind,form,dialogId,values,id){
    const btn=form.querySelector('button[type=submit]');btn.disabled=true;
    try{
      const fields=writeFields[kind];const payload=Object.fromEntries(fields.map(field=>[field,values[field]]));
      let query=db.from(table(kind));
      const result=id?await query.update(payload).eq('id',id):await query.insert(payload);
      if(result.error)throw result.error;
      $(dialogId).close();await refresh();h.toast('บันทึกข้อมูลเรียบร้อย');
    }catch(e){showError(e);}finally{btn.disabled=false;}
  }
  $('linkForm').addEventListener('submit',e=>{
    e.preventDefault();const form=e.currentTarget;
    const url=$('linkUrl').value.trim();if(!h.validUrl(url)){h.toast('กรุณากรอกลิงก์ https:// ที่ถูกต้อง');return;}
    save('link',form,'linkDialog',{
      group_id:$('linkGroup').value,title:$('linkTitle').value.trim(),url,
      description:$('linkDescription').value.trim(),source:$('linkSource').value,
      sort_order:Number($('linkOrder').value),is_required:$('linkRequired').checked,active:$('linkActive').checked
    },$('linkId').value||null);
  });
  $('groupForm').addEventListener('submit',e=>{
    e.preventDefault();save('group',e.currentTarget,'groupDialog',{
      title:$('groupTitle').value.trim(),subtitle:$('groupSubtitle').value.trim(),deadline:$('groupDeadline').value.trim(),
      kind:$('groupKind').value,sort_order:Number($('groupOrder').value),active:$('groupActive').checked
    },$('groupId').value||null);
  });
  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();const btn=$('loginBtn');btn.disabled=true;err.classList.add('hidden');
    try{
      const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
      if(error)throw error;$('password').value='';await authorize();
    }catch(e){setLoginError(errorMessage(e));}finally{btn.disabled=false;}
  });
  $('logoutBtn').addEventListener('click',async()=>{
    try{await db.auth.signOut();currentUser=null;groups=[];links=[];loginState(false);h.toast('ออกจากระบบแล้ว');}catch(e){showError(e);}
  });
  $('newLinkBtn').addEventListener('click',()=>editLink(null));$('newGroupBtn').addEventListener('click',()=>editGroup(null));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
  function tab(which){
    const on=which==='links';$('linksPanel').classList.toggle('hidden',!on);$('groupsPanel').classList.toggle('hidden',on);
    $('tabLinks').classList.toggle('active',on);$('tabGroups').classList.toggle('active',!on);
    $('tabLinks').setAttribute('aria-selected',String(on));$('tabGroups').setAttribute('aria-selected',String(!on));
  }
  $('tabLinks').addEventListener('click',()=>tab('links'));
  $('tabGroups').addEventListener('click',()=>tab('groups'));
  (async()=>{
    if(!h.configured()){$('configAlert').classList.remove('hidden');$('loginBtn').disabled=true;return;}
    try{db=h.db();await authorize();}catch(e){setLoginError('เชื่อมต่อฐานข้อมูลไม่สำเร็จ: '+errorMessage(e));}
  })();
})();
