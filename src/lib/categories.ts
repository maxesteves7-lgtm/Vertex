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

  // ===== SOFTER FALLBACKS =====
  // The rules above lock in the high-confidence cases. The rules below sweep
  // the long tail so events don't fall into "Other" just because they're
  // phrased unusually (Will / number / threshold / above-or-below / etc.).

  // Politics — looser tier
  [
    /\b(approve|approval rating|veto|filibuster|debate|debate stage|polling|poll|polls|polled|incumbent|reelect|re-elect|run for|drop out|dropout|nominee|nominat|candidate|swing state|battleground|electoral|electoral college|first term|second term|term limit|midterm|primary debate|hush money|indict|indictment|prosecut|convict|guilty|acquit|verdict|jury|grand jury|trial|deposition|subpoena|witness|conspiracy|bribe|whistleblow|leak|leaked|classified|fbi|cia|nsa|doj|department of justice|gerrymander|redistrict|ballot|referendum|abortion|roe v wade|gun control|second amendment|first amendment|immigration|border|asylum|deport|migrant|visa|H-?1B)\b/i,
    "Politics",
  ],

  // Macro / Finance — looser tier
  [
    /\b(basis points|bps|rate decision|rate hold|rate pause|debt ceiling|deficit|surplus|budget|spending bill|continuing resolution|shutdown|government shutdown|bailout|merger|acquisition|M\s?&\s?A|spin-?off|buyback|dividend|short squeeze|short interest|day trading|after hours|premarket|consumer confidence|retail sales|durable goods|housing starts|new home sales|existing home sales|jobless claims|wage growth|labor market|tightening|easing|hawkish|dovish|yield curve|inversion|tnx|tlt|treasuries|junk bond|investment grade|credit spread|euro|yen|yuan|dollar index|DXY|currency|forex)\b/i,
    "Macro",
  ],

  // Crypto — looser tier
  [
    /\b(altcoin|hodl|halving|mining|miner|hash rate|hashrate|ledger|wallet|seed phrase|gas fee|gwei|cold storage|cold wallet|hot wallet|defi|nft|tokenomics|airdrop|smart contract|spot ETF|crypto ETF|BlackRock ETF|grayscale|tether|circle|FTX|SBF|sam bankman|coinbase listing|launchpad)\b/i,
    "Crypto",
  ],

  // AI/Tech — looser tier
  [
    /\b(machine learning|deep learning|model card|benchmark|benchmar|MMLU|HumanEval|SWE-?bench|training run|RLHF|fine-?tun|inference|transformer|diffusion|stable diffusion|midjourney|sora|veo|imagen|grok|copilot|cursor|github copilot|datacenter|data center|GPU|H100|H200|B200|MI300|chip ban|semiconductor|TSMC|ARM|founders fund|y combinator|YC|series A|series B|series C|valuation|unicorn|tech IPO|cybersecurity|ransomware|data breach|hack|hacker|hacked|zero day|0\s?day|quantum|gene|crispr|genome|biotech|brain chip|neuralink)\b/i,
    "AI/Tech",
  ],

  // Sports — looser tier
  [
    /\b(MVP|rookie of the year|defensive player|coach of the year|player of the week|hall of fame|all-?star|all star|comeback player|injury|injured|out for season|won|wins|loses|defeat|defeats|win the|win by|cover the spread|sweep|swept|series|game \d|halftime score|final score|over\/under|moneyline|prop bet|prop market|first to score|first goal|first basket|home run|touchdown|interception|knockout|TKO|submission|decision|points scored|yards|rushing|passing|points|goals|assists|hat trick|no-?hitter|perfect game|grand slam|breakaway|odds boost|parlay)\b/i,
    "Sports",
  ],

  // Culture / entertainment — looser tier
  [
    /\b(podcast|joe rogan|JRE|kim kardashian|kanye west|jeff bezos|mr beast|mrbeast|youtuber|tiktoker|streamer|kai cenat|adin ross|hasan|ishowspeed|logan paul|jake paul|paul brothers|wedding|engaged|divorce|breakup|baby|pregnant|child|adopt|memoir|biography|biopic|series finale|reboot|spinoff|prequel|sequel|trilogy|cinematic universe|MCU|marvel|DCEU|DC|star wars|harry potter|game of thrones|breaking bad|stranger things|squid game|last of us|tv show|book deal|book sales|bestseller|new york times bestseller|grammy nominat|oscar nominat|emmy nominat)\b/i,
    "Culture",
  ],

  // Weather / climate — looser tier
  [
    /\b(climate|global warming|sea level|ice cap|glacier|polar vortex|wind speed|storm surge|category \d hurricane|cat-?\d hurricane|tropical storm|tropical depression|jet stream|atmospheric river|air quality|AQI|smog|wildfire|fire season)\b/i,
    "Weather",
  ],

  // Health — looser tier
  [
    /\b(drug approval|clinical trial|phase \d trial|phase[123]\b|biosimilar|generic drug|patent expir|insurance|medicare|medicaid|ACA|obamacare|public option|single payer|surgeon general|CDC|NIH|WHO|world health|hospital|emergency room|ICU|nursing shortage|nurse strike|opioid|fentanyl|overdose|addiction|sober|mental health|suicide rate|life expectancy|obesity|diabetes|heart disease|stroke|cancer screening|cancer trial|GLP-?1|ozempic|wegovy|mounjaro|insulin price)\b/i,
    "Health",
  ],

  // Sports / events — generic team match phrasing missed earlier
  [
    /\b(vs\.?|@)\s+[A-Z][a-z]+/, // "Lakers vs Celtics", "Yankees @ Red Sox"
    "Sports",
  ],

  // Anything with "team" / "league" / "season" / "playoff" — Sports
  [
    /\b(team|league|season opener|opening day|playoff seed|wild card|champion|runner-?up|finalist|finalists)\b/i,
    "Sports",
  ],

  // Trump / Biden / political figure mentioned anywhere → Politics
  [
    /\b(trump|biden|harris|obama|clinton|romney|desantis|newsom|vance|pence|musk for|musk runs|musk president|RFK|kennedy|sanders|warren|AOC|MTG|hakeem jeffries|chuck schumer|mitch mcconnell|kevin mccarthy|mike johnson|nancy pelosi|john thune|jd vance)\b/i,
    "Politics",
  ],

  // "Will X reach $Y" with stock-ticker-shaped tokens → Macro
  [
    /\$[A-Z]{1,5}\b/, // e.g. $TSLA, $AAPL, $SPY
    "Macro",
  ],

  // Box office, gross, opening weekend → Culture
  [
    /\b(opening weekend|gross|domestic gross|worldwide gross|box office|streaming numbers|viewers|ratings|nielsen)\b/i,
    "Culture",
  ],

  // ===== EVEN BROADER GAP-FILLERS (third pass) =====
  // The patterns above still leave a long tail. Below are the cheapest, most
  // high-recall catches we can write to mop up whatever's still bucketed as
  // Other. Order matters — strongest signals first.

  // International elections / governments / world leaders → Politics
  [
    /\b(german|france|french|italian|spanish|UK|british|indian|brazilian|argentin|mexican|canadian|japanese|korean|australian|nigerian|saudi|turkish|egyptian|pakistani|indonesian|vietnamese|thai|chilean|colombian|peruvian|cuban|venezuelan|polish|ukrainian|russian|chinese|taiwanese|israeli|palestinian|lebanese|syrian|iraqi|iranian|afghan|yemen|ethiopian|kenyan|ghan(a|aian))\s+(election|government|parliament|chancellor|presiden|prime minister|opposition|polls|coalition|coup|cabinet|leader)/i,
    "Politics",
  ],
  [
    /\b(modi|macron|merkel|scholz|meloni|sunak|starmer|johnson|truss|albanese|lula|bolsonaro|milei|maduro|amlo|sheinbaum|orban|erdogan|al[-\s]sissi|mbs|salman|kishida|yoon|kim jong|xi jinping|putin|zelensky|netanyahu|abbas|sinwar|nasrallah|khamenei|raisi)\b/i,
    "Politics",
  ],
  [
    /\b(coup|junta|regime change|civil war|insurg|paramilitar|guerrilla|cartel|mafia|opposition leader|exile|asylum seeker|coup d'?etat|state of emergency|martial law)\b/i,
    "Politics",
  ],
  // US gov/agency acronyms catch
  [
    /\b(EPA|SEC|FCC|FTC|IRS|TSA|ICE|DHS|VA|HUD|DOD|pentagon|state department|treasury department)\b/i,
    "Politics",
  ],

  // Olympics / Paralympics / extreme sports / minor sports → Sports
  [
    /\b(olympic|olympics|paralympic|paralympics|olympia|summer games|winter games|gold medal|silver medal|bronze medal|medal count|podium|host city|IOC)\b/i,
    "Sports",
  ],
  [
    /\b(swim|swimmer|freestyle|butterfly|backstroke|breaststroke|sprint|hurdles|decathlon|heptathlon|long jump|high jump|pole vault|shot put|discus|javelin|gymnast|figure skat|speed skat|ski|skier|skiing|snowboard|biathlon|bobsled|luge|curling|rowing|cycling|peloton|tour de france|giro|vuelta|cricket|rugby|aussie rules|AFL|NRL|cricket world cup|netball|handball|water polo|polo|equestrian|sailing|surfing|skateboard|chess|checkers|backgammon|poker|world series of poker|WSOP)\b/i,
    "Sports",
  ],
  // Specific star athletes (broad)
  [
    /\b(messi|ronaldo|mbapp[ée]|haaland|neymar|salah|de bruyne|son heung|kane|lewandowski|griezmann|modric|benzema|martinez|alvarez|caicedo|bellingham|saka|vinicius|rodrygo|valverde|kvaratskhelia|osimhen|lautaro|gvardiol|hojlund|kobbie mainoo|garnacho|alcaraz|sinner|djokovic|nadal|federer|swiatek|sabalenka|gauff|rybakina|jabeur|pegula|tiafoe|fritz|shelton|musetti|rune|tsitsipas|medvedev|zverev|rublev|hurkacz|berrettini|de mina|jokic|embiid|giannis|antetokounmpo|luka|doncic|tatum|brown|holiday|porzingis|durant|booker|beal|harden|kawhi|leonard|paul george|lebron|davis|ja morant|zion|edwards|towns|gobert|murray|jamal murray|jokic|aaron rodgers|patrick mahomes|josh allen|joe burrow|jayden daniels|caleb williams|drake maye|lamar jackson|kyler murray|trevor lawrence|justin herbert|jalen hurts|dak prescott|matt stafford|cousins|geno smith|tua tagovailoa|brock purdy|christian mccaffrey|saquon barkley|derrick henry|nick chubb|justin jefferson|ja'?marr chase|tyreek hill|cee?dee lamb|davante adams|deebo samuel|stefon diggs|aaron judge|shohei ohtani|mike trout|mookie betts|freddie freeman|juan soto|ronald acuna|kyle tucker|jose ramirez|jose altuve|bryce harper|trea turner|gerrit cole|spencer strider|paul skenes|shota imanaga|yoshinobu yamamoto|connor mcdavid|leon draisaitl|auston matthews|nathan mackinnon|nikita kucherov|cale makar|elias pettersson|connor bedard|sidney crosby|alex ovechkin|conor mcgregor|jon jones|israel adesanya|alex pereira|max holloway|charles oliveira|sean strickland|ilia topuria|dustin poirier|justin gaethje|francis ngannou|tyson fury|deontay wilder|anthony joshua|oleksandr usyk|canelo|david benavidez|shakur stevenson|terence crawford|ryan garcia|gervonta davis|naoya inoue)\b/i,
    "Sports",
  ],
  [
    /\b(coach|manager|head coach|hc|interim coach|firing|fired|hired|signing|signs|trade|traded|drafted|draft pick|first round pick|cap space|free agent|free agency|tampering|tampered|extension|contract extension|salary|salary cap|holdout|hold-?out|retire|retirement|return|comeback|injured reserve|IR|day-to-?day|questionable|probable|game-?time decision|inactive)\b/i,
    "Sports",
  ],
  // Generic "Will [team-shaped] win/beat/defeat" — capitalized noun + sports verb
  [
    /\b(beat|defeat|cover|win|sweep|advance|eliminate|knockout|outlast|overtake|outscore)\b.{0,40}\b(today|tonight|tomorrow|this week|this season)\b/i,
    "Sports",
  ],

  // Companies / CEOs / tech products beyond the prior list → AI/Tech
  [
    /\b(reddit|snap|snapchat|pinterest|shopify|salesforce|oracle|adobe|intuit|paypal|stripe|spacex|starlink|tesla|rivian|lucid|byd|nio|xpeng|ford|gm|gm cruise|nvidia|amd|intel|qualcomm|samsung|sony|netflix|hulu|disney\+|paramount\+|peacock|airbnb|uber|lyft|doordash|instacart|robinhood|coinbase|palantir|databricks|openai|anthropic|x ai|xai|grok|midjourney|runway|character\.ai|hugging face|notion|linear|figma|canva|atlassian|github|gitlab|cloudflare|datadog|snowflake|mongodb|elastic|servicenow|workday|zoom|slack|asana|trello|monday\.com)\b/i,
    "AI/Tech",
  ],
  [
    /\b(CEO of|step down as CEO|resign as CEO|fire CEO|replace CEO|new CEO|next CEO|interim CEO|founder|cofounder|co-?founder|chairman|chairwoman|chairperson|board member|board of directors|product launch|ship date|ship in|release date|version \d|v\d+(\.\d+)?|beta|alpha|GA release|general availability|API release|model release|trained model|frontier model)\b/i,
    "AI/Tech",
  ],

  // Crypto altcoins / DeFi protocols → Crypto
  [
    /\b(LTC|litecoin|polkadot|DOT|avalanche|AVAX|MATIC|polygon|chainlink|LINK|uniswap|UNI|aave|compound|sushi|maker|MKR|cosmos|ATOM|near protocol|near|aptos|APT|sui|hbar|hedera|stellar|XLM|tron|TRX|monero|XMR|zcash|ZEC|filecoin|FIL|theta|kaspa|KAS|bittensor|TAO|render|RNDR|pepe|pepecoin|wif|dogwifhat|bonk|floki|memecoin|presale|launchpad|liquidity pool|liquidity pair|TVL|total value locked|stable depeg|de-?peg|bridge hack|rug pull|rugpull)\b/i,
    "Crypto",
  ],

  // More music / TV / pop culture → Culture
  [
    /\b(sabrina carpenter|olivia rodrigo|chappell roan|charli xcx|charli\s?xcx|doja cat|sza|billie eilish|ariana grande|dua lipa|rihanna|adele|harry styles|bad bunny|karol g|peso pluma|j balvin|shakira|bts|blackpink|jungkook|jimin|jin|stray kids|newjeans|ITZY|aespa|tyler the creator|tyler, the creator|the weeknd|frank ocean|kanye|kid cudi|young thug|future|metro boomin|playboi carti|gunna|21 savage|lil baby|nicki minaj|cardi b|megan thee stallion|ice spice|latto|saweetie|kim petras|lana del rey|lorde|mitski|phoebe bridgers|boygenius|maggie rogers|HBO max|max|apple tv|amazon prime|prime video|paramount\+|paramount plus|peacock|tubi|crunchyroll|criterion|A24|blumhouse|warner bros|warner brothers|paramount pictures|universal pictures|columbia pictures|legendary|sony pictures|mgm|amc|cinemark|regal|wonka|barbie|oppenheimer|dune|avatar|the batman|killers of the flower moon|past lives|anatomy of a fall|poor things|zone of interest|holdovers|tár|tar movie|everything everywhere|the bear|succession|white lotus|euphoria|the boys|wednesday|outer banks|emily in paris|bridgerton|cobra kai|never have i ever|severance|silo|reacher|jack ryan|the marvelous mrs maisel|ted lasso|abbott elementary|saturday night live|SNL|the office|parks and rec|seinfeld|friends|reunion|special|miniseries|limited series)\b/i,
    "Culture",
  ],

  // Concerts / tours / festivals / venues → Culture
  [
    /\b(tour|world tour|setlist|tickets sold|ticket sales|stadium|arena|sold out|coachella|lollapalooza|bonnaroo|burning man|sxsw|south by southwest|tribeca|toronto film festival|venice film festival|sundance|telluride|comic-?con|met gala|VMA|video music awards)\b/i,
    "Culture",
  ],

  // Stocks / IPOs without ticker syntax → Macro
  [
    /\b(market cap|all-?time high|ATH|fifty-?two week high|52-?week high|52-?week low|delist|de-?list|trading halt|circuit breaker|short report|short seller|put options|call options|implied volatility|gamma squeeze|options chain|expiry|expiration|exercise|notional|cash settlement)\b/i,
    "Macro",
  ],
  // Major non-US central banks
  [
    /\b(ECB|european central bank|BOE|bank of england|BOJ|bank of japan|PBOC|peoples bank of china|RBA|reserve bank of australia|RBI|reserve bank of india|bank of canada|swiss national bank|SNB|riksbank|norges bank|banxico)\b/i,
    "Macro",
  ],

  // Disease outbreaks / FDA actions → Health
  [
    /\b(measles outbreak|polio|mers|chikungun|dengue|malaria|tuberculosis|TB outbreak|monkeypox|mpox|hantavirus|listeria|salmonella|e coli|E\.\s?coli|food poison|food recall|product recall|FDA recall|class \w recall)\b/i,
    "Health",
  ],

  // Earthquakes / volcano / natural disaster → Weather
  [
    /\b(earthquake|magnitude \d|aftershock|tsunami|volcano|volcanic|eruption|lava|ash plume|asteroid|meteor|solar flare|geomagnetic storm|aurora|solar eclipse|lunar eclipse|northern lights)\b/i,
    "Weather",
  ],
];

/**
 * Map a free-form category string + question text to one of our buckets.
 * We test the combined haystack against ordered rules; first match wins.
 * If no rule matches, fall through to a heuristic guess — by policy we
 * NEVER return "Other" from this function. Every market gets a category.
 */
export function bucketize(
  category: string | null | undefined,
  question: string,
): Category {
  const haystack = `${category ?? ""} ${question}`;
  for (const [re, bucket] of RULES) {
    if (re.test(haystack)) return bucket;
  }
  return heuristicGuess(haystack);
}

/**
 * Final-resort classifier. The rules above carry a sharp signal; this is
 * the soft net. Each branch checks for a family of features (country names,
 * monetary signals, sports verbs, etc.) and routes to the most plausible
 * real category. Default falls to Culture, which absorbs the long tail of
 * "Will [random celebrity / random object / random event] happen?" markets.
 */
function heuristicGuess(haystack: string): Category {
  const t = haystack.toLowerCase();

  // Politics-ish: country/region words, vote/policy phrasing, world leaders
  if (
    /\b(elect|election|vote|voter|polled|polls?|approval|government|president|prime minister|chancellor|policy|policies|treaty|sanction|tariff|geopolitic|war|invasion|peace|ceasefire|hostage|prisoner|protest|riot|coup|regime|leader|reelect|resign|impeach|incumbent|legislat|congress|senate|parliament)\b/.test(
      t,
    )
  ) {
    return "Politics";
  }
  if (
    /\b(germany|france|italy|spain|britain|UK|england|scotland|wales|ireland|netherlands|belgium|sweden|norway|denmark|finland|poland|ukraine|russia|china|taiwan|hong kong|india|pakistan|bangladesh|sri lanka|japan|south korea|north korea|indonesia|philippines|vietnam|thailand|malaysia|singapore|australia|new zealand|brazil|argentina|mexico|chile|peru|colombia|venezuela|cuba|haiti|jamaica|canada|nigeria|south africa|kenya|ethiopia|ghana|egypt|morocco|algeria|tunisia|libya|sudan|saudi arabia|UAE|united arab emirates|qatar|israel|palestine|gaza|west bank|lebanon|syria|iraq|iran|afghanistan|yemen|turkey|greece)\b/.test(
      t,
    )
  ) {
    return "Politics";
  }

  // Crypto-ish
  if (
    /\b(coin|token|protocol|defi|web3|chain|airdrop|tokenized|onchain|on-chain|wallet|gas fee|mempool|nft|stake|staking|validator|miner|hashrate|halving|hodl|altcoin|memecoin|stablecoin)\b/.test(
      t,
    )
  ) {
    return "Crypto";
  }

  // Sports-ish — actions, scoring, brackets
  if (
    /\b(beat|defeat|score|goal|points|yards|rebounds|assists|home run|touchdown|knockout|finalist|championship|champion|league|match|game|tournament|race|sprint|marathon|qualif|qualifier|semifinal|final|round \d|stage \d|leg \d|set \d|frame \d|wicket|over \d+\.?\d*|under \d+\.?\d*|vs\.?|versus|outscore|outshoot|outdraw)\b/.test(
      t,
    )
  ) {
    return "Sports";
  }

  // Macro / finance-ish
  if (
    /(\$|%|bps|basis point|stock|equity|equities|bond|yield|rate|inflation|deflation|earnings|revenue|profit|loss|bankrupt|valuation|billion|trillion|million|economy|recession|GDP|payroll|jobs|unemployment|index|fund|ETF|ETN|treasury|treasuries|sovereign|debt|commodity|gold|silver|copper|crude|oil|brent|natural gas|wheat|corn|soybean|cattle|fed|FOMC|central bank)/.test(
      t,
    )
  ) {
    return "Macro";
  }

  // AI/Tech-ish
  if (
    /\b(AI|model|GPT|LLM|agent|app|launch|release|product|company|founder|CEO|startup|tech|software|hardware|chip|cloud|browser|operating system|os|platform|update|version|API|SDK|robotics|robot|drone|autonomous|driverless)\b/.test(
      t,
    )
  ) {
    return "AI/Tech";
  }

  // Health-ish
  if (
    /\b(virus|disease|patient|treatment|drug|medication|surgery|doctor|hospital|epidemic|outbreak|vaccine|symptom|cure|approval|trial|clinical)\b/.test(
      t,
    )
  ) {
    return "Health";
  }

  // Weather-ish
  if (
    /\b(temperature|weather|storm|rain|snow|wind|heat|cold|hurricane|tornado|tropical|forecast|degrees|°|fahrenheit|celsius|sea level|drought|flood)\b/.test(
      t,
    )
  ) {
    return "Weather";
  }

  // Money / "above $X" / "reach $X" phrasing — usually a market price or
  // valuation question → Macro
  if (/\$\s?\d/.test(t)) return "Macro";

  // "Will [proper noun(s)] do something" with a year or question mark — the
  // long tail of cultural/event markets — bucket as Culture.
  return "Culture";
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
  // "Other" intentionally omitted — bucketize() now uses a heuristic
  // fallback so no row ever ends up here. If anything ever did, it'd be
  // invisible in the sidebar but still findable via search.
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
