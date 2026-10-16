import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import * as fs from 'fs';
import * as path from 'path';

const mockDataPath = path.resolve('client/src/lib/mock_data.json');
const rosterDataPath = path.resolve('client/src/lib/roster_data.json');
const parsedAllPath = path.resolve('attached_assets/parsed_all.json');

const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));
const rosterData = JSON.parse(fs.readFileSync(rosterDataPath, 'utf-8'));
const parsedAllContent = fs.readFileSync(parsedAllPath, 'utf-8');
// Skip the header part which is not valid JSON
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

// Create a map of all players in parsedAll for lookup
// Multiple entries might exist for same ID (e.g. Draft and Roster), prefer Draft (has stats)
const parsedMap = new Map();

parsedAll.forEach((p: any) => {
  if (!p["Player ID"]) return;
  const id = String(p["Player ID"]);
  
  // Prefer entries with "LLIM" or "C" (stats) over just Roster entries
  const current = parsedMap.get(id);
  const isStatsEntry = p.LLIM !== undefined || p.C !== undefined; // Heuristic
  
  if (!current || isStatsEntry) {
    parsedMap.set(id, p);
  }
});

const existingIds = new Set(mockData.players.map((p: any) => p.id));
let addedCount = 0;

// Iterate over all rosters and ensure players exist
Object.values(rosterData).forEach((keeperIds: any) => {
  keeperIds.forEach((id: string) => {
    if (!existingIds.has(id)) {
      // Missing player! Find in parsedMap
      const raw = parsedMap.get(id);
      
      if (raw) {
        // Create new player object
        // Infer Type
        const pos = raw.POS || raw.C || ""; 
        // POS might be "SP" or "C" or "2b"
        // If raw.POS missing, check if they have Pitcher stats?
        // In Rosters section, they have POS.
        
        let type = 'Batter';
        let positions: string[] = [];
        
        // Parse positions
        if (raw.POS) {
           // e.g. "C", "SP", "2b"
           positions = [raw.POS.toUpperCase()];
           if (['SP', 'RP'].includes(raw.POS.toUpperCase())) {
             type = 'Pitcher';
           }
        } else {
           // Try to infer from stats fields
           if (raw.C && raw.C.includes('/')) positions.push('C');
           if (raw['1b'] && raw['1b'].includes('/')) positions.push('1B');
           // ... this is complex, fallback to generic if minimal
           if (raw.LLIM) type = 'Batter'; // Pitchers don't have LLIM usually? 
        }

        const newPlayer: any = {
          id: id,
          name: raw.Name,
          team: raw.TEAM || "FA",
          type: type,
          positions: positions,
          isOTL: false, // Default
          stats: {}, // Populate if available
          splits: { vsL: {}, vsR: {} }
        };

        // Map Stats if available
        if (raw.LLIM) newPlayer.stats.LLIM = raw.LLIM;
        if (raw.RLIM) newPlayer.stats.RLIM = raw.RLIM;
        if (raw.BR) newPlayer.stats.BR = raw.BR;
        
        // Map Attributes
        if (raw.Bats) newPlayer.bats = raw.Bats; // or Hand
        if (raw.Hand) {
           if (type === 'Pitcher') newPlayer.throws = raw.Hand;
           else newPlayer.bats = raw.Hand;
        }

        mockData.players.push(newPlayer);
        existingIds.add(id);
        addedCount++;
        // console.log(`Added missing player: ${raw.Name} (${id})`);
      } else {
        console.warn(`Keeper ID ${id} not found in parsed_all.json!`);
      }
    }
  });
});

if (addedCount > 0) {
  fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2));
  console.log(`Added ${addedCount} missing players to mock_data.json`);
} else {
  console.log("All keepers already exist in mock_data.json");
}
