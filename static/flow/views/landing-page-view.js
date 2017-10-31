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

    base.loadPrograms = function(div) {

    };

    base.loadRecordedData = function(div) {

    };

    return base;
}
