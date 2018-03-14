//
// A program editor view.
// Edit dataflow programs and select RPi to run them on.
//
var ProgramEditorView = function(options) {
    //
    // create the main content boxes and top bar
    //
    var base = BaseView(options);

    var content = jQuery('#'+base.getDivId());
    
    var outlinebox  = jQuery('<div>', {class:'outlinebox'} );
    
    outlinebox.appendTo(content);
    
    var maincontentbox  = jQuery('<div>', {class:'maincontentbox'} );
               
    maincontentbox.appendTo(outlinebox);        
    
    var topbar  = jQuery('<div>', {class:'topbar'} );
    
    topbar.appendTo(maincontentbox);        

    var titlebar  = jQuery('<span>', {class:'titlebar noSelect', text:"dataflow"} );
    
    titlebar.appendTo(topbar);

    //
    // Build the left and right menu holders
    //
    var menuandcontentholder  = jQuery('<div>', {class:'menuandcontentholder'} );
    
    menuandcontentholder.appendTo(maincontentbox);    
    
    
    var menuholder  = jQuery('<div>', {class:'menuholder menuholderprogram'} );
    var menurightholder  = jQuery('<div>', {class:'menurightholder'} );
    
    menuholder.appendTo(menuandcontentholder);    
    menurightholder.appendTo(menuandcontentholder);    
    
    var menutopbuttonholder  = jQuery('<div>', {class:'menutopbuttonholder'} );
    
    menutopbuttonholder.appendTo(menuholder);    
    
    var menufilesbutton  = jQuery('<button>', {class:'menutopbutton menumediumgray noSelect', text:"files"} );
    menufilesbutton.appendTo(menutopbuttonholder);    
    var menublocksbutton  = jQuery('<div>', {class:'menutopbuttoninactive menudarkgray noSelect', text:"blocks"} );
    menublocksbutton.appendTo(menutopbuttonholder);
    menufilesbutton.click( function(e) {
        showTopLevelView('landing-page-view');
    });
    
    //
    // Main editor panel
    // 
    var programEditorDiv    = $('<div>');
    var programEditorPanel  = ProgramEditorPanel(
                                {container: programEditorDiv,
                                menuandcontentdiv: menuandcontentholder,
                                menuholderdiv: menuholder} );
    menuandcontentholder.append(programEditorDiv);

    //
    // Create file manager widget
    //
    var fileManager    = ProgramEditorFileManager({ container:  menurightholder,
                                                    editor:     base    } );
    
    //
    // Create the panel for the "My Data" and "Pi Selector" components.
    //    
    var piSelectorMenuPanel = PiSelectorPanel({ container:  menurightholder,
                                                editor:     base        } );

    //
    // Create zoom widget
    //
    var zoomWidget  = jQuery('<span>', { css: {  zIndex: 100,
                                                float:'right' } });
    var zoomIn = $('<button>', {class: 'topBarIcon glyphicon glyphicon-zoom-in noSelect', 'aria-hidden': 'true'}).appendTo(zoomWidget);
    var zoomOut = $('<button>', {class: 'topBarIcon glyphicon glyphicon-zoom-out noSelect', 'aria-hidden': 'true'}).appendTo(zoomWidget);
    zoomIn.click( function() {
        programEditorPanel.zoomBlocks(.25);
    });
    zoomOut.click( function() {
        programEditorPanel.zoomBlocks(-.25);
    });
    zoomWidget.appendTo(topbar);
    
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
        // var contentWidget   = jQuery('#program-content');

        nameWidget.val('');
        // contentWidget.val('');

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
        
        piSelectorMenuPanel.loadPiList();

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
                        programEditorPanel.loadProgram(programSpec);

                        // contentWidget.val(content);
                        // contentWidget.attr("disabled", false);

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
