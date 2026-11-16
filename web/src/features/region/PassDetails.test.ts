import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router';
import {expect,it} from 'vitest';
import type {Pass} from '../../api/types';
import {PassDetails} from './PassDetails';
const pass = {id:'after',date:'2026-07-23',start:'2026-07-23T01:00:00Z',stackId:'053_D_103',direction:'descending',maturity:'validated',polarizations:['HH'],track:53,frame:103,sizeBytes:1000000,download:'https://example.test/download',qaReport:'https://example.test/qa'} as Pass;
it('offers chronological comparison and Portuguese passage/download controls',()=>{
 const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(PassDetails,{pass,previous:{status:'found',pass:{...pass,id:'before',date:'2026-07-11'}},next:{status:'none'},onBack:()=>{}})));
 expect(html).toContain('/compare?before=before&amp;after=after');
 expect(html).toContain('Comparar com outra data:');
 expect(html).toContain('Baixar produto');
 expect(html).toContain('Passagem em');
 expect(html).not.toMatch(/Passo|este passo|apart|>Download it</);
});
