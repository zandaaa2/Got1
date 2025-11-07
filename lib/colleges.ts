/**
 * College/University data for scout organization selection
 * Logos fetched via Clearbit Logo API using school domain
 */

export interface College {
  name: string
  domain: string // Used to fetch logo from Clearbit
  conference?: string
  division?: string
}

export const colleges: College[] = [
  // SEC
  { name: 'Auburn University', domain: 'auburn.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Alabama', domain: 'ua.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Georgia', domain: 'uga.edu', conference: 'SEC', division: 'D1' },
  { name: 'Louisiana State University', domain: 'lsu.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Florida', domain: 'ufl.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Tennessee', domain: 'utk.edu', conference: 'SEC', division: 'D1' },
  { name: 'Texas A&M University', domain: 'tamu.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Missouri', domain: 'missouri.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of South Carolina', domain: 'sc.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Kentucky', domain: 'uky.edu', conference: 'SEC', division: 'D1' },
  { name: 'Vanderbilt University', domain: 'vanderbilt.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Mississippi', domain: 'olemiss.edu', conference: 'SEC', division: 'D1' },
  { name: 'Mississippi State University', domain: 'msstate.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Arkansas', domain: 'uark.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Oklahoma', domain: 'ou.edu', conference: 'SEC', division: 'D1' },
  { name: 'University of Texas', domain: 'utexas.edu', conference: 'SEC', division: 'D1' },
  
  // Big Ten
  { name: 'Ohio State University', domain: 'osu.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'University of Michigan', domain: 'umich.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'Penn State University', domain: 'psu.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'University of Wisconsin', domain: 'wisc.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'University of Iowa', domain: 'uiowa.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'Northwestern University', domain: 'northwestern.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'Michigan State University', domain: 'msu.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'Indiana University', domain: 'indiana.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'Purdue University', domain: 'purdue.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'University of Minnesota', domain: 'umn.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'University of Nebraska', domain: 'unl.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'University of Illinois', domain: 'illinois.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'Rutgers University', domain: 'rutgers.edu', conference: 'Big Ten', division: 'D1' },
  { name: 'University of Maryland', domain: 'umd.edu', conference: 'Big Ten', division: 'D1' },
  
  // ACC
  { name: 'Clemson University', domain: 'clemson.edu', conference: 'ACC', division: 'D1' },
  { name: 'Florida State University', domain: 'fsu.edu', conference: 'ACC', division: 'D1' },
  { name: 'University of Miami', domain: 'miami.edu', conference: 'ACC', division: 'D1' },
  { name: 'University of North Carolina', domain: 'unc.edu', conference: 'ACC', division: 'D1' },
  { name: 'NC State University', domain: 'ncsu.edu', conference: 'ACC', division: 'D1' },
  { name: 'Duke University', domain: 'duke.edu', conference: 'ACC', division: 'D1' },
  { name: 'Wake Forest University', domain: 'wfu.edu', conference: 'ACC', division: 'D1' },
  { name: 'Virginia Tech', domain: 'vt.edu', conference: 'ACC', division: 'D1' },
  { name: 'University of Virginia', domain: 'virginia.edu', conference: 'ACC', division: 'D1' },
  { name: 'University of Pittsburgh', domain: 'pitt.edu', conference: 'ACC', division: 'D1' },
  { name: 'Syracuse University', domain: 'syracuse.edu', conference: 'ACC', division: 'D1' },
  { name: 'Boston College', domain: 'bc.edu', conference: 'ACC', division: 'D1' },
  { name: 'Georgia Tech', domain: 'gatech.edu', conference: 'ACC', division: 'D1' },
  { name: 'University of Louisville', domain: 'louisville.edu', conference: 'ACC', division: 'D1' },
  
  // Big 12
  { name: 'Baylor University', domain: 'baylor.edu', conference: 'Big 12', division: 'D1' },
  { name: 'Texas Tech University', domain: 'ttu.edu', conference: 'Big 12', division: 'D1' },
  { name: 'Texas Christian University', domain: 'tcu.edu', conference: 'Big 12', division: 'D1' },
  { name: 'University of Kansas', domain: 'ku.edu', conference: 'Big 12', division: 'D1' },
  { name: 'Kansas State University', domain: 'ksu.edu', conference: 'Big 12', division: 'D1' },
  { name: 'Oklahoma State University', domain: 'okstate.edu', conference: 'Big 12', division: 'D1' },
  { name: 'Iowa State University', domain: 'iastate.edu', conference: 'Big 12', division: 'D1' },
  { name: 'West Virginia University', domain: 'wvu.edu', conference: 'Big 12', division: 'D1' },
  
  // Pac-12
  { name: 'University of Southern California', domain: 'usc.edu', conference: 'Pac-12', division: 'D1' },
  { name: 'University of California, Los Angeles', domain: 'ucla.edu', conference: 'Pac-12', division: 'D1' },
  { name: 'Stanford University', domain: 'stanford.edu', conference: 'Pac-12', division: 'D1' },
  { name: 'University of Oregon', domain: 'uoregon.edu', conference: 'Pac-12', division: 'D1' },
  { name: 'University of Washington', domain: 'uw.edu', conference: 'Pac-12', division: 'D1' },
  { name: 'University of Utah', domain: 'utah.edu', conference: 'Pac-12', division: 'D1' },
  { name: 'University of Colorado', domain: 'colorado.edu', conference: 'Pac-12', division: 'D1' },
  { name: 'University of Arizona', domain: 'arizona.edu', conference: 'Pac-12', division: 'D1' },
  { name: 'Arizona State University', domain: 'asu.edu', conference: 'Pac-12', division: 'D1' },
  
  // Other major programs
  { name: 'University of Notre Dame', domain: 'nd.edu', conference: 'Independent', division: 'D1' },
  { name: 'Brigham Young University', domain: 'byu.edu', conference: 'Big 12', division: 'D1' },
  { name: 'University of Central Florida', domain: 'ucf.edu', conference: 'Big 12', division: 'D1' },
  { name: 'University of Cincinnati', domain: 'uc.edu', conference: 'Big 12', division: 'D1' },
  { name: 'University of Houston', domain: 'uh.edu', conference: 'Big 12', division: 'D1' },
  { name: 'Southern Methodist University', domain: 'smu.edu', conference: 'ACC', division: 'D1' },
  
  // NFL Teams
  { name: 'Arizona Cardinals', domain: 'azcardinals.com', conference: 'NFL', division: 'NFC West' },
  { name: 'Atlanta Falcons', domain: 'atlantafalcons.com', conference: 'NFL', division: 'NFC South' },
  { name: 'Baltimore Ravens', domain: 'baltimoreravens.com', conference: 'NFL', division: 'AFC North' },
  { name: 'Buffalo Bills', domain: 'buffalobills.com', conference: 'NFL', division: 'AFC East' },
  { name: 'Carolina Panthers', domain: 'panthers.com', conference: 'NFL', division: 'NFC South' },
  { name: 'Chicago Bears', domain: 'chicagobears.com', conference: 'NFL', division: 'NFC North' },
  { name: 'Cincinnati Bengals', domain: 'bengals.com', conference: 'NFL', division: 'AFC North' },
  { name: 'Cleveland Browns', domain: 'clevelandbrowns.com', conference: 'NFL', division: 'AFC North' },
  { name: 'Dallas Cowboys', domain: 'dallascowboys.com', conference: 'NFL', division: 'NFC East' },
  { name: 'Denver Broncos', domain: 'denverbroncos.com', conference: 'NFL', division: 'AFC West' },
  { name: 'Detroit Lions', domain: 'detroitlions.com', conference: 'NFL', division: 'NFC North' },
  { name: 'Green Bay Packers', domain: 'packers.com', conference: 'NFL', division: 'NFC North' },
  { name: 'Houston Texans', domain: 'houstontexans.com', conference: 'NFL', division: 'AFC South' },
  { name: 'Indianapolis Colts', domain: 'colts.com', conference: 'NFL', division: 'AFC South' },
  { name: 'Jacksonville Jaguars', domain: 'jaguars.com', conference: 'NFL', division: 'AFC South' },
  { name: 'Kansas City Chiefs', domain: 'chiefs.com', conference: 'NFL', division: 'AFC West' },
  { name: 'Las Vegas Raiders', domain: 'raiders.com', conference: 'NFL', division: 'AFC West' },
  { name: 'Los Angeles Chargers', domain: 'chargers.com', conference: 'NFL', division: 'AFC West' },
  { name: 'Los Angeles Rams', domain: 'therams.com', conference: 'NFL', division: 'NFC West' },
  { name: 'Miami Dolphins', domain: 'miamidolphins.com', conference: 'NFL', division: 'AFC East' },
  { name: 'Minnesota Vikings', domain: 'vikings.com', conference: 'NFL', division: 'NFC North' },
  { name: 'New England Patriots', domain: 'patriots.com', conference: 'NFL', division: 'AFC East' },
  { name: 'New Orleans Saints', domain: 'neworleanssaints.com', conference: 'NFL', division: 'NFC South' },
  { name: 'New York Giants', domain: 'giants.com', conference: 'NFL', division: 'NFC East' },
  { name: 'New York Jets', domain: 'newyorkjets.com', conference: 'NFL', division: 'AFC East' },
  { name: 'Philadelphia Eagles', domain: 'philadelphiaeagles.com', conference: 'NFL', division: 'NFC East' },
  { name: 'Pittsburgh Steelers', domain: 'steelers.com', conference: 'NFL', division: 'AFC North' },
  { name: 'San Francisco 49ers', domain: '49ers.com', conference: 'NFL', division: 'NFC West' },
  { name: 'Seattle Seahawks', domain: 'seahawks.com', conference: 'NFL', division: 'NFC West' },
  { name: 'Tampa Bay Buccaneers', domain: 'buccaneers.com', conference: 'NFL', division: 'NFC South' },
  { name: 'Tennessee Titans', domain: 'titansonline.com', conference: 'NFL', division: 'AFC South' },
  { name: 'Washington Commanders', domain: 'commanders.com', conference: 'NFL', division: 'NFC East' },
  
  // NBA Teams - All 30 teams
  // Eastern Conference - Atlantic
  { name: 'Boston Celtics', domain: 'celtics.com', conference: 'NBA', division: 'Atlantic' },
  { name: 'Brooklyn Nets', domain: 'nets.com', conference: 'NBA', division: 'Atlantic' },
  { name: 'New York Knicks', domain: 'knicks.com', conference: 'NBA', division: 'Atlantic' },
  { name: 'Philadelphia 76ers', domain: 'sixers.com', conference: 'NBA', division: 'Atlantic' },
  { name: 'Toronto Raptors', domain: 'raptors.com', conference: 'NBA', division: 'Atlantic' },
  // Eastern Conference - Central
  { name: 'Chicago Bulls', domain: 'bulls.com', conference: 'NBA', division: 'Central' },
  { name: 'Cleveland Cavaliers', domain: 'cavs.com', conference: 'NBA', division: 'Central' },
  { name: 'Detroit Pistons', domain: 'pistons.com', conference: 'NBA', division: 'Central' },
  { name: 'Indiana Pacers', domain: 'pacers.com', conference: 'NBA', division: 'Central' },
  { name: 'Milwaukee Bucks', domain: 'bucks.com', conference: 'NBA', division: 'Central' },
  // Eastern Conference - Southeast
  { name: 'Atlanta Hawks', domain: 'hawks.com', conference: 'NBA', division: 'Southeast' },
  { name: 'Charlotte Hornets', domain: 'hornets.com', conference: 'NBA', division: 'Southeast' },
  { name: 'Miami Heat', domain: 'heat.com', conference: 'NBA', division: 'Southeast' },
  { name: 'Orlando Magic', domain: 'magic.com', conference: 'NBA', division: 'Southeast' },
  { name: 'Washington Wizards', domain: 'wizards.com', conference: 'NBA', division: 'Southeast' },
  // Western Conference - Northwest
  { name: 'Denver Nuggets', domain: 'nuggets.com', conference: 'NBA', division: 'Northwest' },
  { name: 'Minnesota Timberwolves', domain: 'timberwolves.com', conference: 'NBA', division: 'Northwest' },
  { name: 'Oklahoma City Thunder', domain: 'thunder.com', conference: 'NBA', division: 'Northwest' },
  { name: 'Portland Trail Blazers', domain: 'trailblazers.com', conference: 'NBA', division: 'Northwest' },
  { name: 'Utah Jazz', domain: 'jazz.com', conference: 'NBA', division: 'Northwest' },
  // Western Conference - Pacific
  { name: 'Golden State Warriors', domain: 'warriors.com', conference: 'NBA', division: 'Pacific' },
  { name: 'Los Angeles Clippers', domain: 'clippers.com', conference: 'NBA', division: 'Pacific' },
  { name: 'Los Angeles Lakers', domain: 'lakers.com', conference: 'NBA', division: 'Pacific' },
  { name: 'Phoenix Suns', domain: 'suns.com', conference: 'NBA', division: 'Pacific' },
  { name: 'Sacramento Kings', domain: 'kings.com', conference: 'NBA', division: 'Pacific' },
  // Western Conference - Southwest
  { name: 'Dallas Mavericks', domain: 'mavs.com', conference: 'NBA', division: 'Southwest' },
  { name: 'Houston Rockets', domain: 'rockets.com', conference: 'NBA', division: 'Southwest' },
  { name: 'Memphis Grizzlies', domain: 'grizzlies.com', conference: 'NBA', division: 'Southwest' },
  { name: 'New Orleans Pelicans', domain: 'pelicans.com', conference: 'NBA', division: 'Southwest' },
  { name: 'San Antonio Spurs', domain: 'spurs.com', conference: 'NBA', division: 'Southwest' },
  
  // MLB Teams - All 30 teams
  // AL East
  { name: 'Baltimore Orioles', domain: 'mlb.com', conference: 'MLB', division: 'AL East' },
  { name: 'Boston Red Sox', domain: 'mlb.com', conference: 'MLB', division: 'AL East' },
  { name: 'New York Yankees', domain: 'mlb.com', conference: 'MLB', division: 'AL East' },
  { name: 'Tampa Bay Rays', domain: 'mlb.com', conference: 'MLB', division: 'AL East' },
  { name: 'Toronto Blue Jays', domain: 'mlb.com', conference: 'MLB', division: 'AL East' },
  // AL Central
  { name: 'Chicago White Sox', domain: 'mlb.com', conference: 'MLB', division: 'AL Central' },
  { name: 'Cleveland Guardians', domain: 'mlb.com', conference: 'MLB', division: 'AL Central' },
  { name: 'Detroit Tigers', domain: 'mlb.com', conference: 'MLB', division: 'AL Central' },
  { name: 'Kansas City Royals', domain: 'mlb.com', conference: 'MLB', division: 'AL Central' },
  { name: 'Minnesota Twins', domain: 'mlb.com', conference: 'MLB', division: 'AL Central' },
  // AL West
  { name: 'Houston Astros', domain: 'mlb.com', conference: 'MLB', division: 'AL West' },
  { name: 'Los Angeles Angels', domain: 'mlb.com', conference: 'MLB', division: 'AL West' },
  { name: 'Oakland Athletics', domain: 'mlb.com', conference: 'MLB', division: 'AL West' },
  { name: 'Seattle Mariners', domain: 'mlb.com', conference: 'MLB', division: 'AL West' },
  { name: 'Texas Rangers', domain: 'mlb.com', conference: 'MLB', division: 'AL West' },
  // NL East
  { name: 'Atlanta Braves', domain: 'mlb.com', conference: 'MLB', division: 'NL East' },
  { name: 'Miami Marlins', domain: 'mlb.com', conference: 'MLB', division: 'NL East' },
  { name: 'New York Mets', domain: 'mlb.com', conference: 'MLB', division: 'NL East' },
  { name: 'Philadelphia Phillies', domain: 'mlb.com', conference: 'MLB', division: 'NL East' },
  { name: 'Washington Nationals', domain: 'mlb.com', conference: 'MLB', division: 'NL East' },
  // NL Central
  { name: 'Chicago Cubs', domain: 'mlb.com', conference: 'MLB', division: 'NL Central' },
  { name: 'Cincinnati Reds', domain: 'mlb.com', conference: 'MLB', division: 'NL Central' },
  { name: 'Milwaukee Brewers', domain: 'mlb.com', conference: 'MLB', division: 'NL Central' },
  { name: 'Pittsburgh Pirates', domain: 'mlb.com', conference: 'MLB', division: 'NL Central' },
  { name: 'St. Louis Cardinals', domain: 'mlb.com', conference: 'MLB', division: 'NL Central' },
  // NL West
  { name: 'Arizona Diamondbacks', domain: 'mlb.com', conference: 'MLB', division: 'NL West' },
  { name: 'Colorado Rockies', domain: 'mlb.com', conference: 'MLB', division: 'NL West' },
  { name: 'Los Angeles Dodgers', domain: 'mlb.com', conference: 'MLB', division: 'NL West' },
  { name: 'San Diego Padres', domain: 'mlb.com', conference: 'MLB', division: 'NL West' },
  { name: 'San Francisco Giants', domain: 'mlb.com', conference: 'MLB', division: 'NL West' },
  
  // NHL Teams - All 32 teams
  { name: 'Anaheim Ducks', domain: 'nhl.com', conference: 'NHL', division: 'Pacific' },
  { name: 'Arizona Coyotes', domain: 'nhl.com', conference: 'NHL', division: 'Central' },
  { name: 'Boston Bruins', domain: 'nhl.com', conference: 'NHL', division: 'Atlantic' },
  { name: 'Buffalo Sabres', domain: 'nhl.com', conference: 'NHL', division: 'Atlantic' },
  { name: 'Calgary Flames', domain: 'nhl.com', conference: 'NHL', division: 'Pacific' },
  { name: 'Carolina Hurricanes', domain: 'nhl.com', conference: 'NHL', division: 'Metropolitan' },
  { name: 'Chicago Blackhawks', domain: 'nhl.com', conference: 'NHL', division: 'Central' },
  { name: 'Colorado Avalanche', domain: 'nhl.com', conference: 'NHL', division: 'Central' },
  { name: 'Columbus Blue Jackets', domain: 'nhl.com', conference: 'NHL', division: 'Metropolitan' },
  { name: 'Dallas Stars', domain: 'nhl.com', conference: 'NHL', division: 'Central' },
  { name: 'Detroit Red Wings', domain: 'nhl.com', conference: 'NHL', division: 'Atlantic' },
  { name: 'Edmonton Oilers', domain: 'nhl.com', conference: 'NHL', division: 'Pacific' },
  { name: 'Florida Panthers', domain: 'nhl.com', conference: 'NHL', division: 'Atlantic' },
  { name: 'Los Angeles Kings', domain: 'nhl.com', conference: 'NHL', division: 'Pacific' },
  { name: 'Minnesota Wild', domain: 'nhl.com', conference: 'NHL', division: 'Central' },
  { name: 'Montreal Canadiens', domain: 'nhl.com', conference: 'NHL', division: 'Atlantic' },
  { name: 'Nashville Predators', domain: 'nhl.com', conference: 'NHL', division: 'Central' },
  { name: 'New Jersey Devils', domain: 'nhl.com', conference: 'NHL', division: 'Metropolitan' },
  { name: 'New York Islanders', domain: 'nhl.com', conference: 'NHL', division: 'Metropolitan' },
  { name: 'New York Rangers', domain: 'nhl.com', conference: 'NHL', division: 'Metropolitan' },
  { name: 'Ottawa Senators', domain: 'nhl.com', conference: 'NHL', division: 'Atlantic' },
  { name: 'Philadelphia Flyers', domain: 'nhl.com', conference: 'NHL', division: 'Metropolitan' },
  { name: 'Pittsburgh Penguins', domain: 'nhl.com', conference: 'NHL', division: 'Metropolitan' },
  { name: 'San Jose Sharks', domain: 'nhl.com', conference: 'NHL', division: 'Pacific' },
  { name: 'Seattle Kraken', domain: 'nhl.com', conference: 'NHL', division: 'Pacific' },
  { name: 'St. Louis Blues', domain: 'nhl.com', conference: 'NHL', division: 'Central' },
  { name: 'Tampa Bay Lightning', domain: 'nhl.com', conference: 'NHL', division: 'Atlantic' },
  { name: 'Toronto Maple Leafs', domain: 'nhl.com', conference: 'NHL', division: 'Atlantic' },
  { name: 'Vancouver Canucks', domain: 'nhl.com', conference: 'NHL', division: 'Pacific' },
  { name: 'Vegas Golden Knights', domain: 'nhl.com', conference: 'NHL', division: 'Pacific' },
  { name: 'Washington Capitals', domain: 'nhl.com', conference: 'NHL', division: 'Metropolitan' },
  { name: 'Winnipeg Jets', domain: 'nhl.com', conference: 'NHL', division: 'Central' },
]

/**
 * Get logo URL for a college/team using Clearbit Logo API
 * Clearbit automatically provides logos with transparent/white backgrounds
 */
export function getCollegeLogo(domain: string, size: number = 128, teamName?: string): string {
  return `https://logo.clearbit.com/${domain}?size=${size}`
}

/**
 * Search colleges by name
 */
export function searchColleges(query: string): College[] {
  const lowerQuery = query.toLowerCase()
  return colleges.filter(college => 
    college.name.toLowerCase().includes(lowerQuery) ||
    college.domain.toLowerCase().includes(lowerQuery) ||
    college.conference?.toLowerCase().includes(lowerQuery)
  )
}

