/**
 * How far the farthest ink a Graphics draws stands from its own origin, in
 * its own units: the oracle a mark's plate is held against
 * (docs/art-direction.md, "The plate under a mark"; #1801).
 *
 * Read off the shapes the Graphics was actually told to draw, never off a
 * second copy of their geometry: a circle's centre and radius, a polygon's
 * vertices, any other shape's box, and half a stroke's width past each. A
 * visible sprite child counts to its half-diagonal, and a Graphics child, a
 * creature's dots, by the same reading.
 */

import { Circle, Graphics, Polygon, Sprite } from 'pixi.js';

export function farthestInk(g: Graphics): number {
  let reach = 0;
  for (const instruction of g.context.instructions) {
    if (instruction.action !== 'fill' && instruction.action !== 'stroke') continue;
    const pad =
      instruction.action === 'stroke'
        ? ((instruction.data.style as { width?: number }).width ?? 0) / 2
        : 0;
    for (const { shape, transform } of instruction.data.path.shapePath.shapePrimitives) {
      const at = (x: number, y: number): number =>
        transform
          ? Math.hypot(
              transform.a * x + transform.c * y + transform.tx,
              transform.b * x + transform.d * y + transform.ty
            )
          : Math.hypot(x, y);
      if (shape instanceof Circle) {
        reach = Math.max(reach, at(shape.x, shape.y) + shape.radius + pad);
      } else if (shape instanceof Polygon) {
        for (let i = 0; i < shape.points.length; i += 2) {
          reach = Math.max(reach, at(shape.points[i]!, shape.points[i + 1]!) + pad);
        }
      } else {
        const box = shape.getBounds();
        for (const [x, y] of [
          [box.left, box.top],
          [box.right, box.top],
          [box.left, box.bottom],
          [box.right, box.bottom],
        ]) {
          reach = Math.max(reach, at(x!, y!) + pad);
        }
      }
    }
  }
  for (const child of g.children) {
    if (!child.visible) continue;
    if (child instanceof Sprite) {
      reach = Math.max(reach, Math.hypot(child.width, child.height) / 2);
    } else if (child instanceof Graphics) {
      reach = Math.max(reach, farthestInk(child));
    }
  }
  return reach;
}
