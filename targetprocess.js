var sys = require('util');
var rest = require('restler'); //https://github.com/danwrong/restler 
var moment = require('moment');//http://momentjs.com
var config = require('./targetprocess.config');
var _ = require('underscore');

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
            parser: rest.parsers.json,
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

        //console.log('plain itemsUrl:  \n' + plainItemsUrl);
        //console.log('encoded itemsUrl: \n' + itemsUrl);

        var itemResults;
        rest.get(itemsUrl,  getOptions)
            .on('success', function(data, response) {
                itemResults = data; 

                //console.log('plain taggedItemsUrl: \n' + plainTaggedItemsUrl);
                //console.log('encoded taggedItemsUrl: \n' + taggedItemsUrl);

                //we need the combined results...
                rest.get(taggedItemsUrl, getOptions)
                    .on('success', function(data, response) {
                        for (var i=0,len = data.Items.length; i < len; i++) {
                            itemResults.Items.push(data.Items[i]);
                        }
                        itemResults.Items = _.uniq(itemResults.Items,false, function(item) {
                            return item.Id;
                        });

                    callback(itemResults);

                }).on('fail', function(data, response) {
                    sys.puts('FAIL (get "tagged" items): \n' + data);
                }).on('error', function(err, response) {
                    sys.puts('ERROR (get "tagged" items): ' + err.message);
                    //TODO: figure out to decode the raw buffer, so we can know what happened!
                    if (response) console.log(response.raw);
                }).on('complete', function(result, response) {
                    console.log('COMPLETE  (get "tagged" items): ' + response.statusCode);
                    if (response.statusCode != 200) console.log(result);
                });

        }).on('fail', function(data, response) {
            sys.puts('FAIL (get items): \n' + data);
        }).on('error', function(err, response) {
            sys.puts('ERROR (get items): ' + err.message);
            //TODO: figure out to decode the raw buffer, so we can know what happened!
            if (response) console.log(response.raw);
        }).on('complete', function(result, response) {
            console.log('COMPLETE  (get items): ' + response.statusCode);
            if (response.statusCode != 200) console.log(result);
        });
    },
    getMostRecentIterationBoundary: function (callback, options) {
        console.log('getMostRecentIterationBoundary');
        
        var paramMap = {};
        paramMap['format'] = config.info.format;
        paramMap['include'] = '[EndDate]';
        paramMap['where'] = '(EndDate lte \'' + moment().format('YYYY-MM-DD') + '\')'
                            + ' and (EndDate gte \'' + moment().subtract('weeks', config.info.iterationDurationInWeeks).format('YYYY-MM-DD') + '\')';

        var url = config.info.url + 'Iterations?' + methods.buildRequestParams(paramMap, true),
            plainUrl = config.info.url + 'Iterations?' + methods.buildRequestParams(paramMap, false);

        //console.log('plain URL: \n' + plainUrl);
        //console.log('encoded URL: \n' + url);

        //handle the different events individually... 
        rest.get(url, config.info)
            .on('success', function(data, response) {
                var dates = _.map(data.Items, function (item) {
                    //oh my! - http://weblogs.asp.net/bleroy/archive/2008/01/18/dates-and-json.aspx
                    return new Date(parseInt(/\/Date\((\d+).*/.exec(item.EndDate)[1]));
                });                                
                var boundary = _.max(dates, function (date) { return date.getTime(); });
                var formattedBoundary = moment(boundary).format('MM-DD-YYYY');
                console.log('Boundary Date: ' + formattedBoundary);
                callback(formattedBoundary);
 
        }).on('fail', function(data, response) {
            sys.puts('FAIL: \n' + data);
        }).on('error', function(err, response) {
            sys.puts('ERROR: ' + err.message);
            //TODO: figure out to decode the raw buffer, so we can know what happened!
            if (response) console.log(response.raw);
        }).on('complete', function(result, response) {
            console.log('COMPLETE: ' + response.statusCode);
            if (response.statusCode != 200) console.log(result);
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
