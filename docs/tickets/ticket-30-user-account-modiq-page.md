# Ticket 30: User Account Page - ModIQ Section

## 🎯 Objective
Design and implement the ModIQ section of the user account page, providing users with access to their mapping history, saved sessions, and account-level ModIQ settings.

## 📋 Context
With Ticket 27 requiring login for ModIQ and storing xmap files, we need a well-designed user account area where users can:
- View and resume incomplete sessions
- Access their mapping file history
- Download previous xmap files
- Manage their ModIQ preferences

## 📐 Account Page Structure

### Navigation
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [LOER Logo]                                              [User Menu ▼]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐                                                       │
│  │  My Account      │                                                       │
│  ├──────────────────┤                                                       │
│  │  Profile         │                                                       │
│  │  Purchases       │                                                       │
│  │  ★ ModIQ        │  ← New section                                        │
│  │  Settings        │                                                       │
│  │  Billing         │                                                       │
│  └──────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📐 ModIQ Dashboard Page (`/account/modiq`)

### Full Page Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  My Account > ModIQ                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Mod:IQ                                              [+ New Mapping]  │  │
│  │  Your AI-powered xLights mapping assistant                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  📊 STATS                                                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │     12      │  │   2,847     │  │    89%      │  │   4.2 hrs   │  │  │
│  │  │  Mappings   │  │   Items     │  │  Avg Cov.   │  │ Time Saved  │  │  │
│  │  │  Created    │  │   Mapped    │  │             │  │  (est.)     │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ⚠️ INCOMPLETE SESSION                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  🎃 Halloween Pack 2024                                               │  │
│  │  Layout: RonHoward_2024.xml                                           │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │████████████████████████████████░░░░░░░░░░░░░░░░░│ 69%           │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │  142 of 205 mapped · Phase: Models · Last saved: 2 hours ago        │  │
│  │                                                                       │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                            │  │
│  │  │  Resume Mapping │  │  Abandon        │                            │  │
│  │  └─────────────────┘  └─────────────────┘                            │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  📁 MAPPING HISTORY                                        [Filter ▼]      │
│                                                                             │
│  🔍 Search mappings...                                                      │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 🎃 │ Halloween Pack 2024                                  Jan 15, 2026│  │
│  │    │ → RonHoward_2024.xml                                             │  │
│  │    │ 205 items · 94% coverage                      [Download] [···]   │  │
│  ├────┼──────────────────────────────────────────────────────────────────┤  │
│  │ 🎄 │ Christmas Classics                                   Dec 1, 2025│  │
│  │    │ → RonHoward_2024.xml                                             │  │
│  │    │ 189 items · 87% coverage                      [Download] [···]   │  │
│  ├────┼──────────────────────────────────────────────────────────────────┤  │
│  │ 🎆 │ July 4th Finale                                     Jun 28, 2025│  │
│  │    │ → RonHoward_2024.xml                                             │  │
│  │    │ 156 items · 91% coverage                      [Download] [···]   │  │
│  ├────┼──────────────────────────────────────────────────────────────────┤  │
│  │ 🎵 │ Custom Sequence (Other Vendor)                      Mar 10, 2025│  │
│  │    │ → RonHoward_2023.xml                                             │  │
│  │    │ 142 items · 78% coverage                      [Download] [···]   │  │
│  └────┴──────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Showing 4 of 12 mappings                              [Load More]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Component Breakdown

### 1. Stats Cards

```tsx
function ModIQStats({ stats }: { stats: UserModIQStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<FileStack className="h-5 w-5" />}
        value={stats.totalMappings}
        label="Mappings Created"
      />
      <StatCard
        icon={<Layers className="h-5 w-5" />}
        value={stats.totalItemsMapped.toLocaleString()}
        label="Items Mapped"
      />
      <StatCard
        icon={<Target className="h-5 w-5" />}
        value={`${stats.averageCoverage}%`}
        label="Avg Coverage"
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        value={formatHours(stats.estimatedTimeSaved)}
        label="Time Saved (est.)"
        tooltip="Based on ~2 min per manual mapping"
      />
    </div>
  );
}
```

### 2. Incomplete Session Card

```tsx
function IncompleteSessionCard({ session, onResume, onAbandon }: Props) {
  const progress = Math.round((session.mappedCount / session.totalItems) * 100);
  const timeAgo = formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true });
  
  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg">Incomplete Session</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{session.sequenceIcon}</span>
          <div>
            <h3 className="font-semibold">{session.sequenceName}</h3>
            <p className="text-sm text-muted-foreground">
              Layout: {session.layoutName}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{session.mappedCount} of {session.totalItems} mapped</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            Phase: {formatPhase(session.currentPhase)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {timeAgo}
          </span>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={onResume} className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Resume Mapping
          </Button>
          <Button variant="outline" onClick={onAbandon}>
            Abandon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Mapping History Table

```tsx
function MappingHistoryTable({ mappings }: { mappings: XmapFile[] }) {
  const [filter, setFilter] = useState<'all' | 'loer' | 'other'>('all');
  const [search, setSearch] = useState('');
  
  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      const matchesFilter = filter === 'all' || m.sourceType === filter;
      const matchesSearch = !search || 
        m.sequenceName.toLowerCase().includes(search.toLowerCase()) ||
        m.layoutName.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [mappings, filter, search]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Mapping History
        </h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sequences</SelectItem>
            <SelectItem value="loer">LOER Sequences</SelectItem>
            <SelectItem value="other">Other Vendor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search mappings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="border rounded-lg divide-y">
        {filteredMappings.length === 0 ? (
          <EmptyState 
            icon={<FileX className="h-12 w-12" />}
            title="No mappings found"
            description={search ? "Try a different search term" : "Create your first mapping to see it here"}
            action={
              <Button onClick={() => navigate('/tools/modiq')}>
                <Plus className="h-4 w-4 mr-2" />
                New Mapping
              </Button>
            }
          />
        ) : (
          filteredMappings.map(mapping => (
            <MappingRow key={mapping.id} mapping={mapping} />
          ))
        )}
      </div>
      
      {filteredMappings.length < mappings.length && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredMappings.length} of {mappings.length} mappings
        </p>
      )}
    </div>
  );
}
```

### 4. Individual Mapping Row

```tsx
function MappingRow({ mapping }: { mapping: XmapFile }) {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Sequence Icon */}
          <span className="text-2xl">{mapping.sequenceIcon || '🎵'}</span>
          
          <div className="space-y-1">
            {/* Sequence Name */}
            <h3 className="font-medium">{mapping.sequenceName}</h3>
            
            {/* Layout Name */}
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              {mapping.layoutName}
            </p>
            
            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {mapping.itemCount} items
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {mapping.coveragePercent}% coverage
              </span>
              {mapping.sourceType === 'other' && (
                <Badge variant="outline" className="text-[10px]">
                  Other Vendor
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Date */}
          <span className="text-sm text-muted-foreground">
            {formatDate(mapping.createdAt)}
          </span>
          
          {/* Download Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => downloadXmap(mapping.id)}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          
          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowDetails(true)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadXmap(mapping.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download .xmap
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => remapNewLayout(mapping.sessionId)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-map with New Layout
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicateMapping(mapping.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => confirmDelete(mapping.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Expandable Details */}
      {showDetails && (
        <MappingDetails mapping={mapping} onClose={() => setShowDetails(false)} />
      )}
    </div>
  );
}
```

### 5. Mapping Details Modal

```tsx
function MappingDetails({ mapping, onClose }: Props) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{mapping.sequenceIcon}</span>
            {mapping.sequenceName}
          </DialogTitle>
          <DialogDescription>
            Mapped to {mapping.layoutName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{mapping.itemCount}</div>
              <div className="text-sm text-muted-foreground">Items Mapped</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{mapping.coveragePercent}%</div>
              <div className="text-sm text-muted-foreground">Coverage</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{formatDate(mapping.createdAt)}</div>
              <div className="text-sm text-muted-foreground">Created</div>
            </div>
          </div>
          
          {/* Breakdown by Type */}
          <div>
            <h4 className="font-medium mb-3">Mapping Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Model Groups</span>
                <span className="font-medium">{mapping.stats.groups}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Models</span>
                <span className="font-medium">{mapping.stats.models}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Submodel Groups</span>
                <span className="font-medium">{mapping.stats.submodelGroups}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-sm">Skipped</span>
                <span className="font-medium">{mapping.stats.skipped}</span>
              </div>
            </div>
          </div>
          
          {/* Confidence Distribution */}
          <div>
            <h4 className="font-medium mb-3">Confidence Distribution</h4>
            <div className="h-4 rounded-full overflow-hidden flex">
              <div 
                className="bg-green-500" 
                style={{ width: `${mapping.stats.greenPercent}%` }}
                title={`${mapping.stats.greenCount} high confidence (90%+)`}
              />
              <div 
                className="bg-yellow-500" 
                style={{ width: `${mapping.stats.yellowPercent}%` }}
                title={`${mapping.stats.yellowCount} medium confidence (70-89%)`}
              />
              <div 
                className="bg-gray-300" 
                style={{ width: `${mapping.stats.manualPercent}%` }}
                title={`${mapping.stats.manualCount} manually mapped`}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>🟢 {mapping.stats.greenCount} high</span>
              <span>🟡 {mapping.stats.yellowCount} medium</span>
              <span>⚪ {mapping.stats.manualCount} manual</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => downloadXmap(mapping.id)}>
            <Download className="h-4 w-4 mr-2" />
            Download .xmap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. Empty State

```tsx
function EmptyModIQState() {
  return (
    <Card className="p-12 text-center">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Welcome to ModIQ!</h3>
        <p className="text-muted-foreground">
          You haven't created any mappings yet. ModIQ uses AI to map your xLights 
          layout to purchased sequences in seconds.
        </p>
        <Button onClick={() => navigate('/tools/modiq')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Mapping
        </Button>
      </div>
    </Card>
  );
}
```

## 📱 Mobile Responsive Design

```
┌─────────────────────────────────┐
│  < Back    ModIQ                │
├─────────────────────────────────┤
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │   12    │  │  2,847  │      │
│  │Mappings │  │ Items   │      │
│  └─────────┘  └─────────┘      │
│  ┌─────────┐  ┌─────────┐      │
│  │   89%   │  │  4.2hrs │      │
│  │Avg Cov. │  │ Saved   │      │
│  └─────────┘  └─────────┘      │
│                                 │
│  ⚠️ Incomplete Session          │
│  ┌─────────────────────────────┐│
│  │ 🎃 Halloween Pack 2024      ││
│  │ ████████████░░░░ 69%        ││
│  │ [Resume]  [Abandon]         ││
│  └─────────────────────────────┘│
│                                 │
│  📁 Mapping History             │
│  🔍 Search...        [Filter ▼]│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🎃 Halloween Pack 2024      ││
│  │ → RonHoward_2024.xml        ││
│  │ 205 items · 94%  [Download] ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🎄 Christmas Classics       ││
│  │ → RonHoward_2024.xml        ││
│  │ 189 items · 87%  [Download] ││
│  └─────────────────────────────┘│
│                                 │
└─────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Navigation:
- [ ] "ModIQ" item in account sidebar navigation
- [ ] Breadcrumb shows "My Account > ModIQ"
- [ ] "+ New Mapping" button prominently placed

### Stats Section:
- [ ] Shows total mappings created
- [ ] Shows total items mapped
- [ ] Shows average coverage percentage
- [ ] Shows estimated time saved
- [ ] Stats update after each completed mapping

### Incomplete Session:
- [ ] Prominently displayed if exists
- [ ] Shows sequence name, layout name, progress
- [ ] Progress bar visualization
- [ ] "Resume" navigates to correct phase
- [ ] "Abandon" confirms then deletes session
- [ ] Only one incomplete session at a time

### Mapping History:
- [ ] Lists all completed mappings
- [ ] Shows sequence icon, name, layout, date
- [ ] Shows item count and coverage %
- [ ] Filter by source (All/LOER/Other Vendor)
- [ ] Search by sequence or layout name
- [ ] Pagination or "Load More" for long lists
- [ ] Sort by date (newest first)

### Mapping Row Actions:
- [ ] Download .xmap (primary action)
- [ ] View Details (modal with full stats)
- [ ] Re-map with New Layout
- [ ] Duplicate
- [ ] Delete (with confirmation)

### Mapping Details Modal:
- [ ] Summary stats (items, coverage, date)
- [ ] Breakdown by type (groups, models, submodel groups)
- [ ] Confidence distribution visualization
- [ ] Download button

### Empty State:
- [ ] Friendly message for new users
- [ ] Clear CTA to create first mapping

### Mobile:
- [ ] Responsive grid for stats
- [ ] Stacked card layout
- [ ] Touch-friendly buttons
- [ ] Collapsible actions menu

## 🧪 Test Cases

1. **First visit**: New user sees empty state with CTA
2. **Stats display**: Stats reflect actual user data
3. **Incomplete session**: Banner shows when session exists
4. **Resume flow**: Click Resume → lands in ModIQ at correct phase
5. **Abandon flow**: Click Abandon → confirm → session deleted
6. **Search**: Type sequence name → filters list
7. **Filter**: Select "LOER Only" → shows only LOER mappings
8. **Download**: Click Download → xmap file downloads
9. **View details**: Click View Details → modal opens with full stats
10. **Delete**: Click Delete → confirm → mapping removed from list
11. **Mobile**: All features work on mobile viewport

## 🏷️ Labels
- Priority: **MEDIUM**
- Type: Feature (UI/UX)
- Phase: Account
- Effort: Medium (4-5 hours)
- Dependencies: Ticket 27 (backend/storage)
