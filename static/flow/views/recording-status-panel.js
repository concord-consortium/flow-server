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

    var table       = jQuery('<table>', { css: { width: '100%' } } );

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
        dataSetView.stopLiveUpdates();
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

    var deleteButton = jQuery('<button>', 
                        {       class: '.color-stop-recording-button',
                                css: {
                                    width:      '98%',
                                    padding:    '5px',
                                    left:       '0px',
                                    bottom:     '0px'   }});
    deleteButton.text('Delete DataSet');


    var recStatus   = $('<div>').html('<i>Unknown Status</i>');
    var piName      = $('<div>').text('');

    //
    // Start and end times (in a table)
    //
    var timeTable = $('<table>', { css: { width: '100%' } } );

    var startLabel  = $('<div>').text('Started: ');
    var startTime   = $('<div>').text('N/A');

    var endLabel    = $('<div>').text('Ended: ');
    var endTime     = $('<div>').text('N/A');

    Util.addTableRow(timeTable, 
                        [startLabel, startTime], 
                        { textAlign: 'right' } );

    Util.addTableRow(timeTable, 
                        [endLabel, endTime], 
                        { textAlign: 'right' } );

    //
    // Compose main table
    //

    Util.addTableRow(table, [buttonPanel],  
                        {   varticalAlign: 'top' } );

    Util.addTableRow(table, [recStatus],    
                        {   textAlign:  'right',
                            padding:    '5px'      } );

    Util.addTableRow(table, [piName],       
                        {   textAlign:  'right',
                            padding:    '5px'      } );

    Util.addTableRow(table, [timeTable],    
                        {   textAlign:  'right',
                            padding:    '5px'      } );

	//remove stop and delete buttons from data view for now						
    //Util.addTableRow(table, [stopButton] );
    //Util.addTableRow(table, [deleteButton] );

    panel.append(table);
    container.append(panel);

    //
    // Display panel with latest loaded dataset metadata
    //
    this.show = function() {
        var metadata    = dataSetView.getDataSet().metadata;
        var recording   = metadata.recording;
        var start       = metadata.start_time;
        var end         = metadata.end_time;

        //
        // Set currently recording status
        //
        recStatus.html(recording ? 
                        '<i>Currently Recording</i>' :
                        '<i>Not Recording</i>' );
        piName.text(metadata.controller_name);

        //
        // Show start time
        //
        startTime.html( Util.getLocalDate(start) + "<br/>" +
                        Util.getLocalTime(start) );

        //
        // Show end time
        //
        var endStr = "N/A";
        if(end) {
            endStr = Util.getLocalDate(end) + "<br/>" +
                     Util.getLocalTime(end);
            
        }
        endTime.html(endStr);

        //
        // Set button visibility
        //
		
        if(recording) {
            stopButton.show();
            deleteButton.hide();
        } else {
            stopButton.hide();
            deleteButton.show();
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
                        name = dataSetView.getDataSet().name;

                        $.ajax({
                            url: '/ext/flow/load_dataset',
                            data: { filename:   name,
                                    csrf_token: g_csrfToken },
                            method: 'POST',
                            success: function(data) {
                                var file = JSON.parse(data);
                                dataSetView.loadDataSet( 
                                    {   name: name,
                                        metadata: JSON.parse(file.content) } );
                                alert("Recording stopped.");
                                _this.show();
                            },
                            error: function(data) {
                                console.log("[ERROR] re-load error", data);
                                alert('Error re-loading dataset.')
                            }});

                    } else {
                        alert("Error stopping recording: " + params.message);
                    }
                } 
            };

        var stopDiagram = MessageExecutor(execParams);
        stopDiagram.execute();

    });

    //
    // Delete dataset
    //
    deleteButton.click( function() {
        name = dataSetView.getDataSet().name;
        $.ajax({
            url: '/ext/flow/delete_dataset',
            data: { filename:   name,
                    csrf_token: g_csrfToken },
            method: 'POST',
            success: function(data) {
                alert("Deleted DataSet " + name);
                showTopLevelView('landing-page-view');
            },
            error: function(data) {
                console.log("[ERROR] Error deleting dataset " + name);
                alert("Error deleting dataset " + name)
            }});
    });

    return this;
}
