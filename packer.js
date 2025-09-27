const fs = require('node:fs');
const archiver = require('archiver');
const SRC_PATH = 'BehaviourPack/';

const minimizedJSONs = ['entities', 'items', 'cameras/presets'].map(name => {
  const path = SRC_PATH + name;
  return fs.readdirSync(path).map(filename => {
    filename = path + '/' + filename;
    return [filename, fs.readFileSync(filename, 'utf8')
      .replaceAll('\r', '')
      .replaceAll('\n', '')
      .replaceAll('\t', '')
      .replaceAll(' ', '')];
  });
}).flat(1);

const archive = archiver('zip', {
  zlib: { level: 9 }
});

archive.file(SRC_PATH + 'manifest.json', { name: 'manifest.json' });
archive.file(SRC_PATH + 'pack_icon.png', { name: 'pack_icon.png' });
minimizedJSONs.forEach(data => archive.append(data[1], { name: data[0].substring(SRC_PATH.length) }));
archive.directory(SRC_PATH + 'functions', 'functions');
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
