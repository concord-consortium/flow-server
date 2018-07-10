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
    
    var outlineBox  = jQuery('<div>', {class:'outlinebox'} );
    
    outlineBox.appendTo(content);        
    
    var mainContentBox  = jQuery('<div>', {class:'maincontentbox'} );
               
    mainContentBox.appendTo(outlineBox);    

    var topBar  = jQuery('<div>', {class:'topbar'} );
    
    topBar.appendTo(mainContentBox);        

    var titleBar  = jQuery('<span>', {class:'titlebar noSelect', text:"Dataflow"} );
        
    titleBar.appendTo(topBar);    

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
    welcomeMessage.appendTo(topBar);    
    
    //
    // Build the left menu
    //
    var menuAndContentHolder  = jQuery('<div>', {class:'menuandcontentholder'} );
    
    menuAndContentHolder.appendTo(mainContentBox);   

    //resize div
    base.resizemenuandcontentholder = function() {
        var contentheight = menuTopButtonHolder.height();
        contentheight = contentheight + $("#landing-page-programs-diagrammenu").height();
        contentheight = contentheight + $("#landing-page-recordeddatasets-diagrammenu").height();
        var windowheight = window.innerHeight - 80;//$(window).height() - 90;
        var newheight = contentheight;
        if(windowheight > contentheight)
            newheight = windowheight;
        
        menuAndContentHolder.height(newheight);
    }
        
    
    var menuHolder  = jQuery('<div>', {class:'menuholder'} );
    
    menuHolder.appendTo(menuAndContentHolder);    
    
    var menuTopButtonHolder  = jQuery('<div>', {class:'menutopbuttonholder', id: 'landing-page-menutopbuttonholder'} );
    
    menuTopButtonHolder.appendTo(menuHolder);    
    
    var menuFilesButton  = jQuery('<div>', {class:'menutopbuttoninactive menudarkgray noSelect', text:"my stuff"} );
    menuFilesButton.appendTo(menuTopButtonHolder);    
    var menuBlocksButton  = jQuery('<button>', {class:'menutopbutton menumediumgray noSelect', text:"editor"} );
    menuBlocksButton.appendTo(menuTopButtonHolder);
    menuBlocksButton.click( function(e) {
        var editor = getTopLevelView('program-editor-view');
        if(editor.programLoaded() ){
            showTopLevelView('program-editor-view');
        }
        else{
            editor.loadProgram();
        }
    });
    
    //
    // live data
    //
    var liveDataHolder  = jQuery('<div>', {class:'liveDataHolder'} );
    liveDataHolder.appendTo(menuAndContentHolder);    
    var liveDataTitleBar  = jQuery('<div>', {class:'liveDataTitleBar', text:"currently running"} );
    liveDataTitleBar.appendTo(liveDataHolder);       
    
    
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
        var id = "landing-page-" + str + "-diagrammenu";
        div = $('<div>', {class: 'diagramMenu', id: id});
        var header = $('<div>', {class: 'diagramMenuHeader concorddarkblue'} );
        var title = $('<div>', {class: 'diagramMenuTitle noSelect'} ).text(name);
        var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-chevron-down', css:{color:'ffffff'}} );

        header.click( function(e) {
            if(content.is(":visible")) {
                chevron.removeClass('glyphicon-chevron-down');
                chevron.addClass('glyphicon-chevron-right');
                content.hide();
            } else {
                chevron.removeClass('glyphicon-chevron-right');
                chevron.addClass('glyphicon-chevron-down');
                content.show();
            }
        });

        div.append(header);
        header.append(title); 
        header.append(chevron); 
        div.append(content);

        return div;
    }


    var programsHeader = createLandingPageMenuSection("programs", programsContent);
    programsHeader.appendTo(menuHolder);    
      
    //
    // create the landing page menu entry for new program
    //
    var createLandingPageNewProgramMenuEntry = function() {
        
        var menuentry = $('<div>', {class: 'landingPageMenuEntry menuwhite'} );
        var title = $('<div>', {class: 'landingPageMenuTextContent noSelect', css:{color:'2D758C'}} ).text("new program");
        var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-plus', css:{color:'2D758C'}} );
        
        menuentry.click( function(e) {
            var editor = getTopLevelView('program-editor-view');
            editor.loadProgram();
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

    
    //
    // data
    //
    var dataContent = $('<div>');
    var myDataDiv       = jQuery('<div>', { id: 'landing-page-dataset-view'} );
                                                    
    myDataDiv.appendTo(dataContent);   
    var myDatasets = LandingPageDataSetView({id: 'landing-page-dataset-view', livedataholder: liveDataHolder});

    var dataHeader = createLandingPageMenuSection("recorded datasets", dataContent);
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
        lpv.resizemenuandcontentholder();
    });
