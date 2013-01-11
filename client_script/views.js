var YouRHere = YouRHere || {};

YouRHere.DemoListView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "ul",
    events: {
        "click li": "clickDemoItem"
    },
    initialize: function (itemView, demoItems) {
        console.log("DemoListView.initialize");
        _.bindAll(this, "render", "clickDemoItem", "addDemoItem", "removeDemoItem");
        this.itemView = itemView;
        this.demoItems = demoItems;        
        this.demoItems.bind("reset", this.render); //Called during fetch
        this.render();
    },
    clickDemoItem: function (e) {
        if (e.srcElement.tagName !== "LI") return; //Don't update if they clicked on other child elements
        this.demoItems.each(function (demoItem) {
            if (!demoItem.active && demoItem.id == e.srcElement.id) {
                console.log("DemoListView: Setting DemoItem " + demoItem.id + " to active");
                demoItem.save("active", true); //The item that was clicked (the newly active item)
            } else if ($("#" + demoItem.id).hasClass("highlight")) {
                console.log("DemoListView: Setting DemoItem " + demoItem.id + " to inactive");
                demoItem.save("active", false); //The currently (soon to be previously) active item
            }
        });
    },
    render: function () {
        console.log("DemoListView.render");
        var self = this;
        if (this.demoItems.length > 0) {
            $("#datepicker").val(moment(this.demoItems.first().get("boundaryDate")).format("MM-DD-YYYY")); //Date comes back from server now
        }
        this.demoItems.each(function (demoItem) {
            self.addDemoItem(demoItem);
        });
        return this;
    },
    addDemoItem: function (demoItem) {
        var demoItemView = new this.itemView(demoItem);
        $(this.el).append(demoItemView.el);
    },
    removeDemoItem: function (demoItem) {
        this.$("#" + demoItem.id).remove();
    }
});

//todo: I had problems when trying to extend SortableDemoListView here. Need to come back and try again.
YouRHere.FilterableDemoListView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "div",
    events: {
        "click li.currentItem": "filterCurrentItem",
        "click li.myItems": "filterMyItems",
        "click li.allItems": "filterAllItems"
    },
    initialize: function (itemView, demoItems) {

        console.log("FilterableDemoListView.initialize");

        _.bindAll(this);

        this.itemView = itemView;
        this.demoItems = demoItems;
        this.email = "";

        this.demoItems.bind("reset", this.render, this); //Called during fetch

        return this;
    },
    render: function () {
        console.log("FilterableDemoListView.render");

        //render the filter controls
        //todo: think about making this a separate view
        this.$el.append("<ul class='tabs'><li class='menu first selected currentItem'>Current Item</li><li class='menu last myItems'>My Items</li><li class='menu last allItems'>All Items</li></ul>");

        //render a sub-container for the items
        this.$el.append("<ul class='items'></ul>");

        //make list sortable
        $(".items").sortable({ axis: "y", containment: "parent" }).disableSelection();

        return this;
    },
    renderList: function (filteredItems) {
        console.log("FilterableDemoListView.renderList");

        this.clearDemoItems();

        var self = this;
        filteredItems.each(function (demoItem) {
            self.addDemoItem(demoItem);
        });

        return this;
    },
    clickDemoItem: function (e) {
        if (e.srcElement.tagName !== "LI") return; //Don't update if they clicked on other child elements
        this.demoItems.each(function (demoItem) {
            if (!demoItem.active && demoItem.id == e.srcElement.id) {
                console.log("FilterableDemoListView: Setting DemoItem " + demoItem.id + " to active");
                demoItem.save("active", true); //The item that was clicked (the newly active item)
            } else if ($("#" + demoItem.id).hasClass("highlight")) {
                console.log("FilterableDemoListView: Setting DemoItem " + demoItem.id + " to inactive");
                demoItem.save("active", false); //The currently (soon to be previously) active item
            }
        });
    },
    addDemoItem: function (demoItem) {
        var demoItemView = new this.itemView(demoItem);
        $(".items").append(demoItemView.el);
    },
    removeDemoItem: function (demoItem) {
        this.$("#" + demoItem.id).remove();
    },
    clearDemoItems: function () {
        $(".items").empty();
    },
    filterCurrentItem: function () {
        console.log("FilterableDemoListView.filterCurrentItem");
        this.renderList(this.demoItems.filterByActive(true));
        return this;
    },
    filterMyItems: function () {
        console.log("FilterableDemoListView.filterMyItems - email is " + this.email);
        var filteredList = this.demoItems.filterByEmail(this.email);
        this.renderList(filteredList);
        return this;
    },
    filterAllItems: function () {
        console.log("FilterableDemoListView.filterAllItems");
        this.renderList(this.demoItems);
        return this;
    }
});

YouRHere.SortableDemoListView = YouRHere.DemoListView.extend({
    initialize: function (itemView, demoItems) {
        console.log("SortableDemoListView.initialize");
        this.constructor.__super__.initialize.apply(this, [itemView, demoItems]);
        this.render();
        return this;
    },
    render: function () {
        console.log("SortableDemoListView.render");
        this.constructor.__super__.render.apply(this, []);
        $("#DemoListView").sortable({ axis: "y", containment: "parent" }).disableSelection();
        return this;
    }
});

YouRHere.DemoItemView = Backbone.View.extend({
    tagName: "li",
    initialize: function (demoItem) {
        _.bindAll(this, "activeChanged");
        this.model = demoItem;
        this.model.bind("change:active", this.activeChanged);
        this.render();
        return this;
    },
    render: function () {
        var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<%= item.id %>)</span> <span class='assignedName right'>[<%= item.demonstratorName %>]</span> <br/><span class='itemName'> <%= item.name %> </span>";
        this.$el.html(_.template(demoItemTemplate, { item: this.model.toJSON() }));
        this.$el.attr("id", this.model.id)
            .attr("data-user-login", this.model.demonstrator)
            .addClass(this.model.get("type"))
            .addClass("admin"); //TODO: pass this into the view, somehow
        if (this.model.get("active")) {
            this.$el.attr("id", this.model.id).addClass("highlight");
        }
        return this;
    },
    activeChanged: function () {
        var curActive = this.model.get("active");
        console.log("DemoItemView.ActiveChanged: Refreshing view for DemoItem " + this.model.id + ", active = " + curActive);
        if (curActive) {
            this.$el.addClass("highlight");
        } else {
            this.$el.removeClass("highlight");
        }
    }
});

YouRHere.DetailsDemoItemView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "div",    
    initialize: function (demoItems) {
        console.log("DemoListView.initialize");
        _.bindAll(this, "render");
        this.demoItems = demoItems;
        this.demoItems.bind("reset", this.render); //Called during fetch
        this.demoItems.bind("change", this.render); //Called when active item changes
        this.render();
    },
    render: function () {

        console.log("DetailsDemoItemView.render");

        console.log(this.demoItems);
        console.log(this.demoItems.length);

        //filterByActive is returning something funky for some reason

        var activeItems = this.demoItems.filterByActive(true);
        if (!activeItems || !activeItems.length || activeItems.length === 0) {
            console.log("No active items. Exiting early.");
            return this;
        }
        console.log(activeItems.models);
        var activeItem = activeItems.at(0);

        var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<%= item.id %>)</span> <span class='assignedName right'>[<%= item.demonstratorName %>]</span> <br/><span class='itemName'> <%= item.name %> </span>";
        var currentTemplate = "<h3>Now Showing</h3><div id='current' class='current highlight'>" + demoItemTemplate + "</div";
        this.$el.append(_.template(currentTemplate, { item: activeItem.toJSON() }));

        var descItemplate = "<h4>Description</h4><div id='currentDesc' class='current currentDesc highlight'><div><%= item.description %></div></div>";
        this.$el.append(_.template(currentTemplate, { item: activeItem.toJSON() }));

        return this;
    }
});

YouRHere.EditableDemoItemView = YouRHere.DemoItemView.extend({
    events: {
        "click .noDemo": "setDemonstrable",
        "click .shown": "setDemonstrated"
    },
    initialize: function (demoItem) {
        this.constructor.__super__.initialize.apply(this, [demoItem]);

        _.bindAll(this, "setDemonstrable", "setDemonstrated");
        this.model.bind("change:demonstrable", this.setDemonstrable);
        this.model.bind("change:demonstrated", this.setDemonstrated);

        this.render();
    },
    render: function () {
        this.constructor.__super__.render.apply(this);

        var editableDemoItemTemplate = "<br/> <div class='shown left' data-id='<%= item.id %>'><label for='chkShown<%= item.id %>'>Shown</label><input type='checkbox' class='itemShownCheck' id='chkShown<%= item.id %>' data-id='<%= item.id %>' /></div> <div class='noDemo right' data-id='<%= item.id %>'><label for='chkNodemo<%= item.id %>'>No Demo</label><input type='checkbox' class='itemNoDemoCheck' id='chkNodemo<%= item.id %>' data-id='<%= item.id %>' /></div>";
        this.$el.append(_.template(editableDemoItemTemplate, { item: this.model.toJSON() }));

        return this;
    },
    setDemonstrable: function (e) {
        this.setAttrib(e, "demonstrable", "noDemo", true);
    },
    setDemonstrated: function (e) {
        this.setAttrib(e, "demonstrated", "shown", false);
    },
    setAttrib: function (e, attribName, checkBoxContainerClass, invertedLogic) {
        if (e.srcElement) {
            var checked = e.srcElement.checked;
            if (invertedLogic) checked = !checked;
            console.log("EditableDemoItemView: Set" + attribName + " from client: Saving DemoItem " + this.model.id + ", " + attribName + " = " + checked);
            this.model.save(attribName, checked);
        } else {
            var attribVal = this.model.get(attribName);
            console.log("EditableDemoItemView: Set" + attribName + " from server: Refreshing view for DemoItem " + this.model.id + ", " + attribName + " = " + attribVal);
            if (invertedLogic) attribVal = !attribVal;
            this.$("." + checkBoxContainerClass + " input").prop("checked", attribVal);
        }
    }
});

YouRHere.UserListView = Backbone.View.extend({
    id: "UserListView",
    tagName: "ul",
    initialize: function (users) {
        _.bindAll(this, "render", "addUser", "removeUser", "getEmail");
        this.users = users;
        this.users.bind("add", this.addUser);
        this.users.bind("reset", this.render); //Called during fetch
        this.users.bind("remove", this.removeUser);
        this.getEmail();
        this.render();
    },
    render: function () {
        var self = this;
        this.users.each(function (user) {
            self.addUser(user);
        });
        return this;
    },
    addUser: function (user) {
        console.log("UserListView: Client adding user '" + user.id + "'");
        var userView = new YouRHere.UserView(user);
        $(this.el).append(userView.el);
    },
    removeUser: function (user) {
        console.log("UserListView: Removing user " + user.id);
        this.$("#" + user.id).remove();
    },
    getEmail: function () {
        var view = this;
        $("#login").dialog({
            buttons: [{
                text: "OK",
                click: function () {

                    $(this).dialog("close");

                    var email = $.trim($("#email").val());

                    var user = new YouRHere.User();
                    user.set("email", email);
                    user.save();

                    //send email address out to other views
                    console.log("UserListView: raising 'user:login' event - email is " + email);
                    view.trigger("user:login", email);
                }
            }]
        });
    }
});

YouRHere.UserView = Backbone.View.extend({
    tagName: "li",
    initialize: function (user) {
        this.model = user;
        this.render();
    },
    render: function () {
        var userTemplate = "<li id='<%= item.id %>'><img src='<%= item.gravatarUrl %>' title='<%= item.email %>'/></li>";
        this.$el.html(_.template(userTemplate, { item: this.model.toJSON() }));
        return this;
    }
});