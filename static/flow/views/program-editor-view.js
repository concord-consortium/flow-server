//
// A program editor view.
// Edit dataflow programs and select RPi to run them on.
//
var ProgramEditorView = function(options) {

    var base = BaseView(options);

    var content     = jQuery('#'+base.getDivId());

    //
    // Create the editor panel
    //
    var editorPanel = jQuery('<div>', { css: { width: '75%' } });

    //
    // Create file manager widget
    //
    var fileManager = ProgramEditorFileManager({    container:  editorPanel,
                                                    editor:     base} );

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

    Util.addTableRow(table, [editorPanel, dataTable] );

    table.appendTo(content);

    var textarea = jQuery('<textarea>', {   id: 'program-content', 
                                            width: 600, 
                                            height: 200 } );
    textarea.appendTo(editorPanel);

    //
    // Clear the content. Reset editor to initial state.
    //
    base.resetEditor = function() {
        var nameWidget      = jQuery('#program-editor-filename');
        var contentWidget   = jQuery('#program-content');
        nameWidget.val('');
        contentWidget.val('');
    }

    //
    // Load program from server
    //
    base.loadProgram = function(params) {
    
        // console.log("[DEBUG] ProgramEditorView loadProgram()", params);

        var nameWidget      = jQuery('#program-editor-filename');
        var contentWidget   = jQuery('#program-content');

        nameWidget.val('');
        contentWidget.val('');

        //
        // If no program to load, create a new program
        //
        if(!params) {
            showTopLevelView('program-editor-view');
            return
        }

        if(params && params.filename) {

            var filename    = params.filename;
 
            contentWidget.val("Loading program " + filename + " ...");
            contentWidget.attr("disabled", true);

            var url = '/ext/flow/load_program'

            var data = {    filename:   filename            };
                            // csrf_token: g_csrfToken      };


            //
            // Display editor
            //
            showTopLevelView('program-editor-view');

            $.ajax({
                url: url,
                method: 'GET',
                data: data,
                success: function(data) {
                    var response = JSON.parse(data);

                    console.log("[DEBUG] Load program response", response);

                    if(response.success) {
                                        
                        // alert("Program loaded");

                        var content = response.content;
                        nameWidget.val(filename);
                        contentWidget.val(content);
                        contentWidget.attr("disabled", false);

                    } else {
                        alert("Error: " + response.message);
                    }
                },
                error: function(data) {
                    console.log("[ERROR] Load error", data);
                    alert('Error loading program.')
                },
            });

        }
    }

    return base;
}
