# Ticket 27: Save States & Session Recovery (with User Accounts)

## 🎯 Objective
Implement user account-based save states so users can:
1. Resume incomplete mapping sessions
2. Access their mapping history and download previous .xmap files
3. Never lose progress (cloud-synced)

## 📋 Why Require Login?

| Benefit | Description |
|---------|-------------|
| **Session Recovery** | Resume from any device, not just same browser |
| **xmap Archive** | All generated xmap files saved to their account |
| **Cross-Device** | Start on desktop, finish on laptop |
| **No localStorage Limits** | Cloud storage instead of browser limits |
| **Analytics** | Understand usage patterns, improve matching |
| **Future Features** | Favorites, preferences, sharing mappings |

## 🔧 Features

### 1. Login Required for ModIQ
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Mod:IQ                                         │
│                                                                             │
│           Upload your xLights layout, pick a sequence, and get             │
│              a mapping file in seconds — not hours.                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │   🔐 Sign in to use ModIQ                                            │  │
│  │                                                                       │  │
│  │   ModIQ requires an account to:                                       │  │
│  │   • Save your progress automatically                                  │  │
│  │   • Store your mapping files for future downloads                     │  │
│  │   • Resume sessions from any device                                   │  │
│  │                                                                       │  │
│  │   ┌─────────────────────┐  ┌─────────────────────┐                   │  │
│  │   │      Sign In        │  │   Create Account    │                   │  │
│  │   └─────────────────────┘  └─────────────────────┘                   │  │
│  │                                                                       │  │
│  │   Already have a Lights of Elm Ridge account? Same login works!      │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Auto-Save to Cloud (Every Action)
Save state automatically after every meaningful action:
- Auto-match acceptance/rejection
- Manual match made
- Item skipped
- Phase completed

### 3. Session Recovery on Return
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  👋 Welcome back, Ron!                                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📂 INCOMPLETE SESSION                                              │   │
│  │                                                                      │   │
│  │  Sequence: Halloween Pack 2024                                       │   │
│  │  Layout: RonHoward_2024.xml                                          │   │
│  │  Progress: 142 of 205 mapped (69%)                                   │   │
│  │  Phase: Models                                                       │   │
│  │  Last saved: 2 hours ago                                             │   │
│  │                                                                      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                           │   │
│  │  │  Resume Session │  │  Start Fresh    │                           │   │
│  │  └─────────────────┘  └─────────────────┘                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📁 YOUR MAPPING HISTORY                                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Halloween Pack 2024 → RonHoward_2024.xml                           │   │
│  │  Created: Jan 15, 2026 · 205 items · 94% coverage                    │   │
│  │  [Download .xmap]                                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Christmas Classics → RonHoward_2024.xml                            │   │
│  │  Created: Dec 1, 2025 · 189 items · 87% coverage                     │   │
│  │  [Download .xmap]                                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  July 4th Finale → RonHoward_2024.xml                               │   │
│  │  Created: Jun 28, 2025 · 156 items · 91% coverage                    │   │
│  │  [Download .xmap]                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. Mapping History Page
Dedicated page to view/download all past mappings:
```
/account/mappings

┌─────────────────────────────────────────────────────────────────────────────┐
│  My Mapping Files                                           [+ New Mapping] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔍 Search mappings...                     Filter: [All Sequences ▼]       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🎃 Halloween Pack 2024                                              │   │
│  │                                                                      │   │
│  │ Layout: RonHoward_2024.xml                                           │   │
│  │ Created: Jan 15, 2026 at 3:42 PM                                     │   │
│  │ Items: 205 mapped · Coverage: 94%                                    │   │
│  │                                                                      │   │
│  │ [Download .xmap]  [View Details]  [Re-map with New Layout]  [Delete] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🎄 Christmas Classics                                               │   │
│  │                                                                      │   │
│  │ Layout: RonHoward_2024.xml                                           │   │
│  │ Created: Dec 1, 2025 at 10:15 AM                                     │   │
│  │ Items: 189 mapped · Coverage: 87%                                    │   │
│  │                                                                      │   │
│  │ [Download .xmap]  [View Details]  [Re-map with New Layout]  [Delete] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation

### 1. Database Schema

```sql
-- Mapping Sessions (in-progress and completed)
CREATE TABLE mapping_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  
  -- Source info
  source_type VARCHAR(10) NOT NULL, -- 'loer' or 'other'
  sequence_id UUID REFERENCES sequences(id), -- For LOER sequences
  sequence_name VARCHAR(255), -- Display name
  
  -- User's layout info (don't store the actual file, just metadata)
  user_layout_name VARCHAR(255) NOT NULL,
  user_layout_hash VARCHAR(64), -- SHA-256 to detect changes
  
  -- Progress
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  current_phase VARCHAR(20),
  
  -- Stats
  total_items INT,
  mapped_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  coverage_percent DECIMAL(5,2),
  
  -- State (JSONB for flexibility)
  mapping_state JSONB, -- Full state for resume
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Generated xmap files
CREATE TABLE xmap_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES mapping_sessions(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  
  -- File info
  filename VARCHAR(255) NOT NULL,
  file_size INT,
  file_content TEXT, -- xmap files are small, store as text
  
  -- Metadata
  sequence_name VARCHAR(255),
  layout_name VARCHAR(255),
  item_count INT,
  coverage_percent DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for quick lookup
  INDEX idx_xmap_user (user_id),
  INDEX idx_xmap_session (session_id)
);

-- Index for finding user's sessions
CREATE INDEX idx_sessions_user ON mapping_sessions(user_id, updated_at DESC);
```

### 2. API Endpoints

```typescript
// Session Management
POST   /api/modiq/sessions              // Create new session
GET    /api/modiq/sessions/current      // Get current in-progress session
PUT    /api/modiq/sessions/:id          // Update session state (auto-save)
DELETE /api/modiq/sessions/:id          // Abandon session

// xmap Files
GET    /api/modiq/xmaps                 // List user's xmap files
GET    /api/modiq/xmaps/:id             // Get specific xmap file
GET    /api/modiq/xmaps/:id/download    // Download xmap file
DELETE /api/modiq/xmaps/:id             // Delete xmap file

// Convenience
GET    /api/modiq/history               // Combined: sessions + xmaps
```

### 3. Auto-Save Hook (Cloud Version)

```typescript
function useCloudAutoSave(session: MappingSession) {
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>();
  
  const debouncedSave = useCallback(async (newSession: MappingSession) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce 1 second for cloud saves (more expensive than localStorage)
    saveTimeoutRef.current = setTimeout(async () => {
      const stateHash = hashState(newSession);
      
      // Don't save if nothing changed
      if (stateHash === lastSavedRef.current) return;
      
      try {
        await fetch(`/api/modiq/sessions/${newSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_phase: newSession.currentPhase,
            mapped_count: newSession.stats.mappedCount,
            skipped_count: newSession.stats.skippedCount,
            mapping_state: newSession.mappings,
          }),
        });
        
        lastSavedRef.current = stateHash;
        console.log('Session saved to cloud');
      } catch (error) {
        console.error('Failed to save session:', error);
        // Fall back to localStorage
        localStorage.setItem('modiq_backup', JSON.stringify(newSession));
      }
    }, 1000);
  }, []);
  
  useEffect(() => {
    if (session && user) {
      debouncedSave(session);
    }
  }, [session, user, debouncedSave]);
}
```

### 4. xmap Storage on Complete

```typescript
async function completeMapping(session: MappingSession, xmapContent: string) {
  // Generate filename
  const filename = `${session.source.sequenceName}_to_${session.source.userLayoutName}.xmap`
    .replace(/[^a-zA-Z0-9_.-]/g, '_');
  
  // Save xmap file to database
  await fetch('/api/modiq/xmaps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: session.id,
      filename,
      file_content: xmapContent,
      sequence_name: session.source.sequenceName,
      layout_name: session.source.userLayoutName,
      item_count: session.stats.mappedCount,
      coverage_percent: session.stats.coveragePercent,
    }),
  });
  
  // Mark session as completed
  await fetch(`/api/modiq/sessions/${session.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }),
  });
  
  // Return download URL
  return `/api/modiq/xmaps/${xmapId}/download`;
}
```

### 5. Mapping History Component

```tsx
function MappingHistory() {
  const { data: history, isLoading } = useQuery(['mapping-history'], 
    () => fetch('/api/modiq/history').then(r => r.json())
  );
  
  if (isLoading) return <Skeleton />;
  
  return (
    <div className="space-y-6">
      {/* Incomplete Session Banner */}
      {history.incompleteSession && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Incomplete Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionSummary session={history.incompleteSession} />
            <div className="flex gap-2 mt-4">
              <Button onClick={() => resumeSession(history.incompleteSession.id)}>
                Resume Session
              </Button>
              <Button variant="outline" onClick={() => abandonSession(history.incompleteSession.id)}>
                Start Fresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Completed Mappings */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Mapping Files</h2>
        <div className="space-y-3">
          {history.xmaps.map(xmap => (
            <XmapCard key={xmap.id} xmap={xmap} />
          ))}
        </div>
      </div>
    </div>
  );
}

function XmapCard({ xmap }: { xmap: XmapFile }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{xmap.sequence_name}</h3>
            <p className="text-sm text-muted-foreground">
              Layout: {xmap.layout_name}
            </p>
            <p className="text-sm text-muted-foreground">
              {xmap.item_count} items · {xmap.coverage_percent}% coverage
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Created {formatDate(xmap.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => downloadXmap(xmap.id)}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => viewDetails(xmap.id)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => remapWithNewLayout(xmap.session_id)}>
                  Re-map with New Layout
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => deleteXmap(xmap.id)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 📐 User Flow

```
User visits ModIQ
        │
        ▼
┌─────────────────┐
│  Logged in?     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   No        Yes
    │         │
    ▼         ▼
┌─────────┐  ┌──────────────────┐
│ Login   │  │ Check for        │
│ Screen  │  │ incomplete       │
└────┬────┘  │ session          │
     │       └────────┬─────────┘
     │                │
     │           ┌────┴────┐
     │           │         │
     │          Yes        No
     │           │         │
     │           ▼         ▼
     │    ┌───────────┐  ┌───────────┐
     │    │ Show      │  │ Show      │
     │    │ Resume    │  │ History + │
     │    │ Dialog    │  │ New       │
     │    └───────────┘  └───────────┘
     │
     └──────► Landing Page (after login)
```

## ✅ Acceptance Criteria

### Authentication:
- [ ] ModIQ requires login to use
- [ ] Uses existing LOER account system
- [ ] Clear messaging about why login is required
- [ ] Guest preview? (can see UI but not save/export)

### Cloud Save:
- [ ] Session saved after every action (debounced 1s)
- [ ] Saves to database, not localStorage
- [ ] Falls back to localStorage if cloud save fails
- [ ] Shows save status indicator

### Session Recovery:
- [ ] On login, check for incomplete session
- [ ] Show resume dialog with session details
- [ ] "Resume" loads session and continues
- [ ] "Start Fresh" abandons old session

### xmap Archive:
- [ ] xmap file saved to database on export
- [ ] Mapping history page lists all xmaps
- [ ] Can download any previous xmap
- [ ] Can delete old xmaps
- [ ] Shows metadata (date, coverage, item count)

### Future Features:
- [ ] "Re-map with new layout" (copy settings, new layout)
- [ ] Share mapping with another user?
- [ ] Export all mappings as zip?

## 🧪 Test Cases

1. **Login required**: Visit ModIQ logged out → see login prompt
2. **New user**: First time → no history, start fresh
3. **Incomplete session**: Close mid-mapping → return → see resume dialog
4. **Resume**: Click Resume → lands on correct phase with state intact
5. **Start Fresh**: Click Start Fresh → old session abandoned
6. **xmap saved**: Complete mapping → xmap appears in history
7. **Download**: Click download → file downloads correctly
8. **Delete**: Delete xmap → removed from history
9. **Cross-device**: Start on desktop → resume on laptop (same account)

## 💾 Storage Estimates

xmap files are typically small:
- Average xmap: 5-20 KB
- Heavy user (50 mappings): ~1 MB total
- Storage cost: negligible

## 🏷️ Labels
- Priority: **MEDIUM-HIGH**
- Type: Feature
- Phase: All
- Effort: High (6-8 hours)
- Dependencies: User authentication system

## 🔧 Implementation

### 1. State Shape

```typescript
interface MappingSession {
  // Metadata
  id: string;
  createdAt: string;
  updatedAt: string;
  version: number; // For migration compatibility
  
  // Source files (store names/hashes, not full content)
  source: {
    type: 'loer' | 'other';
    sequenceName?: string;
    sequenceId?: string;
    vendorLayoutHash?: string;
    vendorSequenceHash?: string;
    userLayoutHash?: string;
    userLayoutName: string;
  };
  
  // Progress
  currentPhase: 'auto-match' | 'groups' | 'models' | 'high-density' | 'review';
  
  // Mappings
  mappings: {
    autoMatches: AutoMatchState[];
    groups: MappingState[];
    models: MappingState[];
    submodelGroups: MappingState[];
  };
  
  // Statistics
  stats: {
    totalItems: number;
    mappedCount: number;
    skippedCount: number;
  };
}

interface AutoMatchState {
  userItem: string;
  sequenceItem: string;
  confidence: number;
  type: EntityType;
  accepted: boolean;
}

interface MappingState {
  userItem: string;
  sequenceItem: string | null;
  status: 'unmapped' | 'mapped' | 'skipped';
  confidence?: number;
  mappedAt?: string;
}
```

### 2. Storage Service

```typescript
const STORAGE_KEY = 'modiq_session';
const SESSION_VERSION = 1;

class SessionStorage {
  // Save to localStorage
  save(session: MappingSession): void {
    const data = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  
  // Load from localStorage
  load(): MappingSession | null {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    try {
      const session = JSON.parse(data) as MappingSession;
      
      // Version migration if needed
      if (session.version < SESSION_VERSION) {
        return this.migrate(session);
      }
      
      return session;
    } catch (e) {
      console.error('Failed to parse saved session:', e);
      return null;
    }
  }
  
  // Check if session exists
  hasSession(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
  
  // Clear saved session
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
  
  // Get session summary without full load
  getSummary(): SessionSummary | null {
    const session = this.load();
    if (!session) return null;
    
    return {
      sequenceName: session.source.sequenceName || 'Other Vendor Sequence',
      layoutName: session.source.userLayoutName,
      progress: session.stats.mappedCount,
      total: session.stats.totalItems,
      percentage: Math.round((session.stats.mappedCount / session.stats.totalItems) * 100),
      currentPhase: session.currentPhase,
      lastSaved: session.updatedAt,
    };
  }
  
  // Migrate old session format to new
  private migrate(session: MappingSession): MappingSession {
    // Handle version migrations here
    return { ...session, version: SESSION_VERSION };
  }
}

export const sessionStorage = new SessionStorage();
```

### 3. Auto-Save Hook

```typescript
function useAutoSave(session: MappingSession) {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Debounced save (300ms after last change)
  const debouncedSave = useCallback((newSession: MappingSession) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      sessionStorage.save(newSession);
      console.log('Session auto-saved');
    }, 300);
  }, []);
  
  // Save on every session change
  useEffect(() => {
    debouncedSave(session);
  }, [session, debouncedSave]);
  
  // Save immediately on unmount/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.save(session);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);
}
```

### 4. Recovery Dialog Component

```tsx
function SessionRecoveryDialog({ 
  summary, 
  onResume, 
  onStartFresh 
}: SessionRecoveryProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  const timeAgo = formatDistanceToNow(new Date(summary.lastSaved), { 
    addSuffix: true 
  });
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Resume Previous Session?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We found an incomplete mapping session:
          </p>
          
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sequence</span>
                <span className="font-medium">{summary.sequenceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Layout</span>
                <span className="font-medium truncate max-w-[200px]">
                  {summary.layoutName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {summary.progress} of {summary.total} ({summary.percentage}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phase</span>
                <Badge variant="outline">{summary.currentPhase}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last saved</span>
                <span className="text-sm">{timeAgo}</span>
              </div>
              
              {/* Progress bar */}
              <Progress value={summary.percentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              sessionStorage.clear();
              onStartFresh();
              setIsOpen(false);
            }}
          >
            Start Fresh
          </Button>
          <Button 
            onClick={() => {
              onResume();
              setIsOpen(false);
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Resume Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Integration with Main App

```tsx
function ModIQApp() {
  const [session, setSession] = useState<MappingSession | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  
  // Check for saved session on mount
  useEffect(() => {
    const summary = sessionStorage.getSummary();
    if (summary) {
      setSessionSummary(summary);
      setShowRecovery(true);
    }
  }, []);
  
  // Auto-save current session
  useAutoSave(session);
  
  const handleResume = () => {
    const savedSession = sessionStorage.load();
    if (savedSession) {
      setSession(savedSession);
      // Navigate to saved phase
      navigateToPhase(savedSession.currentPhase);
    }
  };
  
  const handleStartFresh = () => {
    sessionStorage.clear();
    setSession(null);
  };
  
  const handleComplete = () => {
    // Clear session when mapping is complete and exported
    sessionStorage.clear();
  };
  
  return (
    <>
      {showRecovery && sessionSummary && (
        <SessionRecoveryDialog
          summary={sessionSummary}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
      )}
      
      <MappingWizard 
        session={session}
        onSessionChange={setSession}
        onComplete={handleComplete}
      />
    </>
  );
}
```

### 6. Visual Indicator (Auto-Save Status)

```tsx
function AutoSaveIndicator({ lastSaved }: { lastSaved: string | null }) {
  const [status, setStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === 'saving' ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      ) : status === 'saved' ? (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span>Saved</span>
        </>
      ) : lastSaved ? (
        <>
          <Cloud className="h-3 w-3" />
          <span>Saved {formatDistanceToNow(new Date(lastSaved), { addSuffix: true })}</span>
        </>
      ) : null}
    </div>
  );
}
```

## 📐 UX Flow

```
User visits ModIQ
        │
        ▼
┌─────────────────┐
│ Check for saved │
│    session?     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   Yes        No
    │         │
    ▼         ▼
┌─────────┐  ┌─────────┐
│ Show    │  │ Normal  │
│ Recovery│  │ Landing │
│ Dialog  │  │ Page    │
└────┬────┘  └─────────┘
     │
┌────┴────┐
│         │
Resume   Start
│        Fresh
▼         │
┌─────────┐  │
│ Load    │  │
│ Session │  │
│ & Jump  │  │
│ to Phase│  │
└─────────┘  │
             ▼
        ┌─────────┐
        │ Clear   │
        │ Storage │
        └─────────┘
```

## ✅ Acceptance Criteria

### Auto-Save:
- [ ] Session saved after every match/skip/uncheck action
- [ ] Session saved when changing phases
- [ ] Session saved on browser tab close (beforeunload)
- [ ] Debounced saves (not on every keystroke)
- [ ] Visual indicator shows save status

### Recovery:
- [ ] Recovery dialog shown when saved session exists
- [ ] Shows sequence name, layout name, progress %, phase
- [ ] Shows "last saved X minutes/hours ago"
- [ ] "Resume" loads session and jumps to saved phase
- [ ] "Start Fresh" clears storage and starts over

### Data Integrity:
- [ ] Session version number for future migrations
- [ ] Graceful handling of corrupted data
- [ ] File hashes to detect if source files changed

### Cleanup:
- [ ] Session cleared after successful export
- [ ] Session cleared when user clicks "Start Fresh"
- [ ] Old sessions (>7 days?) could auto-expire

## 🧪 Test Cases

1. **Auto-save**: Make a match → close tab → reopen → recovery dialog shows
2. **Resume**: Click Resume → lands on correct phase with mappings intact
3. **Start Fresh**: Click Start Fresh → no recovery dialog, clean slate
4. **Progress accurate**: Resume shows correct mapped/total counts
5. **Phase jump**: Was on Models phase → Resume → lands on Models phase
6. **Corrupted data**: Corrupt localStorage → graceful fallback to fresh start
7. **Complete clears**: Finish mapping → export → no recovery dialog next visit

## 🔮 Future Enhancements

- **Cloud sync**: Save to user account (if logged in)
- **Multiple sessions**: Save multiple layouts, pick which to resume
- **Export/Import session**: Download session as JSON, share with others
- **Session expiry**: Auto-clear sessions older than X days
- **Conflict detection**: Warn if source files have changed since session saved

## 🏷️ Labels
- Priority: **MEDIUM-HIGH**
- Type: Feature
- Phase: All
- Effort: Medium (3-4 hours)
