/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes')
var http = require('http');
var path = require('path');
var ejs = require('ejs');
var events = require('events');
var child_process = require('child_process');
var MongodbAPI = require('./models/my-mongodb.js');
var moment = require('moment');

ejs.filters.dateformat = function(obj, format) {
    if (format == undefined) {
        format = 'YYYY-MM-DD HH:mm:ss';
    }
    var ret = moment(obj).format(format);
    return ret == 'Invalid date' ? '0000-00-00 00:00:00' : ret;
};

// constructor
var resultApp = function(resultShow){
	events.EventEmitter.call(this);
	this.resultShow = resultShow;
	logger = resultShow.settings.logger;
}

resultApp.prototype.launch = function(settings){
	var app = express();
	app.set('port', settings['port']);
	app.configure(function(){
		app.set('views', __dirname + '/views');
		app.engine('.html', ejs.__express);
		app.set('view engine', 'html');
		app.use(express.favicon());
		app.use(express.cookieParser());
		app.use(express.session({secret: '1234567890QWERTY'}));
		app.use(express.urlencoded());
		app.use(express.staticCache({maxObjects: 100, maxLength: 512}));
		app.use(express.static(__dirname + '/public'));
		app.use(express.bodyParser());
		app.use(express.methodOverride());
		app.use(app.router);
		app.use(express.directory(__dirname + '/public'));
		app.use(function(req, res, next){
			throw new Error(req.url + ' not found');
		});
		app.use(function(err, req, res, next) {
			if(err){
				console.error(err);
			}
			res.send(err.message);
		});
		MongodbAPI.connect(function(error){
		    if (error){
		        throw error;
		    } 
		});
	});
    app.get('/', routes.index);
    app.post('/pagesearch', routes.pagesearch);

	console.log('create server...');
	http.createServer(app).listen(app.get('port'), function(){
		console.log('resultShow server listening on port ' + app.get('port'));

		var cmd="start", 
			url = "http://localhost:"+app.get('port');
		child_process.exec([cmd, url].join(' '));

	});
}
////////////////////////////////////////
module.exports = resultApp;