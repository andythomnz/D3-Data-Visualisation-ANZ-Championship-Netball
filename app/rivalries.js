let data = [],
team1 = null,
team2 = null,
winPercentage = 25,
teams = [];
var tooltip;
var teamColours = {
  'Central Pulse': '#fff933', // bright yellow
  'Canterbury Tactix': 'red',
  'Queensland Firebirds': '#4d106d', //deep purple
  'Melbourne Vixens': '#60ffc5', // aqua
  "Adelaide Thunderbirds": '#f9acc6', // pink
  'West Coast Fever': "#51bc00", //lime green
  'Southern Steel': '#ff33dd', //bright pink
  'Waikato Bay of Plenty Magic': 'orange',
  'Northern Mystics': '#2dceff', // light blue
  'New South Wales Swifts': '#002ba3', // deep blue
}

const http = new XMLHttpRequest();

http.open("GET", "/data", true); // Makes GET request to data endpoint

http.onreadystatechange = function () {
  if(http.readyState === 4 && http.status === 200) {
    // set up toolbar for use on both visualisations
    tooltip = d3.select("body")
    .append('div')
    .attr('id', 'tooltip');
    tooltip.append('div')
    .attr('id', 'line1');
    tooltip.append('div')
    .attr('id', 'line2');
    tooltip.append('div')
    .attr('id', 'line3');
    tooltip.style("display", "none");
    tooltip.style("position", "absolute")
    .style("background", "#eee")
    .style("padding", "10px")
    .style("box-shadow", "0 0 5px #999999");

    data = JSON.parse(http.responseText);
    
    //get list of teams
    for(const game of data){
      if(teams.indexOf(game.homeTeam) < 0){
        teams.push(game.homeTeam);
      }
      if(teams.indexOf(game.awayTeam) < 0){
        teams.push(game.awayTeam);
      }
    }

    //create selects for selecting 2 teams for rivalry
    var select1 = d3.select('#team1select')
    var select2 = d3.select('#team2select')
    select1.append("option").attr("hidden", true)
    .attr("disabled", true)
    .attr("selected", true)
    .text("");
    select2.append("option")
    .attr("hidden", true)
    .attr("disabled", true)
    .attr("selected", true)
    .text("");
    
    for(const name of teams){
      select1.append("option").attr("value", name).attr("id", name+1).text(name);
      select2.append("option").attr("value", name).attr("id", name+2).text(name);
    }
    drawRivalryBars();
    
  }
};
/** Triggered when either select value is changed. Redraws score graph */
function changeTeam(num, team){
  if(num==1){
    if(team1){
      var option = document.getElementById(team1+2);
      option.disabled = false;
    }
    team1 = team;
    var option = document.getElementById(team+2);
    option.disabled = true;
    
  } else{
    if(team2){
      var option = document.getElementById(team2+1);
      option.disabled = false;
    }
    team2 = team;
    var option = document.getElementById(team+1);
    option.disabled = true;
  }
  if(team1&&team2){
    var games = getRivalryGames(team1, team2);
    drawScoresGraph(games);
  }
}

/**Triggered when percentage input is change. Redraws ratio bars */
function changeWinPercentage(perc){
  winPercentage=perc;
  drawRivalryBars();
}

/** Retrieves all games played between any two teams */
function getRivalryGames(team1, team2){
  let rivalries = [];
  for(const game of data) {
    let teams = [game.homeTeam, game.awayTeam];
    if (teams.indexOf(team1)>-1 && teams.indexOf(team2)>-1){
      rivalries.push(game);
    }
  }
  return rivalries;
}

// Send the request
http.send();

function drawRivalryBars(){
  let rivalries = []
  for (let i = 0; i < teams.length - 1; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      let team = teams[i],
      opposition = teams[j],
      teamWins = 0,
      draws = 0,
      games = getRivalryGames(team, opposition),
      processedGames = [];
      for(const game of games){
        let teamScore = game.homeTeam == team ? game.homeScore : game.awayScore;
        let oppositionScore = game.homeTeam == opposition ? game.homeScore : game.awayScore;
        if(game.wasDraw){
          draws+=1;
        } else if(teamScore>oppositionScore){
          teamWins+=1;
        }
        processedGames.push({[team]:teamScore, [opposition]:oppositionScore, "date": new Date(game.date*1000)});
      }
      let rivalry = {'teams':[{'name':team, 'wins':teamWins}, {'name':opposition, 'wins':processedGames.length-teamWins-draws}], 'games': processedGames}
      rivalry.teams.sort((a,b)=>{
        return a.wins<b.wins;
      });
      rivalries.push(rivalry);
    }
  }
  
  let bardata = rivalries.filter(rivalry =>  {
    var wins1 = rivalry.teams[0].wins/(rivalry.teams[0].wins+rivalry.teams[1].wins)*100;
    var wins2 = rivalry.teams[1].wins/(rivalry.teams[0].wins+rivalry.teams[1].wins)*100;
    return wins1>=winPercentage&&wins2>=winPercentage;
  });
  bardata.sort((a,b)=>{
    return Math.abs(a.teams[0].wins-a.teams[1].wins)/(a.teams[0].wins+a.teams[1].wins)>Math.abs(b.teams[0].wins-b.teams[1].wins)/(b.teams[0].wins+b.teams[1].wins)
  })
  let barWidth = document.getElementById('barcanvas').getBoundingClientRect().width/1.25,
  margin = {top: 20, right: 20, bottom: 30, left: 50},
  barHeight = 30;
  var svg = d3.select('#barcanvas');
  svg.selectAll("*").remove();
  var g = svg.selectAll("ratiobar")
  .data(bardata)
  .enter().append("g").attr("class", "ratiobar")
  .attr("transform", function(d, i) {
    // Set d.x and d.y here so that other elements can use it. d is 
    // expected to be an object here.
    d.x = 0,
    d.y = (i)*margin.top+(i)*barHeight+margin.bottom*i;
    return "translate(" + d.x + "," + d.y + ")"; 
  })
  .on('mouseenter', function(d){
    tooltip.select('#line1').html(d.teams[0].name+": "+ d.teams[0].wins + " wins or " + (d.teams[0].wins/d.games.length*100).toFixed(2) + "% of all games");
    tooltip.select('#line2').html(d.teams[1].name+": "+ d.teams[1].wins + " wins or " + (d.teams[1].wins/d.games.length*100).toFixed(2) + "% of all games");
    
    tooltip.style('display', 'inline');
    tooltip.style('top', event.pageY + 20 + 'px')
      .style('left', event.pageX + 20 + 'px');
  })
  .on('mousemove', function(d){
    tooltip.style('top', event.pageY + 20 + 'px')
      .style('left', event.pageX + 20 + 'px');
  })
  .on('mouseleave', function(d){
    tooltip.style('display', 'None');
  })
  .on('click', function(d){
    var one = document.getElementById('team1select');
    var two = document.getElementById('team2select');
    var opts = one.options.length;
    for (var i=0; i<opts; i++){
      if (one.options[i].value == d.teams[0].name){
          one.options[i].selected = true;
      }
      if (two.options[i].value == d.teams[1].name){
        two.options[i].selected = true;
      } 
    }
      changeTeam(1, d.teams[0].name);
      changeTeam(2, d.teams[1].name);
  });
  g.append("rect")
  .attr('class', 'bar')
  .attr("width", function(d){ return d.teams[0].wins*(barWidth/(d.teams[0].wins+d.teams[1].wins))})
  .attr("height", barHeight)
  .style("fill", function(d, i){ return teamColours[d.teams[0].name]})
  .append("text");
  g.append("rect")
  .attr('class', 'bar')
  .attr("x", function(d){ return d.teams[0].wins*(barWidth/(d.teams[0].wins+d.teams[1].wins))})
  .attr("width", function(d){ return d.teams[1].wins*(barWidth/(d.teams[0].wins+d.teams[1].wins))})
  .attr("height", barHeight)
  .style("fill", function(d){ return teamColours[d.teams[1].name]});
  g.append("text")
  .attr("text-anchor", "left")
  .attr("alignment-baseline", "top")
  .attr('y', barHeight+20)
  .text(function(d) {
    return d.teams[0].name + " vs. " + d.teams[1].name;
  })
  .attr('font-size', 12);
}

function drawScoresGraph(games){
  let cleandata = []
  for(const game of games){
    let team1score = game.homeTeam == team1 ? game.homeScore : game.awayScore;
    let team2score = game.homeTeam == team2 ? game.homeScore : game.awayScore;
    cleandata.push({[team1]:team1score, [team2]:team2score, "date": new Date(game.date*1000)})
  }
  
  var margin = {top: 20, right: 20, bottom: 100, left: 70},
      height = 700-margin.top-margin.bottom;

  
  d3.select("#graphtitle").html(team1 + " vs "+ team2); 
  var svg = d3.select('#graphcanvas')
  svg.selectAll("*").remove();
  svg = svg.attr("width", '100%')
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
  var width = document.getElementById('graphcanvas').getBoundingClientRect().width-margin.left-margin.right;

  var x = d3.scaleBand().rangeRound([0, width], .05).padding(0.1);

  var y = d3.scaleLinear().range([height, 0]);

  var xAxis = d3.axisBottom()
  .scale(x)
  .tickFormat(d3.timeFormat("%Y-%m-%d"));

  var yAxis = d3.axisLeft()
  .scale(y)
  .ticks(10);

  x.domain(games.map(function(d) { return new Date(d.date*1000); }));
  y.domain([0, d3.max(cleandata, function(d) { return Math.max(d[team1], d[team2]) })]);

  svg.append("g")
  .attr("class", "x axis")
  .attr("transform", "translate(0," + height + ")")
  .call(xAxis)
  .selectAll("text")
  .style("text-anchor", "end")
  .attr("dx", "-.8em")
  .attr("dy", "-.55em")
  .attr("transform", "rotate(-90)" );

  svg.append("g")
  .attr("class", "y axis")
  .call(yAxis)

  svg.append("text")             
  .attr("transform",
        "translate(" + (width/2) + " ," + 
        (height + margin.top + 60) + ")")
  .style("text-anchor", "middle")
  .text("Date of Match");
  
  svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - margin.left/1.5)
  .attr("x",0 - (height / 2))
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .text("Points Scored"); 
  

  let bargroup = svg.selectAll("bar")
  .data(cleandata)
  .enter().append("g")
  .on('mouseenter', function(d){
    tooltip.select('#line1').html(team1+" vs "+team2);
    tooltip.select('#line2').html(d.date.toLocaleDateString("en-AU"));
    tooltip.select('#line3').html(d[team1]+"-"+d[team2]);
    tooltip.style('display', 'inline');
    tooltip.style('top', event.pageY + 20 + 'px')
      .style('left', event.pageX + 20 + 'px');
  })
  .on('mousemove', function(d){
    tooltip.style('top', event.pageY + 20 + 'px')
      .style('left', event.pageX + 20 + 'px');
  })
  .on('mouseleave', function(d){
    tooltip.style('display', 'None');
  })

  bargroup.append("rect")
  .attr('class', 'bar')
  .style("fill", teamColours[team1])
  .attr("x", function(d) { return x(d.date); })
  .attr("width", x.bandwidth()/2)
  .attr("y", function(d) { return y(d[team1]); })
  .attr("height", function(d) { return height - y(d[team1]); })
  .on('mouseenter', function(d){
    tooltip.select('#line1').html("<b>"+team1+"</b>"+" vs "+team2);
  })

  bargroup.append("rect")
  .attr('class', 'bar')
  .style("fill", teamColours[team2])
  .attr("x", function(d) { return (x.bandwidth()/2 + x(d.date)); })
  .attr("width", x.bandwidth()/2)
  .attr("y", function(d) { return y(d[team2]); })
  .attr("height", function(d) { return height - y(d[team2]); })
  .on('mouseenter', function(d){
    tooltip.select('#line1').html(team1+" vs <b>"+team2+"</b>");
  })
}
