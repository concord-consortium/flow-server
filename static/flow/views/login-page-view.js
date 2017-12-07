//
// A view representing a main login page
//
var LoginPageView = function(options) {

    var base = BaseView(options);
   
    var content = jQuery('#'+base.getDivId());

    var title = jQuery('<h1>');
    title.text('DataFlow');

    var ssoMessage = jQuery('<span>');
    ssoMessage.text('Login with ');
    var ssoLink = jQuery('<a>', { href: '/ext/flow/login' } );
    ssoLink.text('Portal SSO');

    var loginMessage = jQuery('<span>');
    loginMessage.text('Login with ');
    var loginLink = jQuery('<a>', { href: '/' } );
    loginLink.text('Rhizo Server');


    var welcomeText = jQuery('<div>', { css: {  width: '800px',
                                                margin: '0 auto',
                                                textAlign: 'center' } } );

    welcomeText.append(title);
    welcomeText.append(ssoMessage);
    welcomeText.append(ssoLink);
    welcomeText.append(jQuery('<br>'));
    welcomeText.append(loginMessage);
    welcomeText.append(loginLink);
    content.append(welcomeText);

    base.show = function() {
        console.log("[DEBUG] LoginPageView show()");

    	if(g_user != null) {
        	console.log("Already logged in...");
            // jQuery('#'+base.getDivId()).hide();
        	showTopLevelView('landing-page-view');
            return;
        }

        jQuery('#'+base.getDivId()).show();
    }

    return base;
}
