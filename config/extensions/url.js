define(['jquery', 'require'], function ($, require){
	function getUrlForConfig(apiCall) {
	//EFFECTS: select url
		var base = window.location.href;
		var components = base.split("/");
		var domain = components[2];
		var returnBase = "";
		switch (domain.substring(0, 9)) {
			case "localhost":
				returnBase = "http://127.0.0.1:5000/";
//				returnBase = "https://api.mentoracademy.org/";
			break;
			case "jupyter-d":
				returnBase = "https://api-dev.mentoracademy.org/";
			break;
			case "jupyter-s":
				returnBase = "https://api-dev.mentoracademy.org/";
			break;
			case "jupyter.m":
				returnBase = "https://api-dev.mentoracademy.org";
				//returnBase = "https://api.mentoracademy.org/";
			break;
			case "hub.cours":
                returnBase = "https://api.mentoracademy.org/";
                break;
			default:
				returnBase = "https://api.mentoracademy.org/"
		}
		return returnBase + apiCall;
	}
	
	return{
		getUrlForConfig: getUrlForConfig
	};		
});

