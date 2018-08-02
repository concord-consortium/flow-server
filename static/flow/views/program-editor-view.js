//
// A program editor view.
// Edit dataflow programs and select RPi to run them on.
//
var ProgramEditorView = function(options) {
    //
    // Create the main content boxes and top bar
    //
    var base = BaseView(options);

    var content = $('#'+base.getDivId());

    var mainContentBox  = $('<div>', {class:'main-content-box'} );

    mainContentBox.appendTo(content);

    var topBar  = $('<div>', {id: "editor-topbar", class:'topbar'} );

    topBar.appendTo(mainContentBox);

    //
    // Title and icon
    //
    var titleBar  = $('<div>', {class:'topbar-title topbar-title-link noSelect'} );

    var titleBarIcon = $('<img class="topbar-icon">');
    titleBarIcon.attr('src', "flow-server/static/flow/images/icon-arrow-left.png");
    titleBarIcon.appendTo(titleBar);

    var titleBarText  = $('<span>', {class:'topbar-text noSelect', text:"Editor"} );
    titleBarText.appendTo(titleBar);
    titleBar.click( function(e) {
        showTopLevelView('landing-page-view');
    });

    titleBar.appendTo(topBar);

    //
    // Program save
    //
    var saveBar  = $('<div>', {class: 'topbar-save noSelect'} );
    var saveBarBox  = $('<div>', {class: 'topbar-underline-box noSelect'} );
    saveBarBox.appendTo(saveBar);
    var saveBarStatus  = $('<div>', {id: 'save-program-status', class: 'topbar-save-program-status noSelect'} );
    saveBarStatus.appendTo(saveBar);

    // Input field to enter program name
    var programNameField = $('<input>', {
                                            id: 'program-editor-filename',
                                            type: 'text',
                                            class: 'topbar-save-program-name'
    });
    programNameField.keyup( function() {
        var filename = $('#program-editor-filename').val();
        filename = Util.filterInvalidCharacters(filename);
        $('#program-editor-filename').val(filename);
    });
    programNameField.focusout( function() {
        var filename = $('#program-editor-filename').val();
        filename = Util.filterWhiteSpaceCharacters(filename);
        $('#program-editor-filename').val(filename);
        programEditorPanel.autoSaveProgram();

    });
    programNameField.appendTo(saveBarBox);

    //
    // Save program to server
    //
    this.saveProgram = function(completionCallback) {
        var displayedFilename = $('#program-editor-filename').val();
        if (displayedFilename == null || displayedFilename == "") {
            modalAlert({
                title: 'Invalid Name',
                message: "Please enter a valid program name.",
                nextFunc: function() {
                }});
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

                if (response.success) {
                    if (typeof completionCallback === "function") {
                        completionCallback(true);
                    }
                } else {
                    if (typeof completionCallback === "function") {
                        completionCallback(false);
                    }
                }
            },
            error: function(data) {
                console.log("[ERROR] Save error", data);
                if (typeof completionCallback === "function") {
                    completionCallback(false);
                }
            },
        });

    }
    saveBar.appendTo(topBar);

    //
    // Device select
    //
    var deviceBar  = $('<div>', {class:'topbar-device-select noSelect'} );

    var menuDiv = $('<div>', {class: 'dropdown topbar-dropdown'}).appendTo(deviceBar);
    var menuInnerDiv = $('<div>', {
        'class': 'dropdown-toggle',
        'id': 'topbar-menu-select',
        'data-toggle': 'dropdown',
        'aria-expanded': 'true',
    }).appendTo(menuDiv);

    var deviceBarBox  = $('<div>', {class:'topbar-underline-box noSelect'} );
    var deviceBarButton  = $('<div>', {class:'topbar-device-select-button noSelect'} );
    deviceBarBox.appendTo(menuInnerDiv);
    deviceBarButton.appendTo(deviceBarBox);

    var deviceBarText  = $('<span>', {class:'topbar-device-select-text noSelect', text:"select a device"} );
    deviceBarText.appendTo(deviceBarButton);
    var deviceBarIcon = $('<img class="topbar-device-select-arrow">');
    deviceBarIcon.attr('src', "flow-server/static/flow/images/icon-arrow-right.png");
    deviceBarIcon.appendTo(deviceBarButton);
    deviceBar.appendTo(topBar);
    //
    // Add menu
    //
    var menuData = createMenuData();
    menuData.add('none', this.renameBlock, {name: "none"});
    var dropDownList = createDropDownList({menuData: menuData}).appendTo(menuDiv);

    // Program start, stop, view
    var deviceRunHolder  = $('<div>', {class:'topbar-device-control'} );
    var runProgramButton = $('<button>', {   html: 'run' , class: 'topbar-run-button noSelect'} );
    runProgramButton.appendTo(deviceRunHolder);
    var viewDataButton = $('<button>', {   html: 'view data' , class: 'topbar-run-button topbar-view-button noSelect'} );
    viewDataButton.appendTo(deviceRunHolder);

    var piSelectorPanel = PiSelectorPanel({ deviceDropDownList:  dropDownList,
                                            deviceSelectionContainer:  deviceBar,
                                            deviceSelectedText:  deviceBarText,
                                             editor:     base,
                                             runProgramButton:     runProgramButton,
                                             viewDataButton:     viewDataButton
                                             } );

    deviceRunHolder.appendTo(topBar);

    //
    // Show welcome message
    //
    var welcomeMessage  = $('<div>', {class:'topbar-login noSelect'} );
    var welcomeText = $('<span>', {class:'topbar-text topbar-login-text noSelect'});
    var signOut = $('<a>', { href: '/ext/flow/logout', class: 'topbar-text topbar-login-text noSelect' } );
    signOut.text('logout');
    if (g_user != null) {
        welcomeText.text('Welcome, ' + g_user.full_name + '!');
        welcomeMessage.append(welcomeText);
        welcomeMessage.append($('<span>').text(' '));
        welcomeMessage.append(signOut);
        var spacing = $('<span>', { css: {
                                    paddingRight: '5px'} } );
        spacing.text(' ');
        welcomeMessage.append(spacing);

    } else {
        welcomeText.text('You are not logged in.');
        welcomeMessage.append(welcomeText);
    }
    if (g_user != null && g_user.isAdmin) {
        var adminButton = $('<button>', {   html: 'Admin' , class: 'dataflow-button'} );
        adminButton.click(function(e) {
            showTopLevelView('admin-view');
        });
        adminButton.appendTo(welcomeMessage);
    }
    welcomeMessage.appendTo(topBar);


    //
    // Build the left menu holder
    //
    var menuAndContentHolder  = $('<div>', {class:'menu-and-content-holder menu-and-content-holder-program'} );

    menuAndContentHolder.appendTo(mainContentBox);

    var menuAndContentHolderOverlay  = $('<div>', {class:'menu-and-content-holder-overlay', id: 'program-holder-overlay'} );

    var menuAndContentHolderOverlayText  = $('<div>', {class: 'overlay-lock', text:"program locked while running!"} );
    menuAndContentHolderOverlayText.appendTo(menuAndContentHolderOverlay);

    menuAndContentHolderOverlay.appendTo(menuAndContentHolder);

    var menuHolder  = $('<div>', {id: "editor-menu", class:'menu-holder menu-holder-program container-light-gray'} );

    menuHolder.appendTo(menuAndContentHolder);

    var menuTopButtonHolder  = $('<div>', {class:'menu-top-button-holder'} );
    menuTopButtonHolder.appendTo(menuHolder);

    var menuSeparator = $('<div>', {class:'menu-separator'} );
    menuSeparator.appendTo(menuHolder);

    var menuFilesButton  = $('<button>', {class:'menu-top-button container-dark-gray  noSelect', text:"My Stuff"} );
    menuFilesButton.appendTo(menuTopButtonHolder);
    var menuBlocksButton  = $('<div>', {class:'menu-top-button-inactive container-blue-select noSelect', text:"Editor"} );
    menuBlocksButton.appendTo(menuTopButtonHolder);
    menuFilesButton.click( function(e) {
        showTopLevelView('landing-page-view');
    });

    //
    // Main editor panel
    //
    var programEditorDiv    = $('<div>');
    var programEditorPanel  = ProgramEditorPanel(
                                {container: programEditorDiv,
                                menuandcontentdiv: menuAndContentHolder,
                                menuholderdiv: menuHolder} );
    menuAndContentHolder.append(programEditorDiv);

    //
    // Accessors for our subcomponents.
    //
    base.getPiSelectorPanel     = function() { return piSelectorPanel; };
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

        var nameWidget      = $('#program-editor-filename');

        nameWidget.val('');

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

        var nameWidget      = $('#program-editor-filename');

        nameWidget.val(displayedName);

        piSelectorPanel.disableLoadPiListTimer();

        piSelectorPanel.resetStateOnProgramLoad();
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

        var nameWidget      = $('#program-editor-filename');

        nameWidget.val('');

        piSelectorPanel.disableLoadPiListTimer();

        piSelectorPanel.setProgramControlsToNeutral();
        piSelectorPanel.loadPiList(true);
        piSelectorPanel.resetStateOnProgramLoad();
        piSelectorPanel.resetPiSelectionState();

        //
        // If no program to load, create a new program
        //
        if (!params.filename) {
            programEditorPanel.loadProgram(null, params.displayedName);
            showTopLevelView('program-editor-view');
            return;
        }

        if (params && params.filename) {
            var hasFolderStructure = params.folderstructure;
            var filename    = params.filename;
            var displayedName    = params.displayedName;
            var url = '/ext/flow/load_program'
            var serverfilename = filename;
            if (hasFolderStructure) {
                serverfilename = serverfilename + "/program";
            }
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

                    if (response.success) {
                        var content = response.content;
                        var programSpec = JSON.parse(content);
                        nameWidget.val(displayedName);
                        programEditorPanel.loadProgram(programSpec);

                    } else {
                        modalAlert({
                            title: "Program Load Error",
                            message: "Error: " + response.message,
                            nextFunc: function() {
                            }
                        });
                    }
                },
                error: function(data) {
                    modalAlert({
                        title: "Program Load Error",
                        message: "Error loading program.",
                        nextFunc: function() {
                        }
                    });
                    console.log("[ERROR] Load error", data);
                }
            });
        }
    }

    return base;
}
