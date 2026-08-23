const urlParams = new URLSearchParams(window.location.search);
const CONFIG = {
    LEAGUE_ID: urlParams.get('league') || 238,
    PROXY_URL: 'https://fpl-draft-app-iota.vercel.app/api/proxy?path=' 
};

const State = {
    isUsingMockData: false,
    appPhase: 'INACTIVE', // 'ACTIVE' or 'INACTIVE'
    targetEvent: null, 
    activeTab: '', 
    bootstrapStatic: null,
    leagueDetails: null,
    currentGW: null, 
    liveScores: null,
    plFixtures: [],
    entries: {}, 
    teamEvents: {}, 
    teamsData: {},
    timerIntervals: [], 
    
    getStaticPlayer: (id) => {
        if (!State.bootstrapStatic || !State.bootstrapStatic.elements) return {};
        return State.bootstrapStatic.elements.find(e => e.id === id) || {};
    },
    getLiveStats: (id) => State.liveScores?.elements[id]?.stats || {},
    getLivePoints: (id) => State.liveScores?.elements[id]?.stats?.total_points || 0,
    getLiveMinutes: (id) => State.liveScores?.elements[id]?.stats?.minutes || 0,

    updateLivePoints: (entryId, totalPoints) => {
        if (State.entries[entryId]) {
            State.entries[entryId].livePoints = totalPoints;
        }
    },

    calculateLiveTeamData: (picks) => {
        if (!picks || !Array.isArray(picks)) return { totalPoints: 0, starters: [], bench: [] };
        
        let enrichedPicks = picks.map(p => {
            const staticData = State.getStaticPlayer(p.element);
            return {
                ...p,
                static: staticData,
                stats: State.getLiveStats(p.element),
                fixture: Render.getFixtureStatus(staticData.team),
                isSubbedIn: false,
                isSubbedOut: false
            };
        });
        
        let starters = enrichedPicks.filter(p => p.position <= 11).sort((a,b) => a.static.element_type - b.static.element_type);
        let bench = enrichedPicks.filter(p => p.position > 11).sort((a, b) => a.position - b.position);

        let formation = { 1: 0, 2: 0, 3: 0, 4: 0 };
        starters.forEach(p => formation[p.static.element_type]++);

        const hasPlayed = (stats) => stats && (stats.minutes > 0 || stats.yellow_cards > 0 || stats.red_cards > 0);
        
        const isDefinitelyOut = (p) => (p.fixture.status === 'FT' || p.fixture.status === 'Live') && !hasPlayed(p.stats);

        bench.forEach(sub => {
            if (!hasPlayed(sub.stats)) return; 
            
            const subType = sub.static.element_type;
            
            for (let i = 0; i < starters.length; i++) {
                const starter = starters[i];
                if (starter.isSubbedOut || !isDefinitelyOut(starter)) continue;

                const starterType = starter.static.element_type;

                if (subType === 1 && starterType === 1) {
                    starter.isSubbedOut = true;
                    sub.isSubbedIn = true;
                    break;
                } 
                else if (subType !== 1 && starterType !== 1) {
                    formation[starterType]--;
                    formation[subType]++;

                    if (formation[2] >= 3 && formation[4] >= 1) {
                        starter.isSubbedOut = true;
                        sub.isSubbedIn = true;
                        break;
                    } else {
                        formation[starterType]++;
                        formation[subType]--;
                    }
                }
            }
        });

        let totalPoints = 0;
        starters.forEach(p => { if (!p.isSubbedOut) totalPoints += (p.stats?.total_points || 0); });
        bench.forEach(p => { if (p.isSubbedIn) totalPoints += (p.stats?.total_points || 0); });

        return { totalPoints, starters, bench };
    }
};

const UI = {
    showLoading: (text, subtext = '') => {
        document.getElementById('loading-overlay').classList.remove('hidden');
        if (text) document.getElementById('loading-text').innerText = text;
        document.getElementById('loading-subtext').innerText = subtext;
    },
    hideLoading: () => document.getElementById('loading-overlay').classList.add('hidden'),
    showError: (msg) => {
        document.getElementById('error-text').innerText = msg;
        document.getElementById('error-message').classList.remove('hidden');
    },
    buildNavigation: () => {
        const nav = document.getElementById('nav-tabs');
        if (State.appPhase === 'ACTIVE') {
            nav.innerHTML = `
                <button onclick="UI.switchTab('fixtures')" id="tab-fixtures" class="whitespace-nowrap py-2.5 px-4 text-xs font-semibold text-gray-400 tracking-wide transition-colors hover:text-gray-200">Live Fixtures</button>
                <button onclick="UI.switchTab('table')" id="tab-table" class="whitespace-nowrap py-2.5 px-4 text-xs font-semibold text-gray-400 tracking-wide transition-colors hover:text-gray-200">Live Table</button>
            `;
            UI.switchTab('fixtures');
        } else {
            nav.innerHTML = `
                <button onclick="UI.switchTab('hub')" id="tab-hub" class="whitespace-nowrap py-2.5 px-4 text-xs font-semibold text-gray-400 tracking-wide transition-colors hover:text-gray-200">Hub</button>
                <button onclick="UI.switchTab('fixtures')" id="tab-fixtures" class="whitespace-nowrap py-2.5 px-4 text-xs font-semibold text-gray-400 tracking-wide transition-colors hover:text-gray-200">Upcoming Fixtures</button>
                <button onclick="UI.switchTab('table')" id="tab-table" class="whitespace-nowrap py-2.5 px-4 text-xs font-semibold text-gray-400 tracking-wide transition-colors hover:text-gray-200">Table</button>
            `;
            UI.switchTab('hub');
        }
    },
    switchTab: (tabId) => {
        State.activeTab = tabId;
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('#nav-tabs button').forEach(el => {
            el.classList.remove('active-tab', 'text-emerald-400');
            el.classList.add('text-gray-400');
        });
        const contentEl = document.getElementById(`content-${tabId}`);
        if(contentEl) contentEl.classList.remove('hidden');
        
        const activeBtn = document.getElementById(`tab-${tabId}`);
        if(activeBtn) {
            activeBtn.classList.add('active-tab', 'text-emerald-400');
            activeBtn.classList.remove('text-gray-400');
        }
        Render.currentTab();
    },
    startCountdown: (dateObj, elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return;

        const updateTimer = () => {
            const diff = dateObj.getTime() - new Date().getTime();
            if (diff <= 0) {
                el.innerText = "Deadline Passed";
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);
            el.innerText = `${d}d ${h}h ${m}m ${s}s`;
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        State.timerIntervals.push(interval);
    },
    clearCountdowns: () => {
        State.timerIntervals.forEach(clearInterval);
        State.timerIntervals = [];
    },
    getPosClass: (posId) => {
        const map = { 1: 'bg-amber-900/50 text-amber-300 border-amber-700/50', 2: 'bg-blue-900/50 text-blue-300 border-blue-700/50', 3: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50', 4: 'bg-rose-900/50 text-rose-300 border-rose-700/50' };
        return map[posId] || 'bg-gray-800 text-gray-300 border-gray-700';
    },
    getPosName: (posId) => ({ 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }[posId] || 'UNK'),
    formatStatBadges: (stats, elementType) => {
        if (!stats) return '';
        let badges = [];
        const goals = stats.goals_scored || 0;
        const assists = stats.assists || 0;
        const cleanSheets = (elementType === 4) ? 0 : (stats.clean_sheets || 0);
        const yellowCards = stats.yellow_cards || 0;
        const redCards = stats.red_cards || 0;
        const ownGoals = stats.own_goals || 0;
        const penaltiesSaved = stats.penalties_saved || 0;
        const penaltiesMissed = stats.penalties_missed || 0;
        const saves = stats.saves || 0;
        const bonus = stats.bonus || 0;
        
        const defcons = stats.defensive_contributions || stats.defensive_contribution || 0; 
        const savePoints = Math.floor(saves / 3);

        const defconThreshold = (elementType === 2) ? 10 : ((elementType === 3 || elementType === 4) ? 12 : 999);
        const hasReachedDefcon = defcons >= defconThreshold;

        for(let i=0; i<goals; i++) badges.push('⚽');
        for(let i=0; i<assists; i++) badges.push('👟'); 
        for(let i=0; i<cleanSheets; i++) badges.push('🛡️');
        for(let i=0; i<penaltiesSaved; i++) badges.push('🙅🏻');
        if(savePoints > 0) badges.push('🧤');
        if(hasReachedDefcon) badges.push('🧱');
        for(let i=0; i<yellowCards; i++) badges.push('🟨');
        for(let i=0; i<redCards; i++) badges.push('🟥');
        for(let i=0; i<penaltiesMissed; i++) badges.push('❌');
        for(let i=0; i<ownGoals; i++) badges.push('⚠️');
        if(bonus > 0) badges.push('✨');

        if (badges.length === 0) return '';
        return `<span class="inline-flex items-center space-x-0.5 mx-1 text-[11px]">${badges.join('')}</span>`;
    }
};

const API = {
    fetchVercelProxy: async (endpoint, bypassCache = false) => {
        if (endpoint === 'bootstrap-static' && !bypassCache) {
            const cachedData = sessionStorage.getItem('fpl_bootstrap');
            if (cachedData) return JSON.parse(cachedData);
        }

        const timestamp = bypassCache ? `&_t=${Date.now()}` : '';
        const fetchUrl = `${CONFIG.PROXY_URL}${encodeURI(endpoint)}${timestamp}`;

        const fetchWithRetry = async (url, retries = 2, delay = 500) => {
            for (let i = 0; i <= retries; i++) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Status ${response.status}`);
                    return await response.json();
                } catch (e) {
                    if (i === retries) throw e;
                    await new Promise(res => setTimeout(res, delay * Math.pow(2, i))); 
                }
            }
        };

        const data = await fetchWithRetry(fetchUrl);

        if (endpoint === 'bootstrap-static' && !bypassCache) {
            try { sessionStorage.setItem('fpl_bootstrap', JSON.stringify(data)); } 
            catch (e) { console.warn('Session storage quota exceeded'); }
        }

        return data;
    },
    
    refreshData: async (manual = false) => {
        try {
            if (manual) {
                const icon = document.getElementById('refresh-icon');
                icon.classList.add('animate-spin');
            }
            State.leagueDetails = await API.fetchVercelProxy(`league/${CONFIG.LEAGUE_ID}/details`, manual);
            
            if (State.appPhase === 'ACTIVE') {
                State.liveScores = await API.fetchVercelProxy(`event/${State.currentGW}/live`, manual);
                State.plFixtures = await API.fetchVercelProxy(`fixtures/?event=${State.currentGW}`, manual);

                for (const entry of State.leagueDetails.league_entries) {
                    try {
                        const teamData = await API.fetchVercelProxy(`entry/${entry.entry_id}/event/${State.currentGW}`, manual);
                        State.teamEvents[entry.entry_id] = teamData;
                    } catch (err) {}
                }

                State.leagueDetails.league_entries.forEach(entry => {
                    const lineup = State.teamEvents[entry.entry_id];
                    let total = 0;
                    if(lineup && lineup.picks) {
                        const processedTeam = State.calculateLiveTeamData(lineup.picks);
                        total = processedTeam.totalPoints;
                    }
                    State.updateLivePoints(entry.id, total);
                });
            }

            Render.currentTab();
            if (manual) {
                setTimeout(() => document.getElementById('refresh-icon').classList.remove('animate-spin'), 500);
            }
        } catch (e) {
            console.error("Background refresh failed:", e);
            if (manual) document.getElementById('refresh-icon').classList.remove('animate-spin');
        }
    },
    
    init: async () => {
        try {
            UI.showLoading('Connecting to Premier League API...', `Loading League ID: ${CONFIG.LEAGUE_ID}`);
            
            try {
                State.bootstrapStatic = await API.fetchVercelProxy('bootstrap-static');
                
                const currentGwId = State.bootstrapStatic.events?.current || 1;
                const eventsData = State.bootstrapStatic.events?.data || [];
                
                let targetEvent = eventsData.find(e => e.id === currentGwId);
                const now = new Date();

                if (targetEvent) {
                    const deadline = new Date(targetEvent.deadline_time);
                    
                    if (now >= deadline && !targetEvent.finished) {
                        State.appPhase = 'ACTIVE';
                        document.getElementById('live-indicator').classList.remove('hidden');
                    } else {
                        State.appPhase = 'INACTIVE';
                        if (targetEvent.finished) {
                            targetEvent = eventsData.find(e => e.id === currentGwId + 1) || targetEvent;
                        }
                    }
                    State.currentGW = targetEvent.id;
                    State.targetEvent = targetEvent;
                } else {
                    State.appPhase = 'INACTIVE';
                    State.currentGW = currentGwId;
                }

                State.leagueDetails = await API.fetchVercelProxy(`league/${CONFIG.LEAGUE_ID}/details`);

                if (State.appPhase === 'ACTIVE') {
                    State.liveScores = await API.fetchVercelProxy(`event/${State.currentGW}/live`);
                    State.plFixtures = await API.fetchVercelProxy(`fixtures/?event=${State.currentGW}`);

                    for (const entry of State.leagueDetails.league_entries) {
                        try {
                            const teamData = await API.fetchVercelProxy(`entry/${entry.entry_id}/event/${State.currentGW}`); // FIXED: Removed 'manual' argument
                            State.teamEvents[entry.entry_id] = teamData;
                        } catch (err) {}
                    }
                }

            } catch (proxyError) {
                console.error("[FRONTEND] API Fetch Error:", proxyError);
                UI.showError(`Error Fetching Data: ${proxyError.message}`);
                await new Promise(r => setTimeout(r, 3000)); 
                
                State.isUsingMockData = true;
                UI.showLoading('Loading Mock Data...', 'Previewing UI without live connection.');
                document.getElementById('mock-indicator').classList.remove('hidden');
                
                State.bootstrapStatic = MockData.getBootstrap();
                State.leagueDetails = MockData.getLeague();
                State.appPhase = 'ACTIVE';
                State.currentGW = 1;
                State.plFixtures = MockData.getPLFixtures();
                State.liveScores = MockData.getLiveScores();
                
                State.leagueDetails.league_entries.forEach(entry => {
                    State.teamEvents[entry.entry_id] = MockData.getTeamEvent(entry.entry_id);
                });
            }

            if (State.bootstrapStatic.teams) {
                State.bootstrapStatic.teams.forEach(t => State.teamsData[t.id] = t);
            }
            
            document.getElementById('league-name-display').innerText = State.leagueDetails?.league?.name || 'League';
            
            if (State.leagueDetails && State.leagueDetails.league_entries) {
                State.leagueDetails.league_entries.forEach(entry => {
                    State.entries[entry.id] = { ...entry, livePoints: 0 };
                });
            }

            const headerGwEl = document.getElementById('header-gw-status');
            headerGwEl.innerText = `GW ${State.currentGW}`;
            headerGwEl.classList.remove('hidden');

            if (State.appPhase === 'ACTIVE' && State.leagueDetails && State.leagueDetails.league_entries) {
                State.leagueDetails.league_entries.forEach(entry => {
                    const lineup = State.teamEvents[entry.entry_id];
                    let total = 0;
                    if(lineup && lineup.picks) {
                        const processedTeam = State.calculateLiveTeamData(lineup.picks);
                        total = processedTeam.totalPoints;
                    }
                    State.updateLivePoints(entry.id, total);
                });
            }

            UI.hideLoading();
            UI.buildNavigation();
            
            // Silently append league ID to URL if not already present
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('league', CONFIG.LEAGUE_ID);
            window.history.replaceState({}, '', currentUrl);
            
        } catch (error) {
            UI.showError("Critical initialisation error: " + error.message);
            console.error(error);
        }
    }
};

const Render = {
    currentTab: () => {
        if (!State.leagueDetails) return;
        
        if (State.activeTab === 'hub' && State.appPhase === 'INACTIVE') {
            Render.hub();
        } else if (State.activeTab === 'fixtures') {
            Render.fixtures();
        } else if (State.activeTab === 'table') {
            Render.table();
        }
    },

    hub: () => {
        UI.clearCountdowns();
        const hubContainer = document.getElementById('content-hub');
        
        if (!State.targetEvent || !State.targetEvent.deadline_time) {
            hubContainer.innerHTML = `<div class="text-center p-4 text-xs text-gray-400 bg-gray-800 rounded-xl border border-gray-700">No upcoming events scheduled.</div>`;
            return;
        }

        const gwDeadlineDate = new Date(State.targetEvent.deadline_time);
        const waiverDeadlineDate = State.targetEvent.waivers_time 
            ? new Date(State.targetEvent.waivers_time) 
            : new Date(gwDeadlineDate.getTime() - (24 * 60 * 60 * 1000));

        hubContainer.innerHTML = `
            <div class="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700/60 overflow-hidden p-4 text-center">
                <h3 class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Waiver Deadline</h3>
                <div id="waiver-timer" class="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">--d --h --m --s</div>
                <div class="text-[10px] text-gray-500 mt-1">${waiverDeadlineDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</div>
            </div>

            <div class="bg-gray-800/90 rounded-xl shadow-lg border border-gray-700/60 overflow-hidden p-4 text-center">
                <h3 class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Gameweek Deadline</h3>
                <div id="gw-timer" class="text-2xl font-extrabold text-blue-400 font-mono tracking-tight">--d --h --m --s</div>
                <div class="text-[10px] text-gray-500 mt-1">${gwDeadlineDate.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <a href="https://draft.premierleague.com/team/transactions" target="_blank" rel="noopener" class="bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 rounded-lg p-3 flex flex-col items-center justify-center transition-colors">
                    <svg class="w-6 h-6 text-emerald-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    <span class="text-xs font-semibold text-emerald-200">Transactions</span>
                </a>
                <a href="https://draft.premierleague.com/team/my" target="_blank" rel="noopener" class="bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 rounded-lg p-3 flex flex-col items-center justify-center transition-colors">
                    <svg class="w-6 h-6 text-blue-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    <span class="text-xs font-semibold text-blue-200">My Team</span>
                </a>
            </div>
        `;

        UI.startCountdown(waiverDeadlineDate, 'waiver-timer');
        UI.startCountdown(gwDeadlineDate, 'gw-timer');
    },
    
    getFixtureStatus: (teamId) => {
        const fixture = State.plFixtures.find(f => f.team_h === teamId || f.team_a === teamId);
        if (!fixture) return { opponent: 'Blank', status: '', isHome: null, colorClass: 'hidden' };
        const isHome = fixture.team_h === teamId;
        const oppTeam = State.teamsData[isHome ? fixture.team_a : fixture.team_h];
        const opponentName = oppTeam ? oppTeam.short_name : 'UNK';
        
        let status = '', colorClass = 'hidden';
        if (fixture.finished || fixture.finished_provisional || (fixture.started && fixture.minutes >= 90)) { 
            status = 'FT'; colorClass = 'text-gray-400 bg-gray-800/80 border-gray-700'; 
        } 
        else if (fixture.started) { 
            status = 'Live'; colorClass = 'text-emerald-400 bg-emerald-950/80 border-emerald-700/60 animate-pulse'; 
        }
        return { opponent: opponentName, isHome, status, colorClass };
    },

    fixtures: () => {
        const listEl = document.getElementById('fixtures-list');
        const h2hMatches = State.leagueDetails.matches ? State.leagueDetails.matches.filter(m => m.event == State.currentGW) : [];

        if (h2hMatches.length === 0) {
            listEl.innerHTML = '<div class="text-center p-4 text-xs text-gray-400 bg-gray-800 rounded-xl border border-gray-700">No H2H fixtures found for this gameweek.</div>';
            return;
        }

        let compiledHtml = ''; 

        h2hMatches.forEach((match, idx) => {
            const t1 = State.entries[match.league_entry_1 || match.entry_1_entry];
            const t2 = State.entries[match.league_entry_2 || match.entry_2_entry];
            
            if (!t1 || !t2) return;
            
            const t1Name = t1.player_first_name === "Rory" ? "Rory A" : t1.player_first_name;
            const t2Name = t2.player_first_name === "Rory" ? "Rory A" : t2.player_first_name;

            const isInactive = State.appPhase === 'INACTIVE';
            const pts1 = isInactive ? '-' : t1.livePoints;
            const pts2 = isInactive ? '-' : t2.livePoints;
            const hl1 = (!isInactive && t1.livePoints > t2.livePoints) ? 'text-emerald-400' : 'text-gray-200';
            const hl2 = (!isInactive && t2.livePoints > t1.livePoints) ? 'text-emerald-400' : 'text-gray-200';
            const bg1 = (!isInactive && t1.livePoints > t2.livePoints) ? 'bg-emerald-950/30' : '';
            const bg2 = (!isInactive && t2.livePoints > t1.livePoints) ? 'bg-emerald-950/30' : '';

            let detailsHtml = '<div class="p-3 text-center text-xs text-gray-500">Live lineups are not available until after the deadline passes.</div>';
            
            if (!isInactive) {
                const t1Lineup = State.teamEvents[t1.entry_id];
                const t2Lineup = State.teamEvents[t2.entry_id];
                
                if (t1Lineup && t2Lineup && t1Lineup.picks && t2Lineup.picks) {
                    const t1Data = State.calculateLiveTeamData(t1Lineup.picks);
                    const t2Data = State.calculateLiveTeamData(t2Lineup.picks);

                    const buildCondensedPlayer = (pick, isBench, isAway) => {
                        if (!pick) return '';
                        const pStat = pick.static;
                        const pts = pick.stats?.total_points || 0;
                        const mins = pick.stats?.minutes || 0;
                        const fix = pick.fixture;
                        const statBadges = UI.formatStatBadges(pick.stats, pStat.element_type); 
                        
                        const isPlayed = fix.status === 'Live' || fix.status === 'FT';
                        
                        let ptsColor = isPlayed ? 'text-emerald-400' : 'text-gray-500';
                        let nameStyle = 'text-gray-200';
                        
                        if (pick.isSubbedOut) {
                            ptsColor = 'text-gray-500';
                            nameStyle = 'text-gray-400';
                        } else if (pick.isSubbedIn) {
                            ptsColor = 'text-emerald-300 font-extrabold';
                            nameStyle = 'text-emerald-200';
                        }

                        const ptsDisplay = isPlayed ? pts : '-';
                        const statusInd = isPlayed 
                            ? `<span class="text-[8px] px-1 font-semibold ${fix.status === 'Live' ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}">${fix.status === 'Live' ? mins + '\'' : 'FT'}</span>` 
                            : ``;
                            
                        let subIcon = '';
                        if (pick.isSubbedOut) subIcon = `<span class="text-red-500 text-[10px] ml-0.5">↓</span>`;
                        if (pick.isSubbedIn) subIcon = `<span class="text-emerald-500 text-[10px] ml-0.5">↑</span>`;

                        const posOpacity = pick.isSubbedOut ? 'opacity-40' : '';

                        if (isAway) {
                            return `
                            <div class="flex justify-between items-center py-1 border-b border-gray-700/40 ${(isBench && !pick.isSubbedIn) ? 'opacity-50' : ''}">
                                <div class="font-bold text-[11px] ${ptsColor} flex-shrink-0 w-4">${ptsDisplay}</div>
                                <div class="flex items-center justify-end truncate min-w-0 pl-1 w-full">
                                    ${statusInd}
                                    ${statBadges}
                                    <span class="text-[10px] font-semibold ${nameStyle} truncate ml-1 mr-1.5">${pStat.web_name || 'Unknown'}${subIcon}</span>
                                    <span class="text-[8px] font-bold ${UI.getPosClass(pStat.element_type)} ${posOpacity} px-0.5 rounded flex-shrink-0 transition-opacity">${UI.getPosName(pStat.element_type)}</span>
                                </div>
                            </div>`;
                        } else {
                            return `
                            <div class="flex justify-between items-center py-1 border-b border-gray-700/40 ${(isBench && !pick.isSubbedIn) ? 'opacity-50' : ''}">
                                <div class="flex items-center truncate min-w-0 pr-1 w-full">
                                    <span class="text-[8px] font-bold ${UI.getPosClass(pStat.element_type)} ${posOpacity} px-0.5 rounded mr-1.5 flex-shrink-0 transition-opacity">${UI.getPosName(pStat.element_type)}</span>
                                    <span class="text-[10px] font-semibold ${nameStyle} truncate mr-1">${pStat.web_name || 'Unknown'}${subIcon}</span>
                                    ${statBadges}
                                    ${statusInd}
                                </div>
                                <div class="font-bold text-[11px] ${ptsColor} flex-shrink-0 w-4 text-right">${ptsDisplay}</div>
                            </div>`;
                        }
                    };

                    detailsHtml = `
                        <div class="flex p-2">
                            <div class="w-1/2 pr-1 border-r border-gray-700/50">
                                <div class="text-[9px] text-gray-500 uppercase font-bold mb-1 tracking-wider text-left">Starters</div>
                                ${t1Data.starters.map(p => buildCondensedPlayer(p, false, false)).join('')}
                                <div class="text-[9px] text-gray-500 uppercase font-bold mt-2 mb-1 tracking-wider text-left">Bench</div>
                                ${t1Data.bench.map(p => buildCondensedPlayer(p, true, false)).join('')}
                            </div>
                            <div class="w-1/2 pl-1">
                                <div class="text-[9px] text-gray-500 uppercase font-bold mb-1 tracking-wider text-right">Starters</div>
                                ${t2Data.starters.map(p => buildCondensedPlayer(p, false, true)).join('')}
                                <div class="text-[9px] text-gray-500 uppercase font-bold mt-2 mb-1 tracking-wider text-right">Bench</div>
                                ${t2Data.bench.map(p => buildCondensedPlayer(p, true, true)).join('')}
                            </div>
                        </div>
                    `;
                }
            }

            compiledHtml += `
                <div class="bg-gray-800/90 rounded-xl shadow border border-gray-700/60 overflow-hidden cursor-pointer hover:bg-gray-750 transition-colors" onclick="document.getElementById('fixture-details-${idx}').classList.toggle('hidden'); this.querySelector('.chevron').classList.toggle('rotate-180')">
                    <div class="flex items-stretch h-16 relative">
                        <div class="absolute left-1/2 transform -translate-x-1/2 bottom-0.5 text-gray-600 chevron transition-transform duration-200">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                        <div class="flex-1 flex flex-col justify-center px-3 min-w-0 ${bg1}">
                            <div class="text-[10px] text-gray-400 truncate">${t1Name}</div>
                            <div class="text-xs sm:text-sm font-bold truncate ${hl1}">${t1.entry_name}</div>
                        </div>
                        <div class="w-20 flex items-center justify-center bg-gray-900/40 border-x border-gray-700/50 flex-shrink-0 z-10">
                            <div class="flex items-center font-bold w-full px-1">
                                <span class="text-base flex-1 text-right ${hl1}">${pts1}</span>
                                <span class="text-gray-600 text-xs px-1.5">-</span>
                                <span class="text-base flex-1 text-left ${hl2}">${pts2}</span>
                            </div>
                        </div>
                        <div class="flex-1 flex flex-col justify-center px-3 text-right min-w-0 ${bg2}">
                            <div class="text-[10px] text-gray-400 truncate">${t2Name}</div>
                            <div class="text-xs sm:text-sm font-bold truncate ${hl2}">${t2.entry_name}</div>
                        </div>
                    </div>
                    <div id="fixture-details-${idx}" class="hidden bg-gray-900/60 border-t border-gray-700/60 shadow-inner">
                        ${detailsHtml}
                    </div>
                </div>`;
        });
        
        listEl.innerHTML = compiledHtml;
    },

    table: () => {
        const tbody = document.getElementById('table-body');
        const thead = document.getElementById('table-head');
        let tbodyHtml = ''; 

        const matches = State.leagueDetails.matches ? State.leagueDetails.matches.filter(m => m.event == State.currentGW) : [];
        const isH2H = matches.length > 0;
        const isInactive = State.appPhase === 'INACTIVE';
        
        document.getElementById('table-title').innerText = isInactive ? "Overall Standings" : "Live Standings";

        if (isH2H) {
            thead.innerHTML = `<tr><th class="px-3 py-2 text-center w-6">#</th><th class="px-1.5 py-2 text-center w-5"></th><th class="px-3 py-2">Team</th><th class="px-2.5 py-2 text-center">${isInactive ? 'W-D-L' : 'Res'}</th><th class="px-2.5 py-2 text-center">Pts</th>${isInactive ? '' : '<th class="px-2.5 py-2 text-center bg-emerald-950/40 text-emerald-400 font-bold">H2H</th>'}</tr>`;
        } else {
            thead.innerHTML = `<tr><th class="px-3 py-2 text-center w-6">#</th><th class="px-1.5 py-2 text-center w-5"></th><th class="px-3 py-2">Team</th><th class="px-2.5 py-2 text-center">Total</th>${isInactive ? '' : '<th class="px-2.5 py-2 text-center bg-emerald-950/40 text-emerald-400 font-bold">Live</th>'}</tr>`;
        }

        let liveH2H = {};
        if (!isInactive) {
            matches.forEach(m => {
                const entry1 = m.league_entry_1 || m.entry_1_entry;
                const entry2 = m.league_entry_2 || m.entry_2_entry;
                const p1 = State.entries[entry1]?.livePoints || 0;
                const p2 = State.entries[entry2]?.livePoints || 0;
                
                liveH2H[entry1] = { pts: p1>p2 ? 3 : p1===p2 ? 1 : 0, w: p1>p2?1:0, d: p1===p2?1:0, l: p1<p2?1:0, res: p1>p2?'W':p1===p2?'D':'L' };
                liveH2H[entry2] = { pts: p2>p1 ? 3 : p1===p2 ? 1 : 0, w: p2>p1?1:0, d: p2===p1?1:0, l: p2<p1?1:0, res: p2>p1?'W':p2===p1?'D':'L' };
            });
        }

        let tableData = (State.leagueDetails.standings || []).map(s => {
            const h2hUpdate = liveH2H[s.league_entry] || { pts: 0, w: 0, d: 0, l: 0, res: '-' };
            const livePts = isInactive ? 0 : (State.entries[s.league_entry]?.livePoints || 0);
            return {
                ...s,
                entryDetails: State.entries[s.league_entry],
                liveFPLPts: livePts,
                projectedH2HPts: (s.total || 0) + h2hUpdate.pts,
                projectedTotalFPL: (s.points_for || s.total || 0) + livePts,
                projectedW: (s.matches_won || 0) + h2hUpdate.w,
                projectedD: (s.matches_drawn || 0) + h2hUpdate.d,
                projectedL: (s.matches_lost || 0) + h2hUpdate.l,
                gwResult: h2hUpdate.res
            };
        });

        tableData.sort((a, b) => isH2H ? (b.projectedH2HPts - a.projectedH2HPts || b.projectedTotalFPL - a.projectedTotalFPL) : (b.projectedTotalFPL - a.projectedTotalFPL));

        tableData.forEach((team, idx) => {
            const currentRank = idx + 1;
            const prevRank = team.rank || currentRank; 
            let rankIcon = '<svg class="w-3.5 h-3.5 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>';
            
            if (!isInactive) {
                if (currentRank < prevRank) rankIcon = '<svg class="w-3.5 h-3.5 mx-auto arrow-up" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>';
                else if (currentRank > prevRank) rankIcon = '<svg class="w-3.5 h-3.5 mx-auto arrow-down" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>';
            }

            const rowClass = 'bg-gray-800/40';
            const fName = team.entryDetails?.player_first_name === "Rory" ? "Rory A" : team.entryDetails?.player_first_name || '';

            if(isH2H) {
                let resColor = 'text-gray-500';
                if (team.gwResult === 'W') resColor = 'text-emerald-400';
                else if (team.gwResult === 'L') resColor = 'text-rose-400';

                tbodyHtml += `
                    <tr class="hover:bg-gray-700/30 transition-colors ${rowClass}">
                        <td class="px-3 py-2.5 text-center font-medium text-gray-400 text-xs">${currentRank}</td>
                        <td class="px-1.5 py-2.5 text-center">${rankIcon}</td>
                        <td class="px-3 py-2.5"><div class="text-xs font-bold text-gray-100 truncate max-w-[120px]">${team.entryDetails?.entry_name || 'Unknown'}</div><div class="text-[10px] text-gray-400">${fName}</div></td>
                        ${isInactive 
                            ? `<td class="px-2.5 py-2.5 text-center text-xs text-gray-300 font-mono">${team.projectedW}-${team.projectedD}-${team.projectedL}</td>` 
                            : `<td class="px-2.5 py-2.5 text-center text-xs font-bold ${resColor}">${team.gwResult}</td>`
                        }
                        <td class="px-2.5 py-2.5 text-center text-xs font-semibold text-gray-300">${team.projectedTotalFPL}</td>
                        ${isInactive ? '' : `<td class="px-2.5 py-2.5 text-center text-xs font-bold text-emerald-400 bg-emerald-950/30">${team.projectedH2HPts}</td>`}
                    </tr>`;
            } else {
                tbodyHtml += `
                    <tr class="hover:bg-gray-700/30 transition-colors ${rowClass}">
                        <td class="px-3 py-2.5 text-center font-medium text-gray-400 text-xs">${currentRank}</td>
                        <td class="px-1.5 py-2.5 text-center">${rankIcon}</td>
                        <td class="px-3 py-2.5"><div class="text-xs font-bold text-gray-100 truncate max-w-[120px]">${team.entryDetails?.entry_name || 'Unknown'}</div><div class="text-[10px] text-gray-400">${fName}</div></td>
                        <td class="px-2.5 py-2.5 text-center text-xs text-gray-300">${team.projectedTotalFPL}</td>
                        ${isInactive ? '' : `<td class="px-2.5 py-2.5 text-center text-xs font-bold text-emerald-400 bg-emerald-950/30">${team.liveFPLPts}</td>`}
                    </tr>`;
            }
        });
        
        tbody.innerHTML = tbodyHtml;
    }
};

let touchstartY = 0;
let touchendY = 0;
const mainContainer = document.getElementById('main-scroll-container');
const ptrEl = document.getElementById('ptr-element');

mainContainer.addEventListener('touchstart', e => {
    touchstartY = e.changedTouches[0].screenY;
}, {passive: true});

mainContainer.addEventListener('touchmove', e => {
    touchendY = e.changedTouches[0].screenY;
    if (mainContainer.scrollTop === 0 && touchendY > touchstartY) {
        const pullDist = Math.min(touchendY - touchstartY, 120);
        ptrEl.style.transform = `translateY(${pullDist}px)`;
        ptrEl.style.opacity = `${pullDist / 80}`;
        if (pullDist > 70) {
            document.getElementById('ptr-text').innerText = 'Release to refresh';
        }
    }
}, {passive: true});

mainContainer.addEventListener('touchend', e => {
    touchendY = e.changedTouches[0].screenY;
    if (mainContainer.scrollTop === 0 && (touchendY - touchstartY) > 70) {
        ptrEl.style.transform = `translateY(56px)`;
        document.getElementById('ptr-text').innerText = 'Refreshing...';
        API.refreshData(true).then(() => {
            ptrEl.style.transform = `translateY(0px)`;
            ptrEl.style.opacity = '0';
            document.getElementById('ptr-text').innerText = 'Pull down to refresh...';
        });
    } else {
        ptrEl.style.transform = `translateY(0px)`;
        ptrEl.style.opacity = '0';
    }
}, {passive: true});

window.onload = API.init;