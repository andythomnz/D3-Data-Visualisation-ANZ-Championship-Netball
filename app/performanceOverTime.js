const TEAMS = [
  "Central Pulse",
  "Northern Mystics",
  "Waikato Bay of Plenty Magic",
  "Southern Steel",
  "Canterbury Tactix",
  "New South Wales Swifts",
  "Adelaide Thunderbirds",
  "Melbourne Vixens",
  "West Coast Fever",
  "Queensland Firebirds",
];

const TEAM_OBJECTS = TEAMS.map((team) => { return { name: team }; })

const ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

/********* Styling Options *********/
const CELL_SIZE = 30;
const CELL_SPACING = 2;
const PLAYOFF_DIVIDER_SPACING = 5;
const DIVIDER_WIDTH = 2;
const FONT_SIZE = 12;

const WIN_MORE_COLOR = "#39ff36";
const WIN_LESS_COLOR = "#a7ffa6";
const LOSE_LESS_COLOR = "#ff9191";
const LOSE_MORE_COLOR = "#ff3b3b";
const DRAW_COLOR = "#9a9da1";

const WIN_MORE_MARGIN = 10;
const LOSE_MORE_MARGIN = 10;

const TEAM_SELECT_SVG_HEIGHT = 250;
const TEAM_SELECT_SVG_WIDTH = 600;

const CIRCLE_SCALE = 0.5;

/********* Data Management *********/
let teamDataByYear = {};
let years = [];
let observedTeam = TEAMS[0];
let comparedTeams = [];

/********* DOM Objects *********/
let visualisationDiv;
let canvas;
let teamFilter;
let tooltip;
let simulation;

/********* DATA REQUESTS ********/
// Counter to determine when all information has been gathered
let imagesReceived = 0;
let teamDataReceived = false;


// CSV data
const dataRequest = new XMLHttpRequest();

dataRequest.open("GET", "/data", true); // Makes GET request to data endpoint

// Create a listener so that when the http request is done
// and the status is 200 (successful), update the data.
dataRequest.onreadystatechange = function () {
  if(dataRequest.readyState === 4 && dataRequest.status === 200) {
    const responseData = JSON.parse(dataRequest.responseText);
    teamDataByYear = getTeamData(responseData);
    teamDataReceived = true;

    // Renders graph if all necessary data has been received
    if(imagesReceived === TEAMS.length && teamDataReceived) {
      draw()
    }
  }
};

// Send the request
dataRequest.send();

// Image Data
TEAMS.forEach((teamName, i) => {
  const teamNameWithoutSpaces = teamName.replace(/ /g, "");
  d3.image(`/team_images/${teamNameWithoutSpaces}.jpg`)
    .then((img) => {
      TEAM_OBJECTS[i].img = img;
      imagesReceived++;

      // Renders graph if all necessary data has been received
      if(imagesReceived === TEAMS.length && teamDataReceived) {
        draw()
      }
    });
});

/******************* DISPLAY ********************/

function draw() {
  visualisationDiv = d3.select("#visualization");

  /*********** TEAM SELECT  **********/
  // Team Select SVG
  teamFilter = visualisationDiv.append("svg")
    .attr("width", TEAM_SELECT_SVG_WIDTH)
    .attr("height", TEAM_SELECT_SVG_HEIGHT)

  const nodes = teamFilter.selectAll("g").data(TEAM_OBJECTS);
  const nodesEnter = nodes.enter().append("svg:g").attr("class", "node");

  const defs = nodesEnter.append("defs");
  defs.append("pattern")
    .attr("id", function(d) { const name = d.name.replace(/ /g, ""); return `image${name}`; })
    .attr("width", 1)
    .attr("height", 1)
    .append("svg:image")
    .attr("xlink:href", function(d) { return d.img.src; })
    .attr("width", 128)
    .attr("height", 128);

    const circles = nodesEnter.append("svg:circle")
      .attr("fill", function(d) { const name = d.name.replace(/ /g, ""); return `url(#image${name})`; })
      .attr("r", 64)
      .attr("transform", `scale(${CIRCLE_SCALE}, ${CIRCLE_SCALE})`)
      .attr("cx", function(d, i) { return circleStartingX(d, i) / CIRCLE_SCALE; })
      .attr("cy", function(d, i) { return circleStartingY(d, i) / CIRCLE_SCALE; })
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .call(d3.drag() // call specific function when circle is dragged
          .on("start", function(d, i) { dragStarted(d, i); })
          .on("drag", dragged)
          .on("end", dragEnded))

  simulation = d3.forceSimulation()
    .force("center", d3.forceCenter().x(TEAM_SELECT_SVG_WIDTH / 2).y(TEAM_SELECT_SVG_HEIGHT / 2)) // Attraction to the center of the svg area
    .force("charge", d3.forceManyBody().strength(500)) // Nodes are attracted one each other if value is > 0
    .force("collide", d3.forceCollide().strength(0.6).radius(64 * CIRCLE_SCALE).iterations(3)) // Force that avoids circle overlapping

    simulation
      .nodes(TEAM_OBJECTS)
      .on("tick", function(d){
        circles
            .attr("cx", function(d){ return d.x / CIRCLE_SCALE; })
            .attr("cy", function(d){ return d.y / CIRCLE_SCALE; })
            .attr("opacity", function(d) { return d.name == observedTeam ? 1 : 0.5 })
      });

   /*********** LEGEND **********/
    drawLegend();



  /********* GAME RESULT VISUALIZATION ********/
  canvas = visualisationDiv.append("svg")
    .attr("width",`${canvasWidth()}px`)
    .attr("height",`${canvasHeight()}px`)
    .attr("class", "grid");

  // Background color
  canvas.append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "#212121");

  // Text
  const yearsText = canvas.selectAll(".year")
    .data(years)
    .enter()
    .append("text");

  yearsText
    .attr("x", CELL_SIZE / 2)
    .attr("y", function(d) { return yearTextYPosition(d); })
    .text(function(d) { return d; })
    .attr("fill", "white")
    .attr("font-size", `${FONT_SIZE}px`)
    .style("text-anchor", "middle");

  const roundsText = canvas.selectAll(".round")
    .data(ROUNDS)
    .enter()
    .append("text");

  roundsText
    .attr("x", function(d) { return roundTextXPosition(d) })
    .attr("y", CELL_SIZE / 2)
    .text(function(d) { return d; })
    .attr("fill", "white")
    .attr("font-size", `${FONT_SIZE}px`)
    .style("text-anchor", "middle");

  // Tooltip
  tooltip = visualisationDiv
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Row in visualization representing one year
  let row = canvas.selectAll(".row")
    .data(teamDataByYear[observedTeam])
    .enter().append("g")
    .attr("class", "row");

  // Square Cells
  row.selectAll(".square")
    .data(function(d) { return d; })
    .enter().append("rect")
    .attr("class","square")
    .attr("x", function(d) { return cellXPosition(d); })
    .attr("y", function(d) { return cellYPosition(d); })
    .attr("width", `${CELL_SIZE}px`)
    .attr("height", `${CELL_SIZE}px`)
    .style("fill", function(d) { return cellColor(d) } )
    .on("mouseover", function(d) {
      tooltip.transition()
        .duration(70)
        .style("opacity", .9);

      tooltip.html(tooltipText(d))
      .style("left", d3.event.pageX + "px")
      .style("top", d3.event.pageY + "px")
    })
    .on("mouseout", function(d) {
      tooltip.transition()
          .duration(70)
          .style("opacity", 0);
  });


  // Playoff Divider
  const dividerDims = dividerDimensions();
  canvas.append("line")
    .attr("x1", dividerDims[0])
    .attr("y1", dividerDims[1])
    .attr("x2", dividerDims[2])
    .attr("y2", dividerDims[3])
    .attr("stroke-width", DIVIDER_WIDTH)
    .attr("stroke", "grey");
}

function drawLegend() {
  const legend = visualisationDiv
      .append("svg")
      .attr("height", "40px")
      .attr("width", TEAM_SELECT_SVG_WIDTH)

    legend.append("text")
      .attr("x", "130px")
      .attr("y", "18px")
      .attr("font-size", "10px")
      .attr("fill", "dark-grey")
      .text(`Win & Score Difference >= ${WIN_MORE_MARGIN}`);

    legend.append("text")
      .attr("x", "130px")
      .attr("y", "32px")
      .attr("font-size", "10px")
      .attr("fill", "dark-grey")
      .text(`Win & Score Difference <  ${WIN_MORE_MARGIN}`);

    legend.append("text")
      .attr("x", "280px")
      .attr("y", "18px")
      .attr("font-size", "10px")
      .attr("fill", "dark-grey")
      .text(`Loss & Score Difference >= ${LOSE_MORE_MARGIN}`);

    legend.append("text")
      .attr("x", "280px")
      .attr("y", "32px")
      .attr("font-size", "10px")
      .attr("fill", "dark-grey")
      .text(`Loss & Score Difference <  ${LOSE_MORE_MARGIN}`);

    legend.append("rect")
      .attr("x", "118px")
      .attr("y", "10px")
      .attr("width", "10px")
      .attr("height", "10px")
      .attr("fill", WIN_MORE_COLOR)

    legend.append("rect")
      .attr("x", "118px")
      .attr("y", "24px")
      .attr("width", "10px")
      .attr("height", "10px")
      .attr("fill", WIN_LESS_COLOR)

    legend.append("rect")
      .attr("x", "268px")
      .attr("y", "10px")
      .attr("width", "10px")
      .attr("height", "10px")
      .attr("fill", LOSE_MORE_COLOR)

    legend.append("rect")
      .attr("x", "268px")
      .attr("y", "24px")
      .attr("width", "10px")
      .attr("height", "10px")
      .attr("fill", LOSE_LESS_COLOR)

    legend.append("text")
      .attr("x", "450px")
      .attr("y", "26px")
      .attr("font-size", "10px")
      .attr("fill", "dark-grey")
      .text(`Draw`);

    legend.append("rect")
      .attr("x", "438px")
      .attr("y", "17px")
      .attr("width", "10px")
      .attr("height", "10px")
      .attr("fill", DRAW_COLOR)

}

/**
 * Updates the data represent the data from a different team
 * @param {*} data The data of the team to visualize
 */
function updateData(data) {
  let rows = canvas.selectAll(".row")
    .data(data)

  rows.enter().append("g")
    .merge(rows)
    .attr("class", "row")

  rows.exit().remove();


  const squares = rows.selectAll(".square")
    .data(function(d) { return d; })
    .attr("x", function(d) { return cellXPosition(d); })
    .attr("y", function(d) { return cellYPosition(d); })
    .style("fill", function(d) { return cellColor(d) })

  squares.enter().append("rect")
    .attr("class","square")
    .attr("x", function(d) { return cellXPosition(d); })
    .attr("y", function(d) { return cellYPosition(d); })
    .attr("width", `${CELL_SIZE}px`)
    .attr("height", `${CELL_SIZE}px`)
    .style("fill", function(d) { return cellColor(d) } )
    .on("mouseover", function(d, i) {
      tooltip.transition()
        .duration(70)
        .style("opacity", .9);

      tooltip.html(tooltipText(d))
      .style("left", d3.event.pageX + "px")
      .style("top", d3.event.pageY + "px")
    })
    .on("mouseout", function() {
      tooltip.transition()
          .duration(70)
          .style("opacity", 0);
    })

    squares.exit().remove();
}

/************* GAME RESULT VISUALIZATION HELPERS *************/
function cellXPosition(d) {
  let x = (d.round) * CELL_SIZE + (d.round * CELL_SPACING);

  if (d.round > 14) {
    return x + (PLAYOFF_DIVIDER_SPACING * 2) + DIVIDER_WIDTH + CELL_SPACING;
  } else {
    return x;
  }
}

function cellYPosition(d) {
  const firstYear = years[0];
  const yearCount = parseInt(moment.unix(d.date).year()) - firstYear;

  return ((yearCount + 1) * CELL_SIZE)
    + (yearCount * CELL_SPACING);
}

function yearTextYPosition(d) {
  const firstYear = years[0];
  const yearCount = d - firstYear
  const centeringOffset = (CELL_SIZE / 2) + 5;

  return (yearCount + 1) * CELL_SIZE
    + yearCount * CELL_SPACING
    + centeringOffset;
}

function roundTextXPosition(d) {
  const firstRound = 1;
  const roundCount = d - firstRound;
  const centeringOffset = CELL_SIZE / 2 + 2;

  const x = (roundCount + 1) * CELL_SIZE
    + roundCount * CELL_SPACING
    + centeringOffset;


  if (d > 14) {
    return x + (PLAYOFF_DIVIDER_SPACING * 2) + DIVIDER_WIDTH + CELL_SPACING;
  } else {
    return x;
  }
}

function dividerDimensions() {
  const x1 = 15 * CELL_SIZE + 15 * CELL_SPACING + PLAYOFF_DIVIDER_SPACING;
  const y1 = CELL_SIZE / 2;
  const x2 = x1;
  const y2 = canvasHeight();

  return [x1, y1, x2, y2];
}

function cellColor(d) {
  let scoreDifference = d.homeScore - d.awayScore
  if (!isHomeTeam(d)) { scoreDifference *= -1; }

  if(d.wasDraw) { return DRAW_COLOR; }

  if (scoreDifference >= WIN_MORE_MARGIN) {
    return WIN_MORE_COLOR;
  } else if (scoreDifference > 0) {
    return WIN_LESS_COLOR;
  } else if (scoreDifference <= -LOSE_MORE_MARGIN) {
    return LOSE_MORE_COLOR;
  } else {
    return LOSE_LESS_COLOR;
  }
}

function isHomeTeam(d) {
  return d.homeTeam === observedTeam
}

function canvasWidth() {
  const numCols = 17 + 1; // 17 rounds + row year labels

  return (numCols * CELL_SIZE)
    + ((numCols + 1) * CELL_SPACING)
    + DIVIDER_WIDTH
    + (PLAYOFF_DIVIDER_SPACING * 2);
}

function canvasHeight() {
  const numRows = years.length + 1;

  return (numRows * CELL_SIZE)
    + ((numRows - 1) * CELL_SPACING);
}


/*************** TOOLTIP TEXT HELPERS ****************/
function tooltipText(d) {
  const date = moment.unix(d.date).format("DD-MM-YYYY");
  const homeOrAway = isHomeTeam(d) ? "Home" : "Away";
  const vs = isHomeTeam(d) ? d.awayTeam : d.homeTeam;
  const score = isHomeTeam(d) ? (d.homeScore + "-" + d.awayScore) : (d.awayScore + "-" + d.homeScore);
  let gameResult = "Loss";
  const drawScore = d.drawScore ? `(${d.drawScore})` : "";

  if(d.wasDraw) { gameResult = "Draw"; }
  else if (isHomeTeam(d) && d.homeScore > d.awayScore) { gameResult = "Win" }
  else if (!isHomeTeam(d) && d.awayScore > d.homeScore) { gameResult = "Win" }

  return `Date: ${date} (${homeOrAway})<br/>
    Vs. ${vs} <br/>
    Score: ${score} ${drawScore} (${gameResult})`;
}

/*************** CIRCLE HELPERS ****************/

function dragStarted(d, i) {
  if (!d3.event.active) simulation.alphaTarget(.03).restart();
  d.fx = d.x;
  d.fy = d.y;

  if (d.selected) { return; }

  TEAM_OBJECTS.forEach((team) => { team.selected = false; })
  d.selected = true; // Used for opacity checking
  observedTeam = TEAMS[i];
  const newData = teamDataByYear[observedTeam];
  updateData(newData);
}
function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}
function dragEnded(d) {
  if (!d3.event.active) simulation.alphaTarget(.03);
  d.fx = null;
  d.fy = null;
}

function ticked() {
  const teamNodes = teamFilter.selectAll("circle").data(TEST);
  teamNodes.enter()
    .append('circle')
    .attr('r', 5)
    .merge(teamNodes)
    .attr('cx', function(d) {
      return d.x;
    })
    .attr('cy', function(d) {
      return d.y;
    })

  teamNodes.exit().remove()
}

function teamClicked(d, i) {
  if (d3.event.defaultPrevented) { return; } // dragged

  if (d.selected) { return; }

  TEAM_OBJECTS.forEach((team) => { team.selected = false; })
  d.selected = true; // Used for opacity checking
  observedTeam = TEAMS[i];
  const newData = teamDataByYear[observedTeam];
  updateData(newData);
}

function circleStartingX(d, i) {
  return (i % 3 - 1) * 200 + (TEAM_SELECT_SVG_WIDTH / 2);
}

function circleStartingY(d, i) {
  return ((Math.floor(i / 3) - 1) * 200) + (TEAM_SELECT_SVG_HEIGHT / 2);
}

/*************** DATA FORMATTING ****************/
/**
 * Structures the data received from the request into the needed format
 * {
 *   team1Name: [
 *     [year1row1, year1row2, year1row3],
 *     [year2row1, year2row2, year2row3],
 *     [year3row1, year3row2, year3row3],
 *   ],
 *   team2Name: [
 *
 *   ]
 * }
 * @param {*} data
 */
function getTeamData(data) {
  const teamData = {};

  // Create an object for each team
  TEAMS.forEach((teamName) => {
    teamDataByYear[teamName] = [];
  });

  let currentYear = -1;
  let yearIndex = -1;

  data.forEach((row) => {

    // Only get data for the team it belongs to
    const date = moment.unix(row.date);
    const year = date.format("YYYY");

    if (year !== currentYear) {
      TEAMS.forEach((teamName) => {
        teamDataByYear[teamName].push(new Array());
      });

      yearIndex ++;
      currentYear = year;
      years.push(year);
    }

    teamDataByYear[row.homeTeam][yearIndex].push(row);
    teamDataByYear[row.awayTeam][yearIndex].push(row);
  });
  years = years.map(yearString => parseInt(yearString));
  return teamDataByYear;
}
