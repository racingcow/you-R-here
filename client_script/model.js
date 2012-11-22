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
        console.log("DemoItem" + data.id + ".serverChange");
        data.fromServer = true;
        this.set(data);
    },
    setActive: function (data) {
        console.log("DemoItem" + data.id + ".setActive");
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
    collectionCleanup: function (callback) {
        this.ioUnbindAll();
        this.each(function (model) {
            model.modelCleanup();
        });
        return this;
    }
});