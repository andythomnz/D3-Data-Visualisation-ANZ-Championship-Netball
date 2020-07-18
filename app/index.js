let data = [];

const http = new XMLHttpRequest();

http.open("GET", "/data", true); // Makes GET request to data endpoint

// Create a listener so that when the http request is done
// and the status is 200 (successful), update the data.
http.onreadystatechange = function () {
  if(http.readyState === 4 && http.status === 200) {
    data = JSON.parse(http.responseText);
  }
};

// Send the request
http.send();
