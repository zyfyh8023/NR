var logging = require('./lib/logging.js'); 


var userArgv = require('optimist')
.usage('Usage: $0 -i [instance name] -a [crawl|test|config|proxy|schedule]  -p [num] -l[url] -h')
.options('i', {
        'alias' : 'instance',
        'default' : 'pengtouba',
        'describe' : 'Specify a instance'
    })
.options('a', {
        'alias' : 'action',
        'default' : 'crawl',
        'describe' : 'Specify a action[crawl|test|config|proxy|schedule]'
    })
.options('p', {
        'alias' : 'port',
        'default' : 2013,
        'describe' : 'Specify a service port, for config service and proxy router'
    })
.options('l', {
    'alias' : 'link',
    'default' : '',
    'describe' : 'Specify a url to test crawling'
})
.options('h', {
        'alias' : 'help',
        'describe' : 'Help infomation'
    });

var options = userArgv.argv;
if(options['h']){userArgv.showHelp();process.exit();}

var settings = require('./instance/'+options['i']+'/'+'settings.json');
settings['instance'] = options['i'];      //新增

var log_level = 'DEBUG';
if(settings['log_level'])log_level = settings['log_level'];


var configService = function(){
	var logger = logging.getLogger('config-service',options['i'],log_level);
	settings['logger'] = logger;        //新增
	settings['port'] = parseInt(options['p']);       //新增

	var webConfig = new(require('./webconfig'))(settings);
	
	webConfig.start();	
}

var testUrl = function(){
    if(options['l']!=''){
        var logger = logging.getLogger('crawling-testing',options['i'],'DEBUG');
        settings['logger'] = logger;
        settings['test'] = true;
        settings['use_proxy'] = false;
        var spider = new (require('./spider'))(settings);

        spider.test(options['l']);
    }
}

var schedule = function(){
    var logger = logging.getLogger('schedule', options['i'], log_level);
    settings['logger'] = logger;
    var scheduler = new (require('./scheduler'))(settings);

    scheduler.start();
}

var proxyService = function(){
    var logger = logging.getLogger('proxy-service',options['i'],log_level);
    settings['logger'] = logger;
    settings['port'] = parseInt(options['p']);
    var proxyRouter = new (require('./proxyrouter'))(settings);
    
    proxyRouter.start();
}

var crawling = function(){
    var logger = logging.getLogger('crawling',options['i'],log_level);
    settings['logger'] = logger;
    settings['instance'] = options['i'];
    var spider = new (require('./spider'))(settings);
    
    spider.start();
}

var showResults = function(){
    var logger = logging.getLogger('results-show',options['i'],log_level);
    settings['logger'] = logger;        //新增
    settings['port'] = parseInt(options['p']);       //新增

    var resultShow = new(require('./resultshow'))(settings);
    
    resultShow.start();  
}

switch(options['a']){
    case 'config':
        configService();
        break;
    case 'test':
        testUrl();
        break;
    case 'schedule':
        schedule();
        break;
    case 'proxy':
        proxyService();
        break;
    case 'crawl':
        crawling();
    	break;
    case 'results':
        showResults();
        break;
    default:
	    userArgv.showHelp();
        break;
}
