var socket = io.connect(_address + ":" + _port);

// on connection to server, ask for username
socket.on("connect", function () {
    var email = null;
    while (email == null) {
        email = prompt("Enter email address:"); //Don't allow null email addys
    }
    socket.emit("adduser", email);
    $("#datepicker").datepicker({ defaultDate: -1 }).on("change", dateChanged);    
});
// update the audit log when appropriate
socket.on("updateaudit", function (username, data) {
    $.jGrowl(data, { header: username });
});

// update users list when needed         
socket.on("updateusers", function (data) {
    var userList = "<% _.each(gravatarUrls, function(gravatarUrl) { %> <li><img src='<%= gravatarUrl %>'/></li> <% }); %>";
    $("#users > ul").html(_.template(userList, { gravatarUrls: data }));
});
socket.on("entitiesretrieved", function (queryResults) {
    var entitiesList = "<% _.each(items, function(item) { %> <li id='<%= item.Id %>' class='<%= item.EntityType.Name %> admin'><div class='<%= item.EntityType.Name %>-icon'></div><span class='projectName left'>[<%= item.Project.Name %>]</span>  <span class='small'>(<%= item.Id %>)</span> <span class='assignedName right'>[<%= item.Assignments.Items.length > 0 ? item.Assignments.Items[0].GeneralUser.FirstName : 'unassigned' %>]</span> <br/><span class='itemName'> <%= item.Name %> </span><br/> <div class='shown left' data-id='<%= item.Id %>'><label for='chkShown<%= item.Id %>'>Shown</label><input type='checkbox' class='itemShownCheck' id='chkShown<%= item.Id %>' data-id='<%= item.Id %>' /></div> <div class='noDemo right' data-id='<%= item.Id %>'><label for='chkNodemo<%= item.Id %>'>No Demo</label><input type='checkbox' class='itemNoDemoCheck' id='chkNodemo<%= item.Id %>' data-id='<%= item.Id %>' /></div> </li> <% }); %>";
    var html = _.template(entitiesList, { items: queryResults });
    $("#items > ul").html(html);
    $("#items > ul > li").on("click", itemClicked);
    $(".itemShownCheck").on("click", shownClicked);
    $(".itemNoDemoCheck").on("click", noDemoClicked);
    $("#items > ul").sortable({
        axis: "y",
        containment: "parent"
    }).disableSelection();
    //TODO: make the divs clickable... much better, bigger target than the checkboxes                 
    //$("div.shown").on("click", divShownClicked);                 
    //$("div.nodemo").on("click", divNoDemoClicked);          
});
socket.on("activeitemchanged", function (item) {
    if (!item) return;

    var itemId = item.Id;
    $("#items > ul > li.highlight").removeClass("highlight");
    $("#items > ul > li[id='" + itemId + "']").addClass("highlight");
});

// page load         
//$(document).ready(function () {
//$("#datepicker").datepicker({ defaultDate: -1 }).on("change", dateChanged);
//socket.emit("datechanged", $("#datepicker").val());
//});

//highlight the currently selected item when clicked         
function itemClicked(e) {
    socket.emit("changeactiveitem", this.id, this.innerHTML);
}
function dateChanged(e) {
    socket.emit("datechanged", $(this).val());
}
function shownClicked(e) {
    var data = { id: $(this).attr('data-id'), val: $(this).attr('checked') ? 1 : 0 };
    e.stopPropagation();
    //we'll need something different in IE...
    //window.event.cancelBubble = true;
    //console.log('shownClicked: ' + data.id + '; ' + data.val);                 
    socket.emit("changeshown", data);
}
function noDemoClicked(e) {
    var data = { id: $(this).attr('data-id'), val: $(this).attr('checked') ? 0 : 1 };
    e.stopPropagation();
    //we'll need something different in IE...
    //window.event.cancelBubble = true;
    //console.log('noDemoClicked: ' + data.id + '; ' + data.val);                 
    socket.emit("changenodemo", data);
}
function divShownClicked(e) {
    //console.log('divShownClicked');                 
    var id = $(this).attr('data-id'),
        el = $('#chkShown' + id),
        chk = el.attr('checked') ? 1 : 0;
    if (chk === 1) {
        //console.log('divShownClicked: remove' );                         
        el.removeAttr('checked');
    } else {
        //console.log('divShownClicked set');                         
        el.attr('checked');
    }

    //var data = { id: $(this).attr('data-id'), val: $(this).attr('checked') ? 1 : 0 };                 
    //console.log('shownClicked: ' + data.id + '; ' + data.val);                 
    //socket.emit("changeshown", data);         
}
function divNoDemoClicked(e) { }