import React, { useState, useMemo, useEffect } from 'react';
import { Player } from '@/lib/liveDraftStore';
import { useDraftData } from '@/lib/useDraftData';

interface PlayerStats {
  [key: string]: number | string | Record<string, number | string>;
}
import { PLAYER_TIERS } from '@/lib/playerTiers';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Shield, Coins, ArrowUpDown, ChevronDown, ChevronUp, Plus, X, Check, Star } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Grid3X3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import batterTierData from '@/lib/batter_tier_grid.json';
import pitcherTierData from '@/lib/pitcher_tier_grid.json';

interface BatterTierEntry {
  id: string;
  name: string;
  tier: number;
  positions: string[];
  llim: string;
  rlim: string;
  durability: string;
}

interface PitcherTierEntry {
  id: string;
  name: string;
  tier: number;
  role: 'SP' | 'RP';
  throws: 'L' | 'R';
  durability: string;
  ip: number | string;
}

const GRID_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'CF', 'OF'] as const;
const PITCHER_COLUMNS = ['RHP SP 1', 'RHP SP 2', 'LHP SP', 'RHP RP 1', 'RHP RP 2', 'RHP RP 3', 'LHP RP 1', 'LHP RP 2'] as const;
const TIERS = [1, 2, 3, 4, 5, 6, 7] as const;

const TIER_COLORS = [
  'bg-emerald-900/40 border-emerald-600/50',
  'bg-teal-900/40 border-teal-600/50',
  'bg-cyan-900/40 border-cyan-600/50',
  'bg-sky-900/40 border-sky-600/50',
  'bg-indigo-900/40 border-indigo-600/50',
  'bg-violet-900/40 border-violet-600/50',
  'bg-purple-900/40 border-purple-600/50',
];

function formatDisplayName(name: string): string {
  if (name === 'Michael Harris II') return 'Harris';
  if (name === 'Nacho Alvarez Jr') return 'Alvarez';
  return name.split(' ').pop() || name;
}

// Queue stored in localStorage
const QUEUE_STORAGE_KEY = 'draft-queue';

function getStoredQueue(): string[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: string[]) {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

interface ColumnFilterProps {
  columnId: string;
  title: string;
  options: string[];
  selectedValues: Set<string>;
  onSelect: (values: Set<string>) => void;
}

function ColumnFilter({ columnId, title, options, selectedValues, onSelect }: ColumnFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0 hover:bg-transparent">
          <Plus className={cn("h-3 w-3", selectedValues.size > 0 ? "text-primary fill-primary" : "text-muted-foreground")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filter ${title}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                   if (selectedValues.size === options.length) {
                     onSelect(new Set());
                   } else {
                     onSelect(new Set(options));
                   }
                }}
              >
                <div className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  selectedValues.size === options.length ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                )}>
                  <Check className={cn("h-4 w-4")} />
                </div>
                <span>Select All</span>
              </CommandItem>
              <CommandItem
                 onSelect={() => onSelect(new Set())}
              >
                <div className="mr-2 h-4 w-4" /> {/* Spacer */}
                <span>Clear</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup className="max-h-[200px] overflow-auto">
              {options.map((option) => {
                const isSelected = selectedValues.has(option);
                return (
                  <CommandItem
                    key={option}
                    onSelect={() => {
                      const newSet = new Set(selectedValues);
                      if (isSelected) {
                        newSet.delete(option);
                      } else {
                        newSet.add(option);
                      }
                      onSelect(newSet);
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    <span>{option === '' ? '(Empty)' : option}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const OTL_PICK_CAP = 10;

export function PlayersPage() {
  const { players, makePick: unifiedMakePick, currentPickIndex, picks, teams, isCommissionerMode, phase, draftedPlayerIds, isLiveMode } = useDraftData();
  const otlPickCap = OTL_PICK_CAP;
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('batters');
  
  // Queue State (localStorage only - not synced to backend)
  const [localQueue, setLocalQueue] = useState<string[]>(() => getStoredQueue());
  
  // Persist queue to localStorage and sync with drafted players
  useEffect(() => {
    saveQueue(localQueue);
  }, [localQueue]);

  // Auto-remove drafted players from queue
  useEffect(() => {
    setLocalQueue(prev => prev.filter(id => !draftedPlayerIds.has(id)));
  }, [draftedPlayerIds]);
  
  const toggleQueue = (playerId: string) => {
    setLocalQueue(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else if (prev.length < 12) {
        return [...prev, playerId];
      }
      return prev;
    });
  };
  
  const removeFromLocalQueue = (playerId: string) => {
    setLocalQueue(prev => prev.filter(id => id !== playerId));
  };
  
  // Sorting State
  const [sortKey, setSortKey] = useState<string>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sortContext, setSortContext] = useState<'overall' | 'vsL' | 'vsR'>('overall');

  // Filtering State
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]); // Keep existing
  const [filterRanges, setFilterRanges] = useState<Record<string, [number, number]>>({});
  
  // New Column Filters State
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  // Stats View Toggle State
  const [statsView, setStatsView] = useState<'default' | 'defense' | 'points'>('default');
  
  // Safe access to currentPick
  const currentPick = picks[currentPickIndex] || null;
  const currentTeam = currentPick ? teams.find(t => t.id === currentPick.ownerTeamId) : null;
  const isDraftComplete = !currentPick;

  // OTL Status
  const otlPicksUsed = picks.filter(p => p.isOTL).length;
  const isOtlCapReached = otlPicksUsed >= otlPickCap;
  
  // Use draftedPlayerIds from unified hook (includes both mock and live draft picks)
  const unavailablePlayerIds = draftedPlayerIds;

  // Determine available columns based on active tab
  const isPitcherTab = activeTab.includes('pitchers');
  const availableStats = useMemo(() => {
    const relevantType = isPitcherTab ? 'Pitcher' : 'Batter';
    const relevantPlayers = players.filter(p => p.type === relevantType);
    const statsSet = new Set<string>();
    
    // Scan players to find all available numeric keys in stats object
    relevantPlayers.forEach(p => {
      if (p.stats) Object.keys(p.stats).forEach(k => statsSet.add(k));
      // Also add attributes
      if (isPitcherTab) {
        ['LTotal', 'LDD', 'RTotal', 'RDD', 'END', 'SL', 'Spot', 'JAM', 'ON', 'OFF', 'Hold', 'DUR', 'IP'].forEach(k => statsSet.add(k));
      } else {
        ['speed', 'sb', 'range', 'error', 'arm', 'Dur', 'Clutch', 'LP', 'RP', 'LTotal', 'RTotal', 'LLIM', 'RLIM', 'BR', 'Lead', 'Steal'].forEach(k => statsSet.add(k));
      }
    });
    return Array.from(statsSet).sort();
  }, [players, activeTab, isPitcherTab]);

  // Available Positions for Filter
  const availablePositions = useMemo(() => {
    const s = new Set<string>();
    players.forEach(p => p.positions.forEach(pos => s.add(pos)));
    return Array.from(s).sort();
  }, [players]);

  // Determine columns based on active tab and statsView
  const columns = useMemo(() => {
    if (activeTab === 'batters' || activeTab === 'otl-batters') {
       const baseColumns = [
         { key: 'name', label: 'Name', width: 'w-[140px]', sortable: true, filterable: false },
         { key: 'team', label: 'Team', width: 'w-[50px]', sortable: true, filterable: true },
         { key: 'pos', label: 'Pos', width: 'w-[60px]', sortable: false, filterable: true },
         { key: 'Age', label: 'Age', width: 'w-[45px]', sortable: true, filterable: false },
         { key: 'bats', label: 'Bats', width: 'w-[50px]', sortable: true, filterable: true },
         { key: 'Clutch', label: 'Clutch', width: 'w-[60px]', sortable: true, filterable: true },
         { key: 'LTotal', label: 'L Total', width: 'w-[70px]', sortable: true, filterable: false },
         { key: 'LP', label: 'LP', width: 'w-[50px]', sortable: true, filterable: true },
         { key: 'RTotal', label: 'R Total', width: 'w-[70px]', sortable: true, filterable: false },
         { key: 'RP', label: 'RP', width: 'w-[50px]', sortable: true, filterable: true },
         { key: 'LLIM', label: 'LLIM', width: 'w-[50px]', sortable: true, filterable: true },
         { key: 'RLIM', label: 'RLIM', width: 'w-[50px]', sortable: true, filterable: true },
         { key: 'BR', label: 'BR', width: 'w-[50px]', sortable: true, filterable: true },
         { key: 'Lead', label: 'Lead', width: 'w-[60px]', sortable: true, filterable: false },
         { key: 'Steal', label: 'Steal', width: 'w-[60px]', sortable: true, filterable: false },
         { key: 'Dur', label: 'Dur', width: 'w-[50px]', sortable: true, filterable: true },
         { key: 'Tier', label: 'Tier', width: 'w-[50px]', sortable: true, filterable: true },
       ];

       if (statsView === 'defense') {
         // Condensed Defense Column
         return [...baseColumns, { key: 'defense_summary', label: 'DEF Stats', width: 'w-[200px]', sortable: false, filterable: false }];
       }

       if (statsView === 'points') {
         // Condensed Points Column
         return [...baseColumns, { key: 'points_summary', label: 'Points Breakdown', width: 'w-[280px]', sortable: false, filterable: false }];
       }

       return baseColumns;
    }

    // Pitcher Columns
    const pitcherBaseColumns = [
       { key: 'name', label: 'Name', width: 'w-[140px]', sortable: true, filterable: false },
       { key: 'team', label: 'Team', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'pos', label: 'Pos', width: 'w-[60px]', sortable: false, filterable: true },
       { key: 'Age', label: 'Age', width: 'w-[45px]', sortable: true, filterable: false },
       { key: 'throws', label: 'Hand', width: 'w-[50px]', sortable: true, filterable: true },
    ];

    const pitcherRatingColumns = [
       { key: 'END', label: 'END', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'SL', label: 'S/L', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'Spot', label: 'Spot', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'JAM', label: 'JAM', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'ON', label: 'ON', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'OFF', label: 'OFF', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'Hold', label: 'Hold', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'DUR', label: 'DUR', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'IP', label: 'IP', width: 'w-[50px]', sortable: true, filterable: true },
       { key: 'Tier', label: 'Tier', width: 'w-[50px]', sortable: true, filterable: true },
    ];

    if (statsView === 'points') {
      return [
        ...pitcherBaseColumns,
        { key: 'LTotal', label: 'L Total', width: 'w-[70px]', sortable: true, filterable: false },
        { key: 'LDD', label: 'L DD', width: 'w-[60px]', sortable: true, filterable: false },
        { key: 'RTotal', label: 'R Total', width: 'w-[70px]', sortable: true, filterable: false },
        { key: 'RDD', label: 'R DD', width: 'w-[60px]', sortable: true, filterable: false },
        { key: 'pitcher_points_summary', label: 'Points Breakdown', width: 'w-[280px]', sortable: false, filterable: false },
        ...pitcherRatingColumns
      ];
    }

    // Default Pitcher View
    return [
       ...pitcherBaseColumns,
       { key: 'LTotal', label: 'L Total', width: 'w-[70px]', sortable: true, filterable: false },
       { key: 'LDD', label: 'L DD', width: 'w-[60px]', sortable: true, filterable: false },
       { key: 'RTotal', label: 'R Total', width: 'w-[70px]', sortable: true, filterable: false },
       { key: 'RDD', label: 'R DD', width: 'w-[60px]', sortable: true, filterable: false },
       ...pitcherRatingColumns
    ];
  }, [activeTab, availableStats, statsView]);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    
    // Get current tab players for accurate filtering context
    const tabPlayers = players.filter(player => {
      if (activeTab === 'batters' && (player.type !== 'Batter' || player.isOTL)) return false;
      if (activeTab === 'pitchers' && (player.type !== 'Pitcher' || player.isOTL)) return false;
      if (activeTab === 'otl-batters' && (player.type !== 'Batter' || !player.isOTL)) return false;
      if (activeTab === 'otl-pitchers' && (player.type !== 'Pitcher' || !player.isOTL)) return false;
      return true;
    });

    columns.forEach(col => {
      if (col.filterable) {
        if (col.key === 'pos') {
          // Custom options for Position column as requested
          options[col.key] = ['C', '1B', '2B', '3B', 'SS', 'OF', 'CF'];
        } else {
          const values = new Set<string>();
          tabPlayers.forEach(p => {
             let val: any;
             if (col.key === 'team') val = p.team;
             else if (col.key === 'bats') val = p.bats;
             else if (col.key === 'throws') val = p.throws;
             else if (col.key === 'Tier') val = PLAYER_TIERS[p.id] ?? '';
             else val = (p as any)[col.key] ?? p.stats?.[col.key] ?? '';
             
             if (val === undefined || val === null) val = '';
             values.add(String(val));
          });
          options[col.key] = Array.from(values).sort();
        }
      }
    });
    return options;
  }, [players, activeTab, columns]);

  // Filtering & Sorting Logic
  const filteredPlayers = useMemo(() => {
    let result = players.filter(player => {
      // 1. Tab Logic
      if (activeTab === 'batters' && (player.type !== 'Batter' || player.isOTL)) return false;
      if (activeTab === 'pitchers' && (player.type !== 'Pitcher' || player.isOTL)) return false;
      if (activeTab === 'otl-batters' && (player.type !== 'Batter' || !player.isOTL)) return false;
      if (activeTab === 'otl-pitchers' && (player.type !== 'Pitcher' || !player.isOTL)) return false;

      // 2. Drafted or Keeper
      if (unavailablePlayerIds.has(player.id)) return false;

      // 3. Search
      if (search && !player.name.toLowerCase().includes(search.toLowerCase())) return false;

      // 4. Positions (Global)
      if (selectedPositions.length > 0) {
        if (!player.positions.some(pos => selectedPositions.includes(pos))) return false;
      }

      // 5. Numeric Ranges
      for (const [key, [min, max]] of Object.entries(filterRanges)) {
        const val = (player as any)[key] ?? player.stats?.[key] ?? 0;
        if (typeof val === 'number') {
           if (val < min || val > max) return false;
        }
      }

      // 6. Column Filters (AND Logic)
      for (const [key, selectedSet] of Object.entries(columnFilters)) {
        // Only apply filters for columns that are currently visible
        if (!columns.some(c => c.key === key)) continue;

        if (selectedSet.size > 0) {
           if (key === 'pos') {
             // Custom logic for Position filter (Array check with OR logic within filter)
             const match = Array.from(selectedSet).some(filterVal => {
               // Special handling for OF to include LF/CF/RF
               if (filterVal === 'OF') {
                 return player.positions.some(p => ['OF', 'LF', 'CF', 'RF'].includes(p));
               }
               return player.positions.includes(filterVal);
             });
             if (!match) return false;
           } else {
             let val: any;
             if (key === 'team') val = player.team;
             else if (key === 'bats') val = player.bats;
             else if (key === 'throws') val = player.throws;
             else if (key === 'Tier') val = PLAYER_TIERS[player.id] ?? '';
             else val = (player as any)[key] ?? player.stats?.[key] ?? '';
             
             if (val === undefined || val === null) val = '';
             if (!selectedSet.has(String(val))) return false;
           }
        }
      }

      return true;
    });

    // Sorting
    let finalSortKey = sortKey;
    let finalSortDir = sortDir;
    const isPitchersTab = activeTab === 'pitchers' || activeTab === 'otl-pitchers';

    // Default Sort Logic for Batters/Pitchers
    if (finalSortKey === 'default' && (activeTab === 'batters' || activeTab === 'pitchers')) {
        finalSortKey = 'Tier';
        finalSortDir = 'asc';
    }

    if (finalSortKey && finalSortKey !== 'default') {
      result.sort((a, b) => {
        // Special Handling for Tier
        if (finalSortKey === 'Tier') {
            const tA = PLAYER_TIERS[a.id];
            const tB = PLAYER_TIERS[b.id];
            
            const hasA = tA !== undefined && tA !== '';
            const hasB = tB !== undefined && tB !== '';

            // Always put players with Tiers before players without Tiers (Blanks at bottom)
            if (hasA && !hasB) return -1;
            if (!hasA && hasB) return 1;
            
            if (!hasA && !hasB) {
                // Secondary Sort: IP descending for pitchers, Name for batters
                if (isPitchersTab) {
                    const ipA = a.stats?.IP ?? 0;
                    const ipB = b.stats?.IP ?? 0;
                    return ipB - ipA; // Descending
                }
                return a.name.localeCompare(b.name);
            }

            // Both have tiers - numeric comparison
            const nA = Number(tA);
            const nB = Number(tB);
            
            if (nA !== nB) {
                return finalSortDir === 'asc' ? nA - nB : nB - nA;
            }
            
            // Same Tier -> Secondary Sort: IP descending for pitchers, Name for batters
            if (isPitchersTab) {
                const ipA = a.stats?.IP ?? 0;
                const ipB = b.stats?.IP ?? 0;
                return ipB - ipA; // Descending
            }
            return a.name.localeCompare(b.name);
        }

        let valA: any = 0;
        let valB: any = 0;

        // Helper to extract value
        const getVal = (p: Player, key: string) => {
           if (key === 'pos') return p.positions.join('/');
           if (key === 'name') return p.name;
           if (key === 'team') return p.team;
           if (key === 'bats') return p.bats;
           if (key === 'throws') return p.throws;
           if (key === 'Tier') return PLAYER_TIERS[p.id] ?? '';
           return (p as any)[key] ?? p.stats?.[key] ?? 0;
        };

        valA = getVal(a, finalSortKey);
        valB = getVal(b, finalSortKey);

        if (typeof valA === 'number' && typeof valB === 'number') {
          return finalSortDir === 'asc' ? valA - valB : valB - valA;
        }
        return finalSortDir === 'asc' 
          ? String(valA).localeCompare(String(valB)) 
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [players, search, activeTab, unavailablePlayerIds, sortKey, sortDir, sortContext, selectedPositions, filterRanges, columnFilters, columns]);

  // Handle active filters clearing
  const clearAllFilters = () => {
    setColumnFilters({});
    setFilterRanges({});
    setSelectedPositions([]);
    setSearch('');
  };

  const hasActiveFilters = Object.values(columnFilters).some(s => s.size > 0) || Object.keys(filterRanges).length > 0 || selectedPositions.length > 0 || search;

  const handleDraft = (player: Player) => {
    unifiedMakePick(player.id, player.isOTL);
    removeFromLocalQueue(player.id);
  };

  const canDraftOTL = () => {
    if (!currentPick || !currentTeam) return false;
    if (phase !== 'ML') return false; 
    if (currentTeam.otlTokens <= 0) return false;
    if (isOtlCapReached) return false;
    return true;
  };

  // Get queued players data
  const queuedPlayers = localQueue.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];

  return (
    <div 
      className="flex flex-col space-y-4 p-2 w-full overflow-hidden"
      style={{ height: 'calc(100vh - 96px)' }}
    >
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-lg border shadow-sm">
        
        {/* Row 1: Tabs + Search + Queue Panel */}
        <div className="flex items-start gap-4 flex-wrap">
          {/* Left: Tabs + Search */}
          <div className="flex flex-col gap-4 flex-1">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList>
                <TabsTrigger value="batters">Batters</TabsTrigger>
                <TabsTrigger value="batter-tiers" className="gap-2"><Grid3X3 className="h-3 w-3"/> TIERS</TabsTrigger>
                <TabsTrigger value="pitchers">Pitchers</TabsTrigger>
                <TabsTrigger value="pitcher-tiers" className="gap-2"><Grid3X3 className="h-3 w-3"/> TIERS</TabsTrigger>
                <TabsTrigger value="otl-batters" className="gap-2"><Coins className="h-3 w-3 text-amber-500"/> OTL Batters</TabsTrigger>
                <TabsTrigger value="otl-pitchers" className="gap-2"><Coins className="h-3 w-3 text-amber-500"/> OTL Pitchers</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Queue Panel (6x2 grid) */}
          <div className="flex flex-col gap-1 p-2 bg-muted/30 rounded-lg border min-w-[320px] lg:min-w-[620px]" data-testid="queue-panel">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Queue</span>
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">{localQueue.length}/12</Badge>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1">
              {Array.from({ length: 12 }).map((_, idx) => {
                const player = queuedPlayers[idx];
                const isAlreadyDrafted = player ? unavailablePlayerIds.has(player.id) : false;
                const canDraftFromQueue = player && !isDraftComplete && !isAlreadyDrafted && (player.isOTL ? canDraftOTL() : true);
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "h-10 rounded border text-xs flex items-center px-1 overflow-hidden",
                      player ? "bg-card border-primary/30" : "bg-muted/20 border-dashed border-muted-foreground/30 justify-center"
                    )}
                    data-testid={`queue-slot-${idx}`}
                  >
                    {player ? (
                      <div className="flex items-center gap-1 w-full">
                        <button
                          onClick={() => removeFromLocalQueue(player.id)}
                          className="text-amber-500 hover:text-amber-400 flex-shrink-0"
                          data-testid={`queue-remove-${player.id}`}
                        >
                          <Star className="h-3 w-3 fill-current" />
                        </button>
                        <span 
                          className="truncate font-medium flex-1" 
                          style={{ fontSize: 'var(--font-size-queue, 11px)' }}
                          title={`${player.name} (${player.positions.join('/')})`}
                        >
                          {player.name}
                        </span>
                        <Button
                          size="sm"
                          className={cn(
                            "h-5 px-1.5 text-[9px] font-bold flex-shrink-0",
                            canDraftFromQueue 
                              ? "bg-green-600 hover:bg-green-500 text-white" 
                              : "bg-muted text-muted-foreground cursor-not-allowed"
                          )}
                          onClick={() => canDraftFromQueue && handleDraft(player)}
                          disabled={!canDraftFromQueue}
                          title={isAlreadyDrafted ? "Already drafted" : isDraftComplete ? "Draft complete" : "Draft this player"}
                          data-testid={`queue-draft-${player.id}`}
                        >
                          +
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 text-[10px]">{idx + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          </div>

        {/* Row 2: Batter & Pitcher Controls (Left Aligned) */}
        <div className="flex items-center gap-2">
          {/* Batters Controls */}
          {(activeTab === 'batters' || activeTab === 'otl-batters') && (
            <>
              <Button 
                variant={statsView === 'defense' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setStatsView(prev => prev === 'defense' ? 'default' : 'defense')}
                className={cn("text-xs", statsView === 'defense' ? "" : "text-muted-foreground")}
              >
                <Shield className="mr-1 h-3 w-3" />
                Show Defense Stats
              </Button>
              <Button 
                variant={statsView === 'points' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setStatsView(prev => prev === 'points' ? 'default' : 'points')}
                className={cn("text-xs", statsView === 'points' ? "" : "text-muted-foreground")}
              >
                <Coins className="mr-1 h-3 w-3" />
                Show Batter Points
              </Button>
            </>
          )}

          {/* Pitchers Controls */}
          {(activeTab === 'pitchers' || activeTab === 'otl-pitchers') && (
            <Button 
              variant={statsView === 'points' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatsView(prev => prev === 'points' ? 'default' : 'points')}
              className={cn("text-xs", statsView === 'points' ? "" : "text-muted-foreground")}
            >
              <Coins className="mr-1 h-3 w-3" />
              Show Pitcher Points
            </Button>
          )}
        </div>

      </div>

      {/* Content Area */}
      {activeTab === 'batter-tiers' ? (
        <BatterTierGridContent
          search={search}
          localQueue={localQueue}
          toggleQueue={toggleQueue}
          unavailablePlayerIds={unavailablePlayerIds}
        />
      ) : activeTab === 'pitcher-tiers' ? (
        <PitcherTierGridContent
          search={search}
          localQueue={localQueue}
          toggleQueue={toggleQueue}
          unavailablePlayerIds={unavailablePlayerIds}
        />
      ) : (
      <div className="rounded-md border bg-card shadow-sm flex-1 overflow-hidden flex flex-col relative">
        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 p-2 border-b bg-muted/20 text-xs overflow-x-auto whitespace-nowrap z-40 relative">
            <span className="font-semibold text-muted-foreground mr-2">Active Filters:</span>
            
            {/* Clear All */}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive" onClick={clearAllFilters}>
              Clear All
            </Button>

            {/* Position Pills */}
            {selectedPositions.map(pos => (
              <Badge key={`pos-${pos}`} variant="secondary" className="gap-1 rounded-sm px-1.5 font-normal">
                Pos: {pos}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedPositions(prev => prev.filter(p => p !== pos))} />
              </Badge>
            ))}

            {/* Range Filter Pills */}
            {Object.entries(filterRanges).map(([key, [min, max]]) => (
              <Badge key={`range-${key}`} variant="secondary" className="gap-1 rounded-sm px-1.5 font-normal">
                {key.toUpperCase()} &ge; {min}
                <X className="h-3 w-3 cursor-pointer" onClick={() => {
                  const newRanges = { ...filterRanges };
                  delete newRanges[key];
                  setFilterRanges(newRanges);
                }} />
              </Badge>
            ))}

            {/* Column Filter Pills */}
            {Object.entries(columnFilters).map(([key, set]) => {
              if (set.size === 0) return null;
              const label = columns.find(c => c.key === key)?.label || key;
              return (
                <Badge key={`col-${key}`} variant="secondary" className="gap-1 rounded-sm px-1.5 font-normal">
                  {label}: {Array.from(set).join(', ')}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                     const newFilters = { ...columnFilters };
                     delete newFilters[key];
                     setColumnFilters(newFilters);
                  }} />
                </Badge>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-auto relative w-full custom-scrollbar">
          <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
            <TableHeader className="bg-card">
              <TableRow className="hover:bg-transparent">
                {/* Star Column Header */}
                <TableHead className="sticky top-0 z-50 h-9 w-8 px-1 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                  <Star className="h-3 w-3 text-muted-foreground mx-auto" />
                </TableHead>
                {columns.map((col, idx) => {
                   // Clean up sticky logic as requested - no horizontal scroll
                   return (
                    <TableHead 
                      key={col.key} 
                      className={cn(
                        "sticky top-0 z-50 h-9 px-2 font-semibold select-none bg-card shadow-[0_1px_0_0_hsl(var(--border))]", 
                        col.width, 
                        col.sortable ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""
                      )}
                      style={{ fontSize: 'var(--font-size-table-header)' }}
                    >
                      <div className={cn("flex items-center gap-1", col.key !== 'name' && col.key !== 'team' && col.key !== 'pos' && "justify-end")}>
                        <div 
                           className={cn("flex items-center gap-1", col.sortable ? "cursor-pointer select-none hover:text-primary transition-colors" : "")}
                           onClick={() => {
                             if (col.sortable) {
                               if (sortKey === col.key) {
                                 setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                               } else {
                                 setSortKey(col.key);
                                 setSortDir('desc');
                               }
                             }
                           }}
                        >
                           {col.label}
                           {sortKey === col.key && (
                             <ArrowUpDown className={cn("h-3 w-3", sortDir === 'asc' ? "transform rotate-180" : "")} />
                           )}
                        </div>
                        {col.filterable && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <ColumnFilter 
                              columnId={col.key}
                              title={col.label}
                              options={filterOptions[col.key] || []}
                              selectedValues={columnFilters[col.key] || new Set()}
                              onSelect={(newSet) => {
                                setColumnFilters(prev => ({ ...prev, [col.key]: newSet }));
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </TableHead>
                   );
                })}
                {/* Actions Column Header */}
                {!isDraftComplete && (
                  <TableHead className="sticky top-0 z-50 bg-card h-9 w-[100px] text-right px-4 shadow-[0_1px_0_0_hsl(var(--border))]">
                    Action
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 2} className="h-24 text-center text-muted-foreground">
                    No players found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player) => {
                  const isQueued = localQueue.includes(player.id);
                  return (
                    <TableRow key={player.id} className="group hover:bg-muted/30">
                      {/* Star Cell */}
                      <TableCell className="h-10 py-1 px-1 w-8 bg-card group-hover:bg-muted/30">
                        <button
                          onClick={() => toggleQueue(player.id)}
                          className={cn(
                            "flex items-center justify-center w-full",
                            isQueued ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-400"
                          )}
                          data-testid={`star-${player.id}`}
                        >
                          <Star className={cn("h-4 w-4", isQueued && "fill-current")} />
                        </button>
                      </TableCell>
                      {columns.map((col) => {
                         let val: any;
                         if (col.key === 'pos') val = player.positions.join('/');
                         else if (col.key === 'team') val = player.team;
                         else if (col.key === 'bats') val = player.bats;
                         else if (col.key === 'defense_summary') {
                             const s = player.stats || {};
                             const parts = [];
                             if (s.C_Def) parts.push(`C:${s.C_Def}`);
                             if (s['1b_Def']) parts.push(`1B:${s['1b_Def']}`);
                             if (s['2b_Def']) parts.push(`2B:${s['2b_Def']}`);
                             if (s['3b_Def']) parts.push(`3B:${s['3b_Def']}`);
                             if (s.SS_Def) parts.push(`SS:${s.SS_Def}`);
                             if (s.LF_Def) parts.push(`LF:${s.LF_Def}`);
                             if (s.CF_Def) parts.push(`CF:${s.CF_Def}`);
                             if (s.RF_Def) parts.push(`RF:${s.RF_Def}`);
                             val = parts.join('  '); // Use double space for separation
                         }
                         else if (col.key === 'points_summary') {
                             const s = player.stats || {};
                             
                             const renderPointsRow = (label: string, stats: Record<string, any>, prefix: string) => (
                               <div className={cn("flex items-center gap-1.5")}>
                                 <span className="font-bold w-3 text-right text-muted-foreground">{label}</span>
                                 <div className="flex items-center gap-2">
                                   {['1b', '2b', '3b', 'HR', 'BB'].map(k => {
                                      const key = `${prefix}${k}`;
                                      const val = stats[key] || '-';
                                      return (
                                        <div key={k} className="flex items-baseline gap-0.5">
                                          <span className="text-[9px] text-muted-foreground uppercase">{k}</span>
                                          <span className="font-bold text-sm font-mono">{val}</span>
                                        </div>
                                      );
                                   })}
                                   {/* HBP separately to save space if needed or keep consistent */}
                                   <div className="flex items-baseline gap-0.5">
                                      <span className="text-[9px] text-muted-foreground uppercase">HBP</span>
                                      <span className="font-bold text-sm font-mono">{stats[`${prefix}HBP`] || '-'}</span>
                                   </div>
                                 </div>
                               </div>
                             );

                             val = (
                               <div className="flex flex-col gap-0.5 leading-tight py-0.5">
                                 {renderPointsRow('L', s, 'L')}
                                 {renderPointsRow('R', s, 'R')}
                               </div>
                             );
                         }
                         else if (col.key === 'pitcher_points_summary') {
                             const splits = player.splits || {};
                             
                             const renderPitcherPointsRow = (label: string, sideData: Record<string, any>) => (
                               <div className={cn("flex items-center gap-1.5")}>
                                 <span className="font-bold w-3 text-right text-muted-foreground">{label}</span>
                                 <div className="flex items-center gap-2">
                                   {['1b', '2b', 'BB'].map(k => {
                                      const val = sideData?.[k] || sideData?.[k.toUpperCase()] || '-';
                                      return (
                                        <div key={k} className="flex items-baseline gap-0.5">
                                          <span className="text-[9px] text-muted-foreground uppercase">{k}</span>
                                          <span className="font-bold text-base font-mono">{val}</span>
                                        </div>
                                      );
                                   })}
                                   {/* HBP */}
                                   <div className="flex items-baseline gap-0.5">
                                      <span className="text-[9px] text-muted-foreground uppercase">HBP</span>
                                      <span className="font-bold text-base font-mono">{sideData?.HBP || '-'}</span>
                                   </div>
                                 </div>
                               </div>
                             );

                             val = (
                               <div className="flex flex-col gap-0.5 leading-tight py-0.5">
                                 {renderPitcherPointsRow('L', splits.vsL || {})}
                                 {renderPitcherPointsRow('R', splits.vsR || {})}
                               </div>
                             );
                         }
                         else if (col.key === 'Tier') val = PLAYER_TIERS[player.id] ?? '-';
                         else if (col.key === 'Age') val = player.stats?.Age ?? '-';
                         else val = (player as any)[col.key] ?? player.stats?.[col.key] ?? '-';

                         return (
                           <TableCell 
                             key={col.key} 
                             className={cn("h-10 py-1 px-2 bg-card group-hover:bg-muted/30 whitespace-nowrap text-center")}
                             style={{ fontSize: 'var(--font-size-table)' }}
                           >
                              {col.key === 'name' ? (
                                <div className="flex flex-col text-left">
                                  <span className="font-medium">{player.name}</span>
                                  {player.isOTL && <span className="text-[10px] text-amber-600 font-semibold">OTL</span>}
                                </div>
                              ) : (
                                <div className={cn(
                                  "font-mono",
                                  (col.key === 'defense_summary' || col.key === 'points_summary' || col.key === 'pitcher_points_summary') && "text-muted-foreground whitespace-normal break-words"
                                )}>
                                  {val}
                                </div>
                              )}
                           </TableCell>
                         );
                      })}
                      {/* Action Cell */}
                      {!isDraftComplete && (
                        <TableCell className="bg-card h-10 py-1 w-[100px] text-right px-2">
                           <Button 
                            size="sm" 
                            className={cn(
                              "h-7 text-xs w-full font-bold",
                              player.isOTL ? "bg-amber-600 hover:bg-amber-500" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            )}
                            onClick={() => handleDraft(player)}
                            disabled={player.isOTL && !canDraftOTL()}
                          >
                            {player.isOTL ? "BID" : "DRAFT"}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </table>
        </div>
        
        <div className="p-2 border-t text-xs text-muted-foreground bg-muted/20">
          Showing {filteredPlayers.length} players
        </div>
      </div>
      )}
    </div>
  );
}

interface TierGridContentProps {
  search: string;
  localQueue: string[];
  toggleQueue: (playerId: string) => void;
  unavailablePlayerIds: Set<string>;
}

function BatterTierGridContent({ search, localQueue, toggleQueue, unavailablePlayerIds }: TierGridContentProps) {
  const { toast } = useToast();

  const gridData = useMemo(() => {
    const data: Record<number, Record<string, BatterTierEntry[]>> = {};
    
    TIERS.forEach(tier => {
      data[tier] = {};
      GRID_POSITIONS.forEach(pos => {
        data[tier][pos] = [];
      });
    });

    const searchLower = search.toLowerCase();

    (batterTierData as BatterTierEntry[]).forEach(entry => {
      if (unavailablePlayerIds.has(entry.id)) return;
      
      if (search && !entry.name.toLowerCase().includes(searchLower)) return;

      const hasCF = entry.positions.includes('CF');
      const addedToOF = new Set<string>();
      
      entry.positions.forEach(pos => {
        if (pos === 'C') data[entry.tier]['C'].push(entry);
        else if (pos === '1B') data[entry.tier]['1B'].push(entry);
        else if (pos === '2B') data[entry.tier]['2B'].push(entry);
        else if (pos === 'SS') data[entry.tier]['SS'].push(entry);
        else if (pos === '3B') data[entry.tier]['3B'].push(entry);
        else if (pos === 'CF') data[entry.tier]['CF'].push(entry);
        else if ((pos === 'LF' || pos === 'RF') && !hasCF && !addedToOF.has(entry.id)) {
          data[entry.tier]['OF'].push(entry);
          addedToOF.add(entry.id);
        }
      });
    });

    return data;
  }, [unavailablePlayerIds, search]);

  const handleClick = (entry: BatterTierEntry) => {
    if (unavailablePlayerIds.has(entry.id)) return;
    
    if (localQueue.includes(entry.id)) {
      toggleQueue(entry.id);
      return;
    }
    
    if (localQueue.length >= 12) {
      toast({
        title: "Queue is full",
        description: "Maximum 12 players allowed",
        variant: "destructive",
      });
      return;
    }
    
    toggleQueue(entry.id);
  };

  return (
    <div className="rounded-md border bg-card shadow-sm flex-1 overflow-hidden flex flex-col relative">
      <div className="flex-1 overflow-auto relative w-full custom-scrollbar p-4">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left font-bold text-muted-foreground w-12 border-b-2 border-muted-foreground/30 sticky top-0 bg-card z-10">Tier</th>
              {GRID_POSITIONS.map(pos => (
                <th 
                  key={pos} 
                  className="px-2 py-2 text-center font-bold text-muted-foreground border-b-2 border-muted-foreground/30 sticky top-0 bg-card z-10"
                  colSpan={pos === 'OF' ? 2 : 1}
                >
                  {pos}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tier, tierIdx) => (
              <tr key={tier} className={cn("border-2", TIER_COLORS[tierIdx])}>
                <td className="px-2 py-3 font-bold text-center align-top text-xl border-r border-muted-foreground/20">{tier}</td>
                {GRID_POSITIONS.map(pos => (
                  <td 
                    key={pos} 
                    className={cn(
                      "px-1 py-2 align-top border-r border-muted-foreground/20",
                      pos === 'OF' && "min-w-[160px]"
                    )}
                    colSpan={pos === 'OF' ? 2 : 1}
                  >
                    <div 
                      className={cn(
                        "flex flex-col",
                        pos === 'OF' && "grid grid-cols-2"
                      )}
                      style={{ gap: 'var(--tier-cell-gap)' }}
                    >
                      {gridData[tier][pos].map((entry, idx) => {
                        const isQueued = localQueue.includes(entry.id);
                        const hasLlim = entry.llim != null && entry.llim !== '';
                        const hasRlim = entry.rlim != null && entry.rlim !== '';
                        const showLimits = hasLlim || hasRlim;
                        const limitsText = showLimits 
                          ? `${hasLlim ? entry.llim : '-'}/${hasRlim ? entry.rlim : '-'}`
                          : '';
                        const isDurF = entry.durability?.toUpperCase() === 'F';
                        return (
                          <button
                            key={`${entry.id}-${pos}-${idx}`}
                            onClick={() => handleClick(entry)}
                            className={cn(
                              "rounded text-left transition-colors w-full flex items-center justify-between gap-1",
                              isQueued 
                                ? "bg-amber-600/80 text-white" 
                                : "bg-muted/60 hover:bg-primary/20 text-foreground"
                            )}
                            style={{
                              fontSize: 'var(--font-size-tier-pill)',
                              paddingTop: 'var(--tier-pill-padding-y)',
                              paddingBottom: 'var(--tier-pill-padding-y)',
                              paddingLeft: 'var(--tier-pill-padding-x)',
                              paddingRight: 'var(--tier-pill-padding-x)',
                            }}
                            title={`${entry.name}${showLimits ? ` - L/R: ${limitsText}` : ''}${entry.durability ? ` DUR: ${entry.durability}` : ''}`}
                            data-testid={`tier-grid-player-${entry.id}`}
                          >
                            <span className="truncate font-medium">{formatDisplayName(entry.name)}</span>
                            <span className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 'var(--font-size-tier-pill-stats)' }}>
                              {showLimits && <span className="text-muted-foreground">{limitsText}</span>}
                              {entry.durability && (
                                <span className={cn(isDurF ? "text-red-500 font-bold" : "text-muted-foreground")}>{entry.durability}</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t text-xs text-muted-foreground bg-muted/20">
        Click player to add to queue
      </div>
    </div>
  );
}

function PitcherTierGridContent({ search, localQueue, toggleQueue, unavailablePlayerIds }: TierGridContentProps) {
  const { toast } = useToast();

  const gridData = useMemo(() => {
    const data: Record<number, Record<string, PitcherTierEntry[]>> = {};
    
    TIERS.forEach(tier => {
      data[tier] = {};
      PITCHER_COLUMNS.forEach(col => {
        data[tier][col] = [];
      });
    });

    const searchLower = search.toLowerCase();
    
    const tierCategoryLists: Record<number, Record<string, PitcherTierEntry[]>> = {};
    TIERS.forEach(tier => {
      tierCategoryLists[tier] = {
        'RHP SP': [],
        'LHP SP': [],
        'RHP RP': [],
        'LHP RP': [],
      };
    });

    (pitcherTierData as PitcherTierEntry[]).forEach(entry => {
      if (unavailablePlayerIds.has(entry.id)) return;
      if (search && !entry.name.toLowerCase().includes(searchLower)) return;

      const category = `${entry.throws === 'L' ? 'LHP' : 'RHP'} ${entry.role}`;
      tierCategoryLists[entry.tier][category].push(entry);
    });

    TIERS.forEach(tier => {
      tierCategoryLists[tier]['RHP SP'].forEach((entry, idx) => {
        const col = idx % 2 === 0 ? 'RHP SP 1' : 'RHP SP 2';
        data[tier][col].push(entry);
      });

      tierCategoryLists[tier]['LHP SP'].forEach((entry) => {
        data[tier]['LHP SP'].push(entry);
      });

      tierCategoryLists[tier]['RHP RP'].forEach((entry, idx) => {
        const cols = ['RHP RP 1', 'RHP RP 2', 'RHP RP 3'];
        data[tier][cols[idx % 3]].push(entry);
      });

      tierCategoryLists[tier]['LHP RP'].forEach((entry, idx) => {
        const col = idx % 2 === 0 ? 'LHP RP 1' : 'LHP RP 2';
        data[tier][col].push(entry);
      });
    });

    return data;
  }, [unavailablePlayerIds, search]);

  const handleClick = (entry: PitcherTierEntry) => {
    if (unavailablePlayerIds.has(entry.id)) return;
    
    if (localQueue.includes(entry.id)) {
      toggleQueue(entry.id);
      return;
    }
    
    if (localQueue.length >= 12) {
      toast({
        title: "Queue is full",
        description: "Maximum 12 players allowed",
        variant: "destructive",
      });
      return;
    }
    
    toggleQueue(entry.id);
  };

  return (
    <div className="rounded-md border bg-card shadow-sm flex-1 overflow-hidden flex flex-col relative">
      <div className="flex-1 overflow-auto relative w-full custom-scrollbar p-4">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left font-bold text-muted-foreground w-12 border-b-2 border-muted-foreground/30 sticky top-0 bg-card z-10">Tier</th>
              <th colSpan={2} className="px-2 py-2 text-center font-bold text-muted-foreground border-b-2 border-muted-foreground/30 sticky top-0 bg-card z-10 border-l border-muted-foreground/20">RHP SP</th>
              <th className="px-2 py-2 text-center font-bold text-muted-foreground border-b-2 border-muted-foreground/30 sticky top-0 bg-card z-10 border-l border-muted-foreground/20">LHP SP</th>
              <th colSpan={3} className="px-2 py-2 text-center font-bold text-muted-foreground border-b-2 border-muted-foreground/30 sticky top-0 bg-card z-10 border-l border-muted-foreground/20">RHP RP</th>
              <th colSpan={2} className="px-2 py-2 text-center font-bold text-muted-foreground border-b-2 border-muted-foreground/30 sticky top-0 bg-card z-10 border-l border-muted-foreground/20">LHP RP</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tier, tierIdx) => (
              <tr key={tier} className={cn("border-2", TIER_COLORS[tierIdx])}>
                <td className="px-2 py-3 font-bold text-center align-top text-xl border-r border-muted-foreground/20">{tier}</td>
                {PITCHER_COLUMNS.map((col, colIdx) => (
                  <td 
                    key={col} 
                    className={cn(
                      "px-1 py-2 align-top border-r border-muted-foreground/20 min-w-[80px]",
                      (col === 'LHP SP' || col === 'RHP RP 1' || col === 'LHP RP 1') && "border-l border-muted-foreground/40"
                    )}
                  >
                    <div className="flex flex-col" style={{ gap: 'var(--tier-cell-gap)' }}>
                      {gridData[tier][col].map((entry, idx) => {
                        const isQueued = localQueue.includes(entry.id);
                        const isDurF = entry.durability?.toUpperCase() === 'F';
                        return (
                          <button
                            key={`${entry.id}-${col}-${idx}`}
                            onClick={() => handleClick(entry)}
                            className={cn(
                              "rounded text-left transition-colors w-full flex items-center justify-between gap-1",
                              isQueued 
                                ? "bg-amber-600/80 text-white" 
                                : "bg-muted/60 hover:bg-primary/20 text-foreground"
                            )}
                            style={{
                              fontSize: 'var(--font-size-tier-pill)',
                              paddingTop: 'var(--tier-pill-padding-y)',
                              paddingBottom: 'var(--tier-pill-padding-y)',
                              paddingLeft: 'var(--tier-pill-padding-x)',
                              paddingRight: 'var(--tier-pill-padding-x)',
                            }}
                            title={`${entry.name} - DUR: ${entry.durability} IP: ${entry.ip}`}
                            data-testid={`pitcher-tier-grid-player-${entry.id}`}
                          >
                            <span className="truncate font-medium">{formatDisplayName(entry.name)}</span>
                            <span className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 'var(--font-size-tier-pill-stats)' }}>
                              <span className={cn(isDurF ? "text-red-500 font-bold" : "text-muted-foreground")}>{entry.durability || '-'}</span>
                              <span className="text-muted-foreground">{entry.ip || '-'}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t text-xs text-muted-foreground bg-muted/20">
        Click player to add to queue
      </div>
    </div>
  );
}
