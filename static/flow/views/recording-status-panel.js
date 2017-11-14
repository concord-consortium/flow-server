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

    var buttonPanel = $('<div>', { css: {       textAlign:  'center',
                                                position:   'absolute',
                                                float:      'right',
                                                margin:     '0 auto',
                                                padding:    '0px',
                                                top:        '0px',
                                                right:      '0px'    } });

    var closeButton = $('<div>', { css: {
                                    cursor:             'pointer',
                                    textAlign:          'center',
                                    backgroundColor:    'white',
                                    verticalAlign:      'top',
                                    display:            'inline-block',
                                    paddingTop:         '5px',
                                    paddingRight:       '4px' } });

    closeButton.text('X');
    buttonPanel.append(closeButton);

    closeButton.click( function() {
        showTopLevelView('landing-page-view');
    });

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

    Util.addTableRow(table, [buttonPanel] );
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
        piName.text(metadata.controller_name);
        startTime.text('Started: ' + metadata.start_time);
    }

    //
    // Stop recording
    //
    stopButton.click( function() {

        var metadata = dataSetView.getDataSet().metadata;
        
        console.log("[DEBUG] Stopping recording", metadata.recording_location);

        //
        // Send message over websocket
        //
        var execParams = {  
                message_type:   'stop_diagram',
                message_params: { 
                    stop_location: metadata.recording_location },
                target_folder:  metadata.controller_path,
                src_folder:     metadata.controller_path,
                response_func:  function(ts, params) {
                    if(params.success) {
                        alert("Recording stopped.");
                    } else {
                        alert("Error stopping recording: " + params.message);
                    }
                } 
            };

        var stopDiagram = MessageExecutor(execParams);
        stopDiagram.execute();

    });

    return this;
}
