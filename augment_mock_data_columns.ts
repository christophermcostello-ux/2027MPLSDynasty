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
    // Some IDs might be numbers or strings
    parsedMap.set(String(p["Player ID"]), p);
  }
});

let updatedCount = 0;

mockData.players.forEach((player: any) => {
  const raw = parsedMap.get(player.id);
  if (raw) {
    if (!player.stats) player.stats = {};

    // Map requested stats
    if (raw.Clutch !== undefined) player.stats.Clutch = raw.Clutch;
    if (raw.LP !== undefined) player.stats.LP = raw.LP;
    if (raw.RP !== undefined) player.stats.RP = raw.RP;
    if (raw["L Total"] !== undefined) player.stats.LTotal = raw["L Total"];
    if (raw["R Total"] !== undefined) player.stats.RTotal = raw["R Total"];
    
    // Rename Durability if present
    if (player.durability) {
        player.stats.Dur = player.durability;
        delete player.durability;
    }
    if (raw.DURA) {
        player.stats.Dur = raw.DURA;
    }

    updatedCount++;
  }
});

fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2));
console.log(`Updated stats for ${updatedCount} players`);
