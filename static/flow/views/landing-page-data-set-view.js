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
                            if(item.metadata && item.metadata.is_empty && item.metadata.is_empty == true)
                                isEmpty = true;
                            if(!isEmpty)
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
                                var btn = createMyDataSetMenuEntry ( list[i], i );
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
        var stopButton = $('<button>', { class:'liveDataItemBoxButton',   html: 'stop program' } );
        livedataitemboxpititle.appendTo(livedataitemboxpi);   
        livedataitemboxpiname.appendTo(livedataitemboxpi); 
        stopButton.appendTo(livedataitemboxpi);     
        
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
                    var url = '/ext/flow/save_datasetmetadata'  
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
    var createMyDataSetMenuEntry = function(item, index) {
        var menuentry;
        var btn;
        var filename = item.name;
        if(index%2 == 0){
            menuentry = $('<div>', {id:'dataset'+index, class: 'landingPageMenuEntry menulightgray'});
            btn = $('<button>', { text:filename, class: 'landingPageMenuTextContent menulightgray' } );
        }
        else{
            menuentry = $('<div>', {id:'dataset'+index, class: 'landingPageMenuEntry menudarkgray'});
            btn = $('<button>', { text:filename, class: 'landingPageMenuTextContent menudarkgray' } );
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
        menuData.add('Delete', this.deleteDataset, {datasetname: filename, divid: 'dataset'+index}); 
        
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
    // Delete dataset
    //
    this.deleteDataset = function(e) {
        var name = e.data.datasetname;
        var divid = e.data.divid;

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
