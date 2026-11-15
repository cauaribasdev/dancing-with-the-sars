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
 else if(url.pathname==='/api/regions/sc/passes') data={dataSource:'cache',region:states.find(f=>f.properties.id==='sc').properties,query:{start:url.searchParams.get('start'),end:url.searchParams.get('end'),product:'GCOV'},summary,timeline:[],passes:[]};
 else if(url.pathname==='/api/regions/sc/pairs') data={dataSource:'cache',region:states.find(f=>f.properties.id==='sc').properties,query:{start:url.searchParams.get('start'),end:url.searchParams.get('end'),product:'GCOV',eventDate:null,mode:'consecutive'},count:0,pairs:[]};
 else if(url.pathname.endsWith('/stories')) data={stories:[]};
 else {await route.fulfill({status:503,json:{error:{code:'upstream_unavailable',message:'Fixture de indisponibilidade'}}});return;}
 await route.fulfill({json:data});
});
await page.goto('http://127.0.0.1:5173/explore');
await page.getByLabel('Buscar estado').fill('sao');
await page.getByRole('button',{name:'São Paulo (SP)',exact:true}).click();
await page.waitForURL('**region=sp');
assert.equal(await page.getByLabel('Buscar estado').inputValue(),'');
await page.getByLabel('Buscar estado').fill('  sc  ');
await page.getByRole('button',{name:'Santa Catarina (SC)',exact:true}).focus();
await page.keyboard.press('Enter');
await page.waitForURL('**region=sc');
await page.getByRole('link',{name:'Abrir Radar de SC'}).click();
await page.waitForURL(url=>url.pathname==='/region/sc' && url.searchParams.get('tab')==='radar');
await page.getByRole('navigation',{name:'Seções do estado'}).getByRole('link',{name:/Alertas/}).click();
await page.waitForURL(url=>url.pathname==='/region/sc' && url.searchParams.get('tab')==='alerts');
await page.getByRole('link',{name:'← Mapa de Santa Catarina',exact:true}).click();
await page.waitForURL(url=>url.pathname==='/explore' && url.searchParams.get('region')==='sc');
await page.getByRole('link',{name:'Abrir Radar de SC'}).waitFor();
await page.getByRole('link',{name:'Abrir Radar de SC'}).click();
await page.waitForURL(url=>url.pathname==='/region/sc' && url.searchParams.get('tab')==='radar');
await page.goBack();
await page.waitForURL(url=>url.pathname==='/explore' && url.searchParams.get('region')==='sc');
await page.goForward();
await page.waitForURL(url=>url.pathname==='/region/sc' && url.searchParams.get('tab')==='radar');
await page.reload();
await page.getByRole('navigation',{name:'Seções do estado'}).getByRole('link',{name:/Radar/}).waitFor();
for(const invalid of ['/region/br','/region/norte','/region/xx']) {
 await page.goto('http://127.0.0.1:5173'+invalid);
 await page.getByRole('heading',{name:'Esta página não existe'}).waitFor();
 await page.getByRole('link',{name:'Abrir o mapa'}).click();
 await page.waitForURL('**/explore');
}
for(const [legacy,tab] of [['/region/sc?pass=legacy-pass','radar'],['/region/sc?day=2026-11-02','radar'],['/region/sc','overview']]) {
 await page.goto('http://127.0.0.1:5173'+legacy);
 await page.waitForURL(url=>url.pathname==='/region/sc' && url.searchParams.get('tab')===tab);
 assert.equal(new URL(page.url()).searchParams.get('tab'),tab);
}
await page.getByText('Dados insuficientes').waitFor();
await page.getByText('Nenhum par disponível.').waitFor();
await page.goto('http://127.0.0.1:5173/region/sc?tab=invalid&start=bad&pass=legacy-pass');
await page.getByText('Parâmetros inválidos. Aplicado o período padrão de 30 dias UTC.').waitFor();
await page.waitForURL(url=>url.pathname==='/region/sc' && url.searchParams.get('tab')==='overview' && !url.searchParams.has('pass'));
await page.goto('http://127.0.0.1:5173/explore?region=sc');
await page.waitForURL('**/explore?region=sc');
await page.screenshot({path:'/tmp/sars-sidebar-ux.png'});
await page.getByLabel('Buscar estado').fill('zzzzz');
assert.equal(await page.getByText('Nenhum estado encontrado.').count(),1);
assert.match(page.url(),/region=sc/);
await page.getByRole('button',{name:'Retornar ao Brasil',exact:true}).click();
await page.waitForURL(url=>!url.searchParams.has('region'));
await page.setViewportSize({width:390,height:844});
await page.getByRole('button',{name:/Localização e filtros/}).click();
await page.getByLabel('Buscar estado').fill('sao');
await page.getByRole('button',{name:'São Paulo (SP)',exact:true}).click();
await page.waitForURL(url=>url.searchParams.get('region')==='sp');
await page.getByRole('link',{name:'Abrir Radar de SP'}).waitFor();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: search by unaccented name, trimmed UF, keyboard selection, empty result, return to Brazil');
