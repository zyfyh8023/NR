/**
 * Created by james on 13-12-5.
 * spider middleware
 */
var crypto = require('crypto');
var url =  require("url");
var util = require('util');
var async = require('async');
var myredis = require('../lib/myredis.js');

var spider = function(spiderCore){
    this.spiderCore = spiderCore;
    this.queue_length = 0;
    this.driller_rules_updated = 0;
    this.driller_rules = {};
    logger = spiderCore.settings.logger;
}

////report to spidercore standby////////////////////////
spider.prototype.assembly = function(callback){
    var self = this;
    var dbtype = 'redis';
    if(this.spiderCore.settings['use_ssdb'])dbtype = 'ssdb';
    async.series([
        function(cb){
            myredis.createClient(
                self.spiderCore.settings['driller_info_redis_db'][0],
                self.spiderCore.settings['driller_info_redis_db'][1],
                self.spiderCore.settings['driller_info_redis_db'][2],
                dbtype,
                function(err,cli){
                    self.redis_cli0 = cli;
                    cb(err);
                });
        },
        function(cb){
            myredis.createClient(
                self.spiderCore.settings['url_info_redis_db'][0],
                self.spiderCore.settings['url_info_redis_db'][1],
                self.spiderCore.settings['url_info_redis_db'][2],
                dbtype,
                function(err,cli){
                    self.redis_cli1 = cli;
                    cb(err);
                });
        },
        function(cb){
            myredis.createClient(
                self.spiderCore.settings['url_report_redis_db'][0],
                self.spiderCore.settings['url_report_redis_db'][1],
                self.spiderCore.settings['url_report_redis_db'][2],
                dbtype,
                function(err,cli){
                    self.redis_cli2 = cli;
                    cb(err);
                });
        }
    ],function(err,result){
        if(callback)callback(null,'done');
    });
}
/**
 * smart parse string to json object deeply(level2)
 * @param source
 */
spider.prototype.jsonSmartDeepParse = function(obj){
    var dataobj = {};
    var numberPattern = new RegExp("^\-?[0-9]+$");
    for(i in obj){
        if(obj.hasOwnProperty(i)){
            if(typeof(obj[i])==='string' && (obj[i].charAt(0)==='{' || obj[i].charAt(0)==='[') ){
                dataobj[i] = JSON.parse(obj[i]);  
            }else if(numberPattern.test(obj[i])){
                dataobj[i] = parseInt(obj[i]);
            }else if(obj[i]==='true'){
                dataobj[i] = true;
            }else if(obj[i]==='false'){
                dataobj[i] = false;
            }else {
                dataobj[i] = obj[i];
            }
        }
    }
    return dataobj;
}

/**
 * *步骤1
 *  -updated:driller:rule  更新规则的最新时间
 *  该函数主要用于定时更新加载规则watch
 */
//refresh the driller rules//////////////////////////////    
spider.prototype.refreshDrillerRules = function(){
    var self = this;
    var redis_cli = this.redis_cli0;                      //value 最新更新的时间戳
        redis_cli.get('updated:driller:rule',function(err,value){
            if (err){
                throw(err);
            }
            if(self.driller_rules_updated !== parseInt(value)){  //每次运行重新执行  无状态记录
                redis_cli.hlist('driller:*',function(err,values){   //values规则的所有key值数组
                    if (err){
                        throw(err);
                    }
                    self.tmp_driller_rules = {};
                    self.tmp_driller_rules_length = values.length;
                    for(var i=0;i<values.length;i++){
                        self.wrapper_rules(values[i]);
                    }
                });
                self.driller_rules_updated = parseInt(value);
            }else{
                logger.debug('driller rules is not changed, queue length: '+self.queue_length);
                setTimeout(function(){
                    self.refreshDrillerRules();
                },self.spiderCore.settings['check_driller_rules_interval']*1000);
            }
        })
}

/**
 * *步骤2
 * @param  {[type]} key [数据库中每一条规则的key值]
 * @return {[type]}     [self.driller_rules 和 self.tmp_driller_rules对象数组获取规则的具体键值和内容]
 */
spider.prototype.wrapper_rules = function(key){
    var self = this;
    var redis_cli = this.redis_cli0;
    redis_cli.hgetall(key, function(err,value){     //value每一条规则key值对应的规则内容
        if(self.tmp_driller_rules == undefined){
            self.tmp_driller_rules = {};
        }
        var isActive = value['active']=='true' || value['active']==true || value['active']=='1' || value['active']==1 ? true : false;
        if(isActive || self.spiderCore.settings['test'] ) {
            logger.info('Load rule: '+key);
            if (self.tmp_driller_rules[value['domain']] == undefined){
                self.tmp_driller_rules[value['domain']] = {};
            }
            self.tmp_driller_rules[value['domain']][value['alias']] = self.jsonSmartDeepParse(value);
        }else{ 
            logger.debug('Ignore rule: '+key+', status inactive');
        }
        self.tmp_driller_rules_length--;
        if(self.tmp_driller_rules_length<=0){
            self.driller_rules = self.tmp_driller_rules;
            //self.driller_rules_updated = (new Date()).getTime();
            self.spiderCore.emit('driller_rules_loaded',self.driller_rules);
            setTimeout(function(){
                self.refreshDrillerRules();},self.spiderCore.settings['check_driller_rules_interval']*1000);
        }
    });
}

/**
 * query drillerrule
 * @param id
 * @param name   test的第十一个步骤   获取对应的extract_rule
 */
spider.prototype.getDrillerRule = function(id,name){
    
    var splited_id = id.split(':');
    var pos = 1;
    if(splited_id[0]==='urllib'){
        pos = 2;
    }
    
    if(this.driller_rules[splited_id[pos]][splited_id[pos+1]] && this.driller_rules[splited_id[pos]][splited_id[pos+1]].hasOwnProperty(name)){
        return this.driller_rules[splited_id[pos]][splited_id[pos+1]][name];
    }else{
        logger.warn(util.format('%s in %s %s, not found',name,splited_id[pos],splited_id[pos+1]));
        return false;
    }
}
/**
 * get driller rules dictionary
 * @param id
 * @returns dict{}
 */
spider.prototype.getDrillerRules = function(id){
    var splited_id = id.split(':');
    var pos = 1;
    if(splited_id[0]==='urllib'){
        pos = 2;
    }
    if(this.driller_rules[splited_id[pos]] && this.driller_rules[splited_id[pos]][splited_id[pos+1]]){
        return this.driller_rules[splited_id[pos]][splited_id[pos+1]];
    }else{
        logger.warn(util.format('%s%s, not exists',splited_id[pos],splited_id[pos+1]));
        return null;
    }
}

////get url////////////////////////////////////////////
/**
 * *步骤4
 * 开始操作新的数据库redis_cli1
 * @param  {Function} callback [回调函数]
 * @return {[type]}            [description]
 * @操作queue:scheduled:all数据库变量
 * @开始使用schedule的结果
 * @需要知道redis_urlinfo_db数据库的结构
 * @redis的lpop操作
 */
spider.prototype.getUrlQueue = function(callback){
    /*
     var urlinfo = {
     "url":"http://list.taobao.com/itemlist/sport2011a.htm?spm=1.6659421.a21471u.6.RQYJRM&&md=5221&cat=50071853&sd=0&as=0&viewIndex=1&atype=b&style=grid&same_info=1&tid=0&olu=yes&isnew=2&smc=1&navid=city&_input_charset=utf-8",
     "type":"branch",
     "referer":"http://www.taobao.com",
     "cookie":[],//require('./taobao-cookie-simple.json'),
     "jshandle":true,
     "inject_jquery":false,
     "drill_rules":[".vm-page-next",".general a","a"],
     "script":["jsexec_result = document.getElementById('pageJumpto').value;","jsexec_result=document.querySelector('.user-nick').text"],//["jsexec_result = $.map($('.category li a span'),function(n,i) {return $(n).text();});"],//["jsexec_result=document.querySelector('.user-nick').text;"]
     "navigate_rule":[".vm-page-next"],
     "stoppage":3,
     "url_lib_id":"urllib:driller:taobao.com:list"
     }
     */
    var spider = this;
    var redis_driller_db = this.redis_cli0;
    var redis_urlinfo_db = this.redis_cli1;                     //link  http://www.sovxin.com/t_zonghe_279.html
        redis_driller_db.lpop('queue:scheduled:all',function(err, link){
            //2----------------------------------------------------------------------------------------
            if(!link){
                logger.info('No candidate queue, '+spider.queue_length+' urls in crawling.');
                if('no_queue_alert' in spider.spiderCore.spider_extend){
                    spider.spiderCore.spider_extend.no_queue_alert();
                }
                if(callback){
                    callback(false);
                    return;
                }
            };
            var linkhash = crypto.createHash('md5').update(link).digest('hex');
            redis_urlinfo_db.hgetall(linkhash,function(err, link_info){  //在开始只有queue里面的数据，在redis_urlinfo_db里面也存在
                    //4---------------------------------------------------------------------------------
                    if(err){
                        throw(err);
                    }
                    console.log(link_info);
                    console.log(!link_info || isEmpty(link_info));
                    process.exit();
                    //最开始queue和urllib是相同的，但这里面的不同不知为何？？？
                    if(!link_info || isEmpty(link_info)){
                        logger.warn(link+' has no url info, '+linkhash+', we try to match it');
                        var urlinfo = spider.wrapLink(link);
                        if(urlinfo != null){
                            spider.spiderCore.emit('new_url_queue',urlinfo);
                        }
                        else{
                            logger.error(link+' can not match any driller rule, ignore it.');
                            spider.getUrlQueue(callback);
                        }
                    }else{
                        // console.log(link_info);
                        // process.exit();
                        if(!link_info['trace']){
                            logger.warn(link+', url info is incomplete');
                            spider.getUrlQueue(callback);
                        }else{
                            var drillerinfo = spider.getDrillerRules(link_info['trace']);
                                if(drillerinfo == null){
                                    redis_urlinfo_db.del(linkhash,function(err){   //这有只删除该地址在urllib中内容，但是没有删除其在queue中的内容
                                        logger.warn(link+', has dirty driller info! clean it');
                                        var urlinfo = spider.wrapLink(link);
                                        if(urlinfo!=null){
                                            spider.spiderCore.emit('new_url_queue',urlinfo);
                                        }
                                        else{
                                            logger.error('Cleaned dirty driller info for '+link+', but can not match any driller rule right now, ignore it.');
                                            spider.getUrlQueue(callback);
                                        }
                                    });
                                }else{
                                    var urlinfo = {
                                        "url":link,
                                        "version":parseInt(link_info['version']),
                                        "type":drillerinfo['type'],
                                        "format":drillerinfo['format'],
                                        "encoding":drillerinfo['encoding'],
                                        "referer":link_info['referer'],
                                        "url_pattern":drillerinfo['url_pattern'],
                                        "urllib":link_info['trace'],
                                        "save_page":drillerinfo['save_page'],
                                        "cookie":drillerinfo['cookie'],
                                        "jshandle":drillerinfo['jshandle'],
                                        "inject_jquery":drillerinfo['inject_jquery'],
                                        "drill_rules":drillerinfo['drill_rules'],
                                        "drill_relation":link_info['drill_relation'],
                                        "validation_keywords":drillerinfo['validation_keywords']&&drillerinfo['validation_keywords']!='undefined'?drillerinfo['validation_keywords']:'',
                                        "script":drillerinfo['script'],
                                        "navigate_rule":drillerinfo['navigate_rule'],
                                        "stoppage":drillerinfo['stoppage'],
                                        "start_time":(new Date()).getTime()
                                    }
                                    logger.info('new url: '+link);
                                    spider.spiderCore.emit('new_url_queue',urlinfo);
                                    if(callback){
                                        callback(true);
                                    }
                                }
                        }
                    }
                    //4-----------------------------------------------------------------------------------
                });
                //3---------------------------------------------------------------------------------------
        });
}
/**
 * 步骤3
 * 规则加载完毕之后立刻执行checkQueue
 * Check how many urls can be append to queue
 * @spider.queue_length统计与修改
 */
spider.prototype.checkQueue = function(spider){
    var breakTt = false;
    async.whilst(  //类似于while
        function() {
            //开始时spider.queue_length为0
            logger.debug('Check queue, length: '+spider.queue_length); ///*爬虫的抓取页面并发请求数 5*/
            return spider.queue_length < spider.spiderCore.settings['spider_concurrency'] && breakTt !== true;
        },
        function(cb) {
            spider.getUrlQueue(function(bol){
                if(bol===true){
                    spider.queue_length++;   //修改spider.queue_length
                }
                else {
                    breakTt = true;
                }
                cb();
            });
        },
        function(err) {
            if(err){
                logger.error('Exception in check queue.');
            }
            return;
        }
    );
}
/**
 * TOP Domain,e.g: www.baidu.com  -> baidu.com
 * @param domain        url的domain
 * @returns {*}
 * @private                test的第五个步骤
 */
spider.prototype.__getTopLevelDomain = function(domain){
    var arr = domain.split('.');
    if(arr.length<=2){
        return domain;         //去除wwww之后的结果
    }
    else {
        return arr.slice(1).join('.');
    }
}
/**
 * detect link which driller rule matched
 * @param link    --test命令后面的地址
 * @returns {string} 检测link地址是否和url_pattern匹配     test的第四个步骤
 */
spider.prototype.detectLink = function(link){
    var urlobj = url.parse(link);
    var result = '';
    var domain = this.__getTopLevelDomain(urlobj['hostname']);
    if(this.driller_rules[domain] != undefined){
        var alias = this.driller_rules[domain];
        for(a in alias){
            if(alias.hasOwnProperty(a)){
                //var url_pattern  = decodeURIComponent(alias[a]['url_pattern']);
                var url_pattern  = alias[a]['url_pattern'];   /*网址规则，正则表达式，例如：^http://domain/\d+\.html，限定范围越精确越好*/
                var patt = new RegExp(url_pattern);
                if(patt.test(link)){
                    result = 'driller:'+domain+':'+a;  //driller:sovxin.com:detail
                    break;
                }
            }
        }
    }
    return result;
}
/**
 * construct a url info
 * @param link    test命令后面的地址
 * @returns {*}  linkinfo的组合          test的第三个步骤
 */
spider.prototype.wrapLink = function(link){
    var linkinfo = null;
    var driller = this.detectLink(link);     //driller:sovxin.com:detail
    if(driller!=''){
        var driller_arr = driller.split(':');
        var drillerinfo = this.driller_rules[driller_arr[1]][driller_arr[2]];  //对应driller_rules的对象
        linkinfo = {
            "url":link,
            "version":(new Date()).getTime(),
            "type":drillerinfo['type'],
            "format":drillerinfo['format'],
            "encoding":drillerinfo['encoding'],
            "referer":"",
            "url_pattern":drillerinfo['url_pattern'],
            "urllib":'urllib:'+driller,
            "save_page":drillerinfo['save_page'],
            "cookie":drillerinfo['cookie'],
            "jshandle":drillerinfo['jshandle'],    /*是否需要处理js，决定了爬虫是否用phantomjs加载页面*/
            "inject_jquery":drillerinfo['inject_jquery'],
            "drill_rules":drillerinfo['drill_rules'],
            "drill_relation":'*',
            "validation_keywords":drillerinfo['validation_keywords'] && drillerinfo['validation_keywords']!='undefined'?drillerinfo['validation_keywords']:'',
            "script":drillerinfo['script'],
            "navigate_rule":drillerinfo['navigate_rule'],
            "stoppage":drillerinfo['stoppage']
        }
    }
    return linkinfo;    //重构抓取的信息
}
/**
 * check retry
 * @param urlinfo
 */
spider.prototype.retryCrawl = function(urlinfo){
    var spider = this;
    var retryLimit = 3;
    if(spider.spiderCore.settings['download_retry']&&spider.spiderCore.settings['download_retry']!=undefined){
        retryLimit = spider.spiderCore.settings['download_retry'];
    }
    var act_retry = 0;
    if(urlinfo['retry'])act_retry = urlinfo['retry'];

    if(act_retry<retryLimit){
        urlinfo['retry'] = act_retry+1;
        logger.info(util.format('Retry url: %s, time: ',urlinfo['url'],urlinfo['retry']));
        spider.spiderCore.emit('new_url_queue',urlinfo);
        if('crawl_retry_alert' in spider.spiderCore.spider_extend)spider.spiderCore.spider_extend.crawl_retry_alert(urlinfo);//report
    }else{
        spider.updateLinkState(urlinfo['url'],'crawled_failure');
        logger.error(util.format('after %s reties, give up crawl %s',urlinfo['retry'],urlinfo['url']));
        spider.redis_cli2.zadd('fail:'+urlinfo['urllib'],urlinfo['version'],urlinfo['url'],function(err,result){
            spider.spiderCore.emit('slide_queue');
        });
        if('crawl_fail_alert' in spider.spiderCore.spider_extend)spider.spiderCore.spider_extend.crawl_fail_alert(urlinfo);//report
    }
}


/**
 * update link state to redis db
 * @param link
 * @param state
 */
spider.prototype.updateLinkState = function(link,state,callback){
    var spider = this;
    var urlhash = crypto.createHash('md5').update(link+'').digest('hex');
    this.redis_cli1.hgetall(urlhash,function(err,link_info){
        if(err){
            logger.error('get state of link('+link+') fail: '+err);
            if(callback){
                callback(err);
            }
            return;
        }
       
       //queue和urllib的相同之处
        if(link_info && !isEmpty(link_info)){
            var t_record = link_info['records'];
            var records = [];
            if(t_record!='' && t_record != '[]'){    
                try{
                    records = JSON.parse(t_record);
                }catch(e){
                    logger.error(t_record+' JSON parse error: '+e);
                }
            }
            records.push(state);
            async.parallel([
                    function(cb){
                        spider.redis_cli1.hmset(urlhash,{'records':JSON.stringify(records.length>3?records.slice(-3):records),'last':(new Date()).getTime(),'status':state},function(err,link_info){
                            if(err){
                                logger.error('update state of link('+link+') fail: '+err);
                            }
                            else {
                                logger.debug('update state of link('+link+') success: '+state);
                            }
                            cb(err);
                        });
                    },
                    function(cb){
                        if(state =='crawled_finish'){ //Redis ZREM命令从有序集合存储在键删除指定成员。非现有成员被忽略。当键存在，并且不持有有序集合，则会返回错误。
                            spider.redis_cli2.zrem('fail:'+link_info['trace'],link,function(err,result){
                                logger.debug('remove '+link+' from fail:'+link_info['trace']);
                                cb(err);
                            });
                        }else {
                            cb(null);
                        }
                    }
                ],
                function(err, results){
                    if(callback){
                        callback(err);
                    }
                });
        }else{   //queue和urllib的不同之处
            var trace = spider.detectLink(link);
            if(trace!=''){
                trace = 'urllib:' + trace;
                var urlinfo = {
                    'url':link,
                    'trace':trace,
                    'referer':'',
                    'create':(new Date()).getTime(),
                    'records':JSON.stringify([]),
                    'last':(new Date()).getTime(),
                    'status':state
                }
                async.parallel([
                        function(cb){
                            spider.redis_cli1.hmset(urlhash,urlinfo,function(err, value){
                                if (err) throw(err);
                                logger.debug('save new url info: '+link);
                                cb(err);
                            });
                        },
                        function(cb){
                            if(state==='crawled_finish'){
                                spider.redis_cli2.zrem('fail:'+urlinfo['trace'],link,function(err,result){
                                    logger.debug('remove '+link+' from fail:'+urlinfo['trace']);
                                    cb(err);
                                });
                            }else cb(null);
                        }
                    ],
                    function(err, results){
                        if(callback)callback(err);
                    });
            }else {
                logger.error(link+' can not match any rules, ignore updating.');
                if(callback)callback(err);
            }
        }
    });
}

module.exports = spider;
