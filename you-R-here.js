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
_.str.include("underscore.string", "string"); //put all conflicting methods in _.str

_io.set('log level', 1); //reduce logging

var moment = require('moment');
var config = require("./targetprocess.config");
var _address = config.info.serverAddress;// "http://localhost"; //TODO: move this to a config file
var _port = config.info.serverPort; //8080; //TODO: move this to a config file

_server.listen(_port);
var _users = []; //users currently connected 
var _demoItems = []; //user stories and bugs 
var _iteration = {endDate: new Date()}; //information about the current iteration to which the demo items belong
var _activeItemId = 0;
var _staticContentItems = {
    title: "you-R-here",
    scripts: [
        "/socket.io/socket.io.js",
        "https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js",
        "https://ajax.googleapis.com/ajax/libs/jqueryui/1.9.1/jquery-ui.min.js",
        "http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.2/underscore-min.js",
        //"http://cdnjs.cloudflare.com/ajax/libs/backbone.js/0.9.2/backbone.js",
        "/client_libs/backbone.js", //development version
        "http://cdn.jsdelivr.net/jgrowl/1.2.6/jquery.jgrowl_minimized.js",
        "/client_libs/backbone.iobind.js",
        "/client_libs/backbone.iosync.js",
        "/client_libs/moment.min.js",
        "/client_script/model.js",
        "/client_script/views.js"
    ],
    styles: [
        "/bootstrap/css/bootstrap.min.css",
        "/css/jquery.jgrowl.css",
        //"/css/jquery-ui-1.8.21.custom.css",
        "http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.1/themes/base/jquery-ui.css",
		"/css/index.css",
    ],
    version: JSON.parse(_fs.readFileSync("package.json", "utf8")).version, //get the version from the package.json file and hand it off to the views
    address: _address,
    port: _port
};
var _headerInfo;
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
_app.get("/admin*", function (req, res) {
    res.render("admin.jade", _staticContentItems);
});
_app.get("/organizer*", function (req, res) {
    res.render("organizer.jade", _staticContentItems);
});
_app.get("/presenter*", function (req, res) {
    res.render("presenter.jade", _staticContentItems);
});
_app.get("/*", function(req, res){         
    var uri = _url.parse(req.url).pathname;         
    var filename = _path.join(process.cwd(), uri);         
    _fs.exists(filename, function(exists){
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
    //console.log('getMostRecentIterationBoundary: boundaryDate = "' + boundaryDate + '"');
    _iteration.endDate = boundaryDate;
    refreshEntities(sendHeaderInfo);
});

_io.sockets.on("connection", function (socket) {

    socket.on('headerinfo:read', function(data, callback){
        console.log('headerinfo:read!!');
        _headerInfo = buildHeaderInfo();
        callback(null, _headerInfo);
        //this probably means that I'm doing something wrong in creatin/init of HeaderInfoView
        //but this update assures that organizer first page load gets correct header info
        _io.sockets.emit('headerinfo:update', _headerInfo);
    });

    socket.on("iteration:read", function(data, callback) {
        console.log("iteration:read - endDate = '" + _iteration.endDate + "'");
        callback(null, _iteration);
    });

    socket.on("iteration:create", function(iteration, callback) {
        console.log("iteration:create - iteration.endDate = '" + iteration.endDate + "'");
        //todo: filter out bad dates
        _iteration = iteration;
        refreshEntities(function() {
            //showItems(_demoItems,"iteration:create ===> ");
            socket.broadcast.emit("iteration:update", _iteration);
            _io.sockets.emit("demoitems:refresh", _demoItems);
            sendHeaderInfo();
        });
    });

    // called when .fetch() is called on DemoItems collection on client side
    socket.on("demoitems:read", function (data, callback) {
        //logIt("DEMOITEMS:READ --------------------------");
        callback(null, _demoItems);
        //showItems(_demoItems,"demoItems:read ===> ");
        //_io.sockets.emit('headerinfo:update', _headerInfo);

    });

    socket.on("demoitems:reset", function(data) {
        //showItems(_demoItems,"demoItems:reset ===> ");
    });

    // called when .save() is called on DemoItem model
    socket.on("demoitems:update", function (updatedDemoItem, callback) {

        //update in-memory demo items list
        var oldDemoItem = _.find(_demoItems, function (e) { return e.id === updatedDemoItem.id; }),
            idx = _demoItems.indexOf(oldDemoItem);

        if (idx < 0) {
            logIt('WARN: idx less than zero! oldDemoItem NOT FOUND! for id: ' + updatedDemoItem.id);
            //showItems(_demoItems,"WARN: idx < zero ==> ");
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
                    //showItems(_demoItems,"WARN: nextDemoItem not found! ==> ");
                } 
            } else {
                if (updatedDemoItem.nextId == _demoItems[idx+1].id) {
                    logIt('No move required!')
                } else {
                    console.log('WARN: nextIdx: ' + nextIdx + '; _demoItems.len: ' + len);
                    //showItems(_demoItems,'WARN: nextIdx: ' + nextIdx + '; _demoItems.len: ' + len + ' ==> ');
                }
            }
        }

        showItems(_demoItems,"AFTER  ==> ");
 
        //tell everyone else what happened
        var activeChanged = !oldDemoItem.active && updatedDemoItem.active,
            action = (activeChanged) ? "activeChanged" : "update";
        
        socket.broadcast.emit("demoitems/" + updatedDemoItem.id + ":" + action, updatedDemoItem);

        callback(null, updatedDemoItem);
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
        newUser.gravatarUrl = _gravatar.url(newUser.email, { size: "32", default: "identicon" });
        _users.push(newUser);

        socket.userid = newUser.id;
        socket.email = newUser.email;

        socket.emit("users:create", newUser);
        socket.broadcast.emit("users:create", newUser);

        //logIt("Users...");
        //logIt(_users);

        callback(null, newUser);

    });

    //handle client disconnects
    socket.on("disconnect", function () {

        logIt("DISCONNECT --------------------------");
        logIt(socket.userid + " has disconnected");

        //tell everyone else that the user disconnected
        var user = _.where(_users, { id: socket.userid });
        socket.broadcast.emit("user/" + socket.userid + ":delete", user);

        //logIt("Users...");
        //logIt(_users);

        //remove the user from the array
        for (var i = 0, len = _users.length; i < len; i++) {
            if (_users[i].id === socket.userid) {
                logIt("deleting item " + i);
                _users.splice(i, 1);
                break;
            }
        }

        //logIt("Users...");
        //logIt(_users);

        //logIt("USERS LIST (after removal): " + _users);
    });
});

function refreshEntities(callback) {
    _tp.api("getEntitiesForActiveIteration", function (data) {
        _demoItems = tpToModelSchema(data);
        if (callback) {
            console.log('refreshEntities callback!')
            callback();
        }
    }, { date: _iteration.endDate });
}

function tpToModelSchema(data) {

    //TODO: Replace this transformation method with another object/middleware               
    //Transform to standard model schema
    var item, isDemonstrable,descHasH1, title, 
        desc, descAfterCapture, descAfterH1Replace, assignedDevelopers, assignedUser,
        entities = [],
        notDemonstrableRegex = new RegExp('not demonstrable', 'i'),
        developerRegex = new RegExp('developer', 'i'),
        h1CaptureDescRegex = new RegExp('<[h|H]1>((.)*)</[h|H]1>'),
        h1ReplaceRegex = new RegExp('(<h1>|<H1>|</h1>|</H1>)'),
        imageLinkRegex =  new RegExp('(~)/images', 'gi'); //new RegExp('((https://|http://)(.)*/~)');

    for (var i = 0, len = data.Items.length; i < len; i++) {
        item = data.Items[i];
        isDemonstrable = notDemonstrableRegex.test(item.Tags) ? false : true;
        descHasH1 = h1ReplaceRegex.test(item.Description);
        descAfterCapture = (descHasH1) ? h1CaptureDescRegex.exec(item.Description) : '';
        title = (descHasH1) ? descAfterCapture[0].replace(h1ReplaceRegex, '') : item.Name;
        descAfterH1Replace = (descHasH1) ? item.Description.replace(h1CaptureDescRegex,'').replace(h1ReplaceRegex, '') : item.Description;
        desc = (descAfterH1Replace && descAfterH1Replace.length > 0) ? descAfterH1Replace : item.Name;

        assignedDevelopers = _.filter(data.Items[i].Assignments.Items, function (item) {
            return developerRegex.test(item.Role.Name);
        });        		
		assignedUser = assignedDevelopers.length > 0 ? assignedDevelopers[0].GeneralUser : {FirstName: "not", LastName: "assigned", Email: ""};

        entities.push({
            id: item.Id,
            name: title, //item.Name,
            description: (desc) ? desc.replace(imageLinkRegex, config.info.baseImageUrl + '/images') : '', //item.Description,
            project: item.Project.Name,
            type: item.EntityType.Name,
            demonstratorName: assignedUser.FirstName + " " + assignedUser.LastName,
            demonstratorEmail: assignedUser.Email,
            demonstrable: isDemonstrable,
            demonstrated: false,
            boundaryDate: _iteration.endDate,
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
    for (var i = 0, len = _demoItems.length; i < len; i++) {
        if (parseInt(_demoItems[i].id) === id) {
            item = _demoItems[i];
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
    return;
    var msg = prefix + " length: " + demoItems.length + ". ";
    _.each(demoItems, function(val) {
        msg += val.id + (val.active ? "," + val.active : "") + ";";
    });
    logIt(msg);
}

function buildHeaderInfo() {
    var dateFormat = 'MMM D [\']YY', //use 'll' with moment 2.0.x
        itemCount = (_demoItems) ? _demoItems.length : 0,
        bugRegex = new RegExp('Bug', 'i'),
        bugList = _.filter(_demoItems, function(item) {
                //console.log(item.type);
                return bugRegex.test(item.type); 
            }),
        bugCount = (itemCount < 1) ? 0 : bugList.length,
        headerinfo = {
            startDate: moment(_iteration.endDate).subtract('weeks', config.info.iterationDurationInWeeks).format(dateFormat),
            endDate: moment(_iteration.endDate).format(dateFormat),
            itemCount: itemCount,
            bugCount: bugCount,
            userStoryCount: itemCount - bugCount,
            orgName: config.info.orgName
    };
    console.log(headerinfo);
    return headerinfo;
};

function sendHeaderInfo() {
    console.log('sendHeaderInfo');   
    _headerInfo = buildHeaderInfo();
    _io.sockets.emit('headerinfo:update', _headerInfo);
}

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: function (searchString, position) {
      position = position || 0;
      return this.indexOf(searchString, position) === position;
    }
  });
}