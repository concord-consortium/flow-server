//
// A widget that shows available Pis and record button.
//
var PiSelectorPanel = function(options) {

    var container   = options.container;
    var editor      = options.editor;

    var _this = this;
    
    //
    // create a menu section
    //
    var createSection = function(name, content) {
        
        var div = $('<div>', {class: 'diagramMenu'});
        var header = $('<div>', {class: 'diagramMenuHeader'} );
        var title = $('<div>', {class: 'diagramMenuTitle noSelect'} ).text(name);
        var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-chevron-down'} );
        
        if(name == 'devices'){
            header.addClass('concordblue');
        }
        else if(name == 'recording'){
            header.addClass('concordblue');
        }
        else{
            header.addClass('concordlightblue');
        }

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

    
    //
    // Devices: list of available pis and refresh button
    //
    this.availableControllers = [];
    this.selectedController = null;
    
    var devicesContent = $('<div>');
    var piList = $('<div>', {id: 'piList'});
    var refreshButton = $('<div>', {class: 'diagramMenuHeader menulightgray'} );
    var title = $('<div>', {class: 'diagramMenuEntryWithGlyph noSelect'} ).text("refresh list");
    var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-refresh', css:{color:'000000'}} );
    refreshButton.append(title); 
    refreshButton.append(chevron); 
    devicesContent.append(refreshButton);
    devicesContent.append(piList);

    //
    // Refresh the list of Pis
    //
    refreshButton.click( function() {
        _this.loadPiList();
        
        //TEST LAYOUT if not connected to a pi
        //_this.addPiToMenu(0,0, "pi00001");
        //_this.addPiToMenu(1,1, "pi00002");
        //_this.addPiToMenu(2, 2, "pi00003");
    });

    var devices = createSection("devices", devicesContent);
    container.append(devices);
    
    //
    // Recording: enter text name, and start recording
    //
    var recordContent = $('<div>');
    
    var datasetNameMenuEntry = $('<div>', {class: 'diagramMenuHeaderNoSelect noSelect menulightgray', css:{height:'60px'}} );
    var title = $('<div>', {class: 'diagramMenuEntryNoSelect noSelect'} ).text("dataset name");
    var datasetNameField = jQuery('<input>', {  
                                                id: 'dataset-name-textfield',
                                                type: 'text',
                                                css: {  width: '210px',
                                                        marginLeft: '5px',
                                                        fontSize: '12px',
                                                        } });
                                                        
    recordContent.append(datasetNameMenuEntry);
    datasetNameMenuEntry.append(title); 
    datasetNameMenuEntry.append(datasetNameField); 

    
    var recordButton = $('<div>', {class: 'diagramMenuHeader menudarkgray'} );
    var title = $('<div>', {class: 'diagramMenuEntryWithGlyph noSelect'} ).text("start recording");
    var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-play', css:{color:'000000'}} );
    recordButton.append(title); 
    recordButton.append(chevron); 
    
    recordContent.append(recordButton);

    var recordings = createSection("recording", recordContent);
    container.append(recordings);

    //
    // click on the record button
    //
    recordButton.click( function() {

        var dsName = $('#dataset-name-textfield').val();
        var controller = _this.selectedController;
        var programSpec = editor.getProgramSpec();

        if(dsName == null || dsName == '') {
            alert("You must specify a dataset name.");
            return;
        }

        if(controller == null) {
            alert("No pi selected.");
            return;
        }
       
        if(!programSpec) {
            alert("Cannot find program.");
            return;
        }

        //
        // Check that all sensor blocks can be mapped to physical sensors.
        //
        var unmapped = editor.getProgramEditorPanel().getUnmappedSensors();
        if(unmapped.length > 0) {
            var names = "";
            for(var i = 0; i < unmapped.length; i++) {
                if(i != 0) { 
                    names += ","; 
                }
                names += " " + unmapped[i];
            }
            alert("Error: The following blocks do not have available sensors on the selected pi:" + names);
            return;
        }

        //
        // Set name on program
        //
        var name = editor.getFileManager().getProgramName();
        programSpec.name = name;
        console.log("[DEBUG] Set name: " + programSpec.name);

        if(!programSpec.name || programSpec.name == '') {
            alert("No name set on program. " + programSpec.name);
            return;
        }

        //
        // Send message to start recording.
        //
        var startRecordingParams = {};

        startRecordingParams.target_folder  = controller.path;
        startRecordingParams.src_folder     = controller.path;
        startRecordingParams.message_type   = 'start_recording';
        startRecordingParams.message_params = 
                    {   rate: 1,
                        recording_location: '/testing/student-folders/' + g_user.user_name + '/datasets/' + dsName,
                        diagram:    programSpec,
                        username:   g_user.user_name };

        startRecordingParams.response_func = function(ts, params) {
            if(params.success) {
                $('#dataset-name-textfield').val('');
                alert("Recording started.");
                console.log("Recording started.", params);

                //
                // Clear any sensor values being displayed, since
                // we will no longer be listening for the
                // sensor messages.
                //
                editor.getProgramEditorPanel().handleSensorData(null, { data: [] });
                //
                // Reload available pi list.
                //
                _this.loadPiList();

            } else {
                alert("Error starting recording: " + params.message);
            }
        }
        var startRecording = MessageExecutor(startRecordingParams);
        startRecording.execute();

    });

    //
    // Handle selection of pi
    //
    this.selectPi = function(index) {
        for(var i = 0; i < this.availableControllers.length; i++) {
            var div = $('#pi-selector-controller-'+i);
            if(index == i) {
                this.selectedController = this.availableControllers[i];
                div.addClass('color-connect-to-pi-button');


                //
                // Send message over websocket to request sensor data
                //
                var controller = this.selectedController;
                var execParams = {
                        message_type:   'send_sensor_data',
                        message_params: {},
                        target_folder:  controller.path,
                        src_folder:     controller.path,
                        remove_handler: false,
                        response_func:  editor.getProgramEditorPanel().handleSensorData
                }; 

                console.log("[DEBUG] Requesting sensor data from ", controller.path);
                //
                // Clear any old sensor data being displayed.
                // Do this by calling the handler with an empty array of
                // data.
                //
                editor.getProgramEditorPanel().handleSensorData(null, { data: [] });

                var sendSensorData = MessageExecutor(execParams);
                sendSensorData.execute();

            } else {
                div.removeClass('color-connect-to-pi-button');
            }
        }
    }
    
    //
    //add a menu entry for the pi
    //
    this.addPiToMenu = function(piindex, menuindex, piname){
        var piButton;
        if(menuindex%2 == 0){
            piButton = $('<div>', {class: 'diagramMenuHeader menudarkgray'} );
        }
        else{
            piButton = $('<div>', {class: 'diagramMenuHeader menulightgray'} );
        }                        
        var title = $('<div>', {class: 'diagramMenuEntryWithGlyph noSelect'} ).text(piname);
        var chevron = $('<div>', {class: 'diagramMenuChevron glyphicon glyphicon-ok', css:{color:'000000', display: 'none'}} );
        piButton.append(title); 
        piButton.append(chevron); 
        piList.append(piButton);
        
        piButton.click(piindex, function(e) {
            _this.selectPi(e.data);
            $( ".glyphicon-ok" ).css( "display", "none" );
            chevron.css("display", "block");
            // alert(e.data); 
        });
    }
    //didn't find any pis, add a menu entry letting the user know there are no pis available
    this.addNoDevicesToMenu = function(){    
        var emptyButton = $('<div>', {class: 'diagramMenuEntryNoSelect noSelect menudarkgray'} ).text("no available devices");

        piList.append(emptyButton);
    }
    
    //
    // AJAX call and handler for listing Pis.
    //
    this.loadPiList = function() {

        // console.log("[DEBUG] loadPiList loading...");

        _this.availableControllers = [];
        _this.selectedController = null;

        piList.empty();
        piList.text("Loading Pi list...");
        
        var pisFound = 0;

        var url = '/ext/flow/controllers';

        $.ajax({
            url:        url,
            method:     'POST',
            data:       { csrf_token: g_csrfToken },
            success:    function(data) {
                var response = JSON.parse(data);

                console.log("[DEBUG] List controllers response", response);

                if(response.success) {
                   
                    piList.empty();

                    _this.availableControllers = response.controllers;
                    _this.availableControllers.sort(Util.sortByName);

                    console.log("[DEBUG] Creating Pi table...", 
                                _this.availableControllers);

                    //
                    // Create divs for all pi not in recording state.
                    //
                    for(var i = 0; i < _this.availableControllers.length; i++) {
                        var controller = _this.availableControllers[i];

                        if(!controller.online) {
                            continue;
                        }

                        if(controller.status.recording_interval != null) {
                            continue;
                        }
                        
                         _this.addPiToMenu(i, pisFound, controller.name);
                        
                        pisFound++;
                        
                    }
                    if(pisFound==0){
                        _this.addNoDevicesToMenu();
                    }

                } else {
                    _this.addNoDevicesToMenu();
                    console.log("[ERROR] Error listing controllers", response);
                }
            },
            error: function(data) {
                _this.addNoDevicesToMenu();
                console.log("[ERROR] List controllers error", data);
            },
        });
    };

    this.loadPiList();

    return this;
}
