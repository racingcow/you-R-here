var sys = require('util');
var moment = require('moment');//http://momentjs.com
var config = require('./jira.config');
var _ = require('underscore');
var rest = require('restler'); //https://github.com/danwrong/restler 

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
        map['jql'] = 'issuetype in (Bug, Story) and sprint in openSprints() ORDER BY Rank ASC';
        map['fields'] = 'summary,issuetype,description,assignee,labels,project';
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

        var paramMap = methods.itemParamMap(getOptions.date),
            encodedParams = methods.buildRequestParams(paramMap, true),
            itemsUrl = getOptions.url + 'search/?' + encodedParams,
            itemResults;

        rest.get(itemsUrl,  getOptions)
            .once('success', function(data, response) {
                console.log(data);
                itemResults = data;
                var entities = methods.jiraToModelSchema(itemResults, getOptions.date);
                callback(entities);
            }).once('fail', function(data, response) {
                sys.puts('FAIL (get items): \n' + data);
            }).once('error', function(err, response) {
                sys.puts('ERROR (get items): ' + err.message);
                if (response) console.log(response.raw);
            }).once('complete', function(result, response) {
                if (response) {
                    console.log('COMPLETE  (get items): ' + response.statusCode);
                    if (response.statusCode != 200) console.log(result);
                }
                else 
                    sys.puts('no response');
            });

    },
    getMostRecentIterationBoundary: function (callback, options) {
        console.log('getMostRecentIterationBoundary');
        callback(moment().format('YYYY-MM-DD'));
    },
    jiraToModelSchema: function (data, endDate) {

        //TODO: Replace this transformation method with another object/middleware               
        //Transform to standard model schema
        var item, isDemonstrable,descHasH1, title, 
            desc, descAfterCapture, descAfterH1Replace, assignedUser, noDemoLabels
            entities = [],
            notDemonstrableRegex = new RegExp('no-demo|not-demonstrable|no demo|not demonstrable', 'i'),
            developerRegex = new RegExp('developer', 'i'),
            h1CaptureDescRegex = new RegExp('h1.\\s*.*$', 'm'),
            h1ReplaceRegex = new RegExp('(h1.)'),
            imageLinkRegex =  new RegExp('(!\\S+!)', 'gi'); 

        for (var i = 0, len = data.issues.length; i < len; i++) {

            item = data.issues[i];

            noDemoLabels = _.filter(item.fields.labels, function (label) {
                return notDemonstrableRegex.test(label);
            });

            isDemonstrable = noDemoLabels.length === 0;
            desc = item.fields.description;
            descHasH1 = h1ReplaceRegex.test(desc);
            descAfterCapture = (descHasH1) ? h1CaptureDescRegex.exec(desc) : '';

            title = (descHasH1) ? descAfterCapture[0].replace(h1ReplaceRegex, '') : item.fields.summary;

            descAfterH1Replace = (descHasH1) ? desc.replace(h1CaptureDescRegex,'').replace(h1ReplaceRegex, '') : desc;
            desc = (descAfterH1Replace && descAfterH1Replace.length > 0) ? descAfterH1Replace : title;
            assignedUser = item.fields.assignee || { displayName: 'Not Assigned', emailAddress: ''};

            entities.push({
                id: item.key,
                name: title,
                description: (desc) ? desc.replace(imageLinkRegex, '<img src="' + config.info.hostUrl + '/images"></img>') : '',
                project: item.fields.project.name,
                type: item.fields.issuetype.name === 'Story' ? 'UserStory' : item.fields.issuetype.name,
                demonstratorName: assignedUser.displayName,
                demonstratorEmail: assignedUser.emailAddress,
                demonstrable: isDemonstrable,
                demonstrated: false,
                boundaryDate: endDate,
                active: false,
                nextId: -1,
                url: config.info.hostUrl + '/browse/' + item.key
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
        throw  new Error('Method ' + method + ' does not exist in jira.api');
    }
}
exports.plugin = {
    api: api,
    config: config
};
