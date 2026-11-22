import { ROOM_PRESETS } from '../src/engine/presets';
import { LIBRARY_ITEMS } from '../src/components/ObjectLibraryDock';

console.log('='.repeat(80));
console.log('AUDIT: SCENE OBJECTS VS OBJECT LIBRARY CATALOG');
console.log('='.repeat(80));

console.log(`\nTOTAL CATALOG ITEMS IN LIBRARY: ${LIBRARY_ITEMS.length}`);
LIBRARY_ITEMS.forEach((item) => {
  console.log(`  - [${item.id}] type=${item.type.padEnd(10)} cat=${item.category.padEnd(10)} name="${item.name}" (${item.dimensions.width}x${item.dimensions.length}m)`);
});

const presets = ['master', 'small', 'studio'] as const;

for (const pKey of presets) {
  const preset = ROOM_PRESETS[pKey];
  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(`PRESET: ${preset.name.toUpperCase()} (Key: ${pKey}) — Total Objects: ${preset.objects.length}`);
  console.log(`--------------------------------------------------------------------------------`);

  preset.objects.forEach((obj, idx) => {
    // Check if matches any item in LIBRARY_ITEMS
    // Match by exact id, or type + similar dimensions/name
    const matchById = LIBRARY_ITEMS.find((i) => i.id === (obj as any).catalogId || i.id === obj.id);
    const matchByType = LIBRARY_ITEMS.filter((i) => i.type === obj.type);
    const matchByName = LIBRARY_ITEMS.find((i) => i.name.toLowerCase() === obj.name.toLowerCase());

    console.log(`\n#${idx + 1}. [${obj.id}] type="${obj.type}" name="${obj.name}"`);
    console.log(`    Dimensions: ${obj.dimensions.width} x ${obj.dimensions.length} x ${obj.dimensions.height}m`);
    console.log(`    Position: (${obj.position.x}, ${obj.position.y || 0}, ${obj.position.z})`);
    console.log(`    Catalog match by ID: ${matchById ? matchById.id : 'NONE'}`);
    console.log(`    Catalog match by Type (${obj.type}): ${matchByType.length > 0 ? matchByType.map((m) => m.id + ' ("' + m.name + '")').join(', ') : 'NONE'}`);
    console.log(`    Catalog match by Name: ${matchByName ? matchByName.id : 'NONE'}`);
  });
}
