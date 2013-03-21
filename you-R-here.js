console = console || { log: function() {} };

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
_io.set('log level', 1); //reduce logging

var config = require("./targetprocess.config");
var _address = config.info.serverAddress;// "http://localhost"; //TODO: move this to a config file
var _port = config.info.serverPort; //8080; //TODO: move this to a config file

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
//logIt("userimage");         
//logIt(req.params["id"]);          
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
        //logIt("DEMOITEMS:READ --------------------------");
        callback(null, _demoItems);

        showItems(_demoItems,"demoItems:read ===> ");
    });

    // called when .save() is called on DemoItem model
    socket.on("demoitems:update", function (updatedDemoItem, callback) {

        //update in-memory demo items list
        var oldDemoItem = _.find(_demoItems, function (e) { return e.id === updatedDemoItem.id; }),
            idx = _demoItems.indexOf(oldDemoItem);

        if (idx < 0) {
            logIt('WARN: idx less than zero! oldDemoItem NOT FOUND! for id: ' + updatedDemoItem.id);
            showItems(_demoItems,"WARN: idx < zero ==> ");
            return;  
        } 

        //there can be only one active item!
        if (updatedDemoItem.active) _.each(_demoItems, function (e) { e.active = false; });

        _demoItems[idx] = updatedDemoItem;
        //showItems(_demoItems,"BEFORE ==> ");

        var nextIdx = idx + 1,
            len = _demoItems.length;

        if (updatedDemoItem.nextId == -2) {
            _demoItems.splice(idx, 1);
            _demoItems.push(updatedDemoItem);
        }

        //update the order of demoItems if nextId != -1
        if (updatedDemoItem.nextId != -2 && updatedDemoItem.nextId != -1) {
            console.log('OH NOES!!!');

            if (nextIdx < len && _demoItems[idx+1] && updatedDemoItem.nextId != _demoItems[idx+1].id) {
                var nextDemoItem = _.find(_demoItems, function (e) { 
                    var found = e.id == updatedDemoItem.nextId;
                    if (!found) {
                        found = e.id === updatedDemoItem.nextId;                        
                    } 
                    return found;
                }),
                nextIdx = _demoItems.indexOf(nextDemoItem);

                if (idx < nextIdx) nextIdx--; //account for the position we're vacating

                if (nextIdx >= 0) {
                    //reorder!
                    _demoItems.splice(idx, 1);
                    _demoItems.splice(nextIdx, 0, updatedDemoItem);
                } else {
                    console.log('WARN: "nextDemoItem not found! nextIdx: ' + nextIdx + '; _demoItems.len: ' + len);
                    showItems(_demoItems,"WARN: nextDemoItem not found! ==> ");
                } 
            } else {
                if (updatedDemoItem.nextId == _demoItems[idx+1].id) {
                    logIt('No move required!')
                } else {
                    console.log('WARN: nextIdx: ' + nextIdx + '; _demoItems.len: ' + len);
                    showItems(_demoItems,'WARN: nextIdx: ' + nextIdx + '; _demoItems.len: ' + len + ' ==> ');
                }
            }
        }

        //showItems(_demoItems,"AFTER  ==> ");
 
        //tell everyone else what happened
        var activeChanged = !oldDemoItem.active && updatedDemoItem.active,
            action = (activeChanged) ? "activeChanged" : "update";
        
        socket.broadcast.emit("demoitems/" + updatedDemoItem.id + ":" + action, updatedDemoItem);

        callback(null, updatedDemoItem); //do we need both this and socket.emit?
    }); 

    // called when .fetch() is called on Users collection on client side
    socket.on("users:read", function (data, callback) {
        //logIt("USERS:READ --------------------------");
        callback(null, _users);
    });

    socket.on("user:create", function (newUser, callback) {

        logIt("USER:CREATE --------------------------");

        if (!newUser.email || _.trim(newUser.email) === "") return;

        newUser.id = _uuid.v4(); //backbone.iobind loses its mind if ids are not unique
        newUser.gravatarUrl = _gravatar.url(newUser.email, { size: "80", default: "identicon" });
        _users.push(newUser);

        socket.userid = newUser.id;
        socket.email = newUser.email;

        socket.emit("users:create", newUser);
        socket.broadcast.emit("users:create", newUser);

        logIt("Users...");
        logIt(_users);

        callback(null, newUser);

    });

    //handle client disconnects
    socket.on("disconnect", function () {

        logIt("DISCONNECT --------------------------");
        logIt(socket.userid + " has disconnected");

        //tell everyone else that the user disconnected
        var user = _.where(_users, { id: socket.userid });
        socket.broadcast.emit("user/" + socket.userid + ":delete", user);

        logIt("Users...");
        logIt(_users);

        //remove the user from the array
        for (var i = 0; i < _users.length; i++) {
            if (_users[i].id === socket.userid) {
                logIt("deleting item " + i);
                _users.splice(i, 1);
                break;
            }
        }

        logIt("Users...");
        logIt(_users);

        logIt("USERS LIST (after removal): " + _users);
    });
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
            active: false,
            nextId: -1
        });
    }

    return entities.sort(function (a, b) { 
        //we want User Story to be before Bug
        var typeSort = b.type.localeCompare(a.type); 
        if (typeSort != 0) return typeSort;
        
        var projectSort = a.project.localeCompare(b.project);
        if (projectSort != 0) return projectSort;

        return a.demonstratorName.localeCompare(b.demonstratorName);
    });
}

function getItem(itemId) {
    var id = parseInt(itemId),
        item = null;
    for (var idx = 0; idx < _demoItems.length; idx++) {
        if (parseInt(_demoItems[idx].id) === id) {
            item = _demoItems[idx];
            break;
        }
    };
    return item;
}

function logIt(msg) {
    if (console && console.log) {
        console.log(msg);
    } else {
        //growl it!
    }
}

function showItems(demoItems, prefix) {
    var msg = prefix + " length: " + demoItems.length + ". ";
    _.each(demoItems, function(val) {
        msg += val.id + ";";
    });
    logIt(msg);
}