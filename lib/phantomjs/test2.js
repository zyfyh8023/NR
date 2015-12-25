var webpage = require('webpage')
  , page = webpage.create();
  //CasperJS
  ////act//////////////////////////////////////////////////////////////////////////////////////
  page.open("http://www.mafengwo.cn/gonglve/", function (status) {
      
      if (status !== 'success') {
              console.log('Unable to access network');
          } else {


            page.settings = {
                javascriptEnabled: true,
                loadImages: true,
                webSecurityEnabled: false,
                userAgent: 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.137 Safari/537.36 LBBROWSER'
            };

              page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js", function() {

                
                  var linknum = page.evaluate(function(){
                      var plist = document.querySelectorAll(".gl_list");//获取所有链接
                      return $(plist).length;
                  });

                  console.log(linknum);
                  page.render('p1.png');

                  var left = page.evaluate(function(){
                      var leftpos=$("#pager").offset().left;
                      return leftpos;
                  });

                  var top = page.evaluate(function(){
                      var toppos = $("#pager").offset().top;
                      return toppos;
                  });

                  // 显示区域
                  // page.clipRect = {
                  //     top : top+2,
                  //     left : left+20,
                  //     width : 200,
                  //     height : 200
                  // };

                  console.log(left+"----------"+top);
                  page.sendEvent('click', left+20, top+2);

                  setTimeout(function(){

                    var linknum2 = page.evaluate(function(){
                        var plist = document.querySelectorAll(".gl_list");//获取所有链接
                        return $(plist).length;
                    });

                    console.log(linknum2);
                    page.render('p2.png');

                    page.close();
                    phantom.exit();

                  },5000);
                  

                  
              });
          }
  });