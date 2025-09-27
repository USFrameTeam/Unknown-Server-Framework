const fs = require('node:fs');
const archiver = require('archiver');

const archive = archiver('zip', {
  zlib: { level: 9 }
});

archive.file('BehaviourPack/manifest.json', { name: 'manifest.json' });
archive.file('BehaviourPack/pack_icon.png', { name: 'pack_icon.png' });
['cameras','items','functions','entities'].forEach(_=>archive.directory('BehaviourPack/' + _, _));
archive.file('temp/Main.js', { name: 'scripts/Main.js' });

archive.finalize();

!fs.existsSync('./build') && fs.mkdirSync('build');
const name = './build/latest.mcpack';

archive.on('error', (err) => {
  throw err;
});

const output = fs.createWriteStream(name);

output.on('close', () => console.log(`${name} 文件已成功创建，共包含 ${archive.pointer()} 字节`));

archive.pipe(output).on('finish', () => {
  fs.rmSync('temp', { recursive: true, force: true });
});
