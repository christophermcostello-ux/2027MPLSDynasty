import * as fs from 'fs';
import * as path from 'path';

const csvPath = path.resolve('attached_assets/Pitcher_Tiers_Updated_1768865103878.csv');
const mockDataPath = path.resolve('client/src/lib/mock_data.json');
const outputPath = path.resolve('client/src/lib/pitcher_tier_grid.json');

const csvData = fs.readFileSync(csvPath, 'utf-8');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));

interface PitcherTierEntry {
  id: string;
  name: string;
  tier: number;
  role: 'SP' | 'RP';
  throws: 'L' | 'R';
  durability: string;
  ip: number | string;
}

const pitcherMap = new Map<string, { positions: string[], throws: string, durability: string, ip: number | string }>();
const players = mockData.players || [];
players.forEach((p: any) => {
  if (p.type === 'Pitcher') {
    pitcherMap.set(p.id.toString(), {
      positions: p.positions || [],
      throws: p.throws || 'R',
      durability: p.stats?.DUR || p.durability || '-',
      ip: p.stats?.IP || p.innings || '-'
    });
  }
});

const lines = csvData.split('\n');
const entries: PitcherTierEntry[] = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  const id = parts[0]?.trim();
  const name = parts[1]?.trim();
  const tier = parseInt(parts[2]?.trim(), 10);
  
  if (!id || !name || isNaN(tier)) continue;
  
  const pitcherInfo = pitcherMap.get(id);
  if (!pitcherInfo) {
    console.log(`Pitcher not found in mock data: ${id} ${name}`);
    continue;
  }
  
  const positions = pitcherInfo.positions;
  const role: 'SP' | 'RP' = positions.includes('SP') ? 'SP' : 'RP';
  const throws: 'L' | 'R' = pitcherInfo.throws === 'L' ? 'L' : 'R';
  const durability = pitcherInfo.durability;
  const ip = pitcherInfo.ip;
  
  entries.push({ id, name, tier, role, throws, durability, ip });
}

fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));
console.log(`Generated ${entries.length} pitcher tier entries`);
