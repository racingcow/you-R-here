var sys = require('util');
var moment = require('moment');//http://momentjs.com
var config = require('./targetprocess.config');
var _ = require('underscore');
var rest = require('restler'); //https://github.com/danwrong/restler 
//var $ = require('jquery');

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

                    callback(methods.tpToModelSchema(itemResults, getOptions.date));

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

/*
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
*/
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

/*
          $.ajax(url, config.info)
            .done(function(data, textStatus, jqXHR) {
                var dates = _.map(data.Items, function (item) {
                    //oh my! - http://weblogs.asp.net/bleroy/archive/2008/01/18/dates-and-json.aspx
                    return new Date(parseInt(/\/Date\((\d+).* /.exec(item.EndDate)[1]));
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
*/
    },
    tpToModelSchema: function (data, endDate) {

        //TODO: Replace this transformation method with another object/middleware               
        //Transform to standard model schema
        var item, isDemonstrable,descHasH1, title, 
            desc, descAfterCapture, descAfterH1Replace, assignedDevelopers, assignedUser,
            entities = [],
            notDemonstrableRegex = new RegExp('not demonstrable', 'i'),
            developerRegex = new RegExp('developer', 'i'),
            h1CaptureDescRegex = new RegExp('<[h|H]1>((.)*)</[h|H]1>'),
            h1ReplaceRegex = new RegExp('(<h1>|<H1>|</h1>|</H1>)'),
            imageLinkRegex =  new RegExp('="(~)?/images', 'gi'); 

        for (var i = 0, len = data.Items.length; i < len; i++) {
            item = data.Items[i];
            isDemonstrable = notDemonstrableRegex.test(item.Tags) ? false : true;
            descHasH1 = h1ReplaceRegex.test(item.Description);
            descAfterCapture = (descHasH1) ? h1CaptureDescRegex.exec(item.Description) : '';
            title = (descHasH1) ? descAfterCapture[0].replace(h1ReplaceRegex, '') : item.Name;
            descAfterH1Replace = (descHasH1) ? item.Description.replace(h1CaptureDescRegex,'').replace(h1ReplaceRegex, '') : item.Description;
            desc = (descAfterH1Replace && descAfterH1Replace.length > 0) ? descAfterH1Replace : item.Name;

            assignedDevelopers = _.filter(data.Items[i].Assignments.Items, function (item) {
                return developerRegex.test(item.Role.Name);
            });             
            assignedUser = assignedDevelopers.length > 0 ? assignedDevelopers[0].GeneralUser : {FirstName: "not", LastName: "assigned", Email: ""};

            entities.push({
                id: item.Id,
                name: title, //item.Name,
                description: (desc) ? desc.replace(imageLinkRegex, '="' + config.info.baseImageUrl + '/images') : '', //item.Description,
                project: item.Project.Name,
                type: item.EntityType.Name,
                demonstratorName: assignedUser.FirstName + " " + assignedUser.LastName,
                demonstratorEmail: assignedUser.Email,
                demonstrable: isDemonstrable,
                demonstrated: false,
                boundaryDate: endDate,
                active: false,
                nextId: -1
            });
        }

        return entities.sort(function (a, b) { 
            //we want User Story to be before Bug
            var typeSort = b.type.localeCompare(a.type); 
            if (typeSort != 0) return typeSort;
            
            var projectSort = a.project.localeCompare(b.project);
            if (projectSort != 0) return projectSort;

            return a.demonstratorName.localeCompare(b.demonstratorName);
        });
    }


};
api = function(methodName, callback, options) {
    if (methods[methodName]) {    
        return methods[methodName].apply(this, Array.prototype.splice.call(arguments, 1));
    } else if (typeof methodName === 'object' || !methodName) {
        return methods.init.apply(this, arguments);
    } else {
        throw  new Error('Method ' + method + ' does not exist in targetprocess.api');
    }
}
exports.plugin = {
    api: api,
    config: config
};