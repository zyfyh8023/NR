var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//定义Article对象模型
var JobinfoSchema = new Schema({
    url:String,
    mainimg:String,
    addname:String,
    tags:String,
    abstracts:String,
    imgs:String,
    cTime: { type: Date, default: Date.now },
    uTime: { type: Date, default: Date.now }
});

//访问User对象模型
mongoose.model('Jobinfo', JobinfoSchema);
var Jobinfo = mongoose.model('Jobinfo');   //作用是什么？   下面所有的new User 既是如此
exports.Jobinfo=Jobinfo;

//添加功能
exports.create = function(obj,callback) {
    var newJobinfo = obj;
    newJobinfo.save(function(err){
        if(err){
            callback(err);
        }else{
            callback(null);
        }
    });
}


//条件查找所有结果集
exports.findAll = function(object,callback) {
     Jobinfo.find(object,function(err,result){
        if(err){
            callback(err);
        }else
        {
            callback(null,result);
        }
     });
}

//删除操作
exports.delete = function(object,callback) {
     Jobinfo.remove(object,function(err){
        if(err){
            callback(err);
        }else
        {
            callback(null);
        }
     });
}

//更新操作
exports.modify = function(conditions,updates,options,callback) {
     Jobinfo.update(conditions,updates,options,function(err){
        if(err){
            callback(err);
        }else
        {
            callback(null);
        }
     });
}



