var socket = io.connect(_address + ':' + _port);
var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {
        $('#emailRequired').hide();
        $('#items').hide();

        var users = new YouRHere.Users(),
            userListView = new YouRHere.UserListView(users, 'organizer');
        $('#users').hide().append(userListView.el);
        users.fetch();

        var iteration = new YouRHere.Iteration({init:true}),
            iterationView = new YouRHere.IterationView(iteration);
        iteration.fetch();

        var demoItems = new YouRHere.DemoItems({init:true}),
            demoListView = new YouRHere.DemoListView(YouRHere.EditableDemoItemView, demoItems, {
                sortable: true,
            });

        $('#itemsView').append(demoListView.el);

        var headerInfo = new YouRHere.HeaderInfo(),
            headerInfoView = new YouRHere.HeaderInfoView(headerInfo, demoItems);
        headerInfo.fetch();

        //Capture the email address of the currently logged in user from the users view
        userListView.on('user:login', function (email) {
            demoListView.email = email;
            if (email && email.length > 0) {
                $('#users').show();
                $('#items').show();
                $('.hide-for-login').removeClass('hidden');
                $('#refresh').click();
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