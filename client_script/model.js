var YouRHere = YouRHere || {};

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

YouRHere.HeaderInfo = Backbone.Model.extend({
    urlRoot: 'headerinfo',
    socket: window.socket,
    defaults: {
        endDate: new Date(),
        itemCount: -1,
        bugCount: -1,
        userStoryCount: -1
    },
    initialize: function() {
        console.log('headerinfo init!');
        _.bindAll(this);
        this.ioBind('update', this.serverChange, this);
        return this;
    },
    serverChange: function (data) {
        console.log('HeaderInfo serverChange');
        //console.log(data);
        if (data) {
            data.fromServer = true;
            this.set(data);
        }
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