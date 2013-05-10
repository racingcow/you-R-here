var sys = require("util");
var rest = require("restler"); //https://github.com/danwrong/restler 
var moment = require("moment");//http://momentjs.com
var config = require("./targetprocess.config");
var _ = require("underscore");

var self = this;
var methods = {    
    globalOptions : {},
    init : function(options) {
        self.globalOptions = options;
        self.globalOptions.format = self.globalOptions.format || "json";

        self.globalOptions.username = config.info.username;
        self.globalOptions.password = config.info.password;
        self.globalOptions.url = config.info.url;
    },
    buildBaseUrlForActiveIteration : function(options) {

        console.log('buildBaseUrlForActiveIteration');

        var url = [];
        url.push(config.info.url);
        url.push("Assignables?take=50&format=");
        url.push(config.info.format);             
        url.push("&include=[Id,Description,Name,EntityType,Tags,Assignments[Id,Role,GeneralUser[FirstName,LastName,Email,Login]],Project[Name]]&where=");
        url.push(encodeURIComponent("(EntityType.Name in ('UserStory','Bug'))"));
        url.push(encodeURIComponent(" and (Iteration.EndDate eq '"));     
        url.push(moment(options.date).format("YYYY-MM-DD"));           
        url.push(encodeURIComponent("')"));
        return url.join("");
    },
    getEntitiesForActiveIteration : function(callback, options) {

        console.log('getEntitiesForActiveIteration');

        //todo: extend globalOptions with options to create localOptions variable
        options = options || {};
        var getOptions = {
            username: config.info.username,
            password: config.info.password,
            url: options.url || config.info.url,
            format: options.format || "json",
            date: options.date || methods.globalOptions.date,
            parser: rest.parsers.json,
            iterationDurationInWeeks: config.info.iterationDurationInWeeks
        };

        var baseUrl = methods.buildBaseUrlForActiveIteration(getOptions),
            encodedEntityStateClause = encodeURIComponent(" and (EntityState.Name in ('To Verify','Done','Fixed','Closed'))"),
            encodedTagsClause = encodeURIComponent(" and (Tags contains 'Demo')"),            
            itemsUrl = baseUrl + encodedEntityStateClause,
            taggedItemsUrl = baseUrl + encodedTagsClause;

        //console.log("getEntitiesForActiveIteration 'normal items' TP API: \n" + itemsUrl);
        var itemResults;
        rest.get(itemsUrl,  getOptions)
            .on('success', function(data, response) {
                itemResults = data; 

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
        
        var url = [];
        url.push(config.info.url);
        url.push("Iterations?format=");
        url.push(config.info.format);
        url.push("&include=[EndDate]&where=");
        url.push(encodeURIComponent("(EndDate lte '"));
        url.push(moment().format("YYYY-MM-DD"));
        url.push(encodeURIComponent("') and (EndDate gte '"));
        url.push(moment().subtract("weeks", config.info.iterationDurationInWeeks).format("YYYY-MM-DD"));
        url.push("')");
        url = url.join("");

        //logIt("getMostRecentIterationBoundary TP API: " + url);

        //handle the different events individually... 
        rest.get(url, config.info)
            .on('success', function(data, response) {
                var dates = _.map(data.Items, function (item) {
                    //oh my! - http://weblogs.asp.net/bleroy/archive/2008/01/18/dates-and-json.aspx
                    return new Date(parseInt(/\/Date\((\d+).*/.exec(item.EndDate)[1]));
                });                                
                var boundary = _.max(dates, function (date) { return date.getTime(); });
                var formattedBoundary = moment(boundary).format("MM-DD-YYYY");
                console.log("Boundary Date: " + formattedBoundary);
                callback(formattedBoundary);
 
        }).on('fail', function(data, response) {
            sys.puts("FAIL: \n" + data);
        }).on('error', function(err, response) {
            sys.puts("ERROR: " + err.message);
            //TODO: figure out to decode the raw buffer, so we can know what happened!
            if (response) console.log(response.raw);
        }).on('complete', function(result, response) {
            console.log('COMPLETE: ' + response.statusCode);
            if (response.statusCode != 200) console.log(result);
        });
   }
};
api = function(methodName, callback, options) {
    //logIt("Calling " + methodName);      
    if (methods[methodName]) {    
        return methods[methodName].apply(this, Array.prototype.splice.call(arguments, 1));
    } else if (typeof methodName === "object" || !methodName) {
        return methods.init.apply(this, arguments);
    } else {
        throw  new Error("Method " + method + " does not exist in tp.api");
    }
}
exports.api = api;
