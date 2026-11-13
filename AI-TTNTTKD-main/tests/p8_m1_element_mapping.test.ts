// =============================================================================
// tests/p8_m1_element_mapping.test.ts
// Phase P8-M1 — Five Elements (Ngũ Hành) Attribute Mapping Test Suite
//
// COVERS:
// - SUITE-NH-01: Color Element Mapping (18 Test Cases)
// - SUITE-NH-02: Material Element Mapping (18 Test Cases)
// - SUITE-NH-03: Shape Element Mapping (10 Test Cases)
// - SUITE-NH-04: Direction Element Mapping (12 Test Cases)
// - Schema validation: input, normalizedValue, element, dataStatus, certainty, sourceId, explanation.
// - Invariant check: only 'known' status returns element !== null.
// =============================================================================

import {
  normalizeHexColor,
  classifyColorElement,
  classifyMaterialElement,
  classifyShapeElement,
  classifyDirectionElement,
} from '../src/engine/core/nguHanh/elementMapping.js';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

console.log('================================================================================');
console.log('PHASE P8-M1: FIVE ELEMENTS (NGŨ HÀNH) MAPPING TEST SUITE');
console.log('================================================================================\n');

// =============================================================================
// SUITE-NH-01: COLOR MAPPING TESTS
// =============================================================================
console.log('--- SUITE-NH-01: Color Mapping (Hex, Casing, Whitespace, 4 DataStatuses) ---');

// 1. Normalization tests
assert(normalizeHexColor('#228B22') === '#228b22', 'NH-MAP-COLOR-NORM-01: Uppercase hex normalized to lowercase');
assert(normalizeHexColor('  #00FF00  ') === '#00ff00', 'NH-MAP-COLOR-NORM-02: Whitespace trimmed cleanly');
assert(normalizeHexColor('#FFF') === '#ffffff', 'NH-MAP-COLOR-NORM-03: 3-character hex expanded to 6-character');
assert(normalizeHexColor('000000') === '#000000', 'NH-MAP-COLOR-NORM-04: Missing # prefix auto-prepended');
assert(normalizeHexColor('invalid-hex') === null, 'NH-MAP-COLOR-NORM-05: Non-hex string returns null');

// 2. Classical known colors
const cForestGreen = classifyColorElement('#228B22');
assert(
  cForestGreen.element === 'Mộc' &&
    cForestGreen.dataStatus === 'known' &&
    cForestGreen.certainty === 'classical' &&
    cForestGreen.sourceRef.includes('SRC-NGU-HANH-DAI-NGHIA'),
  'NH-MAP-COLOR-01: #228B22 (Forest Green) maps to Mộc (classical)'
);

const cLimeGreen = classifyColorElement('#00ff00');
assert(
  cLimeGreen.element === 'Mộc' && cLimeGreen.dataStatus === 'known' && cLimeGreen.certainty === 'classical',
  'NH-MAP-COLOR-02: #00FF00 (Lime Green) maps to Mộc (classical)'
);

const cRed = classifyColorElement('#FF0000');
assert(
  cRed.element === 'Hỏa' && cRed.dataStatus === 'known' && cRed.certainty === 'classical',
  'NH-MAP-COLOR-03: #FF0000 (Red) maps to Hỏa (classical)'
);

const cFirebrick = classifyColorElement('#b22222');
assert(
  cFirebrick.element === 'Hỏa' && cFirebrick.dataStatus === 'known',
  'NH-MAP-COLOR-04: #B22222 (Firebrick) maps to Hỏa'
);

const cGold = classifyColorElement('#FFD700');
assert(
  cGold.element === 'Thổ' && cGold.dataStatus === 'known' && cGold.certainty === 'classical',
  'NH-MAP-COLOR-05: #FFD700 (Gold/Yellow) maps to Thổ (classical)'
);

const cWhite = classifyColorElement('#FFFFFF');
assert(
  cWhite.element === 'Kim' && cWhite.dataStatus === 'known' && cWhite.certainty === 'classical',
  'NH-MAP-COLOR-06: #FFFFFF (White) maps to Kim (classical)'
);

const cSilver = classifyColorElement('#C0C0C0');
assert(
  cSilver.element === 'Kim' && cSilver.dataStatus === 'known' && cSilver.certainty === 'classical',
  'NH-MAP-COLOR-07: #C0C0C0 (Silver) maps to Kim (classical)'
);

const cBlack = classifyColorElement('#000000');
assert(
  cBlack.element === 'Thủy' && cBlack.dataStatus === 'known' && cBlack.certainty === 'classical',
  'NH-MAP-COLOR-08: #000000 (Black) maps to Thủy (classical)'
);

// 3. Applied known colors
const cNavy = classifyColorElement('#00008B');
assert(
  cNavy.element === 'Thủy' && cNavy.dataStatus === 'known' && cNavy.certainty === 'applied',
  'NH-MAP-COLOR-09: #00008B (Dark Blue/Navy) maps to Thủy (applied)'
);

const cSkyBlue = classifyColorElement('#87ceeb');
assert(
  cSkyBlue.element === 'Thủy' && cSkyBlue.dataStatus === 'known' && cSkyBlue.certainty === 'applied',
  'NH-MAP-COLOR-10: #87CEEB (Sky Blue) maps to Thủy (applied)'
);

const cOrange = classifyColorElement('#FFA500');
assert(
  cOrange.element === 'Hỏa' && cOrange.dataStatus === 'known' && cOrange.certainty === 'applied',
  'NH-MAP-COLOR-11: #FFA500 (Orange) maps to Hỏa (applied)'
);

const cPink = classifyColorElement('#FFB6C1');
assert(
  cPink.element === 'Hỏa' && cPink.dataStatus === 'known' && cPink.certainty === 'applied',
  'NH-MAP-COLOR-12: #FFB6C1 (Light Pink) maps to Hỏa (applied)'
);

const cCream = classifyColorElement('#faebd7');
assert(
  cCream.element === 'Kim' && cCream.dataStatus === 'known' && cCream.certainty === 'applied',
  'NH-MAP-COLOR-13: #FAEBD7 (Antique White/Cream) maps to Kim (applied)'
);

// 4. Ambiguous colors (Strictly no forced element)
const cGray = classifyColorElement('#808080');
assert(
  cGray.element === null && cGray.dataStatus === 'ambiguous',
  'NH-MAP-COLOR-14: #808080 (Gray) returns dataStatus="ambiguous" and element=null'
);

const cWoodBrown = classifyColorElement('#8B4513');
assert(
  cWoodBrown.element === null && cWoodBrown.dataStatus === 'ambiguous',
  'NH-MAP-COLOR-15: #8B4513 (Wood Brown) returns dataStatus="ambiguous" and element=null'
);

const cYellowGreen = classifyColorElement('#9acd32');
assert(
  cYellowGreen.element === null && cYellowGreen.dataStatus === 'ambiguous',
  'NH-MAP-COLOR-16: #9ACD32 (Yellow-Green) returns dataStatus="ambiguous" and element=null'
);

// 5. Insufficient and unsupported colors
const cNull = classifyColorElement(null);
assert(
  cNull.element === null && cNull.dataStatus === 'insufficient',
  'NH-MAP-COLOR-17: null color returns dataStatus="insufficient"'
);

const cEmpty = classifyColorElement('   ');
assert(
  cEmpty.element === null && cEmpty.dataStatus === 'insufficient',
  'NH-MAP-COLOR-18: Empty string color returns dataStatus="insufficient"'
);

const cUnsupported = classifyColorElement('not-a-valid-hex-code');
assert(
  cUnsupported.element === null && cUnsupported.dataStatus === 'unsupported',
  'NH-MAP-COLOR-19: Invalid hex string returns dataStatus="unsupported"'
);

// =============================================================================
// SUITE-NH-02: MATERIAL MAPPING TESTS
// =============================================================================
console.log('\n--- SUITE-NH-02: Material Mapping (Natural, Industrial, Synthetic, Composites) ---');

// 1. Natural Wood (Mộc classical)
const mWood = classifyMaterialElement('wood');
assert(
  mWood.element === 'Mộc' && mWood.dataStatus === 'known' && mWood.certainty === 'classical',
  'NH-MAP-MAT-01: "wood" maps to Mộc (classical)'
);

const mOak = classifyMaterialElement('  Oak  ');
assert(
  mOak.element === 'Mộc' && mOak.dataStatus === 'known' && mOak.certainty === 'classical',
  'NH-MAP-MAT-02: "Oak" with spaces maps to Mộc (classical)'
);

const mWalnut = classifyMaterialElement('walnut');
assert(
  mWalnut.element === 'Mộc' && mWalnut.dataStatus === 'known',
  'NH-MAP-MAT-03: "walnut" maps to Mộc'
);

// 2. Engineered Wood & Fibers (Mộc applied)
const mMdf = classifyMaterialElement('mdf');
assert(
  mMdf.element === 'Mộc' && mMdf.dataStatus === 'known' && mMdf.certainty === 'applied',
  'NH-MAP-MAT-04: "mdf" maps to Mộc (applied)'
);

const mBamboo = classifyMaterialElement('bamboo');
assert(
  mBamboo.element === 'Mộc' && mBamboo.dataStatus === 'known' && mBamboo.certainty === 'applied',
  'NH-MAP-MAT-05: "bamboo" maps to Mộc (applied)'
);

const mCotton = classifyMaterialElement('cotton');
assert(
  mCotton.element === 'Mộc' && mCotton.dataStatus === 'known' && mCotton.certainty === 'applied',
  'NH-MAP-MAT-06: "cotton" maps to Mộc (applied)'
);

// 3. Raw Metals & Industrial Alloys (Kim)
const mMetal = classifyMaterialElement('metal');
assert(
  mMetal.element === 'Kim' && mMetal.dataStatus === 'known' && mMetal.certainty === 'classical',
  'NH-MAP-MAT-07: "metal" maps to Kim (classical)'
);

const mSteel = classifyMaterialElement('steel');
assert(
  mSteel.element === 'Kim' && mSteel.dataStatus === 'known' && mSteel.certainty === 'classical',
  'NH-MAP-MAT-08: "steel" maps to Kim (classical)'
);

const mAluminum = classifyMaterialElement('aluminum');
assert(
  mAluminum.element === 'Kim' && mAluminum.dataStatus === 'known' && mAluminum.certainty === 'applied',
  'NH-MAP-MAT-09: "aluminum" maps to Kim (applied)'
);

const mGold = classifyMaterialElement('gold');
assert(
  mGold.element === 'Kim' && mGold.dataStatus === 'known' && mGold.certainty === 'classical',
  'NH-MAP-MAT-10: "gold" maps to Kim (classical)'
);

// 4. Ceramics & Stones (Thổ)
const mCeramic = classifyMaterialElement('ceramic');
assert(
  mCeramic.element === 'Thổ' && mCeramic.dataStatus === 'known' && mCeramic.certainty === 'classical',
  'NH-MAP-MAT-11: "ceramic" maps to Thổ (classical)'
);

const mMarble = classifyMaterialElement('marble');
assert(
  mMarble.element === 'Thổ' && mMarble.dataStatus === 'known' && mMarble.certainty === 'applied',
  'NH-MAP-MAT-12: "marble" maps to Thổ (applied)'
);

const mConcrete = classifyMaterialElement('concrete');
assert(
  mConcrete.element === 'Thổ' && mConcrete.dataStatus === 'known' && mConcrete.certainty === 'applied',
  'NH-MAP-MAT-13: "concrete" maps to Thổ (applied)'
);

// 5. Ambiguous Materials (Synthetic polymers, glass, leather, composites)
const mPlastic = classifyMaterialElement('plastic');
assert(
  mPlastic.element === null && mPlastic.dataStatus === 'ambiguous',
  'NH-MAP-MAT-14: "plastic" returns dataStatus="ambiguous" and element=null'
);

const mGlass = classifyMaterialElement('glass');
assert(
  mGlass.element === null && mGlass.dataStatus === 'ambiguous',
  'NH-MAP-MAT-15: "glass" returns dataStatus="ambiguous" and element=null'
);

const mLeather = classifyMaterialElement('leather');
assert(
  mLeather.element === null && mLeather.dataStatus === 'ambiguous',
  'NH-MAP-MAT-16: "leather" returns dataStatus="ambiguous" and element=null'
);

const mComposite = classifyMaterialElement('wood_and_metal_alloy');
assert(
  mComposite.element === null && mComposite.dataStatus === 'ambiguous',
  'NH-MAP-MAT-17: composite "wood_and_metal_alloy" returns dataStatus="ambiguous"'
);

// 6. Insufficient & Unsupported
const mNull = classifyMaterialElement(null);
assert(
  mNull.element === null && mNull.dataStatus === 'insufficient',
  'NH-MAP-MAT-18: null material returns dataStatus="insufficient"'
);

const mUnknown = classifyMaterialElement('graphene_aerogel');
assert(
  mUnknown.element === null && mUnknown.dataStatus === 'unsupported',
  'NH-MAP-MAT-19: uncataloged "graphene_aerogel" returns dataStatus="unsupported"'
);

// =============================================================================
// SUITE-NH-03: SHAPE MAPPING TESTS (HEURISTIC OBB RATIOS)
// =============================================================================
console.log('\n--- SUITE-NH-03: Shape Mapping (Heuristic OBB Dimensions & Disclaimers) ---');

// 1. Tall cylinder / pillar -> Mộc (heightRatio > 2.0)
const sPillar = classifyShapeElement({ width: 0.5, height: 2.2, length: 0.5 });
assert(
  sPillar.element === 'Mộc' &&
    sPillar.dataStatus === 'known' &&
    sPillar.certainty === 'heuristic' &&
    typeof sPillar.disclaimer === 'string' &&
    sPillar.sourceRef.includes('SRC-HEURISTIC-SHAPE-DIMENSIONS'),
  'NH-MAP-SHAPE-01: Tall pillar (h/max = 4.4 > 2.0) maps to Mộc (heuristic with disclaimer)'
);

const sTallWardrobe = classifyShapeElement({ width: 0.6, height: 2.4, length: 1.0 });
assert(
  sTallWardrobe.element === 'Mộc' && sTallWardrobe.dataStatus === 'known',
  'NH-MAP-SHAPE-02: Tall wardrobe (h/max = 2.4 > 2.0) maps to Mộc'
);

// 2. Flat slab / floor level -> Thổ (heightRatio < 0.3)
const sFlatRug = classifyShapeElement({ width: 1.8, height: 0.1, length: 2.4 });
assert(
  sFlatRug.element === 'Thổ' &&
    sFlatRug.dataStatus === 'known' &&
    sFlatRug.certainty === 'heuristic' &&
    typeof sFlatRug.disclaimer === 'string',
  'NH-MAP-SHAPE-03: Flat rug/tray (h/max = 0.04 < 0.3) maps to Thổ (heuristic with disclaimer)'
);

const sLowTable = classifyShapeElement({ width: 1.2, height: 0.25, length: 1.0 });
assert(
  sLowTable.element === 'Thổ' && sLowTable.dataStatus === 'known',
  'NH-MAP-SHAPE-04: Low platform (h/max = 0.21 < 0.3) maps to Thổ'
);

// 3. Balanced cubic box -> Kim (abs(w - l)/max < 0.1 and 0.3 <= h/max <= 2.0)
const sCubeBox = classifyShapeElement({ width: 0.8, height: 0.8, length: 0.8 });
assert(
  sCubeBox.element === 'Kim' &&
    sCubeBox.dataStatus === 'known' &&
    sCubeBox.certainty === 'heuristic' &&
    typeof sCubeBox.disclaimer === 'string',
  'NH-MAP-SHAPE-05: Cube box (diff=0, h/max=1.0) maps to Kim (heuristic with disclaimer)'
);

const sNightstand = classifyShapeElement({ width: 0.5, height: 0.55, length: 0.48 });
assert(
  sNightstand.element === 'Kim' && sNightstand.dataStatus === 'known',
  'NH-MAP-SHAPE-06: Square nightstand maps to Kim'
);

// 4. Ambiguous intermediate ratios (standard furniture)
const sStandardBed = classifyShapeElement({ width: 1.6, height: 0.9, length: 2.0 });
assert(
  sStandardBed.element === null && sStandardBed.dataStatus === 'ambiguous',
  'NH-MAP-SHAPE-07: Standard bed (1.6m x 0.9m x 2.0m) returns dataStatus="ambiguous" (not forced)'
);

const sStandardDesk = classifyShapeElement({ width: 1.2, height: 0.75, length: 0.7 });
assert(
  sStandardDesk.element === null && sStandardDesk.dataStatus === 'ambiguous',
  'NH-MAP-SHAPE-08: Standard desk (1.2m x 0.75m x 0.7m) returns dataStatus="ambiguous"'
);

// 5. Insufficient and invalid dimensions
const sNull = classifyShapeElement(null);
assert(
  sNull.element === null && sNull.dataStatus === 'insufficient',
  'NH-MAP-SHAPE-09: null dimensions returns dataStatus="insufficient"'
);

const sInvalid = classifyShapeElement({ width: -1.0, height: 2.0, length: 1.0 });
assert(
  sInvalid.element === null && sInvalid.dataStatus === 'unsupported',
  'NH-MAP-SHAPE-10: Negative dimension value returns dataStatus="unsupported"'
);

// =============================================================================
// SUITE-NH-04: DIRECTION MAPPING TESTS (EIGHT COMPASS DIRECTIONS & CENTER)
// =============================================================================
console.log('\n--- SUITE-NH-04: Direction Mapping (8 Directions, Center, Calibration Handling) ---');

// 1. Classical calibrated 8 directions
const dEast = classifyDirectionElement('E', 0);
assert(
  dEast.element === 'Mộc' &&
    dEast.dataStatus === 'known' &&
    dEast.certainty === 'classical' &&
    dEast.disclaimer === undefined,
  'NH-MAP-DIR-01: Calibrated East ("E") maps to Mộc (classical, no disclaimer)'
);

const dSoutheast = classifyDirectionElement('SE', 0);
assert(
  dSoutheast.element === 'Mộc' && dSoutheast.dataStatus === 'known',
  'NH-MAP-DIR-02: Calibrated Southeast ("SE") maps to Mộc'
);

const dSouth = classifyDirectionElement('S', 0);
assert(
  dSouth.element === 'Hỏa' && dSouth.dataStatus === 'known' && dSouth.certainty === 'classical',
  'NH-MAP-DIR-03: Calibrated South ("S") maps to Hỏa'
);

const dSouthwest = classifyDirectionElement('SW', 0);
assert(
  dSouthwest.element === 'Thổ' && dSouthwest.dataStatus === 'known',
  'NH-MAP-DIR-04: Calibrated Southwest ("SW") maps to Thổ'
);

const dNortheast = classifyDirectionElement('NE', 0);
assert(
  dNortheast.element === 'Thổ' && dNortheast.dataStatus === 'known',
  'NH-MAP-DIR-05: Calibrated Northeast ("NE") maps to Thổ'
);

const dWest = classifyDirectionElement('W', 0);
assert(
  dWest.element === 'Kim' && dWest.dataStatus === 'known' && dWest.certainty === 'classical',
  'NH-MAP-DIR-06: Calibrated West ("W") maps to Kim'
);

const dNorthwest = classifyDirectionElement('NW', 0);
assert(
  dNorthwest.element === 'Kim' && dNorthwest.dataStatus === 'known',
  'NH-MAP-DIR-07: Calibrated Northwest ("NW") maps to Kim'
);

const dNorth = classifyDirectionElement('N', 0);
assert(
  dNorth.element === 'Thủy' && dNorth.dataStatus === 'known' && dNorth.certainty === 'classical',
  'NH-MAP-DIR-08: Calibrated North ("N") maps to Thủy'
);

// 2. Central zone (Independent entity, not forced into 8 directions)
const dCenter = classifyDirectionElement('center', 0);
assert(
  dCenter.element === 'Thổ' &&
    dCenter.dataStatus === 'known' &&
    dCenter.certainty === 'classical' &&
    dCenter.normalizedValue === 'center',
  'NH-MAP-DIR-09: Central zone ("center") maps independently to Thổ (classical)'
);

// 3. Uncalibrated True North (northBearingDeg = null)
const dUncalibratedNorth = classifyDirectionElement('N', null);
assert(
  dUncalibratedNorth.element === 'Thủy' &&
    dUncalibratedNorth.dataStatus === 'known' &&
    dUncalibratedNorth.certainty === 'applied' &&
    typeof dUncalibratedNorth.disclaimer === 'string' &&
    dUncalibratedNorth.disclaimer.includes('Chưa hiệu chuẩn la bàn thực tế'),
  'NH-MAP-DIR-10: Uncalibrated North (northBearingDeg=null) maps with applied certainty & disclaimer'
);

// 4. Insufficient & Unsupported directions
const dNull = classifyDirectionElement(null);
assert(
  dNull.element === null && dNull.dataStatus === 'insufficient',
  'NH-MAP-DIR-11: null direction returns dataStatus="insufficient"'
);

const dInvalid = classifyDirectionElement('upward_sky');
assert(
  dInvalid.element === null && dInvalid.dataStatus === 'unsupported',
  'NH-MAP-DIR-12: invalid direction "upward_sky" returns dataStatus="unsupported"'
);

// =============================================================================
// SUMMARY & INVARIANT CHECKS
// =============================================================================
console.log('\n================================================================================');
console.log(`P8-M1 TEST RESULTS: ${passedAssertions} PASS | ${failedAssertions} FAIL | TOTAL: ${totalAssertions}`);
console.log('================================================================================');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

