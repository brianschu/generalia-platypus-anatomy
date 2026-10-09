import * as THREE from 'three';

// Paint existing triangles. This never moves, deletes, splits or adds a face.
// Index triplets are sorted once for efficient rendering, identically in both states.
export async function prepareAnatomySurfaceColors(skeleton, manifestUrl) {
  const response = await fetch(manifestUrl, {cache:'no-store'});
  if (!response.ok) throw new Error('Anatomy color assignments unavailable');
  const manifest = await response.json();
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.groups)) throw new Error('Invalid anatomy color assignments');
  const meshes=[];
  skeleton.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
  if(meshes.length!==1) throw new Error('Anatomy assignments require the inspected single skeleton surface');
  const mesh=meshes[0], geometry=mesh.geometry;
  const count=(geometry.index?.count ?? geometry.attributes.position.count)/3;
  if(!Number.isInteger(count) || count!==manifest.triangleCount) throw new Error('Anatomy assignments do not match the skeleton');
  const bytes=await (await fetch('./assets/skeleton.glb',{cache:'no-store'})).arrayBuffer();
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==manifest.sourceGlbSha256?.toLowerCase()) throw new Error('Anatomy assignments refer to a different skeleton');
  const labels=new Uint16Array(count), occupied=new Uint8Array(count);
  const materials=[new THREE.MeshStandardMaterial({color:'#A5A69F',roughness:.88})];
  const visible=[],ids=new Set();
  const preview=new URLSearchParams(location.search).get('reviewColors')==='1';
  let approval=null;
  if(!preview) {
    if(!manifest.independentReview?.url)throw new Error('Independent anatomy review unavailable');
    const proof=await fetch(manifest.independentReview.url,{cache:'no-store'});
    if(!proof.ok)throw new Error('Independent anatomy review unavailable');
    approval=await proof.json();
    if(approval.overallDecision!=='PASS' || approval.sourceGlbSha256!==hash || approval.candidateManifestSha256!==manifest.independentReview.candidateManifestSha256)throw new Error('Anatomy review identity mismatch');
  }
  for(const group of manifest.groups) {
    if(!group.id || !group.label || !/^#[0-9a-f]{6}$/i.test(group.hex) || !Array.isArray(group.triangleIndices)) throw new Error('Invalid anatomy group');
    if(ids.has(group.id))throw new Error('Duplicate anatomy group identity');ids.add(group.id);
    if(approval) {
      const proof=approval.groups.find(record=>record.id===group.reviewedCandidateId);
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(group.triangleIndices.join(',')));
      const membershipHash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
      if(!proof || proof.decision!=='PASS' || proof.triangleCount!==group.triangleIndices.length || proof.triangleIndicesSha256!==membershipHash || group.reviewStatus!=='PASS')throw new Error('Anatomical memberships differ from independent review');
    }
    const approved=group.reviewStatus==='PASS';
    const slot=approved || preview ? materials.length : 0;
    if(slot) {
      materials.push(new THREE.MeshStandardMaterial({name:group.id,color:group.hex,roughness:.88}));
      visible.push({id:group.id,label:group.label,displayLabel:group.displayLabel,hex:group.hex,reviewStatus:group.reviewStatus});
    }
    for(const triangle of group.triangleIndices) {
      if(!Number.isInteger(triangle) || triangle<0 || triangle>=count || occupied[triangle]) throw new Error('Overlapping or invalid anatomical surface memberships');
      occupied[triangle]=1;labels[triangle]=slot;
    }
  }
  const originalGroups=geometry.groups.map(group=>({...group}));
  if(originalGroups.length>1 || originalGroups.some(group=>group.materialIndex!==0 || group.start!==0 || group.count!==count*3))throw new Error('Anatomy surface requires the audited single-material skeleton');
  if(!geometry.index) throw new Error('Anatomy surface requires the audited indexed geometry');
  const originalIndex=geometry.index.array;
  const reordered=new originalIndex.constructor(originalIndex.length);
  const groups=[],permutation=new Uint32Array(count);let cursor=0;
  for(let slot=0;slot<materials.length;slot++) {
    const start=cursor;
    for(let triangle=0;triangle<count;triangle++) {
      if(labels[triangle]!==slot)continue;
      permutation[cursor/3]=triangle;
      for(let corner=0;corner<3;corner++)reordered[cursor++]=originalIndex[triangle*3+corner];
    }
    if(cursor>start)groups.push({start,count:cursor-start,materialIndex:slot});
  }
  if(cursor!==originalIndex.length)throw new Error('Incomplete anatomy surface partition');
  // Verify exact triangle preservation, including winding and multiplicity.
  const seen=new Uint8Array(count);
  for(let triangle=0;triangle<count;triangle++) {
    const original=permutation[triangle];
    if(seen[original])throw new Error('Repeated anatomy triangle');seen[original]=1;
    for(let corner=0;corner<3;corner++) {
      if(reordered[triangle*3+corner]!==originalIndex[original*3+corner])throw new Error('Anatomy geometry changed');
    }
  }
  geometry.setIndex(new THREE.BufferAttribute(reordered,1));
  const apply=()=>{geometry.clearGroups();for(const group of groups)geometry.addGroup(group.start,group.count,group.materialIndex);mesh.material=materials;};
  const restore=material=>{geometry.clearGroups();for(const group of originalGroups)geometry.addGroup(group.start,group.count,group.materialIndex);mesh.material=material;};
  const isolate=id=>{
    materials.forEach((material,slot)=>material.visible=!id || (slot>0 && visible[slot-1].id===id));
  };
  const boundsFor=id=>{
    const box=new THREE.Box3(),point=new THREE.Vector3();
    const slot=visible.findIndex(group=>group.id===id)+1;
    if(!slot)throw new Error('Unknown anatomy surface group');
    mesh.updateWorldMatrix(true,false);
    for(let triangle=0;triangle<count;triangle++) {
      if(labels[triangle]!==slot)continue;
      for(let corner=0;corner<3;corner++) {
        point.fromBufferAttribute(geometry.attributes.position,originalIndex[triangle*3+corner]).applyMatrix4(mesh.matrixWorld);box.expandByPoint(point);
      }
    }
    return {min:box.min.toArray(),max:box.max.toArray(),center:box.getCenter(new THREE.Vector3()).toArray(),size:box.getSize(new THREE.Vector3()).toArray()};
  };
  const highlight=id=>materials.forEach((material,slot)=>{
    const active=id && (slot===0?id==='unresolved':visible[slot-1].id===id);
    material.emissive.copy(active?material.color:new THREE.Color(0));
    material.emissiveIntensity=active?1.2:0;
    material.color.set(slot===0?'#A5A69F':visible[slot-1].hex);
    if(id&&!active)material.color.multiplyScalar(.45);
  });
  const pick=(pointer,camera)=>{
    const ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObject(mesh,false)[0];
    return hit?(hit.face.materialIndex===0?'unresolved':visible[hit.face.materialIndex-1]?.id):null;
  };
  return {manifest,visible,apply,restore,isolate,boundsFor,highlight,pick,drawGroups:groups.length,geometryPreserved:true,
    unresolvedTriangles:labels.reduce((sum,label)=>sum+(label===0),0),
    dispose:()=>materials.forEach(material=>material.dispose())};
}
