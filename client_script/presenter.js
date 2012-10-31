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
    var entitiesList = "<% _.each(items, function(item) { %> <li id='<%= item.Id %>' class='<%= item.EntityType.Name %> itemShown<%= item.shown %> itemCanDemo<%= item.canDemo %>'><div class='<%= item.EntityType.Name %>-icon'></div><span class='projectName left'>[<%= item.Project.Name %>]</span> <span class='small'>(<%= item.Id %>)</span> <span class='assignedName right'>[<%= item.Assignments.Items.length > 0 ? item.Assignments.Items[0].GeneralUser.FirstName : 'unassigned' %>]</span> <br/><p class='itemName'> <%= item.Name %> </p><div class='tiny user-shown left itemShown<%= item.shown %>'>shown</div> <div class='tiny user-no-demo left itemCanDemo<%= item.canDemo %>'>no demo</div></li> <% }); %>";
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
        currDesc = $('#currentDesc'),
        itemTempl = "<div class='<%= item.EntityType.Name %>-icon'></div><span class='projectName left'>[<%= item.Project.Name %>]</span> <span class='small'>(<%= item.Id %>)</span> <span class='assignedName right'>[<%= item.Assignments.Items.length > 0 ? item.Assignments.Items[0].GeneralUser.FirstName : 'unassigned' %>]</span> <br/><p class='itemName'> <%= item.Name %> </p><div id='user-shown' class='tiny user-shown left'>shown</div> <div id='user-no-demo' class='tiny user-no-demo left'>no demo</div>";

    var html = _.template(itemTempl, { item: item });
    curr.html(html)
        .addClass(item.EntityType.Name);
        //.addClass('itemShown' + item.shown)
        //.addClass('itemCanDemo' + item.canDemo);

    currDesc.empty()
        .append((item.Description && item.Description.length > 0) ? item.Description : "No description provided.");

    $('#user-shown').addClass('itemShown' + item.shown);
    $('#user-no-demo').addClass('itemCanDemo' + item.canDemo);

    //remove any inline style applied by TP, et al
    $('#currentDesc > div').children().attr('style', '');
    var el = $("#items > ul > li[id='" + item.Id + "']");
    $('#items > ul > li').removeClass('highlight');
    el.addClass('highlight');
});
socket.on("shownchanged", function (data) {
    var el = $("#items > ul > li[id='" + data.id + "']");
    if (el && data.val === 1) {
        el.addClass('itemShown1');
    } else if (el) el.removeClass('itemShown1');

    var userShownEl = $('#user-shown'),
        elChild = el.children('.user-shown');
    if (userShownEl && data.val === 1) {
        userShownEl.addClass('itemShown1');
        elChild.addClass('itemShown1');
    } else if (userShownEl) {
        userShownEl.removeClass('itemShown1');
        elChild.removeClass('itemShown1');
    } 

});
socket.on("nodemochanged", function (data) {
    var el = $("#items > ul > li[id='" + data.id + "']");
    if (el && data.val === 0) {
        el.addClass('itemCanDemo0');
    } else if (el) el.removeClass('itemCanDemo0');

    var userNoDemoEl = $('#user-no-demo'),
        elChild = el.children('div.user-no-demo');
    if (userNoDemoEl && data.val === 0) {
        userNoDemoEl.addClass('itemCanDemo0');
        elChild.addClass('itemCanDemo0');
    } else if (userNoDemoEl) {
        userNoDemoEl.removeClass('itemCanDemo0');
        elChild.removeClass('itemCanDemo0');
    } 

});
$(document).ready(function () {
    //$('#tabs').tabs();
    //request the entities when the page is ready
    socket.emit("retrieveentities");
    $('li.menu').on("click", menuClicked);

    function menuClicked() {
        $('li.menu').removeClass('selected');
        $(this).addClass('selected');
        $('.ctTab').removeClass('hide');
        if ($(this).hasClass('myItems')) {
            $('#currentTab').addClass('hide');
            //TODO: filter the user list...
            //possibly based upon the logged in user's email address?
        } else {
            $('#itemsTab').addClass('hide');
        }
    }
});