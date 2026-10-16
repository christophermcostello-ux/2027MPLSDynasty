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

// Stats needed for batters:
// LLIM, RLIM, BR, Lead, Steal

mockData.players.forEach((player: any) => {
  if (player.type !== 'Batter') return; // Only focus on batters

  const raw = parsedMap.get(player.id);
  if (raw) {
    if (!player.stats) player.stats = {};

    if (raw.LLIM !== undefined) player.stats.LLIM = raw.LLIM;
    if (raw.RLIM !== undefined) player.stats.RLIM = raw.RLIM;
    if (raw.BR !== undefined) player.stats.BR = raw.BR;
    if (raw.Lead !== undefined) player.stats.Lead = raw.Lead;
    if (raw.Steal !== undefined) player.stats.Steal = raw.Steal;

    updatedCount++;
  }
});

fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2));
console.log(`Updated batter stats for ${updatedCount} players`);
