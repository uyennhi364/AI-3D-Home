import { strict as assert } from 'assert';
import { createProceduralFurniture } from '../src/engine/proceduralModels';
import { LIBRARY_ITEMS } from '../src/components/ObjectLibraryDock';

console.log('=============================================================================');
console.log('SUITE: DISTINCT 3D FURNITURE MODELS AUDIT & VERIFICATION');
console.log('=============================================================================\n');

// 1. Verify Catalog Identity
console.log('--- 1. VERIFY CATALOG IDENTITY & ATTRIBUTES ---');
const chairOffice = LIBRARY_ITEMS.find((i) => i.id === 'lib_chair_office');
const chairArm = LIBRARY_ITEMS.find((i) => i.id === 'lib_chair_arm');
const deskStudy = LIBRARY_ITEMS.find((i) => i.id === 'lib_desk_study');
const deskWork = LIBRARY_ITEMS.find((i) => i.id === 'lib_desk_work');

assert(chairOffice, 'Catalog must contain lib_chair_office');
assert(chairArm, 'Catalog must contain lib_chair_arm');
assert(deskStudy, 'Catalog must contain lib_desk_study');
assert(deskWork, 'Catalog must contain lib_desk_work');

console.log('  ✅ [PASS] All 4 target furniture products exist in Object Library');
console.log(`    - ${chairOffice.name} (${chairOffice.dimensions.width}x${chairOffice.dimensions.length}x${chairOffice.dimensions.height}m)`);
console.log(`    - ${chairArm.name} (${chairArm.dimensions.width}x${chairArm.dimensions.length}x${chairArm.dimensions.height}m)`);
console.log(`    - ${deskStudy.name} (${deskStudy.dimensions.width}x${deskStudy.dimensions.length}x${deskStudy.dimensions.height}m)`);
console.log(`    - ${deskWork.name} (${deskWork.dimensions.width}x${deskWork.dimensions.length}x${deskWork.dimensions.height}m)`);

// 2. Build 3D Models
console.log('\n--- 2. BUILD 3D PROCEDURAL MODELS VIA RESOLVER ---');
const modelChairOffice = createProceduralFurniture({
  id: 'chair_office_instance',
  type: chairOffice.type,
  name: chairOffice.name,
  dimensions: chairOffice.dimensions,
  subType: chairOffice.subType || chairOffice.id,
  modelId: chairOffice.modelId || chairOffice.id,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
});

const modelChairArm = createProceduralFurniture({
  id: 'chair_arm_instance',
  type: chairArm.type,
  name: chairArm.name,
  dimensions: chairArm.dimensions,
  subType: chairArm.subType || chairArm.id,
  modelId: chairArm.modelId || chairArm.id,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
});

const modelDeskStudy = createProceduralFurniture({
  id: 'desk_study_instance',
  type: deskStudy.type,
  name: deskStudy.name,
  dimensions: deskStudy.dimensions,
  subType: deskStudy.subType || deskStudy.id,
  modelId: deskStudy.modelId || deskStudy.id,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
});

const modelDeskWork = createProceduralFurniture({
  id: 'desk_work_instance',
  type: deskWork.type,
  name: deskWork.name,
  dimensions: deskWork.dimensions,
  subType: deskWork.subType || deskWork.id,
  modelId: deskWork.modelId || deskWork.id,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
});

// 3. Compare Chair Models
console.log('\n--- 3. COMPARISON: GHẾ LÀM VIỆC vs GHẾ TỰA THƯ GIÃN ---');
console.log(`  Ghế làm việc groupName: "${modelChairOffice.name}", childCount: ${modelChairOffice.children.length}`);
console.log(`  Ghế tựa thư giãn groupName: "${modelChairArm.name}", childCount: ${modelChairArm.children.length}`);

assert.notEqual(modelChairOffice.name, modelChairArm.name, 'Group names must differ between work chair and lounge chair');
assert.equal(modelChairOffice.name, 'ErgonomicChairGroup', 'Work chair must resolve to ErgonomicChairGroup');
assert.equal(modelChairArm.name, 'LoungeChairGroup', 'Lounge chair must resolve to LoungeChairGroup');

const chairOfficeGeos = modelChairOffice.children.map((c: any) => c.geometry?.type || c.type);
const chairArmGeos = modelChairArm.children.map((c: any) => c.geometry?.type || c.type);

// Work chair uses splayed cylinder legs and curved backrest
const cylinderCountOffice = chairOfficeGeos.filter((g) => g === 'CylinderGeometry').length;
// Lounge chair uses dark walnut sled wooden rails (BoxGeometry)
const boxCountArm = chairArmGeos.filter((g) => g === 'BoxGeometry').length;

assert(cylinderCountOffice >= 9, 'Ergonomic chair must have cylinder legs and ferrules');
assert(boxCountArm >= 10, 'Lounge chair must have sled rail and box cushion geometries');
console.log('  ✅ [PASS] Ghế làm việc (ErgonomicChairGroup) và Ghế tựa thư giãn (LoungeChairGroup) có cấu trúc geometry HOÀN TOÀN KHÁC BIỆT');

// 4. Compare Desk Models
console.log('\n--- 4. COMPARISON: BÀN HỌC vs BÀN LÀM VIỆC 1M4 ---');
console.log(`  Bàn học groupName: "${modelDeskStudy.name}", childCount: ${modelDeskStudy.children.length}`);
console.log(`  Bàn làm việc groupName: "${modelDeskWork.name}", childCount: ${modelDeskWork.children.length}`);

assert.notEqual(modelDeskStudy.name, modelDeskWork.name, 'Group names must differ between study desk and executive work desk');
assert.equal(modelDeskStudy.name, 'StudyDeskGroup', 'Study desk must resolve to StudyDeskGroup');
assert.equal(modelDeskWork.name, 'DeskGroup', 'Executive work desk must resolve to DeskGroup');

const deskStudyGeos = modelDeskStudy.children.map((c: any) => c.geometry?.type || c.type);
const deskWorkGeos = modelDeskWork.children.map((c: any) => c.geometry?.type || c.type);

// Desk work has task lamp (cone geometry) and open laptop
const hasConeLamp = deskWorkGeos.includes('ConeGeometry');
const hasDodecahedron = deskWorkGeos.includes('DodecahedronGeometry');
assert(hasConeLamp, 'Executive desk must feature desk task lamp (ConeGeometry)');
assert(hasDodecahedron, 'Executive desk must feature succulent planter (DodecahedronGeometry)');

// Study desk has top hutch bookshelf organizer with 4 mini books
assert.equal(modelDeskStudy.children.length, 16, 'Study desk must feature hutch organizer and 4 book volumes');
console.log('  ✅ [PASS] Bàn học (StudyDeskGroup) và Bàn làm việc (DeskGroup) có cấu trúc geometry HOÀN TOÀN KHÁC BIỆT');

// 5. Presets Invariant Protection
console.log('\n--- 5. MASTER PRESET INVARIANT VERIFICATION ---');
const masterDesk = createProceduralFurniture({
  id: 'desk_window',
  type: 'desk',
  name: 'Bàn làm việc gỗ walnut',
  dimensions: { width: 1.4, length: 0.65, height: 0.75 },
  position: { x: -1.75, y: 0, z: -0.85 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
});

assert.equal(masterDesk.name, 'DeskGroup', 'Master Preset desk_window must resolve to DeskGroup');
console.log('  ✅ [PASS] Master preset desk_window geometry invariant preserved');

console.log('\n=============================================================================');
console.log('FINAL RESULT: ALL DISTINCT MODEL TESTS PASSED (100%)');
console.log('=============================================================================');
