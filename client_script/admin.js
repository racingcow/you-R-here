var socket = io.connect(_address + ":" + _port);
var YouRHere = YouRHere || {};

YouRHere.App = Backbone.Router.extend({
    routes: {
        '': 'index',
        '/': 'index'
    },
    index: function () {
        $("#users").hide();
        $("#itemsView").show();
    }
});

$(document).ready(function () {
    var app = new YouRHere.App();
    Backbone.history.start();
});