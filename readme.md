you-R-here
==========

An agile iteration demo helper
------------------------------

you-R-here helps ease facilitation of agile iteration demos.

### Current Features
*  Integration with [Target Process](http://www.targetprocess.com/)
*  Allow viewers to "follow along", showing the current user story/bug being demonstrated in real-time

### Roadmap
Plans (Hopes?) for the future
*  Integration with [JIRA/Greenhopper](http://www.atlassian.com/software/greenhopper/overview)
*  Webcam/audio support

### Trello Board
https://trello.com/board/you-r-here/5072e0f3adf38a7e51a3ff6f

Getting Started
------------------------------

*  Download code
*  Install packages...
  *  npm install express
  *  npm install gravatar
  *  npm install mime
  *  npm install moment
  *  npm install restler
  *  npm install socket.io
  *  npm install underscore
*  Create a file named __targetprocess.config.js__ file in your you-R-here root folder with the following format...	

<code>
	info = {
		username: "myusername",
		password: "mysecretpassword",
		url: "https://mycompany.tpondemand.com/api/v1/"
	};
	exports.info = info;
</code>

*  Run the app and enjoy
  *  node you-R-here