$(document).ready(function() {

	$(document.body).delegate('.on_fous', 'click', function() {
		var srcMin=$(this).children('img').attr('src');
		var srcArr=srcMin.split('.');
		srcArr[srcArr.length-2]="w609";
		var srcAll=srcArr.join('.');
		window.open(srcAll);
	});

	$(document.body).delegate('.page-tip', 'click', function() {

		var pagenum =pageStep($(this));
		if(pagenum!=0){

			$.ajax({    
			    type:'post',        
			    url:'/pagesearch',   
			    data:{
			    	curstep: pagenum
			    },
			    dataType:'json',    
			    success: function(data){
			    	var htmls=[];
			    	for(var i=0, len=data.jobs.length;i<len;i++){
			    		htmls+=[
			    			'<tr>',
			    			'<td class="addname">'+data.jobs[i].addname+'</td> ',
			    			'<td class="mainimg">',
			    			'<a class="on_fous preview_btn" href="javascript:;">',
			    			'<img src="'+data.jobs[i].mainimg+'" /></a></td>',
			    			'<td class="tags">'+data.jobs[i].tags+'</td>',
			    			'<td class="abstracts">'+data.jobs[i].abstracts+'</td>',
			    			'<td class="imgs">'+data.jobs[i].imgs+'</td>',
			    			'<td class="uTime">'+ new Date(data.jobs[i].uTime).Format("yyyy-MM-dd hh:mm:ss")+'</td>',
			    			'<td class="url"><a href="'+data.jobs[i].url+'" target="_blank">查看</a></td>',
			    			'</tr>'
			    		].join('');
			    	}    
			        $("tbody").html(htmls);
			    },
			    error : function() {   
			        alert('err');    	
			   }        
			});  
		}
	});



}); 

function pageStep(clickobj){
	var pagenum;

	pagenum = clickPagebtn($(clickobj));
	if(pagenum != 0){
		pageChange(pagenum);
		return pagenum;
	}else{
		return 0;
	}
}

function pageChange(clickNum){
	var pagetipHtml='共有'+__data.allpage+'页，'+__data.nums+'条记录&nbsp;';

	if(__data.allpage != __data.showpagetip){
		pagetipHtml+='<a class="page-tip pre-page" href="javascript:;"><<</a>';
		pagetipHtml+= pagebtnShow(clickNum);
		pagetipHtml+='<a class="page-tip next-page" href="javascript:;">>></a>';
	}else{
		for(var i=1; i<=__data.allpage; i++){
			pagetipHtml+=comCon(i, clickNum);
		}
	}

	$(".J_page-tip-con").html(pagetipHtml);
}

function pagebtnShow(clickNum){
	var pagetipHtml="";
	var curNum=clickNum;
	var	nextNumDeta=__data.allpage-curNum;
	var	preNumDeta=curNum-4;

	if(nextNumDeta>=4 && preNumDeta>0){
		for(var i=curNum-4;i<=curNum+4;i++){
			pagetipHtml+=comCon(i, clickNum);
		}
	}else if(preNumDeta<=0){
		for(var i=1;i<=curNum+5-preNumDeta;i++){
			pagetipHtml+=comCon(i, clickNum);
		}
	}else{
		for(var i=curNum-4-(4-nextNumDeta);i<=__data.allpage;i++){
			pagetipHtml+=comCon(i, clickNum);
		}
	}

	return pagetipHtml;
}


function comCon(i, clickNum){
	var htmlS="";
	if(i==clickNum){
		htmlS='<a class="page-tip pagetip-actived" href="javascript:;">'+i+'</a>';
	}else{
		htmlS='<a class="page-tip" href="javascript:;">'+i+'</a>';
	}

	return htmlS;
}


function clickPagebtn(clickobj){
	var pagenum=0;

	if(isPrepage(clickobj) || isNextpage(clickobj)){
		if(isPrepage(clickobj) && parseInt($(".pagetip-actived").text()) != 1){
			pagenum = parseInt($('.pagetip-actived').text()) - 1;
		}
		if(isNextpage(clickobj) && parseInt($(".pagetip-actived").text()) != __data.allpage){
			pagenum = parseInt($('.pagetip-actived').text()) + 1;
		}
	}else{
		pagenum = parseInt($(clickobj).text());
	}

	return pagenum
}


function isPrepage(clickobj){
	if($(clickobj).hasClass('pre-page')){
		return true;
	}else{
		return false;
	}
}


function isNextpage(clickobj){
	if($(clickobj).hasClass('next-page')){
		return true;
	}else{
		return false;
	}
}


Date.prototype.Format = function(fmt)   
{ //author: meizz   
  var o = {   
    "M+" : this.getMonth()+1,                 //月份   
    "d+" : this.getDate(),                    //日   
    "h+" : this.getHours(),                   //小时   
    "m+" : this.getMinutes(),                 //分   
    "s+" : this.getSeconds(),                 //秒   
    "q+" : Math.floor((this.getMonth()+3)/3), //季度   
    "S"  : this.getMilliseconds()             //毫秒   
  };   
  if(/(y+)/.test(fmt))   
    fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));   
  for(var k in o)   
    if(new RegExp("("+ k +")").test(fmt))   
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));   
  return fmt;   
} 