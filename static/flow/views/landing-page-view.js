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
                                                    height: '400px' } } );

    left.text('Recording Now');
    left.css('width','300px');

    separator.appendTo(middle);
    right.text('My Programs');
    right.css('width','300px');

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

    //
    // AJAX call and handler for updating "My Programs" div.
    //
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
                   
                    div.empty();
                    div.css('width', '300px');

                    var title = jQuery('<div>');
                    title.text("My Programs");
                    title.appendTo(div);

                    var table = jQuery('<table>', 
                                    { css: {  margin: '0 auto' } } );

                    var files = response.files;
                    var row = [];
                    for(var i = 0; i < files.length; i++) {

                        var wrapper = jQuery('<div>', 
                                        { css: {    testAlign: 'center',
                                                    padding: '10px' } });

                        var box = jQuery('<div>', 
                                    { class: 'square-button green',
                                        css: { margin: '0 auto' } } );

                        var text = jQuery('<div>', 
                                    { css: {    left: '5px',
                                                top: '5px'}  } );

                        text.text(files[i]);
                        text.appendTo(box);
                        box.appendTo(wrapper);

                        row.push(wrapper);

                        if (i % 2 == 1) {
                            Util.addTableRow(table, row);
                            row = [];
                        }
                    }
                    if (i % 2 == 1) {
                        row.push(jQuery('<div>'));
                        Util.addTableRow(table, row);
                    }
                    table.appendTo(div);

                } else {
                    console.log("[ERROR] Error listing programs", response);
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
