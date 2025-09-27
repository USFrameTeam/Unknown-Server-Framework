const fs = require('node:fs');
const archiver = require('archiver');
const SRC_PATH = 'BehaviourPack/';

const archive = archiver('zip', {
  zlib: { level: 9 }
});

archive.append(
  JSON.stringify(
    JSON.parse(
      fs.readFileSync(
        SRC_PATH + 'manifest.json', 'utf8'
      )
    )
  ),
  { name: 'manifest.json' }
);
archive.file(SRC_PATH + 'pack_icon.png', { name: 'pack_icon.png' });
['entities', 'items', 'cameras/presets'].forEach(name => {
  const path = SRC_PATH + name;

  fs.readdirSync(path)
    .map(_filename => ({
      filename: path + '/' + _filename,
      content: fs.readFileSync(path + '/' + _filename, 'utf8')
    }))
    .forEach(({ filename, content }) =>
      archive.append(JSON.stringify(JSON.parse(content)), { name: filename.substring(SRC_PATH.length) })
    );
});
archive.directory(SRC_PATH + 'functions', 'functions');
archive.file('temp/Main.js', { name: 'scripts/Main.js' });

archive.finalize();

!fs.existsSync('./build') && fs.mkdirSync('build');
const name = './build/latest.mcpack';

archive.on('error', (err) => {
  throw err;
});

const output = fs.createWriteStream(name);

archive.pipe(output).on('finish', () => {
  fs.rmSync('temp', { recursive: true, force: true });
  console.log(`${name} 文件已成功创建，共包含 ${archive.pointer()} 字节`);
});
