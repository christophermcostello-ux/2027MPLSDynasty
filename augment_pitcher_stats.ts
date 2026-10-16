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
  } else if (p["ID"]) {
    parsedMap.set(String(p["ID"]), p);
  }
});

let updatedCount = 0;

// Stats needed for pitchers:
// L Total, L DD, R Total, R DD, END, S/L, Spot, JAM, ON, OFF, Hold, DUR, IP

mockData.players.forEach((player: any) => {
  if (player.type !== 'Pitcher') return; // Only focus on pitchers for this pass

  const raw = parsedMap.get(player.id);
  if (raw) {
    if (!player.stats) player.stats = {};

    // Map requested stats
    if (raw["L Total"] !== undefined) player.stats.LTotal = raw["L Total"];
    if (raw["L DD"] !== undefined) player.stats.LDD = raw["L DD"];
    if (raw["R Total"] !== undefined) player.stats.RTotal = raw["R Total"];
    if (raw["R DD"] !== undefined) player.stats.RDD = raw["R DD"];
    
    // END
    if (raw.END !== undefined) player.stats.END = raw.END;
    else if (raw.Endurance !== undefined) player.stats.END = raw.Endurance; // Fallback
    
    // S/L (Start/Relief?) - Check raw keys
    if (raw["S/L"] !== undefined) player.stats.SL = raw["S/L"];
    
    if (raw.Spot !== undefined) player.stats.Spot = raw.Spot;
    if (raw.JAM !== undefined) player.stats.JAM = raw.JAM;
    if (raw.ON !== undefined) player.stats.ON = raw.ON;
    if (raw.OFF !== undefined) player.stats.OFF = raw.OFF;
    if (raw.Hold !== undefined) player.stats.Hold = raw.Hold;
    
    // DUR
    if (raw.DUR !== undefined) player.stats.DUR = raw.DUR;
    else if (raw.DURA !== undefined) player.stats.DUR = raw.DURA;
    
    // IP
    if (raw.IP !== undefined) player.stats.IP = raw.IP;
    else if (raw.Innings !== undefined) player.stats.IP = raw.Innings;

    updatedCount++;
  }
});

fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2));
console.log(`Updated pitcher stats for ${updatedCount} players`);
