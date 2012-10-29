var socket = io.connect(_address + ":" + _port);

// on connection to server, ask for username
socket.on("connect", function () {
    var email = null;
    while (email == null) {
        email = prompt("Enter email address:"); //Don't allow null email addys                 
    }
    socket.emit("adduser", email);
});
// update the audit log when appropriate         
socket.on("updateaudit", function (username, data) {
    //$.jGrowl(data, { header: username });         
});
// update users list when needed         
socket.on("updateusers", function (data) {
    var userList = "<% _.each(gravatarUrls, function(gravatarUrl) { %> <li><img src='<%= gravatarUrl %>'/></li> <% }); %>";
    $("#users > ul").html(_.template(userList, { gravatarUrls: data }));
});
socket.on("entitiesretrieved", function (queryResults) {
    var entitiesList = "<% _.each(items, function(item) { %> <li id='<%= item.Id %>' class='<%= item.EntityType.Name %> itemShown<%= item.shown %> itemCanDemo<%= item.canDemo %>'><div class='<%= item.EntityType.Name %>-icon'></div><span class='projectName left'>[<%= item.Project.Name %>]</span> <span class='small'>(<%= item.Id %>)</span> <span class='assignedName right'>[<%= item.Assignments.Items.length > 0 ? item.Assignments.Items[0].GeneralUser.FirstName : 'unassigned' %>]</span> <br/><p class='itemName'> <%= item.Name %> </p><div class='tiny user-no-demo right'></div><div class='tiny user-shown left'></div> </li> <% }); %>";
    var html = _.template(entitiesList, { items: queryResults });
    $("#items > ul").html(html);
    socket.emit("retrieveactiveitem");
});
socket.on("activeitemchanged", function (item) {
    var curr = $('#current');
    if (!item) {
        curr.html('Waiting for organizer to select item...');
        return;
    }
    var itemId = item.Id,
        currDesc = $('#currentDesc');
    $("#items > ul > li.highlight").removeClass("highlight");
    $("#items > ul > li[id='" + itemId + "']").addClass("highlight");
    //var el = document.getElementById(itemId);                 
    //if (el) el.scrollIntoView();

    curr.html($('#' + itemId).html())
        .attr('class', '')
        .addClass('current highlight')
        .addClass(item.EntityType.Name)
        .addClass('itemShown' + item.shown)
        .addClass('itemCanDemo' + item.canDemo);

    currDesc.empty()
        .append((item.Description && item.Description.length > 0) ? item.Description : "No description provided.");
    //remove any inline style applied by TP, et al
    $('#currentDesc > div').children().attr('style', '');
});
socket.on("shownchanged", function (data) {
    var el = $("#items > ul > li[id='" + data.id + "']");
    if (el && data.val === 1) {
        el.addClass('itemShown1')
            .removeClass('highlight');
    } else if (el) el.removeClass('itemShown1');
});
socket.on("nodemochanged", function (data) {
    var el = $("#items > ul > li[id='" + data.id + "']");
    if (el && data.val === 0) {
        el.addClass('itemCanDemo0')
            .removeClass('highlight');
    }
    else if (el) el.removeClass('itemCanDemo0');
});
$(document).ready(function () {
    //request the entities when the page is ready                 
    socket.emit("retrieveentities");
});