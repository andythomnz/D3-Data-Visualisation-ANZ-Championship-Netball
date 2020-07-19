# D3-Data-Visualisation-ANZ-Championship-Netball
Built by Andrew Thompson, Daniel Young and Maegan Kennedy

Three different visualisations of the same amalgamated ANZ Championship dataset. Each of the visualisations aims to provide users with a different perspective of the match results.

[Try the visualisation yourself](https://anz-netball-visualisation.herokuapp.com/) - hosted on Heroku

## Performance Over Time Visualisation
This visualisation aims to convey a quickly understood overview of how well an individual team has performed in the championship. This is achieved by indicating whether a match was won or lost, and by additionally conveying how close the score was. As seen below, a selection of bubbles is shown at the top of the screen, which allows selection of an individual team to visualise.

![Performance Over Time Visualisation](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Performance Over Time Visualisation")

## Home Court Advantage Visualisation
The primary goal of this visualisation is to give a clear answer to the question of how well a particular team defended their home turf. This visualisation aims to display not only when a particular team won on home ground, but also by how much.

![Home Court Advantage Visualisation](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Home Court Advantage Visualisation")

## Team Rivalries Visualisation
This visualisation aims to paint a picture of the rivalries existing amongst teams in the championship. As the data set spans multiple years, and given that in some instances the same two teams will play each other twice in one season, significant insight can be shown into inter-team rivalries.
On first load, the user can use the two drop-down menus at the top of the page to choose two different teams. After doing so, the visualisation will show a histogram of points scored for both teams in each game where the two teams have played each other. As an alternative to manually selecting two teams, the left section of the display lists the top rivalries between teams. The top rivalry is that where two teams have won nearly an equivalent number of games against each other. For each of the top rivalries, a chart shows the ratio of games won between each team. Clicking on any of the top rivalries will pre-select those teams in the drop-down menus, and display the appropriate visualisation.

![Team Rivalries Visualisation](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Team Rivalries Visualisation")