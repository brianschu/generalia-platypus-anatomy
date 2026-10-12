import * as THREE from 'three';

// Presentation presets for the style lab. Geometry and reviewed group assignments stay intact.
export function setupLabScene({scene,renderer,ivory,platform,surfaceColors,render,scannerMaterial}) {
  const hemi=scene.children.find(object=>object.isHemisphereLight);
  const [key,fill,rim]=scene.children.filter(object=>object.isDirectionalLight);
  const presets={
    1:{key:3.7,fill:.45,rim:1.05,exposure:1.18,keyColor:'#edfaff',fillColor:'#ff8ba2',rimColor:'#4ce6f5',environment:.18,position:[-4,6,5],board:false,boardColor:'#15272d',ivory:'#e4eceb'},
    2:{key:3.9,fill:.7,rim:.4,exposure:1.22,keyColor:'#ffffff',fillColor:'#e4efff',rimColor:'#b5c8f5',environment:.28,position:[-4,7,6],board:true,boardColor:'#a8adb5',ivory:'#e4e0d6'},
    3:{key:3.65,fill:.75,rim:.65,exposure:1.26,keyColor:'#fffcf6',fillColor:'#b9ddff',rimColor:'#d6edff',environment:.26,position:[-4,8,7],board:true,boardColor:'#bccde3',ivory:'#e6e2d9'},
    4:{key:3.7,fill:.5,rim:1.2,exposure:1.22,keyColor:'#fff5ff',fillColor:'#a4f3ff',rimColor:'#e18dff',environment:.2,position:[-3,6,6],board:false,boardColor:'#2d164b',ivory:'#e7deec'},
    5:{key:4.1,fill:.85,rim:.65,exposure:1.25,keyColor:'#fffaf0',fillColor:'#bafcff',rimColor:'#ffd0e6',environment:.3,position:[-4,7,8],board:true,boardColor:'#fff0d0',ivory:'#e8dfcd'},
    6:{key:3.6,fill:.5,rim:1.05,exposure:1.26,keyColor:'#fff8ff',fillColor:'#c6b5f2',rimColor:'#c6abff',environment:.22,position:[-4,7,6],board:true,boardColor:'#322957',ivory:'#e4dfed'},
    7:{key:3.4,fill:.7,rim:.55,exposure:1.3,keyColor:'#ffffff',fillColor:'#91b4ff',rimColor:'#8cf4cb',environment:.2,position:[-4,8,5],board:false,boardColor:'#17285b',ivory:'#e1e4e3'},
    8:{key:3.75,fill:.65,rim:.35,exposure:1.22,keyColor:'#fff8e9',fillColor:'#e3eeff',rimColor:'#eee0ba',environment:.26,position:[-4,8,7],board:true,boardColor:'#c7b99a',ivory:'#e5ddca'},
    9:{key:3.75,fill:.55,rim:1,exposure:1.2,keyColor:'#eefaff',fillColor:'#65dfe9',rimColor:'#ffb580',environment:.2,position:[-4,6,7],board:false,boardColor:'#071c26',ivory:'#dee8e8'},
    10:{key:4.05,fill:.75,rim:.75,exposure:1.24,keyColor:'#fffdf8',fillColor:'#c1d3ff',rimColor:'#ffd2b1',environment:.28,position:[-4,8,8],board:true,boardColor:'#efdfb5',ivory:'#e6dfd0'}
  };
  let tween=0,colorTween=0,current=Number(document.body.dataset.design)||1;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const read=()=>({key:key.intensity,fill:fill.intensity,rim:rim.intensity,exposure:renderer.toneMappingExposure,environment:scene.environmentIntensity,keyColor:key.color.clone(),fillColor:fill.color.clone(),rimColor:rim.color.clone(),ivory:ivory.color.clone(),position:key.position.clone()});
  function apply(id,immediate=false) {
    current=id;const target=presets[id]; if(!target)return;
    cancelAnimationFrame(tween);
    const previous=read(),start=performance.now(),duration=immediate||reduced?0:450;
    platform.forEach((object,index)=>{
      object.visible=index===0&&target.board;
      if(index===0){object.material.color.set(target.boardColor);object.material.roughness=id===6?.32:.72;object.material.metalness=id===6?.16:0;}
    });
    document.body.dataset.lightStyle=String(id);
    if(scannerMaterial)scannerMaterial.uniforms.uRadius.value=[2,7,8,10].includes(id)?0:id===6?14:8;
    const nextKey=new THREE.Color(target.keyColor),nextFill=new THREE.Color(target.fillColor),nextRim=new THREE.Color(target.rimColor),nextIvory=new THREE.Color(target.ivory),nextPosition=new THREE.Vector3(...target.position);
    function tick(now){
      const p=duration?Math.min(1,(now-start)/duration):1,t=1-(1-p)**3;
      for(const [light,name] of [[key,'key'],[fill,'fill'],[rim,'rim']])light.intensity=THREE.MathUtils.lerp(previous[name],target[name],t);
      key.color.copy(previous.keyColor).lerp(nextKey,t);fill.color.copy(previous.fillColor).lerp(nextFill,t);rim.color.copy(previous.rimColor).lerp(nextRim,t);
      key.position.copy(previous.position).lerp(nextPosition,t);ivory.color.copy(previous.ivory).lerp(nextIvory,t);
      renderer.toneMappingExposure=THREE.MathUtils.lerp(previous.exposure,target.exposure,t);scene.environmentIntensity=THREE.MathUtils.lerp(previous.environment,target.environment,t);
      if(hemi){hemi.intensity=id===1||id===9?.55:.65;hemi.color.set('#f0f2ef');hemi.groundColor.set(id===4||id===6?'#353049':'#30333a');}
      render();if(p<1)tween=requestAnimationFrame(tick);else tween=0;
    }
    tick(start);
  }
  function entrance(){
    cancelAnimationFrame(colorTween);if(!surfaceColors?.setEntrance)return;
    if(reduced){surfaceColors.setEntrance(1,current);render();return;}
    const start=performance.now(),duration=current===7?460:720;
    const tick=now=>{const progress=Math.min(1,(now-start)/duration);surfaceColors.setEntrance(progress,current);render();if(progress<1)colorTween=requestAnimationFrame(tick);else colorTween=0;};
    tick(start);
  }
  window.addEventListener('lab:design',event=>{apply(event.detail.design);if(document.body.dataset.labView==='anatomy')entrance();});
  window.addEventListener('lab:state',event=>{if(event.detail.state==='anatomy')entrance();else{cancelAnimationFrame(colorTween);surfaceColors?.setEntrance(1,current);}});
  apply(current,true);
  if(document.body.dataset.labView==='anatomy')entrance();
  window.addEventListener('beforeunload',()=>{cancelAnimationFrame(tween);cancelAnimationFrame(colorTween);});
}
