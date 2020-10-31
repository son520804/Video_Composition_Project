define(['jquery', 'require'], function ($, require){
	function getUsernameForConfig() {
    	//EFFECTS: retrieve username from url
      	if (window.location.href.split("/")[2].substring(0, 9) == "localhost") {
			return "localhost";
		}
		else {
// 			url = new URL(window.location.href);
// 			user_id = url.searchParams.get("id");
			url = window.location.href;            
            user_id = url;
			return user_id;
		}
	}
	return{
		getUsernameForConfig: getUsernameForConfig
	};
});
