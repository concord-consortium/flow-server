//
// A widget that shows available Pis and record button.
//
var PiSelectorPanel = function(options) {

    var container   = options.container;
    var editor      = options.editor;

    var _this = this;

    var panel = jQuery('<div>', { id: 'pi-selector-panel',
                                    css: {  width: '200px',
                                            float: 'right' } } );

    var piTable   = jQuery('<table>', { css: { 
                                            width:  '99%',
                                            border: '1px solid lightgrey' } } );

    var piTitleBar = jQuery('<div>', { css: {   position:   'relative',
                                                textAlign:  'center',
                                                height:     '30px' } });

    var piTitle   = jQuery('<div>', { css: {    // position: 'relative',
                                                textAlign: 'center',
                                                paddingTop: '5px'   } });
    piTitle.text('Available Pis');
    piTitleBar.append(piTitle);

    //
    // A panel for refresh and close buttons
    //
    var buttonPanel = $('<div>', { css: {       textAlign:  'center',
                                                position:   'absolute',
                                                float:      'right',
                                                padding:    '0px',
                                                top:        '0px',
                                                right:      '0px'    } });


    var refreshButton = $('<button>', { css: {  textAlign:          'center',
                                                backgroundColor:    'white',
                                                verticalAlign: 'top',
                                                padding:    '1px',
                                                paddingRight: '4px' } });

    refreshButton.html("&#10226;");
    buttonPanel.append(refreshButton);

    var closeButton = $('<button>', { css: {    textAlign:  'center',
                                                backgroundColor: 'white',
                                                verticalAlign: 'top',
                                                padding:        '1px',
                                                paddingRight: '4px' } });

    // closeButton.html("X");
    closeButton.html("&times;");
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
    panel.hide();
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
        var programString = editor.getProgramSpec();

        if(dsName == null || dsName == '') {
            alert("You must specify a dataset name.");
            return;
        }

        if(controller == null) {
            alert("No pi selected.");
            return;
        }
       
        if(programString == null || programString == '') {
            alert("Cannot find program.");
            return;
        }

        var programSpec = JSON.parse(programString);

        //
        // Set name on program (maybe just do this in editor when we get the
        // program spec as a non-string object...)
        //
        var name = editor.getFileManager().getProgramName();
        programSpec.name = name;
        console.log("[DEBUG] Set name: " + programSpec.name);

        if(!programSpec.name || programSpec.name == '') {
            alert("No name set on program. " + programSpec.name);
            return;
        }

        //
        // Need to send message 'set_diagram' followed by 'start_recording'
        //

        //
        // A common set of parameters we will use for sending
        // both messages.
        //
        var execParams = {  
                            target_folder:  controller.path,
                            src_folder:     controller.path  }
       
        //
        // Clone the common params.
        //
        var setDiagramParams = Object.assign({}, execParams);

        //
        // Add parameters specific to 'set_diagram'
        //
        setDiagramParams.message_type   = 'set_diagram';
        setDiagramParams.message_params = { diagram:    programSpec,
                                            username:   g_user.user_name };

        setDiagramParams.response_func  = function(ts, params) {

            //
            // If successfully set_diagram then start_recording...
            //
            if(params.success) {

                var startRecordingParams = Object.assign({}, execParams);
                startRecordingParams.message_type   = 'start_recording';
                startRecordingParams.message_params = { rate: 1,
                                                        recording_location: '/testing/student-folders/' + g_user.user_name + '/datasets/' + dsName };

                startRecordingParams.response_func  = function(ts, params) {
                    if(params.success) {
                        $('#dataset-name-textfield').val('');
                        alert("Recording started.");
                    } else {
                        alert("Error starting recording: " + params.message);
                    }
                }

                var startRecording = MessageExecutor(startRecordingParams);
                startRecording.execute();
                                
            } else {
                alert("Error transferring program to pi: " + params.message);
            }
        }

        var setDiagram = MessageExecutor(setDiagramParams);
        setDiagram.execute();

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
            method:     'GET',
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

    return this;
}
