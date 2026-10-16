import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as fs from 'fs';
import * as path from 'path';

const mockDataPath = path.resolve('client/src/lib/mock_data.json');
const parsedAllPath = path.resolve('attached_assets/parsed_all.json');

const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));
const parsedAllContent = fs.readFileSync(parsedAllPath, 'utf-8');

// Handle the header issue in parsed_all.json
const lines = parsedAllContent.split('\n');
let startLine = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('[') && !lines[i].includes('Sheets')) {
    startLine = i;
    break;
  }
}
const cleanContent = lines.slice(startLine).join('\n');
const parsedAll = JSON.parse(cleanContent);

// Create map for lookup
const parsedMap = new Map();
parsedAll.forEach((p: any) => {
  if (p["Player ID"]) {
    parsedMap.set(String(p["Player ID"]), p);
  } else if (p["ID"]) {
    parsedMap.set(String(p["ID"]), p);
  }
});

let updatedCount = 0;

// Stats needed:
// Defense: c, 1b, 2b, 3b, SS, LF, CF, RF (Note: keys in parsed might be uppercase or lowercase)
// Batter Points: L1b, L2b, L3b, LHR, LBB, LHBP, R1b, R2b, R3b, RHR, RBB, RHBP

mockData.players.forEach((player: any) => {
  if (player.type !== 'Batter') return;

  const raw = parsedMap.get(player.id);
  if (raw) {
    if (!player.stats) player.stats = {};

    // Defense Stats
    // Check various casing from raw data if needed, but usually it matches specific columns
    // Based on previous greps, they look like "1b", "2b", "SS", "LF" etc.
    // Careful: "1b" exists in split data too, but here we look for the rating string (e.g. "A/55")
    
    // In parsed_all.json, defense ratings seem to be at root level
    if (raw["C"] !== undefined) player.stats.C_Def = raw["C"]; // Rename to avoid confusion with position C
    else if (raw["c"] !== undefined) player.stats.C_Def = raw["c"];

    if (raw["1b"] !== undefined) player.stats["1b_Def"] = raw["1b"];
    if (raw["2b"] !== undefined) player.stats["2b_Def"] = raw["2b"];
    if (raw["3b"] !== undefined) player.stats["3b_Def"] = raw["3b"];
    if (raw["SS"] !== undefined) player.stats.SS_Def = raw["SS"];
    if (raw["LF"] !== undefined) player.stats.LF_Def = raw["LF"];
    if (raw["CF"] !== undefined) player.stats.CF_Def = raw["CF"];
    if (raw["RF"] !== undefined) player.stats.RF_Def = raw["RF"];

    // Batter Points
    if (raw.L1b !== undefined) player.stats.L1b = raw.L1b;
    if (raw.L2b !== undefined) player.stats.L2b = raw.L2b;
    if (raw.L3b !== undefined) player.stats.L3b = raw.L3b;
    if (raw.LHR !== undefined) player.stats.LHR = raw.LHR;
    if (raw.LBB !== undefined) player.stats.LBB = raw.LBB;
    if (raw.LHBP !== undefined) player.stats.LHBP = raw.LHBP;

    if (raw.R1b !== undefined) player.stats.R1b = raw.R1b;
    if (raw.R2b !== undefined) player.stats.R2b = raw.R2b;
    if (raw.R3b !== undefined) player.stats.R3b = raw.R3b;
    if (raw.RHR !== undefined) player.stats.RHR = raw.RHR;
    if (raw.RBB !== undefined) player.stats.RBB = raw.RBB;
    if (raw.RHBP !== undefined) player.stats.RHBP = raw.RHBP;

    updatedCount++;
  }
});

fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2));
console.log(`Updated batter extra stats for ${updatedCount} players`);
