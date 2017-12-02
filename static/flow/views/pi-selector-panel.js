//
// A widget that shows available Pis and record button.
//
var PiSelectorPanel = function(options) {

    var container   = options.container;
    var editor      = options.editor;

    var _this = this;

    var panel = jQuery('<div>', { id: 'pi-selector-panel',
                                    css: {  position:   'absolute',
                                            right:      '0px',
                                            zIndex:     100,
                                            backgroundColor: 'white',
                                            width:      '200px',
                                            float:      'right' } } );

    var piTable   = jQuery('<table>', { css: { 
                                            width:  '99%',
                                            border: '1px solid lightgrey' } } );

    var piTitleBar = jQuery('<div>', { css: {   position:   'relative',
                                                textAlign:  'center',
                                                height:     '30px' } });

    var piTitle   = jQuery('<div>', { css: {    textAlign: 'center' }});

    var piTitleText = jQuery('<span>', { css: { verticalAlign:  'middle', 
                                                textAlign:      'center',
                                                display:        'inline-block',
                                                paddingTop:     '5px'   } });
    piTitleText.text('Available Pis');
    piTitle.append(piTitleText);

    piTitleBar.append(piTitle);

    //
    // A panel for refresh and close buttons
    //
    var buttonPanel = $('<div>', { css: {       textAlign:  'center',
                                                position:   'absolute',
                                                float:      'right',
                                                margin:     '0 auto',
                                                padding:    '0px',
                                                top:        '0px',
                                                right:      '0px'    } });


    var refreshButton = $('<span>', { css: {     
                                    cursor:             'pointer',
                                    textAlign:          'center',
                                    verticalAlign:      'top',
                                    padding:            '1px',
                                    display:            'inline-block' }});

    refreshButton.html("&#10226;");
    piTitle.append(refreshButton);

    var closeButton = $('<div>', { css: {       
                                    border:             '1px solid grey',
                                    cursor:             'pointer',
                                    textAlign:          'center',
                                    backgroundColor:    'white',
                                    verticalAlign:      'top',
                                    padding:            '2px',
                                    display:            'inline-block' }});

    closeButton.html("X");
    buttonPanel.append(closeButton);

    piTitleBar.append(buttonPanel);
     
    var piList      = jQuery('<div>', 
                        {   id:    'pi-selector-list',
                            css: {
                                overflowY:  'scroll',
                                width:      '100%',
                                height:     '300px'  } });

    var datasetNameLabel = jQuery('<div>').html('<i>Name Dataset</i>');
    var datasetNameField = jQuery('<input>', {  
                                                id: 'dataset-name-textfield',
                                                type: 'text',
                                                css: {  width: '99%'

                                                        } });

    var recordButton = jQuery('<button>', 
                        {       class: 'color-start-recording-button',
                                css: {
                                    width:      '100%',
                                    padding:    '5px',
                                    left:       '0px',
                                    bottom:     '0px'   }});

    recordButton.text('Start Recording');

    Util.addTableRow(piTable, [piTitleBar], { verticalAlign: 'top' } );
    Util.addTableRow(piTable, [piList]);
    Util.addTableRow(piTable, [datasetNameLabel]);
    Util.addTableRow(piTable, [datasetNameField]);
    Util.addTableRow(piTable, [recordButton], 
                        {   padding: '2px',
                            verticalAlign: 'bottom' } );

    panel.append(piTable);
    container.append(panel);

    this.availableControllers = [];
    this.selectedController = null;

    //
    // Refresh the list of Pis
    //
    refreshButton.click( function() {
        _this.loadPiList();
    });

    //
    // Close button (return to My Data view.)
    //
    closeButton.click( function() {
        $('#dataset-name-textfield').val('');
        $('#pi-selector-panel').hide();
        $('#my-data-panel').show();
    });

    //
    // Start recording
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
    // AJAX call and handler for listing Pis.
    //
    this.loadPiList = function() {

        // console.log("[DEBUG] loadPiList loading...");

        _this.availableControllers = [];
        _this.selectedController = null;

        piList.empty();
        piList.text("Loading Pi list...");

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

                    var table = jQuery('<table>', 
                                    { css: {  width: '100%' } } );

                    _this.availableControllers = response.controllers;
                    _this.availableControllers.sort(Util.sortByName);

                    console.log("[DEBUG] Creating Pi table...", 
                                _this.availableControllers);

                    //
                    // Create divs for all pi not in recording state.
                    //
                    for(var i = 0; i < _this.availableControllers.length; i++) {
                        var controller = _this.availableControllers[i];
                        if(controller.status.recording_interval != null) {
                            continue;
                        }

                        var controllerDiv = 
                            $('<div>', 
                                {   id: 'pi-selector-controller-'+i,
                                    css: {  border: '1px solid lightgrey',
                                            width: '100%',
                                            padding: '5px',
                                            cursor: 'pointer' } } );

                        controllerDiv.text(controller.name);
                        controllerDiv.click(i, function(e) {
                            _this.selectPi(e.data);
                            // alert(e.data); 
                        });
                        Util.addTableRow(table, [controllerDiv] );
                    }
                    piList.append(table);

                } else {
                    console.log("[ERROR] Error listing controllers", response);
                }
            },
            error: function(data) {
                console.log("[ERROR] List controllers error", data);
            },
        });
        
    };

    this.loadPiList();

    return this;
}
