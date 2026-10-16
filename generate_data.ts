import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';
import * as fs from 'fs';

const filePath = path.resolve('attached_assets/WebDraft_1768658838126.xlsx');
const outPath = path.resolve('client/src/lib/mock_data.json');

interface PlayerData {
  id: string;
  name: string;
  team: string;
  type: 'Batter' | 'Pitcher';
  positions: string[];
  bats?: string;
  throws?: string;
  role?: string;
  isOTL: boolean;
  stats: Record<string, any>;
  splits: { vsL: Record<string, any>, vsR: Record<string, any> };
  // Flatten attributes
  speed?: number;
  sb?: number;
  range?: number;
  error?: number;
  arm?: number;
  durability?: string | number;
  clutch?: number;
  endurance?: number;
  hold?: number;
  jam?: number;
  on?: number;
  off?: number;
  innings?: number;
}

try {
  const workbook = XLSX.readFile(filePath);
  const players: PlayerData[] = [];
  const teamSet = new Set<string>();
  const keepers: Record<string, string[]> = {};

  // --- 1. Process Rosters (Teams & Keepers) ---
  if (workbook.Sheets['Rosters']) {
    const rosterData = XLSX.utils.sheet_to_json(workbook.Sheets['Rosters']);
    rosterData.forEach((row: any) => {
      const teamName = row['DLB'];
      const playerId = String(row['Player ID']);
      if (teamName) {
        teamSet.add(teamName);
        if (!keepers[teamName]) keepers[teamName] = [];
        if (playerId) keepers[teamName].push(playerId);
      }
    });
  }

  // --- 2. Process Players ---
  const processSheet = (sheetName: string, type: 'Batter' | 'Pitcher', isOTL: boolean) => {
    if (!workbook.Sheets[sheetName]) return;
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    data.forEach((row: any) => {
      // Common Fields
      const id = String(row['Player ID'] || row['ID']);
      const name = row['Name'];
      const team = row['TEAM'];
      
      const stats: Record<string, any> = {};
      const splits: any = { vsL: {}, vsR: {} };
      
      // Parse Stats & Splits
      Object.keys(row).forEach(key => {
        if (['Player ID', 'ID', 'Name', 'TEAM', 'DLB', 'AGE', 'Bats', 'Hand', 'POS', 'Spot'].includes(key)) return;
        
        const val = row[key];
        if (typeof val === 'number') {
          if (key.startsWith('L') && key !== 'LLIM' && key !== 'LP') { // Heuristic for split stats
             splits.vsL[key.substring(1)] = val;
          } else if (key.startsWith('R') && key !== 'RLIM' && key !== 'RP') {
             splits.vsR[key.substring(1)] = val;
          } else {
             stats[key] = val;
          }
        }
      });

      // Batter Specifics
      let positions: string[] = [];
      let bats: string | undefined = undefined;
      let throws: string | undefined = undefined;
      let role: string | undefined = undefined;

      if (type === 'Batter') {
        bats = row['Bats'] ? row['Bats'][0] : 'R';
        // Positions from defensive columns
        ['C', '1b', '2b', '3b', 'SS', 'LF', 'CF', 'RF'].forEach(pos => {
          if (row[pos] && String(row[pos]).trim() !== '') {
            positions.push(pos.toUpperCase());
          }
        });
        if (positions.length === 0) positions.push('DH');
      } 
      
      // Pitcher Specifics
      if (type === 'Pitcher') {
        throws = row['Hand'] ? row['Hand'][0] : 'R';
        // Role logic: check 'Spot' or 'POS'
        if (row['Spot'] > 0 || (row['POS'] && row['POS'].includes('SP'))) {
          role = 'SP';
          positions.push('SP');
        } else {
          role = 'RP';
          positions.push('RP');
        }
        // Additional positions from POS column if comma separated?
        if (row['POS']) {
           // clean up
        }
      }

      // Attributes mapping
      const p: PlayerData = {
        id, name, team, type, positions, isOTL, stats, splits,
        bats, throws, role,
        // Map common attributes to top level for filtering
        speed: row['BR'], // BR = Speed? Or Baserunning? Let's assume BR is speed-like
        sb: row['Steal'] ? parseInt(row['Steal']) : undefined, // Steal is string "7/6/6"?
        durability: row['DURA'], // String?
        // Pitcher
        endurance: row['END'],
        hold: row['Hold'],
        jam: row['JAM'],
        on: row['ON'],
        off: row['OFF'],
        innings: row['IP']
      };
      
      players.push(p);
    });
  };

  processSheet('BattersDraft', 'Batter', false);
  processSheet('BattersOTL', 'Batter', true);
  processSheet('PitchersDraft', 'Pitcher', false);
  processSheet('PitchersOTL', 'Pitcher', true);

  // Generate Teams Array
  const teams = Array.from(teamSet).map((name, i) => ({
    id: i + 1,
    name,
    otlTokens: 1,
    keepers: keepers[name] || [],
    lineup: {}
  }));

  const output = {
    teams,
    players
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log("Mock data generated:", outPath);

} catch (error) {
  console.error("Error generating data:", error);
}
