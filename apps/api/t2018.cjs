const { readFileSync } = require('fs');
const { convertCad } = require('./dist/convert/converters/cad.converter.js');
const dwg = readFileSync('C:/Users/INTERRA/AppData/Local/Temp/claude/C--Users-INTERRA-Desktop-file-convert/d7436f8b-9b4b-4d78-81e4-1981b15eb647/scratchpad/sample_2018.dwg');
(async () => {
  for (const t of ['dxf','svg','pdf']) {
    try {
      const r = await convertCad(dwg, 'dwg', t);
      console.log(`2018 dwg->${t}: OK bytes=${r.buffer.length} sniff=${r.buffer.slice(0,5).toString('latin1').replace(/\n/g,' ')}`);
    } catch(e) {
      console.log(`2018 dwg->${t}: THROW -> ${String(e?.message||e).slice(0,120)}`);
    }
  }
})();
