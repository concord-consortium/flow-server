//
// A widget that shows available Pis and record button.
//
var PiSelectorPanel = function(options) {

    var deviceDropDownList   = options.deviceDropDownList;
    var deviceSelectionContainer   = options.deviceSelectionContainer;
    var deviceSelectedText   = options.deviceSelectedText;
    var editor      = options.editor;
    var runProgramButton = options.runProgramButton;
    var viewDataButton = options.viewDataButton;

    var _this = this;

    var piMenuDataPrevious = {};
    var piMenuData = {};

    //
    // Stored vals for when we stop the recording
    //
    var currentlyRecording = false;
    var currentlySelectedPi;
    var currentRecordingLocation;
    var currentControllerPath;
    var currentControllerName;
    var currentRecordingDataset;

    //check if sensor data is delayed or has stopped updating
    var loadPiListTimer;
    var loadPiListTimerInterval = 10000; //30 seconds

    //
    // Devices: list of available pis and refresh button
    //
    this.availableControllers = [];
    this.selectedController = null;

    //
    //function to determine if a pi is online or offline
    //
    this.isPiOffline = function(piName){
        var retval = false;
        //if we have no list of pis chances are we haven't received a response from the server
        if(this.availableControllers.length == 0){
            return retval;
        }
        //what is the status of pi?
        for(var i = 0; i < _this.availableControllers.length; i++) {
            var controller = _this.availableControllers[i];
            if(controller.name == piName){
                if(!controller.online) {
                    retval = true;
                    return retval;
                }
                else{
                    retval = false;
                    return retval;
                }
            }
        }
        return retval;
    }
    //
    // update any running program blocks on landing page based on online/offline pis
    //
    var updateActivityFeed = function (){
        if(this.availableControllers.length == 0){
            return;
        }
        //find any running program blocks
        for(var i = 0; i < _this.availableControllers.length; i++) {
            var controller = _this.availableControllers[i];
            var potentialButtonId = "#liveDataStopButton" + controller.name;
            var potentialStatusId = "#liveDataStatusDiv" + controller.name;
            var potentialButton = $(potentialButtonId);
            var potentialStatusDiv = $(potentialStatusId);
            if(potentialButton.length && potentialStatusDiv.length){
                if(!controller.online) {
                    potentialButton.show();
                    potentialStatusDiv.hide();
                }
                else{
                    potentialButton.hide();
                    potentialStatusDiv.show();
                }
            }
        }
        restartLoadPiListTimer(loadPiListTimerInterval);
    }


    //
    // set default state of topbar program controls UI
    //
    this.setProgramControlsToNeutral = function() {
        updateProgramButtons(true, false, false);
        deviceSelectionContainer.prop("disabled", false);
        deviceSelectionContainer.removeClass("noHover");
        _this.currentlyRecording = false;
        _this.selectedController = null;
    }


    //
    // AJAX call and handler for listing Pis.
    //
    this.loadPiList = function(rebuildMenu) {
        // console.log("[DEBUG] loadPiList loading...");

        var url = '/ext/flow/controllers';

        $.ajax({
            url:        url,
            method:     'POST',
            data:       { csrf_token: g_csrfToken },
            success:    function(data) {
                var response = JSON.parse(data);

                console.log("[DEBUG] List controllers response", response);

                if(response.success) {
                    //we got the list of pis, clear existing list
                    for (var member in piMenuData) delete piMenuData[member];
                    piMenuData["none"] = "none";

                    _this.availableControllers = [];
                    _this.availableControllers = response.controllers;
                    _this.availableControllers.sort(Util.sortByName);

                    console.log("[DEBUG] Creating Pi table...",
                                _this.availableControllers);

                    //
                    //add all pi not in recording state to drop down menu.
                    //
                    for(var i = 0; i < _this.availableControllers.length; i++) {
                        var controller = _this.availableControllers[i];

                        if(!controller.online) {
                            continue;
                        }
                        if(controller.status.recording_interval != null) {
                            continue;
                        }
                        piMenuData[controller.name] = controller.name;
                    }
                    if(rebuildMenu)
                        addPisToMenu();
                    else
                        rebuildPiMenuIfNeeded();

                    updateActivityFeed();

                } else {
                    if(rebuildMenu)
                        addPisToMenu();
                     else
                        rebuildPiMenuIfNeeded();

                    console.log("[ERROR] Error listing controllers", response);
                }

            },
            error: function(data) {
                if(rebuildMenu)
                    addPisToMenu();
                else
                    rebuildPiMenuIfNeeded();

                console.log("[ERROR] List controllers error", data);
            },
        });
    };

    //
    //add an entry for the pi to the drop down menu
    //
    var addPisToMenu = function(){
        //delete previous menu data
        for (var member in piMenuDataPrevious) delete piMenuDataPrevious[member];
        var menuData = createMenuData();
        //add new list of entries into the list and store the entries in piMenuDataPrevious
        for(var val in piMenuData) {
            piMenuDataPrevious[val] = val; //set the list of current values for future comparison
            menuData.add(val, deviceChanged, {name: val});
        }
        updateDropDownList({dropDownList: deviceDropDownList, menuData: menuData});
    }

    //
    //a new entry has been chosen in the device drop down
    //
    var deviceChanged = function(e){
        //console.log("[DEBUG] deviceChanged change " + e.data.name);
        deviceSelectedText.text(e.data.name);
        _this.selectPi(e.data.name);
    }

    //
    //update entries in the device dropdown
    //
    var updateDropDownList = function(params) {
        var ul = params.dropDownList;
        ul.empty();
        var menuData = params.menuData;
        for (var i = 0; i < menuData.labels.length; i++) {
            var li = $('<li>', {role: 'presentation'});
            $('<a>', {
                role: 'menuitem',
                tabindex: '-1',
                html: menuData.labels[i]
            }).appendTo(li).click(menuData.args[i], menuData.functions[i]);
            li.appendTo(ul);
        }
        return ul;
    }

    //
    //get list of pis in case it has changed
    //
    deviceSelectionContainer.mousedown(function() {
        if(_this.currentlyRecording){
            return;
        }
        //which Pi was selected?
        _this.currentlySelectedPi = deviceSelectedText.text();
        _this.loadPiList(false);
    });


    //
    //rebuild pi menu
    //
    var rebuildPiMenuIfNeeded = function(){
        //is this the same as the previous list?
        if(JSON.stringify(piMenuData) != JSON.stringify(piMenuDataPrevious)){
            addPisToMenu();
            reselectPreviousPi();
        }
    }

    //
    //reselect the previously selected pi
    //
    var reselectPreviousPi = function(){
        var foundPi = false;
        for(var val in piMenuData) {
            if(piMenuData[val] == _this.currentlySelectedPi){
                foundPi = true;
                deviceSelectedText.text(_this.currentlySelectedPi);
                break;
            }
        }
        if(!foundPi){
            deviceSelectedText.text("none");
            selectNoPi();
        }
    }

    //
    //reselect the current pi, allows us to get messages from a pi after sending it some other message
    //
    var reselectCurrentPi = function(){
        //console.log("[DEBUG] reselectCurrentPi ");
        _this.selectPi(deviceSelectedText.text());
    }

    //
    // call this when we want to stop receiving sensor data from Pis, and set device selection drop down to None
    // need to call when we open a program, create a new program
    //
    this.resetPiSelectionState = function(){

        //select none from the menu
        // not needed if we regen the list
        deviceSelectedText.text("none");

        updateProgramButtons(true, false, false);

        //stop listening for messages from any existing Pi
        clearSubscriptions();
        removeMessageHandlers();
    }

    //
    //update state of the Run/Stop and View buttons
    //
    var updateProgramButtons = function(runDisabled, showStop, showView){
        if(showStop){
            runProgramButton.html('stop');
            runProgramButton.addClass("topbar-stop-button");
        }
        else{
            runProgramButton.html('run');
            runProgramButton.removeClass("topbar-stop-button");

        }

        if(showView){
            viewDataButton.prop("disabled", false);
            viewDataButton.removeClass("button-disabled noHover");
            viewDataButton.show();
        }
        else{
            viewDataButton.hide();
        }

        if(runDisabled){
            runProgramButton.prop("disabled", true);
            runProgramButton.addClass("button-disabled noHover");
        }
        else{
            runProgramButton.prop("disabled", false);
            runProgramButton.removeClass("button-disabled noHover");
        }
    }

    //
    //function to select no pis from the list
    //
    var selectNoPi = function(){
        //set state of run program button
        updateProgramButtons(true, false, false);

        //stop listening for messages from any existing Pi
        clearSubscriptions();
        removeMessageHandlers();

        //handle unselection of pi, clear program editor state
        editor.getProgramEditorPanel().piUnselected();

    }
    //
    //change editor state to running program
    //
    var enterRunProgramState = function(){
        editor.getProgramEditorPanel().toggleRunProgramMode(true);
    }
    //
    //called when we open a program
    //
    this.resetStateOnProgramLoad = function(){
        exitRunProgramState();
    }
    //
    //change editor state to not running program
    //
    var exitRunProgramState = function(){
        _this.currentlyRecording = false;

        updateProgramButtons(false, false, false);

        //enable drop down
        deviceSelectionContainer.prop("disabled", false);
        deviceSelectionContainer.removeClass("noHover");
        editor.getProgramEditorPanel().toggleRunProgramMode(false);
    }

    //
    //function to simulate the program editor state when "run program" button is pressed, used when viewing program from livedata block
    //
    this.simulateRunProgramState = function(recordingDataset){

        var piName = recordingDataset.metadata.controller_name;
        var piPath = recordingDataset.metadata.controller_path;
        var datasetLocation = recordingDataset.metadata.recording_location;

        //add pi to list and select it
        var isPresent = false;
        for(var val in piMenuData) {
            if(val == piName){
                isPresent = true;
                break;
            }
        }
        if(!isPresent){
            piMenuDataPrevious[piName] = piName;
            var menuData = createMenuData();
            for(var val in piMenuData) {
                menuData.add(val, deviceChanged, {name: val});
            }
            menuData.add(piName, deviceChanged, {name: piName});
            updateDropDownList({dropDownList: deviceDropDownList, menuData: menuData});
        }

        deviceSelectedText.text(piName);
        var haveDsBlock = editor.getProgramEditorPanel().programHasDataStorageBlock();

        updateProgramButtons(false, true, haveDsBlock);

        var contents = $('#program-editor-recordingstatus').text("Running on ");
        deviceSelectionContainer.prop("disabled", true);
        deviceSelectionContainer.addClass("noHover");
        enterRunProgramState();

         //save recording values for stopping later on
        _this.currentControllerPath = piPath; //path to the pi, e.g., testing/rpi24
        _this.currentControllerName = piName; //name of the pi. e.g., rpi24
        _this.currentlyRecording = true;
        _this.currentRecordingLocation = datasetLocation; //dataset location
        _this.currentRecordingDataset = recordingDataset;

        //get messages from the Pi
        reselectCurrentPi();
    }


    //
    // Handle selection of pi (user can select from menu, called after start program, called when simulating program run)
    //
    this.selectPi = function(deviceName) {
        if(deviceName == "none"){
            //invalid index, none was probably selected
            selectNoPi();
            return;
        }
        if(!_this.currentlyRecording){
            runProgramButton.prop("disabled", false);
            runProgramButton.removeClass("button-disabled noHover");
        }

        for(var i = 0; i < this.availableControllers.length; i++) {
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
                   updateProgramButtons(false, false, false);
                    //
                    // Clear any old sensor data being displayed.
                    // Do this by calling the handler with an empty array of
                    // data.
                    //
                    editor.getProgramEditorPanel().handleSensorData(null, { data: [] });
                }

                //clear any existing subscriptions
                clearSubscriptions();

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
        runProgramButton.addClass("button-disabled noHover");

        if(_this.currentlyRecording){
            viewDataButton.prop("disabled", true);
            viewDataButton.addClass("button-disabled noHover");
            runProgramButton.html('stopping...');
            _this.stopRecording();
            return;
        }
        else{
            runProgramButton.html('starting...');
        }

        var dsDisplayedName = "";
        var dsFileName = "";
        var controller = _this.selectedController;
        var programSpec = editor.getProgramSpec();

        if(controller == null) {
            modalAlert({
                title: 'Cannot Run Program',
                message: "No Pi selected.",
                nextFunc: function() {
                    updateProgramButtons(false, false, false);
                }});
            return;
        }

        if(!programSpec) {
            modalAlert({
                title: 'Cannot Run Program',
                message: "Cannot find program.",
                nextFunc: function() {
                    updateProgramButtons(false, false, false);
                }});
            return;
        }

        //create a file name for the dataset based on current date and time
        var d = new Date();
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var min = d.getMinutes();
        var sec = d.getSeconds();

        var potentialName = "dataset_" + year;
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

        dsFileName = potentialName;


        //give the dataset a default name in the case where there is no data storage block and we want to create an empty dataset
        var haveDsBlock = editor.getProgramEditorPanel().programHasDataStorageBlock();
        if(!haveDsBlock){
            dsDisplayedName = dsFileName;
        }
        else{
            dsDisplayedName = editor.getProgramEditorPanel().getDataStorageBlockDisplayedName();
            if(dsDisplayedName == ""){
                modalAlert({
                    title: 'Cannot Run Program',
                    message: "Please enter a valid dataset name on the data storage block.",
                    nextFunc: function() {
                        updateProgramButtons(false, false, false);
                    }});
                return;
            }

            var haveValidSequenceNames = editor.getProgramEditorPanel().validSequenceNames();
            if(!haveValidSequenceNames){
                 modalAlert({
                    title: 'Cannot Run Program',
                    message: "Please enter a valid name for each type connected to the data storage block.",
                    nextFunc: function() {
                        updateProgramButtons(false, false, false);
                    }});
                return;
            }
            //make sure all sequences have names
        }

        //
        // Set name on program
        //
        var displayedName = jQuery('#program-editor-filename').val();
        programSpec.name = ""; //don't have an actual folder location for this "virtual" program
        programSpec.archived = false;
        programSpec.displayedName = displayedName;
        //console.log("[DEBUG] Set name: " + programSpec.name);

        if(!programSpec.displayedName || programSpec.displayedName == '') {
            modalAlert({
                title: 'Cannot Run Program',
                message: "No name set on program.",
                nextFunc: function() {
                    updateProgramButtons(false, false, false);
                }});
            return;
        }

        //save recording values for stopping later on
        _this.currentControllerPath = controller.path;
        _this.currentControllerName = controller.name;
        _this.currentlyRecording = true;
        _this.currentRecordingLocation = '/testing/student-folders/' + g_user.user_name + '/datasets/' + dsFileName;

        _this.currentRecordingDataset = {
                        name: dsFileName,
                        metadata: {
                            controller_name: _this.currentControllerName,
                            controller_path: _this.currentControllerPath,
                            program: programSpec,
                            recording: true,
                            recording_interval: 1, //this is obsolete, but might still be needed to run the program, eventually want to remove
                            recording_location: _this.currentRecordingLocation,
                            recording_user: g_user.user_name,
                            displayedName: dsDisplayedName
                            }
                        };

        //
        // Send message to start recording.
        //
        var startRecordingParams = {};

        startRecordingParams.target_folder  = controller.path;
        startRecordingParams.src_folder     = controller.path;
        startRecordingParams.message_type   = 'start_recording';
        startRecordingParams.message_params =
                    {   rate: 1, //this is obsolete, but might still be needed to run the program, eventually want to remove
                        recording_location: '/testing/student-folders/' + g_user.user_name + '/datasets/' + dsFileName,
                        diagram:    programSpec,
                        username:   g_user.user_name };

        startRecordingParams.response_func = function(ts, params) {
            if(params.success) {
                $('#dataset-name-textfield').val('');

                modalAlert({title: 'Run Program', message: 'Program is now running on ' + controller.name, nextFunc: function() {
                    console.log("Program is now running on " + controller.name, params);
                    updateProgramButtons(false, true, haveDsBlock);

                    deviceSelectionContainer.prop("disabled", true);
                    deviceSelectionContainer.addClass("noHover");
                    enterRunProgramState();

                    reselectCurrentPi();
                }});
            } else {
                runProgramButton.prop("disabled", false);
                runProgramButton.removeClass("button-disabled noHover");
                modalAlert({
                    title: 'Program Run Error',
                    message: "Error running program on " + controller.name + ": " + params.message,
                    nextFunc: function() {
                        updateProgramButtons(false, false, false);
                    }});
            }
        }
        var startRecording = MessageExecutor(startRecordingParams);
        startRecording.execute();

    });

    //
    // Stop recording
    //
    this.stopRecording = function(refreshCallback, recordingLocation, controllerPath) {

        var stopRecordingLocation = _this.currentRecordingLocation;
        var stopControllerPath = _this.currentControllerPath;
        var resetDeviceControls = true;

        //typically stop program via controller information currently configured in the editor
        //if user request to stop program from some other dataflow component (activity feed, dataview)
        //be sure to use controller information from function params and maintain editor UI state
        if(recordingLocation != null && controllerPath != null){
            stopRecordingLocation = recordingLocation;
            stopControllerPath = controllerPath;
            if(stopControllerPath != _this.currentControllerPath){
                resetDeviceControls = false;
            }
        }

        console.log("[DEBUG] Stopping program", stopRecordingLocation);

        //
        // Send message over websocket and handle response
        //
        var execParams = {
                message_type:   'stop_diagram',
                message_params: {
                    stop_location: stopRecordingLocation },
                    target_folder:  stopControllerPath,
                    src_folder:     stopControllerPath,
                    response_func:  function(ts, params) {
                    if(params.success) {
                        modalAlert({title: 'Stop Program', message: 'Program stopped', nextFunc: function() {
                            if(typeof refreshCallback === "function")
                                refreshCallback();
                            if(resetDeviceControls){
                                exitRunProgramState();
                                reselectCurrentPi();
                            }
                        }});
                    } else {
                        if(resetDeviceControls){
                            //failed to stop, restore stop button
                            runProgramButton.html('stop');
                            runProgramButton.prop("disabled", false);
                            runProgramButton.removeClass("button-disabled noHover");
                            viewDataButton.prop("disabled", false);
                            viewDataButton.removeClass("button-disabled noHover");
                        }

                        modalAlert({
                            title: 'Program Stop Error',
                            message: "Error stopping program: " + params.message,
                            nextFunc: function() {
                            }});
                    }
                }
            };

        var stopDiagram = MessageExecutor(execParams);
        stopDiagram.execute();
    }

    //
    // is the activity feed in a state where it contains a program?
    //
    function activityFeedContainsProgram() {
        if ($("live-data-item-holder").length) {
            return true;
        }
        else {
            return false;
        }
    }

    //
    // timer fired, do we need a new list of pis?
    //
    function checkUpdatePiList() {
        clearTimeout(loadPiListTimer);

        // refresh list if we have an active program in the activity feed
        // in the future, other actions might trigger refresh of list
        var updateActivityFeedPrograms = activityFeedContainsProgram();
        if (updateActivityFeedPrograms){
            _this.loadPiList(false);
        }
        else {
            restartLoadPiListTimer(loadPiListTimerInterval);
        }
    }
    //
    // restart timer to determine if we need to get an updated list of pis
    //
    function restartLoadPiListTimer(timeInterval){
        clearTimeout(loadPiListTimer);
        loadPiListTimer = setTimeout(checkUpdatePiList, timeInterval);
    }
    //
    // stop timer that determines if we need to get an updated list of pis
    //
    function disableLoadPiListTimer(){
        clearTimeout(loadPiListTimer);
    }

    //
    // click on the view data button
    //
    viewDataButton.click( function() {
        var lpv = getTopLevelView('landing-page-view');
        lpv.loadDataSet(_this.currentRecordingDataset);
    });

    this.setProgramControlsToNeutral();
    this.loadPiList(true);

    return this;
}
