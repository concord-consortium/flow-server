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

    var titlebar  = jQuery('<span>', {class:'titlebar titlebarLink noSelect', text:"Dataflow"} );
    titlebar.click( function(e) {
        showTopLevelView('landing-page-view');
    });
    
    titlebar.appendTo(topbar);
    
    //input field to enter program name
    var programNameField = jQuery('<input>', {  
                                            id: 'program-editor-filename',
                                            type: 'text',
                                            class: 'programName'
    });
    programNameField.keyup( function() {
        var filename = jQuery('#program-editor-filename').val();
        filename = Util.filterInvalidCharacters(filename);
        jQuery('#program-editor-filename').val(filename);
    });
    programNameField.focusout( function() {
        var filename = jQuery('#program-editor-filename').val();
        filename = Util.filterWhiteSpaceCharacters(filename);
        jQuery('#program-editor-filename').val(filename);
    });
    programNameField.appendTo(topbar);            

    //program save button
    var saveButton = $('<button>', {class: 'topBarIcon glyphicon glyphicon-floppy-disk noSelect', 'aria-hidden': 'true'}).appendTo(topbar);
    //
    // handle save button click event
    //
    saveButton.click( function() {
                           
        var displayedFilename = jQuery('#program-editor-filename').val();
        if(displayedFilename == null || displayedFilename == "") {
            alert("Please enter a valid program name.");
            return;
        }        
        var filename = base.getProgramName();
        var programSpec = base.getProgramSpec();
        programSpec.archived = false;
        programSpec.displayedName = displayedFilename;
        programSpec.name = filename;                
        var programStr = JSON.stringify(programSpec);
        console.log("Saving:", programStr);
        var metadata = {};
        metadata.archived = false;
        metadata.displayedName = displayedFilename;
        metadata.name = filename;
        var metadataStr = JSON.stringify(metadata);
        //
        // Call API to save program.
        //
        var url = '/ext/flow/save_program'
        var data = {    filename:   filename,
                        metadata:   metadataStr,
                        content:    programStr,
                        csrf_token: g_csrfToken };

        $.ajax({
            url:        url,
            method:     'POST',
            data:       data,
            success:    function(data) {
                var response = JSON.parse(data);

                console.log(
                    "[DEBUG] Save program response", 
                    response);

                if(response.success) {
                    alert("Program saved");
                } else {
                    alert("Error: " + response.message);
                }
            },
            error: function(data) {
                console.log("[ERROR] Save error", data);
                alert('Error saving program.')
            },
        });

    });
    
     var deviceHolder  = jQuery('<span>', {class:'deviceHolder'} );
     var deviceStatus  = jQuery('<span>', {id: 'program-editor-recordingstatus', class:'deviceStatus noSelect', text:"Connected to "} );
     deviceStatus.appendTo(deviceHolder);            
     var deviceMenuHolder  = jQuery('<span>', {class:'deviceMenuHolder'} );
     deviceMenuHolder.appendTo(deviceHolder);     
     var deviceSelect = $('<select />', {id: 'program-editor-devicemenuselect', class:'deviceMenuSelect'} );
     
      //program start button
     var devicerunHolder  = jQuery('<span>', {class:'deviceRunHolder'} );
     var runProgramButton = $('<button>', { class:'deviceRunButton', html: '<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">Run Program</span>' } );

     var piSelectorPanel = PiSelectorPanel({ deviceDropDownMenu:  deviceSelect,
                                                 editor:     base,
                                                 runProgramButton:     runProgramButton                                             
                                                 } );
    runProgramButton.appendTo(devicerunHolder); 
    
    deviceSelect.appendTo(deviceMenuHolder); 
    deviceHolder.appendTo(topbar);            
    devicerunHolder.appendTo(topbar);
    //
    // Show welcome message
    //
    var welcomeMessage = jQuery('<div>', { css: {   position: 'absolute',
                                                    paddingRight: '5px',
                                                    display: 'inline-block',
                                                    fontSize: '12px',
                                                    whiteSpace: 'nowrap',
                                                    top: '40px',
                                                    right: '20px' } } );
    var welcomeText = jQuery('<span>');

    var signOut = jQuery('<a>', { href: '/ext/flow/logout' } );
    signOut.text('logout');

    if(g_user != null) {
        welcomeText.text('Welcome, ' + g_user.full_name + '!');
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
    welcomeMessage.appendTo(topbar);    
    
    
    //
    // Build the left and right menu holders
    //
    var menuandcontentholder  = jQuery('<div>', {class:'menuandcontentholder'} );
    
    menuandcontentholder.appendTo(maincontentbox);    
    
    var menuandcontentholderoverlay  = jQuery('<div>', {class:'menuandcontentholderoverlay', id: 'program-holder-overlay'} );
    
    var menuandcontentholderoverlaytext  = jQuery('<div>', {class: 'overlaydisplay', text:"program locked while running!"} );
    //var menuandcontentholderoverlayicon  = jQuery('<div>', {class: 'overlaydisplay glyphicon glyphicon-lock noSelect'} );
    menuandcontentholderoverlaytext.appendTo(menuandcontentholderoverlay); 
    //menuandcontentholderoverlayicon.appendTo(menuandcontentholderoverlay); 
    
    menuandcontentholderoverlay.appendTo(menuandcontentholder);   
    
    var menuholder  = jQuery('<div>', {class:'menuholder menuholderprogram'} );
    
    menuholder.appendTo(menuandcontentholder);       
    
    var menutopbuttonholder  = jQuery('<div>', {class:'menutopbuttonholder'} );
    
    menutopbuttonholder.appendTo(menuholder);    
    
    var menufilesbutton  = jQuery('<button>', {class:'menutopbutton menumediumgray noSelect', text:"my stuff"} );
    menufilesbutton.appendTo(menutopbuttonholder);    
    var menublocksbutton  = jQuery('<div>', {class:'menutopbuttoninactive menudarkgray noSelect', text:"editor"} );
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
    // Create zoom widget
    //
    //temporarily remove the zoom (we might need to add this back in later)
    /*
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
    */
    
    //
    // Accessors for our subcomponents.
    //
    //base.getFileManager         = function() { return fileManager; };
    base.getPiSelectorPanel     = function() { return piSelectorPanel; };
    base.getMyDataPanel         = function() { return myDataPanel; };
    base.getProgramEditorPanel  = function() { return programEditorPanel; };

    base.getProgramSpec = function() { 
        var diagram     = programEditorPanel.getDiagram();
        var diagramSpec = diagramToSpec(diagram);
        return diagramSpec;
    }
    base.getProgramName = function() { 
        return programEditorPanel.getProgramName();
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
    
    var programloaded = false;
    //
    // have we already loaded a program, set up the editor view
    //
    base.programLoaded = function() {return programloaded;}
    
    //
    // Load program from spec stored in dataset metadata
    //
    base.loadProgramFromSpec = function(params) {
        // console.log("[DEBUG] ProgramEditorView loadProgramFromSpec()", params);
        programloaded = true;
        
        var programSpec = params.programdata;
        var filename    = programSpec.name;
        var displayedName    = programSpec.displayedName;
        
        var nameWidget      = jQuery('#program-editor-filename');

        nameWidget.val(displayedName);
        
        //piSelectorPanel.loadPiList(); 
        piSelectorPanel.exitRunProgramState();
        piSelectorPanel.resetPiSelectionState();

        //
        // Display editor
        //
        showTopLevelView('program-editor-view');

        
        programEditorPanel.loadProgram(programSpec);
        
        
    }

    //
    // Load program from server
    //
    base.loadProgram = function(params) {
        programloaded = true;
        // console.log("[DEBUG] ProgramEditorView loadProgram()", params);

        var nameWidget      = jQuery('#program-editor-filename');

        nameWidget.val('');
        
        piSelectorPanel.setProgramControlsToNeutral();
        piSelectorPanel.loadPiList(true);
        piSelectorPanel.exitRunProgramState();
        piSelectorPanel.resetPiSelectionState();
        
        //
        // If no program to load, create a new program
        //
        if(!params) {
            programEditorPanel.loadProgram();
            showTopLevelView('program-editor-view');
            return;
        }

        if(params && params.filename) {
            var hasFolderStructure = params.folderstructure;
            var filename    = params.filename;
            var displayedName    = params.displayedName;
            var url = '/ext/flow/load_program'
            var serverfilename = filename;
            if(hasFolderStructure)
                serverfilename = serverfilename + "/program";
            var data = {    filename:   serverfilename,
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
                        nameWidget.val(displayedName);
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
