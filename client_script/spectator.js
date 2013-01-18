var socket = io.connect(_address + ":" + _port);
var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {

        var users = new YouRHere.Users();
        var userListView = new YouRHere.UserListView(users,'spectator');
        $("#users").append(userListView.el);
        users.fetch();

        var demoItems = new YouRHere.DemoItems();
        var demoListView = new YouRHere.DetailsDemoItemView(demoItems);
        $("#itemsView").append(demoListView.el);
        demoItems.on("change", function() {
            YouRHere.Utils.log("DemoItems has changed for spectator!");
        });
        YouRHere.Utils.log("DemoItems being fetched for spectator.");
        demoItems.fetch();
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();
});