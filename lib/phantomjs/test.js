var system = require('system');
var page = require('webpage').create();

//command signal defined
var CMD_SIGNAL_CRAWL_SUCCESS = 1;
var CMD_SIGNAL_CRAWL_FAIL = 3;
var CMD_SIGNAL_NAVIGATE_EXCEPTION = 2;
var retryTimer = null;

page.viewportSize = { width: 1500, height: 500000 };

page.settings = {
  javascriptEnabled: true,
  loadImages: true,
  userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36'
};

// 显示区域
page.clipRect = {
    top : 0,
    left : 0,
    width : 1500,
    height : 500000
};

var drill_count = 0;

////phantomjs client identify
var pid = system.pid;

var sendToCaller = function(msg){
    // system.stdout.writeLine(JSON.stringify(msg)+'#^_^#');
}

////debugtofile//////////////////////////////////////////////////////////////////////////////
var debug2file = function(msg){
    var fs  = require("fs");
    var ipath = origin_urlinfo['ipath'];
    fs.write(ipath+'/phantomjs-debug.log',(new Date())+'==>'+JSON.stringify(msg)+'\n','a');
}
////page event////////////////////////////////////////////////////////////////////////////////////
page.onResourceRequested = function (req) {
    //you can ignore css here
};

page.onResourceReceived = function (res) {
    if (res.stage === 'start') {

    }else if (res.stage === 'end') {
        if(res.url===page.url){
            page.status = res.status;
            for(var s=0;s<res.headers.length;s++){
                if(res.headers[s]['name']==='remoteproxy'){
                    page.remoteProxy = res.headers[s]['value'];
                    break;
                }
            }
        }
        if(page.url==="about:blank"){
            page.status = res.status;
        }
    }
};


page.onInitialized = function() {
    //nothing
};

page.onUrlChanged = function(targetUrl) {
    //pass
};

page.onResourceError = function(resourceError) {
    if(resourceError.url===page.url){
        // system.stdout.writeLine(JSON.stringify({
        //     'signal':CMD_SIGNAL_CRAWL_FAIL,
        //     'message':'Unable to load resource',
        //     "url":resourceError.url,
        //     "errorCode":resourceError.errorCode,
        //     "description":resourceError.errorString
        // }));
    }
};


page.onLoadStarted  = function(status) {
    page.startTime = new Date();
    page.status = null;
    if(retryTimer){
        clearTimeout(retryTimer);
    }
};

page.onLoadFinished = function(status) {
    if (status !== 'success') {
        //system.stdout.writeLine(JSON.stringify({'signal':CMD_SIGNAL_CRAWL_FAIL,'message':'Open page failed',"url":page.url}));
    } else {
        page.endTime = new Date();
        workAfterLoadFinish(0,0);
    }

};

var workAfterLoadFinish = function(drill_retry,navigateretry){
     var   injected = page.injectJs("jquery-1.10.2.min.js");
    
        var i=0;

        var timer1=setInterval(function(){
            i++;
            console.log('success'+i);

            var pointnum = page.evaluate(function(){
                var plist = $(".gl_list");
                return plist.length;
            });

            console.log(pointnum);

            var left = page.evaluate(function(){
                var leftpos=$("#pager").offset().left;
                return leftpos;
            });

            var top = page.evaluate(function(){
                var toppos = $("#pager").offset().top;
                return toppos;
            });

           // 显示区域
             page.clipRect = {
                 top : top+2,
                 left : left+20,
                 width : 20,
                 height : 20
             };

            page.render('du52.com'+i+'.png');

            page.sendEvent('click', left+20, top+2);

            if(i>=20){
                clearInterval(timer1);
                phantom.exit();
            }

        }, 1000);
    
        


        // var drill_link = [];
        //     var drill_link = page.evaluate(function(){
        //         var jsexec_result = [];
        //             var doms = document.querySelectorAll("a");
        //             for(var x=0;x<doms.length;x++){
        //                 if(doms[x].hasAttribute('href')){
        //                     jsexec_result.push(doms[x].getAttribute('href'));
        //                 }
        //                 else if(doms[x].hasAttribute('src')){
        //                     jsexec_result.push(doms[x].getAttribute('src'));
        //                 }
        //             }
        //         return jsexec_result;
        //     });
            
        // console.log(drill_link.length);

   
}


page.onNavigationRequested = function(url, type, willNavigate, main) {
    page.customHeaders = {
        "client_pid": pid,
        "page": url
    };
}

////act//////////////////////////////////////////////////////////////////////////////////////
page.open("http://www.mafengwo.cn/gonglve/", function (status) {

    // if (status !== 'success') {
    //         console.log('Unable to access network');
    //     } else {
    //         page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js", function() {
    //             var data = page.evaluate(function() {
    //                 return $("body").html();
    //             });

    //             console.log(data);
    //             page.close();
    //             phantom.exit();
    //         });
    //     }
});

// var url = 'http://ju.taobao.com/?spm=1.6659421.754904973.2.ALtBmk';
// var script = "jsexec_result = $.makeArray($('.category li a span').text())";
// var urlinfo = {"url":url,"type":"branch","referer":"http://www.taobao.com","jshandle":true,"inject_jquery":true,"script":script,"navigate_rules":[]}
// openUrl(urlinfo);

