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
            userListView = new YouRHere.UserListView(users, 'spectator');
        
        $('#users').append(userListView.el);
        users.fetch();

        var demoItems = new YouRHere.DemoItems(),
            demoListView = new YouRHere.FilterableDemoListView(YouRHere.DemoItemView, demoItems);
        $('#itemsView').hide().append(demoListView.el);
        demoItems.fetch();


        var headerInfo = new YouRHere.HeaderInfo(),
            headerInfoView = new YouRHere.HeaderInfoView(headerInfo, demoItems);

        //Capture the email address of the currently logged in user from the users view
        userListView.on('user:login', function (email) {
            YouRHere.Utils.log('Router received "user:login" event - email is ' + email);
            demoListView.email = email;
            if (email && email.length > 0) {
                headerInfo.fetch();
                $('li.myItems').hide();
                $('li.currentItem').click();
                $('#itemsView').show();
                $('.hide-for-login').removeClass('hidden');
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