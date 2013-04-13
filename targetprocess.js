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
        url.push("&include=[Id,Description,Name,EntityType,Assignments[Id,Role,GeneralUser[FirstName,LastName,Email,Login]],Project[Name]]&where=");
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
        rest.get(itemsUrl, getOptions).on("complete", function(result) {
            if (result instanceof Error) {        
                sys.puts("ERROR (1): " + result.message);
            } else {        

                itemResults = result;

                //HACK: not happy about this, but software that works is better than 
                //software waiting for an answer on how to use "OR" in the WHERE of TP API calls
                rest.get(taggedItemsUrl, getOptions).on("complete", function(taggedResults) {
                    if (taggedResults instanceof Error) {        
                        sys.puts("ERROR (2): " + taggedResults.message);
                    } else {
                        for (var i=0,len = taggedResults.Items.length; i < len; i++) {
                            itemResults.Items.push(taggedResults.Items[i]);
                        }
                        itemResults.Items = _.uniq(itemResults.Items,false, function(item) {
                            return item.Id;
                        });
                        callback(itemResults);
                    }
                });

            }
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

        rest.get(url, config.info).on("complete", function (result) {
            if (result instanceof Error) {
                sys.puts("ERROR: " + result.message);
            } else {                
                var dates = _.map(result.Items, function (item) {
                    //oh my! - http://weblogs.asp.net/bleroy/archive/2008/01/18/dates-and-json.aspx
                    return new Date(parseInt(/\/Date\((\d+).*/.exec(item.EndDate)[1]));
                });                                
                var boundary = _.max(dates, function (date) { return date.getTime(); });
                var formattedBoundary = moment(boundary).format("MM-DD-YYYY");
                console.log("Boundary Date: " + formattedBoundary);
                callback(formattedBoundary);
            }
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
