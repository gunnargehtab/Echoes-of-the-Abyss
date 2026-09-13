/**
 * What a payload must look like at runtime — the table and the validator #628
 * added beside the message contract.
 *
 * Most of the table is already a compile error: a message with no entry, a
 * field name that is not on its payload, and an optional field left out are
 * all caught by `ShapeOf<>` and all name the offender in the diagnostic. What
 * is left for a test is the half a type cannot reach — that the declarations
 * are *complete in the ways that matter to the room*, and that the validator
 * reads them the way the room assumes it does.
 *
 * Written to hold the class rather than the instances, in the shape
 * `wire.test.ts` sets. So: every array field is bounded, whatever it is
 * called; every message's shape is reachable under the name it travels under,
 * whatever its casing; and every kind of field refuses the same family of
 * things. An assertion naming one message would only say that one message was
 * read once.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CLIENT_MSG, CLIENT_SHAPE, WIRE, isValidClientMessage } from '../dist/index.js';
import type { FieldShape, MessageShape } from '../dist/index.js';

/** The table, widened once so it can be walked without naming a message. */
const shapes = CLIENT_SHAPE as unknown as Record<string, MessageShape>;

/** Every field of every message, as `message.field` and its declaration. */
function everyField(): [string, FieldShape][] {
  const fields: [string, FieldShape][] = [];
  for (const [name, shape] of Object.entries(shapes)) {
    for (const [field, spec] of Object.entries(shape)) fields.push([`${name}.${field}`, spec]);
  }
  return fields;
}

describe('the shape table', () => {
  it('declares a shape for every name a client can actually send', () => {
    // The runtime half of the annotation on `CLIENT_SHAPE`. The compiler holds
    // it against `ClientMessages`, which is keyed by wire name; this holds it
    // against `CLIENT_MSG`, which is the map a sender reaches through. They
    // agree today and the whole file depends on them agreeing, so the case
    // worth ruling out is the one no type sees: a name present in the map and
    // absent from the table because the two were edited a week apart.
    for (const wire of Object.values(CLIENT_MSG)) {
      assert.ok(wire in shapes, `${wire} has no declared shape`);
    }
    assert.equal(Object.keys(shapes).length, Object.keys(CLIENT_MSG).length);
  });

  it('needs no special case for the one name whose casing differs', () => {
    // #621 measured the trap: a table keyed on `CLIENT_MSG`'s *keys* reports a
    // spurious `depthcharge`, because that one name is lower case on the wire
    // and camelCase as a key. This table is keyed as `ClientMessages` is —
    // by the wire name — so the oddity costs nothing here. If someone rekeys
    // it, this fails before the room starts dropping depth charges.
    assert.ok('depthcharge' in shapes);
    assert.ok(!('depthCharge' in shapes));
  });

  it('bounds every array field, and none above the declared maximum', () => {
    // Criterion 3, held as a property rather than as a list of five names.
    // `unitIds` is the obvious one; the point is that a *new* array field
    // cannot arrive unbounded, whatever it is called.
    for (const [where, spec] of everyField()) {
      if (spec.type !== 'idList') continue;
      assert.equal(typeof spec.max, 'number', `${where} is an array with no bound`);
      assert.ok(
        spec.max! > 0 && spec.max! <= WIRE.MAX_IDS,
        `${where} is bounded above WIRE.MAX_IDS`
      );
    }
  });

  it('declares at least one bounded array, so the rule above has something to hold', () => {
    // A property test over an empty set passes. This is what stops the one
    // above from becoming a green light for a table with no arrays left in it.
    const arrays = everyField().filter(([, spec]) => spec.type === 'idList');
    assert.ok(arrays.length >= 5, `expected the id arrays to be declared, found ${arrays.length}`);
  });
});

describe('the validator', () => {
  it('refuses a number field that is not a finite number', () => {
    // Every one of these reaches the sim as a position, a depth or an id, and
    // every one of them poisons whatever it touches. `Number.isFinite` was
    // what the hand-written lines used where they were written at all; this is
    // the same check where it cannot be forgotten.
    for (const bad of [Number.NaN, Infinity, -Infinity, '4', null, {}, [], true]) {
      assert.equal(isValidClientMessage('ping', { unitId: bad }), false, `unitId ${String(bad)}`);
    }
    assert.equal(isValidClientMessage('ping', { unitId: 7 }), true);
    assert.equal(isValidClientMessage('ping', { unitId: -0.5 }), true, 'ids are not integers here');
  });

  it('refuses an id array that is not an array of finite numbers', () => {
    for (const bad of [7, 'unitIds', null, { length: 2 }, [1, '2'], [1, Number.NaN]]) {
      assert.equal(isValidClientMessage('stop', { unitIds: bad }), false, `unitIds ${String(bad)}`);
    }
    assert.equal(isValidClientMessage('stop', { unitIds: [] }), true, 'an empty order is legal');
    assert.equal(isValidClientMessage('stop', { unitIds: [1, 2, 3] }), true);
  });

  it('refuses an over-long array whole, rather than truncating it', () => {
    // The refusal is the assertion. A validator that trimmed would leave the
    // room applying part of an order nobody gave, which is a worse answer than
    // no order — and it would make the bound invisible to the sender.
    const atTheLimit = Array.from({ length: WIRE.MAX_IDS }, (_, i) => i);
    assert.equal(isValidClientMessage('stop', { unitIds: atTheLimit }), true);
    assert.equal(isValidClientMessage('stop', { unitIds: [...atTheLimit, 1] }), false);
  });

  it('tells a required field from an optional one', () => {
    // `active` is required by `HoldMessage` and `queued` is not, and the table
    // is where that difference is now said. Before this the room read both
    // through `Boolean(...)`, which cannot tell "false" from "absent".
    assert.equal(isValidClientMessage('hold', { unitIds: [1], active: true }), true);
    assert.equal(isValidClientMessage('hold', { unitIds: [1] }), false, 'active is required');
    assert.equal(isValidClientMessage('move', { unitIds: [1], x: 0, y: 0 }), true);
    assert.equal(
      isValidClientMessage('move', { unitIds: [1], x: 0, y: 0, queued: 'yes' }),
      false,
      'optional means the client may omit it, not that it may send anything'
    );
  });

  it('ignores fields the shape does not declare', () => {
    // Deliberate, and the reason is compatibility rather than laziness: the
    // contract is what the room reads, so refusing on an unknown field would
    // make adding one to a payload a protocol break for every client not yet
    // rebuilt. A client that sends more than the table is wasting its own
    // bytes.
    assert.equal(isValidClientMessage('ping', { unitId: 3, mood: 'grim' }), true);
  });

  it('refuses anything that is not an object, including no payload at all', () => {
    // `undefined` is refused rather than read as the empty payload, so that
    // the narrowing this function does is true of what it narrows. The room
    // normalises a missing payload to `{}` before asking — see
    // `MatchRoom.onClientMessage` — which is why the two lines below differ.
    for (const bad of [undefined, null, 'ping', 4, [], true]) {
      assert.equal(isValidClientMessage('ability', bad), false, `payload ${String(bad)}`);
    }
    assert.equal(isValidClientMessage('ability', {}), true, 'the commander act carries nothing');
    assert.equal(isValidClientMessage('ready', {}), true, 'every field of ready is optional');
  });
});
