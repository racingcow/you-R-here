var sys = require('util');
var moment = require('moment');//http://momentjs.com
var config = require('./targetprocess.config');
var _ = require('underscore');
var $ = require('jquery');

var self = this;
var methods = {    
    globalOptions : {},
    init : function(options) {
        self.globalOptions = options;
        self.globalOptions.format = self.globalOptions.format || 'json';
        self.globalOptions.username = config.info.username;
        self.globalOptions.password = config.info.password;
        self.globalOptions.url = config.info.url;
    },
    itemParamMap: function(date) {
        var map = {};
        map['take'] = '50';
        map['format'] = config.info.format;
        map['include'] = '[Id,Description,Name,EntityType,Tags,Assignments[Id,Role,GeneralUser[FirstName,LastName,Email,Login]],Project[Name]]';
        //the TP API requires "IN" items to be enclosed by single ticks!
        map['where'] =  '(EntityType.Name in (\'UserStory\',\'Bug\'))'
                        + ' and (Iteration.EndDate eq \'' + moment(date).format('YYYY-MM-DD') + '\')' ;
        return map;
    },
    buildRequestParams: function(map, encode) {
        var params = [], value;
        for(var key in map) {
            value = (encode) ? encodeURIComponent(map[key]) : map[key];
            params.push(key + '=' + value);
        }
        return params.join('&');
    },
    getEntitiesForActiveIteration : function(callback, options) {

        console.log('getEntitiesForActiveIteration');

        //todo: extend globalOptions with options to create localOptions variable
        options = options || {};
        var getOptions = {
            username: config.info.username,
            password: config.info.password,
            url: options.url || config.info.url,
            format: options.format || 'json',
            date: options.date || methods.globalOptions.date,
            //parser: rest.parsers.json,
            iterationDurationInWeeks: config.info.iterationDurationInWeeks
        };

        var baseUrl = getOptions.url + 'Assignables?',
            paramMap = methods.itemParamMap(getOptions.date),
            entityStateClause = ' and (EntityState.Name in (\'To Verify\',\'Done\',\'Fixed\',\'Closed\'))';
            encodedEntityStateClause = encodeURIComponent(entityStateClause),
            tagsClause = '  and (Tags contains \'Demo\')';
            encodedTagsClause = encodeURIComponent(tagsClause),
            encodedParams = methods.buildRequestParams(paramMap, true),
            plainParams = methods.buildRequestParams(paramMap, false),
            itemsUrl = baseUrl + encodedParams + encodedEntityStateClause,
            plainItemsUrl = baseUrl + plainParams + entityStateClause,
            taggedItemsUrl = baseUrl + encodedParams +  encodedTagsClause,
            plainTaggedItemsUrl = baseUrl + plainParams +  tagsClause;

        $.when($.ajax(itemsUrl, getOptions), $.ajax(taggedItemsUrl, getOptions))
            .done(function(a1, a2) { //a1 and a2 contain the standard .done() args: data, textStatus, jqXHR
                var itemResults = a1[0],
                    taggedItemResults = a2[0];

                for (var i=0,len = taggedItemResults.Items.length; i < len; i++) {
                    itemResults.Items.push(taggedItemResults.Items[i]);
                }
                itemResults.Items = _.uniq(itemResults.Items, false, function(item) {
                    return item.Id;
                });

                callback(itemResults);
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR);
                //console.log(textStatus);
                //console.log(errorThrown);
            });
    },
    getMostRecentIterationBoundary: function (callback, options) {
        console.log('getMostRecentIterationBoundary');
        
        var paramMap = {};
        paramMap['format'] = config.info.format;
        paramMap['include'] = '[EndDate]';
        paramMap['where'] = '(EndDate lte \'' + moment().format('YYYY-MM-DD') + '\')'
                            + ' and (EndDate gte \'' + moment().subtract('weeks', config.info.iterationDurationInWeeks).format('YYYY-MM-DD') + '\')';

        var baseUrl = config.info.url + 'Iterations?',
            url = baseUrl + methods.buildRequestParams(paramMap, true),
            plainUrl = baseUrl + methods.buildRequestParams(paramMap, false);

          $.ajax(url, config.info)
            .done(function(data, textStatus, jqXHR) {
                var dates = _.map(data.Items, function (item) {
                    //oh my! - http://weblogs.asp.net/bleroy/archive/2008/01/18/dates-and-json.aspx
                    return new Date(parseInt(/\/Date\((\d+).*/.exec(item.EndDate)[1]));
                });                                
                var boundary = _.max(dates, function (date) { return date.getTime(); });
                var formattedBoundary = moment(boundary).format('MM-DD-YYYY');
                console.log('Boundary Date: ' + formattedBoundary);
                callback(formattedBoundary);
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR);
                //console.log(textStatus);
                //console.log(errorThrown);
            });
   }
};
api = function(methodName, callback, options) {
    if (methods[methodName]) {    
        return methods[methodName].apply(this, Array.prototype.splice.call(arguments, 1));
    } else if (typeof methodName === 'object' || !methodName) {
        return methods.init.apply(this, arguments);
    } else {
        throw  new Error('Method ' + method + ' does not exist in tp.api');
    }
}
exports.api = api;
