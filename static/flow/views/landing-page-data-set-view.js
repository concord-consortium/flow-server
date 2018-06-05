//
// A view representing a main landing page
// which can display "My Programs", "Recording Now" data
// and "Previously Recorded" data
//
var LandingPageDataSetView = function(options) {

    var base = BaseView(options);
    var livedataholder = options.livedataholder;
    var recordingData = [];
    //
    // AJAX call and handler for updating "Recording Now" and 
    // "Previously Recorded" div.
    //
    var loadDataSets = function(recordeddataholder, livedataholder) {

        // console.log("[DEBUG] loading recorded data...");
        livedataholder.empty();
        var livedatatitlebar  = jQuery('<div>', {class:'liveDataTitleBar', text:"You don't have any running programs. Click \"new program\" to get started."} );
        livedatatitlebar.appendTo(livedataholder);        

        recordeddataholder.empty();
        addLoadingDatasetsToMenu(recordeddataholder);
        //recordeddataholder.text("Loading recorded data...");

        var url = '/ext/flow/list_datasets';

        $.ajax({
            url:    url,
            method: 'POST',
            data:   { csrf_token: g_csrfToken },
            success: function(data) {
                var response = JSON.parse(data);

                //console.log("[DEBUG] List datasets", response);

                if(response.success) {

                    var items = response.items;
                    var recording = [];
                    var recorded = [];
                    for(var i = 0; i < items.length; i++) {
                        var item = items[i];
                        // console.log("[DEBUG] Checking metadata", item.metadata);
                        if(item.metadata && item.metadata.recording == true) {
                            recording.push(item);
                        } else {
                            var isEmpty = false;
                            var isArchived = false;
                            if(item.metadata && item.metadata.archived)
                                isArchived = true;
                            if(item.metadata && item.metadata.is_empty && item.metadata.is_empty == true)
                                isEmpty = true;
                            if(!isEmpty && !isArchived)
                                recorded.push(item);
                        }
                    }
                    recordingData = recording;
                    recordeddataholder.empty();
                    
                    var createDataSetList = function(displayName, list) {
                        if(list.length == 0) {
                            return;
                        }
                        if(displayName == "Recording Now"){
                            for(var i = 0; i < list.length; i++) {
                                livedatatitlebar.text("Currently running programs");
                                var livedatablock = createMyDataSetLiveBlock ( list[i]);
                                livedatablock.appendTo(livedataholder);
                                // console.log("[DEBUG] Creating dataset item", items[i]);
                            }
                            
                        }
                        else{
                            for(var i = 0; i < list.length; i++) {
                                var tooltip = "";
                                if(list[i].metadata == null || list[i].metadata.displayedName == null){
                                    //no displayedName indicates old style dataset where displayed name and filename are the same
                                }
                                else{
                                    //displayedName indicates new style dataset where displayed name is stored in metadata and filename is based on creation date and time
                                    var dateifiedName = list[i].name;
                                    tooltip = convertDatasetNameToDateString(dateifiedName);
                                }
                                
                                var btn = createMyDataSetMenuEntry ( list[i], tooltip, i );
                                btn.appendTo(recordeddataholder);
                                // console.log("[DEBUG] Creating dataset item", items[i]);
                            }                            
                        }
                            
                    }

                    createDataSetList("Recording Now", recording);
                    createDataSetList("Previously Recorded", recorded);
                    
                    if(recording.length == 0 && recorded.length == 0) {
                        addNoDatasetsToMenu(recordeddataholder);
                    }
                    
                    //resize the landing page view
                    var lpv = getTopLevelView('landing-page-view');
                    lpv.resizemenuandcontentholder();


                } else {
                    addNoDatasetsToMenu(recordeddataholder);
                    console.log("[ERROR] Error listing datasets", response);
                }
            },
            error: function(data) {
                addNoDatasetsToMenu(recordeddataholder);
                console.log("[ERROR] List datasets error", data);
            },
        });
        
    };

    //
    //take an internal file name saved as a date and convert to a human readable date string
    //
    this.convertDatasetNameToDateString = function(internalName){
        //dataset name is formatted like this: dataset_20180522_164244
        //we want a date format like this: December 22, 2018 10:55 PM
        var year = internalName.substring(8, 12);
        var month = internalName.substring(12, 14);
        var day = internalName.substring(14, 16);
        var hour = internalName.substring(17, 19);
        var min = internalName.substring(19, 21);
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
    //didn't find any datasets, add a menu entry letting the user know there are no datasets available
    //
    this.addNoDatasetsToMenu = function(div){    
        div.empty();
        var emptyButton = $('<div>', {class: 'landingPageMenuEntryNoSelect noSelect menudarkgray'} ).text("no available datasets");
        div.append(emptyButton);
    }
    //
    //waiting to load datasets, add a menu entry letting the user know we are in the middle of loading
    //
    this.addLoadingDatasetsToMenu = function(div){    
        div.empty();
        var emptyButton = $('<div>', {class: 'landingPageMenuEntryNoSelect noSelect menudarkgray'} ).text("loading datasets...");
        div.append(emptyButton);
    }
    //
    //create the blocks that convey live dataset information from a currently running program
    //
    var createMyDataSetLiveBlock = function(item) {
        var filename = item.name;
        var metadata = item.metadata;
        var controllername = metadata.controller_name;
        var programdata = metadata.program;
        var programname = programdata.name;
        var isEmpty = false;
        if(metadata.is_empty && metadata.is_empty == true)
            isEmpty = true;
        
        var livedataitemholder  = jQuery('<div>', {class:'liveDataItemHolder'} );
        
        var livedataitemboxpi  = jQuery('<div>', {class:'liveDataItemBox concordblue'} );
        var livedataitemboxpititle  = jQuery('<div>', {class:'liveDataItemBoxTitle', text:"pi"} );
        var livedataitemboxpiname  = jQuery('<div>', {class:'liveDataItemBoxName', text:controllername} );
        var buttonid = "liveDataStopButton" + controllername;
        var stopButton = $('<button>', { id: buttonid, class:'liveDataItemBoxButton',   html: 'stop program' } );
        //add hidden status indication in case pi is offline
        var statusid = "liveDataStatusDiv" + controllername;
        var statusDiv = jQuery('<div>', {id: statusid, class:'liveDataItemBoxTitle'} );
        statusDiv.html('<span class="liveDataItemBoxWarning glyphicon glyphicon-warning-sign"></span><span class="liveDataItemBoxTitle"> Pi ' + controllername + ' is offline</span>');
        livedataitemboxpititle.appendTo(livedataitemboxpi);   
        livedataitemboxpiname.appendTo(livedataitemboxpi); 
        stopButton.appendTo(livedataitemboxpi);
        //is this Pi even online?
        var editor = getTopLevelView('program-editor-view');
        var piSelectorPanel = editor.getPiSelectorPanel();
        var offline = piSelectorPanel.isPiOffline(controllername);
        if(offline){
            stopButton.hide();
        }
        else{
            statusDiv.hide();
        }
        statusDiv.appendTo(livedataitemboxpi);        
        
        var livedataitemboxprogram  = jQuery('<div>', {class:'liveDataItemBox concordblue'} );
        var livedataitemboxprogramtitle  = jQuery('<div>', {class:'liveDataItemBoxTitle', text:"running program"} );
        var livedataitemboxprogramname  = jQuery('<div>', {class:'liveDataItemBoxName', text:programname} );
        var viewProgramButton = $('<button>', { class:'liveDataItemBoxButton',   html: 'view program' } );
        livedataitemboxprogramtitle.appendTo(livedataitemboxprogram);   
        livedataitemboxprogramname.appendTo(livedataitemboxprogram);   
        viewProgramButton.appendTo(livedataitemboxprogram);             
        
        viewProgramButton.click(item, function(e) {
            console.log("[DEBUG] viewProgramButton click", e.data);
            var editor = getTopLevelView('program-editor-view');
            editor.loadProgramFromSpec({programdata: programdata});
            
            var piSelectorPanel = editor.getPiSelectorPanel();
            piSelectorPanel.simulateRunProgramState(metadata.controller_name, metadata.controller_path, metadata.recording_location);
            
        });
            
        //
        // Stop recording
        //
        stopButton.click(metadata, function(e) {
            
            var conf = confirm("Are you sure you want to stop the program?");

            if(!conf) {
                return;
            }                
            stopButton.html('stopping... please wait');
            console.log("[DEBUG] Stopping program", e.data.recording_location);
            
            //stop the program by marking the metadata
            //at present we are NOT using this method, but we may return to it based on future design decisions
            /*
            for(var i = 0; i < recordingData.length; i++) {
                if(e.data.recording_location == recordingData[i].metadata.recording_location){
                    console.log("[DEBUG] found dataset to stop");
                    
                    //update the metadata
                    recordingData[i].metadata.recording = false;
                    
                    var filename = recordingData[i].name;
                    var datasetmetadataStr = JSON.stringify(recordingData[i].metadata);

                    console.log("Saving:", datasetmetadataStr);

                    //
                    // Call API to save metadata.
                    //
                    var url = '/ext/flow/save_dataset_metadata'  
                    var data = {    filename:   filename,
                                    content:    datasetmetadataStr,
                                    csrf_token: g_csrfToken };

                    $.ajax({
                        url:        url,
                        method:     'POST',
                        data:       data,
                        success:    function(data) {
                            var response = JSON.parse(data);

                            console.log(
                                "[DEBUG] Save dataset metadata response", 
                                response);

                            if(response.success) {
                                //alert("Dataset metadata saved");
                            } else {
                                //alert("Error: " + response.message);
                            }
                        },
                        error: function(data) {
                            console.log("[ERROR] Save error", data);
                            //alert('Error saving dataset metadata.')
                        },
                    });                            
                    
                }
                break;
            }
            //return;
            */
            
            // Send message over websocket and handle response
            //
            var execParams = {  
                    message_type:   'stop_diagram',
                    message_params: { 
                        stop_location: e.data.recording_location },
                    target_folder:  e.data.controller_path,
                    src_folder:     e.data.controller_path,
                    response_func:  function(ts, params) {
                        if(params.success) {
                            alert("Program stopped.");
                            base.show();
                    
                            var editor = getTopLevelView('program-editor-view');
                            var piSelectorPanel = editor.getPiSelectorPanel();


                            piSelectorPanel.exitRunProgramState();
                            piSelectorPanel.reselectCurrentPi();
                            
                        } else {
                            alert("Error stopping program: " + params.message);
                        }
                    } 
                };

            var stopDiagram = MessageExecutor(execParams);
            stopDiagram.execute();

        });        

        var livedataitemboxdata  = jQuery('<div>', {class:'liveDataItemBox concordblue'} );
        var livedataitemboxdatatitle  = jQuery('<div>', {class:'liveDataItemBoxTitle', text:"recording dataset"} );
        var livedataitemboxdataname  = jQuery('<div>', {class:'liveDataItemBoxName', text:filename} );
        var viewButton = $('<button>', { class:'liveDataItemBoxButton',   html: 'view dataset' } );
        livedataitemboxdatatitle.appendTo(livedataitemboxdata);   
        livedataitemboxdataname.appendTo(livedataitemboxdata);
        
        viewButton.appendTo(livedataitemboxdata);         
    
        viewButton.click(item, function(e) {
            console.log("[DEBUG] View DataSet Button click", e.data);
            var dataSetView = getTopLevelView('data-set-view');
            var sucess = dataSetView.loadDataSet(e.data);
            if(sucess)showTopLevelView('data-set-view');
        });
        
        var livedataiteconnector1  = jQuery('<div>', {class:'liveDataItemConnector'} );
        var livedataiteconnector2  = jQuery('<div>', {class:'liveDataItemConnector'} );
        var chevron1 = $('<div>', {class: 'liveDataItemConnectorArrow glyphicon glyphicon-arrow-right'} );
        var chevron2 = $('<div>', {class: 'liveDataItemConnectorArrow glyphicon glyphicon-arrow-right'} );
        chevron1.appendTo(livedataiteconnector1);
        chevron2.appendTo(livedataiteconnector2);
        livedataitemboxpi.appendTo(livedataitemholder);   
        livedataiteconnector1.appendTo(livedataitemholder);   
        livedataitemboxprogram.appendTo(livedataitemholder);   
        if(!isEmpty) 
            livedataiteconnector2.appendTo(livedataitemholder);   
        if(!isEmpty) 
            livedataitemboxdata.appendTo(livedataitemholder);   
        livedataitemholder.appendTo(livedataholder);   
        return livedataitemholder;
    }
    
    //
    // create a menu item button to load a saved dataset
    //
    var createMyDataSetMenuEntry = function(item, tooltip,  index) {
        var menuentry;
        var btn;
        var filename = item.name;
        if(index%2 == 0){
            menuentry = $('<div>', {id:'dataset'+index, class: 'landingPageMenuEntry menulightgray'});
            btn = $('<button>', { text:filename, class: 'landingPageMenuTextContent menulightgray' } );
            menuTooltip = $('<span>', {text:tooltip, class: 'tooltiptext'});
            if(tooltip!="")menuTooltip.appendTo(menuentry);
        }
        else{
            menuentry = $('<div>', {id:'dataset'+index, class: 'landingPageMenuEntry menudarkgray'});
            btn = $('<button>', { text:filename, class: 'landingPageMenuTextContent menudarkgray' } );
            menuTooltip = $('<span>', {text:tooltip, class: 'tooltiptext'});
            if(tooltip!="")menuTooltip.appendTo(menuentry);
        }
        btn.click(item, function(e) {
            console.log("[DEBUG] DataSetButton click", e.data);
            var dataSetView = getTopLevelView('data-set-view');
            var success = dataSetView.loadDataSet(e.data);
            if(success)showTopLevelView('data-set-view');
        });
        btn.appendTo(menuentry);
        
        //
        // Add menu
        //
        var menuData = createMenuData();
        menuData.add('Delete', this.deleteDataset, {metadata: item.metadata, datasetname: filename, divid: 'dataset'+index}); 
        
        var landingPageMenuSubMenuDiv = $('<div>', {text:"", class: 'landingPageMenuSubMenu'}).appendTo(menuentry);

        var menuDiv = $('<div>', {class: 'dropdown'}).appendTo(landingPageMenuSubMenuDiv);
        
        var menuInnerDiv = $('<div>', {
            'class': 'dropdown-toggle',
            'id': 'pm_' + filename,
            'data-toggle': 'dropdown',
            'aria-expanded': 'true',
        }).appendTo(menuDiv);
    
        $('<div>', {class: 'landingPageMenuIcon glyphicon glyphicon-align-justify noSelect', 'aria-hidden': 'true'}).appendTo(menuInnerDiv);
          
        createDropDownList({menuData: menuData}).appendTo(menuDiv);

        return menuentry;
        
    }
    
    //
    // Delete dataset, this version marks metadata as archived
    //
    this.deleteDataset = function(e) {
        var name = e.data.datasetname;
        var metadata = e.data.metadata;
        
        var conf = confirm("Are you sure you want to delete dataset " + name + "?");

        if(!conf) {
            return;
        }        
        
        if(metadata){
            metadata.archived = true; //mark the metadata as archived so we know not to display it to the user
            
            if(metadata.displayedName == null){
                //we don't have a displayedName, this is most likely an old version of the dataset that the user is trying to delete
                metadata.displayedName = name;
            }
        }        
        var metadataStr = JSON.stringify(metadata);        
        
        //
        // Call API to save metadata.
        //
        var url = '/ext/flow/save_dataset_metadata'  
        var data = {    filename:   name,
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
                    "[DEBUG] delete dataset response", 
                    response);

                if(response.success) {
                    alert("Dataset deleted");
                    showTopLevelView('landing-page-view');  
                } else {
                    alert("Error: " + response.message);
                }
            },
            error: function(data) {
                console.log("[ERROR] Save error", data);
                //alert('Error saving dataset metadata.')
            },
        });         
    };    
    
    //
    // Delete dataset, this version actually deletes the file
    //
    this.deleteDatasetComplete = function(e) {
        var name = e.data.datasetname;
        
        var conf = confirm("Are you sure you want to delete dataset " + name + "?");

        if(!conf) {
            return;
        }                
        
        $.ajax({
            url: '/ext/flow/delete_dataset',
            data: { filename:   name,
                    csrf_token: g_csrfToken },
            method: 'POST',
            success: function(data) {
                //$( '#' + divid ).remove(); //this is probably not needed
                alert("Deleted dataset " + name);
                showTopLevelView('landing-page-view');  
            },
            error: function(data) {
                console.log("[ERROR] Error deleting dataset " + name);
                alert("Error deleting dataset " + name)
            }});
    };        

    base.show = function() {
        var menucontentholder = jQuery('#'+base.getDivId());
        loadDataSets(menucontentholder, livedataholder);
    }

    return base;
}
