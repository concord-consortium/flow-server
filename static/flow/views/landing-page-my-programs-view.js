//
// A view representing a main landing page
// which can display "My Programs", "Recording Now" data
// and "Previously Recorded" data
//
var LandingPageMyProgramsView = function(options) {

    var base = BaseView(options);
   

    //
    // AJAX call and handler for updating "My Programs" div.
    //
    var loadPrograms = function(div) {

        //console.log("[DEBUG] loadPrograms loading My Programs...");

        div.empty();
        //div.text("Loading My Programs...");
        addLoadingProgramsToMenu(div);
        
        var url = '/ext/flow/list_programs';
        var data = { csrf_token: g_csrfToken };

        $.ajax({
            url: url,
            method: 'POST',
            data: data,
            success: function(data) {
                var response = JSON.parse(data);

                // console.log("[DEBUG] List programs", response);

                if(response.success) {
                   
                    div.empty();
                    //div.css('width', '200px');

                    var items = response.items;
                   // var row = [];
                    for(var i = 0; i < items.length; i++) {
                        var btn = createMyProgramBtn ( items[i].name, i );

                        btn.appendTo(div);
                    }
                    //resize the landing page view
                    var lpv = getTopLevelView('landing-page-view');
                    lpv.resizemenuandcontentholder();

                } else {
                    console.log("[ERROR] Error listing programs", response);
                }
            },
            error: function(data) {
                console.log("[ERROR] List programs error", data);
            },
        });
        
    };
    
    //
    //didn't find any programs, add a menu entry letting the user know there are no programs available
    //
    this.addNoProgramsToMenu = function(div){    
        div.empty();
        var emptyButton = $('<div>', {class: 'landingPageMenuEntryNoSelect noSelect menudarkgray'} ).text("no available programs");
        div.append(emptyButton);
    }    
    //
    //loading programs, add a menu entry letting the user know we are waiting for programs to load
    //
    this.addLoadingProgramsToMenu = function(div){    
        div.empty();
        var emptyButton = $('<div>', {class: 'landingPageMenuEntryNoSelect noSelect menudarkgray'} ).text("loading programs...");
        div.append(emptyButton);
    }    
    
    //
    // create a menu item button to load a saved program
    //
    var createMyProgramBtn = function(name, index) {
        var menuentry;
        var btn;
        var filename = name;
        if(index%2 == 0){
            menuentry = $('<div>', {id:'program'+index, class: 'landingPageMenuEntry menulightgray'});
            btn = $('<button>', { text:filename, class: 'landingPageMenuTextContent menulightgray' } );
        }
        else{
            menuentry = $('<div>', {id:'program'+index, class: 'landingPageMenuEntry menudarkgray'});
            btn = $('<button>', { text:filename, class: 'landingPageMenuTextContent menudarkgray' } );
        }
        btn.click(name, function(e) {
            //console.log("[DEBUG] MyProgramBtn click", filename);
            var editor = getTopLevelView('program-editor-view');
            editor.loadProgram({filename: filename});
        });
        btn.appendTo(menuentry);
        
        //
        // Add menu
        //
        var menuData = createMenuData();
        menuData.add('Delete', this.deleteProgram, {programname: name, divid: 'program'+index});
        
        var landingPageMenuSubMenuDiv = $('<div>', {text:"", class: 'landingPageMenuSubMenu'}).appendTo(menuentry);

        var menuDiv = $('<div>', {class: 'dropdown'}).appendTo(landingPageMenuSubMenuDiv);
        
        var menuInnerDiv = $('<div>', {
            'class': 'dropdown-toggle',
            'id': 'pm_' + name,
            'data-toggle': 'dropdown',
            'aria-expanded': 'true',
        }).appendTo(menuDiv);
    
        //$('<div>', {class: 'landingPageMenuIcon glyphicon glyphicon-option-vertical noSelect', 'aria-hidden': 'true'}).appendTo(menuInnerDiv);
        $('<div>', {class: 'landingPageMenuIcon glyphicon glyphicon-align-justify noSelect', 'aria-hidden': 'true'}).appendTo(menuInnerDiv);
        
        createDropDownList({menuData: menuData}).appendTo(menuDiv);

        return menuentry;
    }
    
        
    //
    // Delete button with handler and callback
    //
    this.deleteProgram = function(e) {
    
        var filename = e.data.programname;
        var divid = e.data.divid;

        var conf = confirm("Are you sure you want to delete " + filename + "?");

        if(!conf) {
            return;
        }

        //
        // After one use of the CSRF token in a POST
        // request, it is no longer accepted.
        // How to fix this? Pass a new one back 
        // to the client and then reset the
        // g_csrfToken value here? :(
        //
        var url = '/ext/flow/delete_program'
        var data = { filename:      filename,
                     csrf_token:    g_csrfToken     };

        $.ajax({
            url:        url,
            method:     'POST',
            data:       data,
            success:    function(data) {

                var response = JSON.parse(data);

                console.log(
                    "[DEBUG] Delete program response", 
                    response);

                if(response.success) {
                    //$( '#' + divid ).remove(); //this is probably not needed
                    alert("Program deleted");
                    showTopLevelView('landing-page-view');

                } else {
                    alert("Error: " + response.message);
                }
            },
            error: function(data) {
                console.log("[ERROR] Delete error", data);
                alert('Error deleting program.')
            },
        });

    };    
    

    base.show = function() {
        var content = jQuery('#'+base.getDivId());
        loadPrograms(content);
    }

    return base;
}
