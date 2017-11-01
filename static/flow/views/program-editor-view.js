//
// A program editor view.
// Edit dataflow programs and select RPi to run them on.
//
var ProgramEditorView = function(options) {

    var base = BaseView(options);

    var content     = jQuery('#'+base.getDivId());

    //
    // Create save widget
    //
    var saveWidget  = jQuery('<div>');
    var nameLabel   = jQuery('<label>').text('Name').css('padding', '2px');;
    var nameField   = jQuery('<input>').attr({  id: 'program-editor-filename', 
                                                type: 'text' });

    //
    // Save button with handler and callback
    //
    var saveButton  = jQuery('<button>').text('Save')
                        .click( function() {
                           
                            var filename = jQuery('#program-editor-filename').val();
                            var content = jQuery('#program-content').val();

                            //
                            // After one use of the CSRF token in a POST
                            // request, it is no longer accepted.
                            // How to fix this? Pass a new one back 
                            // to the client and then reset the
                            // g_csrfToken value here? :(
                            //
                            var url = '/ext/flow/save_program'
                            var data = {    filename:   filename,
                                            content:    content         };

                                            // csrf_token: g_csrfToken     };
                            $.ajax({
                                url: url,
                                method: 'GET',
                                data: data,
                                success: function(data) {
                                    var response = JSON.parse(data);
                                    if(response.success) {
                                        alert("Program saved");
                                    } else {
                                        alert("Error: " + response.message);
                                    }
                                    console.log(
                                        "[DEBUG] Save success", response);
                                },
                                error: function(data) {
                                    console.log("[DEBUG] Save error", data);
                                    alert('Error saving file.')
                                },
                            });

                        });

    //
    // Exit button
    //
    var exitButton  = jQuery('<button>').text('Exit')
                        .click( function() {
                            showTopLevelView('landing-page-view');
                        });

    nameLabel.appendTo(saveWidget);
    nameField.appendTo(saveWidget);
    saveButton.appendTo(saveWidget);
    exitButton.appendTo(saveWidget);

    //
    // Create the editor panel
    //
    var editor      = jQuery('<div>', { css: { width: '75%' } });
    saveWidget.appendTo(editor);

    //
    // Create the "My Data" / "connect to pi" panel.
    //
    var dataTable   = jQuery('<table>');

    var dataTitle   = jQuery('<div>', { css: { paddingTop: '5px' } });
    dataTitle.text('My Data');

    var piList      = jQuery('<div>', { css: {
                            width:      '100%',
                            height:     '200px'  } });

    var choosePiBtn = jQuery('<button>', { css: {
                            // position:   'relative',
                            left:      '0px',
                            bottom:     '0px'   }});
    choosePiBtn.text('Connect to Pi');


    Util.addTableRow(dataTable, [dataTitle]);
    Util.addTableRow(dataTable, [piList]);
    Util.addTableRow(dataTable, [choosePiBtn]);

    //
    // Create main table and add all of our components
    //
    var table = jQuery('<table>', { css: { width: '100%' } });

    Util.addTableRow(table, [editor, dataTable] );

    table.appendTo(content);

    var textarea = jQuery('<textarea>', {   id: 'program-content', 
                                            width: 600, 
                                            height: 200 } );
    textarea.appendTo(editor);

    return base;
}
