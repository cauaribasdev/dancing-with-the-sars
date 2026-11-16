// Run from repository root with Vite on 5173. API responses below are explicitly synthetic.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {PNG}=require('pngjs');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs';
const geo=JSON.parse(fs.readFileSync('server/data/regions.geojson','utf8'));
fs.mkdirSync('artifacts/redesign',{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
const states=geo.features.filter(f=>f.properties.kind==='state');
for(const f of states){const points=f.geometry.coordinates.flat(f.geometry.type==='MultiPolygon'?2:1);f.properties.bbox=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];}
const summary={acquisitions:0,distinctDates:0,stacks:0,firstDate:null,lastDate:null,medianGapDays:null};
await page.route('**/api/**',async route=>{
 const url=new URL(route.request().url());if(!url.pathname.startsWith("/api/")){await route.continue();return;}let data;
 if(url.pathname.endsWith('/regions/geojson')) data={type:'FeatureCollection',features:states};
 else if(url.pathname.endsWith('/regions')) data={regions:states.map(f=>f.properties)};
 else if(url.pathname.endsWith('/coverage')) data={dataSource:'cache',query:{start:'2026-11-01',end:'2026-11-14',product:'GCOV'},total:summary,states:states.map(f=>({...f.properties,...summary}))};
 else if(url.pathname.endsWith('/stories')) data={stories:[]};
 else {await route.fulfill({status:503,json:{error:{code:'upstream_unavailable',message:'Fixture de indisponibilidade'}}});return;}
 await route.fulfill({json:data});
});
await page.goto('http://127.0.0.1:5173/explore');
await page.waitForTimeout(2500);
await page.screenshot({path:'artifacts/redesign/brasil-desktop.png'});
const nationalClip=await page.locator('canvas').first().evaluate(el=>el.style.clipPath);
assert.ok(nationalClip.startsWith('path('),'national mask must be active');
const nationalMapBox=await page.locator('.territorial-map').boundingBox();
let mapSelected;
for(const [x,y] of [[.50,.75],[.52,.75],[.54,.75],[.56,.75],[.58,.75],[.50,.78],[.52,.78],[.54,.78],[.56,.78],[.58,.78],[.50,.81],[.52,.81],[.54,.81],[.56,.81],[.58,.81],[.50,.84],[.52,.84],[.54,.84],[.56,.84],[.58,.84],[.50,.87],[.52,.87],[.54,.87],[.56,.87],[.58,.87]]){
 if(new URL(page.url()).searchParams.has('region')){await page.goto('http://127.0.0.1:5173/explore');await page.waitForTimeout(900);}
 await page.mouse.click(nationalMapBox.x+nationalMapBox.width*x,nationalMapBox.y+nationalMapBox.height*y);
 await page.waitForTimeout(300);
 mapSelected=new URL(page.url()).searchParams.get('region');
 if(mapSelected==='sc')break;
}
assert.equal(new URL(page.url()).searchParams.get('region'),'sc','clicking Santa Catarina on the national map selects the same UF as the list');
await page.goto('http://127.0.0.1:5173/explore');
await page.waitForTimeout(1500);
await page.getByLabel('Buscar estado').fill('SC');
assert.equal(await page.locator('#region-select option[value=sc]').count(),1);
assert.equal(await page.locator('#region-select option[value=br]').count(),1);
await page.selectOption('#region-select','sc');
await page.getByLabel('Buscar estado').fill('');await page.waitForTimeout(1200);
await page.screenshot({path:'artifacts/redesign/sc-desktop.png'});
assert.match(page.url(),/region=sc/);
const stateClip=await page.locator('canvas').first().evaluate(el=>el.style.clipPath);
assert.notEqual(stateClip,nationalClip);
const mapBox=await page.locator('.territorial-map').boundingBox();
await page.mouse.move(mapBox.x+mapBox.width/2,mapBox.y+mapBox.height/2);await page.mouse.down();await page.mouse.move(mapBox.x+mapBox.width/2+60,mapBox.y+mapBox.height/2+40,{steps:8});await page.mouse.up();await page.waitForTimeout(800);
assert.ok((await page.locator('canvas').first().evaluate(el=>el.style.clipPath)).startsWith('path('),'drag retains geographic mask');
await page.locator('.maplibregl-ctrl-zoom-in').click();await page.waitForTimeout(500);
assert.notEqual(await page.locator('canvas').first().evaluate(el=>el.style.clipPath),stateClip,'mask must follow zoom');
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);
await page.screenshot({path:'artifacts/redesign/sc-mobile.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile must not overflow');
await page.setViewportSize({width:320,height:720});await page.waitForTimeout(500);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'320px must not overflow');
await page.setViewportSize({width:1440,height:900});
await page.goto('http://127.0.0.1:5173/region/sc?tab=radar');await page.waitForTimeout(1500);
assert.ok((await page.locator('canvas').first().evaluate(el=>el.style.clipPath)).startsWith('path('));
await page.getByRole('navigation',{name:'Seções do estado'}).getByRole('link',{name:/Alertas/}).click();await page.waitForTimeout(1500);
assert.match(page.url(),/tab=alerts/);
await page.screenshot({path:'artifacts/redesign/sc-alerts.png'});
assert.deepEqual(errors,[]);
// A raster extending beyond a concave polygon and its interior hole: verify actual composited pixels.
await page.evaluate(async()=>{
 const {territoryPath}=await import('/src/map/territory.ts');
 const path=territoryPath([{type:'Polygon',coordinates:[[[10,10],[190,10],[190,90],[90,90],[90,190],[10,190],[10,10]],[[30,30],[50,30],[50,50],[30,50],[30,30]]]}],p=>({x:p[0],y:p[1]}));
 document.body.innerHTML='<div id=clip-test style="width:200px;height:200px;background:black"><canvas width=200 height=200></canvas></div>';
 const canvas=document.querySelector('canvas');canvas.style.clipPath=`path(evenodd, "${path}")`;
 const ctx=canvas.getContext('2d');const image=document.createElement('canvas');image.width=200;image.height=200;const source=image.getContext('2d');source.fillStyle='red';source.fillRect(0,0,200,200);ctx.drawImage(image,0,0);ctx.strokeStyle='red';ctx.strokeRect(0,0,199,199);
});
const screenshot=await page.locator('#clip-test').screenshot({path:'artifacts/redesign/raster-clip.png'});
const pixels=PNG.sync.read(screenshot);const red=(x,y)=>pixels.data[(y*pixels.width+x)*4];
assert.equal(red(20,20),255,'inside raster remains');
assert.equal(red(150,150),0,'concavity clips crossing raster');
assert.equal(red(40,40),0,'interior hole remains empty');
assert.equal(red(5,5),0,'outside boundary remains empty');
console.log('PASS: Brasil/SC, zoom, mobile, browser errors and cross-boundary raster/hole clipping');
await browser.close();
