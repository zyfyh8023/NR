var mongoose = require('mongoose');
var dburl = 'mongodb://localhost:27017/renrenxiuDB'; //数据库地址

exports.connect = function(callback) {
    mongoose.connect(dburl);
}

exports.disconnect = function(callback) {
    mongoose.disconnect(callback);
}

