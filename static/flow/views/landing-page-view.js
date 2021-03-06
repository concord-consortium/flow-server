//
// A view representing a main landing page
// which can display saved programs,
// previously recorded datasets,
// an activity feed showing currently running programs
// and associated live datasets
//
var LandingPageView = function(options) {

    //
    // Create the main content boxes and top bar
    //
    var base = BaseView(options);

    var content = $("#" + base.getDivId());

    var mainContentBox  = $("<div>", {class: "main-content-box"} );

    mainContentBox.appendTo(content);

    var topBar  = $("<div>", {id: "landing-page-topbar", class: "topbar"} );

    topBar.appendTo(mainContentBox);

    // Icon and title in upper left
    var titleBar  = $("<div>", {class: "topbar-title noSelect"} );

    //
    // Title and icon
    //
    var titleBarIcon = $("<img class='topbar-icon'>");
    titleBarIcon.attr("src", "flow-server/static/flow/images/icon-home.png");
    titleBarIcon.appendTo(titleBar);

    var titleBarText  = $("<span>", {class: "topbar-text noSelect", text: "Dataflow"} );
    titleBarText.appendTo(titleBar);

    titleBar.appendTo(topBar);

    //
    // Show welcome message
    //
    var welcomeMessage  = $("<div>", {class: "topbar-login noSelect"} );
    var welcomeText = $("<span>", {class: "topbar-text topbar-login-text noSelect"});
    var signOut = $("<a>", { href: "/ext/flow/logout", class: "topbar-text topbar-login-text noSelect" } );
    signOut.text("logout");
    if (g_user != null) {
        welcomeText.text("Welcome, " + g_user.full_name + "!");
        welcomeMessage.append(welcomeText);
        welcomeMessage.append($("<span>").text(" "));
        welcomeMessage.append(signOut);
        var spacing = $("<span>", { css: {
                                    paddingRight: "5px"} } );
        spacing.text(" ");
        welcomeMessage.append(spacing);

    } else {
        welcomeText.text("You are not logged in.");
        welcomeMessage.append(welcomeText);
    }
    if (g_user != null && g_user.isAdmin) {
        var adminButton = $("<button>", { html: "Admin" , class: "dataflow-button"} );
        adminButton.click(function(e) {
            showTopLevelView("admin-view");
        });
        adminButton.appendTo(welcomeMessage);
    }
    welcomeMessage.appendTo(topBar);


    //
    // Build the left menu
    //
    var menuAndContentHolder  = $("<div>", {class: "menu-and-content-holder"} );

    menuAndContentHolder.appendTo(mainContentBox);

    // Load dataset-view
    base.loadDataSet = function(dataSet) {
         var success = dataSetView.loadDataSet(dataSet);
         if (success) {
            showTopLevelView("landing-page-view");
            dataSetView.show();
            liveDataHolder.hide();
         }
    }

    // Resize div
    base.resizeMenuAndContentHolder = function() {
        const paddingHeight = 70; //20 for dividers, 50 for usability
        var contentHeight = menuTopButtonHolder.height();
        contentHeight = contentHeight + $("#landing-page-programs-menu-section").height();
        contentHeight = contentHeight + $("#landing-page-recordeddatasets-menu-section").height();
        contentHeight = contentHeight + paddingHeight;
        var windowHeight = window.innerHeight;
        topbarHeight = $("#landing-page-topbar").outerHeight();
        usableHeight = windowHeight - topbarHeight;
        var newHeight = contentHeight;
        if (usableHeight > contentHeight) {
            newHeight = usableHeight;
        }

        menuAndContentHolder.height(newHeight);
    }

    var menuHolder = $("<div>", {class: "menu-holder container-light-gray"} );
    menuHolder.appendTo(menuAndContentHolder);

    var menuTopButtonHolder = $("<div>", {class: "menu-top-button-holder", id: "landing-page-menutopbuttonholder"} );
    menuTopButtonHolder.appendTo(menuHolder);

    var menuSeparator = $("<div>", {class: "menu-separator"} );
    menuSeparator.appendTo(menuHolder);

    var getNewProgramName = function() {
        modalPrompt({
            title: "Name your program",
            prompt: "New Name",
            default: "Untitled Program",
            resultFunc: function(newName) {
                var editor = getTopLevelView("program-editor-view");
                editor.loadProgram({displayedName: newName});
            }
        });
    }

    var menuFilesButton = $("<div>", {class: "menu-top-button-inactive container-blue-select noSelect", text: "My Stuff"} );
    menuFilesButton.appendTo(menuTopButtonHolder);
    var menuBlocksButton = $("<button>", {class: "menu-top-button container-dark-gray noSelect", text: "Editor"} );
    menuBlocksButton.appendTo(menuTopButtonHolder);
    menuBlocksButton.click( function(e) {
        var editor = getTopLevelView("program-editor-view");
        if (editor.programLoaded() ) {
            showTopLevelView("program-editor-view");
        } else {
            getNewProgramName();
        }
    });

    //
    // Live data
    //
    var liveDataHolder = $("<div>", {class: "live-data-holder"} );
    liveDataHolder.appendTo(menuAndContentHolder);
    var liveDataTitleBar = $("<div>", {class: "live-data-title-bar", text: "currently running"} );
    liveDataTitleBar.appendTo(liveDataHolder);

    //
    // Dataview
    //
    var dataSetViewDiv = $("<div>", {id: "data-set-view", class: "dataset-view"} );
    dataSetViewDiv.appendTo(menuAndContentHolder);

    var dataSetView = DataSetView({id: "data-set-view", liveDataHolder: liveDataHolder});

    //
    // Programs
    //
    var programsContent = $("<div>");
    var myProgramsDiv = $("<div>", { id: "landing-page-my-programs-view"} );

    myProgramsDiv.appendTo(programsContent);
    var myPrograms = LandingPageMyProgramsView({id: "landing-page-my-programs-view"});

    //
    // Create generic landing page menu sections with collapsable content
    //
    var createLandingPageMenuSection = function(name, content) {
        var str = name.replace(/\s/g, "");
        str = str.toLowerCase();
        var id = "landing-page-" + str + "-menu-section";
        var div = $("<div>", {class: "menu-section", id: id});
        var header = $("<div>", {class: "menu-header container-dark-gray"} );
        var title = $("<div>", {class: "menu-title noSelect"} ).text(name);
        var chevron = $("<div>", {class: "diagram-menu-chevron noSelect"} );
        var img = $("<img>");
        img.attr("src", "flow-server/static/flow/images/icon-arrow.png");
        img.appendTo(chevron);

        header.click( function(e) {
            if (content.is(":visible")) {
                img.attr("src","flow-server/static/flow/images/icon-arrow-right.png");
                content.hide();
            } else {
                img.attr("src","flow-server/static/flow/images/icon-arrow.png");
                content.show();
            }
        });

        div.append(header);
        header.append(title);
        header.append(chevron);
        div.append(content);

        return div;
    }


    var programsHeader = createLandingPageMenuSection("Programs", programsContent);
    programsHeader.appendTo(menuHolder);

    //
    // Create the landing page menu entry for new program
    //
    var createLandingPageNewProgramMenuEntry = function() {

        var menuentry = $("<div>", {class: "landing-page-menu-entry"} );
        var title = $("<div>", {class: "landing-page-menu-entry-text noSelect"} ).text("New Program");
        var chevron = $("<div>", {class: "diagram-menu-chevron"} );
        chevron.prepend("<img src='flow-server/static/flow/images/icon-plus.png'>")

        menuentry.click( function(e) {
            getNewProgramName();
        });

        menuentry.append(title);
        menuentry.append(chevron);

        return menuentry;
    }
    //
    // New program
    //
    var newProgramHeader = createLandingPageNewProgramMenuEntry();
    newProgramHeader.prependTo(programsContent);

    var menuSeparator = $("<div>", {class: "menu-separator"} );
    menuSeparator.appendTo(menuHolder);


    //
    // Data
    //
    var dataContent = $("<div>");
    var myDataDiv = $("<div>", { id: "landing-page-dataset-view"} );

    myDataDiv.appendTo(dataContent);
    var myDatasets = LandingPageDataSetView({id: "landing-page-dataset-view", liveDataHolder: liveDataHolder, dataSetView: dataSetView});

    var dataHeader = createLandingPageMenuSection("Recorded Datasets", dataContent);
    dataHeader.appendTo(menuHolder);

    base.show = function() {
        console.log("[DEBUG] LandingPageView show()");
        $("#" + base.getDivId()).show();
        myPrograms.show();
        myDatasets.show();
    }

    return base;
}

    $( window ).resize(function() {
        //resize the landing page view
        var lpv = getTopLevelView("landing-page-view");
        lpv.resizeMenuAndContentHolder();
    });
