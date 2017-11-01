//
// A view representing a main landing page
// which can display "My Programs", "Recording Now" data
// and "Previously Recorded" data
//
var LandingPageView = function(options) {

    var base = BaseView(options);
   
    var content = jQuery('#'+base.getDivId());

    var table       = jQuery('<table>', { width: '100%' } );

    var lMargin     = jQuery('<div>', { css: { width: '50px' } } );

    var left        = jQuery('<div>', { css: {  
                                                position: 'relative', 
                                                top: '-50px',
                                                textAlign: 'center' } } );

    var middle      = jQuery('<div>', { css: { textAlign: 'center' } } );

    var right       = jQuery('<div>', { css: {  
                                                position: 'relative', 
                                                top: '-50px',
                                                textAlign: 'center' } } );

    var rMargin     = jQuery('<div>', { css: { width: '50px' } } );

    var separator   = jQuery('<div>', { class: 'vertical-line',
                                        css:    {   width: '2px',
                                                    height: '100px' } } );

    left.text('Recording Now');
    separator.appendTo(middle);
    right.text('My Programs');

    Util.addTableRow(table, [ lMargin, left, middle, right, rMargin ] );
    table.appendTo(content);

    var createButton = jQuery('<div>', { class: 'circle-button green' } );
    createButton.text('Create New');
    createButton.appendTo(rMargin);
    createButton.click(function() {
        showTopLevelView('program-editor-view');
    });

    var welcomeMessage = jQuery('<div>', { css: { position: 'absolute',
                                                    paddingRight: '5px',
                                                    top: '0px',
                                                    right: '0px' } } );
    welcomeMessage.text('Welcome ' + g_user.full_name);
    welcomeMessage.appendTo(content);

    base.loadPrograms = function(div) {

        var url = '/ext/flow/list_programs';

        $.ajax({
            url: url,
            method: 'GET',
            // data: data,
            success: function(data) {
                var response = JSON.parse(data);
                console.log("[DEBUG] List programs", response);
                if(response.success) {
                } else {
                }
            },
            error: function(data) {
                console.log("[DEBUG] List programs error", data);
            },
        });
        
    };

    base.loadRecordedData = function(div) {

    };

    base.loadPrograms(right);

    return base;
}
