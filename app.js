const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;

const initiolizeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started and Running At : http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initiolizeDBAndServer();
//......................................................................
const playerSnakeTOCamel = (obj) => {
  return {
    playerId: obj.player_id,
    playerName: obj.player_name,
  };
};

const matchSnakeTOCamel = (obj) => {
  return {
    matchId: obj.match_id,
    match: obj.match,
    year: obj.year,
  };
};
//......................................................................

// Tables .....below
//-------------------
// `player_details`
// `match_details`
// `player_match_score`
//-------------------

//......................................................................

// GET All the Players API (1)
//GET http://localhost:3000/players/
app.get("/players/", async (request, response) => {
  const getAllPlayersQuery = `SELECT * FROM player_details;`;
  const allPlayersArray = await db.all(getAllPlayersQuery);
  const convertedAllPlayersArray = allPlayersArray.map(playerSnakeTOCamel);
  response.send(convertedAllPlayersArray);
});

// GET Player By playerId API (2)
//GET http://localhost:3000/players/:playerId/
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `SELECT * FROM player_details WHERE player_id=${playerId};`;
  const player = await db.get(getPlayerQuery);
  const convertedPlayer = playerSnakeTOCamel(player);
  response.send(convertedPlayer);
});

// Update Player By playerId API (3)
//PUT http://localhost:3000/players/:playerId/
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `UPDATE player_details 
                               SET player_name='${playerName}'
                               WHERE player_id = ${playerId};`;
  const dbResponse = await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

// GET Match Details By matchId API (4)
//GET http://localhost:3000/matches/:matchId/
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `SELECT * FROM match_details 
                                   WHERE match_id=${matchId};`;
  const matchDetails = await db.get(getMatchDetailsQuery);
  const convertedMatchDetails = matchSnakeTOCamel(matchDetails);
  response.send(convertedMatchDetails);
});
// GET List of All Matches of a Player By playerId API (5)
//GET http://localhost:3000/players/:playerId/matches
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getAllMatchesByPlayerQuery = `SELECT 
                                                match_details.match_id,
                                                match_details.match,
                                                match_details.year 
                                         FROM 
                                            match_details inner join player_match_score 
                                            on match_details.match_id = player_match_score.match_id
                                         WHERE player_id=${playerId};`;
  const allMatchesByPlayer = await db.all(getAllMatchesByPlayerQuery);
  const convertedAllMatchesByPlayer = allMatchesByPlayer.map(matchSnakeTOCamel);
  response.send(convertedAllMatchesByPlayer);
});
// GET List of All Players of a Match By matchId API (6)
//GET http://localhost:3000/matches/:matchId/players
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getAllPlayersByMatchQuery = `SELECT 
                                                player_details.player_id,
                                                player_details.player_name
                                         FROM 
                                            player_details inner join player_match_score 
                                            on player_details.player_id = player_match_score.player_id
                                         WHERE match_id=${matchId};`;
  const allPlayersByMatch = await db.all(getAllPlayersByMatchQuery);
  const convertedAllPlayersByMatch = allPlayersByMatch.map(playerSnakeTOCamel);
  response.send(convertedAllPlayersByMatch);
});

// //GET Statistics of a Player By playerId API (7)
// //GET http://localhost:3000/players/:playerId/playerScores
// app.get("/players/:playerId/playerScores", async (request, response) => {
//   const { playerId } = request.params;
//   const getStatisticsOfPlayer = `SELECT player_details.player_id as playerId,
//                                             player_details.player_name as playerName,
//                                             SUM(player_match_score.score) as totalScore,
//                                             SUM(player_match_score.fours) as totalFours,
//                                             SUM(player_match_score.sixes) as totalSixes
//                                     FROM player_details inner join player_match_score
//                                         on player_details.player_id = player_match_score.player_id
//                                     WHERE player_details.player_id = ${playerId};`;
//   const statisticsOfPlayer = await db.get(getStatisticsOfPlayer);
//   response.send(statisticsOfPlayer);
// });

// GET Statistics of a Player By playerId API
// Path: /players/:playerId/playerScores
app.get("/players/:playerId/playerScores", async (req, res) => {
  try {
    const { playerId } = req.params;
    const playerStatsQuery = `
      SELECT
        player_details.player_id AS playerId,
        player_details.player_name AS playerName,
        SUM(player_match_score.score) AS totalScore,
        SUM(player_match_score.fours) AS totalFours,
        SUM(player_match_score.sixes) AS totalSixes
      FROM player_details
      INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id
      WHERE player_details.player_id = ?
      GROUP BY player_details.player_id, player_details.player_name`;
    const playerStats = await db.get(playerStatsQuery, playerId);
    if (!playerStats) {
      res.status(404).send("Player not found");
    } else {
      res.send(playerStats);
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = app;
