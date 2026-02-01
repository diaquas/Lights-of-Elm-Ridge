export interface Sequence {
  id: number;
  slug: string;
  title: string;
  artist: string;
  price: number;
  category: "Halloween" | "Christmas";
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  longDescription: string;
  tags: string[];
  propCount: number;
  hasMatrix: boolean;
  xlightsSeqUrl: string;
  youtubeId: string | null;
  artworkUrl: string | null;
  models: string[];
  xlightsVersion: string;
  audioSource: string;
  fileFormats: string[];
  releaseDate: string;
  yearAdded: number; // Year the sequence was added to the show
}

// Get YouTube thumbnail URL from video ID
export function getThumbnailUrl(youtubeId: string | null): string | null {
  if (!youtubeId) return null;
  return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
}

export const sequences: Sequence[] = [
  {
    id: 1,
    slug: "the-dead-dance",
    title: "The Dead Dance",
    artist: "Lady Gaga",
    price: 9,
    category: "Halloween",
    duration: "3:45",
    difficulty: "Intermediate",
    description: "Fresh from the new season of Wednesday on Netflix. This sequence inter-splices the official music video with that infamous dance scene.",
    longDescription: `Fresh from the new season of Wednesday on Netflix, this sequence brings that iconic dance scene to your display.

The sequence inter-splices the official music video with that infamous dance scene, creating a dynamic visual experience that your neighbors won't forget. Your display will be serving serious Addams Family energy all season long.

**Key Features:**
- Matrix displays the music video and Wednesday dance clips
- Singing pumpkin lip-syncs to the track
- Intense strobe effects during the chorus
- Smooth transitions between video segments
- Coordinated prop movements throughout

This is one of our most requested sequences for Halloween 2025. The combination of a brand-new hit song and the cultural phenomenon of Wednesday makes this a must-have for any display looking to stay current.`,
    tags: ["Halloween", "Pop", "Netflix", "Wednesday", "2025"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/the-dead-dance-lady-gaga.1404/",
    youtubeId: "eyXwPMxZ7-E",
    artworkUrl: null,
    models: ["Matrix (70x100)", "Singing Pumpkin", "Mini Fireworks", "Showstopper Spinners", "Spiders", "Bats", "Tombstones", "Pixel Forest", "Arches"],
    xlightsVersion: "2024.20+",
    audioSource: "iTunes, Amazon Music, Spotify (download required)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2025-01",
    yearAdded: 2025,
  },
  {
    id: 2,
    slug: "shadow",
    title: "Shadow",
    artist: "Livingston",
    price: 5,
    category: "Halloween",
    duration: "3:32",
    difficulty: "Intermediate",
    description: "Vibrant colors and dynamic patterns bring the emotional journey of this song to life. A moody, atmospheric sequence.",
    longDescription: `A moody, atmospheric sequence that proves Halloween doesn't always have to be jump scares and monster mashes.

Livingston's "Shadow" is an emotional journey, and this sequence captures every beat. Vibrant colors shift and flow with the music, creating an immersive experience that draws viewers in rather than startling them.

**Key Features:**
- Smooth color transitions that follow the song's emotional arc
- Matrix displays custom visual effects synced to the music
- Subtle builds during verses, explosive during chorus
- Perfect for displays going for "atmospheric spooky" over "scary"
- Great contrast piece alongside more intense Halloween sequences

This sequence works beautifully as a "breather" in your show loop, giving viewers a moment of beauty between more intense songs.`,
    tags: ["Halloween", "Indie", "Atmospheric", "Moody"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/shadow-livingston.1242/",
    youtubeId: "GY7YOffoC_0",
    artworkUrl: null,
    models: ["Matrix (70x100)", "Singing Pumpkin", "Fireworks", "Showstopper Spinners", "Fuzion Spinner", "Pixel Forest", "Arches"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-09",
    yearAdded: 2025,
  },
  {
    id: 3,
    slug: "abracadabra",
    title: "Abracadabra",
    artist: "Lady Gaga",
    price: 5,
    category: "Halloween",
    duration: "3:45",
    difficulty: "Intermediate",
    description: "Lady Gaga's latest Halloween anthem brought to life in pixels. Magic, mystery, and a whole lot of sparkle.",
    longDescription: `Lady Gaga's "Abracadabra" is pure Halloween magic, and this sequence delivers all the sparkle and mystery you'd expect.

This isn't the Steve Miller Band classic—this is Gaga doing what Gaga does best: taking a concept and running with it. The sequence leans into the theatrical nature of the song with dramatic lighting changes, magical sparkle effects, and plenty of surprises.

**Key Features:**
- "Magic wand" effects using your spinners and fireworks
- Sparkle cascades during the chorus
- Matrix displays custom magical effects
- Dramatic blackouts and reveals
- Pumpkin lip-sync with attitude

Perfect for fans of dramatic, theatrical sequences. This one's a showstopper.`,
    tags: ["Halloween", "Pop", "Magic", "Theatrical", "2025"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/authors/diaquas.8537/",
    youtubeId: "U_h451HtYt4",
    artworkUrl: null,
    models: ["Matrix (70x100)", "Singing Pumpkin", "Fireworks", "Showstopper Spinners", "Spiders", "Bats"],
    xlightsVersion: "2024.20+",
    audioSource: "iTunes, Amazon Music, Spotify (download required)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2025-01",
    yearAdded: 2025,
  },
  {
    id: 4,
    slug: "darkside",
    title: "Darkside",
    artist: "Neoni",
    price: 5,
    category: "Halloween",
    duration: "3:31",
    difficulty: "Intermediate",
    description: "EDM meets the darkness. Heavy bass drops and atmospheric builds create an immersive Halloween experience.",
    longDescription: `Neoni's dark, cinematic style meets Halloween in this bass-heavy sequence that'll have your neighbors feeling the beat.

"Darkside" is all about atmosphere and build-up, and this sequence capitalizes on that perfectly. The verses are dark and moody, the pre-chorus builds tension, and the drops... well, the drops hit different when your entire house is pulsing with light.

**Key Features:**
- Bass-reactive effects that pulse with the music
- Dramatic builds leading to explosive drops
- Dark color palette with strategic bright accents
- Matrix displays cinematic visual effects
- Perfect for fans of dark, powerful music

This sequence proves that Halloween isn't just for rock and orchestral music. Cinematic dark pop has a place on your display, and Darkside is the perfect introduction.`,
    tags: ["Halloween", "EDM", "Electronic", "Atmospheric", "Bass"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/authors/diaquas.8537/",
    youtubeId: "2cfsWcecOlU",
    artworkUrl: null,
    models: ["Matrix (70x100)", "Singing Pumpkin", "Fireworks", "Showstopper Spinners", "Pixel Forest"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-10",
    yearAdded: 2025,
  },
  {
    id: 5,
    slug: "mary-did-you-know",
    title: "Mary Did You Know",
    artist: "Pentatonix",
    price: 9,
    category: "Christmas",
    duration: "4:12",
    difficulty: "Intermediate",
    description: "A crowd favorite with crescendos that'll give you chills. The a cappella harmonies translate beautifully to pixels.",
    longDescription: `Pentatonix's iconic a cappella arrangement of "Mary Did You Know" is one of the most requested Christmas sequences, and for good reason.

This song builds. It starts quiet and reverent, then layer by layer, voice by voice, it grows into something truly powerful. This sequence follows that journey, starting with subtle, elegant lighting and building to a full-display crescendo that will give you chills.

**Key Features:**
- Gradual build that mirrors the song's arrangement
- Each vocal part represented by different prop groups
- Powerful crescendo effects for the climax
- Reverent, elegant color palette (blues, whites, golds)
- Matrix displays subtle snowfall and star effects

This one hits different at 2am when you're testing alone in your driveway. Don't say we didn't warn you.`,
    tags: ["Christmas", "A Cappella", "Emotional", "Classic", "Powerful"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/mary-did-you-know-pentatonix.1324/",
    youtubeId: null,
    artworkUrl: "https://i1.sndcdn.com/artworks-000141128986-60zb2e-t500x500.jpg",
    models: ["Matrix (70x100)", "Pixel Forest", "Arches", "House Outlines", "Floods", "Mega Tree"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-11",
    yearAdded: 2024,
  },
  {
    id: 6,
    slug: "this-is-halloween",
    title: "This Is Halloween",
    artist: "Danny Elfman",
    price: 5,
    category: "Halloween",
    duration: "3:18",
    difficulty: "Beginner",
    description: "The Nightmare Before Christmas classic that started it all. Perfect for Halloween newbies or anyone who believes in the Pumpkin King.",
    longDescription: `The OG. The classic. The song that every Halloween display needs in their rotation.

Danny Elfman's "This Is Halloween" from The Nightmare Before Christmas is practically required listening for any Halloween light show. This sequence embraces the chaotic, carnival-like energy of the song with effects that match each character's verse.

**Key Features:**
- Character-specific effects for different verses
- Pumpkin lip-sync with dramatic expressions
- Chaotic, fun energy throughout
- Beginner-friendly effect mapping
- Easy to adapt to smaller displays

This is a great sequence for newer displayers or anyone building up their Halloween collection. The song is universally recognized, and the effects are designed to work on a variety of display sizes. Lock, Shock, and Barrel approved.`,
    tags: ["Halloween", "Classic", "Disney", "Beginner Friendly", "NBC"],
    propCount: 30,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/this-is-halloween.1175/",
    youtubeId: null,
    artworkUrl: null,
    models: ["Matrix", "Singing Pumpkin", "Mini Pumpkins", "Pixel Poles", "Tombstones", "Spiders"],
    xlightsVersion: "2024.10+",
    audioSource: "iTunes, Amazon Music (Nightmare Before Christmas Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-08",
    yearAdded: 2022,
  },
  {
    id: 7,
    slug: "carousel",
    title: "Carousel",
    artist: "Melanie Martinez",
    price: 5,
    category: "Halloween",
    duration: "3:15",
    difficulty: "Intermediate",
    description: "Subtle circus and carnival vibes throughout. You might recognize this from American Horror Story: Freak Show promos.",
    longDescription: `Melanie Martinez's "Carousel" is the perfect blend of creepy and cute—exactly the vibe that made it iconic in American Horror Story: Freak Show promos.

This sequence leans into the carnival/circus aesthetic with rotating effects, calliope-inspired patterns, and that unsettling sense that something isn't quite right. It's Halloween without being overtly scary.

**Key Features:**
- Rotating/spinning effects that mimic carousel movement
- Vintage carnival color palette
- Creepy-cute aesthetic throughout
- Matrix displays carnival imagery
- Perfect for Melanie Martinez fans (they WILL notice)

The creepy-cute aesthetic is having a moment, and this sequence delivers. Fans of Melanie's music will absolutely lose it when they recognize the song.`,
    tags: ["Halloween", "Indie Pop", "Creepy Cute", "AHS", "Carnival"],
    propCount: 32,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/carousel-melanie-martinez.1185/",
    youtubeId: null,
    artworkUrl: null,
    models: ["Matrix", "Mini Fireworks", "Showstopper Spinners", "Pixel Poles", "Spiders", "Bats"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Cry Baby album)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-09",
    yearAdded: 2025,
  },
];

// Helper to check if sequence is new (current year)
export function isNewSequence(sequence: Sequence, currentYear: number = 2026): boolean {
  return sequence.yearAdded === currentYear;
}

// Get sequences by year
export function getSequencesByYear(year: number): Sequence[] {
  return sequences.filter(s => s.yearAdded === year);
}

// Get new sequences for current year
export function getNewSequences(currentYear: number = 2026): Sequence[] {
  return sequences.filter(s => s.yearAdded === currentYear);
}

export function getSequenceBySlug(slug: string): Sequence | undefined {
  return sequences.find(s => s.slug === slug);
}

export function getRelatedSequences(currentSlug: string, limit: number = 3): Sequence[] {
  const current = getSequenceBySlug(currentSlug);
  if (!current) return sequences.slice(0, limit);

  // Get sequences in the same category, excluding current
  const related = sequences
    .filter(s => s.slug !== currentSlug && s.category === current.category)
    .slice(0, limit);

  // If not enough in same category, fill with others
  if (related.length < limit) {
    const others = sequences
      .filter(s => s.slug !== currentSlug && s.category !== current.category)
      .slice(0, limit - related.length);
    return [...related, ...others];
  }

  return related;
}

export function getAllSlugs(): string[] {
  return sequences.map(s => s.slug);
}
