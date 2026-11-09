(function () {
  'use strict';
  const h = window.ReportHub;
  const container=document.getElementById('reportGroups');
  const banner=document.getElementById('modeBanner');
  let allGroups=[],allLinks=[];
  const day=h.thaiDay();
  const key='report-hub-checklist-v2:'+day;
  let completed={};
  try {completed=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch {completed={};}
  function store(){try{localStorage.setItem(key,JSON.stringify(completed));}catch{h.toast('เบราว์เซอร์นี้บันทึกเครื่องหมายไม่ได้');}}
  function showBanner(text){banner.textContent=text;banner.classList.remove('hidden');}
  function updateProgress() {
    const groupIds=new Set(allGroups.filter(g=>g.active).map(g=>g.id));
    const required=allLinks.filter(l=>l.active&&l.is_required&&groupIds.has(l.group_id));
    const done=required.filter(l=>completed[l.id]).length;
    const percent=required.length?Math.round(done*100/required.length):100;
    document.getElementById('progressText').textContent=`${done} / ${required.length}`;
    document.getElementById('progressPct').textContent=percent+'%';
    document.getElementById('progressRing').style.setProperty('--pct',percent+'%');
  }
  function makeCard(l,number){
    const row=h.el('article','link-card');
    const top=h.el('div','card-info');
    const rowTitle=h.el('div','card-title-row');
    rowTitle.append(h.el('span','number-pill',String(number).padStart(2,'0')));
    rowTitle.append(h.el('h3','',l.title));
    top.append(rowTitle,h.el('p','card-desc',l.description||''));
    const tag=h.el('span','source-tag',l.source||'เว็บไซต์');top.append(tag);
    const actions=h.el('div','card-actions');
    if(l.is_required) {
      const wrap=h.el('label','check-control');const input=h.el('input');input.type='checkbox';input.checked=!!completed[l.id];input.setAttribute('aria-label','ทำรายการ '+l.title+' แล้ว');
      input.addEventListener('change',()=>{completed[l.id]=input.checked;store();wrap.classList.toggle('checked',input.checked);updateProgress();});
      wrap.classList.toggle('checked',input.checked);wrap.append(input,h.el('span','','ทำแล้ว'));actions.append(wrap);
    }
    const copy=h.el('button','outline-btn','⧉ คัดลอก');copy.type='button';copy.addEventListener('click',()=>h.copy(l.url));actions.append(copy);
    const open=h.el('a','primary-btn','เปิดลิงก์ ↗');open.href=h.validUrl(l.url)?l.url:'#';open.target='_blank';open.rel='noopener noreferrer';
    if(!h.validUrl(l.url)){open.removeAttribute('href');open.classList.add('disabled');}
    actions.append(open);row.append(top,actions);return row;
  }
  function render(){
    container.replaceChildren();let number=0;
    const groups=allGroups.filter(g=>g.active).sort(h.byOrder);
    for(const g of groups){
      const links=allLinks.filter(l=>l.group_id===g.id && l.active).sort(h.byOrder);
      if(!links.length)continue;
      const section=h.el('section','report-section');
      const header=h.el('div','group-header');const titleBox=h.el('div');
      titleBox.append(h.el('h2','',g.title));if(g.subtitle)titleBox.append(h.el('p','',g.subtitle));header.append(titleBox);
      if(g.deadline)header.append(h.el('span','deadline',g.deadline));
      section.append(header);
      const grid=h.el('div','link-grid');
      for(const l of links){number++;grid.append(makeCard(l,number));}
      section.append(grid);container.append(section);
    }
    if(!container.children.length)container.append(h.el('p','empty','ยังไม่มีรายการที่เปิดแสดง'));
    updateProgress();
  }
  document.getElementById('dateDisplay').textContent=h.thaiDate();
  document.getElementById('resetBtn').addEventListener('click',()=>{
    if(!confirm('ล้างเครื่องหมายที่ทำแล้วสำหรับวันนี้บนเครื่องนี้?'))return;
    completed={};store();render();h.toast('ล้างเครื่องหมายประจำวันแล้ว');
  });
  (async()=>{
    allGroups=h.groups.map(x=>({...x}));allLinks=h.links.map(x=>({...x}));
    if(!h.configured()) {showBanner('โหมดเริ่มต้น: แสดงลิงก์เดิม 7 รายการ ยังไม่ได้เชื่อมต่อฐานข้อมูลกลาง (ตั้งค่าใน config.js เพื่อใช้งานหลังบ้าน)');render();return;}
    try {
      const db=h.db();
      const [gr,lr]=await Promise.all([
        db.from('report_hub_groups').select('id,title,subtitle,deadline,kind,sort_order,active').eq('active',true).order('sort_order'),
        db.from('report_hub_links').select('id,group_id,title,description,url,source,sort_order,is_required,active').eq('active',true).order('sort_order')
      ]);
      if(gr.error) throw gr.error;if(lr.error)throw lr.error;
      allGroups=gr.data||[];allLinks=lr.data||[];
    } catch(e) {showBanner('ไม่สามารถโหลดข้อมูลจากฐานข้อมูลได้ ขณะนี้แสดงลิงก์ตั้งต้นเท่านั้น กรุณาตรวจสอบการเชื่อมต่อ: '+(e.message||'เกิดข้อผิดพลาด'));}
    render();
  })();
})();
