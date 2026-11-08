(() => {
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const paper=$("#paper"), layer=$("#equationLayer"), placeholder=$("#placeholder"), toastBox=$("#toast");
const STORE="mathsmate-smart-board-v3";
let objects=[],undo=[],redo=[],selected=null,drag=null,zoom=1,saveTimer;
const groups=[
{id:"basic",title:"මූලික ගණිත සංකේත",items:[["＋","+","එකතු"],["−","-","අඩු"],["×","\\times","ගුණ"],["÷","\\div","බෙදීම"],["=","=","සමාන"],["≠","\\ne","අසමාන"],["±","\\pm","ධන / ඍණ"],["≈","\\approx","ආසන්න"],["<","<","කුඩා"],[">",">","විශාල"],["≤","\\le","අඩු හෝ සමාන"],["≥","\\ge","වැඩි හෝ සමාන"]]},
{id:"algebra",title:"වීජ ගණිතය හා බල",items:[["x²","x^2","වර්ගය"],["x³","x^3","ඝනය"],["xⁿ","x^{n}","බලයක්"],["x₁","x_1","යටි අංක"],["( )","\\left(\\right)","වරහන්"],["|x|","\\left|x\\right|","නිරපේක්ෂ අගය"],["∞","\\infty","අනන්තය"],["∴","\\therefore","එබැවින්"],["Σ","\\sum_{i=1}^{n}","එකතුව"],["√","\\sqrt{x}","වර්ගමූලය"]]},
{id:"fractions",title:"භාග හා මූල",items:[["a⁄b","\\frac{a}{b}","භාගය"],["√x","\\sqrt{x}","වර්ගමූලය"],["∛x","\\sqrt[3]{x}","ඝනමූලය"],["ⁿ√x","\\sqrt[n]{x}","n වන මූලය"],["½","\\frac{1}{2}","අර්ධය"],["¾","\\frac{3}{4}","තුන් කාල"],["%","\\%","ප්‍රතිශතය"]]},
{id:"geometry",title:"ජ්‍යාමිතිය හා කෝණ",items:[["π","\\pi","පයි"],["θ","\\theta","තීටා"],["∠","\\angle","කෝණය"],["°","^{\\circ}","අංශක"],["△","\\triangle","ත්‍රිකෝණය"],["⊥","\\perp","ලම්බ"],["∥","\\parallel","සමාන්තර"],["≅","\\cong","සර්වසම"],["∼","\\sim","සමාන හැඩ"],["AB","\\overline{AB}","රේඛා ඛණ්ඩ"]]},
{id:"functions",title:"Functions හා ත්‍රිකෝණමිතිය",items:[["sin","\\sin\\left(x\\right)","සයින්"],["cos","\\cos\\left(x\\right)","කොසයින්"],["tan","\\tan\\left(x\\right)","ටැන්ජන්ට්"],["log","\\log\\left(x\\right)","ලඝුගණකය"],["ln","\\ln\\left(x\\right)","ස්වාභාවික log"],["f(x)","f\\left(x\\right)","ශ්‍රිතය"],["f′(x)","f'\\left(x\\right)","අවකලනය"],["lim","\\lim_{x\\to a}","සීමාව"],["√","\\sqrt{a^2+b^2}","පයිතගරස්"]]},
{id:"mensuration",title:"වර්ගඵලය, පරිමිතිය හා පරිමාව",items:[["πr²","\\pi r^2","වෘත්ත වර්ගඵලය"],["2πr","2\\pi r","වට දිග"],["½bh","\\frac{1}{2}bh","ත්‍රිකෝණ වර්ගඵලය"],["l×w","l\\times w","සෘජුකෝණාස්‍රය"],["lwh","lwh","ඝනකාභය"],["πr²h","\\pi r^2h","සිලින්ඩරය"],["⅓πr²h","\\frac{1}{3}\\pi r^2h","කේතුව"],["⁴⁄₃πr³","\\frac{4}{3}\\pi r^3","ගෝලය"]]}
];
function toast(t){toastBox.textContent=t;toastBox.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>toastBox.classList.remove("show"),2200);}
function snap(){return JSON.stringify({objects,title:$("#boardTitle").value,paper:$("#paperStyle").value});}
function checkpoint(){undo.push(snap());if(undo.length>80)undo.shift();redo=[];}
function scheduleSave(){clearTimeout(saveTimer);$("#saveStatus").textContent="සුරකිමින්...";saveTimer=setTimeout(()=>save(false),400);}
function save(show=true){try{localStorage.setItem(STORE,snap());$("#saveStatus").textContent="සුරැකුණා · "+new Date().toLocaleTimeString();if(show)toast("මෙම browser එකේ සුරැකුවා");}catch(e){toast("සුරැකීම අසාර්ථකයි");}}
function updatePlaceholder(){placeholder.classList.toggle("hidden",objects.length>0);}
function renderPalette(filter="all",search=""){
 const host=$("#symbolGroups");host.innerHTML="";
 groups.filter(g=>filter==="all"||g.id===filter).forEach(g=>{
  const items=g.items.filter(it=>(it[0]+" "+it[2]).toLowerCase().includes(search.toLowerCase()));if(!items.length)return;
  const section=document.createElement("section");section.className="symbol-group";
  const h=document.createElement("h3");h.className="group-title";h.textContent=g.title;section.append(h);
  const grid=document.createElement("div");grid.className="symbol-grid";
  items.forEach(it=>{const b=document.createElement("button");b.className="symbol-btn";b.title=it[2];b.innerHTML=`<span class="symbol">${it[0]}</span><small>${it[2]}</small>`;b.addEventListener("click",()=>insertTemplate(it[1]));grid.append(b);});
  section.append(grid);host.append(section);
 });
}
function setCategory(id){$$(".cat-tab").forEach(b=>b.classList.toggle("active",b.dataset.category===id));renderPalette(id,$("#symbolSearch").value);}
$("#categoryTabs").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(b)setCategory(b.dataset.category);});
$("#symbolSearch").addEventListener("input",()=>renderPalette($(".cat-tab.active").dataset.category,$("#symbolSearch").value));

function makeEquation(latex="",x=null,y=null){
 const o={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),kind:"eq",latex,x:x??Math.max(50, paper.scrollLeft+100),y:y??Math.max(50,paper.scrollTop+100),w:520,fontSize:34};
 objects.push(o);selected=o.id;renderObjects(o.id,true);scheduleSave();return o;
}
function insertTemplate(latex){
 const selectedEl=selected?layer.querySelector(`[data-id="${selected}"] math-field`):null;
 if(selectedEl){
  checkpoint();selectedEl.focus();
  try{selectedEl.insert(latex);}catch(e){selectedEl.value=(selectedEl.value||"")+latex;}
  const obj=objects.find(o=>o.id===selected);if(obj)obj.latex=selectedEl.value;
  scheduleSave();toast("සූත්‍ර කොටස තෝරාගත් equation එකට එක් කළා");return;
 }
 checkpoint();makeEquation(latex);toast("නිවැරදි ගණිත සූත්‍රය පුවරුවට එක් කළා");
}
function addEquationAt(x=null,y=null,focus=true){
 checkpoint();
 const o=makeEquation("",x,y);
 if(focus) toast("දැන් keyboard එකෙන් පුවරුවේම type කරන්න");
 return o;
}
function addEquation(){addEquationAt(null,null,true);}

function addNote(){checkpoint();const o={id:String(Date.now()+Math.random()),kind:"note",text:"",x:Math.max(50,paper.scrollLeft+100),y:Math.max(50,paper.scrollTop+180),w:560,fontSize:18};objects.push(o);selected=o.id;renderObjects(o.id,true);scheduleSave();}
function fitNote(ta){
 ta.style.height="auto";
 ta.style.height=Math.max(58,ta.scrollHeight)+"px";
}
function actionButtons(el,o){const actions=document.createElement("div");actions.className="object-actions";const del=document.createElement("button");del.className="delete-object";del.textContent="×";del.title="මකන්න";del.addEventListener("pointerdown",e=>e.stopPropagation());del.addEventListener("click",e=>{e.stopPropagation();checkpoint();objects=objects.filter(x=>x.id!==o.id);selected=null;renderObjects();scheduleSave();});actions.append(del);el.append(actions);}
function renderObjects(focusId=null,focusEditor=false){
 layer.innerHTML="";
 objects.forEach(o=>{
  const el=document.createElement("div");
  el.className="board-object "+(o.kind==="note"?"note-object":o.kind==="shape"?"shape-object":"equation-object")+(selected===o.id?" selected":"");
  el.dataset.id=o.id;
  el.style.left=o.x+"px";el.style.top=o.y+"px";
  if(o.w)el.style.width=o.w+"px";
  if(o.h)el.style.height=o.h+"px";
  if(o.fontSize)el.style.setProperty("--object-font-size",o.fontSize+"px");

  // A dedicated grip makes moving possible without accidentally editing content.
  const grip=document.createElement("div");
  grip.className="object-drag-handle";
  grip.title="මෙතැනින් අල්ලා ගෙන යන්න";
  grip.textContent="⠿";
  grip.addEventListener("pointerdown",e=>{
   if(e.button!==0)return;
   e.preventDefault();e.stopPropagation();checkpoint();selected=o.id;
   $$(".board-object").forEach(x=>x.classList.toggle("selected",x.dataset.id===o.id));
   drag={id:o.id,dx:e.clientX-el.getBoundingClientRect().left,dy:e.clientY-el.getBoundingClientRect().top};
  });
  el.append(grip);

  if(o.kind==="eq"){
   const mf=document.createElement("math-field");
   mf.className="equation-field";mf.value=o.latex||"";mf.style.fontSize=(o.fontSize||34)+"px";
   mf.setAttribute("virtual-keyboard-mode","manual");
   mf.setAttribute("smart-mode","true");
   mf.setAttribute("aria-label","Edit mathematics equation");
   mf.addEventListener("input",()=>{o.latex=mf.value;scheduleSave();});
   mf.addEventListener("focus",()=>{selected=o.id;$$(".board-object").forEach(x=>x.classList.toggle("selected",x.dataset.id===o.id));syncObjectSizeControl();});
   mf.addEventListener("pointerdown",e=>e.stopPropagation());
   mf.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){
     e.preventDefault();e.stopPropagation();
     const rect=el.getBoundingClientRect();
     const nextY=o.y+Math.max(el.offsetHeight,rect.height)+18;
     checkpoint();
     const next=makeEquation("",o.x,nextY);
     setTimeout(()=>layer.querySelector(`[data-id="${next.id}"] math-field`)?.focus(),60);
    }
   });
   el.append(mf);
  }else if(o.kind==="note"){
   const ta=document.createElement("textarea");
   ta.className="note-edit";ta.value=o.text||"";ta.rows=2;ta.style.fontSize=(o.fontSize||18)+"px";
   ta.placeholder="පියවර හෝ පැහැදිලි කිරීම මෙතැන type කරන්න...";
   ta.addEventListener("input",()=>{o.text=ta.value;fitNote(ta);scheduleSave();});
   ta.addEventListener("pointerdown",e=>e.stopPropagation());
   ta.addEventListener("focus",()=>{selected=o.id;$$(".board-object").forEach(x=>x.classList.toggle("selected",x.dataset.id===o.id));syncObjectSizeControl();});
   el.append(ta);
  }else if(o.kind==="shape"){   const holder=document.createElement("div");holder.innerHTML=o.svg;el.append(holder);
  }
  actionButtons(el,o);
  // Drag from the object's padding/border as well as its grip, never from the editor itself.
  el.addEventListener("pointerdown",e=>{
   if(e.target.closest("math-field,textarea,button,.object-drag-handle"))return;
   if(e.button!==0)return;
   e.preventDefault();checkpoint();selected=o.id;
   $$(".board-object").forEach(x=>x.classList.toggle("selected",x.dataset.id===o.id));
   drag={id:o.id,dx:e.clientX-el.getBoundingClientRect().left,dy:e.clientY-el.getBoundingClientRect().top};
  });
  layer.append(el);
  const ta=el.querySelector("textarea");if(ta)requestAnimationFrame(()=>fitNote(ta));
  if(focusId===o.id&&focusEditor)setTimeout(()=>el.querySelector("math-field,textarea")?.focus(),120);
  // Persist user-resized dimensions (native resize handle at bottom-right).
  if(window.ResizeObserver){
   let lastSize={w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)};
   const ro=new ResizeObserver(entries=>{
    const r=entries[0].contentRect;
    const w=Math.round(r.width),h=Math.round(r.height);
    if(w>0&&h>0&&(Math.abs(w-lastSize.w)>2||Math.abs(h-lastSize.h)>2)){
     lastSize={w,h};o.w=w;
     if(o.kind!=="note")o.h=h;
     scheduleSave();
    }
   });
   ro.observe(el);
  }
 });
 updatePlaceholder();
}
window.addEventListener("pointermove",e=>{if(!drag)return;const o=objects.find(x=>x.id===drag.id);if(!o)return;const r=paper.getBoundingClientRect();o.x=Math.max(0,e.clientX-r.left+paper.scrollLeft-drag.dx);o.y=Math.max(0,e.clientY-r.top+paper.scrollTop-drag.dy);const el=layer.querySelector(`[data-id="${o.id}"]`);if(el){el.style.left=o.x+"px";el.style.top=o.y+"px";}});
window.addEventListener("pointerup",()=>{if(drag){drag=null;scheduleSave();}});
$("#addEquation").addEventListener("click",addEquation);$("#firstEquation").addEventListener("click",addEquation);$("#addNote").addEventListener("click",addNote);
// Click an empty area of the whiteboard and start typing directly there.
paper.addEventListener("pointerdown",e=>{
 if(e.target.closest(".board-object,.paper-placeholder")) return;
 if(e.button!==0) return;
 const r=paper.getBoundingClientRect();
 const x=Math.max(12,e.clientX-r.left+paper.scrollLeft);
 const y=Math.max(12,e.clientY-r.top+paper.scrollTop);
 addEquationAt(x,y,true);
});


$("#paperStyle").addEventListener("change",()=>{paper.className="paper "+$("#paperStyle").value;scheduleSave();});$("#boardTitle").addEventListener("input",scheduleSave);
$("#clearBtn")?.addEventListener("click",()=>{if(!confirm("පුවරුවේ සියලුම දේ මකා දමන්නද?"))return;checkpoint();objects=[];selected=null;renderObjects();redrawInk();scheduleSave();});
function restore(s){const d=JSON.parse(s);objects=d.objects||[];$("#boardTitle").value=d.title||"මගේ ගණිත වැඩපොත";$("#paperStyle").value=d.paper||"grid";paper.className="paper "+$("#paperStyle").value;renderObjects();if(typeof redrawInk==="function")redrawInk();}
function undoAction(){if(!undo.length)return toast("Undo කිරීමට වෙනසක් නැහැ");redo.push(snap());restore(undo.pop());scheduleSave();}
function redoAction(){if(!redo.length)return toast("Redo කිරීමට වෙනසක් නැහැ");undo.push(snap());restore(redo.pop());scheduleSave();}
$("#undoBtn").addEventListener("click",undoAction);$("#redoBtn").addEventListener("click",redoAction);
$("#zoomIn").addEventListener("click",()=>{zoom=Math.min(1.6,zoom+.1);paper.style.zoom=zoom;$("#zoomLabel").textContent=Math.round(zoom*100)+"%";});
$("#zoomOut").addEventListener("click",()=>{zoom=Math.max(.6,zoom-.1);paper.style.zoom=zoom;$("#zoomLabel").textContent=Math.round(zoom*100)+"%";});
$("#addShape").addEventListener("click",()=>$("#shapeDialog").showModal());$("#closeShape").addEventListener("click",()=>$("#shapeDialog").close());
$$("[data-shape]").forEach(b=>b.addEventListener("click",()=>{const type=b.dataset.shape;const svg={triangle:'<svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140"><polygon points="75,8 145,128 5,128"/></svg>',square:'<svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140"><rect x="15" y="15" width="120" height="110"/></svg>',circle:'<svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140"><circle cx="75" cy="70" r="58"/></svg>',line:'<svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140"><line x1="8" y1="120" x2="145" y2="10"/></svg>',sector:'<svg class="shape-svg" width="190" height="170" viewBox="0 0 190 170"><path d="M 85 85 L 165 85 A 80 80 0 0 0 125.0 15.7 Z"/><path d="M85 85 L165 85 M85 85 L125 15.7" stroke-dasharray="4 4"/></svg>',semicircle:'<svg class="shape-svg" width="180" height="110" viewBox="0 0 180 110"><path d="M10 95 A80 80 0 0 1 170 95 Z"/></svg>',arc:'<svg class="shape-svg" width="180" height="150" viewBox="0 0 180 150"><path d="M20 125 A80 80 0 0 1 160 125" fill="none"/></svg>',rectangle:'<svg class="shape-svg" width="180" height="120" viewBox="0 0 180 120"><rect x="10" y="10" width="160" height="100"/></svg>'}[type];checkpoint();const o={id:String(Date.now()),kind:"shape",svg,x:paper.scrollLeft+80,y:paper.scrollTop+80,w:210,h:190};objects.push(o);selected=o.id;renderObjects();$("#shapeDialog").close();scheduleSave();}));
$("#helpBtn").addEventListener("click",()=>$("#helpDialog").showModal());$("#closeHelp").addEventListener("click",()=>$("#helpDialog").close());

document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();undoAction();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redoAction();}else if(e.key==="Delete"&&selected&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)&&document.activeElement.tagName!=="MATH-FIELD"){checkpoint();objects=objects.filter(o=>o.id!==selected);selected=null;renderObjects();scheduleSave();}});

// Selected-object font sizing controls.
function updateObjectFontSize(value){
 const o=objects.find(v=>v.id===selected);
 if(!o || !["eq","note"].includes(o.kind)){toast("මුලින් Equation හෝ සටහනක් තෝරන්න");return;}
 checkpoint();o.fontSize=Number(value);
 const el=layer.querySelector(`[data-id="${o.id}"]`);
 if(el){const editor=el.querySelector("math-field,textarea");if(editor)editor.style.fontSize=o.fontSize+"px";}
 $("#objectSizeValue").textContent=o.fontSize+"px";
 scheduleSave();
}
$("#objectFontSize")?.addEventListener("input",e=>updateObjectFontSize(e.target.value));
function syncObjectSizeControl(){
 const o=objects.find(v=>v.id===selected);
 if(!o || !["eq","note"].includes(o.kind))return;
 const size=o.fontSize||(o.kind==="eq"?34:18);
 $("#objectFontSize").value=size;$("#objectSizeValue").textContent=size+"px";
}


// Drawing layer: works with touchpad/mouse and pressure-sensitive stylus.
const inkCanvas=$("#inkCanvas"), inkCtx=inkCanvas?.getContext("2d");
if(!inkCanvas||!inkCtx)throw new Error("Drawing canvas could not be initialized.");
let drawMode="select", drawing=false, activeStroke=null;
inkCanvas.style.pointerEvents="none";
const PROJECTS_KEY="mathsmate-saved-boards-v1";
let activeProjectId=null;
function resizeInkCanvas(){
 const w=paper.offsetWidth,h=paper.offsetHeight;
 const dpr=Math.max(1,window.devicePixelRatio||1);
 inkCanvas.width=w*dpr;inkCanvas.height=h*dpr;
 inkCanvas.style.width=w+"px";inkCanvas.style.height=h+"px";
 inkCtx.setTransform(dpr,0,0,dpr,0,0);
 redrawInk();
}
function redrawInk(){
 if(!inkCanvas)return;
 const dpr=Math.max(1,window.devicePixelRatio||1);
 inkCtx.clearRect(0,0,inkCanvas.width/dpr,inkCanvas.height/dpr);
 (objects.filter(o=>o.kind==="ink")).forEach(st=>{
  if(!st.points||st.points.length<1)return;
  inkCtx.save();inkCtx.strokeStyle=st.color||"#2563eb";inkCtx.fillStyle=st.color||"#2563eb";
  inkCtx.lineWidth=st.size||4;inkCtx.lineCap="round";inkCtx.lineJoin="round";
  if(st.points.length===1){inkCtx.beginPath();inkCtx.arc(st.points[0].x,st.points[0].y,(st.size||4)/2,0,Math.PI*2);inkCtx.fill();}
  else{inkCtx.beginPath();inkCtx.moveTo(st.points[0].x,st.points[0].y);st.points.slice(1).forEach(p=>inkCtx.lineTo(p.x,p.y));inkCtx.stroke();}
  inkCtx.restore();
 });
}
function setDrawMode(mode){
 drawMode=mode;
 ["selectMode","penMode","eraserMode"].forEach(id=>$("#"+id)?.classList.remove("selected"));
 const target=mode==="pen"?"penMode":mode==="eraser"?"eraserMode":"selectMode";
 $("#"+target)?.classList.add("selected");
 paper.style.cursor=mode==="pen"?"crosshair":mode==="eraser"?"cell":"default";
 inkCanvas.style.pointerEvents=(mode==="pen"||mode==="eraser")?"auto":"none";
 toast(mode==="pen"?"Pen එකෙන් පුවරුවේ අඳින්න":mode==="eraser"?"මැකීමට ඇඳි තැන drag කරන්න":"තෝරාගැනීමේ mode එක");
}function canvasPoint(e){
 const r=inkCanvas.getBoundingClientRect();
 return {x:e.clientX-r.left+paper.scrollLeft,y:e.clientY-r.top+paper.scrollTop};
}
inkCanvas.addEventListener("pointerdown",e=>{
 if(drawMode!=="pen"&&drawMode!=="eraser")return;
 e.preventDefault();inkCanvas.setPointerCapture(e.pointerId);
 const p=canvasPoint(e);
 if(drawMode==="eraser"){
  checkpoint();const radius=Number($("#brushSize").value)*2;
  objects=objects.filter(o=>o.kind!=="ink"||!o.points?.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<radius));
  redrawInk();scheduleSave();return;
 }
 checkpoint();drawing=true;
 activeStroke={id:String(Date.now()+Math.random()),kind:"ink",color:$("#penColor").value,size:Number($("#brushSize").value),points:[p]};
 objects.push(activeStroke);redrawInk();
});
inkCanvas.addEventListener("pointermove",e=>{
 if(!drawing||!activeStroke)return;
 const p=canvasPoint(e);activeStroke.points.push(p);redrawInk();
});
function finishStroke(){if(drawing){drawing=false;activeStroke=null;scheduleSave();}}
inkCanvas.addEventListener("pointerup",finishStroke);
inkCanvas.addEventListener("pointercancel",finishStroke);
$("#penMode").addEventListener("click",()=>setDrawMode("pen"));
$("#eraserMode").addEventListener("click",()=>setDrawMode("eraser"));
$("#selectMode").addEventListener("click",()=>setDrawMode("select"));
$("#brushSize").addEventListener("input",e=>$("#brushSizeValue").textContent=e.target.value+"px");
$("#clearInkBtn").addEventListener("click",()=>{
 if(!objects.some(o=>o.kind==="ink"))return toast("ඇඳි රේඛා නැහැ");
 checkpoint();objects=objects.filter(o=>o.kind!=="ink");redrawInk();scheduleSave();
});

// Separate named boards: opening the app starts with a fresh blank workspace;
// saved boards remain in the local library until explicitly deleted.
function getProjects(){try{return JSON.parse(localStorage.getItem(PROJECTS_KEY)||"[]");}catch(e){return[];}}
function setProjects(list){localStorage.setItem(PROJECTS_KEY,JSON.stringify(list));}
function boardData(){return {objects:objects.map(o=>({...o})),title:$("#boardTitle").value,paper:$("#paperStyle").value,updatedAt:new Date().toISOString()};}
function saveProject(){
 const title=$("#boardTitle").value.trim()||"මගේ ගණිත පුවරුව";
 const data=boardData();data.title=title;
 let list=getProjects();
 const id=activeProjectId||String(Date.now())+"-"+Math.random().toString(36).slice(2,7);
 const existing=list.findIndex(p=>p.id===id);
 const entry={id,title,data,updatedAt:data.updatedAt};
 if(existing>=0)list[existing]=entry;else list.unshift(entry);
 setProjects(list);activeProjectId=id;
 localStorage.setItem(STORE,JSON.stringify(data));
 $("#saveStatus").textContent="සුරැකුණා · "+new Date().toLocaleTimeString();
 toast("“"+title+"” වෙනම සුරැකුවා");
}
function startNewBoard(){
 if(objects.length && !confirm("දැනට ඇති පුවරුව save කරලා අලුත් එකක් අරඹන්නද? Save කර නොමැති නම් එය නැතිවිය හැකියි."))return;
 objects=[];selected=null;activeProjectId=null;
 $("#boardTitle").value="නව ගණිත පුවරුව";$("#paperStyle").value="grid";paper.className="paper grid";
 undo=[];redo=[];renderObjects();redrawInk();paper.scrollTo(0,0);scheduleSave();
}
function openProject(id){
 const p=getProjects().find(x=>x.id===id);if(!p)return;
 if(objects.length&&!confirm("දැනට ඇති වැඩ save කරලා තියෙනවාද? සුරැකි පුවරුව විවෘත කරන්නද?"))return;
 activeProjectId=p.id;restore(JSON.stringify(p.data));redrawInk();
 $("#boardsDialog").close();paper.scrollTo(0,0);toast("සුරැකි පුවරුව විවෘත කළා");
}
function renderSavedBoards(){
 const host=$("#savedBoardsList");host.innerHTML="";
 const list=getProjects();
 if(!list.length){host.textContent="තවම සුරැකි පුවරු නැහැ.";return;}
 list.forEach(p=>{
  const row=document.createElement("div");row.className="saved-board-row";
  const info=document.createElement("div");info.className="saved-board-info";
  const name=document.createElement("b");name.textContent=p.title;
  const meta=document.createElement("small");meta.textContent=new Date(p.updatedAt).toLocaleString();
  info.append(name,meta);
  const open=document.createElement("button");open.className="toolbar-btn";open.textContent="විවෘත";open.addEventListener("click",()=>openProject(p.id));
  const del=document.createElement("button");del.className="square-btn danger";del.textContent="×";del.title="මකන්න";
  del.addEventListener("click",()=>{if(!confirm("මෙම saved board එක මකන්නද?"))return;setProjects(getProjects().filter(x=>x.id!==p.id));renderSavedBoards();});
  row.append(info,open,del);host.append(row);
 });
}
$("#newBoardBtn").addEventListener("click",startNewBoard);
$("#openBoardBtn").addEventListener("click",()=>{renderSavedBoards();$("#boardsDialog").showModal();});
$("#closeBoards").addEventListener("click",()=>$("#boardsDialog").close());
$("#saveBtn").addEventListener("click",saveProject);

// Download as PDF through the browser print dialog.
$("#downloadBtn").addEventListener("click",()=>{redrawInk();window.print();});
window.addEventListener("resize",resizeInkCanvas);

// Start with a clean board on each fresh visit; saved boards live in the library.
renderPalette();
try{const old=localStorage.getItem(STORE);if(old){const draft=JSON.parse(old);if(draft&&draft.objects?.length){/* keep prior autosave separate; do not reopen it automatically */}}}catch(e){}
resizeInkCanvas();

})();