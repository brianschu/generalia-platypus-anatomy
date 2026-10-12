export function setupScanner({stage,select,groups,setRect,initialState,highlight=()=>{},pick=()=>null,explore=()=>{},returnToView=()=>{}}){
  const clean=document.body.dataset.cleanScanner==='true';
  const css=document.createElement('link');css.rel='stylesheet';css.href='scanner-v4.css?v=4';document.head.append(css);
  document.head.append(document.querySelector('#lab-skin'));
  document.querySelector('h1').innerHTML='Move the scanner. <em>Look beneath.</em>';
  document.querySelector('.intro-copy').textContent='Drag the tablet by its handle or edges. The living animal stays outside its window; the skeleton appears inside. Orbit and zoom work through the window.';
  document.querySelector('.v2-mode-panel')?.remove();document.querySelector('.v2-transition-tray')?.remove();
  const frame=document.createElement('div');frame.className='scan-tablet';
  frame.innerHTML=`<div class="scan-handle" tabindex="0" role="button" aria-label="Drag scanner; arrow keys move it"><span class="scan-grip">⠿</span><strong>DRAG THE SCANNER</strong><button id="scan-close" aria-label="Put scanner away">×</button></div><div class="scan-glass"><span class="scan-screen-label">LIVE ANATOMY WINDOW</span><span class="scan-reticle"></span></div><div class="scan-bottom"><span id="scan-material-label">IVORY / LIVE</span><span>HOLD EDGE TO MOVE</span></div><div class="scan-edge left"></div><div class="scan-edge right"></div><button class="scan-resize" title="Drag to resize scanner" aria-label="Drag to resize scanner">↘</button>`;
  stage.append(frame);
  const tools=document.createElement('div');tools.className='scanner-tools';tools.innerHTML='<span><b>↔</b> Move the tablet to explore · Drag the corner to resize</span><button id="scan-center">Center scanner</button><button id="scan-dock" aria-pressed="false">Dock scanner</button>';
  document.querySelector('.draft-switchbar').after(tools);
  const key=document.createElement('section');key.className='scanner-key';key.setAttribute('aria-label','Anatomy color key');
  key.innerHTML='<div class="scanner-key-title"><strong>Anatomy colors</strong><span>Hover to highlight · Click to keep selected</span></div><div class="scanner-key-items"></div>';
  let pinned=null,hovered=null;
  const rows=new Map();
  function showHighlight(id){highlight(id);for(const [name,row] of rows){row.classList.toggle('is-highlighted',name===id);row.setAttribute('aria-pressed',String(name===pinned));}}
  function hover(id){hovered=id;showHighlight(hovered||pinned);}
  function pin(id){if(!rows.has(id))return;if(pinned===id){returnToView();clearSelection();return;}pinned=id;hovered=null;showHighlight(pinned);explore(id);}
  function clearSelection(){pinned=null;hovered=null;showHighlight(null);}
  for(const group of groups){
    const row=document.createElement('button'),swatch=document.createElement('i');row.type='button';row.dataset.group=group.id;row.style.setProperty('--group-color',group.hex);swatch.style.background=group.hex;row.append(swatch,document.createTextNode(group.displayLabel||group.label));rows.set(group.id,row);key.querySelector('.scanner-key-items').append(row);
    row.addEventListener('pointerenter',()=>hover(group.id));row.addEventListener('pointerleave',()=>hover(null));row.addEventListener('focus',()=>hover(group.id));row.addEventListener('blur',()=>hover(null));row.addEventListener('click',()=>pin(group.id));
  }
  tools.after(key);
  let state=initialState,box={x:.32,y:.09,w:.4,h:.83},drag=null,docked=false,floatingBox=null,boxFrame=0;
  const glass=frame.querySelector('.scan-glass');
  function paint(){
    frame.style.left=`${box.x*stage.clientWidth}px`;frame.style.top=`${box.y*stage.clientHeight}px`;frame.style.width=`${box.w*stage.clientWidth}px`;frame.style.height=`${box.h*stage.clientHeight}px`;
    const a=glass.getBoundingClientRect(),b=stage.querySelector('canvas').getBoundingClientRect();if(!b.width||!b.height||!a.width)return;
    let left=a.left,right=a.right,top=a.top,bottom=a.bottom;
    const clip=getComputedStyle(frame).clipPath.match(/^inset\(([^)]+)\)/);
    if(clip){const rect=frame.getBoundingClientRect(),parts=clip[1].split(/\s+/).slice(0,4),values=parts.map((value,i)=>value.endsWith('%')?parseFloat(value)/100*(i%2?rect.width:rect.height):parseFloat(value));if(values.length===1)values.push(values[0],values[0],values[0]);if(values.length===2)values.push(...values);if(values.length===3)values.push(values[1]);top=Math.max(top,rect.top+values[0]);right=Math.min(right,rect.right-values[1]);bottom=Math.min(bottom,rect.bottom-values[2]);left=Math.max(left,rect.left+values[3]);}
    if(right<=left||bottom<=top){setRect([0,0,0,0]);return;}
    setRect([(left-b.left)/b.width,1-(bottom-b.top)/b.height,(right-b.left)/b.width,1-(top-b.top)/b.height]);
  }
  function setActive(next){const previous=state;state=next;frame.hidden=next==='living';key.hidden=next!=='anatomy';if(next!=='anatomy'){pinned=null;hovered=null;showHighlight(null);}frame.querySelector('#scan-material-label').textContent=next==='anatomy'?'ANATOMY COLORS / LIVE':'IVORY / LIVE';window.generaliaLabUi?.onState({state:next,previous,frame,key,paint});requestAnimationFrame(paint);}
  const dockBox=()=>({x:.015,y:.015,w:.97,h:.97});
  function dockLabel(){frame.classList.toggle('is-docked',docked);document.body.dataset.scannerDocked=String(docked);const button=tools.querySelector('#scan-dock');button.textContent=docked?'Undock scanner':'Dock scanner';button.setAttribute('aria-pressed',String(docked));}
  function moveBox(target,animate=true){cancelAnimationFrame(boxFrame);const startBox={...box},start=performance.now(),duration=animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?350:0;const tick=now=>{const p=duration?Math.min(1,(now-start)/duration):1,t=1-(1-p)**3;for(const field of ['x','y','w','h'])box[field]=startBox[field]+(target[field]-startBox[field])*t;paint();if(p<1)boxFrame=requestAnimationFrame(tick);else boxFrame=0;};tick(start);}
  function dock(next=true,animate=true){if(next===docked)return;if(next)floatingBox={...box};docked=next;dockLabel();moveBox(next?dockBox():floatingBox||window.generaliaLabUi?.scannerBox(),animate);}
  function restoreLayout(snapshot){docked=!!snapshot.docked;floatingBox=snapshot.floatingBox?{...snapshot.floatingBox}:null;dockLabel();moveBox({...snapshot.box});}
  function center(){cancelAnimationFrame(boxFrame);box=docked?dockBox():window.generaliaLabUi?.scannerBox()||{x:.32,y:.09,w:.4,h:.83};paint();}
  frame.querySelector('#scan-close').addEventListener('click',event=>{event.stopPropagation();select('living');});
  tools.querySelector('#scan-center').addEventListener('click',()=>{if(state==='living')select('ivory');center();});
  tools.querySelector('#scan-dock').addEventListener('click',()=>{if(state==='living')select('ivory');dock(!docked);});
  const handles=frame.querySelectorAll('.scan-handle,.scan-edge,.scan-bottom,.scan-resize');
  handles.forEach(handle=>{
    handle.addEventListener('pointerdown',event=>{if(event.target.closest('#scan-close'))return;event.preventDefault();event.stopPropagation();cancelAnimationFrame(boxFrame);if(docked){dock(false,false);const r=stage.getBoundingClientRect();box.x=Math.max(0,Math.min(1-box.w,(event.clientX-r.left)/r.width-box.w*.5));box.y=Math.max(0,Math.min(1-box.h,(event.clientY-r.top)/r.height-.04));paint();}handle.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY,box:{...box},resize:handle.classList.contains('scan-resize')};frame.classList.add('is-held');});
    handle.addEventListener('pointermove',event=>{if(!drag)return;const dx=(event.clientX-drag.x)/stage.clientWidth,dy=(event.clientY-drag.y)/stage.clientHeight;
      if(drag.resize){box.w=Math.max(Math.min(190/stage.clientWidth,.55),Math.min(.94,drag.box.w+dx));box.h=Math.max(.4,Math.min(.93,drag.box.h+dy));}
      else{box.x=Math.max(-box.w+.08,Math.min(.92,drag.box.x+dx));box.y=Math.max(0,Math.min(1-.1,drag.box.y+dy));}paint();});
    const release=()=>{drag=null;frame.classList.remove('is-held');};handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);
  });
  frame.querySelector('.scan-handle').addEventListener('keydown',event=>{if(!event.key.startsWith('Arrow'))return;if(docked)dock(false,false);const step=event.shiftKey?.05:.015;if(event.key==='ArrowLeft')box.x-=step;else if(event.key==='ArrowRight')box.x+=step;else if(event.key==='ArrowUp')box.y-=step;else if(event.key==='ArrowDown')box.y+=step;else return;event.preventDefault();paint();});
  const hitAt=event=>{const r=glass.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom?pick(event.clientX,event.clientY):null;};
  let modelDown=null;
  stage.addEventListener('pointermove',event=>{if(state!=='anatomy'||drag||event.buttons)return;const id=hitAt(event);hover(rows.has(id)?id:null);});
  stage.addEventListener('pointerleave',()=>hover(null));
  stage.addEventListener('pointerdown',event=>{if(event.target.tagName==='CANVAS')modelDown=[event.clientX,event.clientY];});
  stage.addEventListener('pointerup',event=>{if(state==='anatomy'&&modelDown&&Math.hypot(event.clientX-modelDown[0],event.clientY-modelDown[1])<5){const id=hitAt(event);if(id)pin(id);}modelDown=null;});
  new ResizeObserver(paint).observe(stage);window.generaliaScannerUi={setActive,center,dock,restoreLayout,clearSelection,snapshot:()=>({state,box:{...box},docked,floatingBox:floatingBox?{...floatingBox}:null,keyVisible:!key.hidden,highlighted:hovered||pinned})};center();setActive(state);
  if(clean){
    document.querySelectorAll('.topbar,.intro,.viewer-meta,.viewer-footer,.view-caption,.page-footer,.embed-toolbar,.draft-switchbar small,.compact-color-key').forEach(element=>element.hidden=true);
    tools.querySelector('span').remove();
    const bar=document.querySelector('.draft-switchbar');stage.before(bar);bar.after(key);bar.append(tools);
    frame.querySelector('.scan-handle strong').textContent='SCANNER';
    frame.querySelector('.scan-screen-label').textContent='ANATOMY / 01';
    frame.querySelector('.scan-bottom span:last-child').textContent='● ONLINE';
    window.generaliaLabUi?.onState({state,previous:state,frame,key,paint});
  }
  if(!clean&&document.body.dataset.poseCandidate==='true'){
    document.querySelector('h1').innerHTML='Head & tail. <em>Pose study.</em>';
    document.querySelector('.intro-copy').textContent='A separate living-model candidate with a raised cranial envelope and a gentler tail curve. The skeleton and shared camera are unchanged. Move the scanner to inspect the fit.';
    const note=document.createElement('div');note.style.cssText='padding:12px 18px;background:#343f30;color:#d4ddc1;font-size:12px';note.innerHTML='EXTERIOR POSE CANDIDATE · <a href="index-v4.html?view=ivory" style="color:inherit;text-decoration:underline">Open unchanged V4</a>';tools.before(note);
  }
}
