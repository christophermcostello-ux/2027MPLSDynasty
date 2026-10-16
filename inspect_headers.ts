import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';

const filePath = path.resolve('attached_assets/WebDraft_1768658838126.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const pitcherSheet = workbook.Sheets['PitchersDraft'];
  const headers = XLSX.utils.sheet_to_json(pitcherSheet, { header: 1 })[0];
  console.log("Pitcher Headers:", JSON.stringify(headers));
  
  const rosterSheet = workbook.Sheets['Rosters'];
  const rosterHeaders = XLSX.utils.sheet_to_json(rosterSheet, { header: 1 })[0];
  console.log("Roster Headers:", JSON.stringify(rosterHeaders));

} catch (error) {
  console.error("Error parsing Excel:", error);
}
