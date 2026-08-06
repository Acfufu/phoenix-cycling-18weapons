/* =========================================================
   build-single.js · 单文件构建
   把 css/ 与 js/ 按 index.html 的依赖顺序内联进 dist/index.html，
   产出"一个文件、双击即玩、可任意分发"的版本。
   源码保持多文件模块化；发布时才合并。

   运行：node scripts/build-single.js
   ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

let html = read('index.html');

// 内联 CSS
html = html.replace(
  /<link[^>]*href="(css\/[^"?]+\.css)(?:\?[^"]*)?"[^>]*>/g,
  (m, p) => '<style>\n' + read(p) + '\n</style>'
);

// 内联 JS（保留 index.html 中 script 的依赖顺序）
html = html.replace(
  /<script src="(js\/[^"?]+\.js)(?:\?[^"]*)?"\s*><\/script>/g,
  (m, p) => '<script>\n' + read(p) + '\n</script>'
);

// 校验：不应再残留任何外部资源引用
const leftover = html.match(/\bsrc="(?!data:)[^"]+"/g) || [];
if (leftover.length) {
  console.error('仍有未内联的外部引用:', leftover);
  process.exit(1);
}

fs.mkdirSync(DIST, { recursive: true });
const outPath = path.join(DIST, 'index.html');
fs.writeFileSync(outPath, html);

const size = (fs.statSync(outPath).size / 1024).toFixed(0) + ' KB';
console.log('已生成 ' + path.relative(ROOT, outPath) + '（' + size + '，' + (html.match(/<script>/g) || []).length + ' 个脚本内联）');
