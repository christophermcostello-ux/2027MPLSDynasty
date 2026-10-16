import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';

const filePath = path.resolve('attached_assets/WebDraft_1768658838126.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  console.log("Sheets:", workbook.SheetNames);
  
  const allData: any[] = [];
  
  workbook.SheetNames.forEach((name: string) => {
    const ws = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws);
    // Add a specialized field to track source sheet if needed, or just merge
    // data.forEach((d: any) => d._sheet = name); 
    allData.push(...data);
  });
  
  console.log(JSON.stringify(allData, null, 2));
} catch (error) {
  console.error("Error parsing Excel:", error);
}
