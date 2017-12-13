//
// A program editor view.
// Edit dataflow programs and select RPi to run them on.
//
var ProgramEditorView = function(options) {

    var base = BaseView(options);

    var content = jQuery('#'+base.getDivId());

    //
    // Create the editor panel
    //
    var leftPanel       = jQuery('<div>', 
                            {   id: 'program-editor-left-panel',
                                css: { width: '100%' } } );

    //
    // Create file manager widget
    //
    var fileManager    = ProgramEditorFileManager({ container:  leftPanel,
                                                    editor:     base    } );

    //
    // Create the panel for the "My Data" and "Pi Selector" components.
    //
    var rightPanel      = jQuery('<div>', 
                                {   id: 'program-editor-right-panel',
                                    css: { width: '100%' } });

    var piSelectorPanel = PiSelectorPanel({ container:  rightPanel,
                                            editor:     base        } );

    var myDataPanel     = MyDataPanel({ container:  rightPanel,
                                        editor:     base        } );

    //
    // Create main table and add all of our components
    //
    var mainTable = jQuery('<table>', { css: { width: '100%' } });

    Util.addTableRow(   mainTable, 
                        [leftPanel, rightPanel], 
                        { verticalAlign: 'top'} );

	//
    // A custom close button. Attach close functions to this button.
    //
    var closeButton = $('<div>', {  id: 'editor-close-button',
                                    css: {
                                        border:             '1px solid grey',
                                        cursor:             'pointer',
                                        textAlign:          'center',
                                        backgroundColor:    'white',
                                        verticalAlign:      'top',
                                        float:              'right',
                                        padding:            '2px',
                                        display:            'inline-block' }});
    closeButton.html("X");
    rightPanel.append(closeButton);

    content.append(mainTable);

   
	//
    // Main editor panel
    // 
    var programEditorDiv    = $('<div>');
    var programEditorPanel  = ProgramEditorPanel(
                                {container: programEditorDiv} );
    leftPanel.append(programEditorDiv);

    //
    // Accessors for our subcomponents.
    //
    base.getFileManager         = function() { return fileManager; };
    base.getPiSelectorPanel     = function() { return piSelectorPanel; };
    base.getMyDataPanel         = function() { return myDataPanel; };
    base.getProgramEditorPanel  = function() { return programEditorPanel; };

    base.getProgramSpec = function() { 
        var diagram     = programEditorPanel.getDiagram();
        var diagramSpec = diagramToSpec(diagram);
        return diagramSpec;
    }

    //
    // Clear the content. Reset editor to initial state.
    //
    base.resetEditor = function() {

        // console.log("[DEBUG] Reset editor.");

        var nameWidget      = jQuery('#program-editor-filename');
        nameWidget.val('');

        $('#my-data-panel').hide();
        $('#pi-selector-panel').show();
    }

    //
    // Load program from server
    //
    base.loadProgram = function(params) {
    
        // console.log("[DEBUG] ProgramEditorView loadProgram()", params);

        var nameWidget      = jQuery('#program-editor-filename');
        nameWidget.val('');

        var readOnly = false;

        if(params && params.readOnly) {

            readOnly = true;
            console.log("[DEBUG] readonly mode. Hiding all edit widgets.");
            
            $('#program-editor-file-manager').hide();
            $('#my-data-panel').hide();
            $('#pi-selector-panel').hide();
            $('#editor-close-button').hide();

            //
            // Allow custom close funcitons for read only views.
            // E.g. return to data set view, or return to 
            // browing programs that belong to others.
            //
            if(params.closeFunc) {
                $('#editor-close-button').show();
                $('#editor-close-button').click( params.closeFunc );
            }

            console.log("[DEBUG] readonly mode. Edit widgets hidden.");

            //
            // If we are loading a readonly view of the program, 
            // use the program spec passed to us.
            //
            base.getProgramEditorPanel().loadProgram({ 
                                            programSpec: params.programSpec,
                                            readOnly: readOnly } );

            return;

        } 

        $('#editor-close-button').hide();
        $('#program-editor-file-manager').show();
        $('#my-data-panel').hide();
        $('#pi-selector-panel').show();

        //
        // If no program to load, create a new program
        //
        if(!params) {
            programEditorPanel.loadProgram();
            showTopLevelView('program-editor-view');
            return;
        }

        if(params && params.filename) {

            var filename    = params.filename;
 
            // contentWidget.val("Loading program " + filename + " ...");
            // contentWidget.attr("disabled", true);

            var url = '/ext/flow/load_program'

            var data = {    filename:   filename,
                            csrf_token: g_csrfToken      };


            //
            // Display editor
            //
            showTopLevelView('program-editor-view');

            $.ajax({
                url: url,
                method: 'POST',
                data: data,
                success: function(data) {
                    var response = JSON.parse(data);

                    console.log("[DEBUG] Load program response", response);

                    if(response.success) {
                                        
                        // alert("Program loaded");

                        var content = response.content;
                        var programSpec = JSON.parse(content);
                        nameWidget.val(filename);
                        programEditorPanel.loadProgram({
                                            programSpec:    programSpec,
                                            readOnly:       false });

                        // console.log("[DEBUG] Editable mode. Showing all widgets.");

                        // base.getFileManager().show();
                        // base.getPiSelectorPanel().show();
                        // base.getMyDataPanel().show();
                        // base.getProgramEditorPanel().show();

                        base.getPiSelectorPanel().loadPiList();

                    } else {
                        alert("Error: " + response.message);
                    }
                },
                error: function(data) {
                    console.log("[ERROR] Load error", data);
                    alert('Error loading program.')
                }
            });

        }
    }

    return base;
}
