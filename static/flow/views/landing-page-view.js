//
// A view representing a main landing page
// which can display "My Programs", "Recording Now" data
// and "Previously Recorded" data
//
var LandingPageView = function(options) {

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

    var titlebar  = jQuery('<span>', {class:'titlebar noSelect', text:"Dataflow"} );
        
    titlebar.appendTo(topbar);    

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
    // Build the left menu
    //
    var menuandcontentholder  = jQuery('<div>', {class:'menuandcontentholder'} );
    
    menuandcontentholder.appendTo(maincontentbox);   

    //resize div
    base.resizemenuandcontentholder = function() {
        var contentheight = menutopbuttonholder.height();
        contentheight = contentheight + $("#landing-page-programs-diagrammenu").height();
        contentheight = contentheight + $("#landing-page-recordeddatasets-diagrammenu").height();
        var windowheight = window.innerHeight - 80;//$(window).height() - 90;
        var newheight = contentheight;
        if(windowheight > contentheight)
            newheight = windowheight;
        
        menuandcontentholder.height(newheight);
    }
        
    
    var menuholder  = jQuery('<div>', {class:'menuholder'} );
    
    menuholder.appendTo(menuandcontentholder);    
    
    var menutopbuttonholder  = jQuery('<div>', {class:'menutopbuttonholder', id: 'landing-page-menutopbuttonholder'} );
    
    menutopbuttonholder.appendTo(menuholder);    
    
    var menufilesbutton  = jQuery('<div>', {class:'menutopbuttoninactive menudarkgray noSelect', text:"my stuff"} );
    menufilesbutton.appendTo(menutopbuttonholder);    
    var menublocksbutton  = jQuery('<button>', {class:'menutopbutton menumediumgray noSelect', text:"editor"} );
    menublocksbutton.appendTo(menutopbuttonholder);
    menublocksbutton.click( function(e) {
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
    var livedataholder  = jQuery('<div>', {class:'liveDataHolder'} );
    livedataholder.appendTo(menuandcontentholder);    
    var livedatatitlebar  = jQuery('<div>', {class:'liveDataTitleBar', text:"currently running"} );
    livedatatitlebar.appendTo(livedataholder);       
    
    
    //
    // programs
    //
    var programsContent = $('<div>');
    var myprogramsdiv       = jQuery('<div>', { id: 'landing-page-my-programs-view'} );
                                                
    myprogramsdiv.appendTo(programsContent);                                                    
    var myPrograms = LandingPageMyProgramsView({id: 'landing-page-my-programs-view'});    

    var programsheader = createLandingPageMenuSection("programs", programsContent);
    programsheader.appendTo(menuholder);    
      
    //
    // new program
    //
    var newprogramheader = createLandingPageNewProgramMenuEntry();
    newprogramheader.prependTo(programsContent);   

    
    //
    // data
    //
    
    var dataContent = $('<div>');
    var mydatadiv       = jQuery('<div>', { id: 'landing-page-dataset-view'} );
                                                    
    mydatadiv.appendTo(dataContent);                                                    
    var myDatasets = LandingPageDataSetView({id: 'landing-page-dataset-view', livedataholder: livedataholder});    

    var dataheader = createLandingPageMenuSection("recorded datasets", dataContent);
    dataheader.appendTo(menuholder);    

    
/*
//UNCOMMENT THIS WHEN SHARE IS READY
    //
    // share
    //
    var shareContent = $('<div>');
    //deviceContent.append(numeric);
    //deviceContent.append(plot);
    var shareheader = createLandingPageMenuSection("share", shareContent);
    shareheader.appendTo(menuholder);    

    maincontentbox.appendTo(content);    
*/
    
    base.show = function() {
        console.log("[DEBUG] LandingPageView show()");
        jQuery('#'+base.getDivId()).show();
        myPrograms.show();
        myDatasets.show();
    }

    return base;
}
    //
    // create the landing page menu section for new program
    //
    var createLandingPageNewProgramMenuSection = function(content) {
        var div = $('<div>', {class: 'diagramMenu'});
        var header = $('<div>', {class: 'diagramMenuHeader menuwhite'} );
        var title = $('<div>', {class: 'newProgramMenuTitle noSelect'} ).text("new program");
        var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-plus', css:{color:'2D758C'}} );
        
        header.click( function(e) {
            var editor = getTopLevelView('program-editor-view');
            editor.loadProgram();
        });
        div.append(header);
        header.append(title); 
        header.append(chevron); 
        div.append(content);

        return div;
    }
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

    $( window ).resize(function() {
        //resize the landing page view
        var lpv = getTopLevelView('landing-page-view');
        lpv.resizemenuandcontentholder();
    });
