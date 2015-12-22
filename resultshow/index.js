/**
 * webconfig
 */
var util = require('util');
var events = require('events');

var logger;

////webconfig core/////////////////////////////////////////
var resultShow = function(settings){
    events.EventEmitter.call(this); //eventemitter inherits
    this.settings = settings;
    this.resultApp = new(require('./resultApp.js'))(this);
    logger = settings.logger;

	global.settings = settings;
}
util.inherits(resultShow, events.EventEmitter);//eventemitter inherits

////start///////////////////////////////////////////////
resultShow.prototype.start = function(){
    this.on('launch_resultApp',function(){
        this.resultApp.launch(this.settings);
    });
    
    this.emit('launch_resultApp');
}
////////////////////////////////////////////////////////
module.exports = resultShow;