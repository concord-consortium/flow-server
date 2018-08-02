//
// A vertical menu view which can display saved programs
//
var LandingPageMyProgramsView = function(options) {

    var base = BaseView(options);


    //
    // AJAX call and handler for updating "My Programs" div.
    //
    var loadPrograms = function(div) {

        //console.log("[DEBUG] loadPrograms loading My Programs...");

        div.empty();
        addProgramMessageToMenu(div, "loading programs...");

        var url = "/ext/flow/list_programs";
        var data = { csrf_token: g_csrfToken };

        $.ajax({
            url: url,
            method: "POST",
            data: data,
            success: function(data) {
                var response = JSON.parse(data);

                // console.log("[DEBUG] List programs", response);

                if (response.success) {

                    div.empty();
                    var index = 0;
                    var items = response.items;
                    for(var i = 0; i < items.length; i++) {
                        //new style program consisting of a folder with date-time name, a program file and a metadata file
                        if (items[i].metadata && items[i].metadata.displayedName) {
                            if (!items[i].metadata.archived) {
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
                    var lpv = getTopLevelView("landing-page-view");
                    lpv.resizeMenuAndContentHolder();

                } else {
                    addProgramMessageToMenu(div, "Error loading programs");
                    console.log("[ERROR] Error listing programs", response);
                }
            },
            error: function(data) {
                addProgramMessageToMenu(div, "Error loading programs");
                console.log("[ERROR] List programs error", data);
            },
        });

    };

    var convertProgramNameToDateString = function(programName) {
        //program name is formatted like this: program_20180522_164244
        //we want a date format like this: December 22, 2018 10:55 PM
        dateTimeStr = programName.slice(8);
        finalStr = Util.convertDateTimeStringToHumanReadable(dateTimeStr);
        return finalStr;
    }

    //
    //add a menu entry informing user of program load status
    //
    var addProgramMessageToMenu = function(div, message) {
        div.empty();
        var emptyButton = $("<div>", {class: "landing-page-menu-entry-message noSelect container-light-gray"} ).text(message);
        div.append(emptyButton);
    }

    //
    // create a menu item button to load a saved program
    //
    var createMyProgramBtn = function(metadata, displayedName, filename, tooltip, index) {
        var menuentry;
        var btn;
        menuentry = $("<div>", {id: "program" + index, class: "landing-page-menu-entry container-light-gray"});
        btn = $("<div>", { text: displayedName, class: "landing-page-menu-entry-text" } );
        menuTooltip = $("<span>", {text: tooltip, class: "tooltiptext"});
        if (tooltip != "")menuTooltip.appendTo(menuentry);
        btn.click(name, function(e) {
            //console.log("[DEBUG] MyProgramBtn click", filename);
            var folderstructure = true;
            if (!metadata) {
                folderstructure = false;
            }
            var editor = getTopLevelView("program-editor-view");
            editor.loadProgram({filename: filename, displayedName: displayedName, folderstructure: folderstructure});
        });
        btn.appendTo(menuentry);

        //
        // Add menu
        //
        var menuData = createMenuData();
        menuData.add("Delete", deleteProgram, {metadata: metadata, displayedName: displayedName, filename: filename, divid: "program" + index});

        var landingPageMenuSubMenuDiv = $("<div>", {text: "", class: "landing-page-menu-entry-sub-menu"}).appendTo(menuentry);

        var menuDiv = $("<div>", {class: "dropdown"}).appendTo(landingPageMenuSubMenuDiv);

        var menuInnerDiv = $("<div>", {
            "class": "dropdown-toggle",
            "id": "pm_" + displayedName,
            "data-toggle": "dropdown",
            "aria-expanded": "true",
        }).appendTo(menuDiv);

        menuInnerDiv.append("<img class='landing-page-menu-image' src='flow-server/static/flow/images/icon-menu.png'>")

        createDropDownList({menuData: menuData}).appendTo(menuDiv);

        return menuentry;
    }

    //
    // Delete button with handler and callback, this version marks metadata as archived
    //
    var deleteProgram = function(e) {
        var metadata = e.data.metadata;
        var displayedName = e.data.displayedName;
        var filename = e.data.filename;
        var divid = e.data.divid;

        modalConfirm({
            title: "Delete Program",
            "prompt": "Are you sure you want to delete program \"" + displayedName + "\"?",
            yesFunc: function() {
                if (metadata) {
                    metadata.archived = true;
                }

                var metadataStr = JSON.stringify(metadata);
                //
                // Call API to save program.
                //
                var url = "/ext/flow/save_program_metadata"
                var data = {    filename:   filename,
                                metadata:   metadataStr,
                                content:    null,
                                csrf_token: g_csrfToken };

                $.ajax({
                    url:        url,
                    method:     "POST",
                    data:       data,
                    success:    function(data) {
                        var response = JSON.parse(data);

                        console.log(
                            "[DEBUG] Delete program response",
                            response);

                        if (response.success) {
                            modalAlert({
                                title: "Program Deleted",
                                message: "Program \"" + displayedName + "\" deleted.",
                                nextFunc: function() {
                                    showTopLevelView("landing-page-view");
                             }});

                        } else {
                            modalAlert({
                                title: "Program Deletion Error",
                                message: "Error: " + response.message,
                                nextFunc: function() {
                             }});
                        }
                    },
                    error: function(data) {
                        console.log("[ERROR] Delete error", data);
                        modalAlert({
                            title: "Program Deletion Error",
                            message: "Error deleting program.",
                            nextFunc: function() {
                         }});
                    },
                });

            }
        });

    };

    base.show = function() {
        var content = $("#" + base.getDivId());
        loadPrograms(content);
    }

    return base;
}
