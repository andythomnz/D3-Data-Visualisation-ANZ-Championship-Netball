import csv from "csv-parser";
import fs from "fs";
const moment = require("moment");

const fileData = fs.readFileSync(__dirname + `/data/venues.json`, "utf8");
const venues = JSON.parse(fileData).venues;

export function parseCSV() {
  return new Promise((resolve) => {
    const output = [];

    const years = [2008, 2009, 2010, 2011, 2012, 2013];

    let filesFinishsedProcessing = 0;

    years.forEach((year) => {
      fs.createReadStream(__dirname + `/data/${year}.csv`)
      .pipe(csv())
      .on("data", (data) => {
        // Format the data
        const row = cleanRow(data, year);

        // Only adds the row if it's not undefined (i.e. a row not containing a BYE)
        if(row) { output.push(row); }
      })
      .on("end", () => {
        filesFinishsedProcessing++;

        // If all files have finished processing, return the sorted array.
        if(filesFinishsedProcessing === years.length - 1) {
          resolve(output);
        }
      });
    });
  })
}

/**
 * Cleans up a data row. Returns an object consisting of the clean data
 * @param {*} row a row of data from the csv
 * @param {*} year the year of this data (Needs to be passed in because the year is not included in the date)
 */
function cleanRow(row, year) {

  // Handle rows containing BYE information
  if (row.Date.includes("BYES")) {
    // TODO determine what we want to do with byes
    return undefined;
  }

  const scores = parseScore(row.Score)
  var venueName = parseVenue(row.Venue).trim();

  // Clean up slight deviations in venue names
  switch(venueName) {
    case "The Edgar Centre, Dunedin":
      venueName = "Edgar Centre, Dunedin";
      break;
    case "Energy Events Centre, Rotorua*":
      venueName = "Energy Events Centre, Rotorua";
      break;
    case "Te Rauparaha, Porirua":
      venueName = "Te Rauparaha Arena, Porirua";
      break;
    case "Trust Stadium, Auckland":
      venueName = "Trusts Stadium, Auckland";
      break;
  }

  var countryName = "";
  var cityName = "";
  for (var i = 0; i < venues.length; i++) {
    if (venues[i].name == venueName) {
      countryName = venues[i].country;
      cityName = venues[i].city;
    }
  }

  const cleanedRow = {
    round: parseInt(row.Round),
    date: parseDate(row.Date, row.Time, year),
    homeTeam: row["Home Team"],
    homeScore: scores.homeScore,
    awayTeam: row["Away Team"],
    awayScore: scores.awayScore,
    wasDraw: scores.wasDraw,
    drawScore: scores.drawScore,
    venue: venueName,
    city: cityName,
    country: countryName
  };

  return cleanedRow;

}

/**
 * Splits the score string into two numbers.
 * Assumes that no team scored more than 99 points or less than 10 points
 * Ignores the one draw in 2008 and just uses the score - probably need to fix.
 * @param {*} scoreString
 */
function parseScore(scoreString) {
  let wasDraw = false;

  if(scoreString.includes("draw")) { wasDraw = true; }

  let scoreStringNoSpaces = scoreString.replace(/ /g, ""); // Removes white spaces from score
  scoreStringNoSpaces = scoreStringNoSpaces.replace(/draw/g, ""); // Removes "draw" text from score

  let drawScore = undefined;
  if(scoreString.includes("(")) {
    drawScore = scoreStringNoSpaces.slice(6, 11);
  }

  return {
    homeScore: parseInt(scoreStringNoSpaces.slice(0, 2)),
    awayScore: parseInt(scoreStringNoSpaces.slice(3, 5)),
    wasDraw: wasDraw,
    drawScore: drawScore
  }
}

/**
 * Parses the date/time to be a date in SECONDS in UTC.
 * Some files include a date and a time, others just provide a date.
 * As a result, only the date is returned so that there is consistent data across the dataset.
 * @param {*} date Date field. Can potentially include date and time
 * @param {*} time Time field. Sometimes not included in the csv.
 */
function parseDate(date, time, year) {
  let dateTimeString = date;

  if (time) { dateTimeString += ` ${time}`; } // Concatenates the time string if it exists

  // Parse Date/Time string with moment.js
  const formattedDate = moment(new Date(dateTimeString)).year(year).startOf("day").unix();

  return formattedDate;
}

/**
 * Parses the venue as some venues in the 2010 data set are surrounded by double quotes
 * @param {*} venue
 */
function parseVenue(venue) {
  return venue.replace(/"/g, "");
}