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
 const o={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),kind:"eq",latex,x:x??Math.max(50, paper.scrollLeft+100),y:y??Math.max(50,paper.scrollTop+100)};
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

function addNote(){checkpoint();const o={id:String(Date.now()+Math.random()),kind:"note",text:"",x:Math.max(50,paper.scrollLeft+100),y:Math.max(50,paper.scrollTop+180)};objects.push(o);selected=o.id;renderObjects(o.id,true);scheduleSave();}
function actionButtons(el,o){const actions=document.createElement("div");actions.className="object-actions";const del=document.createElement("button");del.className="delete-object";del.textContent="×";del.title="මකන්න";del.addEventListener("pointerdown",e=>e.stopPropagation());del.addEventListener("click",e=>{e.stopPropagation();checkpoint();objects=objects.filter(x=>x.id!==o.id);selected=null;renderObjects();scheduleSave();});actions.append(del);el.append(actions);}
function renderObjects(focusId=null,focusEditor=false){
 layer.innerHTML="";
 objects.forEach(o=>{
  const el=document.createElement("div");el.className="board-object "+(o.kind==="note"?"note-object":o.kind==="shape"?"shape-object":"equation-object")+(selected===o.id?" selected":"");el.dataset.id=o.id;el.style.left=o.x+"px";el.style.top=o.y+"px";
  if(o.kind==="eq"){
   const mf=document.createElement("math-field");mf.className="equation-field";mf.value=o.latex||"";mf.setAttribute("virtual-keyboard-mode","manual");mf.setAttribute("smart-mode","true");mf.setAttribute("aria-label","Edit mathematics equation");
   mf.addEventListener("input",()=>{o.latex=mf.value;scheduleSave();});
   mf.addEventListener("focus",()=>{selected=o.id;$$(".board-object").forEach(x=>x.classList.toggle("selected",x.dataset.id===o.id));});
   mf.addEventListener("pointerdown",e=>e.stopPropagation());el.append(mf);
  }else if(o.kind==="note"){
   const ta=document.createElement("textarea");ta.className="note-edit";ta.value=o.text||"";ta.rows=2;ta.placeholder="පියවර හෝ පැහැදිලි කිරීම මෙතැන type කරන්න...";ta.addEventListener("input",()=>{o.text=ta.value;scheduleSave();});ta.addEventListener("pointerdown",e=>e.stopPropagation());ta.addEventListener("focus",()=>selected=o.id);el.append(ta);
  }else if(o.kind==="shape"){
   el.innerHTML=o.svg;el.classList.add("shape-object");
  }
  actionButtons(el,o);
  el.addEventListener("pointerdown",e=>{if(e.target.closest("math-field,textarea,button"))return;e.preventDefault();checkpoint();selected=o.id;$$(".board-object").forEach(x=>x.classList.toggle("selected",x.dataset.id===o.id));drag={id:o.id,dx:e.clientX-el.getBoundingClientRect().left,dy:e.clientY-el.getBoundingClientRect().top};});
  layer.append(el);
  if(focusId===o.id&&focusEditor)setTimeout(()=>el.querySelector("math-field,textarea")?.focus(),120);
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

$("#selectMode").addEventListener("click",()=>{selected=null;$$(".board-object").forEach(x=>x.classList.remove("selected"));toast("Equation එකක් click කරලා edit කරන්න");});
$("#paperStyle").addEventListener("change",()=>{paper.className="paper "+$("#paperStyle").value;scheduleSave();});$("#boardTitle").addEventListener("input",scheduleSave);
$("#saveBtn").addEventListener("click",()=>save(true));$("#clearBtn")?.addEventListener("click",()=>{if(!confirm("පුවරුවේ සියලුම දේ මකා දමන්නද?"))return;checkpoint();objects=[];selected=null;renderObjects();scheduleSave();});
function restore(s){const d=JSON.parse(s);objects=d.objects||[];$("#boardTitle").value=d.title||"මගේ ගණිත වැඩපොත";$("#paperStyle").value=d.paper||"grid";paper.className="paper "+$("#paperStyle").value;renderObjects();}
function undoAction(){if(!undo.length)return toast("Undo කිරීමට වෙනසක් නැහැ");redo.push(snap());restore(undo.pop());scheduleSave();}
function redoAction(){if(!redo.length)return toast("Redo කිරීමට වෙනසක් නැහැ");undo.push(snap());restore(redo.pop());scheduleSave();}
$("#undoBtn").addEventListener("click",undoAction);$("#redoBtn").addEventListener("click",redoAction);
$("#zoomIn").addEventListener("click",()=>{zoom=Math.min(1.6,zoom+.1);paper.style.zoom=zoom;$("#zoomLabel").textContent=Math.round(zoom*100)+"%";});
$("#zoomOut").addEventListener("click",()=>{zoom=Math.max(.6,zoom-.1);paper.style.zoom=zoom;$("#zoomLabel").textContent=Math.round(zoom*100)+"%";});
$("#addShape").addEventListener("click",()=>$("#shapeDialog").showModal());$("#closeShape").addEventListener("click",()=>$("#shapeDialog").close());
$$("[data-shape]").forEach(b=>b.addEventListener("click",()=>{const type=b.dataset.shape;const svg={triangle:'<svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140"><polygon points="75,8 145,128 5,128"/></svg>',square:'<svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140"><rect x="15" y="15" width="120" height="110"/></svg>',circle:'<svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140"><circle cx="75" cy="70" r="58"/></svg>',line:'<svg class="shape-svg" width="160" height="140" viewBox="0 0 160 140"><line x1="8" y1="120" x2="145" y2="10"/></svg>'}[type];checkpoint();const o={id:String(Date.now()),kind:"shape",svg,x:paper.scrollLeft+80,y:paper.scrollTop+80};objects.push(o);selected=o.id;renderObjects();$("#shapeDialog").close();scheduleSave();}));
$("#helpBtn").addEventListener("click",()=>$("#helpDialog").showModal());$("#closeHelp").addEventListener("click",()=>$("#helpDialog").close());
$("#downloadBtn").addEventListener("click",()=>window.print());
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();undoAction();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redoAction();}else if(e.key==="Delete"&&selected&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)&&document.activeElement.tagName!=="MATH-FIELD"){checkpoint();objects=objects.filter(o=>o.id!==selected);selected=null;renderObjects();scheduleSave();}});
renderPalette();try{const old=localStorage.getItem(STORE);if(old)restore(old);}catch(e){}
})();