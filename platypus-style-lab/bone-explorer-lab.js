import * as THREE from 'three';

export function setupBoneExplorer({camera,controls,surfaceColors,stage,render}) {
  const descriptions={
    'group.thoracic-cage':'The ribs and sternum form the thoracic cage around the chest.',
    'group.vertebral-column':'The vertebral column supports the body and continues into the tail.',
    'group.skull-and-jaws':'The skull encloses the brain and supports the jaw structures.',
    'group.pectoral-girdle':'The shoulder girdle supports the attachment and movement of the forelimbs.',
    'group.pelvic-girdle':'The pelvic region supports the hindlimbs and connects them to the axial skeleton.',
    'group.humeri':'The humeri are the upper forelimb bones between the shoulders and elbows.',
    'group.forearms':'The forearm bones extend between the elbows and wrists.',
    'group.hands':'The hand bones form the skeletal framework of the forefeet and their digits.',
    'group.femora':'The femora are the thigh bones between the hips and knees.',
    'group.lower-legs-and-ankle-contacts':'This surface group covers the lower legs and adjoining ankle contacts.',
    'group.feet':'The foot bones form the skeletal framework of the hindfeet and their digits.'
  };
  const card=document.createElement('section');card.className='lab-explore-card';card.hidden=true;card.setAttribute('aria-label','Selected skeletal group');
  card.innerHTML='<div class="explore-heading"><span class="explore-swatch"></span><strong id="explore-title"></strong><button type="button" class="explore-return">Return to view ↗</button></div><p class="explore-copy" aria-live="polite"></p>';
  stage.append(card);
  let saved=null,frame=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baseDamping=controls.enableDamping;
  function move(position,target,onFinish=()=>{}) {
    cancelAnimationFrame(frame);controls.enableDamping=false;controls.enabled=false;
    const fromPosition=camera.position.clone(),fromTarget=controls.target.clone(),start=performance.now(),duration=reduced?0:600;
    const tick=now=>{
      const p=duration?Math.min(1,(now-start)/duration):1,t=p*p*(3-2*p);
      camera.position.copy(fromPosition).lerp(position,t);controls.target.copy(fromTarget).lerp(target,t);controls.update();render();
      if(p<1)frame=requestAnimationFrame(tick);else{frame=0;controls.enabled=true;controls.enableDamping=baseDamping;onFinish();}
    };
    tick(start);
  }
  function focus(id) {
    const group=surfaceColors?.visible.find(group=>group.id===id);
    if(!group)return;
    if(!saved)saved={position:camera.position.clone(),target:controls.target.clone(),scanner:window.generaliaScannerUi?.snapshot()};
    const bounds=surfaceColors.boundsFor(id),center=new THREE.Vector3(...bounds.center),size=new THREE.Vector3(...bounds.size);
    const direction=camera.position.clone().sub(controls.target).normalize();
    const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    let width=0,height=0,depth=0;
    for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
      const corner=new THREE.Vector3(size.x*x,size.y*y,size.z*z);width=Math.max(width,Math.abs(corner.dot(right)));height=Math.max(height,Math.abs(corner.dot(up)));depth=Math.max(depth,Math.abs(corner.dot(direction)));
    }
    const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const distance=THREE.MathUtils.clamp(Math.max(height/(tan*.62),width/(tan*camera.aspect*.82))+depth,controls.minDistance*1.1,controls.maxDistance*.8);
    window.generaliaScannerUi?.dock(true);
    card.querySelector('#explore-title').textContent=group.displayLabel||group.label;
    card.querySelector('.explore-copy').textContent=descriptions[id]||'Explore this reviewed skeletal surface group.';
    card.style.setProperty('--group-color',group.hex);card.hidden=false;document.body.dataset.exploreGroup=id;
    move(center.clone().addScaledVector(direction,distance),center);
  }
  function returnToView() {
    if(!saved)return;
    const restore=saved;saved=null;card.hidden=true;delete document.body.dataset.exploreGroup;
    window.generaliaScannerUi?.clearSelection();
    if(restore.scanner)window.generaliaScannerUi?.restoreLayout(restore.scanner);
    move(restore.position,restore.target);
  }
  card.querySelector('.explore-return').addEventListener('click',returnToView);
  window.addEventListener('keydown',event=>{if(event.key==='Escape')returnToView();});
  window.addEventListener('lab:state',event=>{if(event.detail.state!=='anatomy')returnToView();});
  window.addEventListener('beforeunload',()=>cancelAnimationFrame(frame));
  return {focus,returnToView};
}
