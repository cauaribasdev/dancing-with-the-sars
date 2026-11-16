// Home navigation, actual API previews and synthetic failure states. Vite + API must be running.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://localhost:5173/');
 await page.getByRole('heading',{name:'Veja como o território muda com o radar NISAR.'}).waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('.spaceapps-brand img')].every(img=>img.complete&&img.naturalWidth>0));
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('html').getAttribute('lang'),'pt-BR');
 await page.getByAltText(/Prévia NISAR.*antes/).waitFor({timeout:120000});
 await page.getByAltText(/Prévia NISAR.*depois/).waitFor({timeout:120000});
 await page.waitForFunction(()=>[...document.querySelectorAll('.home-preview img')].every(img=>img.complete&&img.naturalWidth>0));
 assert.equal(await page.getByRole('link',{name:/Ver mudanças no Rio Grande do Sul/}).getAttribute('href'),'/story/rs-flood-jul-2026');
 await page.getByRole('link',{name:/Ver mudanças no Rio Grande do Sul/}).focus();
 await page.keyboard.press('Enter');
 await page.waitForURL('**/story/rs-flood-jul-2026');
 await page.goBack();
 fs.mkdirSync('artifacts/home',{recursive:true});
 await page.screenshot({path:'artifacts/home/desktop.png',fullPage:true});
 for(const width of [390,320]) {
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
   await page.screenshot({path:`artifacts/home/mobile-${width}.png`,fullPage:true});
 }
 await page.getByRole('heading',{name:'Escolha por onde explorar'}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'artifacts/home/mobile-bottom.png',fullPage:true});
 await page.getByRole('link',{name:/Explorar o mapa/}).click();await page.waitForURL('**/explore');
 await page.goto('http://localhost:5173/?region=sc&month=2026-07');
 await page.waitForURL('**/explore?region=sc&month=2026-07');
 // New context prevents successful API responses from hiding the synthetic failure.
 const offline=await browser.newPage();
 await offline.route('**/api/stories/rs-flood-jul-2026',route=>route.fulfill({status:404,json:{error:{code:'not_found',message:'Synthetic missing story'}}}));
 await offline.goto('http://localhost:5173/');
 await offline.getByText('Não foi possível carregar a prévia da história.').waitFor();
 await offline.getByRole('button',{name:'Tentar novamente',exact:true}).waitFor();
 await offline.getByRole('link',{name:/Explorar o mapa/}).click();await offline.waitForURL('**/explore');
 const empty=await browser.newPage();
 await empty.route('**/api/stories/rs-flood-jul-2026',route=>route.fulfill({json:{pairs:[],dataSource:'cache'}}));
 await empty.goto('http://localhost:5173/');
 await empty.getByText('Nenhum par de imagens disponível para esta prévia.').waitFor();
 assert.equal(await empty.locator('.home-preview img').count(),0);
 assert.deepEqual(errors,[]);
 console.log('Home smoke passed: real previews, story/map links, legacy URL, mobile, synthetic unavailable story.');
} finally { await browser.close(); }
