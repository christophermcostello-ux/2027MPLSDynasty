import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';

const filePath = path.resolve('attached_assets/WebDraft_1768658838126.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const rosterSheet = workbook.Sheets['Rosters'];
  const data = XLSX.utils.sheet_to_json(rosterSheet).slice(0, 5);
  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error("Error parsing Excel:", error);
}
