//
// A view representing a main login page
//
var LoginPageView = function(options) {

    var base = BaseView(options);

    var content = $('#'+base.getDivId());

    var title = $('<h1>');
    title.text('Dataflow');

    var ssoLink = $('<a>', { href: '/ext/flow/login' } );
    ssoLink.text('Login');

    var welcomeText = $('<div>', { css: {  width: '800px',
                                                margin: '0 auto',
                                                textAlign: 'center' } } );

    welcomeText.append(title);
    welcomeText.append(ssoLink);
    welcomeText.append($('<br>'));
    content.append(welcomeText);

    base.show = function() {
        console.log("[DEBUG] LoginPageView show()");

        if(g_user != null) {
            console.log("Already logged in...");
            showTopLevelView('landing-page-view');
            return;
        }

        $('#'+base.getDivId()).show();
    }

    return base;
}
