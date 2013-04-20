var socket = io.connect(_address + ":" + _port);
var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {
        $('#emailRequired').hide();

        var users = new YouRHere.Users(),
            userListView = new YouRHere.UserListView(users, 'presenter');
        
        $('#users').hide().append(userListView.el);
        users.fetch();

        var demoItems = new YouRHere.DemoItems(),
            demoListView = new YouRHere.FilterableDemoListView(YouRHere.DemoItemView, demoItems);
        $('#itemsView').hide().append(demoListView.el);
        demoItems.fetch();

        //Capture the email address of the currently logged in user from the users view
        userListView.on('user:login', function (email) {
            YouRHere.Utils.log("Router received 'user:login' event - email is " + email);
            demoListView.email = email;
            if (email && email.length > 0) {
                $('li.allItems').click();
                $('#users').show();
                $('#itemsView').show();
            } else {
                $('#emailRequired').removeClass('hidden').show();
            }
        });
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();
});