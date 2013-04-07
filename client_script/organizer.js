var socket = io.connect(_address + ":" + _port);
var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {

        var users = new YouRHere.Users(),
            userListView = new YouRHere.UserListView(users, 'organizer');
        $("#users").append(userListView.el);
        users.fetch();

        var iteration = new YouRHere.Iteration(),
            iterationView = new YouRHere.IterationView(iteration);
        iteration.fetch();

        var demoItems = new YouRHere.DemoItems(),
            demoListView = new YouRHere.DemoListView(YouRHere.EditableDemoItemView, demoItems, { 
                sortable: true,
            });
        $("#itemsView").append(demoListView.el);
        demoItems.fetch();
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();

    //DCM - replaced with iteration view
    //$('#datepicker').datepicker({dateFormat: 'mm-dd-yy'});

});