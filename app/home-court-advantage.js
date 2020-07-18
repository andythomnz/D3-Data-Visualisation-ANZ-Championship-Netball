/********* Visualisaiton Data *********/
var data = [];
let homeTeams = [];
let minDefenseScore = Number.MAX_SAFE_INTEGER;
let maxDefenseScore = Number.MIN_SAFE_INTEGER;
let chosenTeam;

/********* Sizing Data *********/
let width;
let height;
let standardRadius = 0;

/********* Colour Scheme *********/
const HOMETEAM_BLUE_PRIMARY = "#6999B3";
const HOMETEAM_BLUE_SECONDARY = "#34667e";
const OPPONENT_RED_PRIMARY = "#FFB0B7";
const OPPONENT_RED_SECONDARY = "#ba616a";

/********* D3 Groups *********/
let svg;
let chartGroup;
let circleGroup;
let brushGroup;

let tooltip;
let area;
let brushArea;

let xScale;
let yScale;
let xScaleBrush;
let yScaleBrush;
let xAxis;
let yAxis;
let zoom;
let brush;


// Makes GET request to /data endpoint
const http = new XMLHttpRequest();
http.open("GET", "/data", true);

// Create a listener so that when the http request is done
// and the status is 200 (successful), update the data.
http.onreadystatechange = function () {
  if (http.readyState === 4 && http.status === 200) {
    data = JSON.parse(http.responseText);

    // Sort the data
    data = data.sort((a, b) => {
      return a.date - b.date;
    });

    data.forEach(element => {
      // Build a list of unique team names
      if (!homeTeams.includes(element.homeTeam)) {
        homeTeams.push(element.homeTeam);
      }
      // Find the highest / lowest defense scores (to scale visualisation for all teams equally)
      let defenseScore = element.homeScore - element.awayScore;
      if (defenseScore < minDefenseScore) { minDefenseScore = defenseScore; }
      if (defenseScore > maxDefenseScore) { maxDefenseScore = defenseScore; }
    });

    if (minDefenseScore < 0 && maxDefenseScore > 0) {
      let bound = Math.max(Math.abs(minDefenseScore), Math.abs(maxDefenseScore));
      maxDefenseScore = bound + 2;
      minDefenseScore = -1 * maxDefenseScore;
    }


    // Organise data into groups of home-games by team
    // Inlcude subsets of all games, games won, games lost, games drawn.
    for (let i = 0; i < homeTeams.length; i++) {
      let teamName = homeTeams[i];
      let homeGames = [];
      let homeWonGames = [];
      let homeLostGames = [];
      let homeDrawGames = [];
      data.forEach(element => {
        if (element.homeTeam == teamName) {
          homeGames.push(element);
          if (element.wasDraw) {
            homeDrawGames.push(element);
          } else if (element.homeScore > element.awayScore) {
            homeWonGames.push(element);
          } else if (element.homeScore < element.awayScore) {
            homeLostGames.push(element);
          } else {
            homeDrawGames.push(element);
          }
        }
      });
      homeTeams[i] = {
        name: teamName,
        allMatches: homeGames,
        matchesWon: homeWonGames,
        matchesLost: homeLostGames,
        matchesDrawn: homeDrawGames
      };
    }

    // Populate drop-down selection list of teams
    let selectList = document.getElementById("teamSelect");
    for (let i = 0; i < homeTeams.length; i++) {
      let option = document.createElement("option");
      option.textContent = homeTeams[i].name;
      option.value = i;
      selectList.appendChild(option);
    }

    // Set the default selection in the drop-down to be Central Pulse
    chosenTeam = 0;

    // Draw / render the visualisation
    displayDefenseGraph();
  }
};

// Send the HTTP GET request to the /data endpoint
http.send();


/**
 * Draws (or re-draws) the defense chart of the selected team on the screen.
 */
function displayDefenseGraph() {
  // Remove any existing SVGs (incase we are re-drawing)
  let svgCheck = d3.select(".defense-chart").select("svg");
  if (!svgCheck.empty()) {
    svgCheck.remove();
  }

  // Remove any existing tooltips (incase we are re-drawing)
  let tooltipCheck = d3.select(".defense-chart").select(".tooltip");
  if (!tooltipCheck.empty()) {
    tooltipCheck.remove();
  }

  // Calculate dynamic sizing
  height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  heightBrush = height * 0.1;
  height = height * 0.8;
  height = height - 50 - 120;
  width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  width = width * 0.8;
  //width = width * 0.4;

  // Define margins for the primary section of the visualisation
  let margin = {
    left: 55,
    right: 0,
    top: 0,
    bottom: 50
  };

  // Define margins for the brushing panel section of the visualisation
  let marginBrush = {
    left: 55,
    right: 0,
    top: height + 25,
    bottom: 50
  };

  // Populate data array with only the chosen team's games
  data = homeTeams[chosenTeam].allMatches;

  // Add an SVG element to the defense-chart div
  svg = d3.select(".defense-chart")
    .append("svg")
    .attr("height", height + heightBrush + 50)
    .attr("width", width);

  // Set up an object group to house all elements in the primary section of the visualisation
  chartGroup = svg.append("g")
    .attr("class", "chartGroup")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Set up an object group to house the brushing panel section of the visualisation
  brushGroup = svg.append("g")
    .attr("class", "brushGroup")
    .attr("transform", "translate(" + marginBrush.left + "," + marginBrush.top + ")");

  // Define the brush and zoom elements
  brush = d3.brushX()
    .extent([[0, 0], [width-margin.left, heightBrush]])
    .on("brush end", brushed);

  zoom = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([[0, 0], [width-margin.left, height]])
    .extent([[0, 0], [width-margin.left, height]])
    .on("zoom", zoomed);

  // Add a background colour to the primary section
  chartGroup.append("rect")
    .attr("width", width-margin.left)
    .attr("height", height)
    .attr("fill", OPPONENT_RED_PRIMARY);

  // Add the "opposition" text label
  chartGroup.append("text")
    .text("Opposition")
    .attr("transform", "translate(" + (width - margin.left - 10) + "," + (margin.top + 34) + ")")
    .style("text-anchor", "end")
    .style("font-size", "34px")
    .style("font-family", "'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif")
    .style("fill", OPPONENT_RED_SECONDARY);

  // Define scale for Y values
  yScale = d3.scaleLinear()
    .domain([minDefenseScore, maxDefenseScore])  //min, max of input
    .range([height, 0]); //max, min in pixels of output

  // Format Y axis
  yAxis = d3.axisLeft(yScale)
    .ticks(3)
    .tickValues([-30, 0, 30])
    .tickFormat(function (d, i) {
      switch (i) {
        case 0: return "home loss";
        case 1: return "draw";
        case 2: return "home win";
      }
    });

  // Define scale for Y values on brushing section
  yScaleBrush = d3.scaleLinear()
    .domain([minDefenseScore, maxDefenseScore])
    .range([heightBrush, 0]);

  // Define scale for X axis
  xScale = d3.scaleTime()
    .domain(d3.extent(data, function (d) { return new Date(d.date * 1000); }))
    .range([0, width-margin.left]);

  // Format X axis
  xAxis = d3.axisBottom(xScale);

  // Define scale for X axis on brushing section
  xScaleBrush = d3.scaleTime()
    .domain(d3.extent(data, function (d) { return new Date(d.date * 1000); }))
    .range([0, width-margin.left]);

  // Format X axis on brushing section
  let xAxisBrush = d3.axisBottom(xScaleBrush);

  // Define the logic for area / path element in the primary section
  area = d3.area()
    .x(function (d, i) { return xScale(new Date(d.date * 1000)); })
    .y0(height)
    .y1(function (d, i) { return yScale(d.homeScore - d.awayScore); })
    .curve(d3.curveLinear);

  // Define the logic for area / path element in brushing section
  brushArea = d3.area()
    .x(function (d, i) { return xScaleBrush(new Date(d.date * 1000)); })
    .y0(heightBrush)
    .y1(function (d, i) { return yScaleBrush(d.homeScore - d.awayScore); })
    .curve(d3.curveLinear);

  // Add the area / path element to the primary section & format it      
  chartGroup.append("path")
    .attr("fill", HOMETEAM_BLUE_PRIMARY)
    .attr("stroke", "black")
    .attr("d", area(data))
    .attr("clip-path", "url(#clip)")
    .attr("class", "area");

  // Add the "home" text
  chartGroup.append("text")
    .text("Home Team: " + homeTeams[chosenTeam].name)
    .attr("transform", "translate(" + (width - margin.left - 10) + "," + (height - 10) + ")")
    .style("text-anchor", "end")
    .style("font-size", "34px")
    .style("font-family", "'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif")
    .style("fill", HOMETEAM_BLUE_SECONDARY);

  // Add a circle for each data point to the primary section & format them
  circleGroup = chartGroup.append("g");
  circleGroup.attr("clip-path", "url(#clip)");
  circleGroup.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "data-point")
    .attr("fill", getDataPointColour)
    .attr("cx", function (d, i) { return xScale(new Date(d.date * 1000)); })
    .attr("cy", function (d, i) { return yScale(d.homeScore - d.awayScore); })
    .attr("r", function (d, i) { // Dynamically calculate circle radius, based on window size
      let r = width / 250;
      if (r < 3) { r = 3; } // Don't allow it to be too small
      if (r > 10) { r = 10; } // Or too large
      standardRadius = r;
      return r;
    })
    .on("mouseover", handleDataPointMouseOver)
    .on("mousemove", handleDataPointMouseMove)
    .on("mouseout", handleDataPointMouseOut);

  // Add off-white rectangle behind the Y axis
  chartGroup.append("rect")
    .attr("fill", "#ded9d9")
    .attr("width", margin.left)
    .attr("height", height * 1.5)
    .attr("transform", "translate(" + -1 * margin.left + "," + margin.top + ")");

  // Add the Y axis to the primary section
  chartGroup.append("g")
    .attr("class", "axis--y")
    .call(yAxis);

  // Add the X axis to the primary section
  chartGroup.append("g")
    .attr("class", "axis--x")
    .attr("transform", "translate(0," + height + ")") // position at bottom of chart
    .call(xAxis);

  // Add the data point tooltip div (opaque until hover)
  tooltip = d3.select(".defense-chart")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip");

  // Add a background colour to the brushing section
  brushGroup.append("rect")
    .attr("width", width-margin.left)
    .attr("height", heightBrush)
    .attr("fill", OPPONENT_RED_SECONDARY);

  // Add the brushing section area / path
  brushGroup.append("path")
    .attr("fill", HOMETEAM_BLUE_SECONDARY)
    .attr("stroke", "black")
    .attr("d", brushArea(data))
    .attr("class", "area");

  // Add the brushing panel X axis
  brushGroup.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + heightBrush + ")")
    .call(xAxisBrush);

  // Add the brushing logic
  brushGroup.append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, xScale.range());
}

/**
 * Function executed when user interacts with brushing section
 */
function brushed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
  var s = d3.event.selection || xScaleBrush.range();
  xScale.domain(s.map(xScaleBrush.invert, xScaleBrush));
  chartGroup.select(".area").attr("d", area(data));
  chartGroup.select(".axis--x").call(xAxis);

  chartGroup.selectAll(".data-point")
    .attr("cx", function (d, i) { return xScale(new Date(d.date * 1000)); })
    .attr("cy", function (d, i) { return yScale(d.homeScore - d.awayScore); });

  svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
    .scale((width-margin.left) / (s[1] - s[0]))
    .translate(-s[0], 0));
}

/**
 * Function executed when user zooms the brushing section
 */
function zoomed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
  var t = d3.event.transform;
  xScale.domain(t.rescaleX(xScaleBrush).domain());
  chartGroup.select(".area").attr("d", area(data));
  chartGroup.select(".axis--x").call(xAxis);
  chartGroup.selectAll(".data-point")
    .attr("cx", function (d, i) { return xScale(new Date(d.date * 1000)); })
    .attr("cy", function (d, i) { return yScale(d.homeScore - d.awayScore); });
  brushGroup.select(".brush").call(brush.move, xScale.range().map(t.invertX, t));
}

/**
 * Returns a different colour depending on who won the match.
 * @param {*} d Data object for the match
 * @param {*} i Index of match in array of all matches.
 */
function getDataPointColour(d, i) {
  if (d.wasDraw) { return "black"; }
  if (d.homeScore - d.awayScore > 0) { return HOMETEAM_BLUE_SECONDARY; }
  if (d.homeScore - d.awayScore < 0) { return OPPONENT_RED_SECONDARY; }
  return "black";
}

/**
 * Builds the textual overview of the game
 * (text is shown on hover of data point)
 * @param {*} d Data object for the match
 */
function getTooltipText(d) {
  let text = "<b>";
  if (d.wasDraw) { text += "DRAW" }
  else if (d.homeScore > d.awayScore) { text += "WIN" }
  else if (d.homeScore < d.awayScore) { text += "LOSS" }

  let date = moment(d.date * 1000);

  text += "</b><br> against the " + d.awayTeam + "<br>"
    + Math.max(d.homeScore, d.awayScore)
    + " to " + Math.min(d.homeScore, d.awayScore)
    + ".<br>" + date.format("YYYY") + " Round " + d.round
    + "<br> " + date.format("ddd Do MMM");

  return text;
}

/**
 * Enlarges and whitens the data point on hover
 * Displays the tool tip
 * @param {*} d data point hovered over
 * @param {*} i index of data point
 */
function handleDataPointMouseOver(d, i) {
  let dataPoint = d3.select(this);
  dataPoint.transition()
    .ease(d3.easeCubic)
    .duration(200)
    .attr("fill", "white")
    .attr("r", 2 * standardRadius);

  tooltip.style("opacity", 1)
}

/**
 * Moves the tooltip text, as the mouse moves within the data point
 * @param {*} d data point hovered over
 * @param {*} i index of data point
 */
function handleDataPointMouseMove(d, i) {
  tooltip.html(getTooltipText(d))
    .style("position", "absolute")
    .style("left", (d3.mouse(this)[0] + 200) + "px")
    .style("top", (d3.mouse(this)[1]) + "px")
}

/**
 * Returns the data point to it's normal size
 * Returns the data point to it's normal colour
 * Hides the tooltip
 * @param {*} d data point that was hovered over
 * @param {*} i index of data point
 */
function handleDataPointMouseOut(d, i) {
  let dataPoint = d3.select(this);
  dataPoint.transition()
    .ease(d3.easeCubic)
    .duration(200)
    .attr("fill", getDataPointColour)
    .attr("r", standardRadius);

  tooltip.style("opacity", 0);
}

/**
 * Executed when user selects different team in drop-down menu
 * Re-draws visualisation for the newly chosen team
 * @param {*} x Index of chosen team
 */
function jumpto(x) {
  chosenTeam = x;
  displayDefenseGraph();
}