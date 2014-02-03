var https = require('https');
var config = require('./jira.config');
var _ = require('underscore');
var gravatar = require('gravatar');

var self = this;
self.imageMap = {};

var methods = {
    globalOptions : {},
    init : function(options) {
        self.globalOptions = options;
        self.globalOptions.format = self.globalOptions.format || 'json';
        self.globalOptions.username = config.info.username;
        self.globalOptions.password = config.info.password;
        self.globalOptions.url = config.info.url;
    },
    itemParamMap: function(opts) {
        var map = {};
        map['jql'] = 'issuetype in (Bug, Story) and sprint in (' + opts.sprintId + ') ';
        map['fields'] = 'summary,issuetype,description,assignee,labels,project,attachment,status,resolution';
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
    getEntitiesForActiveIteration : function(callback, opts) {
        console.log('getEntitiesForActiveIteration');
        var paramMap = methods.itemParamMap({date: opts.date, sprintId: opts.sprintId}),
            encodedParams = methods.buildRequestParams(paramMap, true),
            path = '/rest/api/2/search/?' + encodedParams,
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
                    callback([]);
                    return;
                }
                chunks.push(chunk);
            }).on('end',function(){
                var itemResults = JSON.parse(chunks.join(''));
                var entities = methods.jiraToModelSchema(itemResults, opts.date);
                callback(entities);
            });
        }).on('error',function(err) { 
            console.log('got error: ' + err.message)
            callback([]);
        });

        req.end();
    },
    getMostRecentIterationBoundary: function (callback) {
        console.log('getMostRecentIterationBoundary');

        var path = '/rest/greenhopper/1.0/sprintquery/' 
                    + config.info.jiraBoardId
                    + '?includeHistoricSprints=true&includeFutureSprints=true',
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
                    callback({date: new Date(), data: null});
                    return;
                }
                chunks.push(chunk);
            })
            .on('end', function(){
                var sprintId = '-1',
                    sprintName = 'Not set!',
                    date = new Date(),
                    data = JSON.parse(chunks.join('')),
                    sprints = data.sprints || [],
                    len = data.sprints 
                        ? data.sprints.length 
                        : 0,
                    idx = len > 1 
                        ? len - 1 
                        : 0;

                if (len > 0) {
                    sprintId = data.sprints[idx].id;
                    sprintName = data.sprints[idx].name;
                }

                callback({ 
                            date: date, 
                            data: { sprints: sprints, sprintId: sprintId, sprintName: sprintName }
                        });

            });
        }).on('error',function(err) { 
            console.log('got error: ' + err.message)
            callback({date: '9999-12-31'});
        });

        req.end();
    },    
    jiraToModelSchema: function (data, endDate) {

        //TODO: Replace this transformation method with another object/middleware               
        //Transform to standard model schema
        var item, isDemonstrable,descHasH1, title, statusId, statusOk, avatarUrl, imgMatch, imagesToReplace,
            desc, descAfterCapture, descAfterH1Replace, assignedUser, noDemoLabels, demoLabels,
            hostUrl = 'https://' + config.info.host,
            entities = [],
            notDemonstrableRegex = new RegExp('no-demo|not-demonstrable|no demo|not demonstrable', 'i'),
            demonstrableRegex = new RegExp('demo|demonstrable', 'i'),
            developerRegex = new RegExp('developer', 'i'),
            h1CaptureDescRegex = new RegExp('h1.\\s*.*$', 'm'),
            h1ReplaceRegex = new RegExp('(h1.)'),
            imageLinkRegex =  new RegExp('(!\\S+!)', 'gi'),
            imgSize = '24x24',
            imgSizeLg = '48x48';

        var issues = _.filter(data.issues, function(item) {
            statusId = item.fields.status.id;
            statusOk = _.filter(config.info.doneStatus, function(doneId){
                return statusId == doneId;
            });

            if (statusOk.length != 0) {
                return true;
            };

            statusOk = _.filter(config.info.inProgressStatus, function(progressId){
                return statusId == progressId;
            });

            if (statusOk.length != 0) {
                demoLabels = _.filter(item.fields.labels, function (label) {
                    return demonstrableRegex.test(label);
                });

                if (demoLabels.length != 0) {
                    //console.log('Marked Demo: ' + item.key);
                    return true;
                }
            };
        });

        _.each(issues, function(item) {
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
            if (item.fields.assignee){
                //avatarUrl = item.fields.assignee.avatarUrls[imgSize];
                //avatarUrlLarge = item.fields.assignee.avatarUrls[imgSizeLg]; 
                avatarUrl = gravatar.url(item.fields.assignee.emailAddress, { size: "24", default: "identicon" });
                avatarUrlLarge = gravatar.url(item.fields.assignee.emailAddress, { size: "48", default: "identicon" });
            } else {
                //avatarUrl = item.fields.project.avatarUrls[imgSize];
                //avatarUrlLarge = item.fields.project.avatarUrls[imgSizeLg];                 
                avatarUrl = gravatar.url(item.fields.project.name, { size: "24", default: "identicon" });
                avatarUrlLarge = gravatar.url(item.fields.project.name, { size: "48", default: "identicon" });
            }

            imgMatch = null;
            imagesToReplace=[];
            if (item.fields.attachment) {
                while (imgMatch = imageLinkRegex.exec(desc)) {
                    imagesToReplace.push(imgMatch[0]);
                }
                if (imagesToReplace.length > 0){
                    desc = methods.replaceImageLink(item.key, hostUrl, desc, imagesToReplace, item.fields.attachment);
                }
            }

            entities.push({
                id: item.key,
                name: title,
                description: (desc) ? desc : 'no description available...',
                project: item.fields.project.name,
                type: item.fields.issuetype.name === 'Story' ? 'UserStory' : item.fields.issuetype.name,
                demonstratorName: assignedUser.displayName,
                demonstratorEmail: assignedUser.emailAddress,
                demonstrable: isDemonstrable,
                demonstrated: false,
                boundaryDate: endDate,
                active: false,
                nextId: -1,
                url: hostUrl + '/browse/' + item.key,
                statusName: item.fields.status.name,
                avatarUrl: avatarUrl,
                avatarUrlLarge: avatarUrlLarge
            });
        });

        return entities.sort(function (a, b) {
            //we want User Story to be before Bug
            var typeSort = b.type.localeCompare(a.type); 
            if (typeSort != 0) return typeSort;
            
            var projectSort = a.project.localeCompare(b.project);
            if (projectSort != 0) return projectSort;

            return a.demonstratorName.localeCompare(b.demonstratorName);
        });
    },
    replaceImageLink: function(itemKey, hostUrl, desc, imagesToReplace, attachments){
        if (!desc) return desc;
        if (!imagesToReplace || imagesToReplace.length == 0) return desc;
        if (!attachments || attachments.length == 0) return desc;

        var map = [];

        _.each(imagesToReplace, function(replaceImg, idx) {
            var fileName = _.filter(attachments, function(attachment) {
                if ('!' + attachment.filename + '!' == replaceImg) {
                    return attachment.content;
                }
            });
            if (fileName.length != 0) {
                map.push({ key: replaceImg, value: fileName[0].content });
            }
        });

        var regEx, imgMapKey, imgMapUrl,
            substringIdx = hostUrl.length;//, imgMap = {};
        _.each(map, function(val, idx){
            imgMapKey = itemKey + '-' + idx + '.png';
            imgMapUrl = val.value;
            self.imageMap[imgMapKey] = val.value.substring(substringIdx);

            regEx = new RegExp(val.key, 'i');
            desc = desc.replace(regEx, '<img src="/image/' + imgMapKey + '" class="jira-image" alt="Linked image ' + val.key + '" />');
        });
        return desc;
    },
    imagePassthrough: function(callback, passReq, passRes) {
        //console.log(req);
        var imgParam = passReq.params[0];

        var path = self.imageMap[imgParam],
            options= {
                host: config.info.host,
                path: path,
                auth: config.info.username + ':' + config.info.password
            };

        var req = https.request(options,function(res) { 
            var chunks = [], chunkLen = 0;

            res.on('data', function(chunk) {
                if (res.statusCode != '200') {
                    console.log(chunk);
                    callback([]);
                    return;
                }
                chunkLen += chunk.length;
                chunks.push(chunk);
            }).on('end',function(){
                //console.log('callback time!');
                callback({length: chunkLen, chunks: chunks});
            });
        }).on('error',function(err) { 
            console.log('got error: ' + err.message)
            callback([]);
        });

        req.end();
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
