(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function o(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(r){if(r.ep)return;r.ep=!0;const i=o(r);fetch(r.href,i)}})();const ne={FLAME:"flame",ORB:"orb"};function j(e={}){return{particleEffect:"FLAME",particleShape:ne.FLAME,particleCount:48,spread:.022,rise:.2,size:34,speed:1.5,flicker:.18,colorInner:[1,.88,.42],colorOuter:[1,.32,.06],...e}}function K(e={}){return{particleEffect:"ELECTRIC_GLOW",particleShape:ne.ORB,ellipsoid:[1,1,1],color:[.76,.9,1],intensity:1.8,radius:5,glowSize:96,flicker:0,pickRadius:.48,...e}}const we="/3d_engine/assets/defaultScene-Bg-H0ddV.bundle",U={id:"default-room-gallery",resourceBundle:{id:"default-room-gallery",version:1,format:"ngb-deflate-v1",url:we},textureSize:128,layout:{columns:12,spacing:1.9,startZ:2.4,rowSpacing:1.65,groundClearance:.08,compactScale:.95,defaultScale:1.1},materials:{default:{reflectivity:.1,roughness:.72,fresnel:.42,envIntensity:.55},textured:{reflectivity:.14,roughness:.64,fresnel:.36,envIntensity:.58},floor:{reflectivity:.32,roughness:.48,fresnel:.7,envIntensity:.68},overrides:{"Monitor.glb":{reflectivity:.28,roughness:.34,fresnel:.64,envIntensity:.9},"Computer.glb":{reflectivity:.22,roughness:.42,fresnel:.58,envIntensity:.78},"Wine Glass.glb":{reflectivity:.46,roughness:.18,fresnel:.86,envIntensity:1},"Trophy.glb":{reflectivity:.36,roughness:.25,fresnel:.72,envIntensity:.92}}},resources:["Stool.glb","Baseball Bat.glb","Present.glb","Stapler.glb","Bed.glb","Cup Of Tea.glb","Painting.glb","Ladder.glb","Desk Fan.glb","Closed Umbrella.glb","Table Large Circular.glb","Hamburger.glb","Toolbox.glb","Bird House.glb","Hair Dryer.glb","Hand Saw.glb","Couch.glb","Desk Lamp.glb","Mailbox.glb","Safe.glb","Chips.glb","Tissue Box.glb","Cabinet.glb","Books.glb","Propane Tank.glb","Bathtub.glb","Flowers.glb","Telescope.glb","Trash Bin.glb","Jar.glb","Desk.glb","Mug With Office Tool.glb","Empty Box.glb","Barbecue.glb","Rocking Chair.glb","Rubber Duck.glb","Headphones.glb","Bathroom Sink.glb","Fruit Bowl.glb","Ceiling Fan.glb","Potted Plant.glb","Trophy.glb","Bookshelf.glb","Printer.glb","Hoe.glb","Coat Rack.glb","Piggy Bank.glb","Table.glb","Pumpkin.glb","Treadmill.glb","Watering Can.glb","Wall Corkboard.glb","Wrench.glb","Toilet.glb","Candlestick.glb","Refrigirator.glb","Computer.glb","Hand Rake.glb","Dresser.glb","Hammer.glb","Lamp With Shade.glb","Dumbbell.glb","Grandfathers Clock.glb","Globe.glb","End Table.glb","Wine Glass.glb","Stove.glb","Caldron.glb","Frying Pan.glb","Chandelier.glb","Doll.glb","Chair.glb","Monitor.glb","Screwdriver.glb","Mouse.glb"],effects:{"Candlestick.glb":{flame:j({localPosition:[0,.95,0],particleCount:58,spread:.024,rise:.24,size:42,speed:1.55,flicker:.18,colorInner:[1,.86,.35],colorOuter:[1,.28,.05]}),softLight:{color:[1,.48,.16],intensity:1.55,radius:5.2,glowSize:118,flicker:.22,pickRadius:.42}},"Chandelier.glb":{flame:j({localPositions:[[.46,.62,0],[.33,.62,.33],[0,.62,.46],[-.33,.62,.33],[-.46,.62,0],[-.33,.62,-.33],[0,.62,-.46],[.33,.62,-.33]],particleCount:18,spread:.02,rise:.16,size:28,speed:1.45,flicker:.16,colorInner:[1,.9,.48],colorOuter:[1,.36,.08]}),softLight:{color:[1,.55,.22],intensity:.42,radius:2.8,glowSize:72,flicker:.24,pickRadius:.28}},"Desk Lamp.glb":{electricLight:K({localPosition:[0,.82,.08],ellipsoid:[1,1,1],color:[.72,.88,1],intensity:2.25,radius:5.6,glowSize:92,flicker:0,pickRadius:.48})},"Lamp With Shade.glb":{electricLight:K({localPosition:[0,.78,0],ellipsoid:[1.15,.9,1],color:[1,.76,.42],intensity:1.45,radius:4.8,glowSize:118,flicker:0,pickRadius:.5}),shadeTransmission:{color:[.34,.52,1],strength:.62,alpha:.66}}}};function re(e){return`/3d_engine/${e.replace(/^\/+/,"")}`}function Ee(e,t={}){return new Promise((o,n)=>{const r=new Worker(new URL("/3d_engine/assets/bundleWorker-u1nw_7R6.js",import.meta.url),{type:"module"});r.addEventListener("message",i=>{var s,a,c;if(((s=i.data)==null?void 0:s.type)==="bundle-complete"&&(r.terminate(),o(i.data.resources)),((a=i.data)==null?void 0:a.type)==="bundle-error"){r.terminate();const l=new Error(i.data.message);(c=t.onError)==null||c.call(t,l),n(l)}}),r.addEventListener("error",i=>{var s;r.terminate(),(s=t.onError)==null||s.call(t,i),n(i)}),r.postMessage({type:"load-bundle",bundle:e,wasmUrl:re("wasm/bundle_loader.wasm")})})}async function Ae(e,t,o,n={}){var s;let r;try{r=e.resourceBundle?await Ee(e.resourceBundle,n):[]}catch(a){(s=n.onError)==null||s.call(n,a);return}const i=new Worker(new URL("/3d_engine/assets/modelWorker-bhnER2Vf.js",import.meta.url),{type:"module"});i.addEventListener("message",a=>{var l,_;const{type:c}=a.data;if(c==="complete"){const p=ge(e,a.data.models,t,o);(l=n.onComplete)==null||l.call(n,{parsed:a.data.parsed,skipped:a.data.skipped,...p}),i.terminate()}c==="warning"&&((_=n.onWarning)==null||_.call(n,a.data.message))}),i.addEventListener("error",a=>{var c;(c=n.onError)==null||c.call(n,a),i.terminate()}),i.postMessage({type:"load",files:e.resources,resources:r,textureSize:e.textureSize},r.map(a=>a.buffer))}function ge(e,t,o,n){let r=0,i=0;if(!o)return{loadedModels:r,loadedTextures:i};o.clearModels();const s=Re(n);for(const[a,c]of t.entries()){const l=Te(e,a,t.length,c.fileName),_=Pe(e,c.fileName,s),p=Se(e,c.fileName,c.hasTexture);o.addModel(c,l,_,p),r+=1,c.hasTexture&&(i+=1)}return o.registerPhysicsLights(n),{loadedModels:r,loadedTextures:i}}function Te(e,t,o,n){const r=e.layout,i=Math.floor(t/r.columns),s=t%r.columns,a=Math.ceil(o/r.columns);return{x:(s-(r.columns-1)*.5)*r.spacing,y:r.groundClearance,z:r.startZ+i*r.rowSpacing,yaw:Me(n)%628/100,scale:a>6?r.compactScale:r.defaultScale}}function Pe(e,t,o){var r;const n=(r=e.effects)==null?void 0:r[t];return n?{...n,flame:n.flame?{...n.flame,particleEffectId:o[n.flame.particleEffect]||o.NONE}:void 0,electricLight:n.electricLight?{...n.electricLight,particleEffectId:o[n.electricLight.particleEffect]||o.NONE}:void 0}:null}function Se(e,t,o){var r;const n=e.materials||{};return{...o?n.textured:n.default,...((r=n.overrides)==null?void 0:r[t])||{}}}function Re(e){var t,o,n;return{NONE:((t=e.particle_effect_none)==null?void 0:t.call(e))??0,FLAME:((o=e.particle_effect_flame)==null?void 0:o.call(e))??1,ELECTRIC_GLOW:((n=e.particle_effect_electric_glow)==null?void 0:n.call(e))??2}}function Me(e){let t=2166136261;for(let o=0;o<e.length;o+=1)t^=e.charCodeAt(o),t=Math.imul(t,16777619);return t>>>0}const L={up:1,down:2,left:4,right:8,rise:16,sink:32},Ce=480,ie=270,Fe=265,F=2*Math.atan(ie*.5/Fe),x=12,De=.035,D=12,Z={reflectivity:.1,roughness:.72,fresnel:.42,envIntensity:.55};var oe;const Ie=((oe=U.materials)==null?void 0:oe.floor)||{reflectivity:.32,roughness:.48,fresnel:.7,envIntensity:.68},y=new Set,m=document.querySelector("#stage"),ze=document.querySelector("#score"),Ue=document.querySelector("#health"),ke=document.querySelector("#energy"),Be=document.querySelector("#models"),Oe=document.querySelector("#textures"),He=document.querySelector("#fps"),Ne=document.querySelector("#time"),A=document.querySelector("#message"),G=document.querySelector("#pause"),Ge=document.querySelector("#restart");let u,v,k=performance.now(),g=!1,M=0,C=0,S=0,W=0,Y=!1,B=0,O=0,H=0,R=0,N=0;window.resourceDebug={parsed:0,uploaded:0,skipped:0,renderer:"loading"};async function We(){const e=await fetch(re("wasm/engine.wasm")),{instance:t}=await WebAssembly.instantiateStreaming(e,{});u=t.exports,m.width=u.width?u.width():Ce,m.height=u.height?u.height():ie,v=Je(m),window.resourceDebug.renderer=v?"webgl2":"software-fallback",V(),Ze(),requestAnimationFrame(se)}function V(){const e=(Date.now()^Math.floor(Math.random()*4294967295))>>>0;u.init(e),g=!1,G.textContent="暂停",A.classList.add("hidden"),k=performance.now(),W=0,v==null||v.registerPhysicsLights(u)}function se(e){const t=e-k;k=e,Xe(t),g||(W+=t/1e3,u.set_input(qe()),u.set_look(M,C),M=0,C=0,v&&u.update_camera?u.update_camera(t):u.update(t)),Ye(),Ve(),requestAnimationFrame(se)}function Ye(){if(v){v.render(ae()),H=v.triangleCount();return}const e=m.getContext("2d",{alpha:!1}),t=u.buffer_ptr(),o=m.width*m.height*4,n=new Uint8ClampedArray(u.memory.buffer,t,o),r=e.createImageData(m.width,m.height);r.data.set(n),e.putImageData(r,0,0),H=u.score()}function Ve(){ze.textContent=H,Ue.textContent=`${(u.health()/100).toFixed(2)}m`,ke.textContent=`${(u.energy()/20).toFixed(1)}m/s`,Be.textContent=`${v?R:u.loaded_instance_count()}`,Oe.textContent=`${v?N:u.loaded_texture_count()}`,He.textContent=`${Math.round(S)} FPS`,Ne.textContent=`${u.elapsed_seconds()}s`;const e=u.is_game_over()===1;A.classList.toggle("hidden",!e)}function Xe(e){if(e<=0)return;const t=1e3/e;S=S===0?t:S*.9+t*.1}function qe(){let e=0;return(y.has("arrowup")||y.has("w"))&&(e|=L.up),(y.has("arrowdown")||y.has("s"))&&(e|=L.down),(y.has("arrowleft")||y.has("a"))&&(e|=L.left),(y.has("arrowright")||y.has("d"))&&(e|=L.right),y.has("q")&&(e|=L.rise),y.has("e")&&(e|=L.sink),e}function ae(){return{x:u.camera_x(),y:u.camera_y(),z:u.camera_z(),yaw:u.camera_yaw(),pitch:u.camera_pitch(),time:W}}window.addEventListener("keydown",e=>{const t=e.key.toLowerCase();y.add(t),["arrowup","arrowdown","arrowleft","arrowright","q","e"].includes(t)&&e.preventDefault(),t==="p"&&ce(),t==="r"&&V()});window.addEventListener("keyup",e=>{y.delete(e.key.toLowerCase())});G.addEventListener("click",ce);Ge.addEventListener("click",V);m.addEventListener("click",e=>{var t;$e(e)||(t=m.requestPointerLock)==null||t.call(m)});m.addEventListener("mousedown",e=>{e.button===0&&(Y=!0,B=e.clientX,O=e.clientY,e.preventDefault())});window.addEventListener("mouseup",()=>{Y=!1});window.addEventListener("mousemove",e=>{if(document.pointerLockElement===m){M+=e.movementX,C+=e.movementY;return}Y&&(M+=e.clientX-B,C+=e.clientY-O,B=e.clientX,O=e.clientY)});function ce(){g=!g,G.textContent=g?"继续":"暂停"}function $e(e){if(!v||!u.physics_toggle_light_by_ray)return!1;const t=je(e),o=u.physics_toggle_light_by_ray(t.origin[0],t.origin[1],t.origin[2],t.direction[0],t.direction[1],t.direction[2]);return o<0?!1:(v.syncLightState(u,o),!0)}function je(e){const t=ae(),o=m.getBoundingClientRect(),n=(e.clientX-o.left)/o.width*2-1,r=1-(e.clientY-o.top)/o.height*2,i=o.width/o.height,s=Math.tan(F*.5),a=X([n*i*s,r*s,1]);return{origin:[t.x,t.y,t.z],direction:Ke(a,t)}}function Ke(e,t){const o=Math.sin(t.pitch),n=Math.cos(t.pitch),r=n*e[1]-o*e[2],i=o*e[1]+n*e[2],s=Math.sin(t.yaw),a=Math.cos(t.yaw);return X([a*e[0]+s*i,r,-s*e[0]+a*i])}function Ze(){R=0,N=0,Ae(U,v,u,{onComplete(e){R=e.loadedModels,N=e.loadedTextures,window.resourceDebug={parsed:e.parsed,uploaded:R,skipped:e.skipped,renderer:v?"webgl2":"software-fallback",scene:U.id}},onWarning(e){console.warn(e)},onError(e){console.warn("Scene worker failed:",e.message)}})}function Je(e){const t=e.getContext("webgl2",{antialias:!0,alpha:!1,depth:!0,powerPreference:"high-performance"});if(!t)return null;const o=z(t,xt,Lt),n=z(t,yt,bt),r=z(t,wt,Et),i=pt(t,o),s=mt(t,n),a=vt(t,r),c=[],l=[],_=t.createBuffer(),p=nt(t);let b=p.triangleCount;return t.enable(t.DEPTH_TEST),t.disable(t.CULL_FACE),t.enable(t.BLEND),t.blendFunc(t.SRC_ALPHA,t.ONE_MINUS_SRC_ALPHA),t.clearColor(.02,.03,.06,1),{clearModels(){c.splice(0,c.length),l.splice(0,l.length)},addModel(f,h,d,T){const P=Qe(t,f,h,d,T);if(c.push(P),d!=null&&d.flame&&l.push(...et(h,d)),d!=null&&d.electricLight){const E=tt(h,d.electricLight,d.shadeTransmission);P.shadeEmitter=E,l.push(E)}},render(f){_t(e),t.viewport(0,0,e.width,e.height),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),st(t,n,s,f,e),t.useProgram(o),ht(t,i,f,e,l),Q(t,i,p,f.time),b=p.triangleCount;for(const h of c)Q(t,i,h,f.time),b+=h.triangleCount;at(t,r,a,_,l,f,e)},triangleCount(){return b},registerPhysicsLights(f){if(f!=null&&f.physics_clear_lights){f.physics_clear_lights();for(const[h,d]of l.entries())d.lightId=h,d.enabled=!0,f.physics_register_light(h,d.position[0],d.position[1],d.position[2],d.softLight.pickRadius||.4)}},syncLightState(f,h){if(f!=null&&f.physics_light_enabled)for(const d of l)d.lightId===h&&(d.enabled=f.physics_light_enabled(h)===1)}}}function Qe(e,t,o,n,r){const i=rt(t,r);return{buffer:fe(e,i),texture:de(e,t.texturePixels,t.textureWidth,t.textureHeight),vertexCount:t.triangleCount*3,triangleCount:t.triangleCount,hasTexture:t.hasTexture?1:0,instance:o,shadeTransmission:(n==null?void 0:n.shadeTransmission)||null}}function et(e,t){return(t.flame.localPositions||[t.flame.localPosition||[0,0,0]]).map((n,r)=>{const i=le(n,e);return{position:i,instance:e,flame:{...t.flame,localPosition:n},particleEffectId:t.flame.particleEffectId,particleShape:t.flame.particleShape||"flame",softLight:t.softLight,seed:q(i[0]*3.7+i[1]*9.1+i[2]*5.3+r*11.37)}})}function tt(e,t,o){const n=le(t.localPosition||[0,0,0],e),r=o?ot(t.color,o.color,o.strength):t.color;return{position:n,instance:e,electricLight:t,particleEffectId:t.particleEffectId,particleShape:t.particleShape||"orb",ellipsoid:t.ellipsoid||[1,1,1],softLight:{color:r,sourceColor:t.color,intensity:t.intensity,radius:t.radius,glowSize:t.glowSize,flicker:t.flicker??0},seed:q(n[0]*4.1+n[1]*7.9+n[2]*6.3)}}function ot(e,t,o){const n=Math.max(0,Math.min(o??0,1)),r=Math.max(e[0],e[1],e[2]);return e.map((i,s)=>{const a=i*t[s],c=t[s]*r*.42;return i*(1-n)+(a+c)*n})}function le(e,t){const o=e[0]*t.scale,n=e[1]*t.scale,r=e[2]*t.scale,i=Math.sin(t.yaw),s=Math.cos(t.yaw);return[o*s+r*i+t.x,n+t.y,-o*i+r*s+t.z]}function nt(e){const o=[];for(let r=-16;r<16;r+=1)for(let i=-16;i<16;i+=1){const a=(i+r&1)===0?[.07,.13,.23]:[.043,.098,.176];J(o,[i,-.02,r],[i+1,-.02,r],[i+1,-.02,r+1],a,.34),J(o,[i,-.02,r],[i+1,-.02,r+1],[i,-.02,r+1],a,.34)}const n=new Float32Array(o);return{buffer:fe(e,n),texture:de(e,null,1,1),vertexCount:n.length/15,triangleCount:n.length/45,hasTexture:0,instance:{x:0,y:0,z:0,yaw:0,scale:1,static:!0}}}function rt(e,t=Z){const o={...Z,...t},n=new Float32Array(e.triangleCount*3*15);let r=0;for(let i=0;i<e.triangleCount;i+=1){const s=i*9,a=i*6,c=i*3,l=[e.positions[s],e.positions[s+1],e.positions[s+2]],_=[e.positions[s+3],e.positions[s+4],e.positions[s+5]],p=[e.positions[s+6],e.positions[s+7],e.positions[s+8]],b=ue(l,_,p),f=[e.colors[c]/255,e.colors[c+1]/255,e.colors[c+2]/255];r=w(n,r,l,b,[e.uvs[a],e.uvs[a+1]],f,o),r=w(n,r,_,b,[e.uvs[a+2],e.uvs[a+3]],f,o),r=w(n,r,p,b,[e.uvs[a+4],e.uvs[a+5]],f,o)}return n}function J(e,t,o,n,r,i){const s=ue(t,o,n),a={...Ie,reflectivity:i};w(e,e.length,t,s,[0,0],r,a),w(e,e.length,o,s,[1,0],r,a),w(e,e.length,n,s,[1,1],r,a)}function w(e,t,o,n,r,i,s){return e[t]=o[0],e[t+1]=o[1],e[t+2]=o[2],e[t+3]=n[0],e[t+4]=n[1],e[t+5]=n[2],e[t+6]=r[0],e[t+7]=r[1],e[t+8]=i[0],e[t+9]=i[1],e[t+10]=i[2],e[t+11]=s.reflectivity,e[t+12]=s.roughness,e[t+13]=s.fresnel,e[t+14]=s.envIntensity,t+15}function ue(e,t,o){const n=[t[0]-e[0],t[1]-e[1],t[2]-e[2]],r=[o[0]-e[0],o[1]-e[1],o[2]-e[2]];return X([n[1]*r[2]-n[2]*r[1],n[2]*r[0]-n[0]*r[2],n[0]*r[1]-n[1]*r[0]])}function X(e){const t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}function it(e,t,o){return[e[0]+(t[0]-e[0])*o,e[1]+(t[1]-e[1])*o,e[2]+(t[2]-e[2])*o]}function q(e){const t=Math.sin(e*12.9898)*43758.5453;return t-Math.floor(t)}function fe(e,t){const o=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,o),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW),o}function de(e,t,o,n){const r=e.createTexture();return e.bindTexture(e.TEXTURE_2D,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),t?e.texImage2D(e.TEXTURE_2D,0,e.RGBA,o,n,0,e.RGBA,e.UNSIGNED_BYTE,t):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([255,255,255,255])),e.generateMipmap(e.TEXTURE_2D),r}function st(e,t,o,n,r){e.depthMask(!1),e.disable(e.DEPTH_TEST),e.useProgram(t),e.uniform2f(o.resolution,r.width,r.height),e.uniform2f(o.cameraAngles,n.yaw,n.pitch),e.uniform1f(o.time,n.time),e.drawArrays(e.TRIANGLES,0,3),e.enable(e.DEPTH_TEST),e.depthMask(!0)}function Q(e,t,o,n){var i,s,a,c;e.bindBuffer(e.ARRAY_BUFFER,o.buffer),dt(e,t),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,o.texture),e.uniform1i(t.texture,0),e.uniform1i(t.hasTexture,o.hasTexture);const r=!o.shadeEmitter||o.shadeEmitter.enabled!==!1;if(o.shadeTransmission&&r){const l=((s=(i=o.shadeEmitter)==null?void 0:i.softLight)==null?void 0:s.sourceColor)||((c=(a=o.shadeEmitter)==null?void 0:a.softLight)==null?void 0:c.color)||[1,1,1];e.uniform4f(t.shadeTransmission,o.shadeTransmission.color[0],o.shadeTransmission.color[1],o.shadeTransmission.color[2],o.shadeTransmission.strength),e.uniform3f(t.shadeLightColor,l[0],l[1],l[2]),e.uniform1f(t.shadeAlpha,o.shadeTransmission.alpha)}else e.uniform4f(t.shadeTransmission,0,0,0,0),e.uniform3f(t.shadeLightColor,1,1,1),e.uniform1f(t.shadeAlpha,1);e.uniform4f(t.instance,o.instance.x,ut(o.instance,n),o.instance.z,o.instance.scale),e.uniform1f(t.instanceYaw,o.instance.yaw),e.uniform1f(t.time,n),e.drawArrays(e.TRIANGLES,0,o.vertexCount)}function at(e,t,o,n,r,i,s){if(r.every(c=>c.enabled===!1))return;const a=ct(r,i.time);e.useProgram(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,a,e.DYNAMIC_DRAW),e.uniformMatrix4fv(o.projection,!1,me(F,s.width/s.height,.08,80)),e.uniformMatrix4fv(o.view,!1,ve(i)),e.uniform1f(o.pixelRatio,window.devicePixelRatio||1),ft(e,o),e.enable(e.BLEND),e.blendFunc(e.SRC_ALPHA,e.ONE),e.depthMask(!1),e.drawArrays(e.POINTS,0,a.length/D),e.depthMask(!0),e.blendFunc(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA)}function ct(e,t){const o=e.filter(s=>s.enabled!==!1),n=o.reduce((s,a)=>{var c;return s+(((c=a.flame)==null?void 0:c.particleCount)||0)+1},0),r=new Float32Array(n*D);let i=0;for(const s of o){const a=s.flame,c=s.softLight,l=he(s,t,c.flicker??(a==null?void 0:a.flicker)??0),_=_e(s,t,a?.006:0),p=lt(s);if(i=ee(r,i,_,0,c.glowSize*(a?.88+l*.18:1)*p.sizeScale,c.color,a?.18+l*.12:.34,a?0:1,p.stretch),!!a)for(let b=0;b<a.particleCount;b+=1){const f=q(b*17.13+s.position[0]*3.7+s.position[2]*5.1),h=(t*a.speed+f)%1,d=t*8.2+f*20,T=Math.pow(1-h,1.55),P=Math.pow(h,1.4),E=a.spread*T*P*(.22+f*.48),$=.78+Math.sin(t*23+f*12)*.14+Math.sin(t*41+f*7)*.08,ye=[_[0]+Math.cos(d)*E,_[1]+Math.pow(h,.78)*a.rise,_[2]+Math.sin(d*.83)*E],be=it(a.colorInner,a.colorOuter,h),xe=Math.pow(1-h,1.35)*$*(.86+l*.22),Le=a.size*(.72+T*.46)*$*(.92+l*.1);i=ee(r,i,ye,h,Le,be,xe,0,[1,1])}}return r}function lt(e){var i;if(e.particleShape!=="orb")return{sizeScale:1,stretch:[1,1]};const t=e.ellipsoid||((i=e.electricLight)==null?void 0:i.ellipsoid)||[1,1,1],o=Math.max(.05,t[0]||1),n=Math.max(.05,t[1]||1),r=Math.max(o,n);return{sizeScale:r,stretch:[o/r,n/r]}}function he(e,t,o){const n=Math.sin(t*17+e.seed*19),r=Math.sin(t*31+e.seed*7),i=Math.sin(t*47+e.seed*3);return Math.max(0,1+(n*.5+r*.3+i*.2)*o)}function _e(e,t,o){const n=e.position[1]+pe(e.instance,t);if(o<=0)return[e.position[0],n,e.position[2]];const r=Math.sin(t*13+e.seed*11)*o,i=Math.cos(t*15+e.seed*17)*o,s=Math.sin(t*21+e.seed*5)*o*.8;return[e.position[0]+r,n+s,e.position[2]+i]}function ut(e,t){return e.y+pe(e,t)}function pe(e,t){return e.static?0:(Math.sin(t*1.1+e.x*.35)*.5+.5)*De}function ee(e,t,o,n,r,i,s,a,c){return e[t]=o[0],e[t+1]=o[1],e[t+2]=o[2],e[t+3]=n,e[t+4]=r,e[t+5]=i[0],e[t+6]=i[1],e[t+7]=i[2],e[t+8]=s,e[t+9]=a,e[t+10]=c[0],e[t+11]=c[1],t+D}function ft(e,t){const o=D*4;e.enableVertexAttribArray(t.position),e.vertexAttribPointer(t.position,3,e.FLOAT,!1,o,0),e.enableVertexAttribArray(t.age),e.vertexAttribPointer(t.age,1,e.FLOAT,!1,o,3*4),e.enableVertexAttribArray(t.size),e.vertexAttribPointer(t.size,1,e.FLOAT,!1,o,4*4),e.enableVertexAttribArray(t.color),e.vertexAttribPointer(t.color,3,e.FLOAT,!1,o,5*4),e.enableVertexAttribArray(t.alpha),e.vertexAttribPointer(t.alpha,1,e.FLOAT,!1,o,8*4),e.enableVertexAttribArray(t.shape),e.vertexAttribPointer(t.shape,1,e.FLOAT,!1,o,9*4),e.enableVertexAttribArray(t.stretch),e.vertexAttribPointer(t.stretch,2,e.FLOAT,!1,o,10*4)}function dt(e,t){e.enableVertexAttribArray(t.position),e.vertexAttribPointer(t.position,3,e.FLOAT,!1,60,0),e.enableVertexAttribArray(t.normal),e.vertexAttribPointer(t.normal,3,e.FLOAT,!1,60,3*4),e.enableVertexAttribArray(t.uv),e.vertexAttribPointer(t.uv,2,e.FLOAT,!1,60,6*4),e.enableVertexAttribArray(t.color),e.vertexAttribPointer(t.color,3,e.FLOAT,!1,60,8*4),e.enableVertexAttribArray(t.reflectivity),e.vertexAttribPointer(t.reflectivity,1,e.FLOAT,!1,60,11*4),e.enableVertexAttribArray(t.roughness),e.vertexAttribPointer(t.roughness,1,e.FLOAT,!1,60,12*4),e.enableVertexAttribArray(t.fresnel),e.vertexAttribPointer(t.fresnel,1,e.FLOAT,!1,60,13*4),e.enableVertexAttribArray(t.envIntensity),e.vertexAttribPointer(t.envIntensity,1,e.FLOAT,!1,60,14*4)}function ht(e,t,o,n,r){const i=me(F,n.width/n.height,.08,80),s=ve(o);e.uniformMatrix4fv(t.projection,!1,i),e.uniformMatrix4fv(t.view,!1,s),e.uniform3f(t.cameraPosition,o.x,o.y,o.z);const a=r.filter(c=>c.enabled!==!1).slice(0,x);e.uniform1i(t.effectLightCount,a.length);for(let c=0;c<x;c+=1){const l=a[c];if(l!=null&&l.softLight){const _=he(l,o.time,l.softLight.flicker??0),p=_e(l,o.time,l.flame?.007:0);e.uniform3f(t.effectLightPositions[c],p[0],p[1],p[2]),e.uniform3f(t.effectLightColors[c],...l.softLight.color),e.uniform2f(t.effectLightParams[c],l.softLight.intensity*_,l.softLight.radius*(l.flame?.92+_*.1:1))}else e.uniform3f(t.effectLightPositions[c],0,-100,0),e.uniform3f(t.effectLightColors[c],0,0,0),e.uniform2f(t.effectLightParams[c],0,1)}}function me(e,t,o,n){const r=1/Math.tan(e/2),i=1/(o-n);return new Float32Array([r/t,0,0,0,0,r,0,0,0,0,(n+o)*i,-1,0,0,2*n*o*i,0])}function ve(e){const t=Math.sin(e.yaw),o=Math.cos(e.yaw),n=Math.sin(e.pitch),r=Math.cos(e.pitch),i=[o,0,-t],s=[n*t,r,n*o],a=[-r*t,n,-r*o],c=[e.x,e.y,e.z];return new Float32Array([i[0],s[0],a[0],0,i[1],s[1],a[1],0,i[2],s[2],a[2],0,-I(i,c),-I(s,c),-I(a,c),1])}function I(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function _t(e){const t=Math.max(1,Math.floor(e.clientWidth*window.devicePixelRatio)),o=Math.max(1,Math.floor(e.clientHeight*window.devicePixelRatio));(e.width!==t||e.height!==o)&&(e.width=t,e.height=o)}function z(e,t,o){const n=te(e,e.VERTEX_SHADER,t),r=te(e,e.FRAGMENT_SHADER,o),i=e.createProgram();if(e.attachShader(i,n),e.attachShader(i,r),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(i)||"WebGL program link failed");return i}function te(e,t,o){const n=e.createShader(t);if(e.shaderSource(n,o),e.compileShader(n),!e.getShaderParameter(n,e.COMPILE_STATUS))throw new Error(e.getShaderInfoLog(n)||"WebGL shader compile failed");return n}function pt(e,t){const o={position:e.getAttribLocation(t,"a_position"),normal:e.getAttribLocation(t,"a_normal"),uv:e.getAttribLocation(t,"a_uv"),color:e.getAttribLocation(t,"a_color"),reflectivity:e.getAttribLocation(t,"a_reflectivity"),roughness:e.getAttribLocation(t,"a_roughness"),fresnel:e.getAttribLocation(t,"a_fresnel"),envIntensity:e.getAttribLocation(t,"a_env_intensity"),projection:e.getUniformLocation(t,"u_projection"),view:e.getUniformLocation(t,"u_view"),cameraPosition:e.getUniformLocation(t,"u_camera_position"),instance:e.getUniformLocation(t,"u_instance"),instanceYaw:e.getUniformLocation(t,"u_instance_yaw"),texture:e.getUniformLocation(t,"u_texture"),hasTexture:e.getUniformLocation(t,"u_has_texture"),time:e.getUniformLocation(t,"u_time"),shadeTransmission:e.getUniformLocation(t,"u_shade_transmission"),shadeLightColor:e.getUniformLocation(t,"u_shade_light_color"),shadeAlpha:e.getUniformLocation(t,"u_shade_alpha"),effectLightCount:e.getUniformLocation(t,"u_effect_light_count"),effectLightPositions:[],effectLightColors:[],effectLightParams:[]};for(let n=0;n<x;n+=1)o.effectLightPositions.push(e.getUniformLocation(t,`u_effect_light_positions[${n}]`)),o.effectLightColors.push(e.getUniformLocation(t,`u_effect_light_colors[${n}]`)),o.effectLightParams.push(e.getUniformLocation(t,`u_effect_light_params[${n}]`));return o}function mt(e,t){return{resolution:e.getUniformLocation(t,"u_resolution"),cameraAngles:e.getUniformLocation(t,"u_camera_angles"),time:e.getUniformLocation(t,"u_time")}}function vt(e,t){return{position:e.getAttribLocation(t,"a_position"),age:e.getAttribLocation(t,"a_age"),size:e.getAttribLocation(t,"a_size"),color:e.getAttribLocation(t,"a_color"),alpha:e.getAttribLocation(t,"a_alpha"),shape:e.getAttribLocation(t,"a_shape"),stretch:e.getAttribLocation(t,"a_stretch"),projection:e.getUniformLocation(t,"u_projection"),view:e.getUniformLocation(t,"u_view"),pixelRatio:e.getUniformLocation(t,"u_pixel_ratio")}}const yt=`#version 300 es
const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(POSITIONS[gl_VertexID], 0.0, 1.0);
}
`,bt=`#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_camera_angles;
uniform float u_time;
out vec4 out_color;

vec3 sunDirection(float time) {
  return normalize(vec3(-0.48 + sin(time * 0.07) * 0.08, 0.78, -0.42));
}

vec3 cameraRayToWorld(vec3 ray, vec2 angles) {
  float sy = sin(angles.x);
  float cy = cos(angles.x);
  float sp = sin(angles.y);
  float cp = cos(angles.y);
  float y = cp * ray.y - sp * ray.z;
  float z = sp * ray.y + cp * ray.z;
  return normalize(vec3(cy * ray.x + sy * z, y, -sy * ray.x + cy * z));
}

vec3 skyColor(vec3 direction, float time) {
  float horizon = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
  float sunDot = max(dot(direction, sunDirection(time)), 0.0);
  float sun2 = sunDot * sunDot;
  float sun4 = sun2 * sun2;
  float sun8 = sun4 * sun4;
  float sunGlow = sun8 * sun4 * sun2;
  float sunCore = sun8 * sun8 * sun8 * sun8;
  float cloud = clamp(sin(direction.x * 7.5 + time * 0.035) * cos(direction.z * 5.2 - time * 0.025) * 0.5 + 0.5, 0.0, 1.0);
  cloud = cloud * cloud * cloud * clamp(1.0 - horizon, 0.0, 1.0) * 0.22;
  vec3 base = mix(vec3(0.071, 0.173, 0.322), vec3(0.027, 0.059, 0.133), horizon);
  return base + vec3(0.282, 0.212, 0.11) * sunGlow + vec3(0.706, 0.588, 0.361) * sunCore + vec3(0.149, 0.165, 0.188) * cloud;
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 ndc = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
  float tanHalfFov = ${Math.tan(F*.5).toFixed(8)};
  vec3 ray = normalize(vec3(ndc.x * aspect * tanHalfFov, ndc.y * tanHalfFov, 1.0));
  vec3 worldRay = cameraRayToWorld(ray, u_camera_angles);
  out_color = vec4(skyColor(worldRay, u_time), 1.0);
}
`,xt=`#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in vec3 a_color;
in float a_reflectivity;
in float a_roughness;
in float a_fresnel;
in float a_env_intensity;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform vec4 u_instance;
uniform float u_instance_yaw;
uniform float u_time;

out vec3 v_world_position;
out vec3 v_normal;
out vec2 v_uv;
out vec3 v_color;
out float v_reflectivity;
out float v_roughness;
out float v_fresnel;
out float v_env_intensity;

vec3 rotateY(vec3 point, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec3(point.x * c + point.z * s, point.y, -point.x * s + point.z * c);
}

void main() {
  vec3 world = rotateY(a_position * u_instance.w, u_instance_yaw) + u_instance.xyz;
  vec3 normal = normalize(rotateY(a_normal, u_instance_yaw));
  v_world_position = world;
  v_normal = normal;
  v_uv = a_uv;
  v_color = a_color;
  v_reflectivity = a_reflectivity;
  v_roughness = a_roughness;
  v_fresnel = a_fresnel;
  v_env_intensity = a_env_intensity;
  gl_Position = u_projection * u_view * vec4(world, 1.0);
}
`,Lt=`#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform bool u_has_texture;
uniform vec3 u_camera_position;
uniform vec4 u_shade_transmission;
uniform vec3 u_shade_light_color;
uniform float u_shade_alpha;
uniform int u_effect_light_count;
uniform vec3 u_effect_light_positions[${x}];
uniform vec3 u_effect_light_colors[${x}];
uniform vec2 u_effect_light_params[${x}];
uniform float u_time;

in vec3 v_world_position;
in vec3 v_normal;
in vec2 v_uv;
in vec3 v_color;
in float v_reflectivity;
in float v_roughness;
in float v_fresnel;
in float v_env_intensity;

out vec4 out_color;

vec3 sunDirection(float time) {
  return normalize(vec3(-0.48 + sin(time * 0.07) * 0.08, 0.78, -0.42));
}

vec3 skyColor(vec3 direction, float time) {
  float horizon = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
  float sunDot = max(dot(direction, sunDirection(time)), 0.0);
  float sun2 = sunDot * sunDot;
  float sun4 = sun2 * sun2;
  float sun8 = sun4 * sun4;
  float sunGlow = sun8 * sun4 * sun2;
  float sunCore = sun8 * sun8 * sun8 * sun8;
  vec3 base = mix(vec3(0.071, 0.173, 0.322), vec3(0.027, 0.059, 0.133), horizon);
  return base + vec3(0.282, 0.212, 0.11) * sunGlow + vec3(0.706, 0.588, 0.361) * sunCore;
}

vec3 environmentReflection(vec3 reflected, vec3 normal, float roughness, float time) {
  vec3 sharp = skyColor(reflected, time);
  vec3 broad = (
    skyColor(normalize(mix(reflected, normal, 0.35)), time) +
    skyColor(normalize(reflected + vec3(0.18, 0.08, 0.0)), time) +
    skyColor(normalize(reflected + vec3(-0.16, 0.05, 0.11)), time)
  ) / 3.0;
  return mix(sharp, broad, clamp(roughness, 0.0, 1.0));
}

vec3 transmittedShadeColor(vec3 lightColor, vec3 shadeColor, float strength) {
  vec3 filtered = lightColor * shadeColor;
  float lightEnergy = max(max(lightColor.r, lightColor.g), lightColor.b);
  vec3 scatter = shadeColor * lightEnergy * 0.42;
  return mix(lightColor, filtered + scatter, clamp(strength, 0.0, 1.0));
}

void main() {
  vec3 normal = normalize(gl_FrontFacing ? v_normal : -v_normal);
  vec3 viewDir = normalize(u_camera_position - v_world_position);
  vec3 sun = sunDirection(u_time);
  vec3 base = v_color;
  if (u_has_texture) {
    base *= texture(u_texture, vec2(v_uv.x, 1.0 - v_uv.y)).rgb;
  }

  vec3 pointPos = vec3(sin(u_time * 0.8) * 5.0, 3.2, 4.5 + cos(u_time * 0.55) * 2.2);
  vec3 toPoint = pointPos - v_world_position;
  float pointLight = max(dot(normal, normalize(toPoint)), 0.0) * min(8.5 / max(dot(toPoint, toPoint), 0.001), 1.0);
  vec3 effectLight = vec3(0.0);
  for (int i = 0; i < ${x}; i++) {
    if (i >= u_effect_light_count) {
      break;
    }
    vec3 toEffect = u_effect_light_positions[i] - v_world_position;
    float effectDistance = length(toEffect);
    float radius = max(u_effect_light_params[i].y, 0.001);
    float falloff = pow(clamp(1.0 - effectDistance / radius, 0.0, 1.0), 3.25);
    float wrap = max(dot(normal, normalize(toEffect)) * 0.72 + 0.28, 0.0);
    effectLight += u_effect_light_colors[i] * wrap * falloff * u_effect_light_params[i].x;
  }
  float diffuse = max(dot(normal, sun), 0.0);
  float skyBounce = max(normal.y, 0.0);
  vec3 halfDir = normalize(sun + viewDir);
  float roughness = clamp(v_roughness, 0.04, 1.0);
  float specBase = max(dot(normal, halfDir), 0.0);
  float spec2 = specBase * specBase;
  float spec4 = spec2 * spec2;
  float spec8 = spec4 * spec4;
  float specular = spec8 * spec8 * spec4 * (1.0 - roughness * 0.72);
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
  float shade = 0.34 + diffuse * 0.48 + skyBounce * 0.1 + pointLight * 0.24;
  vec3 reflected = reflect(normalize(v_world_position - u_camera_position), normal);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
  float reflectionStrength = clamp(v_reflectivity + fresnel * v_fresnel, 0.0, 0.92);
  vec3 env = environmentReflection(reflected, normal, roughness, u_time) * v_env_intensity;
  vec3 lit = mix(base * shade, env, reflectionStrength);
  lit += effectLight * 0.48;
  lit += specular * mix(0.2, 0.62, 1.0 - roughness) + rim * reflectionStrength * 0.12;
  vec3 shadeGlow = transmittedShadeColor(
    u_shade_light_color,
    u_shade_transmission.rgb,
    u_shade_transmission.a
  );
  lit = mix(lit, shadeGlow, u_shade_transmission.a);

  float fog = clamp((distance(u_camera_position, v_world_position) - 9.0) / 36.0, 0.0, 1.0);
  lit = mix(lit, vec3(0.031, 0.051, 0.098), fog);
  out_color = vec4(lit, u_shade_alpha);
}
`,wt=`#version 300 es
precision highp float;

in vec3 a_position;
in float a_age;
in float a_size;
in vec3 a_color;
in float a_alpha;
in float a_shape;
in vec2 a_stretch;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform float u_pixel_ratio;

out float v_age;
out vec3 v_color;
out float v_alpha;
out float v_shape;
out vec2 v_stretch;

void main() {
  vec4 viewPosition = u_view * vec4(a_position, 1.0);
  gl_Position = u_projection * viewPosition;
  gl_PointSize = a_size * u_pixel_ratio / max(-viewPosition.z, 0.35);
  v_age = a_age;
  v_color = a_color;
  v_alpha = a_alpha;
  v_shape = a_shape;
  v_stretch = a_stretch;
}
`,Et=`#version 300 es
precision highp float;

in float v_age;
in vec3 v_color;
in float v_alpha;
in float v_shape;
in vec2 v_stretch;

out vec4 out_color;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  if (v_shape > 0.5) {
    vec2 safeStretch = max(v_stretch, vec2(0.05));
    vec2 orbUv = uv / safeStretch;
    float dist = length(orbUv);
    float shell = smoothstep(1.0, 0.0, dist);
    float core = smoothstep(0.72, 0.0, dist);
    float rim = smoothstep(0.62, 1.0, dist) * smoothstep(1.0, 0.82, dist);
    float highlight = smoothstep(0.38, 0.0, length(orbUv - vec2(-0.23, 0.28)));
    float alpha = (shell * 0.42 + core * 0.46 + rim * 0.16) * v_alpha;
    if (alpha < 0.01) discard;
    vec3 color = mix(v_color, vec3(1.0), highlight * 0.28 + core * 0.18);
    out_color = vec4(color, alpha);
    return;
  }

  float y01 = clamp((uv.y + 1.0) * 0.5, 0.0, 1.0);
  float width = mix(0.58, 0.1, y01);
  float body = smoothstep(width, 0.0, abs(uv.x)) * smoothstep(-1.0, -0.22, uv.y) * smoothstep(0.86, -0.02, uv.y);
  float tip = smoothstep(0.2, 0.0, abs(uv.x)) * smoothstep(0.0, 0.62, uv.y) * smoothstep(0.9, 0.48, uv.y);
  float core = smoothstep(0.24, 0.0, abs(uv.x)) * smoothstep(-0.72, -0.24, uv.y) * smoothstep(0.58, -0.02, uv.y);
  float ember = smoothstep(0.9, 0.0, length(vec2(uv.x * 0.75, uv.y + 0.34))) * (1.0 - y01) * 0.2;
  float alpha = (body * 0.9 + tip * 0.75 + ember) * v_alpha;
  if (alpha < 0.015) discard;
  vec3 hot = vec3(1.0, 0.94, 0.58);
  vec3 color = mix(v_color, hot, core * (1.0 - v_age * 0.45));
  out_color = vec4(color, alpha);
}
`;We().catch(e=>{console.error(e),A.classList.remove("hidden"),A.querySelector("h2").textContent="启动失败",A.querySelector("p").textContent=e.message});
