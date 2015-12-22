var jobsAPI = require('../models/jobmodel.js');

/*
 * GET home page.
 */
exports.index = function(req, res){
	//object,pagenum,skipstep,callback)
	jobsAPI.findAllByCon({},10,5,function(err, results, nums){
		if(err){
			console.log('err');
		}else{
			var showpagetip, allpage;
			allpage=Math.ceil(nums/10);
			
			if(allpage>9){
				showpagetip=9;
			}else{
				showpagetip=allpage;
			}
			
			res.render('index', { 
				title: 'Result Show', 
				jobs: results, 
				showpagetip: showpagetip, 
				allpage: allpage,
				nums: nums
			});
		}
	})
	
};


exports.pagesearch = function(req, res){
	var curstep=req.body.curstep-1,
		pagenum=10,
		skipstep=curstep*pagenum,
		object={};
	//object,pagenum,skipstep,callback)
	jobsAPI.findAllByCon(object,pagenum,skipstep,function(err, results, nums){
		if(err){
			console.log('err');
		}else{
			res.send({jobs: results, nums: nums}); 
		}
	})
	
};
