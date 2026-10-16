import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';
import * as fs from 'fs';

const filePath = path.resolve('attached_assets/WebDraft_1768658838126.xlsx');
const outputPath = path.resolve('client/src/lib/roster_data.json');

// Map Team Name to ID (based on mock_data.json and previous steps)
const TEAM_NAME_TO_ID: Record<string, number> = {
  "Matt": 6,
  "Al": 1, 
  "Mike N": 1, // Alias for Al? Or is Al the name? The roster sheet says "Al". The draft sheet says "Mike N".
  "Mike": 7,
  "Lee": 5,
  "Jake": 4,
  "jake": 4,
  "Tyler": 9,
  "Chris": 2,
  "Zack": 10,
  "Zach": 10,
  "Gus": 3,
  "Scott": 8
};

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = "Rosters";
  
  if (workbook.SheetNames.includes(sheetName)) {
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Structure: Team, Player ID, Name, ...
    // Skip header
    const keepersByTeam: Record<number, string[]> = {};
    
    // Initialize
    Object.values(TEAM_NAME_TO_ID).forEach(id => {
      keepersByTeam[id] = [];
    });

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length < 2) continue;
      
      const teamName = row[0];
      const playerId = row[1];
      
      if (!teamName || !playerId) continue;
      
      // Clean team name
      const cleanName = String(teamName).trim();
      const teamId = TEAM_NAME_TO_ID[cleanName];
      
      if (teamId) {
        // Convert playerId to string as store expects string
        keepersByTeam[teamId].push(String(playerId));
      } else {
        console.warn(`Unknown team: ${cleanName}`);
      }
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(keepersByTeam, null, 2));
    console.log(`Roster data written to ${outputPath}`);
    
  } else {
    console.error(`Sheet "${sheetName}" not found.`);
  }
} catch (error) {
  console.error("Error parsing Excel:", error);
}
