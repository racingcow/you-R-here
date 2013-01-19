var YouRHere = YouRHere || {};

YouRHere.DemoListView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "ul",
    events: {
        "click li": "clickDemoItem"
    },
    initialize: function (itemView, demoItems) {
        YouRHere.Utils.log("DemoListView.initialize");
        _.bindAll(this, "render", "clickDemoItem", "addDemoItem", "removeDemoItem", "moveDemoItem");
        this.itemView = itemView;
        this.demoItems = demoItems;        
        this.demoItems.bind("reset", this.render); //Called during fetch
        this.render();
    },
    clickDemoItem: function (e) {

        var target = e.srcElement;

        if (typeof target === 'undefined') {
            target = e.target;
        }
        if (target) {            
            var elemId = target.id;
            if (target.tagName != "LI") {
                elemId = $(target).closest('li').attr('id');
            };
            YouRHere.Utils.log('using id: ' + elemId);

            this.demoItems.each(function (demoItem) {
                if (!demoItem.active && demoItem.id == elemId) {
                    YouRHere.Utils.log("DemoListView: Setting DemoItem " + demoItem.id + " to active");
                    demoItem.save("active", true); //The item that was clicked (the newly active item)
                } else if ($("#" + demoItem.id).hasClass("highlight")) {
                    YouRHere.Utils.log("DemoListView: Setting DemoItem " + demoItem.id + " to inactive");
                    demoItem.save("active", false); //The currently (soon to be previously) active item
                }
            });
        }
    },
    render: function () {
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
    },
    moveDemoItem: function(data) {
        //YouRHere.Utils.log('moveDemoItem: ' + data);
        if (data === null || typeof data === 'undefined') return;

        this.demoItems.each(function (demoItem) {
            if (demoItem.id == data.id) {
                YouRHere.Utils.log("DemoListView: DemoItem: " + demoItem.id + " setting NextId: " + data.nextId);
                demoItem.save("nextId", data.nextId);
                return;
            }
        });
    }
});

//todo: I had problems when trying to extend SortableDemoListView here. Need to come back and try again.
YouRHere.FilterableDemoListView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "div",
    events: {
        "click li.currentItem": "filterCurrentItem",
        "click li.myItems": "filterMyItems",
        "click li.allItems": "filterAllItems",
        "click li.menu": "clickMenuItem"
    },
    initialize: function (itemView, demoItems) {

        YouRHere.Utils.log("FilterableDemoListView.initialize");

        _.bindAll(this);

        this.itemView = itemView;
        this.demoItems = demoItems;
        this.email = "";

        this.demoItems.bind("reset", this.render, this); //Called during fetch

        return this;
    },
    render: function () {
        YouRHere.Utils.log("FilterableDemoListView.render");

        //render the filter controls
        //todo: think about making this a separate view
        this.$el.append("<ul class='tabs'><li id='currentItem' class='menu first selected currentItem'>Current Item</li><li id='myItems' class='menu last myItems'>My Items</li><li id='allItems' class='menu last allItems'>All Items</li></ul>");

        //render a sub-container for the items
        this.$el.append("<ul class='items'></ul>");

        //make list sortable
        $(".items").sortable({ axis: "y", containment: "parent" }).disableSelection();
        return this;
    },
    renderList: function (filteredItems) {
        YouRHere.Utils.log("FilterableDemoListView.renderList");

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
                //YouRHere.Utils.log("FilterableDemoListView: Setting DemoItem " + demoItem.id + " to active");
                demoItem.save("active", true); //The item that was clicked (the newly active item)
            } else if ($("#" + demoItem.id).hasClass("highlight")) {
                //YouRHere.Utils.log("FilterableDemoListView: Setting DemoItem " + demoItem.id + " to inactive");
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
        //YouRHere.Utils.log("FilterableDemoListView.filterCurrentItem");
        this.renderList(this.demoItems.filterByActive(true));
        this.selectMenuItem('currentItem');
        return this;
    },
    filterMyItems: function () {
        //YouRHere.Utils.log("FilterableDemoListView.filterMyItems - email is " + this.email);
        var filteredList = this.demoItems.filterByEmail(this.email);
        this.renderList(filteredList);
        this.selectMenuItem('myItems');
        return this;
    },
    filterAllItems: function () {
        //YouRHere.Utils.log("FilterableDemoListView.filterAllItems");
        this.renderList(this.demoItems);
        this.selectMenuItem('allItems');
        return this;
    },
    clickMenuItem: function(e) {
        YouRHere.Utils.log(e);
        //Don't update if they clicked on other child elements
        if (!e.srcElement) return;
        if (e.srcElement.tagName !== "LI") return; 
        this.selectMenuItem(e.srcElement.id);
    },
    selectMenuItem: function(elemId) {
        $('li.menu').removeClass('selected');
        $('#' + elemId).addClass('selected');
    }
});

YouRHere.SortableDemoListView = YouRHere.DemoListView.extend({
    initialize: function (itemView, demoItems) {
        //YouRHere.Utils.log("SortableDemoListView.initialize");
        this.constructor.__super__.initialize.apply(this, [itemView, demoItems]);
        this.render();
        this.demoItems.bind("reset", this.afterRender); 
        return this;
    },
    render: function () {
        //YouRHere.Utils.log("SortableDemoListView.render!!");
        this.constructor.__super__.render.apply(this, []);
        var self = this;
        $("#DemoListView").sortable({ 
            axis: "y",
            containment: "parent",
            stop: function(event, ui) {
                YouRHere.Utils.log('sortable:stop');
                self.sortChanged(event, ui);
            },
            update: function(event, ui) {
                //YouRHere.Utils.log('sortable:update');
            },
            change: function(event, ui) {
                YouRHere.Utils.log('sortable:change');
                self.sortChanged(event, ui);
            },
            deactivate: function(event, ui) {
                //YouRHere.Utils.log('sortable:deactivate');
            }
        }).disableSelection();
        return this;
    }, 
    afterRender: function() {
        $('#DemoListView li:first-child').click();
    },
    sortChanged: function(event, ui) {
        YouRHere.Utils.log('sortChanged: ' + data);
        var el = $(ui.item),
            id = el.attr('id');

        var nextEl = el.next('li'),
            nextId = nextEl.attr('id'); 

        if (!nextId) nextId = -2;
        //would like to send a message to everyone that looks something like this
        //id: id of the mover 
        //nextId: id of the the item that follows the mover
        var data = {id: id, nextId: nextId};
        this.moveDemoItem(data);
    }
});

YouRHere.DemoItemView = Backbone.View.extend({
    tagName: "li",
    initialize: function (demoItem) {
        _.bindAll(this, "activeChanged", "itemMoved");
        this.model = demoItem;
        this.model.bind("change:active", this.activeChanged);
        this.model.bind("change:nextId", this.itemMoved);
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
        YouRHere.Utils.log("DemoItemView.ActiveChanged: Refreshing view for DemoItem " + this.model.id + ", active = " + curActive);
        if (curActive) {
            this.$el.addClass("highlight");
        } else {
            this.$el.removeClass("highlight");
        }
    },
    itemMoved: function() {
        var id = this.model.get('id'),
            nextId = this.model.get('nextId')
            moverEl = $('#' + id),
            moverParent = moverEl.parent();
            YouRHere.Utils.log('DemoItemView => id: ' + id + '; nextId: ' + nextId);

        if (nextId < 0) {
            YouRHere.Utils.log('DemoItemView => move to end of the line');
            moverParent.append($(moverEl));
        } else {
            YouRHere.Utils.log('DemoItemView => "normal" move');
            var nextEl = $('#' + nextId);
            nextEl.before(moverEl);
        }
    }
});

YouRHere.DemoItemDetailView = Backbone.View.extend({
    tagName: "li",
    initialize: function (demoItem) {
        _.bindAll(this, "activeChanged", "itemMoved");
        this.model = demoItem;
        this.model.bind("change:active", this.activeChanged);
        this.model.bind("change:nextId", this.itemMoved);
        this.render();
        return this;
    },
    render: function () {

        var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<%= item.id %>)</span> <span class='assignedName right'>[<%= item.demonstratorName %>]</span> <br/><span class='itemName'> <%= item.name %> </span>";
        var currentTemplate = "<h3>Now Showing</h3><div id='current' class='current highlight'>" + demoItemTemplate + "</div";
        this.$el.append(_.template(currentTemplate, { item: this.model.toJSON() }));

        var descItemplate = "<h4>Description</h4><div id='currentDesc' class='current currentDesc highlight'><div><%= item.description %></div></div>";
        this.$el.append(_.template(descItemplate, { item: this.model.toJSON() }));

        return this;
    },
    activeChanged: function () {
        var curActive = this.model.get("active");
        YouRHere.Utils.log("DemoItemDetailView.ActiveChanged: Refreshing view for DemoItem " + this.model.id + ", active = " + curActive);
        if (curActive) {
            this.$el.addClass("highlight");
        } else {
            this.$el.removeClass("highlight");
        }
    },
    itemMoved: function() {
        var id = this.model.get('id'),
            nextId = this.model.get('nextId');
        YouRHere.Utils.log('DemoItemDeailView.itemMoved => id: ' + id + '; nextId: ' + nextId);
    }

});

YouRHere.DetailsDemoItemView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "div",    
    initialize: function (demoItems) {
        YouRHere.Utils.log("DemoListView.initialize");
        _.bindAll(this, "render");
        this.demoItems = demoItems;
        this.demoItems.bind("reset", this.render); //Called during fetch
        this.demoItems.bind("change", this.render); //Called when active item changes
        this.render();
    },
    clearDemoItems: function () {
        $("#DemoListView").empty();
    },
    addDemoItem: function (demoItem) {
        var demoItemView = new YouRHere.DemoItemDetailView(demoItem);
        $("#DemoListView").append(demoItemView.el);
        //remove all the style attributes from TP
        $('[style]').removeAttr('style');
    },
    render: function () {

        YouRHere.Utils.log("DetailsDemoItemView.render");

        var activeItems = this.demoItems.filterByActive(true);        
        
        //renderList
        this.clearDemoItems();
        
        var self = this;
        activeItems.each(function(demoItem) {
            self.addDemoItem(demoItem);
        });        

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
            YouRHere.Utils.log("EditableDemoItemView: Set" + attribName + " from client: Saving DemoItem " + this.model.id + ", " + attribName + " = " + checked);
            this.model.save(attribName, checked);
        } else {
            var attribVal = this.model.get(attribName);
            YouRHere.Utils.log("EditableDemoItemView: Set" + attribName + " from server: Refreshing view for DemoItem " + this.model.id + ", " + attribName + " = " + attribVal);
            if (invertedLogic) attribVal = !attribVal;
            this.$("." + checkBoxContainerClass + " input").prop("checked", attribVal);
        }
    }
});

YouRHere.UserListView = Backbone.View.extend({
    id: "UserListView",
    tagName: "ul",
    initialize: function (users, role) {
        _.bindAll(this, "render", "addUser", "removeUser", "getEmail");
        this.users = users;
        this.users.bind("add", this.addUser);
        this.users.bind("reset", this.render); //Called during fetch
        this.users.bind("remove", this.removeUser);
        this.getEmail(role);
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
        YouRHere.Utils.log("UserListView: Client adding user '" + user.id + "'");
        var userView = new YouRHere.UserView(user);
        $(this.el).append(userView.el);
    },
    removeUser: function (user) {
        YouRHere.Utils.log("UserListView: Removing user " + user.id);
        this.$("#" + user.id).remove();
    },
    getEmail: function (role) {
        var view = this;

        $('#email').keypress(function(e) {
            if (e.keyCode == 13) {
                $('#emailBtn').click();
            }
        });

        $("#login").dialog({
            buttons: [{
                id: "emailBtn",
                text: "OK",
                click: function () {

                    $(this).dialog("close");

                    var email = $.trim($("#email").val());

                    var user = new YouRHere.User();
                    user.set("email", email);
                    user.set('role', role)
                    user.save();

                    //send email address out to other views
                    YouRHere.Utils.log("UserListView: raising 'user:login' event - email is " + email);
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
        var userTemplate = "<li id='<%= item.id %>' class='<%= item.role %>'><img src='<%= item.gravatarUrl %>' title='<%= item.email %> (<%= item.role %>)'/></li>";
        this.$el.html(_.template(userTemplate, { item: this.model.toJSON() }));
        return this;
    }
});
