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
        endDate: '9999-12-31',
        sprintId: '-1',
        sprintName: 'No Sprint Name',
        sprints: []
    },
    initialize: function() {
        _.bindAll(this);
        this.ioBind('update', this.serverUpdate, this);
        this.ioBind('create', this.serverCreate, this);
        this.ioBind('read', this.serverRead, this);
        return this;
    },
    serverCreate: function(iteration){
        this.set(iteration);
        return this;
    },
    serverRead: function(iteration){
        this.set(iteration);
        return this;
    },
    serverUpdate: function(iteration) {
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
        userStoryCount: -1,
        sprintName: 'Not Set'
    },
    initialize: function() {
        _.bindAll(this);
        this.ioBind('update', this.serverChange, this);
        return this;
    },
    serverChange: function (data) {
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
        nextId: -1,                             //The id of the next element that follows in the list. Used to indicate where in the list an item is moving when sort is changed by the organizer 
        swapId: -1
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
        data.fromServer = true;
        this.set(data);
    },
    setActive: function (data) {
        data.fromServer = true;
        this.set(data);
    },
    modelCleanup: function () {
        this.ioUnbindAll();
        return this;
    },
    itemMoved: function(data) {
        data.fromServer = true;
        this.set(data);  
    },
    noDemoChanged: function(data) {
        data.fromServer = true;
        this.set(data);  
    },
    shownChanged: function(data) {
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
        //YouRHere.Utils.log("YouRHere.DemoItems. I have changed.");
    },
    serverReset: function(demoItems) {
        //YouRHere.Utils.log('YouRHere.DemoItems.serverReset: Count = "' + demoItems.length + '"');
        this.reset(demoItems);
    },
    filterByActive: function (active) {
        var filtered = _(this.filter(function (demoItem) { //wrapping with underscore function returns collection            
            return demoItem.get("active").toString() == active.toString();
        }));
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
    swapItem: function(data) {
        if (data.nextId < 0) {
            console.log('short-circuit the swap');            
        console.log(data);
            return this;
        }
        var currItem = this.get(data.id),
            swapId = currItem.get('swapId');

        currItem.set('prevId', data.prevId);
        if (data.nextId == swapId) {
            console.log('"reset" swapId');
            currItem.save('swapId', -99);
        }
        currItem.save('swapId', data.nextId);
        return this;
    },
    moveItem: function(data) {
        if (data.nextId == -99) {
            console.log('short-circuit the move!');
        }
        var currItem = this.get(data.id),
            nextItem = this.get(data.nextId),
            nextId = currItem.get('nextId'),
            currIdx = this.indexOf(currItem),
            nextIdx = this.indexOf(nextItem);

        if (currIdx < nextIdx) nextIdx--;

        this.remove(currItem, {silent: true});
        this.add(currItem, {at: nextIdx});
        if (data.nextId == nextId) {
            console.log('"reset" nextId');
            currItem.save('nextId', -1);
        }

        currItem.save('nextId', data.nextId);
        //nextId = currItem.get('nextId');
        //console.log('currItem.nextId: '  + nextId);

        return this;
    },
    reorderList: function(itemModel) {
        var nextId = itemModel.get('nextId'),
            nextItem = this.get(nextId),
            currIdx = this.indexOf(itemModel),
            nextIdx = this.indexOf(nextItem);

        if (currIdx < nextIdx) nextIdx--;;

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
        this.set(data);
    },
    serverDelete: function (data) {
        if (this.collection) {
            this.collection.remove(this);
        } else {
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