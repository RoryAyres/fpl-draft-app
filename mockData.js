const MockData = {
    getBootstrap: () => ({ 
        events: [{ id: 1, is_current: true }], 
        teams: [{id: 1, short_name: "ARS"}, {id: 2, short_name: "AVL"}, {id: 3, short_name: "BOU"}, {id: 4, short_name: "BRE"}, {id: 5, short_name: "BHA"}, {id: 6, short_name: "CFC"}], 
        elements: [
            { id: 1, web_name: "Saka", element_type: 3, team: 1 },
            { id: 2, web_name: "Odegaard", element_type: 3, team: 1 },
            { id: 3, web_name: "Watkins", element_type: 4, team: 2 },
            { id: 4, web_name: "Haaland", element_type: 4, team: 5 },
            { id: 5, web_name: "Palmer", element_type: 3, team: 6 },
            { id: 6, web_name: "Raya", element_type: 1, team: 1 },
            { id: 7, web_name: "Saliba", element_type: 2, team: 1 },
            { id: 8, web_name: "Porro", element_type: 2, team: 3 },
            { id: 9, web_name: "Trent", element_type: 2, team: 4 },
            { id: 10, web_name: "Eze", element_type: 3, team: 5 },
            { id: 11, web_name: "Mbeumo", element_type: 3, team: 4 },
            { id: 12, web_name: "Pickford", element_type: 1, team: 2 },
            { id: 13, web_name: "Trippier", element_type: 2, team: 6 },
            { id: 14, web_name: "Solanke", element_type: 4, team: 3 },
            { id: 15, web_name: "Gordon", element_type: 3, team: 6 }
        ] 
    }),
    getLeague: () => ({ 
        league: { name: "Mock Draft League" }, 
        league_entries: [
            { id: 101, entry_id: 101, entry_name: "Lads on Toure", player_first_name: "John", player_last_name: "Doe" },
            { id: 102, entry_id: 102, entry_name: "Saka Potatoes", player_first_name: "Jane", player_last_name: "Smith" },
            { id: 103, entry_id: 103, entry_name: "Pique Blinders", player_first_name: "Mike", player_last_name: "Jones" },
            { id: 104, entry_id: 104, entry_name: "Alisson Wonderland", player_first_name: "Sarah", player_last_name: "Lee" }
        ], 
        standings: [
            { league_entry: 101, rank: 2, total: 200, points_for: 3500, matches_won: 10, matches_drawn: 2, matches_lost: 4 },
            { league_entry: 102, rank: 1, total: 205, points_for: 3600, matches_won: 11, matches_drawn: 0, matches_lost: 5 },
            { league_entry: 103, rank: 3, total: 195, points_for: 3400, matches_won: 9, matches_drawn: 1, matches_lost: 6 },
            { league_entry: 104, rank: 4, total: 180, points_for: 3200, matches_won: 7, matches_drawn: 0, matches_lost: 9 }
        ], 
        matches: [
            { event: 1, league_entry_1: 101, league_entry_2: 102 },
            { event: 1, league_entry_1: 103, league_entry_2: 104 }
        ] 
    }),
    getPLFixtures: () => ([
        { team_h: 1, team_a: 2, started: true, finished: false },
        { team_h: 3, team_a: 4, started: true, finished: true },
        { team_h: 5, team_a: 6, started: false, finished: false }
    ]),
    getTeamEvent: (id) => {
        if (id === 101) return { picks: [ { element: 6, position: 1 }, { element: 7, position: 2 }, { element: 8, position: 3 }, { element: 9, position: 4 }, { element: 1, position: 5 }, { element: 2, position: 6 }, { element: 5, position: 7 }, { element: 10, position: 8 }, { element: 11, position: 9 }, { element: 3, position: 10 }, { element: 4, position: 11 }, { element: 12, position: 12 }, { element: 13, position: 13 }, { element: 15, position: 14 }, { element: 14, position: 15 } ] };
        return { picks: [ { element: 4, position: 1 }, { element: 1, position: 2 } ] };
    },
    getLiveScores: () => ({ 
        elements: {
            1: { stats: { total_points: 8, minutes: 90, goals_scored: 1 } },
            2: { stats: { total_points: 5, minutes: 75, assists: 1 } },
            3: { stats: { total_points: 12, minutes: 90, goals_scored: 2, defensive_contributions: 13 } },
            4: { stats: { total_points: 17, minutes: 90, goals_scored: 3, assists: 1 } },
            5: { stats: { total_points: 8, minutes: 90, yellow_cards: 1, bonus: 2 } },
            6: { stats: { total_points: 6, minutes: 90, clean_sheets: 1, penalties_saved: 1 } },
            7: { stats: { total_points: 4, minutes: 90, goals_conceded: 2, defensive_contributions: 11 } },
            8: { stats: { total_points: 2, minutes: 90, defensive_contributions: 4 } },
            9: { stats: { total_points: 9, minutes: 90, clean_sheets: 1, assists: 1, bonus: 1, defensive_contributions: 10 } },
            10: { stats: { total_points: 0, minutes: 0 } },
            11: { stats: { total_points: 5, minutes: 60, goals_scored: 1 } },
            12: { stats: { total_points: 3, minutes: 90, saves: 4 } },
            13: { stats: { total_points: 0, minutes: 0 } },
            14: { stats: { total_points: 5, minutes: 90 } },
            15: { stats: { total_points: 0, minutes: 0 } }
        } 
    })
};