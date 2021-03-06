var https = require('https');
var async = require('async');
var sys = require('util');
var moment = require('moment');
var config = require('./targetprocess.config');
var _ = require('underscore');
var gravatar = require('gravatar');

var self = this;
var methods = {
    init : function(options) {

    },
    itemParamMap: function(date) {
        var map = {};
        map['take'] = '100';
        map['format'] = config.info.format;
        map['include'] = '[Id,Description,Name,EntityType,EntityState[Name],Priority[Id,Name],Tags,Assignments[Id,Role,GeneralUser[FirstName,LastName,Email,Login]],Project[Name]]';
        //the TP API requires "IN" items to be enclosed by single ticks!
        map['where'] =  '(EntityType.Name in (\'UserStory\',\'Bug\'))'
                        + ' and (Iteration.EndDate eq \'' + date + '\')' ;
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

        var asyncCalls = [];

        asyncCalls.push(function(cb) {
            methods.getEntityItemsAsync(options, cb);
        });
        asyncCalls.push(function(cb) {
            methods.getTaggedItemsAsync(options, cb);
        });
        asyncCalls.push(function(cb) {
            methods.getImpedimentItemsAsync(options, cb);
        });

        async.parallel(asyncCalls,
            function(err, results){
                if (err){
                    console.log(err);
                    throw err;
                }

                //combine the entities!
                var allEntities = results[0].concat(results[1]),
                    uniqEntities = _.uniq(allEntities, false, function(val){
                        return val.Id;
                    });

                var impediments = methods.impedimentsToModelSchema(results[2], options.date),
                    entities = methods.tpToModelSchema(uniqEntities, options.date),
                    list = _.union(entities, impediments);

                callback(null, list)
            });

    },
    getEntityItemsAsync: function(options, callback) {
        console.log('getEntityItemsAsync');

        var paramMap = methods.itemParamMap(options.date);

        var basePath = '/api/v1/Assignables?' + methods.buildRequestParams(paramMap, true),
            entityStateClause = ' and (EntityState.Name in (\'To Verify\',\'Done\',\'Fixed\',\'Closed\'))';
            encodedEntityStateClause = encodeURIComponent(entityStateClause),
            //base items PLUS filter down to only "closed"
            path = basePath + encodedEntityStateClause, 
            options= {
                host: config.info.host,
                path: path,   
                auth: config.info.username + ':' + config.info.password
            };

        var req = https.request(options,function(res) {
            var chunks = [];

            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                if (res.statusCode != '200') {
                    console.log(chunk);
                    callback(null, []);
                    return;
                }
                chunks.push(chunk);
            })
            .on('end', function(){
                var data = JSON.parse(chunks.join(''));
                callback(null, data.Items);
            });
        }).on('error',function(err) { 
            console.log('got error: ' + err.message)
            callback(err, []);
        });

        req.end();
    },
    getTaggedItemsAsync: function(options, callback) {
        console.log('getTaggedItemsAsync');
        var paramMap = methods.itemParamMap(options.date);

        var basePath = '/api/v1/Assignables?' + methods.buildRequestParams(paramMap, true),
            tagsClause = '  and (Tags contains \'Demo\')';
            encodedTagsClause = encodeURIComponent(tagsClause),
            //base items in any state TAGGED "demo"
            path = basePath + encodedTagsClause, 
            options= {
                host: config.info.host,
                path: path,   
                auth: config.info.username + ':' + config.info.password
            };

       var req = https.request(options,function(res) {
            var chunks = [];

            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                if (res.statusCode != '200') {
                    console.log(chunk);
                    callback(null, []);
                    return;
                }
                chunks.push(chunk);
            })
            .on('end', function(){
                var data = JSON.parse(chunks.join(''));
                callback(null, data.Items || []);
            });
        }).on('error',function(err) { 
            console.log('got error: ' + err.message)
            callback(err, []);
        });

        req.end();
    },
    getImpedimentItemsAsync: function(options, callback) {
        console.log('getImpedimentItemsAsync');

       var basePath = '/api/v1/Impediments?format=json&take=250&',
            includeParam = 'include=' + encodeURIComponent('[Id,Description,Name,EntityType[Name],EntityState[Name],Priority[Id,Name],Tags,Project[Name],Assignable[Id,Description,Name,EntityType], Responsible[Id,Kind,FirstName,LastName,Email,Login]]'),
            whereParam = 'where=' + encodeURIComponent('EntityState.Name eq \'Open\''),
            path = basePath + includeParam + '&' + whereParam, 
            options= {
                host: config.info.host,
                path: path,   
                auth: config.info.username + ':' + config.info.password
            };

        var req = https.request(options,function(res) {
            var chunks = [];

            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                if (res.statusCode != '200') {
                    console.log(chunk);
                    callback(null, []);
                    return;
                }
                chunks.push(chunk);
            })
            .on('end', function(){
                var data = JSON.parse(chunks.join(''));
                callback(null, data.Items || []);
            });
        }).on('error',function(err) { 
            console.log('got error: ' + err.message)
            callback(err, []);
        });

        req.end();
    },
    getMostRecentIterationBoundary: function (callback, options) {
        console.log('getMostRecentIterationBoundary');
        
        var paramMap = {};
        paramMap['format'] = config.info.format;
        paramMap['take'] = config.info.numIterations;

        //the TP API requires "IN" items to be enclosed by single ticks!
        //so double check your targetprocess.config.js!
        paramMap['where'] = ' Project.Name in (' + config.info.iterationSentinel +')';

        var path = '/api/v1/Iterations?',
            options= {
                host: config.info.host,
                path: path + methods.buildRequestParams(paramMap, true),
                auth: config.info.username + ':' + config.info.password
            };

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
                    date = moment().format('YYYY-MM-DD'),
                    data = JSON.parse(chunks.join('')),
                    sprints = [],
                    len = data.Items 
                        ? data.Items.length 
                        : 0,
                    idx = len > 1 
                        ? len - 1 
                        : 0;

                if (len > 0) {
                    sprints = _.map(data.Items, function(val, idx){
                        var startDate = moment(val.StartDate),
                            endDate = moment(val.EndDate);

                        return {
                            id: val.Id,
                            name: moment(startDate).format('MMM DD, \'YY') + ' - ' + moment(endDate).format('MMM DD, \'YY'),
                            startDate: startDate.format('YYYY-MM-DD'),
                            endDate: endDate.format('YYYY-MM-DD')
                        };
                    });

                    var sprint = sprints[0];
                    sprintId = sprint.id;
                    sprintName = sprint.name;
                    date = sprint.endDate;
                }

                callback(null, { 
                            date: date, 
                            data: { sprints: sprints, sprintId: sprintId, sprintName: sprintName }
                        });
            });
        }).on('error',function(err) { 
            console.log('got error: ' + err.message)
            callback(err, {date: '9999-12-31'});
        });

        req.end();
    },
    tpToModelSchema: function (items, endDate) {
        //Transform to standard model schema
        var item, isDemonstrable,descHasH1, title, avatarUrl, avatarUrlLarge,
            desc, descAfterCapture, descAfterH1Replace, assignedDevelopers, assignedUser,
            entities = [],
            notDemonstrableRegex = new RegExp('no demo|not demonstrable', 'i'),
            developerRegex = new RegExp('developer', 'i'),
            h1CaptureDescRegex = new RegExp('<[h|H]1>((.)*)</[h|H]1>'),
            h1ReplaceRegex = new RegExp('(<h1>|<H1>|</h1>|</H1>)'),
            imageLinkRegex =  new RegExp('="(~)?/images', 'gi'); 

        for (var i = 0, len = items.length; i < len; i++) {
            item = items[i];
            isDemonstrable = notDemonstrableRegex.test(item.Tags) ? false : true;
            descHasH1 = h1ReplaceRegex.test(item.Description);
            descAfterCapture = (descHasH1) ? h1CaptureDescRegex.exec(item.Description) : '';
            title = (descHasH1) ? descAfterCapture[0].replace(h1ReplaceRegex, '') : item.Name;
            descAfterH1Replace = (descHasH1) ? item.Description.replace(h1CaptureDescRegex,'').replace(h1ReplaceRegex, '') : item.Description;
            desc = (descAfterH1Replace && descAfterH1Replace.length > 0) ? descAfterH1Replace : item.Name;

            assignedDevelopers = _.filter(item.Assignments.Items, function (item) {
                return developerRegex.test(item.Role.Name);
            });             
            assignedUser = assignedDevelopers.length > 0 ? assignedDevelopers[0].GeneralUser : {FirstName: "not", LastName: "assigned", Email: ""};

            if (assignedUser.Email.length > 0){
                avatarUrl = gravatar.url(assignedUser.Email, { size: "48", default: "identicon" });
                avatarUrlLarge = gravatar.url(assignedUser.Email, { size: "64", default: "identicon" });
            } else {
                avatarUrl = gravatar.url(item.Project.Name, { size: "48", default: "identicon" });
                avatarUrlLarge = gravatar.url(item.Project.Name, { size: "64", default: "identicon" });
            }

            entities.push({
                id: item.Id,
                name: title,
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
                url: config.info.hostUrl + '/entity/' + item.Id,
                statusName: item.EntityState.Name,
                avatarUrl: avatarUrl,
                avatarUrlLarge: avatarUrlLarge,
                priority: item.Priority.Name,
                priorityId: item.Priority.Id
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
    impedimentsToModelSchema: function (items, endDate) {
        //Transform to standard model schema
        var item, isDemonstrable, title, 
            desc, assignedUser, assignable,
            entities = [];

        for (var i = 0, len = items.length; i < len; i++) {
            item = items[i];
            isDemonstrable = true;
            title = item.Name;
            assignable = item.Assignable || { Name: 'no assignable', Id: 0 };
            desc = 'Impediment for: ' + assignable.Name;

            assignedUser = item.Responsible || {FirstName: 'not', LastName: 'assigned', Email: ''};

            if (assignedUser.Email.length > 0){
                avatarUrl = gravatar.url(assignedUser.Email, { size: "48", default: "identicon" });
                avatarUrlLarge = gravatar.url(assignedUser.Email, { size: "64", default: "identicon" });
            } else {
                avatarUrl = gravatar.url(item.Project.Name, { size: "48", default: "identicon" });
                avatarUrlLarge = gravatar.url(item.Project.Name, { size: "64", default: "identicon" });
            }

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
                url: config.info.hostUrl + '/entity/' + item.Id,
                statusName: '',//item.EntityState.Name,
                avatarUrl: avatarUrl,
                avatarUrlLarge: avatarUrlLarge,
                priority: '', //item.Priority.Name,
                priorityId: -1 //using negative number prevents display in UI //item.Priority.Id
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
