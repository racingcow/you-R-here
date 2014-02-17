var https = require('https');
var async = require('async');
var sys = require('util');
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


        var itemResults;
        rest.get(itemsUrl,  getOptions)
            .once('success', function(data, response) {
                itemResults = data; 

                //console.log('plain taggedItemsUrl: \n' + plainTaggedItemsUrl);
                //console.log('encoded taggedItemsUrl: \n' + taggedItemsUrl);

                //we need the combined results...
                rest.get(taggedItemsUrl, getOptions)
                    .once('success', function(data, response) {
                        for (var i=0,len = data.Items.length; i < len; i++) {
                            itemResults.Items.push(data.Items[i]);
                        }
                        itemResults.Items = _.uniq(itemResults.Items,false, function(item) {
                            return item.Id;
                        });

                    //callback(methods.tpToModelSchema(itemResults, getOptions.date));
//-------------


       var baseImpedimentsUrl = getOptions.url + 'Impediments?format=json&take=250&'; 
       var includeParam = 'include=' + encodeURIComponent('[Id,Description,Name,EntityType[Name],Tags,Project[Name],Assignable[Id,Description,Name,EntityType], Responsible[Id,Kind,FirstName,LastName,Email,Login]]');
       var whereParam = 'where=' + encodeURIComponent('EntityState.Name eq \'Open\'');
       var params = [];
       params.push(includeParam);
       params.push(whereParam);
       baseImpedimentsUrl += params.join('&');
        rest.get(baseImpedimentsUrl, getOptions)
            .once('success', function(data, response) {
             
            var impediments = methods.impedimentsToModelSchema(data, getOptions.date);
            var entities = methods.tpToModelSchema(itemResults, getOptions.date);
            var list = _.union(entities, impediments);
            console.log('impediments: ' + impediments.length);
            console.log('entities: ' + entities.length);
            console.log('AFTER splice: ' + list.length);
            callback(list);

        }).once('fail', function(data, response) {
            sys.puts('FAIL (get "Impediments" items): \n' + data);
        }).once('error', function(err, response) {
            sys.puts('ERROR (get "Impediments" items): ' + err.message);
            //TODO: figure out to decode the raw buffer, so we can know what happened!
            if (response) console.log(response.raw);
        }).once('complete', function(result, response) {
            if (response) {
                console.log('COMPLETE  (get "Impediments" items): ' + response.statusCode);
                if (response.statusCode != 200) console.log(result);
            } else sys.puts('no response');
         }); 

//-----------------



                }).once('fail', function(data, response) {
                    sys.puts('FAIL (get "tagged" items): \n' + data);
                }).once('error', function(err, response) {
                    sys.puts('ERROR (get "tagged" items): ' + err.message);
                    //TODO: figure out to decode the raw buffer, so we can know what happened!
                    if (response) console.log(response.raw);
                }).once('complete', function(result, response) {
                    if (response) {
                        console.log('COMPLETE  (get "tagged" items): ' + response.statusCode);
                        if (response.statusCode != 200) console.log(result);
                    } else sys.puts('no response');
                 }); 
        }).once('fail', function(data, response) {
            sys.puts('FAIL (get items): \n' + data);
        }).once('error', function(err, response) {
            sys.puts('ERROR (get items): ' + err.message);
            //TODO: figure out to decode the raw buffer, so we can know what happened!
            if (response) console.log(response.raw);
        }).once('complete', function(result, response) {
            if (response) {
                console.log('COMPLETE  (get items): ' + response.statusCode);
                if (response.statusCode != 200) console.log(result);
            } else sys.puts('no response');
        });

/*        var baseImpedimentsUrl = getOptions.url + 'Impediments?format=json&take=250&where=EntityState.Name%20eq%20\'Open\''; 

        rest.get(baseImpedimentsUrl, getOptions)
            .once('success', function(data, response) {
                
                console.log('Impediments: ' + data.Items.length);


                //for (var i=0,len = data.Items.length; i < len; i++) {
                 //   itemResults.Items.push(data.Items[i]);
                //}
                //itemResults.Items = _.uniq(itemResults.Items,false, function(item) {
                 //   return item.Id;
                //});

            //callback(methods.tpToModelSchema(itemResults, getOptions.date));

        }).once('fail', function(data, response) {
            sys.puts('FAIL (get "Impediments" items): \n' + data);
        }).once('error', function(err, response) {
            sys.puts('ERROR (get "Impediments" items): ' + err.message);
            //TODO: figure out to decode the raw buffer, so we can know what happened!
            if (response) console.log(response.raw);
        }).once('complete', function(result, response) {
            console.log('COMPLETE  (get "Impediments" items): ' + response.statusCode);
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
        paramMap['take'] = 250;
//        paramMap['include'] = '[EndDate]';
 //       paramMap['where'] = '(EndDate lte \'' + moment().format('YYYY-MM-DD') + '\')'
 //                           + ' and (EndDate gte \'' + moment().subtract('weeks', config.info.iterationDurationInWeeks).format('YYYY-MM-DD') + '\')';

        paramMap['where'] = 'IsCurrent eq "True"';

//        var baseUrl = config.info.url + 'Iterations?',
 //           url = baseUrl + methods.buildRequestParams(paramMap, true),
  //          plainUrl = baseUrl + methods.buildRequestParams(paramMap, false);

        var path = '/api/v1/Iterations?',
            options= {
                host: config.info.hostUrl,
                path: path + methods.buildRequestParams(paramMap, true),
                auth: config.info.username + ':' + config.info.password
            };

            console.log(options);
        var req = https.request(options,function(res) {
            var chunks = [];

            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                if (res.statusCode != '200') {
                    console.log(chunk);
                    callback(null, {date: new Date(), data: null});
                    return;
                }
                chunks.push(chunk);
            })
            .on('end', function(){
                var sprintId = '-1',
                    sprintName = 'Not set!',
                    date = new Date(),
                    data = JSON.parse(chunks.join('')),
                    sprints = [],
                    len = data.Items 
                        ? data.Items.length 
                        : 0,
                    idx = len > 1 
                        ? len - 1 
                        : 0;

                console.log(data.Items);
                if (len > 0) {
                    sprintId = data.Items[idx].Id;
                    sprintName = data.Items[idx].Name;
                    sprints = _.map(data.Items, function(val, idx){
                        return {
                            id: val.Id,
                            name: val.Name,
                            projectName: val.Project.Name
                        };
                    });
                }

                callback(null, { 
                            date: date, 
                            data: { sprints: sprints, sprintId: sprintId, sprintName: sprintName }
                        });
                //console.log(sprints);
            });
        }).on('error',function(err) { 
            console.log('got error: ' + err.message)
            callback(err, {date: '9999-12-31'});
        });

        req.end();

    },
    tpToModelSchema: function (data, endDate) {

        //TODO: Replace this transformation method with another object/middleware               
        //Transform to standard model schema
        var item, isDemonstrable,descHasH1, title, 
            desc, descAfterCapture, descAfterH1Replace, assignedDevelopers, assignedUser,
            entities = [],
            notDemonstrableRegex = new RegExp('no demo|not demonstrable', 'i'),
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
                description: (desc) ? desc.replace(imageLinkRegex, '="' + config.info.hostUrl + '/images') : '', //item.Description,
                project: item.Project.Name,
                type: item.EntityType.Name,
                demonstratorName: assignedUser.FirstName + " " + assignedUser.LastName,
                demonstratorEmail: assignedUser.Email,
                demonstrable: isDemonstrable,
                demonstrated: false,
                boundaryDate: endDate,
                active: false,
                nextId: -1,
                url: config.info.hostUrl + '/entity/' + item.Id
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
    },
    impedimentsToModelSchema: function (data, endDate) {
        //TODO: Replace this transformation method with another object/middleware               
        //Transform to standard model schema
        var item, isDemonstrable, title, 
            desc, assignedUser, assignable,
            entities = [];

        for (var i = 0, len = data.Items.length; i < len; i++) {
            item = data.Items[i];
            isDemonstrable = true;
            title = item.Name;
            assignable = item.Assignable || { Name: 'no assignable', Id: 0 };
            desc = 'Impediment for: ' + assignable.Name;

            assignedUser = item.Responsible || {FirstName: 'not', LastName: 'assigned', Email: ''};

            entities.push({
                id: item.Id,
                name: title, //item.Name,
                description: desc, //item.Description,
                project: item.Project.Name,
                type: item.EntityType.Name,
                demonstratorName: assignedUser.FirstName + " " + assignedUser.LastName,
                demonstratorEmail: assignedUser.Email || '',
                demonstrable: isDemonstrable,
                demonstrated: false,
                boundaryDate: endDate,
                active: false,
                nextId: -1,
                url: config.info.hostUrl + '/entity/' + item.Id
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
