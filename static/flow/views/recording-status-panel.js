//
// A widget that shows available Pis and record button.
//
var RecordingStatusPanel = function(options) {

    var container   = options.container;
    var dataSetView = options.dataSetView;

    var _this       = this;

    var panel       = jQuery('<div>', { id: 'recording-status-panel',
                                    css: {  width: '200px',
                                            float: 'right' } } );

    var table       = jQuery('<table>');

    var stopButton  = jQuery('<button>', 
                        {       class: '.color-stop-recording-button',
                                css: {
                                    width:      '100%',
                                    padding:    '5px',
                                    left:       '0px',
                                    bottom:     '0px'   }});
    stopButton.text('Stop Recording');

    var recStatus   = $('<div>').html('<i>Unknown Status</i>');
    var piName      = $('<div>').text('RPi00');
    var startTime   = $('<div>').text('Started: 10/15/17');

    Util.addTableRow(table, [recStatus] );
    Util.addTableRow(table, [piName]);
    Util.addTableRow(table, [startTime]);
    Util.addTableRow(table, [stopButton] );

    panel.append(table);
    container.append(panel);

    //
    // Display panel with latest loaded data set metadata
    //
    this.show = function() {
        var metadata = dataSetView.getDataSet().metadata;
        recStatus.html(metadata.recording ? 
                        '<i>Currently Recording</i>' :
                        '<i>Not Recording</i>' );
        piName.text('RPi16');
        startTime.text('Started: 11/11/17');
    }

    //
    // Stop recording
    //
    stopButton.click( function() {

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

    return this;
}
