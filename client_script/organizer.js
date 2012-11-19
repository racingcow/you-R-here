var socket = io.connect(_address + ":" + _port);

var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {
        var demoItems = new YouRHere.DemoItems();
        var demoListView = new YouRHere.DemoListView(demoItems);
        $("#itemsView").append(demoListView.el);
        demoItems.fetch();
    }
});

YouRHere.DemoListView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "ul",
    initialize: function (demoItems) {
        _.bindAll(this, "render", "addDemoItem", "removeDemoItem");
        this.demoItems = demoItems;        
        this.demoItems.bind("reset", this.render); //Called during fetch
        this.render();
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
        var demoItemView = new YouRHere.DemoItemView(demoItem);
        $(this.el).append(demoItemView.el);
    },
    removeDemoItem: function (demoItem) {
        this.$("#" + demoItem.id).remove();
    }
});

YouRHere.DemoItemView = Backbone.View.extend({
    tagName: "li",    
    events: {
        "click": "setActive",
        "click .demonstrable": "setDemonstrable",
        "click .demonstrated": "setDemonstrated"
    },
    initialize: function (demoItem) {
        _.bindAll(this, "setActive", "activeChanged", "setDemonstrable", "setDemonstrated");
        this.model = demoItem;
        this.model.bind("change:active", this.activeChanged);
        this.render();
    },
    render: function () {
        var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<%= item.id %>)</span> <span class='assignedName right'>[<%= item.demonstratorName %>]</span> <br/><span class='itemName'> <%= item.name %> </span><br/> <div class='shown left' data-id='<%= item.id %>'><label for='chkShown<%= item.id %>'>Shown</label><input type='checkbox' class='itemShownCheck' id='chkShown<%= item.id %>' data-id='<%= item.id %>' /></div> <div class='noDemo right' data-id='<%= item.id %>'><label for='chkNodemo<%= item.id %>'>No Demo</label><input type='checkbox' class='itemNoDemoCheck' id='chkNodemo<%= item.id %>' data-id='<%= item.id %>' /></div>";
        this.$el.html(_.template(demoItemTemplate, { item: this.model.toJSON() }));
        this.$el.attr("id", this.model.id)
            .attr("data-user-login", this.model.demonstrator)
            .addClass(this.model.get("type"))
            .addClass("admin"); //TODO: pass this into the view, somehow
        return this;
    },
    setActive: function () {
        
        var curActive = this.model.get("active");
        this.model.save({ active: !curActive },
            {
                success: function () { console.log("success"); },
                error: function () { console.log("error"); },
            });
    },
    activeChanged: function () {
        var curActive = this.model.get("active");
        if (curActive) {
            this.$el.addClass("highlight");
        } else {
            this.$el.removeClass("highlight");
        }
    },
    setDemonstrable: function () {
        //TODO
    },
    setDemonstrated: function () {
        //TODO
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();
});