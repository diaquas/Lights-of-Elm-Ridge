# Ticket 25: ModIQ Landing Page Redesign

## 🎯 Objective
Redesign the ModIQ landing page to:
1. Make Lights of Elm Ridge the obvious/default choice (home field advantage)
2. Simplify the confusing upload workflow
3. Create a more visual, card-based approach
4. Elevate the "How It Works" section

## 📋 Current Problems

### Issue 1: LOER Doesn't Feel Like Home
- Both options (LOER vs Other Vendor) have equal visual weight
- Should scream "this is a Lights of Elm Ridge tool"
- LOER option should be the prominent, obvious path

### Issue 2: Other Vendor Flow is Clunky
Current flow:
1. Click "Other Vendor" radio → auto upload dialog appears (jarring)
2. Upload vendor's rgbeffects.xml
3. NEW drop zone appears for .xsq file
4. Then still need to upload YOUR layout

**3 separate uploads, confusing sequence, things appearing/disappearing**

### Issue 3: "How It Works" Gets Lost
- Nice 3-panel section but buried at bottom
- Should be more prominent or integrated into flow

## 🔧 Proposed Redesign

### New Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                              Mod'IQ                                         │
│                                                                             │
│           Upload your xLights layout, pick a sequence, and get             │
│              a mapping file in seconds — not hours.                         │
│                                                                             │
│                         by Lights of Elm Ridge                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌─────────────────────────────┐      ┌─────────────────────────┐       │
│     │    ★ RECOMMENDED ★          │      │                         │       │
│     │                             │      │      Other Vendor       │       │
│     │    [LOER LOGO]              │      │                         │       │
│     │                             │      │      ┌───┐              │       │
│     │  Lights of Elm Ridge        │      │      │ ? │              │       │
│     │      Sequences              │      │      └───┘              │       │
│     │                             │      │                         │       │
│     │  "Access your purchased     │      │  "Map from any vendor's │       │
│     │   sequences instantly"      │      │   sequence file"        │       │
│     │                             │      │                         │       │
│     │    [SELECT THIS]            │      │     [Select]            │       │
│     │                             │      │                         │       │
│     └─────────────────────────────┘      └─────────────────────────┘       │
│              ↑ LARGER                           ↑ SMALLER                   │
│              ↑ BRANDED                          ↑ SUBTLE                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          How It Works                                       │
│     ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                │
│     │ ① Select &    │  │ ② AI          │  │ ③ Download &  │                │
│     │    Upload     │  │    Matching   │  │    Import     │                │
│     └───────────────┘  └───────────────┘  └───────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### LOER Flow (Streamlined)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 1 of 2                                              [← Back to Start] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    Choose Your Sequence                                     │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  YOUR PURCHASED SEQUENCES                                        │    │
│     │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │    │
│     │  │ 🎃          │ │ 🎄          │ │ 🎆          │ │ 🎵        │  │    │
│     │  │ Halloween   │ │ Christmas   │ │ July 4th   │ │ Song 4    │  │    │
│     │  │ Pack 2024   │ │ Classics    │ │ Finale     │ │           │  │    │
│     │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘  │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │  FREE SEQUENCES                                                  │    │
│     │  ┌─────────────┐ ┌─────────────┐                                │    │
│     │  │ 🆓          │ │ 🆓          │                                │    │
│     │  │ Demo Pack   │ │ Starter     │                                │    │
│     │  └─────────────┘ └─────────────┘                                │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Step 2 of 2                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    Upload YOUR Layout                                       │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                  │    │
│     │              📁 Drop your xlights_rgbeffects.xml                │    │
│     │                    or click to browse                            │    │
│     │                                                                  │    │
│     │              Found in your xLights show folder                   │    │
│     │                                                                  │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                         [ModIQ It! →]                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Other Vendor Flow (Simplified Wizard)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Other Vendor • Step 1 of 3                               [← Back to Start] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              Upload the VENDOR'S Sequence Files                             │
│                                                                             │
│     These are the files from the sequence you purchased                     │
│                                                                             │
│     ┌──────────────────────────────┐  ┌──────────────────────────────┐     │
│     │                              │  │                              │     │
│     │  📄 Vendor's Layout          │  │  🎵 Vendor's Sequence        │     │
│     │                              │  │                              │     │
│     │  xlights_rgbeffects.xml      │  │  sequence.xsq                │     │
│     │                              │  │                              │     │
│     │  [Drop or Click]             │  │  [Drop or Click]             │     │
│     │                              │  │                              │     │
│     │  ○ Not uploaded              │  │  ○ Not uploaded              │     │
│     │                              │  │                              │     │
│     └──────────────────────────────┘  └──────────────────────────────┘     │
│                                                                             │
│     💡 Both files should be in the sequence package you downloaded          │
│                                                                             │
│                              [Next →]                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Other Vendor • Step 2 of 3                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    Upload YOUR Layout                                       │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────┐    │
│     │                                                                  │    │
│     │              📁 Drop your xlights_rgbeffects.xml                │    │
│     │                    or click to browse                            │    │
│     │                                                                  │    │
│     └─────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│                         [ModIQ It! →]                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation

### 1. Source Selection Cards

```tsx
function SourceSelection({ onSelect }: { onSelect: (source: 'loer' | 'other') => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {/* LOER Card - PROMINENT */}
      <Card 
        className="relative cursor-pointer border-2 border-primary bg-primary/5 
                   hover:bg-primary/10 transition-all hover:scale-[1.02]"
        onClick={() => onSelect('loer')}
      >
        {/* Recommended Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            ★ RECOMMENDED
          </Badge>
        </div>
        
        <CardContent className="p-8 text-center">
          {/* LOER Logo */}
          <div className="mb-4">
            <img 
              src="/loer-logo.svg" 
              alt="Lights of Elm Ridge" 
              className="h-16 mx-auto"
            />
          </div>
          
          <h3 className="text-xl font-bold mb-2">
            Lights of Elm Ridge Sequences
          </h3>
          
          <p className="text-muted-foreground mb-6">
            Access your purchased sequences instantly. 
            One-click mapping with optimized results.
          </p>
          
          <Button size="lg" className="w-full">
            Select Sequence →
          </Button>
        </CardContent>
      </Card>
      
      {/* Other Vendor Card - SUBTLE */}
      <Card 
        className="cursor-pointer border hover:border-muted-foreground/50 
                   transition-all hover:bg-muted/30"
        onClick={() => onSelect('other')}
      >
        <CardContent className="p-8 text-center">
          {/* Generic Icon */}
          <div className="mb-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-muted 
                          flex items-center justify-center">
              <FileCode className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          
          <h3 className="text-lg font-medium mb-2 text-muted-foreground">
            Other Vendor
          </h3>
          
          <p className="text-sm text-muted-foreground mb-6">
            Map from any vendor's sequence files. 
            Requires uploading their layout + sequence.
          </p>
          
          <Button variant="outline" size="lg" className="w-full">
            Upload Files →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. LOER Sequence Picker

```tsx
function LOERSequencePicker({ 
  purchasedSequences, 
  freeSequences,
  onSelect 
}: SequencePickerProps) {
  return (
    <div className="space-y-8">
      {/* Purchased Sequences */}
      {purchasedSequences.length > 0 && (
        <section>
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Purchased Sequences
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {purchasedSequences.map(seq => (
              <SequenceCard key={seq.id} sequence={seq} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}
      
      {/* Free Sequences */}
      <section>
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Free Sequences
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {freeSequences.map(seq => (
            <SequenceCard key={seq.id} sequence={seq} onSelect={onSelect} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SequenceCard({ sequence, onSelect }) {
  return (
    <Card 
      className="cursor-pointer hover:border-primary transition-all"
      onClick={() => onSelect(sequence)}
    >
      <CardContent className="p-4 text-center">
        <div className="text-3xl mb-2">{sequence.icon}</div>
        <h4 className="font-medium text-sm">{sequence.name}</h4>
        {sequence.isFree && (
          <Badge variant="secondary" className="mt-2">FREE</Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3. Other Vendor Upload Wizard

```tsx
function OtherVendorWizard({ onComplete }: { onComplete: (files: VendorFiles) => void }) {
  const [step, setStep] = useState(1);
  const [vendorLayout, setVendorLayout] = useState<File | null>(null);
  const [vendorSequence, setVendorSequence] = useState<File | null>(null);
  const [userLayout, setUserLayout] = useState<File | null>(null);
  
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span>Step {step} of 2</span>
          <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
            ← Back to Start
          </Button>
        </div>
        <Progress value={step * 50} />
      </div>
      
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Upload the Vendor's Sequence Files
            </h2>
            <p className="text-muted-foreground">
              These are the files from the sequence you purchased
            </p>
          </div>
          
          {/* Side-by-side upload zones */}
          <div className="grid grid-cols-2 gap-6">
            <FileUploadZone
              label="Vendor's Layout"
              description="xlights_rgbeffects.xml"
              accept=".xml"
              file={vendorLayout}
              onUpload={setVendorLayout}
              icon={<FileCode className="h-8 w-8" />}
            />
            
            <FileUploadZone
              label="Vendor's Sequence"
              description=".xsq file"
              accept=".xsq"
              file={vendorSequence}
              onUpload={setVendorSequence}
              icon={<Music className="h-8 w-8" />}
            />
          </div>
          
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Both files should be in the sequence package you downloaded from the vendor.
            </AlertDescription>
          </Alert>
          
          <Button 
            className="w-full" 
            size="lg"
            disabled={!vendorLayout || !vendorSequence}
            onClick={() => setStep(2)}
          >
            Next →
          </Button>
        </div>
      )}
      
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Upload YOUR Layout
            </h2>
            <p className="text-muted-foreground">
              This is your xlights_rgbeffects.xml from your show folder
            </p>
          </div>
          
          <FileUploadZone
            label="Your Layout"
            description="xlights_rgbeffects.xml"
            accept=".xml"
            file={userLayout}
            onUpload={setUserLayout}
            icon={<Home className="h-8 w-8" />}
            className="max-w-md mx-auto"
          />
          
          <Button 
            className="w-full max-w-md mx-auto" 
            size="lg"
            disabled={!userLayout}
            onClick={() => onComplete({ vendorLayout, vendorSequence, userLayout })}
          >
            ModIQ It! →
          </Button>
        </div>
      )}
    </div>
  );
}
```

### 4. Elevated "How It Works"

```tsx
function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: "Select & Upload",
      description: "Pick the sequence you purchased and upload your xlights_rgbeffects.xml file from your show folder.",
      icon: <Upload className="h-6 w-6" />,
    },
    {
      number: 2,
      title: "AI Matching",
      description: "ModIQ analyzes model types, pixel counts, spatial positions, names, and submodel structures to find the best mapping.",
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      number: 3,
      title: "Download & Import",
      description: "Get a .xmap file that imports directly into xLights' mapping dialog. Tweak only the low-confidence matches.",
      icon: <Download className="h-6 w-6" />,
    },
  ];
  
  return (
    <section className="py-12 bg-muted/30 rounded-xl">
      <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-6">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
            )}
            
            <Card className="text-center relative bg-background">
              {/* Step number badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground 
                              flex items-center justify-center font-bold">
                  {step.number}
                </div>
              </div>
              
              <CardContent className="pt-8 pb-6">
                <div className="mb-3 text-primary">{step.icon}</div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
```

## 📐 Page Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [LOER Logo]                    Home  Sequences  The Show  About  [Tools]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              Mod'IQ                                         │
│                           (Hero Section)                                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    [LOER Card]        [Other Vendor Card]                   │
│                    (Prominent)           (Subtle)                           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          How It Works                                       │
│                    [1] ───── [2] ───── [3]                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              "Your files are processed locally in your browser              │
│                    and never uploaded to any server"                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Source Selection:
- [ ] LOER card is visually prominent (larger, branded, "Recommended" badge)
- [ ] Other Vendor card is subtle (smaller, muted colors, generic icon)
- [ ] Clicking either card advances to appropriate flow
- [ ] LOER logo prominently displayed on LOER card

### LOER Flow:
- [ ] Shows purchased sequences as visual cards
- [ ] Shows free sequences separately
- [ ] Single upload zone for user's layout
- [ ] Clean 2-step flow (pick sequence → upload layout)

### Other Vendor Flow:
- [ ] Clear step indicator (Step 1 of 2, Step 2 of 2)
- [ ] Step 1: Side-by-side upload for vendor's XML + XSQ
- [ ] Step 2: Upload user's layout
- [ ] Helpful hint about where to find vendor files
- [ ] No auto-popup dialogs

### How It Works:
- [ ] Prominently displayed (not buried)
- [ ] Visual step numbers with connecting lines
- [ ] Clear, concise descriptions
- [ ] Icons for each step

### General:
- [ ] Privacy note visible ("files processed locally")
- [ ] Back navigation at each step
- [ ] Mobile responsive
- [ ] Consistent with site branding

## 🧪 Test Cases

1. **LOER happy path**: Select LOER → pick sequence → upload layout → ModIQ It
2. **Other Vendor path**: Select Other → upload both vendor files → upload layout → ModIQ It
3. **Back navigation**: Can go back at any step
4. **Missing files**: Button disabled until required files uploaded
5. **Mobile**: Cards stack vertically, still usable

## 🏷️ Labels
- Priority: **HIGH**
- Type: UX Redesign
- Phase: Landing/Upload
- Effort: High (5-6 hours)
