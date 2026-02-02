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
  xlightsSeqUrl?: string; // Legacy: xlightsseq.com URL (optional if using direct download)
  googleDriveUrl?: string; // Direct download from Google Drive
  amazonMusicUrl?: string; // Direct link to purchase audio on Amazon
  youtubeId: string | null;
  artworkUrl: string | null;
  thumbnailUrl?: string; // Custom thumbnail image URL (takes priority over YouTube thumbnail)
  models: string[];
  xlightsVersion: string;
  audioSource: string;
  fileFormats: string[];
  releaseDate: string;
  yearAdded: number; // Year the sequence was added to the show
  dominantColors: string[]; // 2-3 hex colors representing the sequence's color palette
}

// Get YouTube thumbnail URL from video ID
export function getThumbnailUrl(youtubeId: string | null): string | null {
  if (!youtubeId) return null;
  return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
}

export const sequences: Sequence[] = [
  // =====================
  // HALLOWEEN SEQUENCES
  // =====================
  {
    id: 1,
    slug: "the-dead-dance",
    title: "The Dead Dance",
    artist: "Lady Gaga",
    price: 9,
    category: "Halloween",
    duration: "3:45",
    difficulty: "Intermediate",
    description:
      "Fresh from the new season of Wednesday on Netflix. This sequence inter-splices the official music video with that infamous dance scene.",
    thumbnailUrl:
      "https://dnm.nflximg.net/api/v6/BvVbc2Wxr2w6QuoANoSpJKEIWjQ/AAAAQb1nIHsPT0lHqj8fy8LB3N7DSFxlwx1l0RMqTPfXxaYldolxKAiU6BhNFkp-timlr6cZlHIU30ZileeOTu9k_f4AGPAFcTcdSRqVv49ZEpqu9qVa4BVoHv8lSArgujqBqr67DE9L8XQXm1oZja1NnDuKL7A.jpg?r=74a",
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
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/the-dead-dance-lady-gaga.1404/",
    youtubeId: null, // Cleared - was live show video, waiting for mockup
    artworkUrl: "https://f4.bcbits.com/img/a2725628149_16.jpg",
    models: [
      "Matrix (70x100)",
      "Singing Pumpkin",
      "Mini Fireworks",
      "Showstopper Spinners",
      "Spiders",
      "Bats",
      "Tombstones",
      "Pixel Forest",
      "Arches",
    ],
    xlightsVersion: "2024.20+",
    audioSource: "iTunes, Amazon Music, Spotify (download required)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2025-01",
    yearAdded: 2025,
    dominantColors: ["#1a1a2e", "#9b59b6", "#e74c3c"], // Dark purple/red Wednesday vibes
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
    description:
      "Vibrant colors and dynamic patterns bring the emotional journey of this song to life. A moody, atmospheric sequence.",
    thumbnailUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJf4DHmpIEBej2eVCg7LPtvdqr783dTriHnQ&s",
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
    youtubeId: null, // Cleared - was live show video, waiting for mockup
    artworkUrl:
      "https://i.scdn.co/image/ab67616d0000b2738ee96fdeb846e7d1b041a35f",
    models: [
      "Matrix (70x100)",
      "Singing Pumpkin",
      "Fireworks",
      "Showstopper Spinners",
      "Fuzion Spinner",
      "Pixel Forest",
      "Arches",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-09",
    yearAdded: 2025,
    dominantColors: ["#2c3e50", "#8e44ad", "#3498db"], // Moody blues and purples
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
    description:
      "Lady Gaga's latest Halloween anthem brought to life in pixels. Magic, mystery, and a whole lot of sparkle.",
    thumbnailUrl:
      "https://static0.srcdn.com/wordpress/wp-content/uploads/2025/02/lady-gaga-dressed-in-white-in-the-abracadabra-mv.jpg?w=1600&h=1200&fit=crop",
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
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/abracadabra-lady-gaga.1233/",
    youtubeId: null, // Cleared - was live show video, waiting for mockup
    artworkUrl:
      "https://borderlinemusic.com/cdn/shop/files/ABRACADABRAcopy_grande.jpg?v=1749866043",
    models: [
      "Matrix (70x100)",
      "Singing Pumpkin",
      "Fireworks",
      "Showstopper Spinners",
      "Spiders",
      "Bats",
    ],
    xlightsVersion: "2024.20+",
    audioSource: "iTunes, Amazon Music, Spotify (download required)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2025-01",
    yearAdded: 2025,
    dominantColors: ["#9b59b6", "#f1c40f", "#e74c3c"], // Magic purple, gold sparkle, red
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
    description:
      "EDM meets the darkness. Heavy bass drops and atmospheric builds create an immersive Halloween experience.",
    thumbnailUrl: "https://i.ytimg.com/vi/EiOB_sSSXQs/maxresdefault.jpg",
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
    xlightsSeqUrl: "https://xlightsseq.com/sequences/darkside-by-neoni.1338/",
    youtubeId: null, // Cleared - was live show video, waiting for mockup
    artworkUrl:
      "https://i1.sndcdn.com/artworks-0mT77eZFtmNZcS4e-F6Ds8Q-t500x500.jpg",
    models: [
      "Matrix (70x100)",
      "Singing Pumpkin",
      "Fireworks",
      "Showstopper Spinners",
      "Pixel Forest",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-10",
    yearAdded: 2025,
    dominantColors: ["#1a1a2e", "#e74c3c", "#9b59b6"],
  },
  {
    id: 5,
    slug: "this-is-halloween",
    title: "This Is Halloween",
    artist: "Danny Elfman",
    price: 5,
    category: "Halloween",
    duration: "3:18",
    difficulty: "Beginner",
    description:
      "The Nightmare Before Christmas classic that started it all. Perfect for Halloween newbies or anyone who believes in the Pumpkin King.",
    thumbnailUrl:
      "https://pixelperfectsequences.com/cdn/shop/products/ThisIsHalloween_1200x1200.jpg?v=1624218681",
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
    youtubeId: "i5t1SF07ePQ",
    artworkUrl:
      "https://i.scdn.co/image/ab67616d0000b2737073748b25a091da2589a6df",
    models: [
      "Matrix",
      "Singing Pumpkin",
      "Mini Pumpkins",
      "Pixel Poles",
      "Tombstones",
      "Spiders",
    ],
    xlightsVersion: "2024.10+",
    audioSource: "iTunes, Amazon Music (Nightmare Before Christmas Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-08",
    yearAdded: 2022,
    dominantColors: ["#f39c12", "#9b59b6", "#2ecc71"],
  },
  {
    id: 6,
    slug: "carousel",
    title: "Carousel",
    artist: "Melanie Martinez",
    price: 5,
    category: "Halloween",
    duration: "3:15",
    difficulty: "Intermediate",
    description:
      "Subtle circus and carnival vibes throughout. You might recognize this from American Horror Story: Freak Show promos.",
    thumbnailUrl: "/carouselmain.png",
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
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/carousel-melanie-martinez.1185/",
    youtubeId: null,
    artworkUrl:
      "https://pics.filmaffinity.com/melanie_martinez_carousel-257475453-large.jpg",
    models: [
      "Matrix",
      "Mini Fireworks",
      "Showstopper Spinners",
      "Pixel Poles",
      "Spiders",
      "Bats",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Cry Baby album)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-09",
    yearAdded: 2025,
    dominantColors: ["#e74c3c", "#f1c40f", "#9b59b6"],
  },
  {
    id: 7,
    slug: "i-think-were-alone-now",
    title: "I Think We're Alone Now",
    artist: "Hidden Citizens",
    price: 19,
    category: "Halloween",
    duration: "3:22",
    difficulty: "Intermediate",
    description:
      "The haunting cover from The Umbrella Academy that turned a pop classic into something beautifully eerie.",
    thumbnailUrl:
      "https://i.scdn.co/image/ab67616d0000b2731e2565cb9cc67c378d2a8f31",
    longDescription: `Hidden Citizens took Tiffany's 80s pop hit and transformed it into something hauntingly beautiful. If you watched The Umbrella Academy, you know exactly why this song gives you chills.

This sequence captures that apocalyptic dance party energy—the calm before the storm, the beauty in the ending. It's melancholy and powerful in equal measure.

**Key Features:**
- Slow build that mirrors the song's tension
- Ethereal lighting during the quiet moments
- Explosive effects for the powerful drops
- Matrix displays moody visual effects
- Perfect for fans of cinematic covers

This one hits different. It's the kind of sequence that makes people stop and watch.`,
    tags: ["Halloween", "Cinematic", "Cover", "Umbrella Academy", "2026"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl:
      "https://i.scdn.co/image/ab67616d0000b2731e2565cb9cc67c378d2a8f31",
    models: [
      "Matrix (70x100)",
      "Singing Pumpkin",
      "Fireworks",
      "Pixel Forest",
      "Arches",
      "Floods",
    ],
    xlightsVersion: "2024.20+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2026-01",
    yearAdded: 2026,
    dominantColors: ["#3498db", "#ecf0f1", "#9b59b6"],
  },
  {
    id: 8,
    slug: "spooky-scary-skeletons",
    title: "Spooky Scary Skeletons",
    artist: "Andrew Gold",
    price: 0,
    category: "Halloween",
    duration: "2:24",
    difficulty: "Beginner",
    description:
      "The internet's favorite Halloween meme song. Perfect for family-friendly displays that still want to get spooky.",
    thumbnailUrl: "/spookymain.png",
    longDescription: `You know this song. Your kids know this song. The internet definitely knows this song. "Spooky Scary Skeletons" became a Halloween meme legend, and now it can be part of your display.

This sequence is pure fun—bouncy, energetic, and perfect for the younger crowd. It's spooky without being scary, making it ideal for early evening shows when families are out trick-or-treating.

**Key Features:**
- Bouncy, fun energy throughout
- Family-friendly effects (no jump scares)
- Skeleton-themed patterns and movements
- Easy to remap to smaller displays
- FREE because everyone deserves this classic

This one's on the house. Every display needs a song that makes the kids dance.`,
    tags: ["Halloween", "Meme", "Family Friendly", "Classic", "FREE"],
    propCount: 25,
    hasMatrix: true,
    googleDriveUrl:
      "https://drive.google.com/file/d/1LvUoQT7HDBYrQJGciP23qCYZbpDgALFn/view?usp=drive_link",
    amazonMusicUrl:
      "https://amazon.com/music/player/albums/B00H7VJQJG?marketplaceId=ATVPDKIKX0DER&musicTerritory=US&ref=dm_sh_mX5DGaE3azrDSiluuEPxTpnYY&trackAsin=B00H7VJRSQ",
    youtubeId: null,
    artworkUrl:
      "https://i.scdn.co/image/ab67616d0000b273d9eba2e53b04616ae637ab38",
    models: [
      "Matrix",
      "Singing Pumpkin",
      "Mini Pumpkins",
      "Pixel Poles",
      "Tombstones",
    ],
    xlightsVersion: "2024.10+",
    audioSource: "Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-09",
    yearAdded: 2023,
    dominantColors: ["#f39c12", "#ecf0f1", "#9b59b6"],
  },
  {
    id: 9,
    slug: "purple-people-eater",
    title: "Purple People Eater",
    artist: "Pegboard Nerds",
    price: 5,
    category: "Halloween",
    duration: "3:08",
    difficulty: "Intermediate",
    description:
      "The dubstep remix that makes the classic Halloween tune drop harder than ever. Purple everything.",
    thumbnailUrl: "https://i.ytimg.com/vi/AKkKeNtYMTo/sddefault.jpg",
    longDescription: `The Pegboard Nerds took a novelty song from 1958 and turned it into a bass-dropping monster. This remix slaps, and this sequence makes sure your display slaps right along with it.

Heavy on the purple (obviously), this sequence pulses with the electronic beats while paying homage to the silly source material. It's the perfect blend of nostalgic and modern.

**Key Features:**
- Purple-dominant color scheme (it's in the name)
- Bass-reactive effects that hit hard
- Dubstep drop sequences that light up the neighborhood
- Fun callbacks to the original song
- Perfect for EDM fans

When the drop hits, your whole display explodes. Your neighbors will feel it.`,
    tags: ["Halloween", "EDM", "Dubstep", "Remix", "Bass"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl:
      "https://i1.sndcdn.com/artworks-000377765997-jmtgu9-t500x500.jpg",
    models: [
      "Matrix (70x100)",
      "Fireworks",
      "Showstopper Spinners",
      "Pixel Forest",
      "Arches",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music, Spotify",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-10",
    yearAdded: 2023,
    dominantColors: ["#9b59b6", "#8e44ad", "#e74c3c"],
  },
  {
    id: 10,
    slug: "et",
    title: "E.T.",
    artist: "Katy Perry",
    price: 5,
    category: "Halloween",
    duration: "3:52",
    difficulty: "Intermediate",
    description:
      "Alien vibes and otherworldly effects. This pop hit translates perfectly to a Halloween display with its extraterrestrial energy.",
    thumbnailUrl: "https://i.ytimg.com/vi/18oYGsmUprM/sddefault.jpg",
    longDescription: `Katy Perry's "E.T." is already halfway to being a Halloween song—all those alien references and otherworldly imagery? Perfect for October.

This sequence leans into the sci-fi/horror crossover energy with effects that feel like a close encounter of the sparkly kind. Greens, purples, and cosmic patterns dominate.

**Key Features:**
- Alien/space-themed color palette
- Otherworldly matrix effects
- Pulsing, hypnotic patterns
- Builds that feel like a UFO landing
- Perfect for sci-fi horror fans

"Kiss me, k-k-kiss me" hits different when your entire house is glowing like a spaceship.`,
    tags: ["Halloween", "Pop", "Sci-Fi", "Alien", "Cosmic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/e-t-katy-perry.1180/",
    youtubeId: null,
    artworkUrl:
      "https://upload.wikimedia.org/wikipedia/en/9/91/Katy_Perry_ET_cover.png",
    models: [
      "Matrix (70x100)",
      "Fireworks",
      "Showstopper Spinners",
      "Pixel Forest",
      "Floods",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-10",
    yearAdded: 2023,
    dominantColors: ["#2ecc71", "#9b59b6", "#3498db"],
  },
  {
    id: 11,
    slug: "wellerman-sea-shanty",
    title: "Wellerman Sea Shanty",
    artist: "2WEI",
    price: 19,
    category: "Halloween",
    duration: "2:48",
    difficulty: "Intermediate",
    description:
      "The viral sea shanty gets an epic orchestral treatment. Pirates, whales, and dramatic lighting await.",
    thumbnailUrl: "/wellermanmain.png",
    longDescription: `2WEI's epic orchestral version of the Wellerman sea shanty takes that viral TikTok moment and cranks it up to eleven. This sequence brings pirate energy to your Halloween display.

Sea shanties and Halloween might seem like an odd pairing, but trust us—the dark, dramatic energy of this version fits right in with ghost ships and cursed sailors.

**Key Features:**
- Dramatic orchestral builds
- Ocean wave-like patterns
- Pirate-worthy color schemes
- Epic drops that feel like cannon fire
- Perfect for fans of epic trailers

Yo ho ho, your display's about to get nautical.`,
    tags: ["Halloween", "Orchestral", "Epic", "Sea Shanty", "2026"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: "https://i1.sndcdn.com/artworks-OUW3z6LmK0TB-0-t500x500.jpg",
    models: [
      "Matrix (70x100)",
      "Fireworks",
      "Showstopper Spinners",
      "Pixel Forest",
      "Arches",
      "Floods",
    ],
    xlightsVersion: "2024.20+",
    audioSource: "iTunes, Amazon Music, Spotify",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2026-01",
    yearAdded: 2026,
    dominantColors: ["#2c3e50", "#3498db", "#f39c12"],
  },
  {
    id: 12,
    slug: "thriller-remix",
    title: "Thriller Remix",
    artist: "Michael Jackson",
    price: 9,
    category: "Halloween",
    duration: "5:58",
    difficulty: "Advanced",
    description:
      "The king of Halloween songs gets the remix treatment. Six minutes of iconic zombie energy.",
    thumbnailUrl:
      "https://i.ytimg.com/vi/KbmJIq6tGmQ/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDrNHy4BRo1NlIrcZPOldzDujxVvg",
    longDescription: `You literally cannot have a Halloween display without Thriller. It's the law. (Okay, it's not the law, but it should be.)

This remix version keeps all the iconic elements—Vincent Price's monologue, the zombie groove, the werewolf howl—while adding modern production that makes it feel fresh. The sequence runs nearly six minutes, giving you plenty of time to show off every prop.

**Key Features:**
- Full Vincent Price monologue section
- Zombie march effects during the chorus
- Werewolf transformation sequence
- Matrix displays classic Thriller imagery
- Every prop gets its moment

This is a flagship sequence. The length means it's best for dedicated viewing times rather than quick drive-by shows.`,
    tags: ["Halloween", "Classic", "Pop", "Zombie", "Iconic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl:
      "https://i1.sndcdn.com/artworks-QVRXQthzu6HSkmam-3z0RCw-t500x500.jpg",
    models: ["Matrix (70x100)", "Singing Pumpkin", "Fireworks", "All Props"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (various remix versions available)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-10",
    yearAdded: 2023,
    dominantColors: ["#e74c3c", "#1a1a2e", "#f39c12"],
  },
  {
    id: 13,
    slug: "ghostbusters-not-afraid",
    title: "Ghostbusters - I'm Not Afraid",
    artist: "Fall Out Boy ft. Missy Elliott",
    price: 5,
    category: "Halloween",
    duration: "3:48",
    difficulty: "Intermediate",
    description:
      "The 2016 Ghostbusters theme brings modern energy to a classic concept. Who you gonna call?",
    thumbnailUrl: "/gbmain.png",
    longDescription: `Fall Out Boy and Missy Elliott teamed up for the 2016 Ghostbusters reboot, and the result is a high-energy banger that's perfect for Halloween displays.

This sequence captures that ghost-hunting energy with proton pack-inspired effects and plenty of green slime vibes. It's got the punch of modern pop-rock with callbacks to the original theme.

**Key Features:**
- Proton pack beam effects
- Slimer green throughout
- High-energy chorus explosions
- Missy Elliott verse gets special treatment
- Perfect for action-packed shows

If there's something strange in your neighborhood, this sequence is who you call.`,
    tags: ["Halloween", "Pop Rock", "Ghostbusters", "High Energy"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: "/gbdet.png",
    models: [
      "Matrix (70x100)",
      "Singing Pumpkin",
      "Fireworks",
      "Showstopper Spinners",
      "Pixel Forest",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Ghostbusters 2016 Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-10",
    yearAdded: 2023,
    dominantColors: ["#2ecc71", "#ecf0f1", "#e74c3c"],
  },
  {
    id: 14,
    slug: "haunted-mansion-intro",
    title: "Haunted Mansion Intro",
    artist: "Disney",
    price: 0,
    category: "Halloween",
    duration: "2:15",
    difficulty: "Beginner",
    description:
      "Welcome, foolish mortals. The iconic Disney ride intro brings theme park magic to your driveway.",
    thumbnailUrl: "https://i.ytimg.com/vi/L2QLjmJsGhQ/maxresdefault.jpg",
    longDescription: `"Welcome, foolish mortals, to the Haunted Mansion..."

If you've ever been to Disneyland or Disney World, those words send chills down your spine. This sequence recreates the magic of that stretching room intro, complete with lightning effects and ghostly ambiance.

**Key Features:**
- Ghost Host narration timing
- Lightning flash effects
- Stretching room ambiance
- Creepy organ music lighting
- FREE for Disney fans everywhere

Perfect as a show opener or closer. Set the mood before the music really kicks in.`,
    tags: ["Halloween", "Disney", "Theme Park", "Classic", "FREE"],
    propCount: 25,
    hasMatrix: true,
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/haunted-mansion-intro-grim-grinning-ghosts.1181/",
    youtubeId: null,
    artworkUrl:
      "https://i.scdn.co/image/ab67616d0000b273c80b30f3dc50347124492fc3",
    models: ["Matrix", "Floods", "Pixel Forest", "Arches", "House Outlines"],
    xlightsVersion: "2024.10+",
    audioSource: "YouTube (search 'Haunted Mansion Ride Audio')",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2022-10",
    yearAdded: 2022,
    dominantColors: ["#9b59b6", "#2c3e50", "#2ecc71"],
  },
  {
    id: 15,
    slug: "paint-it-black-wednesday",
    title: "Paint It Black (Wednesday Soundtrack)",
    artist: "Wednesday Addams",
    price: 5,
    category: "Halloween",
    duration: "3:45",
    difficulty: "Intermediate",
    description:
      "The cello version from Wednesday's viral dance scene. Dark, dramatic, and absolutely iconic.",
    thumbnailUrl:
      "https://i.ytimg.com/vi/S523q5PCX6Q/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBG9h6qX4pB479TMYFT1_X2mXDjpg",
    longDescription: `When Wednesday Addams picked up that cello and started playing "Paint It Black," the internet lost its collective mind. This sequence captures that exact energy.

The arrangement is dark and dramatic, all strings and intensity. The sequence matches that energy with deep reds, blacks, and sudden bursts of color that feel like Wednesday herself sequenced it.

**Key Features:**
- Cello-driven effect timing
- Wednesday-approved color palette (mostly black)
- Dramatic builds and releases
- Matrix displays abstract dark patterns
- Perfect companion to "The Dead Dance"

Pair this with our Dead Dance sequence for the ultimate Wednesday tribute.`,
    tags: ["Halloween", "Wednesday", "Netflix", "Cello", "Dramatic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl:
      "https://i.scdn.co/image/ab67616d0000b273f4c83f635f660ccaf6d06de6",
    models: [
      "Matrix (70x100)",
      "Singing Pumpkin",
      "Fireworks",
      "Pixel Forest",
      "Floods",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Wednesday Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-10",
    yearAdded: 2024,
    dominantColors: ["#1a1a2e", "#e74c3c", "#ecf0f1"],
  },
  {
    id: 16,
    slug: "in-the-air-tonight",
    title: "In the Air Tonight",
    artist: "Phil Collins",
    price: 19,
    category: "Halloween",
    duration: "5:34",
    difficulty: "Advanced",
    description:
      "The drum fill that changed everything. This sequence builds tension for five minutes, then absolutely explodes.",
    thumbnailUrl:
      "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjSf3UrSAQfwnaylGcVjyRvdMXp5-qn72SG0GHTvv6kOUzIOhPAastqwB_FaoQlXZLuu_kRc1rfg2yhVF2msc20MaSYqs14Wvc9ibY4tT2e8_AYtZeKvfBVUPhX0ZbDz7lt9rsQ2WynFAM/s633/phil+collins+in+the+air+tonight+deer+main.jpg",
    longDescription: `You know the drum fill. Everyone knows the drum fill. "In the Air Tonight" is five minutes of tension building to one of the most iconic moments in music history.

This sequence is all about the build. The verses are moody and atmospheric, the tension ratchets up through the bridge, and then... THAT drum fill. When it hits, every single pixel in your display goes absolutely nuclear.

**Key Features:**
- Five minutes of building tension
- THE drum fill gets THE treatment
- Atmospheric effects during verses
- Full display explosion at the climax
- Worth the wait, every single time

This sequence is why you bought all those pixels.`,
    tags: ["Halloween", "Classic Rock", "Atmospheric", "Iconic", "2026"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl:
      "https://upload.wikimedia.org/wikipedia/en/4/4f/In_the_Air_Tonight_by_Phil_Collins_handwriting_font.png",
    models: ["Matrix (70x100)", "All Props", "Every Single Pixel"],
    xlightsVersion: "2024.20+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2026-01",
    yearAdded: 2026,
    dominantColors: ["#2c3e50", "#3498db", "#f1c40f"],
  },
  {
    id: 17,
    slug: "separate-ways-stranger-things",
    title: "Separate Ways (Stranger Things Remix)",
    artist: "Journey",
    price: 5,
    category: "Halloween",
    duration: "3:42",
    difficulty: "Intermediate",
    description:
      "The Stranger Things Season 4 version that brought Journey back to the charts. Synth-heavy and nostalgic.",
    thumbnailUrl:
      "https://api.floodmagazine.com/wp-content/uploads/2022/07/Stranger-Things-Poster.jpeg",
    longDescription: `When Stranger Things Season 4 dropped this synth-heavy remix of Journey's "Separate Ways," it immediately became a Halloween staple. The 80s nostalgia combined with that Upside Down energy? Chef's kiss.

This sequence captures the retro-horror aesthetic of Stranger Things with neon colors, synth-wave patterns, and effects that feel like they're straight out of Hawkins, Indiana.

**Key Features:**
- 80s synth-wave color palette
- Stranger Things-inspired effects
- Retro neon aesthetics
- Powerful chorus moments
- Perfect for 80s nostalgia fans

The Upside Down never looked so good.`,
    tags: ["Halloween", "80s", "Stranger Things", "Synth", "Nostalgic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/separate-ways-stranger-things-version-journey.1161/",
    youtubeId: null,
    artworkUrl:
      "https://i0.wp.com/vividsequences.com/wp-content/uploads/2022/07/Separate-Ways.jpg?fit=500%2C500&ssl=1",
    models: [
      "Matrix (70x100)",
      "Fireworks",
      "Pixel Forest",
      "Arches",
      "Floods",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Stranger Things Season 4 Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-10",
    yearAdded: 2024,
    dominantColors: ["#e74c3c", "#3498db", "#9b59b6"],
  },
  {
    id: 18,
    slug: "save-tonight",
    title: "Save Tonight",
    artist: "Zayde Wolfe",
    price: 5,
    category: "Halloween",
    duration: "3:28",
    difficulty: "Intermediate",
    description:
      "An epic cinematic cover that transforms a 90s acoustic hit into something powerful and haunting.",
    thumbnailUrl: "https://i.ytimg.com/vi/SorxwQnuvDc/sddefault.jpg",
    longDescription: `Zayde Wolfe specializes in turning songs into epic trailer music, and "Save Tonight" is one of their best transformations. The original Eagle-Eye Cherry acoustic vibe is replaced with thundering drums and cinematic strings.

This sequence matches that epic energy with effects that feel like the climax of a movie trailer. Big builds, bigger drops, and a sense of impending... something.

**Key Features:**
- Epic trailer-style effects
- Dramatic builds throughout
- Cinematic color palette
- Powerful drops with full display activation
- Perfect for viewers who love drama

Your display becomes the trailer for the greatest Halloween movie never made.`,
    tags: ["Halloween", "Cinematic", "Epic", "Cover", "Trailer"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl:
      "https://i1.sndcdn.com/artworks-000134977235-lqgyeu-t500x500.jpg",
    models: [
      "Matrix (70x100)",
      "Fireworks",
      "Showstopper Spinners",
      "All Props",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music, Spotify",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-10",
    yearAdded: 2024,
    dominantColors: ["#e74c3c", "#f39c12", "#2c3e50"],
  },
  {
    id: 19,
    slug: "defying-gravity",
    title: "Defying Gravity",
    artist: "Wicked Soundtrack",
    price: 9,
    category: "Halloween",
    duration: "5:23",
    difficulty: "Advanced",
    description:
      "The showstopper from Wicked. Green-skinned witch energy with Broadway power.",
    thumbnailUrl: "https://i.ytimg.com/vi/5znZFJWSZ7o/maxresdefault.jpg",
    longDescription: `With the Wicked movie finally here, "Defying Gravity" is having its biggest moment yet. This sequence brings all that Broadway power to your display with effects worthy of the Emerald City.

The sequence builds through Elphaba's journey, starting subtle and growing more intense until that iconic final belt. Green dominates (obviously), but there's a whole rainbow of Oz magic in here.

**Key Features:**
- Broadway-worthy dramatic builds
- Elphaba green everything
- Flying/ascending effects for "the moment"
- Full display for the final note
- Perfect timing with the movie release

Unlimited potential for your display.`,
    tags: ["Halloween", "Broadway", "Wicked", "Theatrical", "Epic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/defying-gravity-wicked.1207/",
    youtubeId: null,
    artworkUrl:
      "https://magicallightshows.com/cdn/shop/files/Wicked.jpg?v=1759190196",
    models: ["Matrix (70x100)", "All Props"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Wicked Soundtrack - Original or Movie)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-10",
    yearAdded: 2024,
    dominantColors: ["#2ecc71", "#1a1a2e", "#9b59b6"],
  },
  {
    id: 20,
    slug: "your-idol",
    title: "Your Idol",
    artist: "Kpop Demon Hunters",
    price: 5,
    category: "Halloween",
    duration: "3:15",
    difficulty: "Intermediate",
    description:
      "K-pop meets Halloween horror. This viral hit brings demon-hunting energy to your display.",
    thumbnailUrl:
      "https://preview.redd.it/your-idol-is-it-supposed-to-be-like-gwi-ma-singing-v0-wevb0kmkj9hf1.jpg?width=686&format=pjpg&auto=webp&s=86260edbc10644912a08c2cdceb59e65ca59cbfe",
    longDescription: `Kpop Demon Hunters created something special with "Your Idol"—a track that blends K-pop production with Halloween horror themes. The result is infectious, danceable, and perfectly spooky.

This sequence captures that dual energy with effects that are as polished as a K-pop music video but as creepy as a horror movie. It's the best of both worlds.

**Key Features:**
- K-pop choreography-inspired timing
- Horror-themed color transitions
- Dance break sections with strobe effects
- Matrix displays music video-style visuals
- Perfect for K-pop and horror fans alike

When demon hunters drop a banger, you sequence it.`,
    tags: ["Halloween", "K-pop", "Horror", "Dance", "Viral"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/kpop-demon-hunters-your-idol.1333/",
    youtubeId: null,
    artworkUrl:
      "https://i.scdn.co/image/ab67616d00001e0266529b9bd72768d5c683623f",
    models: [
      "Matrix (70x100)",
      "Fireworks",
      "Showstopper Spinners",
      "Pixel Forest",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music, Spotify",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2025-01",
    yearAdded: 2025,
    dominantColors: ["#e74c3c", "#9b59b6", "#f1c40f"],
  },

  // =====================
  // CHRISTMAS SEQUENCES
  // =====================
  {
    id: 21,
    slug: "mary-did-you-know",
    title: "Mary Did You Know",
    artist: "Pentatonix",
    price: 9,
    category: "Christmas",
    duration: "4:12",
    difficulty: "Intermediate",
    description:
      "A crowd favorite with crescendos that'll give you chills. The a cappella harmonies translate beautifully to pixels.",
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
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/mary-did-you-know-pentatonix.1324/",
    youtubeId: "p0L4XfkCTdg",
    artworkUrl:
      "https://i1.sndcdn.com/artworks-000141128986-60zb2e-t500x500.jpg",
    models: [
      "Matrix (70x100)",
      "Pixel Forest",
      "Arches",
      "House Outlines",
      "Floods",
      "Mega Tree",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-11",
    yearAdded: 2024,
    dominantColors: ["#3498db", "#ecf0f1", "#f1c40f"],
  },
  {
    id: 22,
    slug: "thx-intro",
    title: "THX Intro",
    artist: "Pixar",
    price: 0,
    category: "Christmas",
    duration: "0:30",
    difficulty: "Beginner",
    description:
      "The audience is now deaf. That iconic sound system test, now in pixels.",
    longDescription: `BWAAAAAAAAAAAAAAHHHHHHHHH.

You know the sound. That crescendo that's been blowing out home theater speakers since the 80s. This short sequence is the perfect show opener—a way to tell your neighbors "the show is about to start, and your subwoofer should be scared."

**Key Features:**
- 30 seconds of pure crescendo
- Full display activation at peak
- Perfect show opener
- Tests your entire display at once
- FREE because everyone deserves this chaos

Short, sweet, and absolutely devastating to eardrums everywhere.`,
    tags: ["Christmas", "Intro", "Classic", "FREE", "THX"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: ["All Props"],
    xlightsVersion: "2024.10+",
    audioSource: "YouTube (search 'THX Deep Note')",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2022-11",
    yearAdded: 2022,
    dominantColors: ["#e74c3c", "#3498db", "#f1c40f"],
  },
  {
    id: 23,
    slug: "let-it-go",
    title: "Let It Go",
    artist: "Idina Menzel",
    price: 9,
    category: "Christmas",
    duration: "3:44",
    difficulty: "Intermediate",
    description:
      "The cold never bothered your display anyway. Frozen's anthem in full icy glory.",
    longDescription: `Let it go, let it go... and every parent in the audience simultaneously groans while their kids lose their minds with joy.

Love it or hate it, "Let It Go" is iconic, and this sequence does it justice. Icy blues, crystalline whites, and effects that feel like Elsa herself is building an ice palace in your front yard.

**Key Features:**
- Ice queen color palette (blues, whites, silvers)
- Snowflake and crystal effects
- Big builds for the chorus power notes
- Matrix displays Frozen-inspired visuals
- Kids will absolutely love it

The parents might be tired of this song, but their kids aren't. And honestly? The sequence is really good.`,
    tags: ["Christmas", "Disney", "Frozen", "Kids", "Iconic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/let-it-go-frozen.1310/",
    youtubeId: null,
    artworkUrl: null,
    models: [
      "Matrix (70x100)",
      "Pixel Forest",
      "Arches",
      "Floods",
      "Mega Tree",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Frozen Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-11",
    yearAdded: 2023,
    dominantColors: ["#3498db", "#ecf0f1", "#9b59b6"],
  },
  {
    id: 24,
    slug: "wizards-in-winter",
    title: "Wizards in Winter",
    artist: "Trans-Siberian Orchestra",
    price: 9,
    category: "Christmas",
    duration: "3:24",
    difficulty: "Advanced",
    description:
      "The song that launched a thousand Christmas light displays. Pure orchestral chaos in the best way.",
    longDescription: `This is THE song. The one that started the synchronized Christmas lights movement. If you've ever seen a viral Christmas light video, there's a good chance this was the soundtrack.

Trans-Siberian Orchestra's "Wizards in Winter" is pure controlled chaos—a battle between electric guitars and classical instruments, and this sequence captures every note of that battle.

**Key Features:**
- Fast-paced effect changes
- Dueling guitar/orchestra sections
- Full display workout
- Classic for a reason
- Every prop gets pushed to its limits

This sequence separates the casual displayers from the serious ones. Your controller will be sweating.`,
    tags: ["Christmas", "TSO", "Orchestral", "Classic", "Intense"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: ["All Props"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-11",
    yearAdded: 2023,
    dominantColors: ["#e74c3c", "#2ecc71", "#f1c40f"],
  },
  {
    id: 25,
    slug: "cozy-little-christmas",
    title: "Cozy Little Christmas",
    artist: "Katy Perry",
    price: 5,
    category: "Christmas",
    duration: "3:26",
    difficulty: "Intermediate",
    description:
      "Modern Christmas pop perfection. Warm, fuzzy, and absolutely adorable.",
    longDescription: `Katy Perry's "Cozy Little Christmas" is the audio equivalent of hot cocoa and fuzzy socks. It's warm, it's sweet, and it's the perfect palate cleanser between more intense sequences.

This sequence captures that cozy energy with warm colors, gentle transitions, and effects that feel like a hug from your favorite holiday sweater.

**Key Features:**
- Warm color palette (reds, oranges, golds)
- Gentle, flowing transitions
- Cozy fireplace-inspired effects
- Perfect for family viewing hours
- Modern Christmas pop at its finest

Sometimes you need a break from the orchestral intensity. This is that break.`,
    tags: ["Christmas", "Pop", "Cozy", "Modern", "Family Friendly"],
    propCount: 32,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: ["Matrix", "Pixel Forest", "Arches", "House Outlines", "Floods"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-11",
    yearAdded: 2024,
    dominantColors: ["#e74c3c", "#f39c12", "#f1c40f"],
  },
  {
    id: 26,
    slug: "christmas-lights",
    title: "Christmas Lights",
    artist: "Coldplay",
    price: 5,
    category: "Christmas",
    duration: "4:32",
    difficulty: "Intermediate",
    description:
      "A melancholy Christmas anthem that's somehow both sad and beautiful. Peak Coldplay.",
    longDescription: `Coldplay wrote a Christmas song about heartbreak, and somehow it became one of the most beautiful holiday songs of the modern era. "Christmas Lights" is bittersweet perfection.

This sequence captures that emotional complexity with effects that shift between hope and melancholy, joy and reflection. It's not your typical "happy Christmas" sequence, and that's exactly what makes it special.

**Key Features:**
- Emotional color transitions
- Coldplay-signature piano-driven timing
- Bittersweet but beautiful
- Matrix displays abstract emotional visuals
- Perfect for late-night show loops

Not every Christmas song needs to be jolly. Sometimes the lights need to feel something.`,
    tags: ["Christmas", "Alternative", "Emotional", "Modern", "Melancholy"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/christmas-lights-coldplay.1314/",
    youtubeId: null,
    artworkUrl: null,
    models: [
      "Matrix (70x100)",
      "Pixel Forest",
      "Arches",
      "House Outlines",
      "Floods",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-11",
    yearAdded: 2024,
    dominantColors: ["#3498db", "#f1c40f", "#ecf0f1"],
  },
  {
    id: 27,
    slug: "merry-christmas",
    title: "Merry Christmas",
    artist: "Elton John & Ed Sheeran",
    price: 5,
    category: "Christmas",
    duration: "3:28",
    difficulty: "Intermediate",
    description:
      "When two legends team up for Christmas, you sequence it. Modern classic energy.",
    longDescription: `Elton John and Ed Sheeran teaming up for a Christmas song was always going to be special. "Merry Christmas" is the result—a feel-good holiday anthem that's already becoming a modern classic.

This sequence captures the joy and energy of the collaboration with effects that feel like the musical equivalent of two friends having the best time ever.

**Key Features:**
- Joyful, celebratory effects
- Classic Christmas color schemes
- Bouncy, fun energy throughout
- Matrix displays festive imagery
- Already a modern classic

Two legends, one song, one incredible sequence.`,
    tags: ["Christmas", "Pop", "Modern Classic", "Duet", "Joyful"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: [
      "Matrix (70x100)",
      "Pixel Forest",
      "Arches",
      "House Outlines",
      "Mega Tree",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-11",
    yearAdded: 2024,
    dominantColors: ["#e74c3c", "#2ecc71", "#ecf0f1"],
  },
  {
    id: 28,
    slug: "candy-cane-lane",
    title: "Candy Cane Lane",
    artist: "Sia",
    price: 5,
    category: "Christmas",
    duration: "3:18",
    difficulty: "Intermediate",
    description:
      "Sia's Christmas album gem. Sweet, playful, and absolutely joyful.",
    longDescription: `Sia's "Candy Cane Lane" is pure sugar—sweet, fun, and impossibly catchy. It's the kind of song that makes you want to skip down the street throwing candy at strangers.

This sequence matches that energy with candy-colored effects, playful patterns, and a general vibe of unbridled holiday joy. Red and white dominate (obviously), but there's plenty of festive color throughout.

**Key Features:**
- Candy cane color palette (reds, whites, pinks)
- Playful, bouncy effects
- Sweet without being saccharine
- Matrix displays candy-themed visuals
- Perfect for family viewing hours

Your display basically becomes a giant candy cane. The kids will love it.`,
    tags: ["Christmas", "Pop", "Playful", "Sweet", "Fun"],
    propCount: 32,
    hasMatrix: true,
    xlightsSeqUrl:
      "https://xlightsseq.com/sequences/candy-cane-lane-by-sia.1482/",
    youtubeId: null,
    artworkUrl: null,
    models: ["Matrix", "Pixel Forest", "Arches", "Pixel Poles", "Mega Tree"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Sia's Everyday is Christmas)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2025-01",
    yearAdded: 2025,
    dominantColors: ["#e74c3c", "#ecf0f1", "#f1c40f"],
  },
  {
    id: 29,
    slug: "christmas-vacation",
    title: "Christmas Vacation",
    artist: "Mavis Staples",
    price: 5,
    category: "Christmas",
    duration: "3:05",
    difficulty: "Intermediate",
    description:
      "The theme from National Lampoon's Christmas Vacation. Griswold family approved.",
    longDescription: `If you've got a display that rivals Clark Griswold's, you NEED this sequence. Mavis Staples' theme from National Lampoon's Christmas Vacation is pure holiday energy.

This sequence channels the spirit of the Griswold family—over the top, slightly chaotic, and absolutely committed to the Christmas spirit. Your neighbors will either love it or be the Margo and Todd of your street.

**Key Features:**
- Griswold-level intensity
- Classic Christmas colors
- Celebratory, chaotic energy
- Matrix displays vacation-inspired visuals
- Required viewing for fans of the movie

Hallelujah! Holy sh*t! Where's the Tylenol?`,
    tags: ["Christmas", "Classic", "Movie", "Comedy", "Griswold"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: ["Matrix (70x100)", "All Props", "Extra Props", "More Props"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Christmas Vacation Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-11",
    yearAdded: 2023,
    dominantColors: ["#e74c3c", "#2ecc71", "#f1c40f"],
  },
  {
    id: 30,
    slug: "mad-russians-christmas",
    title: "A Mad Russian's Christmas",
    artist: "Trans-Siberian Orchestra",
    price: 9,
    category: "Christmas",
    duration: "4:42",
    difficulty: "Advanced",
    description:
      "TSO meets Tchaikovsky. The Nutcracker Suite gets the rock treatment.",
    longDescription: `Trans-Siberian Orchestra took Tchaikovsky's Nutcracker Suite and ran it through their signature wall of sound. The result is "A Mad Russian's Christmas"—classical music on steroids.

This sequence is a workout. Four and a half minutes of intense effect changes, dynamic builds, and moments that will push your entire display to its limits. It's classical, it's rock, it's chaos, and it's glorious.

**Key Features:**
- Classical meets rock energy
- Nutcracker themes throughout
- Intense effect sequences
- Every prop gets a workout
- TSO at their finest

If you can handle Wizards in Winter, you can handle this. Maybe.`,
    tags: ["Christmas", "TSO", "Orchestral", "Classical", "Intense"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: ["All Props"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-11",
    yearAdded: 2023,
    dominantColors: ["#e74c3c", "#2ecc71", "#3498db"],
  },
  {
    id: 31,
    slug: "snowman",
    title: "Snowman",
    artist: "Sia",
    price: 5,
    category: "Christmas",
    duration: "3:04",
    difficulty: "Intermediate",
    description:
      "A tender, emotional Christmas song about never wanting the season to end. Tissues recommended.",
    longDescription: `Sia's "Snowman" is a love letter to Christmas itself—a plea to never let the magic end. It's tender, emotional, and absolutely beautiful.

This sequence captures that emotional depth with soft whites, gentle blues, and effects that feel like watching snowfall on a quiet night. It's not flashy, but it's deeply moving.

**Key Features:**
- Soft, emotional lighting
- Snowfall effects throughout
- Gentle transitions
- Matrix displays peaceful winter scenes
- Have tissues ready

This one makes people feel things. Fair warning.`,
    tags: ["Christmas", "Emotional", "Tender", "Beautiful", "Sia"],
    propCount: 32,
    hasMatrix: true,
    xlightsSeqUrl: "https://xlightsseq.com/sequences/snowman-by-sia.1510/",
    youtubeId: null,
    artworkUrl: null,
    models: ["Matrix", "Pixel Forest", "Arches", "House Outlines", "Floods"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Sia's Everyday is Christmas)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-11",
    yearAdded: 2024,
    dominantColors: ["#ecf0f1", "#3498db", "#9b59b6"],
  },
  {
    id: 32,
    slug: "christmas-eve-sarajevo",
    title: "Christmas Eve / Sarajevo 12/24",
    artist: "Trans-Siberian Orchestra",
    price: 9,
    category: "Christmas",
    duration: "3:28",
    difficulty: "Advanced",
    description:
      "The one that started it all for TSO. Carol of the Bells meets rock and roll.",
    longDescription: `Before Wizards in Winter, there was "Christmas Eve/Sarajevo 12/24." This is the song that put Trans-Siberian Orchestra on the map—Carol of the Bells transformed into something epic.

This sequence honors both the classical source material and TSO's rock interpretation. It builds, it crashes, it gives you chills even when it's 30 degrees outside.

**Key Features:**
- Carol of the Bells meets rock
- Dramatic builds and releases
- Full display crescendos
- Classic TSO intensity
- The OG Christmas rock anthem

This is required listening for any Christmas display. And now it's required viewing.`,
    tags: ["Christmas", "TSO", "Orchestral", "Classic", "Epic"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: ["All Props"],
    xlightsVersion: "2024.10+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2022-11",
    yearAdded: 2022,
    dominantColors: ["#e74c3c", "#f1c40f", "#2ecc71"],
  },
  {
    id: 33,
    slug: "i-dont-know-what-christmas-is",
    title: "I Don't Know What Christmas Is",
    artist: "Old 97s",
    price: 5,
    category: "Christmas",
    duration: "3:22",
    difficulty: "Intermediate",
    description:
      "The song from Spirited (but Christmastime is here). Heartfelt and underrated.",
    longDescription: `From the Apple TV+ musical "Spirited" comes this gem—a song about not knowing what Christmas is, but knowing that it feels like... this. It's heartfelt, sincere, and criminally underrated.

This sequence captures that journey of discovery with effects that start uncertain and grow into full Christmas joy. It's the kind of sequence that sneaks up on you emotionally.

**Key Features:**
- Journey from uncertainty to joy
- Building warmth throughout
- Sincere, heartfelt effects
- Matrix displays the emotional arc
- Underrated gem from a great movie

Sometimes the best Christmas songs are the ones you didn't know you needed.`,
    tags: ["Christmas", "Musical", "Spirited", "Heartfelt", "Underrated"],
    propCount: 32,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: ["Matrix", "Pixel Forest", "Arches", "House Outlines", "Mega Tree"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Spirited Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2024-11",
    yearAdded: 2024,
    dominantColors: ["#f39c12", "#e74c3c", "#2ecc71"],
  },
  {
    id: 34,
    slug: "youre-a-mean-one-mr-grinch",
    title: "You're a Mean One, Mr. Grinch",
    artist: "Lindsey Stirling ft. Sabrina Carpenter",
    price: 5,
    category: "Christmas",
    duration: "3:15",
    difficulty: "Intermediate",
    description:
      "The classic Grinch anthem with a modern twist. Violin virtuosity meets pop vocals.",
    longDescription: `Lindsey Stirling's violin and Sabrina Carpenter's vocals combine to create a version of "Mr. Grinch" that's both respectful of the original and thoroughly modern. It's playful, it's fun, and it's got serious style.

This sequence captures that energy with effects that match the playful villainy of the Grinch himself. Lots of green (obviously), but also plenty of Christmas cheer fighting against it.

**Key Features:**
- Grinch green everywhere
- Playful villain energy
- Violin-driven timing
- Christmas vs Grinch effect battles
- Kids and adults both love it

Your heart will grow three sizes. Your display will grow even more.`,
    tags: ["Christmas", "Classic", "Grinch", "Violin", "Modern"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: [
      "Matrix (70x100)",
      "Pixel Forest",
      "Arches",
      "House Outlines",
      "Mega Tree",
    ],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-11",
    yearAdded: 2023,
    dominantColors: ["#2ecc71", "#e74c3c", "#ecf0f1"],
  },
  {
    id: 35,
    slug: "do-a-little-good",
    title: "Do a Little Good",
    artist: "Ryan Reynolds & Will Ferrell",
    price: 5,
    category: "Christmas",
    duration: "3:38",
    difficulty: "Intermediate",
    description:
      "The showstopper from Spirited. Two comedy legends singing about redemption.",
    longDescription: `When Ryan Reynolds and Will Ferrell team up for a Christmas movie musical, you pay attention. "Do a Little Good" from Spirited is the kind of uplifting anthem that makes you want to be a better person.

This sequence captures that redemptive energy with effects that build from cynicism to hope, from darkness to light. It's surprisingly emotional for a song sung by two comedy legends.

**Key Features:**
- Journey from darkness to light
- Uplifting crescendo effects
- Redemption arc in lights
- Matrix displays the transformation
- Surprisingly emotional

Even Scrooge (or in this case, Ryan Reynolds) can be redeemed. So can your display.`,
    tags: ["Christmas", "Musical", "Spirited", "Uplifting", "Redemption"],
    propCount: 35,
    hasMatrix: true,
    xlightsSeqUrl: "",
    youtubeId: null,
    artworkUrl: null,
    models: ["Matrix (70x100)", "All Props"],
    xlightsVersion: "2024.15+",
    audioSource: "iTunes, Amazon Music (Spirited Soundtrack)",
    fileFormats: ["xLights (.xsq)", "FSEQ"],
    releaseDate: "2023-11",
    yearAdded: 2023,
    dominantColors: ["#f1c40f", "#e74c3c", "#ecf0f1"],
  },
];

// Helper to check if sequence is new (current year)
export function isNewSequence(
  sequence: Sequence,
  currentYear: number = 2026,
): boolean {
  return sequence.yearAdded === currentYear;
}

// Get sequences by year
export function getSequencesByYear(year: number): Sequence[] {
  return sequences.filter((s) => s.yearAdded === year);
}

// Get new sequences for current year
export function getNewSequences(currentYear: number = 2026): Sequence[] {
  return sequences.filter((s) => s.yearAdded === currentYear);
}

export function getSequenceBySlug(slug: string): Sequence | undefined {
  return sequences.find((s) => s.slug === slug);
}

export function getRelatedSequences(
  currentSlug: string,
  limit: number = 3,
): Sequence[] {
  const current = getSequenceBySlug(currentSlug);
  if (!current) return sequences.slice(0, limit);

  // Get sequences in the same category, excluding current
  const related = sequences
    .filter((s) => s.slug !== currentSlug && s.category === current.category)
    .slice(0, limit);

  // If not enough in same category, fill with others
  if (related.length < limit) {
    const others = sequences
      .filter((s) => s.slug !== currentSlug && s.category !== current.category)
      .slice(0, limit - related.length);
    return [...related, ...others];
  }

  return related;
}

export function getAllSlugs(): string[] {
  return sequences.map((s) => s.slug);
}
