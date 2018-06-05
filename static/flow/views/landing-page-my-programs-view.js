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
                    var index = 0;
                    var items = response.items;
                    for(var i = 0; i < items.length; i++) {
                        //new style program consisting of a folder with date-time name, a program file and a metadata file
                        if(items[i].metadata && items[i].metadata.displayedName){
                            if(!items[i].metadata.archived){
                                var dateifiedName = items[i].name;
                                var tooltip = convertProgramNameToDateString(dateifiedName);
                                var btn = createMyProgramBtn ( items[i].metadata, items[i].metadata.displayedName,  items[i].name, tooltip, index );

                                btn.appendTo(div);
                                index++;
                            }
                        }
                        else{ //handle old style programs without the folder, metadata structure
                            var tooltip = "";
                            var btn = createMyProgramBtn (  null, items[i].name, items[i].name, tooltip, index );

                            btn.appendTo(div);
                            index++;
                        }
                        
  
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
    
    this.convertProgramNameToDateString = function(programName){
        //program name is formatted like this: program_20180522_164244
        //we want a date format like this: December 22, 2018 10:55 PM
        var year = programName.substring(8, 12);
        var month = programName.substring(12, 14);
        var day = programName.substring(14, 16);
        var hour = programName.substring(17, 19);
        var min = programName.substring(19, 21);
        if(month=="01")
            month="January";
        else if(month=="02")
            month="February";
        else if(month=="03")
            month="March";
        else if(month=="04")
            month="April";
        else if(month=="05")
            month="May";
        else if(month=="06")
            month="June";
        else if(month=="07")
            month="July";
        else if(month=="08")
            month="August";
        else if(month=="09")
            month="September";
        else if(month=="10")
            month="October";
        else if(month=="11")
            month="November";
        else if(month=="12")
            month="December";
        var dayNum = parseInt(day, 10);
        var hourNum = parseInt(hour, 10);
        var ampm = "AM";
        if(hourNum==0)
            hourNum=12;
        else if(hourNum==12){
            ampm = "PM";
        }
        else if(hourNum>=13){
            hourNum-=12;
            ampm = "PM";
        }
        var minNum = parseInt(min, 10);
        if(min<10)
            minNum="0" + minNum;
        
        var finalstr = month + " " + dayNum + ", " + year + " " + hourNum + ":" + minNum + " " + ampm;
        return finalstr;
    }
    
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
    var createMyProgramBtn = function(metadata, displayedName, filename, tooltip, index) {
        var menuentry;
        var btn;
        if(index%2 == 0){
            menuentry = $('<div>', {id:'program'+index, class: 'landingPageMenuEntry menulightgray'});
            btn = $('<button>', { text:displayedName, class: 'landingPageMenuTextContent menulightgray' } );
            menuTooltip = $('<span>', {text:tooltip, class: 'tooltiptext'});
            if(tooltip!="")menuTooltip.appendTo(menuentry);
        }
        else{
            menuentry = $('<div>', {id:'program'+index, class: 'landingPageMenuEntry menudarkgray'});
            btn = $('<button>', { text:displayedName, class: 'landingPageMenuTextContent menudarkgray' } );
            menuTooltip = $('<span>', {text:tooltip, class: 'tooltiptext'});
            if(tooltip!="")menuTooltip.appendTo(menuentry);            
        }
        btn.click(name, function(e) {
            //console.log("[DEBUG] MyProgramBtn click", filename);
            var folderstructure = true;
            if(!metadata)
                folderstructure = false;
            var editor = getTopLevelView('program-editor-view');
            editor.loadProgram({filename: filename, displayedName: displayedName, folderstructure:folderstructure});
        });
        btn.appendTo(menuentry);
        
        //
        // Add menu
        //
        var menuData = createMenuData();
        menuData.add('Delete', this.deleteProgram, {metadata: metadata, displayedName: displayedName, filename: filename, divid: 'program'+index});
        
        var landingPageMenuSubMenuDiv = $('<div>', {text:"", class: 'landingPageMenuSubMenu'}).appendTo(menuentry);

        var menuDiv = $('<div>', {class: 'dropdown'}).appendTo(landingPageMenuSubMenuDiv);
        
        var menuInnerDiv = $('<div>', {
            'class': 'dropdown-toggle',
            'id': 'pm_' + displayedName,
            'data-toggle': 'dropdown',
            'aria-expanded': 'true',
        }).appendTo(menuDiv);
    
        //$('<div>', {class: 'landingPageMenuIcon glyphicon glyphicon-option-vertical noSelect', 'aria-hidden': 'true'}).appendTo(menuInnerDiv);
        $('<div>', {class: 'landingPageMenuIcon glyphicon glyphicon-align-justify noSelect', 'aria-hidden': 'true'}).appendTo(menuInnerDiv);
        
        createDropDownList({menuData: menuData}).appendTo(menuDiv);

        return menuentry;
    }
    
        
    //
    // Delete button with handler and callback, this version marks metadata as archived
    //
    this.deleteProgram = function(e) {
        var metadata = e.data.metadata;
        var displayedName = e.data.displayedName;
        var filename = e.data.filename;
        var divid = e.data.divid;

        var conf = confirm("Are you sure you want to delete " + displayedName + "?");

        if(!conf) {
            return;
        }
        
        if(metadata){
            metadata.archived = true;
        }

        var metadataStr = JSON.stringify(metadata);
        //
        // Call API to save program.
        //
        var url = '/ext/flow/save_program_metadata'
        var data = {    filename:   filename,
                        metadata:   metadataStr,
                        content:    null,
                        csrf_token: g_csrfToken };

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
    
        
    //
    // Delete button with handler and callback, this version actually deletes the file
    //
    this.deleteProgramComplete = function(e) {
    
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
