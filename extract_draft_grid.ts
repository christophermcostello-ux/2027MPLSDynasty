import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';

const filePath = path.resolve('attached_assets/WebDraft_1768658838126.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = "Draft Picks.Grid";
  
  if (workbook.SheetNames.includes(sheetName)) {
    const ws = workbook.Sheets[sheetName];
    // Use header: 1 to get array of arrays, which is better for a grid
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(`Sheet "${sheetName}" not found. Available sheets:`, workbook.SheetNames);
  }
} catch (error) {
  console.error("Error parsing Excel:", error);
}
