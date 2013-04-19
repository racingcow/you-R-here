var socket = io.connect(_address + ":" + _port);
var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {
        /*
        var users = new YouRHere.Users(),
            userListView = new YouRHere.UserListView(users, 'admin');

        $("#users").append(userListView.el);
        users.fetch();

        var iteration = new YouRHere.Iteration(),
            iterationView = new YouRHere.IterationView(iteration);
        iteration.fetch();

        var demoItems = new YouRHere.DemoItems(),
            demoListView = new YouRHere.DemoListView(YouRHere.EditableDemoItemView, demoItems, { 
                sortable: true,
            });

        $("#itemsView").hide().append(demoListView.el);
        demoItems.fetch();


        //Capture the email address of the currently logged in user from the users view
        userListView.on("user:login", function (email) {
            YouRHere.Utils.log("Router received 'user:login' event - email is " + email);
            demoListView.email = email;
            //always click the first item!
            //$('#DemoListView').first().click();
            $("#itemsView").show();
        });*/

        $("#users").hide();
        $("#itemsView").show();
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();

    //DCM - replaced with iteration view
    //$('#datepicker').datepicker({dateFormat: 'mm-dd-yy'});

});