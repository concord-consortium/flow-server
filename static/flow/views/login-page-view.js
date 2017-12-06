//
// A view representing a main login page
//
var LoginPageView = function(options) {

    var base = BaseView(options);
   
    var content = jQuery('#'+base.getDivId());

    var title = jQuery('<h1>');
    title.text('DataFlow');

    var loginMessage = jQuery('<div>');
    loginMessage.text('You are not logged in.');

    var welcomeText = jQuery('<div>', { css: {  width: '800px',
                                                margin: '0 auto',
                                                textAlign: 'center' } } );

    console.log("Show login message...");
    welcomeText.append(title);
    welcomeText.append(loginMessage);
    content.append(welcomeText);

    base.show = function() {
        // console.log("[DEBUG] LoginPageView show()");

    	if(g_user != null) {
        	console.log("Already logged in...");
        	showTopLevelView('landing-page-view');
            return;
        }

        jQuery('#'+base.getDivId()).show();
    }

    return base;
}
