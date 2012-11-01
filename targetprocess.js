var sys = require("util");
var rest = require("restler"); //https://github.com/danwrong/restler 
var moment = require("moment");//http://momentjs.com
var config = require("./targetprocess.config");

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
    getEntitiesForActiveIteration : function(callback, options) {

        //todo: extend globalOptions with options to create localOptions variable
        options = options || {};
        var getOptions = {
            username: config.info.username,
            password: config.info.password,
            url: options.url || config.info.url,
            format: options.format || "json",
            date: options.date || self.globalOptions.date,
            parser: rest.parsers.json
        };

        var url = [];
        url.push(getOptions.url);
        url.push("Assignables?format=");
        url.push(getOptions.format);             
        url.push("&include=[Id,Description,Name,EntityType,Assignments[Id,Role,GeneralUser[FirstName,LastName,Email,Login]],Project[Name]]&where=");
        url.push(encodeURIComponent("(EntityType.Name in ('UserStory','Bug'))"));
        url.push(encodeURIComponent(" and (Iteration.EndDate eq '"));     
        url.push(moment(getOptions.date).format("YYYY-MM-DD"));           
        url.push(encodeURIComponent("')"));
        url.push(encodeURIComponent(" and (EntityState.Name in ('To Verify','Done','Fixed','Closed'))"));
        url = url.join("");
        //console.log("url is: " + url);
        rest.get(url, getOptions).on("complete", function(result) {
            if (result instanceof Error) {        
                sys.puts("ERROR: " + result.message);
            } else {
                callback(result);
            }
        });         
    }
};
api = function(methodName, callback, options) {
    //console.log("Calling " + methodName);      
    if (methods[methodName]) {    
        return methods[methodName].apply(this, Array.prototype.splice.call(arguments, 1));
    } else if (typeof methodName === "object" || !methodName) {
        return methods.init.apply(this, arguments);
    } else {
        throw  new Error("Method " + method + " does not exist in tp.api");
    }
}
exports.api = api;
