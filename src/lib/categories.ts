/**
 * Canonical category buckets surfaced as filter chips in the screener.
 * Order = display order. "All" is a UI-only meta bucket.
 */
export const CATEGORIES = [
  "All",
  "Politics",
  "Macro",
  "Crypto",
  "AI/Tech",
  "Sports",
  "Weather",
  "Culture",
  "Health",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Order matters — first matching rule wins.
 * Strong/specific patterns appear first so they don't get stolen by
 * weaker keyword matches.
 */
const RULES: Array<[RegExp, Category]> = [
  // ===== SPORTS — strongest patterns first =====

  // Point spread, e.g. "Knicks (-1.5)", "Spurs (-4.5)"
  [/\(\s*[+\-]\s*\d+(\.\d+)?\s*\)/, "Sports"],

  // Over/under, e.g. "O/U 218.5", "Over 47.5", "Under 8.5"
  [/\b(O\/U|over\/under|over\s+\d+\.?\d*|under\s+\d+\.?\d*)\b/i, "Sports"],

  // Team A vs. Team B / Team A vs Team B (very common Polymarket sports format)
  [/\b\w[\w.]+\s+(vs|v)\.?\s+\w[\w.]+/i, "Sports"],

  // "Will [X] win on YYYY-MM-DD?" — Polymarket sports daily-game pattern
  [/win on \d{4}-\d{2}-\d{2}/i, "Sports"],

  // Soccer / football clubs by prefix or common name
  [
    /\b(FC|AC|AS|AFC|CF|CD|RB|SC|SK|RCD|SD|SL)\s+\w/i,
    "Sports",
  ],
  [
    /\b(arsenal|chelsea|liverpool|manchester|tottenham|west ham|newcastle|aston villa|leicester|everton|brighton|fulham|crystal palace|nottingham forest|wolves|brentford|bournemouth|southampton|leeds|burnley|sheffield|barcelona|real madrid|atletico|sevilla|valencia|villarreal|betis|athletic|girona|osasuna|celta|getafe|elche|alaves|las palmas|mallorca|rayo vallecano|juventus|inter|milan|napoli|roma|lazio|fiorentina|atalanta|torino|udinese|bologna|genoa|monza|sassuolo|empoli|verona|salernitana|bayern|dortmund|leipzig|leverkusen|frankfurt|stuttgart|wolfsburg|gladbach|hoffenheim|freiburg|union berlin|werder bremen|hertha|psg|paris saint|marseille|lyon|monaco|nice|lille|rennes|nantes|montpellier|strasbourg|reims|lens|brest|porto|benfica|sporting|braga|ajax|psv|feyenoord|az alkmaar|celtic|rangers|hibernian|olympiacos|panathinaikos|fenerbahce|galatasaray|besiktas|trabzonspor|red bull|salzburg|young boys|basel|copenhagen|club brugge|anderlecht|gent|standard liege|shakhtar|dynamo kyiv|spartak|zenit|cska|river plate|boca juniors|flamengo|palmeiras|santos|corinthians|sao paulo|gremio|internacional|atletico mineiro|tigres|club america|chivas|monterrey|cruz azul|pumas|toluca|santos laguna|los angeles fc|inter miami|seattle sounders|new york city fc|atlanta united|philadelphia union|columbus crew|portland timbers|nashville sc|chicago fire|new england|fc cincinnati|orlando city|toronto fc|montreal|d c united|charlotte fc|austin fc|fc dallas|houston dynamo|colorado rapids|sporting kansas city|minnesota united|real salt lake|vancouver whitecaps|st louis city|san jose earthquakes|whitecaps)\b/i,
    "Sports",
  ],

  // Major leagues / competitions
  [
    /\b(NBA|NFL|NHL|MLB|NCAA|MLS|EPL|premier league|champions league|europa league|conference league|FA cup|carabao cup|copa del rey|coppa italia|DFB pokar|DFB pokal|coupe de france|FIFA|UEFA|world cup|euro 20\d{2}|euros|copa america|africa cup|asian cup|gold cup|nations league|libertadores|sudamericana|J\s?league|K\s?league|saudi pro league|MLS cup|stanley cup|world series|super bowl|college football playoff|march madness|final four)\b/i,
    "Sports",
  ],

  // NBA teams
  [
    /\b(lakers|warriors|celtics|knicks|76ers|sixers|heat|nets|bulls|spurs|mavericks|rockets|thunder|timberwolves|pelicans|grizzlies|trail blazers|blazers|suns|kings|clippers|nuggets|jazz|magic|hornets|wizards|hawks|pistons|cavaliers|cavs|pacers|bucks|raptors)\b/i,
    "Sports",
  ],

  // MLB teams
  [
    /\b(yankees|red sox|mets|dodgers|giants|cubs|cardinals|pirates|astros|rangers|mariners|athletics|angels|padres|reds|brewers|twins|royals|white sox|tigers|guardians|indians|marlins|nationals|braves|phillies|orioles|blue jays|rays|rockies|diamondbacks|d\s?backs)\b/i,
    "Sports",
  ],

  // NFL teams
  [
    /\b(cowboys|patriots|eagles|steelers|49ers|packers|chiefs|bills|bengals|ravens|browns|jets|dolphins|texans|jaguars|titans|colts|broncos|raiders|chargers|vikings|lions|bears|falcons|buccaneers|saints|panthers|seahawks|rams|commanders)\b/i,
    "Sports",
  ],

  // NHL teams
  [
    /\b(maple leafs|bruins|penguins|capitals|lightning|senators|canadiens|sabres|devils|islanders|flyers|hurricanes|blue jackets|red wings|predators|stars|avalanche|wild|jets|blackhawks|blues|coyotes|golden knights|sharks|ducks|flames|oilers|canucks|kraken|utah hockey)\b/i,
    "Sports",
  ],

  // Tennis tournaments + tours
  [
    /\b(ATP|WTA|roland garros|wimbledon|US open|australian open|french open|madrid open|indian wells|miami open|cincinnati open|monte carlo|internazionali|BNL d'italia|laver cup|davis cup|billie jean king cup|ATP finals|WTA finals)\b/i,
    "Sports",
  ],

  // Esports
  [
    /\b(BO[1-9]|LCK|LCS|LEC|LPL|LoL|league of legends|valorant|counter\s?strike|CS\s?GO|dota|dota\s?2|overwatch|rocket league|hearthstone|starcraft|esports|IEM|ESL|TI\d|the international|worlds 20\d{2}|VCT|valorant champions tour|VRL|EWC|riot games)\b/i,
    "Sports",
  ],

  // Indian / cricket
  [
    /\b(IPL|indian premier league|test match|T20|ODI|cricket world cup|royal challengers|mumbai indians|chennai super kings|kolkata knight riders|delhi capitals|punjab kings|rajasthan royals|sunrisers hyderabad|gujarat titans|lucknow super giants)\b/i,
    "Sports",
  ],

  // Racing
  [
    /\b(F1|formula 1|formula one|NASCAR|moto\s?GP|indycar|le mans|monaco grand prix|grand prix|24 hours of daytona|24 hours of le mans)\b/i,
    "Sports",
  ],

  // Combat sports
  [
    /\b(UFC|MMA|fight night|boxing|heavyweight|lightweight|featherweight|middleweight|welterweight|bare knuckle)\b/i,
    "Sports",
  ],

  // Golf
  [
    /\b(PGA|LIV golf|the masters|US open golf|the open championship|british open|ryder cup|presidents cup|fedex cup)\b/i,
    "Sports",
  ],

  // Generic sports keywords
  [
    /\b(playoff|playoffs|finals|championship|stanley cup|tournament|game \d|match \d|set \d|quarter|halftime|kickoff|tipoff|first pitch)\b/i,
    "Sports",
  ],

  // Eurovision (cultural but team-flavored — let's call it Culture below)

  // ===== WEATHER =====
  [
    /\b(temperature|hottest|coldest|warmest|coolest|highest temp|lowest temp|snowfall|rainfall|hurricane|tornado|cyclone|typhoon|blizzard|heatwave|heat wave|drought|wildfire|el nino|la nina)\b/i,
    "Weather",
  ],
  [/\b\d+\s?°[CF]\b/, "Weather"],

  // ===== HEALTH =====
  [
    /\b(pandemic|epidemic|outbreak|virus|vaccine|FDA approval|FDA approve|disease|measles|ebola|zika|hantavirus|covid|sars|H5N1|bird flu|monkeypox|mpox|cancer drug|alzheimer)\b/i,
    "Health",
  ],

  // ===== CRYPTO =====
  [
    /\b(bitcoin|btc|ethereum|eth|crypto|solana|sol|cardano|ada|ripple|xrp|dogecoin|doge|shib|shiba|coin flip|coinbase|binance|kraken|stablecoin|stable coin|usdt|usdc|defi|nft|memecoin|meme coin)\b/i,
    "Crypto",
  ],

  // ===== AI / TECH =====
  [
    /\b(AI|artificial intelligence|AGI|GPT|LLM|openai|anthropic|claude|gemini|nvidia|robotics|robot|tesla|waymo|self\s?driving|autonomous vehicle|apple|google|microsoft|meta|amazon|software|chip|semiconductor|cloud|SaaS|startup|IPO|silicon valley)\b/i,
    "AI/Tech",
  ],

  // ===== POLITICS (incl. geopolitics) =====
  [
    /\b(election|president|senate|congress|trump|biden|harris|democrat|republican|gop|primary|caucus|impeach|supreme court|scotus|cabinet|secretary of state|attorney general|governor|mayor|parliament|prime minister|chancellor|kremlin|putin|zelensky|netanyahu|xi jinping|kim jong|saudi arabia|mohammed bin salman|iran|iranian|china|chinese|russia|russian|ukraine|israel|palestine|gaza|hamas|hezbollah|north korea|taiwan|invade|invasion|regime|peace deal|ceasefire|tariff|sanction|treaty|summit|UN|NATO|G7|G20|BRICS|EU|brexit|epstein|geopolitic)\b/i,
    "Politics",
  ],

  // ===== MACRO =====
  [
    /\b(fed|FOMC|federal reserve|interest rate|rate cut|rate hike|inflation|CPI|PPI|PCE|GDP|recession|unemployment|jobs report|payroll|nonfarm|treasury|bond|yield|gas price|oil price|brent|WTI|crude|opec|stock market|S\s?&\s?P 500|dow jones|nasdaq|russell|VIX|fortune 500|earnings|housing market|mortgage rate)\b/i,
    "Macro",
  ],

  // ===== CULTURE =====
  [
    /\b(oscar|academy award|grammy|emmy|tony award|golden globe|cannes|movie|film|netflix|hbo|disney|spotify|taylor swift|beyonce|kanye|drake|kendrick|elon musk|musk|tweet|x\.com|tiktok|instagram|youtube|streamer|influencer|celebrity|album|song|chart|imdb|rotten tomatoes|metacritic|box office|book sales|new york times bestseller|nobel prize|pulitzer|met gala|coachella|super bowl halftime|eurovision|miss universe|reality tv|the bachelor|survivor|love island)\b/i,
    "Culture",
  ],
];

/**
 * Map a free-form category string + question text to one of our buckets.
 * We test the combined haystack against ordered rules; first match wins.
 */
export function bucketize(
  category: string | null | undefined,
  question: string,
): Category {
  const haystack = `${category ?? ""} ${question}`;
  for (const [re, bucket] of RULES) {
    if (re.test(haystack)) return bucket;
  }
  return "Other";
}

// ============ Sidebar category tree (display labels + subcategories) ============

/**
 * Sidebar tree shown in the redesigned home view. `display` is the user-facing
 * label, `bucket` is the underlying bucketize() category, and `subs` are the
 * drill-down filters whose `match` regex is tested against question text.
 */
export type SubCategoryDef = { display: string; match: RegExp };
export type CategoryNode = {
  display: string;
  bucket: Category;
  subs: SubCategoryDef[];
};

export const CATEGORY_TREE: CategoryNode[] = [
  {
    display: "Politics",
    bucket: "Politics",
    subs: [
      { display: "Elections", match: /\b(election|primary|caucus|senate|congress|governor|president|presidential)\b/i },
      { display: "Trump", match: /\btrump\b/i },
      { display: "World", match: /\b(ukraine|russia|israel|gaza|hamas|iran|china|taiwan|north korea|nato|EU|brexit|putin|netanyahu|zelensky|xi jinping)\b/i },
      { display: "Policy", match: /\b(supreme court|scotus|tariff|sanction|treaty|cabinet|impeach|legislation|bill|executive order)\b/i },
    ],
  },
  {
    display: "Sports",
    bucket: "Sports",
    subs: [
      { display: "NBA", match: /\b(NBA|lakers|warriors|celtics|knicks|76ers|sixers|heat|nets|bulls|spurs|mavericks|rockets|thunder|timberwolves|pelicans|grizzlies|blazers|suns|kings|clippers|nuggets|jazz|magic|hornets|wizards|hawks|pistons|cavaliers|cavs|pacers|bucks|raptors)\b/i },
      { display: "NFL", match: /\b(NFL|super bowl|cowboys|patriots|eagles|steelers|49ers|packers|chiefs|bills|bengals|ravens|browns|jets|dolphins|texans|jaguars|titans|colts|broncos|raiders|chargers|vikings|lions|bears|falcons|buccaneers|saints|panthers|seahawks|rams|commanders)\b/i },
      { display: "MLB", match: /\b(MLB|world series|yankees|red sox|mets|dodgers|giants|cubs|cardinals|pirates|astros|rangers|mariners|athletics|angels|padres|reds|brewers|twins|royals|white sox|tigers|guardians|marlins|nationals|braves|phillies|orioles|blue jays|rays|rockies|diamondbacks)\b/i },
      { display: "NHL", match: /\b(NHL|stanley cup|maple leafs|bruins|penguins|capitals|lightning|senators|canadiens|sabres|devils|islanders|flyers|hurricanes|blue jackets|red wings|predators|stars|avalanche|wild|blackhawks|blues|coyotes|golden knights|sharks|ducks|flames|oilers|canucks|kraken)\b/i },
      { display: "Soccer", match: /\b(soccer|MLS|EPL|premier league|champions league|world cup|UEFA|FIFA|la liga|bundesliga|serie A|arsenal|chelsea|liverpool|manchester|barcelona|real madrid|juventus|bayern|PSG)\b/i },
      { display: "Tennis", match: /\b(ATP|WTA|wimbledon|US open|australian open|french open|roland garros|tennis|djokovic|alcaraz|sinner|swiatek|sabalenka)\b/i },
      { display: "MMA / UFC", match: /\b(UFC|MMA|fight night|boxing)\b/i },
      { display: "Golf", match: /\b(PGA|LIV golf|the masters|ryder cup|fedex cup|golf)\b/i },
      { display: "F1 / Racing", match: /\b(F1|formula 1|NASCAR|moto\s?GP|indycar|grand prix)\b/i },
      { display: "Esports", match: /\b(LoL|league of legends|valorant|counter\s?strike|CSGO|dota|esports|the international|VCT)\b/i },
      { display: "Cricket", match: /\b(IPL|cricket|T20|ODI)\b/i },
    ],
  },
  {
    display: "Finance",
    bucket: "Macro",
    subs: [
      { display: "Fed / Rates", match: /\b(fed|FOMC|federal reserve|interest rate|rate cut|rate hike)\b/i },
      { display: "Inflation", match: /\b(inflation|CPI|PPI|PCE)\b/i },
      { display: "Stocks", match: /\b(stock market|S\s?&\s?P 500|dow jones|nasdaq|russell|VIX|earnings|IPO)\b/i },
      { display: "Recession / Jobs", match: /\b(recession|unemployment|jobs report|payroll|nonfarm|GDP)\b/i },
      { display: "Commodities", match: /\b(gas price|oil price|brent|WTI|crude|opec|gold|silver)\b/i },
    ],
  },
  {
    display: "Crypto",
    bucket: "Crypto",
    subs: [
      { display: "Bitcoin", match: /\b(bitcoin|BTC)\b/i },
      { display: "Ethereum", match: /\b(ethereum|ETH)\b/i },
      { display: "Solana", match: /\b(solana|SOL)\b/i },
      { display: "Other coins", match: /\b(cardano|ADA|ripple|XRP|doge|dogecoin|shib|shiba|memecoin|meme coin|altcoin)\b/i },
      { display: "Exchanges / Stables", match: /\b(coinbase|binance|kraken|stablecoin|stable coin|USDT|USDC|defi|NFT)\b/i },
    ],
  },
  {
    display: "Science & Tech",
    bucket: "AI/Tech",
    subs: [
      { display: "AI", match: /\b(AI|artificial intelligence|AGI|GPT|LLM|openai|anthropic|claude|gemini)\b/i },
      { display: "Big Tech", match: /\b(apple|google|microsoft|meta|amazon|nvidia|tesla)\b/i },
      { display: "Space", match: /\b(spacex|starship|mars|nasa|moon|rocket|satellite)\b/i },
      { display: "Robotics / Autos", match: /\b(robotics|robot|waymo|self\s?driving|autonomous vehicle)\b/i },
    ],
  },
  {
    display: "Entertainment",
    bucket: "Culture",
    subs: [
      { display: "Awards", match: /\b(oscar|academy award|grammy|emmy|tony award|golden globe|cannes|nobel prize|pulitzer)\b/i },
      { display: "Movies / TV", match: /\b(movie|film|netflix|hbo|disney|box office|imdb|rotten tomatoes|reality tv|bachelor|survivor|love island)\b/i },
      { display: "Music", match: /\b(taylor swift|beyonce|kanye|drake|kendrick|album|song|chart|spotify|coachella|met gala)\b/i },
      { display: "Celebrity", match: /\b(elon musk|musk|tweet|kardashian|celebrity|influencer)\b/i },
    ],
  },
  { display: "Weather", bucket: "Weather", subs: [] },
  { display: "Health", bucket: "Health", subs: [] },
  { display: "Other", bucket: "Other", subs: [] },
];

/** Classify a row into its subcategory within its bucket. Null if none match. */
export function subBucketize(bucket: Category, question: string): string | null {
  const node = CATEGORY_TREE.find((n) => n.bucket === bucket);
  if (!node) return null;
  for (const s of node.subs) {
    if (s.match.test(question)) return s.display;
  }
  return null;
}
