﻿var YouRHere = YouRHere || {};

YouRHere.DemoItemTypes = {
    Undefined: "Undefined",
    UserStory: "UserStory",
    Bug: "Bug"
};

YouRHere.Iteration = Backbone.Model.extend({
    urlRoot: 'iteration',
    socket: window.socket,
    defaults: {
        endDate: new Date()
    },
    initialize: function() {
        //YouRHere.Utils.log('YouRHere.Iteration.initialize(): endDate = "' + this.get('endDate') + '"');
        _.bindAll(this);
        this.ioBind('update', this.serverUpdate, this);
        return this;
    },
    serverUpdate: function(iteration) {
        YouRHere.Utils.log('YouRHere.Iteration.modelChanged(): endDate = "' + iteration.endDate + '"');
        this.set(iteration);
        return this;
    }
});

YouRHere.DemoItem = Backbone.Model.extend({
    socket: window.socket,
    defaults: {
        name: "",                               //As an <actor>, I want <feature>, so that <business reason>.
        description: "",                        //Details about the item
        project: "",                            //Name of the project to which the item belongs
        type: YouRHere.DemoItemTypes.UserStory, //Bug, User Story, etc.
        demonstratorName: "",                   //Name of user assigned to demonstrate this item
        demonstratorEmail: "",                  //Email address of user assigned to demonstrate this item
        demonstrable: true,                     //True if item can be shown to non-technical folks, false for tech debt or other madness
        demonstrated: true,                     //True if item has been demonstrated during this session; false otherwise.
        boundaryDate: "",                       //Date of last day in iteration to which the demo item belongs
        active: false,                          //True if the demo item is the one currently being demonstrated; false otherwise
        nextId: -1                              //The id of the next element that follows in the list. Used to indicate where in the list an item is moving when sort is changed by the organizer 
    },
    initialize: function () {
        _.bindAll(this);
        this.ioBind("update", this.serverChange, this);
        this.ioBind("activeChanged", this.setActive, this);
        this.ioBind("nextIdChanged", this.itemMoved, this);
        this.ioBind("demonstrableChanged", this.noDemoChanged, this);
        this.ioBind("demonstratedChanged", this.shownChanged, this);
    },
    serverChange: function (data) {
        YouRHere.Utils.log("YouRHere.DemoItem.serverChange: " + JSON.stringify(_.pick(data, 'id', 'active', 'nextId')));
        data.fromServer = true;
        this.set(data);
    },
    setActive: function (data) {
        YouRHere.Utils.log("YouRHere.DemoItem.setActive: " + JSON.stringify(_.pick(data, 'id', 'active', 'nextId')));
        data.fromServer = true;
        this.set(data);
    },
    modelCleanup: function () {
        this.ioUnbindAll();
        return this;
    },
    itemMoved: function(data) {
        YouRHere.Utils.log("DemoItem: " + data.id + ".itemMoved");
        YouRHere.Utils.log("DemoItem: nextId " + data.nextId + ".itemMoved");
        data.fromServer = true;
        this.set(data);  
    },
    noDemoChanged: function(data) {
        YouRHere.Utils.log("noDemoChanged: " + data.id + ".noDemoChanged");
        data.fromServer = true;
        this.set(data);  
    },
    shownChanged: function(data) {
        YouRHere.Utils.log("DemoItem: " + data.id + ".shownChanged");
        data.fromServer = true;
        this.set(data);  
    }
});

YouRHere.DemoItems = Backbone.Collection.extend({
    model: YouRHere.DemoItem,
    url: "demoitems",
    socket: window.socket,    
    initialize: function () {
        _.bindAll(this);
        this.ioBind('refresh', this.serverReset, this);
    },
    change : function() {
        YouRHere.Utils.log("I have changed.");
    },
    serverReset: function(demoItems) {
        YouRHere.Utils.log('YouRHere.DemoItem.serverReset: Count = "' + demoItems.length + '"');
        console.log(demoItems);
        this.reset(demoItems);
    },
    filterByActive: function (active) {
		//YouRHere.Utils.log("this.length = " + this.length);

        var filtered = _(this.filter(function (demoItem) { //wrapping with underscore function returns collection            
            //console.log(demoItem.get("active"));
            return demoItem.get("active").toString() == active.toString();
        }));
        //console.log(filtered);
        //YouRHere.Utils.log("filtered.length = " + filtered.length);
        return filtered;
    },
    filterByEmail: function (email) {
        return _(this.filter(function (demoItem) { //wrapping with underscore function returns collection
            return demoItem.get("demonstratorEmail") == email;
        }));
    },
    collectionCleanup: function (callback) {
        this.ioUnbindAll();
        this.each(function (model) {
            model.modelCleanup();
        });
        return this;
    },
    moveItem: function(data) {
        var currItem = this.get(data.id);
        var nextItem = this.find(function(val) {
                return val.id == data.nextId;
        });

        currItem.save("nextId", data.nextId);

        var currIdx = this.indexOf(currItem),
            nextIdx = this.indexOf(nextItem);


        if (currIdx < nextIdx) nextIdx--;

        this.remove(currItem, {silent: true});
        this.add(currItem, {at: nextIdx});
    },
    reorderList: function(itemModel) {
        console.log('reorderList');
        //we know we've moved...
        console.log(itemModel);

        var nextId = itemModel.get('nextId');
     
        var nextItem = this.find(function(val) {
                return val.id == nextId;
        });

        console.log(nextItem);

        var currIdx = this.indexOf(itemModel),
            nextIdx = this.indexOf(nextItem);
        console.log('ORIG: currIdx: ' + currIdx + '; nextIdx: ' + nextIdx);

        if (currIdx < nextIdx) nextIdx--;;
        console.log('FINAL: currIdx: ' + currIdx + '; nextIdx: ' + nextIdx);

        this.remove(itemModel, {silent: true});
        this.add(itemModel, {at: nextIdx});
    }
});

YouRHere.Conference = Backbone.Model.extend({
    urlRoot: 'conference',
    //socket: window.socket,
    defaults: {
        roomName: 'you-R-here'
    },
    openSocket: function (config) {
        YouRHere.Utils.log('YouRHere.Conference.openSocket');

        if (!window.Firebase) return;
        console.log('window.Firebase exists');
        var channel = config.channel || location.hash.replace('#', '') || 'video-conferencing';
        var socket = new Firebase('https://webrtc-experiment.firebaseIO.com/' + channel);
        console.log('firebase socket');
        console.log(socket);
        console.log('firebase channel');
        console.log(channel);
        socket.channel = channel;
        socket.on("child_added", function (data) {
            console.log('child_added');
            console.log(data.val());
            config.onmessage && config.onmessage(data.val());
        });
        socket.send = function (data) {
            console.log('socket.send');
            console.log(data);
            this.push(data);
        }
        config.onopen && setTimeout(config.onopen, 1);
        socket.onDisconnect().remove();
        return socket;
    },
    onRemoteStream: function (media) {
        YouRHere.Utils.log('YouRHere.Conference.onRemoteStream');
        //this.trigger('onRemoteStream');
        
        var video = media.video;
        video.setAttribute('controls', true);

        var participants = document.getElementById("participants");
        participants.insertBefore(video, participants.firstChild);

        video.play();
        this.rotateVideo(video);
    },
    onRoomFound: function (room) {
        YouRHere.Utils.log('YouRHere.Conference.onRoomFound: "' + room.roomName + '"');
        if (room.roomName !== this.get('roomName')) return;

        if (this.joined) return;
        this.joined = true;
        YouRHere.Utils.log('YouRHere.Conference.onRoomFound: Room name matches. Joining room "' + room.roomName + '"');

        /*
        var self = this;
        this.captureUserMedia(function (stream) {
            self.conference.joinRoom({
                roomToken: room.roomToken,
                joinUser: room.broadcaster
            });
        });
*/
    },
    captureUserMedia: function(callback) {
        var video = document.createElement('video');
        video.setAttribute('autoplay', true);
        video.setAttribute('controls', true);

        var participants = document.getElementById("participants");
        participants.insertBefore(video, participants.firstChild);

        console.log('getting user media');

        var self = this;
        getUserMedia({
            video: video,
            onsuccess: function (stream) {
                self.confConfig.attachStream = stream;
                callback && callback(stream);

                video.setAttribute('muted', true);
                self.rotateVideo(video);
            },
            onerror: function () {
                alert('unable to get access to your webcam');
                callback && callback();
            }
        });
    },
    rotateVideo: function(video) {
        video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(0deg)';
        setTimeout(function () {
            video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(360deg)';
        }, 1000);
    },
    initialize: function() {
        YouRHere.Utils.log('YouRHere.Conference.initialize()');
        _.bindAll(this);
        this.confConfig = {
            openSocket: this.openSocket,
            onRemoteStream: this.onRemoteStream,
            onRoomFound: this.onRoomFound
        };
        this.conference = conference(this.confConfig);
        var self = this;
        
        $(document).ready(function() {
            self.captureUserMedia(function (stream) {
                console.log('creating room "' + self.get('roomName') + '"');
                self.conference.createRoom({
                    roomName: (self.get('roomName'))
                });
            });
        });

        return this;
    }
});

YouRHere.User = Backbone.Model.extend({
    urlRoot: "user",
    socket: window.socket,
    defaults: {
        email: "",
        gravatarUrl: ""
    },
    initialize: function () {
        _.bindAll(this, "serverChange", "serverDelete", "modelCleanup");
        this.ioBind("update", this.serverChange, this);
        this.ioBind("delete", this.serverDelete, this);
    },
    serverChange: function (data) {
        YouRHere.Utils.log("User: " + data.id + "(" + data.email + ").serverCreate");
        this.set(data);
    },
    serverDelete: function (data) {
        YouRHere.Utils.log("User: " + this.id + ".serverDelete");
        if (this.collection) {
            YouRHere.Utils.log("removing from User collection");
            this.collection.remove(this);
        } else {
            YouRHere.Utils.log("triggering remove");
            this.trigger("remove", this);
        }
        this.modelCleanup();
    },
    modelCleanup: function () {
        this.ioUnbindAll();
        return this;
    }
});

YouRHere.Users = Backbone.Collection.extend({
    model: YouRHere.User,
    url: "users",
    socket: window.socket,
    initialize: function () {
        _.bindAll(this, "userAdded", "collectionCleanup");
        this.ioBind("create", this.userAdded, this);
    },
    userAdded: function (data) {
        YouRHere.Utils.log("Users: " + data.id + "(" + data.email + ") added");
        if (this.get(data.id)) {
            exists.set(data);
        } else {
            this.add(data);
        }
    },
    collectionCleanup: function (callback) {
        this.ioUnbindAll();
        this.each(function (model) {
            model.modelCleanup();
        });
        return this;
    }
});

YouRHere.Utils =  {
    log: function(msg) {
        if (console && console.log) {
            console.log(msg);
        } else {
            //growl it!
        }
    }
};