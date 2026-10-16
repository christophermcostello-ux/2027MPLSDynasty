import { Pick, Phase } from './store';
import rawData from './raw_draft_grid.json';

// Mapping from Excel names to Team IDs in mock_data.json
const TEAM_NAME_TO_ID: Record<string, number> = {
  "Matt": 6,
  "Mike N": 1, // Assumed "Al" based on elimination
  "Mike": 7,
  "Lee": 5,
  "Jake": 4,
  "Tyler": 9,
  "Chris": 2,
  "Zack": 10,
  "Gus": 3,
  "Scott": 8
};

export function getDraftPicksFromGrid(): Pick[] {
  const picks: Pick[] = [];
  let overallPickNumber = 1;

  // Iterate through rows.
  // Structure:
  // Row N: [RoundNum, Pick1, Pick2, ..., Pick10]
  // Row N+1: [null, Owner1, Owner2, ..., Owner10]
  
  // Skip header (index 0)
  for (let i = 1; i < rawData.length; i += 2) {
    const roundRow = rawData[i];
    const ownerRow = rawData[i + 1];

    if (!roundRow || !ownerRow) break;

    const roundNum = roundRow[0];
    
    // Stop if we don't have a valid round number (or if it's "OTL" or something else)
    if (typeof roundNum !== 'number') continue;
    
    // Only process 16 rounds for Main Draft (ML)
    if (roundNum > 16) continue;

    for (let pickIdx = 1; pickIdx <= 10; pickIdx++) {
      const ownerName = ownerRow[pickIdx] as string;
      const teamId = TEAM_NAME_TO_ID[ownerName];
      
      if (!teamId) {
        console.warn(`Unknown team name in draft grid: ${ownerName} at Round ${roundNum} Pick ${pickIdx}`);
        // Fallback to pickIdx if mapping fails (original logic) or keep as 0/undefined
        // Using pickIdx as fallback to prevent crash, but this should be correct.
      }

      picks.push({
        id: `ml-${roundNum}-${pickIdx}`,
        phase: 'ML' as Phase,
        round: roundNum,
        pickInRound: pickIdx,
        overallPickNumber: overallPickNumber++,
        ownerTeamId: teamId || pickIdx, // Fallback to pick index if mapping fails
        originalOwnerTeamId: teamId || pickIdx,
        playerId: null,
        isOTL: false
      });
    }
  }

  // MiL Draft Order: Matt, Scott, Al, Mike, Lee, Jake, Tyler, Chris, Zack, Gus
  // Corresponding IDs: 6, 8, 1, 7, 5, 4, 9, 2, 10, 3
  const milDraftOrder = [6, 8, 1, 7, 5, 4, 9, 2, 10, 3];

  for (let r = 1; r <= 10; r++) {
    for (let i = 0; i < 10; i++) {
      const pickIdx = i + 1;
      const teamId = milDraftOrder[i];
      
      picks.push({
        id: `mil-${r}-${pickIdx}`,
        phase: 'MiL' as Phase,
        round: r,
        pickInRound: pickIdx,
        overallPickNumber: overallPickNumber++,
        ownerTeamId: teamId, 
        originalOwnerTeamId: teamId,
        playerId: null,
        isOTL: false
      });
    }
  }

  return picks;
}
