you-R-here
==========

An agile iteration demo helper
------------------------------

__you-R-here__ helps agile iteration demos suck less. 

### Current Features
*  Integration with [JIRA Agile](https://www.atlassian.com/software/jira/agile)
*  Integration with [Target Process](http://www.targetprocess.com/)
*  Allow viewers to "follow along", showing the current user story/bug being demonstrated in real-time

### Roadmap/Wishlist
* More plugins! We would love to add any of the following:
	*  TFS
	*  Github issues
	*  Huboard
	*  Trello
	*  __Your great idea goes here!__
*  WebRTC - Webcam/audio support
*  Multi-tenant
*  Better dashboard info
*  __Your great idea goes here!__

Getting started with you-R-here
------------------------------
### Clone the repo and install the packages
```Shell
git clone https://github.com/racingcow/you-R-here.git
cd you-R-here
npm install
```

### app.config.js
__app.config.js__ is required to configure the server.

Create __app.config.js__ in the __you-R-here__ root folder. Make a copy of the example file and season to taste.
```Shell
cp app.config.example.js app.config.js
````

Example  __app.config.js__:
```javascript
app = {
	title: "You-R-Here",
	serverAddress: "http://localhost",
	serverPort: 8080,
	plugin: "targetprocess"
};
exports.app = app;
```

**NOTE**, you can only select one plugin and run it in the application.
In the app.js config, if you want to use Jira, set the plugin: "jira"

Also we are not using targetprocess anymore.

## List of Available Plugins 

### jira.config.js
__jira.config.js__ provides required configuration for the TargetProcess plugin.

Create __jira.config.js__ in the __you-R-here__ `plugins` folder.  Make a copy of the example file and season to taste.
```Shell
cp jira.config.example.js jira.config.js
````

The status id values for `doneStatus` and `inProgressStatus` are found here: https://criticaltech.atlassian.net/rest/api/2/status

Example  __jira.config.js__:
```javascript
info = {
	username: "myusername",
	password: "mysecretpassword",
	orgName: "My Company",
	jiraBoardId: 1,
	host: "mycompany.atlassian.net",
	doneStatus: [5,6],
	inProgressStatus: [3],
	demoLabels: ['demo','demonstrable'],
	numSprints: 5,
	maxResults: 150
};
exports.info = info;
```

### targetprocess.config.js
__targetprocess.config.js__ provides required configuration for the TargetProcess plugin.

Create __targetprocess.config.js__ in the __you-R-here__ `plugins` folder.  Make a copy of the example file and season to taste.
```Shell
cp targetprocess.config.example.js targetprocess.config.js
````

Example  __targetprocess.config.js__:
```javascript
info = {
	username: "myusername",
	password: "mysecretpassword",
	host: "mycompany.tpondemand.com", // v. 0.3.11 host replaces url 
	orgName: "My Company", // v. 0.1.3
	format: "json",
	hostUrl: "https://mycompany.tpondemand.com", // v. 0.2.1 baseImageUrl --> hostUrl
	iterationSentinel: '\'My Project Name\'', // project name to use for list of iterations
	numIterations: 5 // number of iterations to display
};
exports.info = info;
```


Using you-R-Here
------------------------------
### Launch __you-R-here__
Launch __you-R-here__ to enjoy running your iteration demo!
```Shell
[sudo] node you-R-here.js
```


### Organizer - `http://you-R-here-server/organizer`
* Enter your email address
	* we use your email address for [Gravatar](http://gravatar.com)
* Choose last day of iteration
* Order the list of items
* Select current item
* Click `Shown' after an item has been demonstrated
* Click 'No Demo' for any item you will not be demonstrating

### Presenter - `http://you-R-here-server/presenter`
* Enter your email address 
	* we use your email address to filter the items assigned to you and for [Gravatar](http://gravatar.com)
* __current item__ - shows the item currently being demonstrated
* (default) __all items__ - shows all items in this iteration demo
* __my items__ - shows items assigned to you

### Spectator - `http://you-R-here-server/`
* Enter your email address
	* we use your address for [Gravatar](http://gravatar.com) (and uniqueness) 
* (default) __current item__ - shows the item currently being demonstrated
* __all items__ - shows all items in this iteration demo

Contributing to you-R-here
------------------------------
* [Open an issue](https://github.com/racingcow/you-R-here/issues)
* Submit a pull request
* __Your great idea goes here!__
