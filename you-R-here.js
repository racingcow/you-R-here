var _express = require("express");
var _app = _express();
var _http = require("http");
var _server = _http.createServer(_app);
var _io = require("socket.io").listen(_server);
var _gravatar = require("gravatar");
var _tp = require("./targetprocess");
var _url = require("url");
var _path = require("path");
var _fs = require("fs");
var _mime = require("mime");
var _uuid = require("node-uuid"); //Creates "guids" for use as unique object ids

var _ = require("underscore");
_.str = require("underscore.string"); //there are name conflicts with underscore.string
_.mixin(_.str.exports()); //put the non-conflicting methods in _ var
_.str.include("Unserscore.string", "string"); //put all conflicting methods in _.str

var _address = "http://localhost"; //TODO: move this to a config file
var _port = 8080; //TODO: move this to a config file

_server.listen(_port);
var _users = []; //users currently connected 
var _demoItems = []; //user stories and bugs 
var _activeItemId = 0;
var _staticContentItems = {
    title: "you-R-here",
    scripts: [
        "/socket.io/socket.io.js",
        "https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js",
        "https://ajax.googleapis.com/ajax/libs/jqueryui/1.9.1/jquery-ui.min.js",
        "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.2/underscore-min.js",
        //"http://cdnjs.cloudflare.com/ajax/libs/backbone.js/0.9.2/backbone.js",
        "client_libs/backbone.js", //development version
        "http://cdn.jsdelivr.net/jgrowl/1.2.6/jquery.jgrowl_minimized.js",
        "client_libs/backbone.iobind.js",
        "client_libs/backbone.iosync.js",
        "client_libs/moment.min.js",
        "client_script/model.js",
        "client_script/views.js"
    ],
    styles: [
        "css/index.css",
        "css/jquery.jgrowl.css",
        "css/jquery-ui-1.8.21.custom.css"
    ],
    version: JSON.parse(_fs.readFileSync("package.json", "utf8")).version, //get the version from the package.json file and hand it off to the views
    address: _address,
    port: _port
};

//routing 
/* _app.get("/userimage/:id", function(req, res) {          
//console.log("userimage");         
//console.log(req.params["id"]);          
//Return a picture of the user         
_tp.api("getUserImage", function(data) {        
res.send(image, "binary");
}, { id: req.params["id"] }); }); */ 
_app.get("/", function(req, res) {         
    res.render("spectator.jade", _staticContentItems);
});
_app.get("/admin.html", function (req, res) {
    res.render("organizer.jade", _staticContentItems);
});
_app.get("/presenter.html", function (req, res) {
    res.render("presenter.jade", _staticContentItems);
});
_app.get("/*", function(req, res){         
    var uri = _url.parse(req.url).pathname;         
    var filename = _path.join(process.cwd(), uri);         
    _path.exists(filename, function(exists){
        if(!exists){        
            res.writeHead(404, {"Content-Type" : "text/plain"});        
            res.write("Content not found");        
            res.end();        
            return;
        } 
        _fs.readFile(filename, "binary", function(err, file){                
            res.writeHead(200, {"Content-Type" : _mime.lookup(filename) });        
            res.write(file, "binary");        
            res.end();
        });          
    }); 
});

//auto-load entities list for most recent iteration when app starts
_tp.api("getMostRecentIterationBoundary", function (boundaryDate) {
    refreshEntities(boundaryDate);
});

_io.sockets.on("connection", function (socket) {    

    // called when .fetch() is called on DemoItems collection on client side
    socket.on("demoitems:read", function (data, callback) {
        console.log("DEMOITEMS:READ --------------------------");
        callback(null, _demoItems);
    });

    // called when .save() is called on DemoItem model
    socket.on("demoitems:update", function (newDemoItem, callback) {

        console.log("DEMOITEMS:UPDATE --------------------------");
        console.log("id = " + newDemoItem.id);
        console.log("demonstrable = " + newDemoItem.demonstrable);

        //update in-memory demo items list
        var oldDemoItem = _.find(_demoItems, function (e) { return e.id === newDemoItem.id; });        
        _.each(_demoItems, function (e) { e.active = false; }); //there can be only one
        _demoItems[_demoItems.indexOf(oldDemoItem)] = newDemoItem;

        //tell everyone else what happened
        var action = "update";
        var activeChanged = !oldDemoItem.active && newDemoItem.active;
        if (activeChanged) action = "activeChanged";
        console.log("action = " + action);
        socket.broadcast.emit("demoitems/" + newDemoItem.id + ":" + action, newDemoItem);

        callback(null, newDemoItem); //do we need both this and socket.emit?
    }); 

    // called when .fetch() is called on Users collection on client side
    socket.on("users:read", function (data, callback) {
        console.log("USERS:READ --------------------------");
        callback(null, _users);
    });

    socket.on("user:create", function (newUser, callback) {

        console.log("USER:CREATE --------------------------");

        if (!newUser.email || _.trim(newUser.email) === "") return;

        newUser.id = _uuid.v4(); //backbone.iobind loses its mind if ids are not unique
        newUser.gravatarUrl = _gravatar.url(newUser.email, { size: "80", default: "identicon" });
        _users.push(newUser);

        socket.userid = newUser.id;
        socket.email = newUser.email;

        socket.emit("users:create", newUser);
        socket.broadcast.emit("users:create", newUser);

        console.log("Users...");
        console.log(_users);

        callback(null, newUser);

    });

    //handle client disconnects
    socket.on("disconnect", function () {

        console.log("DISCONNECT --------------------------");
        console.log(socket.userid + " has disconnected");

        //tell everyone else that the user disconnected
        var user = _.where(_users, { id: socket.userid });
        socket.broadcast.emit("user/" + socket.userid + ":delete", user);

        console.log("Users...");
        console.log(_users);

        //remove the user from the array
        for (var i = 0; i < _users.length; i++) {
            if (_users[i].id === socket.userid) {
                console.log("deleting item " + i);
                _users.splice(i, 1);
                break;
            }
        }

        console.log("Users...");
        console.log(_users);

        console.log("USERS LIST (after removal): " + _users);
    });

    ////Send the new entities when the client requests them
    //socket.on("retrieveentities", function(){
    //    socket.emit("entitiesretrieved", _demoItems);
    //});
    //socket.on("retrieveactiveitem", function(){
    //    //console.log("sending back active item id");
    //    var item = getItem(_activeItemId);
    //    socket.emit("activeitemchanged", item);         
    //});          

    ////when the client emits "adduser", this listens and executes         
    //socket.on("adduser", function(username) { 
        
    //    //get the gravatar for this user
    //    var gravatarUrl = _gravatar.url(username, { size: "80", default:"identicon"}); 
        
    //    //store username in the socket session for this client, and in global list
    //    socket.username = username;
    //    _gravatarUrls[username] = gravatarUrl; 
        
    //    //tell the client that he or she has been connected
    //    socket.emit("updateaudit", "SERVER", "you have connected"); 
        
    //    //tell everyone else that he or she has been connected
    //    socket.broadcast.emit("updateaudit", "SERVER", username + " has connected"); 
        
    //    //update the list of users on the client side
    //    _io.sockets.emit("updateusers", _gravatarUrls);          
    //});          
    
    ////Admin changes active item         
    //socket.on("changeactiveitem", function(activeItemId, activeItemName) {
    //    _activeItemId = activeItemId;
    //    socket.emit("updateaudit", "SERVER", "you changed the active item to '" + activeItemName + "'");
    //    socket.broadcast.emit("updateaudit", "SERVER", socket.username + " changed the active item to '" + activeItemName + "'");
    //    var item = getItem(_activeItemId);
    //    _io.sockets.emit("activeitemchanged", item);         
    //});          
    
    ////Admin changes item shown         
    //socket.on("changeshown", function(data) {
    //    var id = parseInt(data.id);
    //    for (var idx=0; idx < _demoItems.length; idx++) {
    //        //console.log('changeshown ==> oh my: ' + idx);
    //        //console.log('_demoItems[idx].Id: ' + _demoItems[idx].Id + '; data.id: ' + data.id);
    //        if (parseInt(_demoItems[idx].Id) === id) {
    //            _demoItems[idx].shown = data.val;
    //            break;
    //        }
    //    };
    //    //console.log('changeshown: ' + data.id);
    //    //socket.emit("updateaudit", "SERVER", "change id: '" + data.id + "' to " + data.val);
    //    _io.sockets.emit("shownchanged", data);         
    //});
    
    ////Admin changes item is demonstrable         
    //socket.on("changenodemo", function(data) {
    //    var id = parseInt(data.id);
    //    for (var idx=0; idx < _demoItems.length; idx++) {
    //        //console.log('changenodemo ==> oh my: ' + idx);
    //        //console.log('_demoItems[idx].Id: ' + _demoItems[idx].Id + '; data.id: ' + data.id);
    //        if (parseInt(_demoItems[idx].Id) === id) {
    //            _demoItems[idx].canDemo = data.val;
    //            break;
    //        }
    //    };

    //    //console.log('changenodemo: ' + data.id);
    //    //socket.emit("updateaudit", "SERVER", "change id: '" + data.id + "' to " + data.val);
    //    _io.sockets.emit("nodemochanged", data);         
    //});          
    
    ////handle client disconnects         
    //socket.on("disconnect", function () {

    //    //remove the username from the global list
    //    delete _gravatarUrls[socket.username];

    //    //update the list of users on the client side
    //    _io.sockets.emit("updateusers", _gravatarUrls);

    //    //tell everyone that the user left
    //    socket.broadcast.emit("updateaudit", "SERVER", socket.username + " has disconnected.");
    //});
});

function refreshEntities(boundaryDate) {
    _tp.api("getEntitiesForActiveIteration", function (data) {
        _demoItems = tpToModelSchema(data, boundaryDate);
    }, { date: boundaryDate });
}

function tpToModelSchema(data, boundaryDate) {

    //TODO: Replace this transformation method with another object/middleware               

    //Transform to standard model schema
    var entities = [];
    for (var i = 0; i < data.Items.length; i++) {
        var item = data.Items[i];

        var assignedDevelopers = _.filter(data.Items[i].Assignments.Items, function (item) {
            return item.Role.Name === "Developer";
        });        		
		var assignedUser = assignedDevelopers.length > 0 ? assignedDevelopers[0].GeneralUser : {FirstName: "not", LastName: "assigned", Email: ""};

        entities.push({
            id: item.Id,
            name: item.Name,
            description: item.Description,
            project: item.Project.Name,
            type: item.EntityType.Name,
            demonstratorName: assignedUser.FirstName + " " + assignedUser.LastName,
            demonstratorEmail: assignedUser.Email,
            demonstrable: true,
            demonstrated: false,
            boundaryDate: boundaryDate,
            active: false
        });
    }

    return entities.sort(function (a, b) { return a.project.localeCompare(b.project); });
}

function getItem(itemId) {
    var id = parseInt(itemId),
        item = null;
    for (var idx = 0; idx < _demoItems.length; idx++) {
        if (parseInt(_demoItems[idx].Id) === id) {
            item = _demoItems[idx];
            break;
        }
    };
    return item;
}