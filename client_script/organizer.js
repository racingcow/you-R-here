var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {

        var users = new YouRHere.Users();
        var userListView = new YouRHere.UserListView(users);
        $("#users").append(userListView.el);
        users.fetch();

        var demoItems = new YouRHere.DemoItems();
        var demoListView = new YouRHere.SortableDemoListView(YouRHere.EditableDemoItemView, demoItems);
        $("#itemsView").append(demoListView.el);
        demoItems.fetch();
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();
});