import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const checks=[
  ['disclosure',html.includes('Independent concept demo')],['legal limit',html.includes('Not legal advice')],['wizard',html.includes('id="willForm"')],['five panels',(html.match(/data-step=/g)||[]).length===5],['conditional spouse',html.includes('id="spouseWrap"')],['conditional children',html.includes('id="childrenWrap"')],['restored branches',js.includes("d.married!=='Yes'")&&js.includes("d.children!=='Yes'")],['required fields',html.includes('name="executor" required')],['review',js.includes('function buildReview')],['local save',js.includes('localStorage')],['simulated payment',html.includes('Simulate secure payment')],['pdf',js.includes("application/pdf")],['PDF sanitization',js.includes("normalize('NFKD')")],['chat',html.includes('id="chatForm"')],['bounded answers',js.includes('qualified attorney')],['WebMCP',js.includes('start_will_demo')],['mobile',css.includes('@media(max-width:500px)')],['reduced motion',css.includes('prefers-reduced-motion')],['focus',css.includes(':focus-visible')],['no external assets',!html.includes('http')],['no contact info',!/@|mailto:|tel:/.test(html)],['no real card capture',!/(card number|cvv|cvc)/i.test(html)]];
for(const [name,ok] of checks) assert.ok(ok,`Failed: ${name}`);
console.log(`${checks.length} demo checks passed`);
