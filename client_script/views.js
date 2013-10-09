﻿console = console || { log: function() {} };
var YouRHere = YouRHere || {};

YouRHere.IterationView = Backbone.View.extend({
    initialize: function(iteration) {
        
        _.bindAll(this);

        this.iteration = iteration || new YouRHere.Iteration({endDate: new Date()});

        this.setElement($('#datepicker')[0]); //bind to existing element on page instead of rendering new one
        this.$el.datepicker({dateFormat: 'mm-dd-yy'});
        this.$el.on('change', this.clientDateChange);
		this.$el.parent().find('#refresh').on('click', this.clientDateChange);

        //YouRHere.Utils.log('YouRHere.IterationView.initialize(): endDate = "' + this.iteration.get('endDate') + '"');
        this.iteration.bind('change', this.render);
        this.render();
        return this;
    },
    render: function() {
        YouRHere.Utils.log('YouRHere.IterationView.render(): endDate = "' + this.iteration.get('endDate') + '"');
        this.$el.datepicker('setDate', this.iteration.get('endDate'));
        return this;
    },
    clientDateChange: function() {
        YouRHere.Utils.log('YouRHere.IterationView.clientDateChange(): $el endDate = "' + this.$el.val() + '"');
        this.iteration.set('endDate', this.$el.val());
        this.iteration.save();
        return this;
    }
});

YouRHere.HeaderInfoView = Backbone.View.extend({
    initialize: function(data, demoItems) {
        _.bindAll(this);

        this.demoItems = demoItems;          
        this.demoItems.bind('reset', this.refreshDemoItems);

        this.headerInfo = data || new YouRHere.HeaderInfo();
        this.headerInfo.bind('read', this.updateHeaderInfo);
        this.headerInfo.bind('update', this.updateHeaderInfo);
        this.setElement($('#header-info')[0]); //bind to existing element on page instead of rendering new one
        if (this.demoItems) {
            //this.render();            
        }
        return this;
    },
    render: function() {
        var bugCount = this.headerInfo.get('bugCount'), userStoryCount, impedimentCount, endDate, startDate, orgName, dateRange;

        if (bugCount < 0) {
            //console.log('bugCount < 0')
            /* we don't need this extra work now. we just send an update later that hits the "else"
            //oh, ho! get those values the hard way
            var itemTypes = [],
                demoList = this.demoItems;

            this.demoItems.each(function (demoItem) {
                itemTypes.push(demoList.get(demoItem.id).get('type'));
            });

            var itemCount = (itemTypes) ? itemTypes.length : 0,
                bugRegex = new RegExp('Bug', 'i'),
                bugList = _.filter(itemTypes, function(itemType) {
                        return (itemType) && bugRegex.test(itemType); 
                    });

            bugCount = (itemCount < 1) ? 0 : bugList.length;
            userStoryCount = itemCount - bugCount;
            */
        } else {
            this.demoItems.unbind('reset', this.refreshDemoItems);

            //console.log('bugCount >= 0')
            userStoryCount = this.headerInfo.get('userStoryCount');
            impedimentCount = this.headerInfo.get('impedimentCount');
            endDate = this.headerInfo.get('endDate');
            startDate = this.headerInfo.get('startDate');
            orgName = this.headerInfo.get('orgName');
            dateRange = startDate + ' - ' + endDate;
        }

        $('#header-info-iteration-date span').text(dateRange);
        $('#header-info-impediments span').text(impedimentCount);
        $('#header-info-bugs span').text(bugCount);
        $('#header-info-stories span').text(userStoryCount);
        $('.header-info-org span.orgName').text(orgName);
        $('span.dateRange').text(' (' + dateRange + ')');

        return this;
    },
    updateHeaderInfo: function() {
        //console.log('HeaderInfoView.updateHeaderInfo');
        return this.render();
    },
    refreshDemoItems: function() {
        //console.log('HeaderInfoView.refreshDemoItems');
        return this.render();
    }
});

YouRHere.DemoListView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "ul",
	className: 'unstyled',
    events: {
        "click li": "clickDemoItem"
    },
    initialize: function (ItemView, demoItems, options) {
        YouRHere.Utils.log("DemoListView.initialize");
        _.bindAll(this, "render", "clickDemoItem", "addDemoItem", "removeDemoItem", "moveDemoItem", "reload", "itemMoved");
        this.options = options;
        this.ItemView = ItemView;
        this.demoItems = demoItems;        
        this.demoItems.bind("reset", this.render); //Called during fetch
        this.demoItems.bind("change:nextId", this.itemMoved);
        this.render();
        return this;
    },
    reload: function() {
        this.demoItems.fetch();
    },
    render: function () {
        YouRHere.Utils.log("DemoListView.render");
        var self = this;
        /*
        if (this.demoItems.length > 0) {
            var $datepicker = $('#datepicker');
            $datepicker.val(moment(this.demoItems.first().get("boundaryDate")).format("MM-DD-YYYY")) //Date comes back from server now
                    .change(this.reload);
        }
        */
        this.$el.empty();
        this.demoItems.each(function (demoItem) {
            self.addDemoItem(demoItem);
        });
        if (this.options.sortable) {
            $("#DemoListView").sortable({ 
                axis: "y",
                containment: "parent",
                stop: function(event, ui) {
                    YouRHere.Utils.log('sortable:stop');
                    self.sortChanged(event, ui);
                },
                update: function(event, ui) {
                    //YouRHere.Utils.log('sortable:update');
                },  
                change: function(event, ui) {
                    YouRHere.Utils.log('sortable:change');
                    self.sortChanged(event, ui);
                },
                deactivate: function(event, ui) {
                    //YouRHere.Utils.log('sortable:deactivate');
                }
            }).disableSelection();

            $('#DemoListView li:first-child').click();
        }

        return this;
    },
    clickDemoItem: function (e) {
        var target = e.srcElement;

        if (typeof target === 'undefined') {
            target = e.target;
        }
        if (target) {            
            var elemId = target.id;
            if (target.tagName != "LI") {
                elemId = $(target).closest('li').attr('id');
            };
            YouRHere.Utils.log('using id: ' + elemId);

            var oldActiveItem, newActiveItem;

            this.demoItems.each(function (demoItem) {
                if (!demoItem.active && demoItem.id == elemId) {
                    newActiveItem = demoItem;
                } else if ($("#" + demoItem.id).hasClass("highlight")) {
                    oldActiveItem = demoItem;
                }
            });

            if (oldActiveItem) {
                oldActiveItem.save("active", false);
            } 
            if (newActiveItem) {
                newActiveItem.save("active", true);
            }
        }
        return this;
    },
    sortChanged: function(event, ui) {
        //YouRHere.Utils.log('sortChanged: ');
        var el = $(ui.item),
            id = el.attr('id');

        var nextEl = el.next('li'),
            nextId = nextEl.attr('id'); 

        YouRHere.Utils.log('sortChanged ==> nextId: ' + nextId);

        if (!nextId && nextEl.hasClass('ui-sortable-placeholder')) {
            YouRHere.Utils.log('it\'s no bueno if we accidentally select the placeholder LI element!');
            //it's no bueno if we accidentally select the placeholder LI element!
            return this; 
        } 

        if (!nextId) nextId = -2;
        
        //would like to send a message to everyone that looks something like this
        //id: id of the mover 
        //nextId: id of the the item that follows the mover
        var data = {id: id, nextId: nextId};
        return this.moveDemoItem(data);
    },
    addDemoItem: function (demoItem) {
        $(this.el).append(new this.ItemView(demoItem).el);
        return this;
    },
    removeDemoItem: function (demoItem) {
        this.$("#" + demoItem.id).remove();
        return this;
    },
    moveDemoItem: function(data) {
        if (data == null) {
            YouRHere.Utils.log('moveDemoItem ==> exit early');
            return this;
        }
        YouRHere.Utils.log('moveDemoItem ==> id:' + data.id + '; nextId: ' + data.nextId);
        this.demoItems.moveItem(data);
        return this;
    },
    itemSwapped: function (item) {
        console.log('itemSwapped ==> organizer knows!');
        console.log('OH SHIT! The item is being swapped!');
        return this;
    },
    itemMoved: function(item) {
        console.log('itemMoved ==> organizer knows!');
        console.log('OH SHIT! The item is being moved!');
        this.demoItems.reorderList(item);
        return this;
    }

});

//todo: I had problems when trying to extend SortableDemoListView here. Need to come back and try again.
YouRHere.FilterableDemoListView = YouRHere.DemoListView.extend({ //Backbone.View.extend({
    id: "DemoListView",
    tagName: "div",
	className: 'unstyled',
    events: {
        "click li.currentItem": "filterCurrentItem",
        "click li.myItems": "filterMyItems",
        "click li.allItems": "filterAllItems",
        "click li.menu": "clickMenuItem",
        "click li.entity": "clickEntityItem"
    },
    initialize: function(itemView, demoItems, options) {
        _.bindAll(this);
        this.options = options;
        this.isMyItems = false;
        this.ItemView = itemView;
        this.demoItems = demoItems;          
        this.demoItems.bind("add", this.updateView); //Called during fetch   
        this.demoItems.bind("activeChanged", this.activeChanged);
        this.demoItems.bind("reset", this.updateView);
        this.demoItems.bind("change:nextId", this.itemMoved);
        this.render();
        return this;

    },
    render: function () {
        var $tabs = $('.tabs');
        if ($tabs.length === 0) {
            //todo: think about making this a separate view
            this.$el.append("<ul class='tabs inline'><li id='currentItem' class='menu first currentItem'>Current Item</li><li id='allItems' class='menu last allItems'>All Items</li><li id='myItems' class='menu last myItems'>My Items</li></ul>");
            //render a sub-container for the items
            this.$el.append("<ul id='filteredItems' class='items unstyled ui-sortable'></ul>");
        }

        return this;
    },
    itemMoved: function(item) {
        this.demoItems.reorderList(item);
        return this;
    },
    renderList: function (filteredItems) {

        this.clearDemoItems();

        var self = this;
        filteredItems.each(function (demoItem) {
            self.addDemoItem(demoItem);
        });

        var $filteredItems = $('#filteredItems'),
            $sortable = $('#filteredItems:data(sortable)'),
            isSortable = $sortable.length > 0;

        if (isSortable) {
            if (this.isMyItems) $filteredItems.sortable('enable');
            else $filteredItems.sortable('disable');
        }

        if (this.isMyItems && !isSortable) {
            console.log('make it sortable');
            $filteredItems.sortable({ 
                axis: "y",
                containment: "parent",
                stop: function(event, ui) {
                    console.log('FilterableDemoListView sortable:stop');
                    self.sortChanged(event, ui);
                },
                update: function(event, ui) {
                    //YouRHere.Utils.log('sortable:update');
                },  
                change: function(event, ui) {
                    console.log('FilterableDemoListView sortable:change');
                    self.sortChanged(event, ui);
                },
                deactivate: function(event, ui) {
                    //YouRHere.Utils.log('sortable:deactivate');
                }
            }).disableSelection();
        }
        return this;
    },
    sortChanged: function(event, ui) {
        console.log('send a SWAP message so that organizer list can perform "authoritative" move?');
        var el = $(ui.item),
            id = el.attr('id');
        //ugh! need to determine which direction we've moved
        var prevEl = el.prev('li'),
            nextEl = el.next('li'),
            prevId = (prevEl) ? prevEl.attr('id') : -1,
            nextId = (nextEl) ? nextEl.attr('id') : -1; 

        YouRHere.Utils.log('sortChanged ==> prevId: ' + prevId);
        YouRHere.Utils.log('sortChanged ==> nextId: ' + nextId);

        if (prevEl && prevEl.hasClass('ui-sortable-placeholder')) {
            YouRHere.Utils.log('SWAP (prev): it\'s no bueno if we accidentally select the placeholder LI element!');
            //it's no bueno if we accidentally select the placeholder LI element!
            return this; 
        } 

        if (nextEl && nextEl.hasClass('ui-sortable-placeholder')) {
            YouRHere.Utils.log('SWAP (next): it\'s no bueno if we accidentally select the placeholder LI element!');
            //it's no bueno if we accidentally select the placeholder LI element!
            return this; 
        } 
        
        //would like to send a message to everyone that looks something like this
        //knowing both prev and next allows us to orient ourselves correctly within the array
        //id: id of the mover 
        //prevId: id of the element in "front"
        //nextId: id of the the item that follows the mover
        var data = {id: id, prevId: prevId, nextId: nextId};
        return this.swapItem(data);
    },
    swapItem: function(data) {
        return this.demoItems.swapItem(data);
    },
    addDemoItem: function (demoItem) {
        var demoItemView = new this.ItemView(demoItem);
        $(".items").append(demoItemView.el);
    },
    removeDemoItem: function (demoItem) {
        this.$("#" + demoItem.id).remove();
    },
    clearDemoItems: function () {
        $('.items').empty().removeClass('currentItem');
        $('.currentItemDesc').remove();
    },
    updateView: function() {
        //YouRHere.Utils.log("FilterableDemoListView.updateView");
        var $selectMenuItem = $('li.selected'),
            id = $selectMenuItem.attr('id');

        if (id == 'allItems') { this.filterAllItems(); } 
        if (id == 'myItems') { this.filterMyItems(); }
        if (id == 'currentItem') { this.filterCurrentItem(); }
        return this;
    },
    activeChanged: function() {
        var $selectMenuItem = $('li.selected'),
            id = $selectMenuItem.attr('id');

        if (id == 'currentItem') { this.filterCurrentItem(); }
        return this;
    },
    filterCurrentItem: function () {
        //YouRHere.Utils.log('FilterableDemoListView.filterCurrentItem');
        this.isMyItems = false;

        var activeArray = this.demoItems.filterByActive(true);
        this.renderList(activeArray);

        $('.items').addClass('currentItem');
        $('.itemsView').removeClass('itemMaster');
        $('.itemDetail').empty().addClass('hidden');

        this.selectMenuItem('currentItem');

        //TODO: find a better way to get the current item
        var self = this, currentItem;
        activeArray.each(function (demoItem) {
            currentItem = self.demoItems.get(demoItem.id);
        });        

        if (currentItem) {
            /* this is the item description info, but we only want to show when we're the "current item" */
            var descItemplate = '<div class="currentItemDesc"><h4>Description</h4><div id="currentDesc" class="current currentDesc highlight"><%= item.description %></div></div>';
            this.$el.append(_.template(descItemplate, { item: currentItem.toJSON() }));
            $('#currentDesc').find('div').children().attr('style','');
        }
        return this;
    },
    filterMyItems: function () {
        YouRHere.Utils.log("FilterableDemoListView.filterMyItems - email is " + this.email);
        this.isMyItems = true;
        $('.itemsView').addClass('itemMaster');
        $('.itemDetail').empty().addClass('hidden');
        var filteredList = this.demoItems.filterByEmail(this.email);
        this.renderList(filteredList);
        this.selectMenuItem('myItems');
        return this;
    },
    filterAllItems: function () {
        //YouRHere.Utils.log("FilterableDemoListView.filterAllItems");
        this.isMyItems = false;
        $('.itemsView').addClass('itemMaster');
        $('.itemDetail').empty().addClass('hidden');

        this.renderList(this.demoItems);
        this.selectMenuItem('allItems');
        return this;
    },
    clickMenuItem: function(e) {
        //Don't update if they clicked on other child elements
        if (!e.srcElement) return;
        if (e.srcElement.tagName !== "LI") return; 
        this.selectMenuItem(e.srcElement.id);
    },
    selectMenuItem: function(elemId) {
        $('li.menu.selected').removeClass('selected');
        $('#' + elemId).addClass('selected');
    },
    clickEntityItem: function(e) {
        if (!e.currentTarget) return;
        if (e.currentTarget.tagName !== "LI") return;

        var id = e.currentTarget.id;
        $('li.entity.userSelected').removeClass('userSelected');
        $('#' + id).addClass('userSelected');

        var item = this.demoItems.get(id);
        var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><header><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<a href='<%= item.url %>' target='_new'><%= item.id %></a>)</span> <span class='assignedName pull-right'>[<%= item.demonstratorName %>]</span></header> <br/><span class='itemName'> <%= item.name %> </span>";
        var currentTemplate = "<div id='current' class='current highlight'>" + demoItemTemplate + "</div";
        var topHtml = _.template(currentTemplate, { item: item.toJSON() });

        var descItemplate = "<h4>Description</h4><div id='currentDesc' class='current currentDesc highlight'><div><%= item.description %></div></div>";
        var bottomHtml = _.template(descItemplate, { item: item.toJSON() });

        var $detail = $('div.itemDetail'),
            type = item.get('type');

        if ($detail.length == 0) return; 

        $detail.empty()
            .append(topHtml)
            .append(bottomHtml)
            .removeClass()
            .addClass('itemDetail entity ' + type);

        //var top = $('ul.items').position().top;
        //console.log(top);
        //$detail.position().top = top;
    }
});

YouRHere.DemoItemView = Backbone.View.extend({
    tagName: "li",
    initialize: function (demoItem) {
        _.bindAll(this, "activeChanged", "demonstrableChanged", "demonstratedChanged");
        this.model = demoItem;
        this.model.bind("change:active", this.activeChanged);
        this.model.bind("change:demonstrable", this.demonstrableChanged);
        this.model.bind("change:demonstrated", this.demonstratedChanged);
        this.render();
        return this;
    },
    render: function () {
        var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><header><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<a href='<%= item.url %>' target='_new'><%= item.id %></a>)</span> <span class='assignedName pull-right'>[<%= item.demonstratorName %>]</span></header><section><span class='itemName'> <%= item.name %> </span></section>";
        this.$el.html(_.template(demoItemTemplate, { item: this.model.toJSON() }));
        this.$el.attr("id", this.model.id)
            .attr("data-user-login", this.model.demonstrator)
            .addClass(this.model.get('type'))
            .addClass('entity');
        if (this.model.get("active")) {
            this.$el.addClass("highlight");
        }
        if (this.model.get("demonstrated")) {
            this.$el.addClass("demonstrated");
        }
        if (!this.model.get("demonstrable")) {
            this.$el.addClass("notDemonstrable");
        }

        /* this is the item description info, but we only want to show when we're the "current item"        
        var descItemplate = "<h4>Description</h4><div id='currentDesc' class='current currentDesc highlight'><div><%= item.description %></div></div>";
        this.$el.append(_.template(descItemplate, { item: this.model.toJSON() }));
        */
        return this;
    },
    activeChanged: function () {
        var curActive = this.model.get("active");
        YouRHere.Utils.log("DemoItemView.ActiveChanged: Refreshing view for DemoItem " + this.model.id + ", active = " + curActive);
        if (curActive) {
            this.$el.addClass("highlight");
            var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><header><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<a href='<%= item.url %>' target='_new'><%= item.id %></a>)</span> <span class='assignedName pull-right'>[<%= item.demonstratorName %>]</span></header> <br/><span class='itemName'> <%= item.name %> </span>";
            var currentTemplate = "<div id='current' class='current highlight'>" + demoItemTemplate + "</div";
            var topHtml = _.template(currentTemplate, { item: this.model.toJSON() });

            var descItemplate = "<h4>Description</h4><div id='currentDesc' class='current currentDesc highlight'><div><%= item.description %></div></div>";
            var bottomHtml = _.template(descItemplate, { item: this.model.toJSON() });
            
            var $detail = $('div.organizerDetail.itemDetail'),
                type = this.model.get('type');

            if ($detail.length == 0) return; 

            $detail.empty()
                .append(topHtml)
                .append(bottomHtml)
                .removeClass()
                .addClass('organizerDetail itemDetail ' + type);
            
            var top = this.$el.css('position').top;
            $detail.css('position').top = top;

        } else {
            this.$el.removeClass("highlight");
        }
        return this;
    },
    demonstrableChanged: function () {
        var demonstrable = this.model.get("demonstrable");
        YouRHere.Utils.log("DemoItemView.demonstrableChanged: Refreshing view for DemoItem " + this.model.id + ", demonstrable = " + demonstrable);
        if (demonstrable) {
            this.$el.removeClass("notDemonstrable");
        } else {
            this.$el.addClass("notDemonstrable");
        }
        return this;
    },
    demonstratedChanged: function () {
        var demonstrated = this.model.get("demonstrated");
        YouRHere.Utils.log("DemoItemView.demonstratedChanged: Refreshing view for DemoItem " + this.model.id + ", demonstrated = " + demonstrated);
        if (demonstrated) {
            this.$el.addClass("demonstrated");
        } else {
            this.$el.removeClass("demonstrated");
        }
        return this;
    }
});

YouRHere.DemoItemDetailView = Backbone.View.extend({
    tagName: "li",
    initialize: function (demoItem) {
        _.bindAll(this, "activeChanged", "itemMoved");
        this.model = demoItem;
        this.model.bind("change:active", this.activeChanged);
        this.model.bind("change:nextId", this.itemMoved);
        this.render();
        return this;
    },
    render: function () {

        var demoItemTemplate = "<div class='<%= item.type %>-icon'></div><span class='projectName left'>[<%= item.project %>]</span>  <span class='small'>(<a href='<%= item.url %>' target='_new'><%= item.id %></a>)</span> <span class='assignedName right'>[<%= item.demonstratorName %>]</span> <br/><span class='itemName'> <%= item.name %> </span>";
        var currentTemplate = "<h3>Now Showing</h3><div id='current' class='current highlight'>" + demoItemTemplate + "</div";
        this.$el.append(_.template(currentTemplate, { item: this.model.toJSON() }));

        var descItemplate = "<h4>Description</h4><div id='currentDesc' class='current currentDesc highlight'><div><%= item.description %></div></div>";
        this.$el.append(_.template(descItemplate, { item: this.model.toJSON() }));

        return this;
    },
    activeChanged: function () {
        var curActive = this.model.get("active");
        YouRHere.Utils.log("DemoItemDetailView.ActiveChanged: Refreshing view for DemoItem " + this.model.id + ", active = " + curActive);
        if (curActive) {
            this.$el.addClass("highlight");
        } else {
            this.$el.removeClass("highlight");
        }
        return this;
    },
    itemMoved: function() {
        var id = this.model.get('id'),
            nextId = this.model.get('nextId');
        YouRHere.Utils.log('DemoItemDeailView.itemMoved => id: ' + id + '; nextId: ' + nextId);
        return this;
    }

});
YouRHere.DetailsDemoItemView = Backbone.View.extend({
    id: "DemoListView",
    tagName: "ul",
	className: 'unstyled',
    initialize: function (demoItems) {
        YouRHere.Utils.log("DemoListView.initialize");
        _.bindAll(this);
        this.demoItems = demoItems;
        this.demoItems.bind("change", this.render); //Called when active item changes
        this.demoItems.bind("reset", this.render);
        this.render();
    },
    clearDemoItems: function () {
        $("#DemoListView").empty();
        return this;
    },
    addDemoItem: function (demoItem) {
        var demoItemView = new YouRHere.DemoItemDetailView(demoItem);
        $("#DemoListView").append(demoItemView.el);
        //remove all the style attributes from TP
        $('[style]').removeAttr('style');
        return this;
    },
    render: function () {

        YouRHere.Utils.log("DetailsDemoItemView.render");

        var activeItems = this.demoItems.filterByActive(true);        
        
        //renderList
        this.clearDemoItems();
        
        var self = this;
        activeItems.each(function(demoItem) {
            self.addDemoItem(demoItem);
        });        

        return this;
    }
});

YouRHere.EditableDemoItemView = YouRHere.DemoItemView.extend({
    events: {
        "click .noDemo": "setDemonstrable",
        "click .shown": "setDemonstrated"
    },
    initialize: function (demoItem) {
        this.constructor.__super__.initialize.apply(this, [demoItem]);

        _.bindAll(this, "setDemonstrable", "setDemonstrated");
        this.model.bind("change:demonstrable", this.setDemonstrable);
        this.model.bind("change:demonstrated", this.setDemonstrated);

        this.render();
    },
    render: function () {
        this.constructor.__super__.render.apply(this);

        var id = this.model.get('id').toString(),
            demonstrated = this.model.get('demonstrated') ? 'checked' : '',
            notdemonstrable = this.model.get('demonstrable') ? '' : 'checked',
            editableDemoItemTemplate = "<footer><div class='shown left' data-id='<%= item.id %>'><label for='chkShown<%= item.id %>'>Shown</label><input type='checkbox' class='itemShownCheck' <%= demonstrated %> id='chkShown<%= item.id %>' data-id='<%= item.id %>' /></div> <div class='noDemo right' data-id='<%= item.id %>'><label for='chkNodemo<%= item.id %>'>No Demo</label><input type='checkbox' class='itemNoDemoCheck'  <%= notdemonstrable %>  id='chkNodemo<%= item.id %>' data-id='<%= item.id %>' /></div></footer>";

        var tmpl = _.template(editableDemoItemTemplate);
        var tmpl_data = _.extend({ item: this.model.toJSON() }, { demonstrated: demonstrated }, { notdemonstrable: notdemonstrable });

        this.$el.append(tmpl(tmpl_data));

        return this;
    },
    setDemonstrable: function (e) {
        if (e.stopPropagation) { e.stopPropagation(); }
        this.setAttrib(e, "demonstrable", "noDemo", true);
    },
    setDemonstrated: function (e) {
        if (e.stopPropagation) { e.stopPropagation(); }
        this.setAttrib(e, "demonstrated", "shown", false);
    },
    setAttrib: function (e, attribName, checkBoxContainerClass, invertedLogic) {
        if (e.srcElement) {
            var checked = e.srcElement.checked;
            if (invertedLogic) checked = !checked;
            YouRHere.Utils.log("EditableDemoItemView: Set" + attribName + " from client: Saving DemoItem " + this.model.id + ", " + attribName + " = " + checked);
            this.model.save(attribName, checked);
        } else {
            var attribVal = this.model.get(attribName);
            YouRHere.Utils.log("EditableDemoItemView: Set" + attribName + " from server: Refreshing view for DemoItem " + this.model.id + ", " + attribName + " = " + attribVal);
            if (invertedLogic) attribVal = !attribVal;
            this.$("." + checkBoxContainerClass + " input").prop("checked", attribVal);
        }
        return this;
    }
});

YouRHere.UserListView = Backbone.View.extend({
    id: "UserListView",
    tagName: "ul",
	className: 'inline',
    initialize: function (users, role) {
        _.bindAll(this, "render", "addUser", "removeUser", "getEmail");
        this.users = users;
        this.users.bind("add", this.addUser);
        this.users.bind("reset", this.render); //Called during fetch
        this.users.bind("remove", this.removeUser);
        this.getEmail(role);
        this.render();
    },
    render: function () {
        var self = this;
        this.users.each(function (user) {
            self.addUser(user);
        });
        return this;
    },
    addUser: function (user) {
        //YouRHere.Utils.log("UserListView: Client adding user '" + user.id + "'");
        var userView = new YouRHere.UserView(user);
        $(this.el).append(userView.el);
    },
    removeUser: function (user) {
        //YouRHere.Utils.log("UserListView: Removing user " + user.id);
        this.$("#" + user.id).remove();
    },
    getEmail: function (role) {
        var view = this;

        $('#email').keypress(function(e) {
            if (e.keyCode == 13) {
                $('#emailBtn').click();
            }
        });

        var self = this;

        $("#login").dialog({
            title: 'Enter email address',
            resizable: false,
            buttons: [{
                id: "emailBtn",
                text: "OK",
                click: function () {
                    $('#emailMsg').addClass('hidden');

                    var email = $.trim($("#email").val()),
                        isUsed = false;
                    self.users.each(function(u) {
                        if (!isUsed && u.get('email') === email && u.get('role') === role) {
                            isUsed = true;
                        }
                    });

                    if (!isUsed) {
                        var user = new YouRHere.User();
                        user.set("email", email);
                        user.set('role', role);
                        user.save();

                        $(this).dialog("close");
                        //send email address out to other views
                        //YouRHere.Utils.log("UserListView: raising 'user:login' event - email is " + email);
                        view.trigger("user:login", email);
                    } else {
                        $('#emailMsg').removeClass('hidden');
                    }
                }
            }]
        });
    }
});

YouRHere.UserView = Backbone.View.extend({
    tagName: "li",
    initialize: function (user) {
        this.model = user;
        this.render();
    },
    render: function () {
        var userTemplate = "<li id='<%= item.id %>' class='<%= item.role %>'><img src='<%= item.gravatarUrl %>' title='<%= item.email %> (<%= item.role %>)'/></li>";
        this.$el.html(_.template(userTemplate, { item: this.model.toJSON() }));
        return this;
    }
});
