/* Market Atlas — editable front-end. Google Maps is optional; no private data is used. */
(() => {
'use strict';
const data = window.ATLAS_DATA || {stores: [], prints: [], inventory: []};
const stores = data.stores;
const inventory = data.inventory;
const $ = id => document.getElementById(id);
const node = (tag, cls='', value=null) => { const x=document.createElement(tag); if(cls)x.className=cls;if(value!==null)x.textContent=String(value);return x; };
const unique = xs => [...new Set(xs)].filter(Boolean).sort((a,b)=>a.localeCompare(b));
const byStore = new Map();
for(const item of inventory){if(!byStore.has(item.store_id))byStore.set(item.store_id,[]);byStore.get(item.store_id).push(item);}
const storeById = new Map(stores.map(s=>[s.store_id,s]));
let visible = stores.slice();
let activeId = null; // Start at network overview; let the reviewer choose a partner.
let view = 'map';
let zoom=1,offsetX=0,offsetY=0,drag=null;
let googleState={ready:false,scriptLoading:false,map2d:null,map3d:null,googleMarkers:[],markers3d:[],mode:'offline',key:'',timeout:null};
const viewport=$('map-viewport'), stage=$('map-stage');

function productMatches(store){
 const category=$('product-category').value, custom=$('custom-only').checked;
 const query=$('print-search').value.trim().toLocaleLowerCase();
 return (byStore.get(store.store_id)||[]).filter(p=>(!category||p.category===category)&&(!custom||p.custom==='Yes')&&(!query||p.print_name.toLocaleLowerCase().includes(query)));
}
function allProducts(store){return byStore.get(store.store_id)||[];}
function matchingStores(){const q=$('search').value.trim().toLocaleLowerCase(),reg=$('region').value,type=$('partner-type').value;
 return stores.filter(s=>(!q||`${s.partner_name} ${s.city} ${s.state}`.toLocaleLowerCase().includes(q))&&(!reg||s.region===reg)&&(!type||s.store_type===type)&&productMatches(s).length>0);
}
for(const [id,values] of [['region',unique(stores.map(s=>s.region))],['partner-type',unique(stores.map(s=>s.store_type))],['product-category',unique(inventory.map(p=>p.category))]]){
 for(const value of values){const el=node('option','',value);el.value=value;$(id).append(el);}
}

function setActive(id,focus=true){
 const store=storeById.get(id);if(!store)return; activeId=id;
 renderList();renderDetails();renderFocusCard();
 if(focus && view==='map')focusStore(store);
 else if(googleState.ready) refreshGoogleMarkers();
 else renderOfflineMarkers();
}
function renderList(){const target=$('locations-list');target.replaceChildren();$('list-count').textContent=visible.length;
 if(!visible.length){target.append(node('div','no-matches','No locations match these filters.'));return;}
 const fragment=document.createDocumentFragment();
 for(const s of [...visible].sort((a,b)=>a.partner_name.localeCompare(b.partner_name))){
  const btn=node('button','location-button'+(activeId===s.store_id?' active':''));btn.type='button';btn.setAttribute('aria-pressed',String(activeId===s.store_id));
  const text=node('span');text.append(node('span','location-name',s.partner_name),node('span','location-meta',`${s.city}, ${s.state} · ${s.store_type}`));
  btn.append(text,node('span','location-number',allProducts(s).length));btn.addEventListener('click',()=>setActive(s.store_id,true));fragment.append(btn);
 }target.append(fragment);
}
function renderDetails(){const target=$('location-detail');target.replaceChildren();const store=storeById.get(activeId);
 if(!store || !visible.some(s=>s.store_id===activeId)){target.append(node('p','empty-state','Select a location to view its print assortment.'));return;}
 const products=allProducts(store),custom=products.filter(x=>x.custom==='Yes');
 target.append(node('div','detail-kicker','RETAIL PARTNER'),node('h3','detail-name',store.partner_name),node('div','detail-place',`${store.city}, ${store.state} · ${store.store_type}`));
 const stats=node('div','detail-stats');
 for(const [value,label] of [[products.length,'Prints assigned'],[custom.length,'Custom editions']]){const stat=node('div','detail-stat');stat.append(node('strong','',value),node('small','',label));stats.append(stat);}target.append(stats,node('div','assortment-heading','Print assortment'));
 for(const edition of ['Regular','Custom']){const list=products.filter(x=>(x.custom==='Yes')===(edition==='Custom'));if(!list.length)continue;
  const group=node('div','assortment-group');group.append(node('div','assortment-category',edition==='Custom'?'Exclusive to this location':'Regular editions'));
  for(const item of list){const row=node('div','print-row');row.append(node('div','print-tile','?'),node('span','print-name',item.print_name));if(item.custom==='Yes')row.append(node('span','custom-tag','Custom'));group.append(row);}target.append(group);
 }
 const focus=node('button','focus-link','View location on map ↗');focus.type='button';focus.addEventListener('click',()=>{switchView('map');focusStore(store);});target.append(focus,node('div','art-note','Artwork intentionally omitted from this public sample.'));
}
function renderFocusCard(){const el=$('map-focus-card');el.replaceChildren();const store=storeById.get(activeId);if(!store || !visible.some(s=>s.store_id===activeId)){el.hidden=true;return;}el.hidden=false;
 const close=node('button','focus-close','×');close.setAttribute('aria-label','Close preview');close.onclick=()=>{el.hidden=true;};el.append(close,node('div','focus-header',store.partner_name),node('div','focus-place',`${store.city}, ${store.state}`));
 const row=node('div','focus-prints');for(const p of allProducts(store).slice(0,5)){const thumb=node('div','focus-art','?');thumb.title=p.print_name;row.append(thumb);}el.append(row,node('div','focus-note',`${allProducts(store).length} assigned prints · imagery unavailable in public demo`));
}
function constrain(){const limX=(zoom-1)*viewport.clientWidth/2,limY=(zoom-1)*viewport.clientHeight/2;offsetX=Math.max(-limX,Math.min(limX,offsetX));offsetY=Math.max(-limY,Math.min(limY,offsetY));}
function updateOfflineTransform(){stage.style.transform=`translate(${offsetX}px,${offsetY}px) scale(${zoom})`;}
function focusOffline(store){zoom=Math.max(3.2,zoom);offsetX=(.5-store.x)*viewport.clientWidth*zoom;offsetY=(.5-store.y)*viewport.clientHeight*zoom;constrain();updateOfflineTransform();renderOfflineMarkers();}
function zoomOffline(factor){zoom=Math.min(9,Math.max(1,zoom*factor));if(zoom===1)offsetX=offsetY=0;constrain();updateOfflineTransform();renderOfflineMarkers();}
function renderOfflineMarkers(){if(googleState.ready)return;const target=$('map-pins');target.replaceChildren();
 const groups=[],w=viewport.clientWidth||800,h=viewport.clientHeight||500;
 for(const store of visible){const existing=groups.find(g=>Math.hypot((g.x-store.x)*w*zoom,(g.y-store.y)*h*zoom)<24);
 if(existing){existing.members.push(store);existing.x=existing.members.reduce((t,s)=>t+s.x,0)/existing.members.length;existing.y=existing.members.reduce((t,s)=>t+s.y,0)/existing.members.length;}
 else groups.push({x:store.x,y:store.y,members:[store]});}
 for(const g of groups){const cluster=g.members.length>1,store=g.members[0];const btn=node('button','marker'+(cluster?' cluster':'')+(!cluster&&store.store_id===activeId?' selected':''),cluster?g.members.length:'');btn.style.left=(g.x*100)+'%';btn.style.top=(g.y*100)+'%';btn.dataset.tooltip=cluster?`${g.members.length} locations` : store.partner_name;btn.setAttribute('aria-label',cluster?`${g.members.length} locations, zoom in`:store.partner_name);
 btn.onclick=(ev)=>{ev.stopPropagation();if(cluster){zoom=Math.min(9,zoom*1.85);offsetX=(.5-g.x)*viewport.clientWidth*zoom;offsetY=(.5-g.y)*viewport.clientHeight*zoom;constrain();updateOfflineTransform();renderOfflineMarkers();}else setActive(store.store_id,true);};target.append(btn);}
}
function flyToLocation(store){
 const g=googleState;
 const destination={center:{lat:store.lat,lng:store.lon,altitude:90},range:1350,tilt:63,heading:12};
 if(g.mode==='3d'&&g.map3d){
  // Camera animation matches the official Maps 3D API: endCamera + durationMillis.
  if(typeof g.map3d.flyCameraTo==='function')g.map3d.flyCameraTo({endCamera:destination,durationMillis:1750});
  else Object.assign(g.map3d,destination);
 }else if(g.map2d){g.map2d.panTo({lat:store.lat,lng:store.lon});g.map2d.setZoom(16);}
}
function focusStore(store){
 if(googleState.ready){flyToLocation(store);refreshGoogleMarkers();}
 else focusOffline(store);
}

function mapNote(message,connected=false){$('map-notice').hidden=false;$('map-notice-text').textContent=message;$('map-connect').hidden=connected;$('map-mode-label').textContent=connected?(googleState.mode==='3d'?'GOOGLE 3D':'GOOGLE SATELLITE'):'OFFLINE MAP';}
function markerIcon(color='#296a59',size=8){return {path:google.maps.SymbolPath.CIRCLE,fillColor:color,fillOpacity:1,strokeColor:'#fff',strokeOpacity:1,strokeWeight:2,scale:size};}
function clusterByZoom(){if(!googleState.map2d)return visible.map(s=>({members:[s],lat:s.lat,lng:s.lon}));
 const z=googleState.map2d.getZoom()||5;const gap=z<5?5:z<7?1.1:z<9?.22:z<12?.035:0;
 if(!gap)return visible.map(s=>({members:[s],lat:s.lat,lng:s.lon}));
 const groups=new Map();for(const s of visible){const key=`${Math.round(s.lat/gap)}:${Math.round(s.lon/gap)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
 return [...groups.values()].map(m=>({members:m,lat:m.reduce((a,s)=>a+s.lat,0)/m.length,lng:m.reduce((a,s)=>a+s.lon,0)/m.length}));
}
function refreshGoogleMarkers(){if(!googleState.ready)return;
 for(const m of googleState.googleMarkers)m.setMap(null);googleState.googleMarkers=[];
 for(const group of clusterByZoom()){const clustered=group.members.length>1;const s=group.members[0];const isSelected=!clustered&&s.store_id===activeId;
 const m=new google.maps.Marker({map:googleState.map2d,position:{lat:group.lat,lng:group.lng},title:clustered?`${group.members.length} locations`:s.partner_name,
 icon:markerIcon(isSelected?'#c4764b':'#296b58',clustered?16:isSelected?10:7),label:clustered?{text:String(group.members.length),color:'#fff',fontSize:'11px',fontWeight:'700'}:undefined,zIndex:isSelected?999:clustered?2:1});
 m.addListener('click',()=>{if(clustered){googleState.map2d.panTo({lat:group.lat,lng:group.lng});googleState.map2d.setZoom(Math.max(8,(googleState.map2d.getZoom()||5)+3));}else setActive(s.store_id,true);});googleState.googleMarkers.push(m);}
 if(googleState.map3d)refresh3DMarkers();
}
function refresh3DMarkers(){
 const g=googleState;
 if(!g.map3d || !g.marker3dType)return;
 for(const marker of g.markers3d)marker.remove();
 g.markers3d=[];
 // Show all filtered locations without 167 overlapping text labels.
 for(const store of visible){
  const selected=store.store_id===activeId;
  const marker=new g.marker3dType({
   position:{lat:store.lat,lng:store.lon,altitude:selected?35:12},
   altitudeMode:'RELATIVE_TO_GROUND',
   extruded:selected,
   sizePreserved:true,
   label:selected?store.partner_name:undefined,
   zIndex:selected?1000:1
  });
  marker.addEventListener('gmp-click',event=>{event.stopPropagation();setActive(store.store_id,true);});
  g.map3d.append(marker);
  g.markers3d.push(marker);
 }
}
async function enable3D(){
 const g=googleState;
 if(!g.ready){showSettings();return;}
 if(g.mode==='3d')return;
 $('mode-3d').disabled=true;
 const previousMode=g.mode;
 try{
  // Photorealistic 3D is a Maps JavaScript API library, not the discontinued Earth browser plugin.
  const {Map3DElement,Marker3DInteractiveElement}=await google.maps.importLibrary('maps3d');
  if(!Map3DElement || !Marker3DInteractiveElement)throw new Error('Maps 3D library unavailable');
  g.marker3dType=Marker3DInteractiveElement;
  $('map-google3d').hidden=false;
  $('map-google2d').hidden=true;
  if(!g.map3d){
   g.map3d=new Map3DElement({
    center:{lat:39.5,lng:-97.5,altitude:1000},range:6500000,tilt:40,heading:0,
    mode:'HYBRID',defaultUIHidden:true
   });
   g.map3d.style.width='100%';g.map3d.style.height='100%';
   $('map-google3d').append(g.map3d);
  }
  g.mode='3d';
  refresh3DMarkers();
  setActiveModeButtons();
  if(activeId)flyToLocation(storeById.get(activeId));
  else resetGoogleCamera();
 }catch(error){
  console.error('Google photorealistic 3D failed:',error);
  $('settings-error').textContent='3D failed to initialize. Check browser support, API access and billing.';
  g.mode=previousMode;
  $('map-google3d').hidden=true;$('map-google2d').hidden=false;
  setActiveModeButtons();
  mapNote('3D unavailable; satellite view still works.',true);
 }finally{$('mode-3d').disabled=false;}
}
function setActiveModeButtons(){
 const is3d=googleState.mode==='3d';
 $('mode-3d').classList.toggle('active',is3d);
 $('mode-satellite').classList.toggle('active',googleState.ready&&!is3d);
 $('mode-3d').setAttribute('aria-pressed',String(is3d));
 $('mode-satellite').setAttribute('aria-pressed',String(googleState.ready&&!is3d));
 $('map-mode-label').textContent=is3d?'GOOGLE 3D':googleState.ready?'GOOGLE SATELLITE':'OFFLINE MAP';
}
function enableSatellite(){
 const g=googleState;
 if(!g.ready){showSettings();return;}
 g.mode='2d';
 $('map-google2d').hidden=false;
 $('map-google3d').hidden=true;
 setActiveModeButtons();
 if(activeId)flyToLocation(storeById.get(activeId));
}
function resetGoogleCamera(){
 const g=googleState;
 if(g.mode==='3d' && g.map3d){
  const cam={center:{lat:39.5,lng:-97.5,altitude:1000},range:6500000,tilt:40,heading:0};
  if(typeof g.map3d.flyCameraTo==='function')g.map3d.flyCameraTo({endCamera:cam,durationMillis:1600});
  else Object.assign(g.map3d,cam);
 }else if(g.map2d){
  const bounds=new google.maps.LatLngBounds();
  (visible.length?visible:stores).forEach(store=>bounds.extend({lat:store.lat,lng:store.lon}));
  g.map2d.fitBounds(bounds,35);
 }
}
function showGoogleFailure(message){
 const g=googleState;
 if(g.timeout)clearTimeout(g.timeout);
 g.scriptLoading=false;
 $('settings-error').textContent=message;
 mapNote(message,false);
 $('connect-google').disabled=false;
 $('connect-google').textContent='Load Google Maps';
}
function bootGoogle(key){
 const g=googleState;
 if(g.scriptLoading||g.ready)return;
 if(location.protocol==='file:'){
  $('settings-error').textContent='Run python -m http.server 8000 and open http://localhost:8000. Google website restrictions usually do not allow local file URLs.';
  return;
 }
 g.scriptLoading=true;
 $('settings-error').textContent='';
 $('connect-google').disabled=true;
 $('connect-google').textContent='Connecting…';
 mapNote('Connecting to Google Maps…',false);
 window.gm_authFailure=()=>showGoogleFailure('Google Maps authorization failed. Check your key, site restrictions, API and billing.');
 window.marketAtlasInitGoogle=()=>{
  if(g.ready)return;
  try{
   if(g.timeout)clearTimeout(g.timeout);
   g.map2d=new google.maps.Map($('map-google2d'),{
    center:{lat:39.5,lng:-97.5},zoom:4,mapTypeId:'hybrid',
    disableDefaultUI:true,zoomControl:false,gestureHandling:'greedy'
   });
   g.ready=true;g.scriptLoading=false;g.mode='2d';
   $('map-offline').hidden=true;
   $('map-google2d').hidden=false;
   $('map-notice').hidden=true;
   g.map2d.addListener('zoom_changed',refreshGoogleMarkers);
   refreshGoogleMarkers();
   resetGoogleCamera();
   setActiveModeButtons();
   $('connect-google').disabled=false;
   $('connect-google').textContent='Load Google Maps';
   $('maps-api-key').value=''; // Do not retain a key in the form after connection.
   $('settings-dialog').close();
  }catch(error){console.error(error);showGoogleFailure('Google Maps failed to initialize. Check the developer console.');}
 };
 const script=document.createElement('script');
 script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=beta&loading=async&callback=marketAtlasInitGoogle';
 script.async=true;
 script.onerror=()=>showGoogleFailure('Google Maps failed to load. Check your network and API restrictions.');
 document.head.append(script);
 // Prevent the setup UI from waiting forever when a key is invalid.
 g.timeout=setTimeout(()=>{if(!g.ready)showGoogleFailure('Google Maps timed out. Check billing, referrer restrictions and connectivity.');},15000);
}
function showSettings(){$('settings-dialog').showModal();$('settings-error').textContent='';}
function clearFilters(){$('search').value='';$('print-search').value='';$('region').value='';$('partner-type').value='';$('product-category').value='';$('custom-only').checked=false;refresh();}
function bar(parent,label,value,max){const row=node('div','insights-row');row.append(node('span','',label));const track=node('div','bar-track');const fill=node('div','bar-value');fill.style.width=(100*value/Math.max(1,max)).toFixed(2)+'%';track.append(fill);row.append(track,node('strong','',value));parent.append(row);}
function renderDistribution(){const target=$('distribution-view');target.replaceChildren();const products=visible.flatMap(allProducts),reg=products.filter(p=>p.custom==='No'),cus=products.filter(p=>p.custom==='Yes');
 target.append(node('h3','insights-title','Print distribution'),node('p','insights-sub','Assortment patterns and recurring print placements.'));
 const grid=node('div','insights-columns');const left=node('div','insights-block'),right=node('div','insights-block');left.append(node('h3','','Most distributed regular designs'));right.append(node('h3','','Print mix by region'));
 const printCount=new Map();for(const p of reg)printCount.set(p.print_name,(printCount.get(p.print_name)||0)+1);
 const top=[...printCount].sort((a,b)=>b[1]-a[1]).slice(0,8);top.forEach(([name,count])=>bar(left,name,count,top[0]?.[1]||1));
 const regions=unique(visible.map(s=>s.region));const regionCount=regions.map(r=>({name:r,count:visible.filter(s=>s.region===r).length})).sort((a,b)=>b.count-a.count);
 regionCount.forEach(a=>bar(right,a.name,a.count,regionCount[0]?.count||1));grid.append(left,right);target.append(grid,node('div','insights-note',`${reg.length} regular placements · ${cus.length} one-location custom editions · ${new Set(products.map(p=>p.product_id)).size} unique designs. All data is synthetic.`));
}
function renderCoverage(){const target=$('coverage-view');target.replaceChildren();target.append(node('h3','insights-title','Geographic coverage'),node('p','insights-sub','Compare network presence by state and identify locations with limited distribution.'));
 const stateCount=new Map();for(const s of visible)stateCount.set(s.state,(stateCount.get(s.state)||0)+1);const sorted=[...stateCount].sort((a,b)=>b[1]-a[1]);
 const grid=node('div','insights-columns');const a=node('div','insights-block'),b=node('div','insights-block');a.append(node('h3','','Largest state networks'));b.append(node('h3','','Smaller state networks'));
 sorted.slice(0,9).forEach(([state,count])=>bar(a,state,count,sorted[0]?.[1]||1));sorted.slice().reverse().slice(0,9).forEach(([state,count])=>bar(b,state,count,sorted[0]?.[1]||1));grid.append(a,b);target.append(grid,node('div','insights-note','Coverage is based on sample partner counts only. Sparse presence does not establish unmet demand; market potential would require external demand, competition, and sales data.'));
}
function switchView(next){view=next;document.querySelectorAll('.view-tab').forEach(el=>{const active=el.dataset.view===next;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});
 $('map-viewport').hidden=next!=='map';$('distribution-view').hidden=next!=='distribution';$('coverage-view').hidden=next!=='coverage';$('map-hint').textContent=next==='map'?'Select a store to explore its prints':next==='distribution'?'Distribution by product and region':'Partner distribution by state';
 if(next==='distribution')renderDistribution();if(next==='coverage')renderCoverage();if(next==='map'){if(googleState.ready){refreshGoogleMarkers();}else renderOfflineMarkers();}
}
function refresh(){visible=matchingStores();const productList=visible.flatMap(allProducts);$('stat-locations').textContent=visible.length;$('stat-regular').textContent=productList.filter(p=>p.custom==='No').length;$('stat-custom').textContent=productList.filter(p=>p.custom==='Yes').length;$('stat-placements').textContent=productList.length;$('map-count').textContent=`${visible.length} locations`;
 if(activeId&&!visible.some(s=>s.store_id===activeId))activeId=null;
 renderList();renderDetails();renderFocusCard();if(googleState.ready)refreshGoogleMarkers();else renderOfflineMarkers();if(view==='distribution')renderDistribution();if(view==='coverage')renderCoverage();
}
for(const id of ['search','print-search'])$(id).addEventListener('input',refresh);
for(const id of ['region','partner-type','product-category','custom-only'])$(id).addEventListener('change',refresh);
$('clear-filters').onclick=clearFilters;
document.querySelectorAll('.view-tab').forEach(el=>el.onclick=()=>switchView(el.dataset.view));
$('zoom-in').onclick=()=>{if(googleState.ready){if(googleState.mode==='3d' && googleState.map3d)googleState.map3d.range=Math.max(150,googleState.map3d.range/1.8);else googleState.map2d.setZoom(Math.min(20,(googleState.map2d.getZoom()||5)+1));}else zoomOffline(1.5);};
$('zoom-out').onclick=()=>{if(googleState.ready){if(googleState.mode==='3d' && googleState.map3d)googleState.map3d.range*=1.8;else googleState.map2d.setZoom(Math.max(2,(googleState.map2d.getZoom()||5)-1));}else zoomOffline(1/1.5);};
$('reset-map').onclick=()=>{if(googleState.ready)resetGoogleCamera();else{zoom=1;offsetX=offsetY=0;updateOfflineTransform();renderOfflineMarkers();}};
$('mode-3d').onclick=enable3D;$('mode-satellite').onclick=()=>{if(googleState.ready)enableSatellite();else showSettings();};
$('open-settings').onclick=showSettings;$('map-connect').onclick=showSettings;
$('connect-google').onclick=()=>{const key=$('maps-api-key').value.trim();if(!key){$('settings-error').textContent='Enter your Maps JavaScript API key.';return;}if(googleState.ready){$('settings-error').textContent='Google Maps is already connected for this session.';return;}bootGoogle(key);};
viewport.addEventListener('wheel',ev=>{if(googleState.ready || view!=='map')return;ev.preventDefault();zoomOffline(ev.deltaY<0?1.13:1/1.13);},{passive:false});
viewport.addEventListener('pointerdown',ev=>{if(googleState.ready||zoom===1||ev.target.closest('button'))return;drag={x:ev.clientX,y:ev.clientY,dx:offsetX,dy:offsetY};viewport.setPointerCapture(ev.pointerId);});
viewport.addEventListener('pointermove',ev=>{if(!drag)return;offsetX=drag.dx+ev.clientX-drag.x;offsetY=drag.dy+ev.clientY-drag.y;constrain();updateOfflineTransform();});
for(const e of ['pointerup','pointercancel'])viewport.addEventListener(e,()=>{drag=null;});
window.addEventListener('resize',()=>{constrain();updateOfflineTransform();if(!googleState.ready)renderOfflineMarkers();});
refresh();mapNote('Offline map',false);setActiveModeButtons();
const configKey=window.MARKET_ATLAS_CONFIG?.googleMapsApiKey?.trim();if(configKey)bootGoogle(configKey);
})();
