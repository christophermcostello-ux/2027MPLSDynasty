import * as fs from 'fs';
import * as path from 'path';

const csvPath = path.resolve('attached_assets/Batters_Age_1768866381924.csv');
const mockDataPath = path.resolve('client/src/lib/mock_data.json');

const csvData = fs.readFileSync(csvPath, 'utf-8');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));

const ageMap = new Map<string, number>();

const lines = csvData.split('\n').slice(1);
lines.forEach(line => {
  const trimmed = line.trim();
  if (!trimmed) return;
  
  const parts = trimmed.split(',');
  if (parts.length >= 3) {
    const id = parts[0].trim();
    const age = parseInt(parts[2].trim(), 10);
    if (id && !isNaN(age)) {
      ageMap.set(id, age);
    }
  }
});

console.log(`Loaded ${ageMap.size} batter ages from CSV`);

let updatedCount = 0;
mockData.players.forEach((player: any) => {
  if (player.type !== 'Batter') return;
  
  const age = ageMap.get(player.id);
  if (age !== undefined) {
    if (!player.stats) player.stats = {};
    player.stats.Age = age;
    updatedCount++;
  }
});

fs.writeFileSync(mockDataPath, JSON.stringify(mockData, null, 2));
console.log(`Updated Age for ${updatedCount} batters`);
