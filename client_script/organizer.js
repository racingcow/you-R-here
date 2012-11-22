var socket = io.connect(_address + ":" + _port);

var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {
        var demoItems = new YouRHere.DemoItems();
        var demoListView = new YouRHere.DemoListView(YouRHere.EditableDemoItemView, demoItems);
        $("#itemsView").append(demoListView.el);
        demoItems.fetch();
    }
});

YouRHere.DemoListView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "ul",
    events: {
        "click li" : "clickDemoItem"
    },
    initialize: function (itemView, demoItems) {
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
                console.log("Setting DemoItem " + demoItem.id + " to active");
                demoItem.save("active", true); //The item that was clicked (the newly active item)
            } else if ($("#" + demoItem.id).hasClass("highlight")) {
                console.log("Setting DemoItem " + demoItem.id + " to inactive");
                demoItem.save("active", false); //The currently (soon to be previously) active item
            }
        });
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
    }
});

YouRHere.DemoItemView = Backbone.View.extend({
    tagName: "li",        
    initialize: function (demoItem) {
        _.bindAll(this, "activeChanged");
        this.model = demoItem;
        this.model.bind("change:active", this.activeChanged);
        this.render();
    },
    render: function () {
        var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<%= item.id %>)</span> <span class='assignedName right'>[<%= item.demonstratorName %>]</span> <br/><span class='itemName'> <%= item.name %> </span>";
        this.$el.html(_.template(demoItemTemplate, { item: this.model.toJSON() }));
        this.$el.attr("id", this.model.id)
            .attr("data-user-login", this.model.demonstrator)
            .addClass(this.model.get("type"))
            .addClass("admin"); //TODO: pass this into the view, somehow
        return this;
    },
    activeChanged: function () {
        var curActive = this.model.get("active");
        console.log("ActiveChanged: Refreshing view for DemoItem " + this.model.id + ", active = " + curActive);
        if (curActive) {
            this.$el.addClass("highlight");
        } else {
            this.$el.removeClass("highlight");
        }
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
            console.log("set" + attribName + " from client: Saving DemoItem " + this.model.id + ", " + attribName + " = " + checked);
            this.model.save(attribName, checked);
        } else {
            var attribVal = this.model.get(attribName);            
            console.log("set" + attribName + " from server: Refreshing view for DemoItem " + this.model.id + ", " + attribName + " = " + attribVal);
            if (invertedLogic) attribVal = !attribVal;
            this.$("." + checkBoxContainerClass + " input").prop("checked", attribVal);
        }
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();
});