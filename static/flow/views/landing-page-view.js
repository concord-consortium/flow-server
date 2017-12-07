//
// A view representing a main landing page
// which can display "My Programs", "Recording Now" data
// and "Previously Recorded" data
//
var LandingPageView = function(options) {

    var base = BaseView(options);
   
    var content = jQuery('#'+base.getDivId());

    var table       = jQuery('<table>', { width: '100%' } );

    //
    // Left margin
    //
    var leftMargin  = jQuery('<div>', { css: { width: '100px' } } );

    //
    // Left side of landing page
    //
    var left        = jQuery('<div>', { id: 'landing-page-dataset-view',
                                        css: {  
                                                float:  'right',
                                                textAlign: 'center' } } );

    //
    // Landing page center separator
    //
    var middle      = jQuery('<div>', { css: { textAlign: 'center' } } );
    var separator   = jQuery('<div>', { class: 'vertical-line',
                                        css:    {   width: '2px',
                                                    height: '400px' } } );
    separator.appendTo(middle);

    //
    // Right side of landing page
    //
    var right       = jQuery('<div>', { id: 'landing-page-my-programs-view',
                                        css: {  
                                                // height: '500px',
                                                textAlign: 'center' } } );

    //
    // Right margin
    //
    var rightMargin = jQuery('<div>', { css: {  width:      '100px',
                                                position:   'relative' } } );

    left.text('Recording Now');
    left.css('width','200px');

    Util.addTableRow(   table, 
                        [ leftMargin, left, middle, right, rightMargin ], 
                        { verticalAlign: 'top'} );

    table.appendTo(content);

    var createButton = jQuery('<div>', 
                            { class: 'circle-button color-my-programs-icon',
                                css: {
                                        position: 'absolute',
                                        top: '30px'
                                     }
                            } );
    createButton.text('Create New');
    createButton.appendTo(rightMargin);
    createButton.click(function() {
        var editor = getTopLevelView('program-editor-view');
        editor.loadProgram();
        // showTopLevelView('program-editor-view');
    });

    //
    // Show welcome message
    //
    var welcomeMessage = jQuery('<div>', { css: {   position: 'absolute',
                                                    paddingRight: '5px',
                                                    display: 'inline-block',
                                                    whiteSpace: 'nowrap',
                                                    top: '0px',
                                                    right: '0px' } } );
    var welcomeText = jQuery('<span>');

    var signOut = jQuery('<a>', { href: '/ext/flow/logout' } );
    signOut.text('logout');

    if(g_user != null) {
        welcomeText.text('Welcome ' + g_user.full_name);
        welcomeMessage.append(welcomeText);
        welcomeMessage.append(jQuery('<span>').text(' '));
        welcomeMessage.append(signOut);
        var spacing = jQuery('<span>', { css: { 
                                    paddingRight: '5px'} } );
        spacing.text(' ');
        welcomeMessage.append(spacing);

    } else {
        welcomeText.text('You are not logged in.');
        welcomeMessage.append(welcomeText);
    }

    //
    // Add admin button to welcome message
    //
    if(g_user != null && g_user.isAdmin) {
        var adminButton = $('<button>', {   html: 'Admin' } );
        adminButton.css('font-size','10px');

        adminButton.click(function(e) {
            showTopLevelView('admin-view');
        });
        adminButton.appendTo(welcomeMessage);
    }
    welcomeMessage.appendTo(content);

    var myPrograms = LandingPageMyProgramsView({id: 'landing-page-my-programs-view'});
    var myDatasets = LandingPageDataSetView({id: 'landing-page-dataset-view'});

    base.show = function() {
        console.log("[DEBUG] LandingPageView show()");
        jQuery('#'+base.getDivId()).show();
        myPrograms.show();
        myDatasets.show();
    }

    return base;
}
