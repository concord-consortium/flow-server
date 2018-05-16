//
// A widget that shows available Pis and record button.
//
var PiSelectorPanel = function(options) {

    var deviceDropDownMenu   = options.deviceDropDownMenu;
    var editor      = options.editor;
    var runProgramButton = options.runProgramButton;
    
    var _this = this;
    
    var selectdataPrevious = {};
    var selectdata = {};

    //
    // Stored vals for when we stop the recording
    //    
    var currentlyRecording = false;
    var currentlySelectedPi;
    var reselectPi;
    var currentRecordingLocation;
    var currentControllerPath;
    var currentControllerName;
        
    //
    // Devices: list of available pis and refresh button
    //
    this.availableControllers = [];
    this.selectedController = null;
    
        
    //
    // AJAX call and handler for listing Pis.
    //
    this.loadPiList = function() {
        
        //runProgramButton.text("run program");
        runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program</span>');
        runProgramButton.removeClass("rungreen");
        runProgramButton.removeClass("stopred");
        runProgramButton.prop("disabled", false); 
        _this.currentlyRecording = false;
        deviceDropDownMenu.prop("disabled", false);     
        var contents = $('#program-editor-recordingstatus').text("Connected to ");        

        // console.log("[DEBUG] loadPiList loading...");
        for (var member in selectdata) delete selectdata[member];
        selectdata["none"] = "none";

        _this.availableControllers = [];
        _this.selectedController = null;

        runProgramButton.prop("disabled", true);
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
                    
                    _this.availableControllers = response.controllers;
                    _this.availableControllers.sort(Util.sortByName);

                    console.log("[DEBUG] Creating Pi table...", 
                                _this.availableControllers);

                    //
                    //add all pi not in recording state to drop down select menu.
                    //
                    for(var i = 0; i < _this.availableControllers.length; i++) {
                        var controller = _this.availableControllers[i];

                        if(!controller.online) {
                            continue;
                        }

                        if(controller.status.recording_interval != null) {
                            continue;
                        }
                        
                         _this.addPiToDataList(i+1, controller.name);//_this.addPiToMenu(i, pisFound, controller.name);
                        
                        pisFound++;
                        
                    }
 
                    _this.addPisToMenu();    
                    
                    if(_this.reselectPi)
                        _this.reselectPreviousPi();

                } else {
                  
                    _this.addPisToMenu();    
                    
                    if(_this.reselectPi)
                        _this.reselectPreviousPi();                    
                    
                    console.log("[ERROR] Error listing controllers", response);
                }
                 
            },
            error: function(data) {
               
                _this.addPisToMenu();

                if(_this.reselectPi)
                    _this.reselectPreviousPi();
                
                console.log("[ERROR] List controllers error", data);
            },
        });    
    };    
    
    //
    //add an entry for the pi to the data object
    //
    this.addPiToDataList = function(index, piname){
        selectdata[piname] = piname;
    }
    
    
    //
    //add an entry for the pi to the drop down menu
    //
    this.addPisToMenu = function(){ 
        //is this the same as the previous list?
        if(JSON.stringify(selectdata) === JSON.stringify(selectdataPrevious)){
            //it is, no need to change menu, bail
            _this.reselectPi = false;
            
            //restore UI, we reset UI state when getting list of Pis
            if(deviceDropDownMenu.val() != "none"){ 
                runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program on ' + deviceDropDownMenu.val() + '</span>');
                runProgramButton.addClass("rungreen");
                runProgramButton.removeClass("stopred"); 
                runProgramButton.prop("disabled", false); 
            }
            
            return;
        }
        //delete previous list, something has changed
        for (var member in selectdataPrevious) delete selectdataPrevious[member];
        //clear the list
        deviceDropDownMenu.empty();
        //for testing
        //this.addPiToDataList(10, "RPi001");
        //this.addPiToDataList(21, "RPi002");
        //this.addPiToDataList(32, "RPi003");
        //add new list of entries into the list and store the entries in selectdataPrevious
        for(var val in selectdata) {
            selectdataPrevious[val] = val; //set the list of current values for future comparison
            $('<option />', {value: val, text: selectdata[val]}).appendTo(deviceDropDownMenu);
        }
    }    

    //
    //user selects a new entry from the Pi/device menu
    //    
    deviceDropDownMenu.change(function() {
        //console.log("[DEBUG] deviceDropDownMenu change " + deviceDropDownMenu.val());

        _this.selectPi(deviceDropDownMenu.val());
    });

    
    //
    //user focuses on an entry in the Pi/device menu
    //
    deviceDropDownMenu.focusin(function() {
        if(_this.currentlyRecording){
            return;
        }
        _this.reselectPi = true;
        //which Pi were we selected on?
        _this.currentlySelectedPi = deviceDropDownMenu.val();
        
        _this.loadPiList();
        
        //console.log("[DEBUG] focusin ");
    }); 
    
    //
    //reselect the previously selected pi
    //  
    this.reselectPreviousPi = function(){
        var foundPi = false;
        _this.reselectPi = false;
        for(var val in selectdata) {
            if(selectdata[val] == _this.currentlySelectedPi){
                foundPi = true;
                deviceDropDownMenu.val(_this.currentlySelectedPi);
                break;
            }
        }
        if(!foundPi){
            deviceDropDownMenu.val("none");
            this.selectNoPi();
        }        
    }
    
     //
    //reselect the current pi, allows us to get messages from a pi after sending it some other message
    //  
    this.reselectCurrentPi = function(){
        //console.log("[DEBUG] reselectCurrentPi ");
        _this.selectPi(deviceDropDownMenu.val());
        
    }
    
    //
    // call this when we want to stop receiving sensor data from Pis, and set device selection drop down to None
    // need to call when we open a program, create a new program
    //
    this.resetPiSelectionState = function(){
        
        //select none from the menu
        // not needed if we regen the list
        deviceDropDownMenu.val("none");
        
        //set up everything else in the UI
        //set state of run program button
        //runProgramButton.text("run program");
        runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program</span>');
        runProgramButton.removeClass("rungreen");
        runProgramButton.removeClass("stopred");        
        runProgramButton.prop("disabled", true);
        //set connection status
        var connectionStatusDiv = $('#program-editor-recordingstatus').text("Connected to ");    
        
        //stop listening for messages from any existing Pi
        clearSubscriptions();
        removeMessageHandlers();
    }
    
    //
    //function to select no pis from the list
    //      
    this.selectNoPi = function(){        
        //set state of run program button
        //runProgramButton.text("run program");
        runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program</span>');
        runProgramButton.removeClass("rungreen");
        runProgramButton.removeClass("stopred");        
        runProgramButton.prop("disabled", true);
        //set connection status
        var connectionStatusDiv = $('#program-editor-recordingstatus').text("Connected to ");    
        
        //stop listening for messages from any existing Pi
        clearSubscriptions();
        removeMessageHandlers();
        
        //
        // Clear any old sensor data being displayed.
        // Do this by calling the handler with an empty array of
        // data.
        //            
        editor.getProgramEditorPanel().handleSensorData(null, { data: [] });
                
    }
    //
    //change editor state to running program
    //     
    this.enterRunProgramState = function(){
        editor.getProgramEditorPanel().toggleRunProgramMode(true);
    }
    //
    //change editor state to not running program
    // 
    this.exitRunProgramState = function(){
        _this.currentlyRecording = false;

        //update button
        //runProgramButton.text("run program on " + _this.currentControllerName);
        runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program on ' + _this.currentControllerName + '</span>');
        runProgramButton.addClass("rungreen");
        runProgramButton.removeClass("stopred");        
        runProgramButton.prop("disabled", false); 
        //enable drop down
        deviceDropDownMenu.prop("disabled", false);     
        //update connection text
        var contents = $('#program-editor-recordingstatus').text("Connected to ");
        
        editor.getProgramEditorPanel().toggleRunProgramMode(false);
    }
    
    //
    //function to simulate the program editor state when "run program" button is pressed, used when viewing program from livedata block
    //      
    this.simulateRunProgramState = function(piName, piPath, datasetLocation){
        //add pi to list and select it
        //this.addPiToDataList(999, piName);
        $('<option />', {value: piName, text: piName}).appendTo(deviceDropDownMenu);
        deviceDropDownMenu.val(piName);
        
        //set the state of the run button
        runProgramButton.prop("disabled", false); 
        //runProgramButton.text("stop program on " + piName);
        runProgramButton.html('<span class="glyphicon glyphicon-stop"></span><span class="deviceRunButtonText">stop program on ' + piName + '</span>');
        runProgramButton.removeClass("rungreen");
        runProgramButton.addClass("stopred");        
        var contents = $('#program-editor-recordingstatus').text("Running on ");
        deviceDropDownMenu.prop("disabled", true); 
        
        this.enterRunProgramState();
        
         //save recording values for stopping later on
        _this.currentControllerPath = piPath; //path to the pi, e.g., testing/rpi24
        _this.currentControllerName = piName; //name of the pi. e.g., rpi24
        _this.currentlyRecording = true;
        _this.currentRecordingLocation = datasetLocation; //dataset location
                
        //get messages from the Pi
        this.reselectCurrentPi(); //_this.selectPi(deviceDropDownMenu.val());
        
    }
    
    
    //
    // Handle selection of pi
    //
    this.selectPi = function(deviceName) {
        if(deviceName == "none"){ 
            //invalid index, none was probably selected
            this.selectNoPi();
            
            return;
        }
        if(!_this.currentlyRecording){
            runProgramButton.prop("disabled", false);
        }
        
        for(var i = 0; i < this.availableControllers.length; i++) {
            //var div = $('#pi-selector-controller-'+i);
            if(deviceName == this.availableControllers[i].name) { 
            
                this.selectedController = this.availableControllers[i];

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
                
                if(!_this.currentlyRecording){
                   runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program on ' + controller.name + '</span>');                   
                   runProgramButton.addClass("rungreen");
                   runProgramButton.removeClass("stopred");
                    //
                    // Clear any old sensor data being displayed.
                    // Do this by calling the handler with an empty array of
                    // data.
                    //
                    editor.getProgramEditorPanel().handleSensorData(null, { data: [] });                    
                }
                
                //clear any existing subscriptions
                clearSubscriptions();
                
                //removeMessageHandlers(); //this will get called downstream

                var sendSensorData = MessageExecutor(execParams);
                sendSensorData.execute();

            } 
        }
    }
    
    

    //
    // click on the record button
    //
    runProgramButton.click( function() {
        runProgramButton.prop("disabled", true); 
                 
        if(_this.currentlyRecording){
            runProgramButton.html('<span class="glyphicon glyphicon-time"></span><span class="deviceRunButtonText">stopping program... please wait' + '...</span>');
            _this.stopRecording();
            return;
        }
        else{
            runProgramButton.html('<span class="glyphicon glyphicon-time"></span><span class="deviceRunButtonText">starting program... please wait' + '...</span>');
        }

        var dsName = $('#dataset-name-textfield').val();
        var controller = _this.selectedController;
        var programSpec = editor.getProgramSpec();

        if(controller == null) {
            alert("No Pi selected.");
            runProgramButton.prop("disabled", false); 
            runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program on ' + _this.selectedController + '</span>');
            return;
        }
       
        if(!programSpec) {
            alert("Cannot find program.");
            runProgramButton.prop("disabled", false); 
            runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program on ' + controller.name + '</span>');
            return;
        }

        //give the dataset a default name in the case where there is no data storage block and we want to create an empty dataset
        var dsName = "";
        var haveDsBlock = editor.getProgramEditorPanel().programHasDataStorageBlock();
        if(!haveDsBlock){
            var d = new Date();
            var year = d.getFullYear();
            var month = d.getMonth() + 1;
            var day = d.getDate();
            var hour = d.getHours();
            var min = d.getMinutes();
            var sec = d.getSeconds();
            
            var potentialName = "ds" + year;
            if(month < 10)
                potentialName = potentialName + "0" + month;
            else
                potentialName = potentialName + month;
            if(day < 10)
                potentialName = potentialName + "0" + day + "_";
            else
                potentialName = potentialName + day + "_";
            if(hour < 10)
                potentialName = potentialName + "0" + hour;
            else
                potentialName = potentialName + hour;
            if(min < 10)
                potentialName = potentialName + "0" + min;
            else
                potentialName = potentialName + min;
            if(sec < 10)
                potentialName = potentialName + "0" + sec;
            else
                potentialName = potentialName + sec;
            
            dsName = potentialName;
        }
        else{
            dsName = editor.getProgramEditorPanel().getRecordingLocationFromDataBlock();
            if(dsName == ""){
                alert("Please enter a valid dataset name on the data storage block.");
                return;
            }    
            
            var haveValidSequenceNames = editor.getProgramEditorPanel().validSequenceNames();
            if(!haveValidSequenceNames){
                alert("Please enter a valid name for each type connected to the data storage block.");
                return;
            }
            //make sure all sequences have names    
        }
        //WTD WTD WTD this is obsolete now, but might still be needed to run the program, eventually want to remove
        var recordingRate = 1;

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
            alert("Error: The following blocks do not have available sensors on " + controller.name + ":" + names);
            runProgramButton.prop("disabled", false);
            runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program on ' + controller.name + '</span>');            
            return;
        }

        //
        // Set name on program
        //
        var name = jQuery('#program-editor-filename').val();
        //var name = editor.getFileManager().getProgramName();
        programSpec.name = name;
        //console.log("[DEBUG] Set name: " + programSpec.name);

        if(!programSpec.name || programSpec.name == '') {
            alert("No name set on program. " + programSpec.name);
            runProgramButton.prop("disabled", false); 
            runProgramButton.html('<span class="glyphicon glyphicon-play"></span><span class="deviceRunButtonText">run program on ' + controller.name + '</span>');                        
            return;
        }
        
        //save recording values for stopping later on
        _this.currentControllerPath = controller.path;
        _this.currentControllerName = controller.name;
        _this.currentlyRecording = true;
        _this.currentRecordingLocation = '/testing/student-folders/' + g_user.user_name + '/datasets/' + dsName;
        
        //
        // Send message to start recording.
        //
        var startRecordingParams = {};

        startRecordingParams.target_folder  = controller.path;
        startRecordingParams.src_folder     = controller.path;
        startRecordingParams.message_type   = 'start_recording';
        startRecordingParams.message_params = 
                    {   rate: recordingRate,
                        recording_location: '/testing/student-folders/' + g_user.user_name + '/datasets/' + dsName,
                        diagram:    programSpec,
                        username:   g_user.user_name };

        startRecordingParams.response_func = function(ts, params) {
            if(params.success) {
                $('#dataset-name-textfield').val('');
                alert("Program is now running on " + controller.name);
                console.log("Program is now running on " + controller.name, params);
                       
                runProgramButton.prop("disabled", false); 
                runProgramButton.html('<span class="glyphicon glyphicon-stop"></span><span class="deviceRunButtonText">stop program on ' + controller.name + '</span>');
                runProgramButton.removeClass("rungreen");
                runProgramButton.addClass("stopred");
                var contents = $('#program-editor-recordingstatus').text("Running on ");
                deviceDropDownMenu.prop("disabled", true); 
                
                this.enterRunProgramState();
                
                this.reselectCurrentPi(); //_this.selectPi(deviceDropDownMenu.val());
            } else {
                runProgramButton.prop("disabled", false); 
                alert("Error running program on " + controller.name + ": " + params.message);
            }
        }
        var startRecording = MessageExecutor(startRecordingParams);
        startRecording.execute();

    });
    
    //wtd wtd wtd we now have duplicate functions, this also lives in recording-status-panel
    //
    // Stop recording
    //
    this.stopRecording = function() {

        //var metadata = dataSetView.getDataSet().metadata;

        console.log("[DEBUG] Stopping program", _this.currentRecordingLocation);
    
        //
        // Send message over websocket and handle response
        //
        var execParams = {  
                message_type:   'stop_diagram',
                message_params: { 
                    stop_location: _this.currentRecordingLocation },
                    target_folder:  _this.currentControllerPath,
                    src_folder:     _this.currentControllerPath,
                    response_func:  function(ts, params) {
                    if(params.success) {
                        alert("Program stopped.");
                        
                        this.exitRunProgramState();
                                
                        this.reselectCurrentPi(); 

                    } else {
                        runProgramButton.prop("disabled", false); 
                        alert("Error stopping program: " + params.message);
                    }
                } 
            };

        var stopDiagram = MessageExecutor(execParams);
        stopDiagram.execute();
    }
    

    this.loadPiList();
    
    return this;
}
