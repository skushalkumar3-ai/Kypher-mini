const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets');
fs.mkdirSync(outDir, { recursive: true });

function makePng(name, width, height, draw) {
  const png = new PNG({ width, height });
  draw({
    rect(x, y, w, h, color) {
      const [r, g, b, a = 255] = color;
      for (let yy = y; yy < y + h; yy += 1) {
        for (let xx = x; xx < x + w; xx += 1) {
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          const idx = (width * yy + xx) << 2;
          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = a;
        }
      }
    }
  });
  png.pack().pipe(fs.createWriteStream(path.join(outDir, name)));
}

function cat(ctx, step = 0) {
  const fur = [42, 45, 58, 255];
  const shade = [20, 22, 30, 255];
  const ear = [255, 122, 182, 255];
  const mint = [101, 255, 214, 255];
  ctx.rect(25, 30, 34, 28, fur);
  ctx.rect(18, 40, 48, 34, fur);
  ctx.rect(27, 20, 8, 13, fur);
  ctx.rect(49, 20, 8, 13, fur);
  ctx.rect(30, 24, 4, 5, ear);
  ctx.rect(51, 24, 4, 5, ear);
  ctx.rect(34, 43, 5, 5, mint);
  ctx.rect(50, 43, 5, 5, mint);
  ctx.rect(43, 51, 5, 4, ear);
  ctx.rect(11, 52, 13, 7, fur);
  ctx.rect(7, 47, 8, 7, shade);
  ctx.rect(25, 73, 9, step ? 12 : 7, fur);
  ctx.rect(52, 73, 9, step ? 7 : 12, fur);
}

makePng('walk-1.png', 96, 96, (ctx) => cat(ctx, 0));
makePng('walk-2.png', 96, 96, (ctx) => cat(ctx, 1));

makePng('focus.png', 128, 96, (ctx) => {
  cat(ctx, 0);
  ctx.rect(70, 58, 42, 8, [101, 255, 214, 230]);
  ctx.rect(76, 38, 26, 20, [18, 24, 38, 230]);
  ctx.rect(80, 42, 18, 3, [255, 214, 107, 255]);
  ctx.rect(31, 36, 28, 5, [255, 122, 182, 255]);
});

makePng('sleep.png', 96, 96, (ctx) => {
  ctx.rect(20, 55, 48, 22, [42, 45, 58, 255]);
  ctx.rect(28, 44, 30, 20, [42, 45, 58, 255]);
  ctx.rect(32, 38, 8, 10, [42, 45, 58, 255]);
  ctx.rect(51, 38, 8, 10, [42, 45, 58, 255]);
  ctx.rect(36, 52, 7, 2, [101, 255, 214, 255]);
  ctx.rect(49, 52, 7, 2, [101, 255, 214, 255]);
});

makePng('message.png', 160, 72, (ctx) => {
  ctx.rect(8, 8, 144, 50, [18, 24, 38, 155]);
  ctx.rect(18, 58, 18, 8, [18, 24, 38, 155]);
  ctx.rect(8, 8, 144, 2, [101, 255, 214, 185]);
  ctx.rect(8, 56, 144, 2, [255, 122, 182, 135]);
});

makePng('zzz.png', 64, 64, (ctx) => {
  ctx.rect(12, 14, 30, 6, [255, 214, 107, 255]);
  ctx.rect(36, 20, 6, 6, [255, 214, 107, 255]);
  ctx.rect(30, 26, 6, 6, [255, 214, 107, 255]);
  ctx.rect(24, 32, 18, 6, [255, 214, 107, 255]);
});

makePng('treat.png', 48, 48, (ctx) => {
  const dough = [196, 142, 78, 255];
  const chip = [72, 39, 25, 255];
  ctx.rect(12, 10, 24, 4, dough);
  ctx.rect(8, 14, 32, 20, dough);
  ctx.rect(12, 34, 24, 4, dough);
  ctx.rect(15, 18, 5, 5, chip);
  ctx.rect(29, 17, 5, 5, chip);
  ctx.rect(22, 28, 5, 5, chip);
});

console.log('Generated transparent pixel assets in assets/.');
