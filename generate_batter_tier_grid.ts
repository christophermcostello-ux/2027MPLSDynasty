import * as fs from 'fs';
import * as path from 'path';

const csvPath = path.resolve('attached_assets/Batters_Draft_Tier_by_Position_1768874818915.csv');
const mockDataPath = path.resolve('client/src/lib/mock_data.json');
const outputPath = path.resolve('client/src/lib/batter_tier_grid.json');

const csvData = fs.readFileSync(csvPath, 'utf-8');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));
const lines = csvData.split('\n');

interface PlayerStats {
  LLIM?: number | string;
  RLIM?: number | string;
  Dur?: string;
}

interface Player {
  id: string;
  stats?: PlayerStats;
}

const playerMap = new Map<string, Player>();
for (const player of mockData.players) {
  playerMap.set(player.id, player);
}

interface BatterTierEntry {
  id: string;
  name: string;
  tier: number;
  positions: string[];
  llim: string;
  rlim: string;
  durability: string;
}

const entries: BatterTierEntry[] = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  const id = parts[0]?.trim();
  const name = parts[1]?.trim();
  const tier = parseInt(parts[3]?.trim(), 10);
  
  if (!id || !name || isNaN(tier)) continue;
  
  const positions: string[] = [];
  
  if (parts[4]?.trim()) positions.push('C');
  if (parts[5]?.trim()) positions.push('1B');
  if (parts[6]?.trim()) positions.push('2B');
  if (parts[7]?.trim()) positions.push('3B');
  if (parts[8]?.trim()) positions.push('SS');
  if (parts[9]?.trim()) positions.push('LF');
  if (parts[10]?.trim()) positions.push('CF');
  if (parts[11]?.trim()) positions.push('RF');

  const player = playerMap.get(id);
  const llim = player?.stats?.LLIM != null ? String(player.stats.LLIM) : '';
  const rlim = player?.stats?.RLIM != null ? String(player.stats.RLIM) : '';
  const durability = player?.stats?.Dur || '';
  
  entries.push({ id, name, tier, positions, llim, rlim, durability });
}

fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));
console.log(`Generated ${entries.length} batter tier entries`);
