import * as PIXI from 'pixi.js';

const app = new PIXI.Application({ width: 960, height: 600, backgroundColor: 0x06161c });
document.getElementById('app')?.appendChild(app.view as HTMLCanvasElement);

const info = new PIXI.Text('Click units to select. Click ground to move.', { fill: 0x99ffcc });
info.x = 12; info.y = 8; info.style.fontSize = 14;
app.stage.addChild(info);

type Unit = {
  id: string;
  gfx: PIXI.Graphics;
  x: number;
  y: number;
  speed: number;
  target?: { x: number; y: number };
  selected: boolean;
};

const units: Unit[] = [];
const selectionRing = new PIXI.Graphics();
selectionRing.visible = false;
app.stage.addChild(selectionRing);

// Helper: create a circular unit
function makeUnit(id: string, x: number, y: number, color = 0x88ccff) {
  const g = new PIXI.Graphics();
  g.beginFill(color);
  g.drawCircle(0, 0, 14);
  g.endFill();
  g.lineStyle(2, 0x0b1f2b);
  g.drawCircle(0, 0, 14);
  g.x = x; g.y = y;
  g.interactive = true;
  g.cursor = 'pointer';
  app.stage.addChild(g);

  const unit: Unit = { id, gfx: g, x, y, speed: 80 + Math.random() * 40, selected: false };

  g.on('pointerdown', (ev: PIXI.FederatedPointerEvent) => {
    ev.stopPropagation(); // don't let stage pointerdown fire
    selectUnit(unit, ev.ctrlKey || ev.shiftKey);
  });

  units.push(unit);
}

// Create sample units
for (let i = 0; i < 8; i++) {
  makeUnit(`u${i+1}`, 120 + i * 90, 180 + (i % 2) * 120, 0x88ccff);
}
for (let i = 0; i < 6; i++) {
  makeUnit(`d${i+1}`, 180 + i * 100, 420, 0xffcc88);
}

// Click on empty stage to issue move command
app.stage.interactive = true;
app.stage.on('pointerdown', (ev: PIXI.FederatedPointerEvent) => {
  const p = ev.global;
  issueMoveCommand(p.x, p.y);
});

function selectUnit(unit: Unit, additive = false) {
  if (!additive) {
    units.forEach(u => { u.selected = false; });
  }
  unit.selected = !unit.selected;
  updateSelectionVisuals();
}

function updateSelectionVisuals() {
  selectionRing.clear();
  const sel = units.filter(u => u.selected);
  if (sel.length === 0) {
    selectionRing.visible = false;
    info.text = 'Click units to select. Click ground to move.';
    return;
  }
  selectionRing.visible = true;
  sel.forEach(u => {
    selectionRing.lineStyle(2, 0x99ffcc, 0.9);
    selectionRing.drawCircle(u.x, u.y, 20);
  });
  info.text = `${sel.length} unit(s) selected — click ground to set target.`;
}

function issueMoveCommand(x: number, y: number) {
  const sel = units.filter(u => u.selected);
  if (sel.length === 0) return;
  // Assign targets with small spread
  sel.forEach((u, i) => {
    u.target = { x: x + (i - sel.length / 2) * 16, y: y + (i % 2) * 12 };
  });
}

// Update loop: simple movement towards target
app.ticker.add((delta) => {
  const dt = delta / app.ticker.FPS; // seconds (approx)
  units.forEach(u => {
    if (u.target) {
      const dx = u.target.x - u.x;
      const dy = u.target.y - u.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        delete u.target;
      } else {
        const vx = (dx / dist) * u.speed * (1/60);
        const vy = (dy / dist) * u.speed * (1/60);
        u.x += vx;
        u.y += vy;
        u.gfx.x = u.x;
        u.gfx.y = u.y;
      }
    }
    // selection tint
    u.gfx.alpha = u.selected ? 1 : 0.9;
    u.gfx.tint = u.selected ? 0x99ffcc : 0xFFFFFF;
  });
  // redraw selection rings (clear then re-draw)
  updateSelectionVisuals();
});

console.log('Example scene started');
