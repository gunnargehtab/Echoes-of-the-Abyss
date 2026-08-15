// Minimal echo layer simulation prototype
const tiers = [1,2,3,4,5];

function detect(sig, distance, pf) {
  // Simplified detection: effective = sig * pf / distance
  const effective = (sig * pf) / Math.max(distance,1);
  if (effective > 75) return 5;
  if (effective > 40) return 4;
  if (effective > 20) return 3;
  if (effective > 8) return 2;
  return 1;
}

// Example run
const actors = [
  {name: 'Scout', sig: 6},
  {name: 'Corvette', sig: 28},
  {name: 'Cruiser', sig: 55}
];

console.log('Echo-sim: running sample detections');
for (const a of actors) {
  for (const d of [100,500,1200,2500]) {
    const tier = detect(a.sig, d, 1.0);
    console.log(`${a.name} at ${d}m -> tier ${tier}`);
  }
}
