import * as PIXI from 'pixi.js';

const app = new PIXI.Application({ width: 800, height: 600, backgroundColor: 0x0b1f2b });
document.getElementById('app')?.appendChild(app.view as HTMLCanvasElement);

const text = new PIXI.Text('Echoes — Prototype', { fill: 0xffffff });
text.x = 20; text.y = 20;
app.stage.addChild(text);

console.log('Pixi app started');
