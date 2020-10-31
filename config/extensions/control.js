define(['jquery', 'require'], function ($, require){

	//var list = {"url": true, "username": true, "getattempts": false, "getquestion": true}
	
	var mask = $("<div style = 'opacity:0.1; background-color:#000; z-index:5px; width:100%; height:100%; display:none'></div>").attr("id", "mask");
	
	function showMask(){
		var obj = document.getElementById("mask");
		obj.style.width = document.body.clientWidth;
		obj.style.height = document.body.clientHeight;
		obj.style.display = "block";
	}
	
	function hideMask(){
		var obj = document.getElementById("mask");
		obj.style.display = "none";
	}
	
	function getExtensionList(){
		var xhr = new XMLHttpRequest();
		var url = "https://api-extension-control.mentoracademy.org/extensionlist";
		var data = {"username": "random"};
		xhr.open('POST', url, false);
		xhr.setRequestHeader('Content-type', 'application/json');
		xhr.send(JSON.stringify(data));
		if(xhr.status == 200){
			return JSON.parse(xhr.responseText);
		}	
	}
	
	function callLoadQuestion(){
		var base = window.location.href;
		var components = base.split("?");
		
		if(components.length >= 2 && components[1] != ""){
			var params = components[1].split("&");
			for(var i=0; i<params.length; ++i){
				var temp = params[i].split("=");
				if(temp[0] == "question_id"){
					return temp[1];
				}
			}	
		} 
		else{
			return false
		}
	}
	
	
	return{
		getExtensionList: getExtensionList,
		callLoadQuestion: callLoadQuestion
	};

});
