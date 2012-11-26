var YouRHere = YouRHere || {};

YouRHere.DemoItemTypes = {
    Undefined: "Undefined",
    UserStory: "UserStory",
    Bug: "Bug"
};

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
        active: false                           //True if the demo item is the one currently being demonstrated; false otherwise
    },
    initialize: function () {
        _.bindAll(this, "serverChange", "setActive", "modelCleanup");
        this.ioBind("update", this.serverChange, this);
        this.ioBind("activeChanged", this.setActive, this);
    },
    serverChange: function (data) {
        console.log("DemoItem: " + data.id + ".serverChange");
        data.fromServer = true;
        this.set(data);
    },
    setActive: function (data) {
        console.log("DemoItem: " + data.id + ".setActive");
        data.fromServer = true;
        this.set(data);
    },
    modelCleanup: function () {
        this.ioUnbindAll();
        return this;
    }
});

YouRHere.DemoItems = Backbone.Collection.extend({
    model: YouRHere.DemoItem,
    url: "demoitems",
    socket: window.socket,
    initialize: function () {
        _.bindAll(this, "collectionCleanup");
    },
    filterByActive: function (active) {
        return _(this.filter(function (demoItem) { //wrapping with underscore function returns collection
            debugger;
            return demoItem.get("active") == active;
        }));
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
        console.log("User: " + data.id + "(" + data.email + ").serverCreate");
        this.set(data);
    },
    serverDelete: function (data) {
        console.log("User: " + this.id + ".serverDelete");
        if (this.collection) {
            console.log("removing from collection");
            this.collection.remove(this);
        } else {
            console.log("triggering remove");
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
        console.log("Users: " + data.id + "(" + data.email + ") added");
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