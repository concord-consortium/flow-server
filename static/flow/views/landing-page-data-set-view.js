//
// A vertical menu view which can display saved datasets,
// and an activity feed showing currently running programs
// and associated live datasets
//
var LandingPageDataSetView = function(options) {

    var base = BaseView(options);
    var liveDataHolder = options.liveDataHolder;
    var dataSetView = options.dataSetView;
    var recordingData = [];

    var loadDataSet = function(dataset) {
        var success = dataSetView.loadDataSet(dataset);
        if (success)showDataSetView();
    }

    var showDataSetView = function() {
        dataSetView.show();
        liveDataHolder.hide();
    }


    //
    // AJAX call and handler for updating "Recording Now" and
    // "Previously Recorded" div.
    //
    var loadDataSets = function(recordedDataHolder, liveDataHolder) {

        // console.log("[DEBUG] loading recorded data...");
        liveDataHolder.empty();
        var livedatatitlebar  = jQuery("<div>", {class:"live-data-title-bar", text:"You don't have any running programs. Click \"New Program\" to get started."} );
        livedatatitlebar.appendTo(liveDataHolder);

        recordedDataHolder.empty();
        addLoadingDatasetsToMenu(recordedDataHolder);

        var url = "/ext/flow/list_datasets";

        $.ajax({
            url:    url,
            method: "POST",
            data:   { csrf_token: g_csrfToken },
            success: function(data) {
                var response = JSON.parse(data);

                //console.log("[DEBUG] List datasets", response);

                if (response.success) {

                    var items = response.items;
                    var recording = [];
                    var recorded = [];
                    for(var i = 0; i < items.length; i++) {
                        var item = items[i];
                        // console.log("[DEBUG] Checking metadata", item.metadata);
                        if (item.metadata && item.metadata.recording == true) {
                            recording.push(item);
                        } else {
                            var isEmpty = false;
                            var isArchived = false;
                            if (item.metadata && item.metadata.archived) {
                                isArchived = true;
                            }
                            if (item.metadata && item.metadata.is_empty && item.metadata.is_empty == true) {
                                isEmpty = true;
                            }
                            if (!isEmpty && !isArchived) {
                                recorded.push(item);
                            }
                        }
                    }
                    recordingData = recording;
                    recordedDataHolder.empty();

                    var createDataSetList = function(displayName, list) {
                        if (list.length == 0) {
                            return;
                        }
                        if (displayName == "Recording Now") {
                            for(var i = 0; i < list.length; i++) {
                                livedatatitlebar.text("Currently running programs");
                                var livedatablock = createDatasetActivityFeedBlock ( list[i]);
                                livedatablock.appendTo(liveDataHolder);
                                // console.log("[DEBUG] Creating dataset item", items[i]);
                            }

                        }
                        else{
                            for(var i = 0; i < list.length; i++) {
                                var toolTip = "";
                                var displayedName = "";
                                if (list[i].metadata == null || list[i].metadata.displayedName == null) {
                                    //no displayedName indicates old style dataset where displayed name and filename are the same
                                    displayedName = list[i].name;
                                }
                                else{
                                    //displayedName indicates new style dataset where displayed name is stored in metadata and filename is based on creation date and time
                                    var dateifiedName = list[i].name;
                                    toolTip = convertDatasetNameToDateString(dateifiedName);
                                    displayedName = list[i].metadata.displayedName;
                                }

                                var btn = createDatasetMenuEntry ( list[i], displayedName, list[i].name, toolTip, i );
                                btn.appendTo(recordedDataHolder);
                                // console.log("[DEBUG] Creating dataset item", items[i]);
                            }
                        }
                    }

                    createDataSetList("Recording Now", recording);
                    createDataSetList("Previously Recorded", recorded);

                    if (recording.length == 0 && recorded.length == 0) {
                        addNoDatasetsToMenu(recordedDataHolder);
                    }

                    //resize the landing page view
                    var lpv = getTopLevelView("landing-page-view");
                    lpv.resizeMenuAndContentHolder();


                } else {
                    addNoDatasetsToMenu(recordedDataHolder);
                    console.log("[ERROR] Error listing datasets", response);
                }
            },
            error: function(data) {
                addNoDatasetsToMenu(recordedDataHolder);
                console.log("[ERROR] List datasets error", data);
            },
        });

    };

    //
    //take an internal file name saved as a date and convert to a human readable date string
    //
    var convertDatasetNameToDateString = function(internalName) {
        //dataset name is formatted like this: dataset_20180522_164244
        //we want a date format like this: December 22, 2018 10:55 PM
        dateTimeStr = internalName.slice(8);
        finalStr = Util.convertDateTimeStringToHumanReadable(dateTimeStr);
        return finalStr;
    }

    //
    //didn't find any datasets, add a menu entry letting the user know there are no datasets available
    //
    var addNoDatasetsToMenu = function(div) {
        div.empty();
        var emptyButton = $("<div>", {class: "landing-page-menu-entry-message noSelect container-light-gray"} ).text("no available datasets");
        div.append(emptyButton);
    }
    //
    //waiting to load datasets, add a menu entry letting the user know we are in the middle of loading
    //
     var addLoadingDatasetsToMenu = function(div) {
        div.empty();
        var emptyButton = $("<div>", {class: "landing-page-menu-entry-message noSelect container-light-gray"} ).text("loading datasets...");
        div.append(emptyButton);
    }
    //
    //create the blocks that convey live dataset information from a currently running program
    //
    var createDatasetActivityFeedBlock = function(item) {
        var metadata = item.metadata;
        var filename = "";
        var displayedFilename = item.name;
        if (metadata.displayedName) {
            displayedFilename = metadata.displayedName;
        }
        else{
            displayedFilename = item.name;
        }
        var controllerName = metadata.controller_name;
        var programData = metadata.program;
        var programName = programData.displayedName;
        if (programName == null || programName == "") {
            programName = "Untitled Program";
        }
        var isEmpty = false;
        if (metadata.is_empty && metadata.is_empty == true) {
            isEmpty = true;
        }

        //main holder for activity feed item
        var liveDataItemHolder = jQuery("<div>", {class:"live-data-item-holder"} );

        var liveDataItemBoxProgramTitle = jQuery("<div>", {class:"live-data-item-title", text:programName} );
        liveDataItemBoxProgramTitle.appendTo(liveDataItemHolder);

        //device section
        var liveDataItemBoxPi = jQuery("<div>", {class:"live-data-item-box"} );
        //image icon
        var liveDataItemBoxPiIcon = $("<img class='center'>");
        liveDataItemBoxPiIcon.attr("src", "flow-server/static/flow/images/icon-device.png");
        liveDataItemBoxPiIcon.attr("width","145");
        liveDataItemBoxPiIcon.appendTo(liveDataItemBoxPi);
        //name of the Pi
        var liveDataItemBoxPiName  = jQuery("<div>", {class:"live-data-item-box-name", text:controllerName} );
        //stop button
        var buttonid = "liveDataStopButton" + controllerName;
        var stopButton = $("<button>", { id: buttonid, class:"live-data-item-box-button center",   html: "stop program" } );

        //add hidden status indication in case pi is offline
        var statusid = "liveDataStatusDiv" + controllerName;
        var statusDiv = jQuery("<div>", {id: statusid, class:"live-data-item-box-warning"} );
        //warning icon
        var warningIcon = $("<img class='warning-icon'>");
        warningIcon.attr("src", "flow-server/static/flow/images/icon-warning.png");
        warningIcon.appendTo(statusDiv);
        var statusText = "Offline";
        var statusMessage = jQuery("<span>", {class:"noSelect", text:statusText} );
        statusMessage.appendTo(statusDiv);

        liveDataItemBoxPiName.appendTo(liveDataItemBoxPi);
        stopButton.appendTo(liveDataItemBoxPi);
        //is this Pi online?
        var editor = getTopLevelView("program-editor-view");
        var piSelectorPanel = editor.getPiSelectorPanel();
        var offline = piSelectorPanel.isPiOffline(controllerName);
        if (offline) {
            stopButton.hide();
        }
        else{
            statusDiv.hide();
        }
        statusDiv.appendTo(liveDataItemBoxPi);


        //program section
        var liveDataItemBoxProgram = jQuery("<div>", {class:"live-data-item-box"} );
        //image icon
        var liveDataItemBoxProgramIcon = $("<img class='center'>");
        liveDataItemBoxProgramIcon.attr("src", "flow-server/static/flow/images/icon-program.png");
        liveDataItemBoxProgramIcon.attr("width","145");
        liveDataItemBoxProgramIcon.appendTo(liveDataItemBoxProgram);
        //name of the program
        var liveDataItemBoxProgramName = jQuery("<div>", {class:"live-data-item-box-name", text:programName} );
        var viewProgramButton = $("<button>", { class:"live-data-item-box-button center",   html: "view program" } );
        liveDataItemBoxProgramName.appendTo(liveDataItemBoxProgram);
        viewProgramButton.appendTo(liveDataItemBoxProgram);

        viewProgramButton.click(item, function(e) {
            console.log("[DEBUG] viewProgramButton click", e.data);
            var editor = getTopLevelView("program-editor-view");
            editor.loadProgramFromSpec({programdata: programData});

            var piSelectorPanel = editor.getPiSelectorPanel();
            piSelectorPanel.simulateRunProgramState(e.data);

        });

        //
        // Stop recording
        //
        stopButton.click(metadata, function(e) {

            modalConfirm({
                title: "Stop Program",
                "prompt": "Are you sure you want to stop the program?",
                yesFunc: function() {

                    stopButton.html("stopping program");
                    stopButton.prop("disabled", true);
                    stopButton.addClass("noHover");
                    console.log("[DEBUG] Stopping program", e.data.recording_location);

                    stopRecording(base.show, e.data.recording_location, e.data.controller_path);
                }
            });
        });

        //dataset section
        var liveDataItemBoxData = jQuery("<div>", {class:"live-data-item-box"} );
        //image icon
        var liveDataItemBoxProgramIcon = $("<img class='center'>");
        liveDataItemBoxProgramIcon.attr("src", "flow-server/static/flow/images/icon-graph.png");
        liveDataItemBoxProgramIcon.attr("width","145");
        liveDataItemBoxProgramIcon.appendTo(liveDataItemBoxData);
        //name of the dataset
        if (displayedFilename == null || displayedFilename == "") {
            displayedFilename = "Untitled Dataset";
        }
        var liveDataItemBoxDataName = jQuery("<div>", {class:"live-data-item-box-name", text:displayedFilename} );
        var viewButton = $("<button>", { class:"live-data-item-box-button center",   html: "view dataset" } );
        liveDataItemBoxDataName.appendTo(liveDataItemBoxData);

        viewButton.appendTo(liveDataItemBoxData);

        viewButton.click(item, function(e) {
            console.log("[DEBUG] View DataSet Button click", e.data);
            loadDataSet(e.data);
        });

        var liveDataItemConnector1 = jQuery("<div>", {class:"live-data-item-connector"} );
        var liveDataItemConnector2 = jQuery("<div>", {class:"live-data-item-connector"} );

        var arrow1 = $("<img class='center'>");
        arrow1.attr("src", "flow-server/static/flow/images/icon-arrow-connector.png");
        arrow1.attr("width","50");
        arrow1.appendTo(liveDataItemConnector1);
        var arrow2 = $("<img class='center'>");
        arrow2.attr("src", "flow-server/static/flow/images/icon-arrow-connector.png");
        arrow2.attr("width","50");
        arrow2.appendTo(liveDataItemConnector2);

        liveDataItemBoxPi.appendTo(liveDataItemHolder);
        liveDataItemConnector1.appendTo(liveDataItemHolder);
        liveDataItemBoxProgram.appendTo(liveDataItemHolder);
        if (!isEmpty) {
            liveDataItemConnector2.appendTo(liveDataItemHolder);
        }
        if (!isEmpty) {
            liveDataItemBoxData.appendTo(liveDataItemHolder);
        }
        liveDataItemHolder.appendTo(liveDataHolder);
        return liveDataItemHolder;
    }

    //
    // create a menu item button to load a saved dataset
    //
    var createDatasetMenuEntry = function(item, displayedName, filename, tooltip,  index) {
        var menuentry = $("<div>", {id:"dataset"+index, class: "landing-page-menu-entry container-light-gray"});
        var btn = $("<div>", { text:displayedName, class: "landing-page-menu-entry-text" } );
        menuTooltip = $("<span>", {text:tooltip, class: "tooltiptext"});
        if (tooltip != "")menuTooltip.appendTo(menuentry);
        btn.click(item, function(e) {
            console.log("[DEBUG] DataSetButton click", e.data);
            loadDataSet(e.data);
        });
        btn.appendTo(menuentry);

        //
        // Add menu
        //
        var menuData = createMenuData();
        menuData.add("Delete", deleteDataset, {metadata: item.metadata, datasetname: filename, divid: "dataset" + index});

        var landingPageMenuSubMenuDiv = $("<div>", {text:"", class: "landing-page-menu-entry-sub-menu"}).appendTo(menuentry);

        var menuDiv = $("<div>", {class: "dropdown"}).appendTo(landingPageMenuSubMenuDiv);

        var menuInnerDiv = $("<div>", {
            "class": "dropdown-toggle",
            "id": "pm_" + filename,
            "data-toggle": "dropdown",
            "aria-expanded": "true",
        }).appendTo(menuDiv);

        menuInnerDiv.append("<img class='landing-page-menu-image' src='flow-server/static/flow/images/icon-menu.png'>")

        createDropDownList({menuData: menuData}).appendTo(menuDiv);

        return menuentry;

    }

    //
    // Delete dataset, this version marks metadata as archived
    //
    var deleteDataset = function(e) {
        var metadata = e.data.metadata;
        var displayedName;
        var fileName = e.data.datasetname;
        if (metadata == null || metadata.displayedName == null) {
            displayedName = e.data.datasetname;
        }
        else{
            displayedName = metadata.displayedName
        }

        modalConfirm({
            title: "Delete Dataset",
            "prompt": "Are you sure you want to delete dataset \"" + displayedName + "\"?",
            yesFunc: function() {
                if (metadata) {
                    metadata.archived = true; //mark the metadata as archived so we know not to display it to the user

                    if (metadata.displayedName == null) {
                        //we don't have a displayedName, this is most likely an old version of the dataset that the user is trying to delete
                        metadata.displayedName = displayedName;
                    }
                }
                var metadataStr = JSON.stringify(metadata);

                //
                // Call API to save metadata.
                //
                var url = "/ext/flow/save_dataset_metadata"
                var data = {    filename:   fileName,
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
                            "[DEBUG] delete dataset response",
                            response);

                        if (response.success) {
                            modalAlert({
                                title: "Dataset Deleted",
                                message: "Dataset \"" + displayedName + "\" deleted.",
                                nextFunc: function() {
                                    showTopLevelView("landing-page-view");
                             }});
                        } else {
                            modalAlert({
                                title: "Dataset Deletion Error",
                                message: "Error: " + response.message,
                                nextFunc: function() {
                             }});
                        }
                    },
                    error: function(data) {
                        console.log("[ERROR] Save error", data);
                        modalAlert({
                            title: "Dataset Deletion Error",
                            message: "Error deleting dataset.",
                            nextFunc: function() {
                         }});
                    },
                });
            }

        });
    };

    base.show = function() {
        var menucontentholder = jQuery("#" + base.getDivId());
        loadDataSets(menucontentholder, liveDataHolder);
    }

    return base;
}
