import { readFileSync, writeFileSync } from 'fs';
const { LibreDwg, Dwg_File_Type } = await import('@mlightcad/libredwg-web');
const dwg = readFileSync('C:/Users/INTERRA/AppData/Local/Temp/claude/C--Users-INTERRA-Desktop-file-convert/d7436f8b-9b4b-4d78-81e4-1981b15eb647/scratchpad/sample_2018.dwg');
const ab=(()=>{const u=new Uint8Array(dwg.byteLength);u.set(dwg);return u.buffer;})();
const lib = await LibreDwg.create();
writeFileSync('C:/Users/INTERRA/AppData/Local/Temp/claude/C--Users-INTERRA-Desktop-file-convert/d7436f8b-9b4b-4d78-81e4-1981b15eb647/scratchpad/s2018.dxf', Buffer.from(lib.dwg_write_dxf(ab)));
console.log('wrote s2018.dxf');
