import { createProceduralFurniture } from '../src/engine/proceduralModels';

const testCases = [
  { id: 'c1', type: 'chair', name: 'Ghế làm việc Ergonomic', dimensions: { width: 0.6, length: 0.6, height: 0.85 }, modelId: 'lib_chair_office', subType: 'lib_chair_office' },
  { id: 'c2', type: 'chair', name: 'Ghế tựa thư giãn', dimensions: { width: 0.75, length: 0.75, height: 0.8 }, modelId: 'lib_chair_arm', subType: 'lib_chair_arm' },
  { id: 'd1', type: 'desk', name: 'Bàn học', dimensions: { width: 1.2, length: 0.6, height: 0.75 }, modelId: 'lib_desk_study', subType: 'lib_desk_study' },
  { id: 'd2', type: 'desk', name: 'Bàn làm việc 1m4', dimensions: { width: 1.4, length: 0.7, height: 0.75 }, modelId: 'lib_desk_work', subType: 'lib_desk_work' },
];

for (const obj of testCases) {
  const m = createProceduralFurniture(obj as any);
  console.log(`MODEL FOR: [${obj.name}] (modelId: ${obj.modelId})`);
  console.log(`  -> Group Name: ${m.name}`);
  console.log(`  -> Child count: ${m.children.length}`);
  const geos = m.children.map((c: any) => c.geometry ? c.geometry.type : c.type);
  console.log(`  -> Geometries: ${geos.join(', ')}`);
}
