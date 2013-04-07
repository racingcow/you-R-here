var socket = io.connect(_address + ":" + _port);
var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {


        var users = new YouRHere.Users();
        var userListView = new YouRHere.UserListView(users, 'spectator');
        $("#users").append(userListView.el);
        users.fetch();

        var demoItems = new YouRHere.DemoItems();
        var demoListView = new YouRHere.FilterableDemoListView(YouRHere.DemoItemView, demoItems);
        $("#itemsView").hide().append(demoListView.el);
        demoItems.fetch();

        //Capture the email address of the currently logged in user from the users view
        userListView.on("user:login", function (email) {
            YouRHere.Utils.log("Router received 'user:login' event - email is " + email);
            demoListView.email = email;
            //select one of the menu items... "myItems" seems good
            //YouRHere.Utils.log('click myItems');
            $('li.myItems').hide();
            $('li.currentItem').click();
            $("#itemsView").show();
        });    
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();
});