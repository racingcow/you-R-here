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
        .attr('class','')
        .addClass('current highlight')
        .addClass(item.EntityType.Name);

    currDesc.empty()
        .append((item.Description && item.Description.length > 0) ? item.Description : "No description provided.");

    $('#user-shown').addClass('itemShown' + item.shown);
    $('#user-no-demo').addClass('itemCanDemo' + item.canDemo);

    //remove any inline style applied by TP, et al
    $('#currentDesc > div').attr('style', '');
    $('#currentDesc > div').children().attr('style', '');
});
socket.on("shownchanged", function (data) {
    var currEl = $('#current'),
        userShownEl = $('#user-shown');
    if (currEl && data.val === 1) {
        //currEl.addClass('itemShown1');
        userShownEl.addClass('itemShown1');
    } else if (currEl) {
        //currEl.removeClass('itemShown1');
        userShownEl.removeClass('itemShown1');
    } 
});
socket.on("nodemochanged", function (data) {
    var currEl = $('#current'),
        userNoDemoEl = $('#user-no-demo');
    if (currEl && data.val === 0) {
        //currEl.addClass('itemCanDemo0');
        userNoDemoEl.addClass('itemCanDemo0');
    } else if (currEl) {
        //currEl.removeClass('itemCanDemo0');
        userNoDemoEl.removeClass('itemCanDemo0');
    } 
});
$(document).ready(function () {
    //request the active item when ready
    socket.emit("retrieveactiveitem");
});