var HOST = "http://kennanseno.com:8000";

var URLS = {
    getStops: "/rest/busStops/",
    getSchedule: "/rest/stopSchedule/",
    login: "/rest/tokenlogin/",
    userme: "/rest/userme/",
    updateposition: "/rest/updateposition/",
    signup: "/rest/signup/"
};

var map;

var myIcon = L.ExtraMarkers.icon({
    icon: 'fa-crosshairs',
    iconColor: 'white',
    markerColor: 'red',
    shape: 'square',
    prefix: 'fa'
});

function onLoad() {
    console.log("In onLoad.");
    document.addEventListener('deviceready', onDeviceReady, false);
}

function onDeviceReady() {
    console.log("In onDeviceReady.");

    $("#btn-login").on("touchstart", loginPressed);
    $("#sp-logout").on("touchstart", logoutPressed);
    $("#btn-register").on("touchstart", registerUser);
    $("#btn-signup").on("touchstart", signupPressed);
    $("#btn-cancel").on("touchstart", signupCancel);
    

    if (localStorage.lastUserName && localStorage.lastUserPwd) {
        $("#in-username").val(localStorage.lastUserName);
        $("#in-password").val(localStorage.lastUserPwd);
    }

    $(document).on("pagecreate", "#map-page", function (event) {
        console.log("In pagecreate. Target is " + event.target.id + ".");

        $("#goto-currentlocation").on("touchstart", function () {
            getCurrentlocation();
        });

        $("#get-buslocations").on("touchstart", function () {
            getStopLocations();
        });
                   
        $("#map-page").enhanceWithin();

        makeBasicMap();
        getCurrentlocation();
    });

    $(document).on("pageshow", function (event) {
        console.log("In pageshow. Target is " + event.target.id + ".");
        setUserName();
    });

    $(document).on("pageshow", "#map-page", function () {
        console.log("In pageshow / #map-page.");
        map.invalidateSize();
    })

    $('div[data-role="page"]').page();

    console.log("TOKEN: " + localStorage.authtoken);
    if (localStorage.authtoken) {
        $.mobile.navigate("#map-page");
    } else {
        $.mobile.navigate("#login-page");
    }
}

function signupPressed() {
    $.mobile.navigate("#signup-page");
}

function signupCancel() {
    $.mobile.navigate("#login-page");
}

function loginPressed() {
    console.log("In loginPressed.");
    $.ajax({
        type: "GET",
        url: HOST + URLS["login"],
        data: {
            username: $("#in-username").val(),
            password: $("#in-password").val()
        }
    }).done(function (data, status, xhr) {
        localStorage.authtoken = localStorage.authtoken = "Token " + xhr.responseJSON.token;
        localStorage.lastUserName = $("#in-username").val();
        localStorage.lastUserPwd = $("#in-password").val();

        $.mobile.navigate("#map-page");
    }).fail(function (xhr, status, error) {
        var message = "";
        if ((!xhr.status) && (!navigator.onLine)) {
            message += "Bad Internet Connection\n";
        }
        message += xhr.responseJSON.detail;
        showAlert(message, "Login Failed");
        logoutPressed();
    });
}

function registerUser() {
    $.ajax({
        type: "GET",
        url: HOST + URLS["signup"],
        data: {
           username: $("#signup-username").val(),
           password: $("#signup-password").val(),
           firstname: $("#signup-firstname").val(),
           lastname: $("#signup-lastname").val(),
           email: $("#signup-email").val()
        }
    }).done(function (data, status, xhr) {
        localStorage.authtoken = localStorage.authtoken = "Token " + xhr.responseJSON.token;
        localStorage.lastUserName = $("#in-username").val();
        localStorage.lastUserPwd = $("#in-password").val();
            
        $.mobile.navigate("#map-page");
    }).fail(function (xhr, status, error) {
        var message = "";
        if ((!xhr.status) && (!navigator.onLine)) {
            message += "Bad Internet Connection\n";
        }
        message += xhr.responseJSON.detail;
        showAlert(message, "Registration failed!");
    });
}

function logoutPressed() {
    console.log("In logoutPressed.");
    localStorage.removeItem("authtoken");
    $.mobile.navigate("#login-page");
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["logout"]
     }).always(function () {
         localStorage.removeItem("authtoken");
         $.mobile.navigate("#login-page");
     });
}

/**
 Function for alertbox
 */
function showAlert(message, title) {
    navigator.notification.alert(message, null, title, "OK");
}

function getCurrentlocation() {
    console.log("In getCurrentlocation.");
    var myLatLon;
    var myPos;

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            myLatLon = L.latLng(pos.coords.latitude, pos.coords.longitude);
            myPos = new myGeoPosition(pos);
            localStorage.lastKnownCurrentPosition = JSON.stringify(myPos);

            setMapToCurrentLocation();
            //updatePosition();

        },
        function (err) {
        },
        {
            enableHighAccuracy: true,
            maximumAge: 60000,
            timeout: 60000
        }
    );
}


function getStopLocations() {
    //remove and refresh markers
    map.remove();
    makeBasicMap();
    setMapToCurrentLocation();
  
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["getStops"]
    }).done(function (data, status, xhr) {
        var data = JSON.parse(data.data);
        var stops = data.results;
        for (var count = 0; count < stops.length; count++){
            var id = stops[count].stopid;
            var name = stops[count].shortname;
            var lat = stops[count].latitude;
            var long = stops[count].longitude;
            var latLng = L.latLng(lat, long);
            
            //add stop informations
            var stopInfo = "id: <b>" + id + "</b><br>" + "Name: <b>" + name + "</b><br>Routes: <b>";
            var busRoutes = stops[count].operators[0].routes;
            for (var index = 0; index < busRoutes.length; index++){
                stopInfo += busRoutes[index];
                if(index < busRoutes.length - 1) {
                    stopInfo += ",";
                }
            }
            stopInfo += "</b><br> <button onclick=getStopSchedule("+ id +")>Show Timetable</button> <br> <button onclick=getDirections("+ lat + "," + long +")>Get Directions</button>";
            
            L.marker(latLng).addTo(map).bindPopup(stopInfo);
        }
    }).fail(function (xhr, status, error) {
        $(".sp-username").html("");
    });
}

/**
 Function to get Timetable of a stop using the stop id
 and display in the alertbox
 */
function getStopSchedule(stopId) {
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["getSchedule"],
        data: {
           stopid: stopId
        }
    }).done(function (data, status, xhr) {
        var data = JSON.parse(data.data);
        var schedules = data.results;
        var stopInfo = "";
        for (var count = 0; count < schedules.length; count++){
            var origin = schedules[count].origin;
            var destination = schedules[count].destination;
            var route = schedules[count].route;
            var duetime = schedules[count].duetime;
            
            stopInfo += "Route: " + route + " (" + destination + ") Time: " + calculateDueTime(duetime);
            stopInfo += "\n";
        }
        showAlert(stopInfo, "Bus Timetable")
    }).fail(function (xhr, status, error) {
        $(".sp-username").html("");
    });

}

/**
 Display direction from current user location and the selected bus stop
 */
function getDirections(lat, long) {
    var busLatLong = L.latLng(lat, long);
    var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
    var myLatLong = L.latLng(myPos.coords.latitude, myPos.coords.longitude);

    //remove markers
    map.remove();
    makeBasicMap();
    
    L.Routing.control({
        waypoints: [
            L.latLng(myPos.coords.latitude, myPos.coords.longitude),
            L.latLng(lat, long)
        ],
        routeWhileDragging: true
    }).addTo(map);
}

/**
 Function to change time to current label
 */
function calculateDueTime(minutes) {
    var time = parseInt(minutes);
    var timeLabel = "mins";
    if(time >= 60) {
        time = time/60;
        timeLabel = "hr";
    }
    return time.toString() + timeLabel;
}

function setMapToCurrentLocation() {
    console.log("In setMapToCurrentLocation.");
    if (localStorage.lastKnownCurrentPosition) {
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        var myLatLon = L.latLng(myPos.coords.latitude, myPos.coords.longitude);
        L.marker(myLatLon, {icon: myIcon}).addTo(map);
        map.flyTo(myLatLon, 13);
    }
}

function updatePosition() {
    console.log("In updatePosition.");
    if (localStorage.lastKnownCurrentPosition) {
        var myPos = JSON.parse(localStorage.lastKnownCurrentPosition);
        $.ajax({
            type: "PATCH",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": localStorage.authtoken
            },
            url: HOST + URLS["updateposition"],
            data: {
                lat: myPos.coords.latitude,
                lon: myPos.coords.longitude
            }
        }).done(function (data, status, xhr) {
            showAlert("Position Updated", "Notice");
        }).fail(function (xhr, status, error) {
            var message = "Position Update Failed\n";
            if ((!xhr.status) && (!navigator.onLine)) {
                message += "Bad Internet Connection\n";
            }
            message += "Status: " + xhr.status + " " + xhr.responseText;
            showAlert(message, "Error");
        }).always(function () {
            $.mobile.navigate("#map-page");
        });
    }
}

function makeBasicMap() {
    console.log("In makeBasicMap.");
    map = L.map("map-var", {
        zoomControl: false,
        attributionControl: false
    }).fitWorld();
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        useCache: true
    }).addTo(map);

    $("#leaflet-copyright").html("Leaflet | Map Tiles &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors");
}

function myGeoPosition(p) {
    this.coords = {};
    this.coords.latitude = p.coords.latitude;
    this.coords.longitude = p.coords.longitude;
    this.coords.accuracy = (p.coords.accuracy) ? p.coords.accuracy : 0;
    this.timestamp = (p.timestamp) ? p.timestamp : new Date().getTime();
}

function setUserName() {
    console.log("In setUserName.");
    $.ajax({
        type: "GET",
        headers: {"Authorization": localStorage.authtoken},
        url: HOST + URLS["userme"]
    }).done(function (data, status, xhr) {
        $(".sp-username").html(xhr.responseJSON.properties.username);
    }).fail(function (xhr, status, error) {
        $(".sp-username").html("");
    });
}

