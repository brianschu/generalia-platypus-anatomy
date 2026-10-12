(() => {
  const themes = {
    1: {name:'Monotreme / scan system', tag:'FIELD INTERFACE 01', key:'Skeletal channels', keyTag:'SELECT A CHANNEL', scanner:'BIO SCANNER', screen:'SURFACE / LIVE', motion:'slide'},
    2: {name:'Waratah Media Lab', tag:'PLATYPUS.EXE', key:'Anatomy playlist', keyTag:'11 TRACKS · SELECT TO EXPLORE', scanner:'Anatomy Player', screen:'Now viewing', motion:'window'},
    3: {name:'Waratah Desktop', tag:'SPECIMEN STUDIO', key:'Anatomy palette', keyTag:'SELECT A COLOUR GROUP', scanner:'Specimen Preview', screen:'Live preview', motion:'dock'},
    4: {name:'Waves / Anatomy', tag:'FORM BENEATH THE SURFACE', key:'Colour frequencies', keyTag:'TUNE INTO A SKELETAL GROUP', scanner:'UNDER THE WAVES', screen:'ANATOMY FREQUENCY', motion:'wave'},
    5: {name:'Form + Function', tag:'A VERY CURIOUS ANIMAL', key:'Bones in colour', keyTag:'PICK A SHAPE. FIND ITS BONES.', scanner:'LOOK INSIDE!', screen:'A different point of view', motion:'bounce'},
    6: {name:'Specimen / 001', tag:'GENERALIA INTERACTIVE', key:'Select a system', keyTag:'YOUR ANATOMY MENU', scanner:'ANATOMY PORTAL', screen:'VIEW / ACTIVE', motion:'console'},
    7: {name:'Platypus Quest', tag:'ANATOMY / PRESS START', key:'Bone inventory', keyTag:'SELECT AN ITEM TO EXPLORE', scanner:'SCAN WINDOW', screen:'PLAYER VIEW', motion:'pixel'},
    8: {name:'Generalia / Atlas', tag:'INTERACTIVE NATURAL HISTORY', key:'Skeletal index', keyTag:'EXPLORE THE ANATOMY', scanner:'Anatomy Explorer', screen:'Interactive illustration', motion:'page'},
    9: {name:'Monotreme Imaging', tag:'ANATOMICAL EXPLORATION', key:'Anatomical channels', keyTag:'SURFACE GROUP SELECTION', scanner:'IMAGING WINDOW', screen:'LIVE / ANATOMY', motion:'scan'},
    10: {name:'Inside / Out', tag:'A STUDY IN FORM & COLOUR', key:'The colour edit', keyTag:'CHOOSE A GROUP. SEE IT GLOW.', scanner:'TAKE A LOOK', screen:'Inside the platypus', motion:'stamp'}
  };
  const stage = document.querySelector('#viewer-stage');
  const card = document.querySelector('.viewer-card');
  const masthead = document.createElement('header');
  masthead.className = 'lab-masthead';
  masthead.innerHTML = '<div class="lab-emblem" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M9 31c-8 0-8-7-1-8l6-1c2-9 17-13 25-5 5 5 4 11-1 14l-1 6h-5l-2-5H20l-2 5h-5l-1-6Z"/><circle cx="16" cy="23" r="1.5"/></svg></div><div><span class="lab-eyebrow"></span><h1 class="lab-title"></h1></div><span class="lab-view-indicator">LIVING · IVORY · ANATOMY</span>';
  card.before(masthead);
  const overlay = document.createElement('div');
  overlay.className = 'lab-decoration';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<span class="lab-corner corner-a"></span><span class="lab-corner corner-b"></span><span class="lab-orbit orbit-a"></span><span class="lab-orbit orbit-b"></span><span class="lab-shape shape-a"></span><span class="lab-shape shape-b"></span><span class="lab-stage-mark">GENERALIA</span>';
  stage.append(overlay);
  document.querySelector('.picker-heading span').textContent = 'Choose a visual world · Edition 02';
  const buttons = [...document.querySelectorAll('[data-design-choice]')];
  let paint = () => {};
  let animationFrame = 0;
  let installedKey = null;
  let lastLayoutDesign = null;
  let design = String(new URLSearchParams(location.search).get('style') || 1);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const icons = ['M4 5h16v3H4zm2 6h12v3H6zm2 6h8v3H8', 'M12 3v18M7 6l10 4M7 11l10 4M7 16l10 4', 'M5 8c0-7 14-7 14 0v8l-4 4H9l-4-4zm3 3h2m4 0h2m-5 5h2', 'M3 18L9 5l3 4 3-4 6 13M7 13h10', 'M4 7l5 2 3-5 3 5 5-2-2 13H6Z', 'M6 4l12 16M5 6l4-3m7 18 4-3', 'M6 4l4 16m4-16 4 16M4 8h16', 'M7 21V9m3 11V4m3 16V3m3 17V6m3 14V10M7 17l-4-5', 'M7 3l10 18M5 5l4-3m6 20 4-3', 'M7 3l2 18m6-18 2 18M5 17h14', 'M4 19l5-6 4 3 7-2v6H4', 'M4 4l16 16M20 4 4 20'];
  function decorateKey(key) {
    if (!key) return;
    if (installedKey !== key) {
      installedKey = key;
      key.querySelectorAll('.scanner-key-items > button').forEach((row, i) => {
        const swatch = row.querySelector('i');
        const labelText = row.textContent.trim();
        row.replaceChildren();
        const number = document.createElement('span'); number.className = 'key-number'; number.textContent = String(i + 1).padStart(2, '0');
        const symbol = document.createElement('span'); symbol.className = 'key-symbol'; symbol.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[i % icons.length]}"/></svg>`;
        const label = document.createElement('span'); label.className = 'key-label'; label.textContent = labelText;
        const marker = document.createElement('span'); marker.className = 'key-marker'; marker.textContent = '↗'; marker.setAttribute('aria-hidden','true');
        row.append(number, swatch, symbol, label, marker);
        row.style.setProperty('--row', i);
      });
    }
    key.querySelector('.scanner-key-title strong').textContent = themes[design].key;
    key.querySelector('.scanner-key-title span').textContent = themes[design].keyTag;
    if(!key.querySelector('.key-help')){const help=document.createElement('p');help.className='key-help';help.textContent='Hover to highlight · Click to explore';key.append(help);}
  }
  function decorateControls() {
    const states = {living:['01','Living','Exterior'], ivory:['02','Ivory skeleton','Beneath the surface'], anatomy:['03','Anatomy colors','Explore the colour key']};
    document.querySelectorAll('.draft-switchbar [data-state]').forEach(button => {
      if (button.querySelector('.state-label')) {button.querySelector('.state-sub').hidden=false;return;}
      const [number, title, sub] = states[button.dataset.state];
      button.innerHTML = `<span class="control-number">${number}</span><span class="state-label">${title}<small class="state-sub">${sub}</small></span>`;
    });
  }
  const entries = {
    1: [{transform:'translateX(36px)',clipPath:'inset(0 0 0 100%)'}, {transform:'translateX(0)',clipPath:'inset(0)'}],
    2: [{transform:'translateY(20px) scale(.9)',opacity:.45},{transform:'translateY(0) scale(1)',opacity:1}],
    3: [{transform:'translateY(45px) scale(.7)',opacity:.5},{transform:'translateY(-3px) scale(1.015)',opacity:1},{transform:'none',opacity:1}],
    4: [{transform:'translateX(-24px) scaleX(.93)',opacity:.55},{transform:'translateX(3px) scaleX(1.01)',opacity:1},{transform:'none',opacity:1}],
    5: [{transform:'translateY(24px) scale(.78)',opacity:.5},{transform:'translateY(-5px) scale(1.04)',opacity:1},{transform:'none',opacity:1}],
    6: [{transform:'scale(.65)',opacity:.35},{transform:'scale(1.025)',opacity:1},{transform:'none',opacity:1}],
    7: [{clipPath:'inset(100% 0 0)',transform:'translateY(12px)'},{clipPath:'inset(0)',transform:'translateY(0)'}],
    8: [{transform:'translateY(12px) scaleY(.94)',opacity:.4},{transform:'none',opacity:1}],
    9: [{clipPath:'inset(0 50% 0 50%)',filter:'brightness(1.8)'},{clipPath:'inset(0)',filter:'brightness(1)'}],
    10: [{transform:'translateY(-18px) scale(.82)',opacity:.5},{transform:'translateY(2px) scale(1.03)',opacity:1},{transform:'none',opacity:1}]
  };
  const keyEntries = {
    1: [{transform:'translateX(24px)',opacity:0},{transform:'none',opacity:1}],
    2: [{clipPath:'inset(0 0 100%)'},{clipPath:'inset(0)'}],
    3: [{transform:'translateY(-25px) scale(.96)',opacity:0},{transform:'translateY(3px) scale(1.01)',opacity:1},{transform:'none',opacity:1}],
    4: [{transform:'translateY(-20px)',filter:'hue-rotate(40deg)',opacity:0},{transform:'none',filter:'hue-rotate(0deg)',opacity:1}],
    5: [{transform:'translateY(-18px) rotate(2deg)',opacity:0},{transform:'translateY(3px) rotate(-.5deg)',opacity:1},{transform:'none',opacity:1}],
    6: [{transform:'translateY(22px) scale(.95)',opacity:0},{transform:'none',opacity:1}],
    7: [{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],
    8: [{clipPath:'inset(0 0 100%)',opacity:.5},{clipPath:'inset(0)',opacity:1}],
    9: [{clipPath:'inset(0 0 100%)'},{clipPath:'inset(0)'}],
    10: [{transform:'translateY(-18px) rotate(-1deg)',opacity:0},{transform:'none',opacity:1}]
  };
  function trackFrame(duration) {
    cancelAnimationFrame(animationFrame);
    const start = performance.now();
    const tick = now => { paint(); if (now - start < duration + 80) animationFrame = requestAnimationFrame(tick); else {animationFrame = 0; paint();} };
    animationFrame = requestAnimationFrame(tick);
  }
  function animateKey(key) {
    if (!key || key.hidden || reduce.matches) return;
    key.getAnimations().forEach(animation => animation.cancel());
    const duration = design === '7' ? 360 : 480;
    key.animate(keyEntries[design], {duration,easing:design==='7'?'steps(7,end)':'cubic-bezier(.18,.85,.3,1)'});
    key.querySelectorAll('.scanner-key-items > button').forEach((row, i) => {
      row.getAnimations().forEach(animation=>animation.cancel());
      const pop = ['5','6','10'].includes(design);
      const distance = design === '1' || design === '9' ? 'translateX(12px)' : `translateY(${pop?18:8}px)${pop?` rotate(${i%2?2:-2}deg)`:''}`;
      row.animate([{opacity:0,transform:distance},{opacity:1,transform:'none'}],{duration:pop?340:230,delay:50+i*(design==='7'?18:24),easing:design==='7'?'steps(3,end)':'cubic-bezier(.16,.85,.25,1)',fill:'backwards'});
    });
  }
  function restyle() {
    const theme = themes[design];
    masthead.querySelector('.lab-eyebrow').textContent = theme.tag;
    masthead.querySelector('.lab-title').textContent = theme.name;
    decorateControls();
    const frame = stage.querySelector('.scan-tablet');
    const key = document.querySelector('.scanner-key');
    decorateKey(key);
    if (frame) {
      if(window.generaliaScannerUi && lastLayoutDesign!==design){lastLayoutDesign=design;window.generaliaScannerUi.center();}
      frame.querySelector('.scan-handle strong').textContent = theme.scanner;
      frame.querySelector('.scan-screen-label').textContent = theme.screen;
      frame.querySelector('.scan-bottom span:last-child').textContent = ['2','3','8'].includes(design) ? 'Drag to explore' : '↔ MOVE / ↘ RESIZE';
      frame.querySelector('.scan-grip').textContent = ['2','3','8'].includes(design) ? '▣' : design === '7' ? '✚' : design === '10' ? '✳' : '⠿';
    }
    if (key && !key.hidden) animateKey(key);
  }
  const setDesign = value => {
    design = String(Math.max(1, Math.min(10, Number(value) || 1)));
    document.body.dataset.design = design;
    document.body.dataset.labMotion = themes[design].motion;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.designChoice === design)));
    const url = new URL(location.href); url.searchParams.set('style', design); history.replaceState(null,'',url);
    restyle();
    window.dispatchEvent(new CustomEvent('lab:design',{detail:{design:Number(design)}}));
    trackFrame(560);
  };
  buttons.forEach(button => { button.title=themes[button.dataset.designChoice].name; button.addEventListener('click',()=>setDesign(button.dataset.designChoice)); });
  window.generaliaLabUi = {
    scannerBox() {
      const layouts={1:[.25,.09,.5,.82],2:[.16,.18,.68,.63],3:[.22,.1,.56,.78],4:[.1,.24,.8,.52],5:[.2,.13,.6,.72],6:[.2,.1,.6,.78],7:[.15,.16,.7,.68],8:[.17,.12,.66,.76],9:[.23,.06,.54,.86],10:[.2,.12,.6,.76]};
      const [x,y,w,h]=layouts[design];return {x,y,w,h};
    },
    onState({state,previous,frame,key,paint:repaint}) {
      paint = repaint;
      document.body.dataset.labView = state;
      const url=new URL(location.href);url.searchParams.set('view',state);history.replaceState(null,'',url);
      masthead.querySelector('.lab-view-indicator').textContent=state==='anatomy'?'03 / ANATOMY COLOURS':state==='ivory'?'02 / IVORY SKELETON':'01 / LIVING SPECIMEN';
      restyle();
      if (!reduce.matches && state !== 'living' && (previous === 'living' || previous == null)) {
        frame.getAnimations().forEach(animation=>animation.cancel());
        frame.animate(entries[design],{duration:design==='7'?380:540,easing:design==='7'?'steps(6,end)':'cubic-bezier(.16,.86,.28,1)'});
        trackFrame(560);
      } else trackFrame(500);
      window.dispatchEvent(new CustomEvent('lab:state',{detail:{state,previous}}));
    }
  };
  new MutationObserver(() => { if (document.querySelector('.scanner-key') !== installedKey) restyle(); }).observe(card,{childList:true,subtree:true});
  document.querySelector('.design-picker').addEventListener('keydown',event => {
    if(!['ArrowLeft','ArrowRight'].includes(event.key) || !event.target.matches('[data-design-choice]'))return;
    event.preventDefault();const next=(Number(design)-1+(event.key==='ArrowRight'?1:9))%10+1;setDesign(next);buttons[next-1].focus();
  });
  setDesign(design);
})();
