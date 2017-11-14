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
                                                float:      'right',
                                                padding:    '0px',
                                                top:        '0px',
                                                right:      '0px'    } });

    var closeButton = $('<div>', { css: {
                                    border:             '1px solid grey',
                                    cursor:             'pointer',
                                    textAlign:          'center',
                                    backgroundColor:    'white',
                                    verticalAlign:      'top',
                                    padding:            '2px',
                                    display:            'inline-block' }});

    closeButton.text('X');
    buttonPanel.append(closeButton);

    closeButton.click( function() {
        showTopLevelView('landing-page-view');
    });

    var stopButton  = jQuery('<button>', 
                        {       class: '.color-stop-recording-button',
                                css: {
                                    width:      '98%',
                                    padding:    '5px',
                                    left:       '0px',
                                    bottom:     '0px'   }});
    stopButton.text('Stop Recording');

    var recStatus   = $('<div>').html('<i>Unknown Status</i>');
    var piName      = $('<div>').text('');
    var startTime   = $('<div>').text('Started: N/A');

    Util.addTableRow(table, [buttonPanel],  {   varticalAlign: 'top' } );

    Util.addTableRow(table, [recStatus],    {   textAlign:  'right',
                                                padding:    '5px'      } );
    Util.addTableRow(table, [piName],       {   textAlign:  'right',
                                                padding:    '5px'      } );
    Util.addTableRow(table, [startTime],    {   textAlign:  'right',
                                                padding:    '5px'      } );
    Util.addTableRow(table, [stopButton] );

    panel.append(table);
    container.append(panel);

    //
    // Display panel with latest loaded data set metadata
    //
    this.show = function() {
        var metadata    = dataSetView.getDataSet().metadata;
        var recording   = metadata.recording;
        var start       = metadata.start_time;
        recStatus.html(recording ? 
                        '<i>Currently Recording</i>' :
                        '<i>Not Recording</i>' );
        piName.text(metadata.controller_name);
        startTime.text('Started: ' + 
                        Util.getLocalDate(start) + " " +
                        Util.getLocalTime(start) );
        if(recording) {
            stopButton.show();
        } else {
            stopButton.hide();
        }
    }

    //
    // Stop recording
    //
    stopButton.click( function() {

        var metadata = dataSetView.getDataSet().metadata;
        
        console.log("[DEBUG] Stopping recording", metadata.recording_location);

        //
        // Send message over websocket and handle response
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
                        stopButton.hide();
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
