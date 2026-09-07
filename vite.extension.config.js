import {defineConfig} from 'vite';
import {copyFileSync,mkdirSync,cpSync} from 'node:fs';
import {resolve} from 'node:path';
export default defineConfig({
  root: 'chrome-extension', base: './', publicDir: false,
  build: {outDir: '../outputs/chrome-extension', emptyOutDir: true, rollupOptions: {input: resolve('chrome-extension/panel.html')}},
  plugins: [{name:'extension-package',closeBundle(){
    const out='outputs/chrome-extension'; mkdirSync(out,{recursive:true});
    for(const file of ['manifest.json','background.js','README-BN.md'])copyFileSync(`chrome-extension/${file}`,`${out}/${file}`);
    copyFileSync('public/income-declaration-page1.png',`${out}/income-declaration-page1.png`);
    cpSync('public/fonts',`${out}/fonts`,{recursive:true});
  }}],
});
