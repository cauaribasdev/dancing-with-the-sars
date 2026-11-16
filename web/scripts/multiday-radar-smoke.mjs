// Run from repository root with Vite on 5173. API responses below are explicitly synthetic.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs';
const geo=JSON.parse(fs.readFileSync('server/data/regions.geojson','utf8'));
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

const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const {PNG}=require('pngjs');
const png=new PNG({width:8,height:8});for(let i=0;i<png.data.length;i+=4){png.data[i]=50;png.data[i+1]=150;png.data[i+2]=200;png.data[i+3]=255;}
const image=PNG.sync.write(png);
const region=states.find(f=>f.properties.id==='sc');const bbox=region.properties.bbox;
const passes=[1,2,3].map(n=>({id:'synthetic-'+n,conceptId:'c'+n,product:'GCOV',collection:'demo',maturity:'validated',productVersion:'1',start:`2026-11-${n===2?'02':'01'}T0${n}:00:00Z`,end:`2026-11-${n===2?'02':'01'}T0${n}:05:00Z`,date:n===2?'2026-11-02':'2026-11-01',cycle:1,orbit:1,track:n,frame:1,direction:'ascending',stackId:'stack-'+n,fullFrame:true,frequencies:['A'],polarizations:['HH'],rangeBandwidthMHz:20,sizeBytes:1024,footprint:region.geometry.type==='MultiPolygon'?{type:'Polygon',coordinates:region.geometry.coordinates[0]}:region.geometry,bbox,browse:{latlon:`https://example.test/browse/${n}.png`,thumbnail:`https://example.test/browse/${n}.png`},download:'https://example.test/download/'+n,qaReport:'https://example.test/qa/'+n}));
await page.route('https://example.test/browse/**',route=>route.fulfill({contentType:'image/png',body:image}));
await page.route('**/api/**',async route=>{
 const url=new URL(route.request().url());
 if(url.pathname==='/api/regions/sc/passes')return route.fulfill({json:{dataSource:'cache',region:region.properties,query:{start:'2026-11-01',end:'2026-11-15',product:'GCOV'},summary:{...summary,acquisitions:3,distinctDates:2,lastDate:'2026-11-02'},timeline:[{date:'2026-11-01',acquisitions:2,stacks:['stack-1','stack-3']},{date:'2026-11-02',acquisitions:1,stacks:['stack-2']}],passes}});
 if(url.pathname==='/api/regions/sc/footprints')return route.fulfill({json:{type:'FeatureCollection',features:passes.map(p=>({type:'Feature',geometry:p.footprint,properties:{id:p.id,date:p.date,stackId:p.stackId,direction:p.direction,maturity:p.maturity,thumbnail:p.browse.thumbnail}}))}});
 if(url.pathname==='/api/regions/sc/alerts')return route.fulfill({json:{dataSource:'cache',region:region.properties,updatedAt:'2026-11-15T12:00:00Z',summary:{active:0,highestSeverity:null},alerts:[]}});
 const match=url.pathname.match(/\/api\/passes\/synthetic-(\d)\/browse/);
 if(match)return route.fulfill({json:{passId:'synthetic-'+match[1],url:`https://example.test/browse/${match[1]}.png`,thumbnail:'',georef:match[1]==='3'?null:{bounds:bbox,corners:[[bbox[0],bbox[3]],[bbox[2],bbox[3]],[bbox[2],bbox[1]],[bbox[0],bbox[1]]],projection:'EPSG:3857',width:8,height:8,rmsErrorPx:0,pixelAspect:1,clippedCorners:[],quality:'good'}}});
 return route.fallback();
});
await page.goto('http://127.0.0.1:5173/region/sc?tab=radar&start=2026-11-01&end=2026-11-15&day=2026-11-01');
await page.getByLabel('Exibir todas as passagens do dia',{exact:true}).click();
await page.getByText('1/2 imagens prontas',{exact:false}).waitFor();
await page.getByRole('button',{name:/2 de novembro de 2026: 1 passagem/}).click();
await page.waitForURL(url=>url.searchParams.get('day')==='2026-11-02');
await page.getByText('1/2 imagens prontas',{exact:false}).waitFor();
await page.getByLabel('Exibir todas as passagens do dia',{exact:true}).click();
await page.getByText('2/3 imagens prontas',{exact:false}).waitFor();
assert.equal(new URL(page.url()).searchParams.getAll('image').length,3);
assert.deepEqual(await page.locator('.daily-controls ol small').allTextContents(), ['synthetic-1','synthetic-3','synthetic-2']);
await page.getByRole('heading',{name:'Imagens de múltiplas datas'}).waitFor();
await page.reload();
await page.getByText('2/3 imagens prontas',{exact:false}).waitFor();
await page.getByRole('button',{name:'Limpar imagens',exact:true}).click();
await page.getByText('2/3 imagens prontas',{exact:false}).waitFor({state:'hidden'});
await page.getByRole('button',{name:'Adicionar todas do período (3)',exact:true}).click();
await page.getByText('2/3 imagens prontas',{exact:false}).waitFor();
await page.getByLabel('Incluir imagem synthetic-2',{exact:true}).click();
await page.getByText('1/2 imagens prontas',{exact:false}).waitFor();
await page.getByLabel('Incluir imagem synthetic-2',{exact:true}).click();
await page.getByText('2/3 imagens prontas',{exact:false}).waitFor();
await page.screenshot({path:'/tmp/sars-multiday.png',fullPage:true});

// A06: tab changes, browser history and reload restore the selected period, day and pass.
await page.goto('http://127.0.0.1:5173/region/sc?tab=radar&start=2026-11-01&end=2026-11-15&day=2026-11-02&pass=synthetic-2');
await page.getByRole('heading',{name:/Passagem em/}).waitFor();
const sectionNav=page.getByRole('navigation',{name:'Seções do estado'});
await sectionNav.getByRole('link',{name:/Alertas/}).click();
await page.waitForURL(url=>url.searchParams.get('tab')==='alerts');
let restored=new URL(page.url()).searchParams;
assert.equal(restored.get('start'),'2026-11-01');
assert.equal(restored.get('end'),'2026-11-15');
assert.equal(restored.get('day'),'2026-11-02');
assert.equal(restored.get('pass'),'synthetic-2');
await sectionNav.getByRole('link',{name:/Radar/}).click();
await page.waitForURL(url=>url.searchParams.get('tab')==='radar');
await page.getByRole('heading',{name:/Passagem em/}).waitFor();
await page.goBack();
await page.waitForURL(url=>url.searchParams.get('tab')==='alerts');
await page.goForward();
await page.waitForURL(url=>url.searchParams.get('tab')==='radar');
await page.getByRole('heading',{name:/Passagem em/}).waitFor();
await page.reload();
await page.getByRole('heading',{name:/Passagem em/}).waitFor();
restored=new URL(page.url()).searchParams;
assert.equal(restored.get('start'),'2026-11-01');
assert.equal(restored.get('end'),'2026-11-15');
assert.equal(restored.get('day'),'2026-11-02');
assert.equal(restored.get('pass'),'synthetic-2');

// A07: changing the month clears selected day/pass/composition from the URL.
await page.getByRole('button',{name:/Voltar às passagens de/}).click();
await page.getByLabel('Mês',{exact:true}).selectOption('2026-10');
await page.waitForURL(url=>url.searchParams.get('start')==='2026-10-01'&&url.searchParams.get('end')==='2026-10-31');
restored=new URL(page.url()).searchParams;
assert.equal(restored.get('tab'),'radar');
for(const key of ['day','pass','image','images'])assert.equal(restored.has(key),false,`Changing month must clear ${key}`);

// Switching state also clears stale selection while preserving the selected period.
await page.goto('http://127.0.0.1:5173/region/sc?tab=radar&start=2026-11-01&end=2026-11-15&day=2026-11-02&pass=synthetic-2&images=selection&image=synthetic-2');
await page.getByRole('heading',{name:/Passagem em/}).waitFor();
await page.getByText('Trocar localização',{exact:true}).click();
await page.selectOption('#region-select','sp');
await page.waitForURL(url=>url.pathname==='/region/sp');
restored=new URL(page.url()).searchParams;
assert.equal(restored.get('start'),'2026-11-01');
assert.equal(restored.get('end'),'2026-11-15');
for(const key of ['day','pass','image','images'])assert.equal(restored.has(key),false,`Changing state must clear ${key}`);
assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: A06 tabs/back/forward/reload restore period/day/pass; A07 month and state changes clear stale selection');
