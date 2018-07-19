//
// A view representing a main landing page
// which can display saved programs,
// previously recorded datasets, 
// an activity feed showing currently running programs
// and associated live datasets
//
var LandingPageView = function(options) {

    //
    // create the main content boxes and top bar
    //
    var base = BaseView(options);
   
    var content = jQuery('#'+base.getDivId());     
    
    var mainContentBox  = jQuery('<div>', {class:'main-content-box'} );
               
    mainContentBox.appendTo(content);    

    var topBar  = jQuery('<div>', {id:'landing-page-topbar', class:'topbar'} );
    
    topBar.appendTo(mainContentBox);       
    
    //icon and title in upper left
    var titleBar  = jQuery('<div>', {class:'topbar-title noSelect'} );    
    
    //
    // title and icon
    //
    var titleBarIcon = $('<img class="topbar-icon">'); 
    titleBarIcon.attr('src', "flow-server/static/flow/images/icon-home.png");
    titleBarIcon.appendTo(titleBar);    
        
    var titleBarText  = jQuery('<span>', {class:'topbar-text noSelect', text:"Dataflow"} );        
    titleBarText.appendTo(titleBar);  

    titleBar.appendTo(topBar);       

    //
    // Show welcome message
    //
    var welcomeMessage  = jQuery('<div>', {class:'topbar-login noSelect'} );
    var welcomeText = jQuery('<span>', {class:'topbar-text topbar-login-text noSelect'});
    var signOut = jQuery('<a>', { href: '/ext/flow/logout', class: 'topbar-text topbar-login-text noSelect' } );
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
    if(g_user != null && g_user.isAdmin) {
        var adminButton = $('<button>', {   html: 'Admin' , class: 'dataflow-button'} );
        adminButton.click(function(e) {
            showTopLevelView('admin-view');
        });
        adminButton.appendTo(welcomeMessage);
    }
    welcomeMessage.appendTo(topBar);   

  
    //
    // Build the left menu
    //
    var menuAndContentHolder  = jQuery('<div>', {class:'menu-and-content-holder'} );
    
    menuAndContentHolder.appendTo(mainContentBox);   
    
    //load dataset-view
    base.loadDataSet = function(dataSet) {
         var success = dataSetView.loadDataSet(dataSet);
         if(success){
            showTopLevelView('landing-page-view');
            dataSetView.show();
            liveDataHolder.hide();             
         }
    }

    //resize div
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
        if(usableHeight > contentHeight){
            newHeight = usableHeight;
        }
        
        menuAndContentHolder.height(newHeight);
    }
        
    var menuHolder  = jQuery('<div>', {class:'menu-holder container-light-gray'} );
    menuHolder.appendTo(menuAndContentHolder);    
    
    var menuTopButtonHolder  = jQuery('<div>', {class:'menu-top-button-holder', id: 'landing-page-menutopbuttonholder'} );
    menuTopButtonHolder.appendTo(menuHolder);    
    
    var menuSeparator = jQuery('<div>', {class:'menu-separator'} );
    menuSeparator.appendTo(menuHolder);        
    
    var getNewProgramName = function() {
        modalPrompt({
            title: 'Name your program',
            prompt: 'New Name',
            default: 'Untitled Program',
            resultFunc: function(newName) {
                var editor = getTopLevelView('program-editor-view');
                editor.loadProgram({displayedName: newName});
            }
        });        
    }    
    
    var menuFilesButton  = jQuery('<div>', {class:'menu-top-button-inactive container-blue-select noSelect', text:"My Stuff"} );
    menuFilesButton.appendTo(menuTopButtonHolder);    
    var menuBlocksButton  = jQuery('<button>', {class:'menu-top-button container-dark-gray noSelect', text:"Editor"} );
    menuBlocksButton.appendTo(menuTopButtonHolder);
    menuBlocksButton.click( function(e) {
        var editor = getTopLevelView('program-editor-view');
        if(editor.programLoaded() ){
            showTopLevelView('program-editor-view');
        }
        else{
            getNewProgramName();
        }
    });
    
    //
    // live data
    //
    var liveDataHolder  = jQuery('<div>', {class:'live-data-holder'} );
    liveDataHolder.appendTo(menuAndContentHolder);    
    var liveDataTitleBar  = jQuery('<div>', {class:'live-data-title-bar', text:"currently running"} );
    liveDataTitleBar.appendTo(liveDataHolder);       
    
    //
    // dataview
    //
    var dataSetViewDiv  = jQuery('<div>', {id: 'data-set-view', class:'dataset-view'} );
    dataSetViewDiv.appendTo(menuAndContentHolder);    
    
    var dataSetView = DataSetView({id: 'data-set-view', liveDataHolder: liveDataHolder});
    
    //
    // programs
    //
    var programsContent = $('<div>');
    var myProgramsDiv       = jQuery('<div>', { id: 'landing-page-my-programs-view'} );
                                                
    myProgramsDiv.appendTo(programsContent);                                                    
    var myPrograms = LandingPageMyProgramsView({id: 'landing-page-my-programs-view'});   

    //
    // create generic landing page menu sections with collapsable content
    //
    var createLandingPageMenuSection = function(name, content) {
        str = name.replace(/\s/g, '');
        str = str.toLowerCase();
        var id = "landing-page-" + str + "-menu-section";
        div = $('<div>', {class: 'menu-section', id: id});
        var header = $('<div>', {class: 'menu-header container-dark-gray'} );
        var title = $('<div>', {class: 'menu-title noSelect'} ).text(name);
        var chevron = $('<div>', {class: 'diagram-menu-chevron noSelect'} );
        var img = $('<img>');
        img.attr('src', "flow-server/static/flow/images/icon-arrow.png");
        img.appendTo(chevron);            

        header.click( function(e) {
            if(content.is(":visible")) {
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
    // create the landing page menu entry for new program
    //
    var createLandingPageNewProgramMenuEntry = function() {
        
        var menuentry = $('<div>', {class: 'landingPageMenuEntry'} );
        var title = $('<div>', {class: 'landingPageMenuTextContent noSelect'} ).text("New Program");
        var chevron = $('<div>', {class: 'diagram-menu-chevron'} );
        chevron.prepend('<img src="flow-server/static/flow/images/icon-plus.png">')

        menuentry.click( function(e) {
            getNewProgramName();
        });

        menuentry.append(title); 
        menuentry.append(chevron); 

        return menuentry;
    }
    //
    // new program
    //    
    var newProgramHeader = createLandingPageNewProgramMenuEntry();
    newProgramHeader.prependTo(programsContent);  

    var menuSeparator = jQuery('<div>', {class:'menu-separator'} );
    menuSeparator.appendTo(menuHolder);    

    
    //
    // data
    //
    var dataContent = $('<div>');
    var myDataDiv       = jQuery('<div>', { id: 'landing-page-dataset-view'} );
                                                    
    myDataDiv.appendTo(dataContent);   
    var myDatasets = LandingPageDataSetView({id: 'landing-page-dataset-view', liveDataHolder: liveDataHolder, dataSetView: dataSetView});

    var dataHeader = createLandingPageMenuSection("Recorded Datasets", dataContent);
    dataHeader.appendTo(menuHolder);    

    
/*
//UNCOMMENT THIS WHEN SHARE IS READY
    //
    // share
    //
    var shareContent = $('<div>');
    //deviceContent.append(numeric);
    //deviceContent.append(plot);
    var shareheader = createLandingPageMenuSection("share", shareContent);
    shareheader.appendTo(menuHolder);    

    mainContentBox.appendTo(content);    
*/
    
    base.show = function() {
        console.log("[DEBUG] LandingPageView show()");
        jQuery('#'+base.getDivId()).show();
        myPrograms.show();
        myDatasets.show();
    }

    return base;
}

    $( window ).resize(function() {
        //resize the landing page view
        var lpv = getTopLevelView('landing-page-view');
        lpv.resizeMenuAndContentHolder();
    });
