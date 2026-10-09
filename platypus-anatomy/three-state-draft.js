import * as THREE from 'three';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
import { prepareAnatomySurfaceColors } from './anatomy-surface-colors.js?v=2';

// Reviewed gross skeletal groups; living-body registration remains provisional.
export async function loadThreeStateDraft({scene, camera, loader, renderer, frameModel, resize, render, loading, onError, onStats}) {
  const buttons=[...document.querySelectorAll('[data-state]')];
  buttons.forEach(button=>button.disabled=true);
  loading.querySelector('span:last-child').textContent='Preparing all three views';
  try {
    const [skeletonFile,livingFile] = await Promise.all([
      loader.loadAsync('./assets/skeleton.glb'),loader.loadAsync(document.body.dataset.livingAsset||'./assets/living.glb')]);
    const skeleton = skeletonFile.scene, living = livingFile.scene;
    const ivory = new THREE.MeshStandardMaterial({color:'#C8BEA5',roughness:.88});
    let meshes=0,triangles=0;
    skeleton.updateMatrixWorld(true);
    skeleton.traverse(mesh=>{
      if (!mesh.isMesh) return;
      meshes++; const geometry=mesh.geometry, position=geometry.getAttribute('position');
      triangles += (geometry.index?.count ?? position.count)/3;
      mesh.material=ivory;
    });
    let surfaceColors=null;
    const reviewPreview=new URLSearchParams(location.search).get('reviewColors')==='1';
    if(reviewPreview) {
      surfaceColors=await prepareAnatomySurfaceColors(skeleton,'./assets/anatomy-colors.candidate.json');
    } else surfaceColors=await prepareAnatomySurfaceColors(skeleton,'./assets/anatomy-colors.json');
    const colorsApproved=surfaceColors && !reviewPreview && surfaceColors.visible.length>0 && surfaceColors.visible.length===surfaceColors.manifest.groups.length && surfaceColors.visible.every(group=>group.reviewStatus==='PASS');
    const originalMaterialState = new Map();
    living.traverse(mesh=>{
      if(!mesh.isMesh) return;
      const material=mesh.material.clone(); mesh.material=material;
      if(material.name==='Generalia | compact coat and foot skin') {
        material.normalScale.set(.15,.15);material.specularIntensity=.15;material.sheen=.2;
      } else if(material.name==='Generalia | compact guard hairs') {
        material.roughness=.9;material.specularIntensity=.08;material.anisotropy=.15;
      }
    });
    const setFade = (root, opacity, save=false) => root.traverse(mesh=>{
      if(!mesh.isMesh) return;
      for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])) {
        if(!material) continue;
        if(save && !originalMaterialState.has(material)) originalMaterialState.set(material,{transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite});
        const base=originalMaterialState.get(material) ?? {opacity:1};
        const transparent=opacity<.999 || base.transparent;
        if(material.transparent!==transparent) material.needsUpdate=true;
        material.transparent=transparent;
        material.opacity=base.opacity*opacity;
        material.depthWrite=opacity>.985 ? base.depthWrite : false;
      }
    });
    const restoreFade = root => root.traverse(mesh=>{
      if(!mesh.isMesh) return;
      for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material])) {
        const base=originalMaterialState.get(material); if(!base) continue;
        if(material.transparent!==base.transparent)material.needsUpdate=true;
        material.transparent=base.transparent; material.opacity=base.opacity; material.depthWrite=base.depthWrite;
      }
    });
    skeleton.rotation.y=Math.PI/2;
    const normalize=root=>{
      root.updateMatrixWorld(true);
      let bounds=new THREE.Box3().setFromObject(root);
      const scale=2/bounds.getSize(new THREE.Vector3()).x;
      root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);
      bounds=new THREE.Box3().setFromObject(root);
      root.position.sub(bounds.getCenter(new THREE.Vector3()));root.updateMatrixWorld(true);
    };
    normalize(skeleton);
    if(document.body.dataset.livingNormalization){const response=await fetch(document.body.dataset.livingNormalization);if(!response.ok)throw new Error('Candidate baseline transform unavailable');const baseline=await response.json();living.scale.multiplyScalar(baseline.scale);living.position.sub(new THREE.Vector3(...baseline.center).multiplyScalar(baseline.scale));living.updateMatrixWorld(true);}
    else normalize(living);
    const display=new THREE.Group();display.add(skeleton,living);scene.add(display);
    const xrayShutter=document.createElement('div');xrayShutter.className='xray-shutter';xrayShutter.setAttribute('aria-hidden','true');xrayShutter.hidden=true;
    const xrayCover=document.createElement('div');xrayCover.className='xray-panel xray-cover';
    const xrayTop=document.createElement('div');xrayTop.className='xray-panel xray-panel-top';
    const xrayBottom=document.createElement('div');xrayBottom.className='xray-panel xray-panel-bottom';
    const xrayLeft=document.createElement('div');xrayLeft.className='xray-panel xray-panel-left';
    const xrayRight=document.createElement('div');xrayRight.className='xray-panel xray-panel-right';
    const xrayLine=document.createElement('div');xrayLine.className='xray-scan-line';
    const xrayLineBottom=document.createElement('div');xrayLineBottom.className='xray-scan-line xray-scan-line-bottom';
    const xrayLineRight=document.createElement('div');xrayLineRight.className='xray-scan-line vertical xray-scan-line-right';
    const xrayDevice=document.createElement('div');xrayDevice.className='xray-device';
    const xrayRings=Array.from({length:3},(_,i)=>{const ring=document.createElement('div');ring.className='xray-ripple';ring.dataset.ring=String(i);return ring;});
    const xrayBands=Array.from({length:10},(_,i)=>{const band=document.createElement('div');band.className='xray-band';band.dataset.band=String(i);return band;});
    xrayShutter.append(xrayCover,xrayTop,xrayBottom,xrayLeft,xrayRight,xrayLine,xrayLineBottom,xrayLineRight,xrayDevice,...xrayRings,...xrayBands);
    document.querySelector('#viewer-stage').append(xrayShutter);
    const setShutter=(progress,covering,style)=>{
      xrayShutter.style.background='transparent';xrayCover.style.clipPath='none';xrayCover.style.opacity='1';xrayCover.style.transform='';xrayCover.style.height='100%';xrayCover.style.width='100%';
      for(const element of [xrayCover,xrayTop,xrayBottom,xrayLeft,xrayRight,xrayLine,xrayLineBottom,xrayLineRight,xrayDevice,...xrayRings,...xrayBands])element.hidden=true;
      if(style==='tablet'){xrayDevice.hidden=false;xrayLine.hidden=false;if(covering){xrayTop.hidden=false;xrayTop.style.height=(progress*100)+'%';xrayDevice.style.top=(progress*100)+'%';xrayLine.style.top=(progress*100)+'%';}else{xrayBottom.hidden=false;xrayBottom.style.height=((1-progress)*100)+'%';xrayDevice.style.top=(progress*100)+'%';xrayLine.style.top=(progress*100)+'%';}}
      else if(style==='drag'){if(covering){xrayCover.hidden=false;xrayCover.style.opacity=String(progress);}else{xrayRight.hidden=false;xrayRight.style.width=((1-progress)*100)+'%';xrayLineRight.hidden=false;xrayLineRight.style.left=(progress*100)+'%';}}
      else if(style==='ripple'){if(covering){xrayCover.hidden=false;xrayCover.style.opacity=String(progress);}else{const radius=progress*155;xrayCover.hidden=false;xrayCover.style.background='radial-gradient(circle at 50% 50%, transparent '+Math.max(0,radius-1)+'%, #000 '+Math.min(100,radius+2)+'%)';xrayRings.forEach((ring,i)=>{ring.hidden=false;const size=Math.max(0,progress*160-i*22);ring.style.width=size+'%';ring.style.height=size+'%';ring.style.opacity=String(Math.max(0,1-progress*.72-i*.18));});}}
      else if(style==='fold'){xrayCover.hidden=false;xrayCover.style.background='#030908';xrayCover.style.transformOrigin='left center';if(covering){xrayCover.style.transform='';xrayCover.style.opacity=String(progress);}else{xrayCover.style.clipPath='inset(0 '+(progress*100)+'% 0 0)';xrayCover.style.transform='perspective(900px) rotateY('+(progress*18)+'deg)';xrayCover.style.opacity='1';}}
      else if(style==='glitch'){if(covering){xrayCover.hidden=false;xrayCover.style.opacity=String(progress);}else{xrayBands.forEach((band,i)=>{band.hidden=false;const local=Math.max(0,Math.min(1,(progress*2.1)-(i%2===0?i/16:(9-i)/16)));band.style.top=(i*10)+'%';band.style.height='10.2%';band.style.width=((1-local)*100)+'%';band.style.left=i%2===0?'0':'auto';band.style.right=i%2===0?'auto':'0';});}}
    };
    const pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment();
    const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;
    scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
    onStats(meshes,triangles);resize();frameModel(display);
    living.visible=false;skeleton.visible=true;loading.hidden=true;
    const signature=()=>{
      let hash=2166136261;
      skeleton.traverse(mesh=>{
        if(!mesh.isMesh)return;
        for(const array of [mesh.geometry.getAttribute('position').array,mesh.geometry.index?.array]) {
          if(!array)continue;
          const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
          for(const byte of bytes) hash=Math.imul(hash^byte,16777619)>>>0;
        }
      });
      return hash.toString(16);
    };
    const initialSignature=signature();let state='ivory',transitionFrame=0,displayLiving=0,displaySkeleton=1,xrayActive=false,xrayProgress=0,xrayPhase='idle',transitionStyle='tablet';
    const stage=document.querySelector('#viewer-stage'),xrayHint=document.querySelector('#xray-hint'),transitionHUD=document.querySelector('#transition-hud'),transitionRange=document.querySelector('#transition-range');
    const setCursorHint=(text,show=true)=>{xrayHint.textContent=text;xrayHint.hidden=!show;};
    const motionV2=document.body.dataset.motionV2==='true';
    const motionV4=document.body.dataset.motionV4==='true';
    const v2ModeIds={shutters:0,beam:1,lens:2,wave:3,grain:4,scanner:5};
    let v2Mode='shutters',v2Transition={active:false,from:'living',to:'ivory',progress:0,frame:0};
    let v2Targets=null,v2Material=null,v2CompositeScene=null,v2CompositeCamera=null;
    if(motionV2) {
      const drawingSize=renderer.getDrawingBufferSize(new THREE.Vector2());
      const target=()=>{const rt=new THREE.WebGLRenderTarget(Math.max(1,drawingSize.x),Math.max(1,drawingSize.y),{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false});rt.texture.colorSpace=THREE.SRGBColorSpace;rt.texture.generateMipmaps=false;return rt;};
      v2Targets={from:target(),to:target()};
      v2CompositeScene=new THREE.Scene();v2CompositeCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);v2CompositeCamera.position.z=1;
      v2Material=new THREE.ShaderMaterial({uniforms:{uFrom:{value:v2Targets.from.texture},uTo:{value:v2Targets.to.texture},uProgress:{value:0},uMode:{value:0},uPointer:{value:new THREE.Vector2(.5,.5)},uResolution:{value:new THREE.Vector2(drawingSize.x,drawingSize.y)}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:`
        varying vec2 vUv;
        uniform sampler2D uFrom;
        uniform sampler2D uTo;
        uniform float uProgress;
        uniform float uMode;
        uniform vec2 uPointer;
        uniform vec2 uResolution;
        uniform vec4 uRect;
        float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
        float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),f.x),f.y);}
        void main(){
          vec4 a=texture2D(uFrom,vUv),b=texture2D(uTo,vUv);
          float p=clamp(uProgress,0.0,1.0),m=p,edge=2.0;
          if(uMode<0.5){float d=abs(vUv.x-0.5);m=1.0-smoothstep(p*0.5-0.006,p*0.5+0.006,d);edge=abs(d-p*0.5);}
          else if(uMode<1.5){m=1.0-smoothstep(p-0.009,p+0.009,vUv.y);edge=abs(vUv.y-p);}
          else if(uMode<2.5){vec2 d=(vUv-uPointer)*uResolution;float r=p*length(uResolution);float distanceToLens=length(d);m=1.0-smoothstep(r-3.0,r+3.0,distanceToLens);edge=abs(distanceToLens-r)/max(uResolution.y,1.0);}
          else if(uMode<3.5){float n=noise2(vUv*vec2(5.0,3.0));float front=(p*1.18-vUv.x*1.18)+(n-0.5)*0.11;m=smoothstep(-0.012,0.012,front);edge=abs(front);}
          else if(uMode<4.5){float n=noise2(floor(vUv*vec2(92.0,54.0)));m=smoothstep(n-0.035,n+0.035,p);edge=abs(p-n);}
          else {vec2 center=(uRect.xy+uRect.zw)*0.5*uResolution;vec2 halfSize=(uRect.zw-uRect.xy)*0.5*uResolution;vec2 q=abs(vUv*uResolution-center)-halfSize+vec2(10.0);float sd=length(max(q,0.0))+min(max(q.x,q.y),0.0)-10.0;m=1.0-smoothstep(-0.8,0.8,sd);}
          if(uMode<4.5){if(p<0.0001)m=0.0;if(p>0.9999)m=1.0;}
          vec3 color=mix(a.rgb,b.rgb,m);
          float line=1.0-smoothstep(0.004,0.014,edge);
          if(p>0.015&&p<0.985)color=mix(color,vec3(0.24,0.86,0.91),line*0.48);
          gl_FragColor=vec4(color,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,depthTest:false,depthWrite:false,toneMapped:false});
      v2Material.uniforms.uRect={value:new THREE.Vector4(.35,.15,.72,.85)};
      const plane=new THREE.Mesh(new THREE.PlaneGeometry(2,2),v2Material);plane.frustumCulled=false;v2CompositeScene.add(plane);
      const syncV2Targets=()=>{renderer.getDrawingBufferSize(drawingSize);if(v2Targets.from.width!==drawingSize.x||v2Targets.from.height!==drawingSize.y){v2Targets.from.setSize(drawingSize.x,drawingSize.y);v2Targets.to.setSize(drawingSize.x,drawingSize.y);v2Material.uniforms.uResolution.value.set(drawingSize.x,drawingSize.y);}};
      const renderState=(which,rt)=>{living.visible=which==='living';skeleton.visible=which!=='living';if(surfaceColors){if(which==='anatomy')surfaceColors.apply();else surfaceColors.restore(ivory);}renderer.setRenderTarget(rt);renderer.clear();renderer.render(scene,camera);};
      window.generaliaCompositeRender=()=>{
        if(!v2Transition.active){renderer.render(scene,camera);return;}
        syncV2Targets();const oldLiving=living.visible,oldSkeleton=skeleton.visible,oldBackground=scene.background.clone();
        scene.background.set('#202522');renderState(v2Transition.from,v2Targets.from);if(motionV4)scene.background.set('#000000');renderState(v2Transition.to,v2Targets.to);
        living.visible=oldLiving;skeleton.visible=oldSkeleton;if(surfaceColors){if(state==='anatomy')surfaceColors.apply();else surfaceColors.restore(ivory);}scene.background.copy(oldBackground);
        renderer.setRenderTarget(null);v2Material.uniforms.uMode.value=v2ModeIds[v2Mode]??0;v2Material.uniforms.uProgress.value=v2Transition.progress;renderer.render(v2CompositeScene,v2CompositeCamera);
      };
      stage.addEventListener('pointermove',event=>{if(v2Mode!=='lens'||!v2Material)return;const r=stage.getBoundingClientRect();v2Material.uniforms.uPointer.value.set((event.clientX-r.left)/r.width,1-(event.clientY-r.top)/r.height);if(v2Transition.active)render();});
    }
    const finishTransition=next=>{transitionFrame=0;xrayActive=false;xrayPhase='idle';xrayProgress=1;xrayShutter.hidden=true;transitionHUD.hidden=true;xrayHint.hidden=true;displayLiving=next==='living'?1:0;displaySkeleton=1-displayLiving;living.visible=next==='living';skeleton.visible=next!=='living';scene.background.set(next==='living'?'#202522':'#000000');render();};
    const ease=value=>value<.5?4*value*value*value:1-Math.pow(-2*value+2,3)/2;
    const animateTo=(next, immediate=false, previous=null,onCovered=()=>{})=>{
      if(motionV4){v2Mode='scanner';v2Transition.from='living';v2Transition.to=next==='living'?'ivory':next;v2Transition.active=next!=='living';v2Transition.progress=1;living.visible=true;skeleton.visible=false;scene.background.set('#202522');window.generaliaScannerUi?.setActive(next);render();return;}
      if(motionV2){
        if(v2Transition.frame)cancelAnimationFrame(v2Transition.frame);v2Transition.frame=0;
        if(immediate||previous===null||previous===next){v2Transition.active=false;living.visible=next==='living';skeleton.visible=next!=='living';if(surfaceColors){if(next==='anatomy')surfaceColors.apply();else surfaceColors.restore(ivory);}render();return;}
        if(v2Transition.active){v2Transition.active=false;living.visible=previous==='living';skeleton.visible=previous!=='living';if(surfaceColors){if(previous==='anatomy')surfaceColors.apply();else surfaceColors.restore(ivory);}}
        v2Transition.from=previous;v2Transition.to=next;v2Transition.progress=0;v2Transition.active=true;xrayActive=true;
        const tray=document.querySelector('#v2-transition-tray'),range=document.querySelector('#v2-transition-progress'),fromLabel=document.querySelector('#v2-from-label'),toLabel=document.querySelector('#v2-to-label');
        if(tray){tray.hidden=false;range.value='0';fromLabel.textContent=previous==='living'?'Living':previous==='ivory'?'Ivory skeleton':'Anatomy colors';toLabel.textContent=next==='living'?'Living':next==='ivory'?'Ivory skeleton':'Anatomy colors';}
        let start=performance.now();const duration=1100;
        const tick=now=>{const t=Math.min(1,(now-start)/duration);v2Transition.progress=ease(t);range.value=String(Math.round(t*100));render();if(t<1)v2Transition.frame=requestAnimationFrame(tick);else{v2Transition.frame=0;v2Transition.progress=1;xrayActive=false;render();}};
        v2Transition.frame=requestAnimationFrame(tick);return;
      }
      const interruptedWipe=xrayActive;
      if(transitionFrame) cancelAnimationFrame(transitionFrame);
      transitionFrame=0;
      xrayActive=false;xrayShutter.hidden=true;xrayPhase='idle';transitionHUD.hidden=true;xrayHint.hidden=true;
      if(interruptedWipe){
        onCovered();
        living.visible=next==='living';skeleton.visible=next!=='living';
        displayLiving=next==='living'?1:0;displaySkeleton=1-displayLiving;
        setFade(living,displayLiving,true);setFade(skeleton,displaySkeleton,true);
        scene.background.set(next==='living'?'#202522':'#000000');render();return;
      }
      if(next!=='ivory')scene.background.set('#202522');
      const toLiving=next==='living'?1:0,fromLiving=displayLiving,toSkeleton=1-toLiving,fromSkeleton=displaySkeleton;
      if(immediate||window.matchMedia('(prefers-reduced-motion: reduce)').matches){displayLiving=toLiving;displaySkeleton=toSkeleton;living.visible=toLiving>0;skeleton.visible=toSkeleton>0;setFade(living,toLiving,true);setFade(skeleton,toSkeleton,true);render();return;}
      if(previous!==null&&next!==previous&&(previous==='living'||next==='living')) {
        const fromRoot=previous==='living'?living:skeleton,toRoot=next==='living'?living:skeleton;
        displayLiving=previous==='living'?1:0;displaySkeleton=1-displayLiving;
        living.visible=fromRoot===living;skeleton.visible=fromRoot===skeleton;restoreFade(living);restoreFade(skeleton);
        scene.background.set('#000000');xrayActive=true;xrayPhase='cover';xrayProgress=0;xrayShutter.hidden=false;setShutter(0,true,transitionStyle);
        const start=performance.now(),coverDuration=transitionStyle==='drag'?180:140,revealDuration=transitionStyle==='drag'?0:500,duration=coverDuration+revealDuration;
        const tick=now=>{
          const elapsed=now-start;
          if(elapsed<coverDuration) {
            xrayPhase='cover';xrayProgress=Math.min(1,elapsed/coverDuration);const progress=ease(xrayProgress);
            displayLiving=previous==='living'?1-progress:0;displaySkeleton=previous==='living'?0:1-progress;
            fromRoot.visible=true;toRoot.visible=false;setShutter(progress,true,transitionStyle);
          } else {
            if(xrayPhase==='cover'){fromRoot.visible=false;toRoot.visible=true;onCovered();xrayPhase=transitionStyle==='drag'?'drag':'reveal';}
            if(transitionStyle==='drag'){xrayActive=true;xrayProgress=0;displayLiving=0;displaySkeleton=0;transitionRange.value='0';transitionHUD.hidden=false;xrayHint.hidden=true;setShutter(0,false,'drag');transitionFrame=0;render();return;}
            xrayProgress=Math.min(1,(elapsed-coverDuration)/revealDuration);const progress=ease(xrayProgress);
            displayLiving=next==='living'?progress:0;displaySkeleton=next==='living'?0:progress;setShutter(progress,false,transitionStyle);
          }
          render();
          if(elapsed<duration)transitionFrame=requestAnimationFrame(tick);
          else finishTransition(next);
        };
        transitionFrame=requestAnimationFrame(tick);return;
      }
      const start=performance.now(),duration=next==='ivory'&&previous==='living'?1150:480;
      living.visible=true;skeleton.visible=true;
      const tick=now=>{
        const t=Math.min(1,(now-start)/duration),e=ease(t);
        displayLiving=fromLiving+(toLiving-fromLiving)*e;displaySkeleton=fromSkeleton+(toSkeleton-fromSkeleton)*e;
        setFade(living,displayLiving,true);setFade(skeleton,displaySkeleton,true);render();
        if(t<1)transitionFrame=requestAnimationFrame(tick);
        else {transitionFrame=0;living.visible=toLiving>0;skeleton.visible=toSkeleton>0;restoreFade(living);restoreFade(skeleton);render();}
      };
      transitionFrame=requestAnimationFrame(tick);
    };
    const select=next=>{
      if(!['living','ivory','anatomy'].includes(next))throw new Error('Unknown view');
      const previous=state;state=next;
      const willUseShutter=motionV2?previous!==null&&next!==previous:previous!==null&&next!==previous&&(previous==='living'||next==='living')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const setColorState=()=>{if(surfaceColors){if(next==='anatomy')surfaceColors.apply();else surfaceColors.restore(ivory);}};
      animateTo(next, previous===null, previous, setColorState);
      if(!willUseShutter) {
        if(surfaceColors) {
        if(next==='anatomy')surfaceColors.apply();else surfaceColors.restore(ivory);
        }
      }
      document.querySelectorAll('[data-state]').forEach(button=>{
        const selected=button.dataset.state===next;button.classList.toggle('selected',selected);
        button.setAttribute('aria-current',String(selected));
        const status=button.querySelector('.state-status');
        if(status)status.textContent=selected?'SELECTED':button.dataset.state==='anatomy'?(colorsApproved?'REVIEWED GROUPS':'REGION DRAFT'):'VISUAL DRAFT';
      });
      document.querySelector('#draft-legend').hidden=next!=='anatomy';
      document.querySelector('.view-caption span').textContent=next==='living'?'LIVING / VISUAL DRAFT':next==='ivory'?'IVORY SKELETON':colorsApproved?'ANATOMY / REVIEWED GROUPS':'PROVISIONAL REGION COLORS';
      document.querySelector('.embed-title').textContent='VISUAL DRAFT · '+next.toUpperCase();
      document.querySelector('.viewer-footer').innerHTML='<span>'+next.toUpperCase()+'</span><span>'+(colorsApproved?'BODY FIT PROVISIONAL · COLORS BY SKELETAL GROUP':'BODY FIT AND COLORS UNVALIDATED')+'</span>';
        if(surfaceColors) {
          for(const legend of document.querySelectorAll('#draft-legend, #compact-color-legend')) {
          legend.replaceChildren();
        for(const group of surfaceColors.visible) {
          const row=document.createElement('div'),swatch=document.createElement('span');
          swatch.textContent='● ';swatch.style.color=group.hex;row.append(swatch,document.createTextNode(group.displayLabel || group.label));legend.append(row);
        }
        const row=document.createElement('div');row.textContent='Gray · unresolved surfaces';legend.append(row);
          }
      }
      render();
    };
    buttons.forEach(button=>{button.addEventListener('click',()=>select(button.dataset.state));button.disabled=false;});
    const transitionPicker=document.querySelector('.transition-picker');
    document.querySelectorAll('[data-transition-style]').forEach(button=>button.addEventListener('click',()=>{
      if(motionV2){
        v2Mode=button.dataset.transitionStyle;document.querySelectorAll('[data-transition-style]').forEach(option=>{option.setAttribute('aria-pressed',String(option===button));option.classList.toggle('active',option===button);});
        document.querySelector('#v2-mode-caption').textContent=button.dataset.modeTitle;return;
      }
      transitionStyle=button.dataset.transitionStyle;
      document.querySelector('#transition-picker-label').textContent='Transition: '+button.textContent;
      document.querySelectorAll('[data-transition-style]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));
      transitionPicker.open=false;
      setCursorHint('',false);select(state==='living'?'ivory':'living');
    }));
    transitionRange.addEventListener('input',()=>{if(xrayPhase!=='drag')return;const progress=Number(transitionRange.value)/100;xrayProgress=progress;displayLiving=state==='living'?progress:0;displaySkeleton=state==='living'?0:progress;setShutter(progress,false,'drag');render();});
    document.querySelector('#transition-finish').addEventListener('click',()=>{if(xrayPhase==='drag')finishTransition(state);});
    if(motionV2){
      const progressInput=document.querySelector('#v2-transition-progress'),tray=document.querySelector('#v2-transition-tray');
      const commitV2=()=>{if(v2Transition.frame)cancelAnimationFrame(v2Transition.frame);v2Transition.frame=0;v2Transition.active=false;xrayActive=false;v2Transition.progress=1;living.visible=state==='living';skeleton.visible=state!=='living';if(surfaceColors){if(state==='anatomy')surfaceColors.apply();else surfaceColors.restore(ivory);}if(tray)tray.hidden=true;render();};
      progressInput.addEventListener('input',()=>{if(v2Transition.frame)cancelAnimationFrame(v2Transition.frame);v2Transition.frame=0;v2Transition.active=true;xrayActive=true;v2Transition.progress=Number(progressInput.value)/100;render();});
      document.querySelector('#v2-finish').addEventListener('click',commitV2);
      document.querySelector('#v2-replay').addEventListener('click',()=>{if(!v2Transition.active)return;v2Transition.progress=0;progressInput.value='0';let start=performance.now();const play=now=>{const t=Math.min(1,(now-start)/1100);v2Transition.progress=ease(t);progressInput.value=String(Math.round(t*100));render();if(t<1)v2Transition.frame=requestAnimationFrame(play);else{v2Transition.frame=0;v2Transition.progress=1;render();}};v2Transition.frame=requestAnimationFrame(play);});
    }
    window.generaliaDraft={select,getSnapshot:()=>({state,geometrySignature:signature(),initialSignature,
      skeletonTriangles:triangles,
      fit:'Independent bounding-box display normalization; not anatomical registration',
      colors:colorsApproved?'Independently reviewed gross anatomical surface groups; fine boundaries unresolved':surfaceColors?'Explicit triangle memberships; independent review pending':'Broad spatial region proposal; no individual bone labels or approved face memberships',
      transition:{style:transitionStyle,livingReveal:displayLiving,skeletonReveal:displaySkeleton,livingVisible:living.visible,skeletonVisible:skeleton.visible,xrayShutterActive:xrayActive,xrayDirection:xrayPhase==='idle'?null:(state==='living'?'skeleton-to-living':'living-to-skeleton'),xrayPhase,xrayProgress,shutterHidden:xrayShutter.hidden},
      surfaceColorReview:surfaceColors?{groups:surfaceColors.visible,unresolvedTriangles:surfaceColors.unresolvedTriangles,drawGroups:surfaceColors.drawGroups}:null})};
    if(surfaceColors && new URLSearchParams(location.search).get('reviewColors')==='1') {
      window.generaliaColorSurfaces={
        isolate(id){select('anatomy');surfaceColors.isolate(id);render();},
        boundsFor(id){return surfaceColors.boundsFor(id);}
      };
    }
    const initialView=new URLSearchParams(location.search).get('view');
    state=null;select(['living','ivory','anatomy'].includes(initialView)?initialView:'ivory');
    if(motionV4){const {setupScanner}=await import('./scanner-v4.js?v=3');setupScanner({stage,select,highlight(id){surfaceColors?.highlight(id);render();},pick(x,y){const r=stage.getBoundingClientRect();return surfaceColors?.pick(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera);},groups:surfaceColors?.visible??[],setRect(rect){v2Material.uniforms.uRect.value.set(...rect);render();},initialState:state});}
    if(document.body.dataset.motionV3==='true') {
      const { setupInstruments }=await import('./instruments-v3.js?v=1');
      setupInstruments({THREE,scene,camera,living,skeleton,surfaceColors,ivory,render});
    }
    window.addEventListener('beforeunload',()=>{environment.dispose();ivory.dispose();surfaceColors?.dispose();});
  } catch(exception) {onError('Could not prepare the three-view draft: '+exception.message);}
}
