(function () {
  'use strict';
  const groups = [
    {id:'10000000-0000-4000-8000-000000000001',title:'กลุ่มที่ 1 · การตั้งจุด ว.43',subtitle:'รายการที่ 1–3 · รายงานทุกวัน',deadline:'ก่อน 08.00 น.',kind:'report',sort_order:10,active:true},
    {id:'10000000-0000-4000-8000-000000000002',title:'กลุ่มที่ 2 · ผลการออกตรวจ ว.4',subtitle:'รายการที่ 4–6 · รายงานทุกวัน',deadline:'ก่อน 09.00 น.',kind:'report',sort_order:20,active:true},
    {id:'10000000-0000-4000-8000-000000000003',title:'แม่แบบ Canva และเครื่องมือ',subtitle:'ทางลัดสำหรับจัดทำสื่อประชาสัมพันธ์',deadline:'',kind:'resource',sort_order:30,active:true}
  ];
  const links = [
    {id:'20000000-0000-4000-8000-000000000001',group_id:groups[0].id,title:'กรอกผลการตั้งจุด ว.43 / จับกุม',description:'กรอกผลการตั้งจุดตรวจ ว.43 และผลการจับกุมประจำวันแบบเรียลไทม์',url:'https://docs.google.com/spreadsheets/d/1sHTAnegPqyMgQuZAXgp1Fth4K_lT_4u26l4lzGSg9S8/edit?usp=sharing',source:'Google Sheets',sort_order:10,is_required:true,active:true},
    {id:'20000000-0000-4000-8000-000000000002',group_id:groups[0].id,title:'ภาพการปล่อยแถว / ตั้งจุด ว.43',description:'จัดทำภาพการปล่อยแถวและตั้งจุด ว.43',url:'https://canva.link/qqe199j3geqd1d0',source:'Canva',sort_order:20,is_required:true,active:true},
    {id:'20000000-0000-4000-8000-000000000003',group_id:groups[0].id,title:'ภาพการจับกุมคดีเด่น',description:'คัดเฉพาะภาพการจับกุมเด่น ๆ (เฉพาะภาพ)',url:'https://canva.link/2zporbca3vuxhoa',source:'Canva',sort_order:30,is_required:true,active:true},
    {id:'20000000-0000-4000-8000-000000000004',group_id:groups[1].id,title:'ผลการออก ว.4 ภาพรวมงาน ป.',description:'ผกก. รอง ผกก.ป. สวป. และสายตรวจ',url:'https://docs.google.com/spreadsheets/d/1q1U_tM0ZwYcEniRd3E48ympTIbwiakYrvcTsjyfFmnA/edit?usp=sharing',source:'Google Sheets',sort_order:10,is_required:true,active:true},
    {id:'20000000-0000-4000-8000-000000000005',group_id:groups[1].id,title:'การออก ว.4 เวรนายตำรวจ อก.',description:'บันทึกจำนวนครั้งการออกตรวจของเวรนายตำรวจอำนวยการ',url:'https://docs.google.com/spreadsheets/d/1xpyCONP01jexq1qF2r6mzcQdKgtirYRgohYSD7d8WkY/edit?usp=sharing',source:'Google Sheets',sort_order:20,is_required:true,active:true},
    {id:'20000000-0000-4000-8000-000000000006',group_id:groups[1].id,title:'รายงานภาพการปฏิบัติ ภ.จว.',description:'โฟลเดอร์ Google Drive สำหรับรายงานภาพการปฏิบัติ',url:'https://drive.google.com/drive/folders/1SSls67KTrmU42vvVzzgG9zBYjCdCeyCH',source:'Google Drive',sort_order:30,is_required:true,active:true},
    {id:'20000000-0000-4000-8000-000000000007',group_id:groups[2].id,title:'แม่แบบ Canva ทำภาพ จุดตรวจสัมพันธ์เวรอำนวยการ',description:'แม่แบบสำหรับทำภาพประชาสัมพันธ์การออกตรวจสัมพันธ์ของเวรอำนวยการ',url:'https://canva.link/gtr85mbqia37e65',source:'Canva',sort_order:10,is_required:false,active:true}
  ];
  const config = window.REPORT_HUB_CONFIG || {};
  function configured() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test((config.supabaseUrl || '').trim())
      && !!String(config.supabasePublishableKey || '').trim();
  }
  let client = null;
  function db() {
    if (!configured()) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('โหลด Supabase SDK ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต');
    if (!client) client = window.supabase.createClient(config.supabaseUrl.trim().replace(/\/$/, ''),config.supabasePublishableKey.trim());
    return client;
  }
  function byOrder(a,b) {return (a.sort_order||0)-(b.sort_order||0) || String(a.title||'').localeCompare(String(b.title||''),'th');}
  function el(tag,cls,text) {const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;}
  function thaiDay() {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function thaiDate() {return new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'full'}).format(new Date());}
  function toast(message) {
    const node=document.getElementById('toast');if(!node)return;
    node.textContent=message;node.classList.add('visible');
    clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('visible'),3200);
  }
  function validUrl(u) {try {const x=new URL(u);return x.protocol==='https:' && !!x.hostname;}catch{return false;}}
  async function copy(value) {try {await navigator.clipboard.writeText(value);toast('คัดลอกลิงก์แล้ว');}catch{window.prompt('คัดลอกลิงก์นี้:',value);}}
  window.ReportHub = {groups,links,configured,db,byOrder,el,thaiDay,thaiDate,toast,validUrl,copy};
})();
