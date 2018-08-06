//
// Display a recorded dataset
//
var DataSetView = function(options) {

    var base = BaseView(options);
    var liveDataHolder = options.liveDataHolder;

    var savedSequences;
    var savedStartTime;
    var sequenceCount = 0;
    var isLive = false;
    var updateSequenceTime = 0;
    var updateSequenceTimer;

    // console.log("[DEBUG] DataSetView base", base);

    var content = $('#'+base.getDivId());

    base.m_dataset              = null;
    base.m_program              = null;
    base.m_recordingLocation    = null;
    base.m_plotHandler          = null;
    base.m_canvas               = null;

    PLOTTER_PADDING_VERTICAL    = 80;   // px
    RIGHT_PANEL_WIDTH           = 200;  // px
    VERTICAL_MARGIN             = 80;   // px
    HORIZONTAL_MARGIN           = 100;  // px
    PLOTTER_MARGIN_BOTTOM       = 94; // px

    var datasetTopbar = $('<div>', { class: 'dataset-info-topbar' });
    var datasetName = $('<div>', { class: 'dataset-info-text dataset-info-text-title' }).text('Dataset Name: ');

    var closeButton = $('<button>', {   html: 'Close' , class: 'dataflow-button dataset-view-close-button'} );
    closeButton.click(function(e) {
        clearTimeout(updateSequenceTimer);
        base.hide();
        liveDataHolder.show();
    });
    datasetTopbar.append(datasetName);
    datasetTopbar.append(closeButton);

    var datasetDetailsButton = $('<div>', { class: 'dataset-info-text dataset-view-details-button noSelect' });
    var datasetDetails = $('<span>', { class: 'dataset-view-details-text' }).text('Dataset Details');
    datasetDetailsButton.append(datasetDetails);
    var img = $('<img>', { class: 'dataset-view-details-icon' });
    img.attr('src', "flow-server/static/flow/images/icon-arrow-right.png");
    datasetDetailsButton.append(img);

    var detailsDiv = $('<div>', { class: 'dataset-info-details'});
    var programName = $('<div>', { class: 'dataset-info-text' }).text('Program Name: ');
    var recStatus   = $('<div>', { class: 'dataset-info-text' }).html('<i>Unknown Status</i>');
    var piName      = $('<div>', { class: 'dataset-info-text' }).text('Device: ');
    var startTime   = $('<div>', { class: 'dataset-info-text' }).text('N/A');
    var endTime     = $('<div>', { class: 'dataset-info-text' }).text('N/A');

    var showDetails = false;
    var showHideDatasetDeails = function(showDetails) {
        if(showDetails){
            img.attr('src', "flow-server/static/flow/images/icon-arrow.png");
            detailsDiv.show();
        }
        else{
            img.attr('src', "flow-server/static/flow/images/icon-arrow-right.png");
            detailsDiv.hide();
        }
    }
    datasetDetailsButton.click( function(e) {
        showDetails = !showDetails;
        showHideDatasetDeails(showDetails);
    });
    content.append(datasetTopbar);
    content.append(datasetDetailsButton);
    content.append(detailsDiv);

    detailsDiv.append(programName);
    detailsDiv.append(recStatus);
    detailsDiv.append(piName);
    detailsDiv.append(startTime);
    detailsDiv.append(endTime);


    var canvas = $('<canvas>', { id: 'data-set-canvas' } );
    content.append(canvas);

    //
    // View Program and Export buttons
    //
    var selectIntervalBtn = $('<button>', {id: 'data-set-select-interval', class: 'dataflow-button dataset-codap-button'}).text('Select Interval');
    var exportBtn   = $('<button>', {class: 'dataflow-button dataset-codap-button'}).text('Export to CODAP');
    if(g_useCodap)content.append(selectIntervalBtn);
    if(g_useCodap)content.append(exportBtn);

    selectIntervalBtn.click( function(e) {
        selectInterval();
    });
    exportBtn.click( function(e) {
        exploreRecordedDataInCODAP();
    });



    // Load a dataset and initialize view.
    //
    base.loadDataSet = function(dataSet) {
        clearTimeout(updateSequenceTimer);
        //console.log("[DEBUG] loadDataSet", dataSet);
        if(dataSet === null) {
            modalAlert({
                title: 'Dataset Load Error',
                message: "Error opening dataset. Dataset is null.",
                nextFunc: function() {
             }});
            return false;
        }
        if(dataSet.metadata === null) {
            modalAlert({
                title: 'Dataset Load Error',
                message: "Error opening dataset. Dataset metadata is null.",
                nextFunc: function() {
             }});
            return false;
        }
        base.m_dataSet              = dataSet;
        base.m_program              = specToDiagram(dataSet.metadata.program);
        base.m_recordingLocation    = "/" + dataSet.metadata.recording_location;

        console.log("[DEBUG] loadDataSet",
                        base.m_program,
                        base.m_recordingLocation);

        $('#data-set-select-interval').html('Select Interval');

        showDetails = false;
        showHideDatasetDeails(showDetails);

        var displayedName = base.m_dataSet.name;
        if(base.m_dataSet.metadata.displayedName){
            displayedName = base.m_dataSet.metadata.displayedName;
        }
        datasetName.text(displayedName);
        var programDisplayedName;
        if(base.m_dataSet.metadata.program.displayedName == null){
            //old style dataset where name/displayed name are the same
            //and displayedName value is null or undefined
            programDisplayedName = base.m_dataSet.metadata.program.name;
        }
        else{
            //modern style dataset where name/displayed name are unique
            programDisplayedName = base.m_dataSet.metadata.program.displayedName;
        }
        programName.text("Program Name: " + programDisplayedName);

        var recording   = base.m_dataSet.metadata.recording;
        var start       = base.m_dataSet.metadata.start_time;
        var end         = base.m_dataSet.metadata.end_time;

        //
        // Set currently recording status
        //
        recStatus.html(recording
          ? '<i>Currently Recording</i>'
          : '<i>Not Recording</i>' );

        piName.text("Device: " + base.m_dataSet.metadata.controller_name);

        //
        // Show start time
        //
        var startStr = "Started: N/A";
        if(start){
            startStr = "Started: " + Util.getLocalDate(start) + ", " +
                        Util.getLocalTime(start);
        }
        startTime.html(startStr);


        //
        // Show end time
        //
        var endStr = "Ended: N/A";
        if(end) {
            endStr = "Ended: " + Util.getLocalDate(end) + ", " +
                     Util.getLocalTime(end);

        }
        endTime.html(endStr);


        base.m_canvas = document.getElementById('data-set-canvas');
        base.m_plotHandler = createPlotHandler(base.m_canvas);

        context = base.m_canvas.getContext('2d');
        window.addEventListener('resize', base.resizeCanvas, false);
        base.resizeCanvas();

        base.m_plotHandler.plotter.resetReceived();

        isLive = dataSet.metadata.recording;
        updateSequenceTime = dataSet.metadata.recording_interval * 1000;

        var url = '/ext/flow/list_datasetsequences';
        var data = { filename:      dataSet.name,
                     csrf_token:    g_csrfToken     };

        $.ajax({
            url: url,
            method: 'POST',
            data: data,
            success: function(data) {
                var response = JSON.parse(data);

                // console.log("[DEBUG] List sequences", response);

                if(response.success) {

                    var items = response.items;
                    for(var i = 0; i < items.length; i++) {
                        if(items[i].name == "metadata" && base.m_dataSet.metadata.start_time==null){
                            // Handle case where user does following:
                            // 1. starts recording datasetv
                            // 2. chooses to view data from editor, load from constructed dataset info built in flow-server
                            // 3. since flow client actually started the recording, flow-server does not know start time
                            // 4. possible to retrieve the start time now that we have the actual metadata from the server
                            if(items[i].metadata.start_time!=null)
                                base.m_dataSet.metadata.start_time = items[i].metadata.start_time;
                        }
                        console.log("[DEBUG] List sequences", items[i]);
                    }
                    //
                    // Set time frame on graph to start and end time of recording.
                    //
                    setTimeFrame(   items, base.m_dataSet.metadata.start_time,
                                    base.m_dataSet.metadata.end_time );

                } else {
                    console.log("[ERROR] Error listing sequences", response);
                }
            },
            error: function(data) {
                console.log("[ERROR] List sequences error", data);
            },
        });

        return true;
    }

    //
    // Return currently loaded dataset
    //
    base.getDataSet = function() { return base.m_dataSet; }

    //
    // Resize canvas
    //
    base.resizeCanvas = function() {
        //console.log("[DEBUG] resizeCanvas",
        //                window.innerWidth,
        //                window.innerHeight);
        base.m_canvas.width = window.innerWidth - RIGHT_PANEL_WIDTH - HORIZONTAL_MARGIN;
        base.m_canvas.height = window.innerHeight - PLOTTER_MARGIN_BOTTOM - VERTICAL_MARGIN;
        if (base.m_plotHandler){
            base.m_plotHandler.drawPlot(null, null);
        }
    }


    // close the plotter screen and go back to the diagram editor
    function closePlotter() {
        // Turn off timer, turn it on after we get the dataset
        clearTimeout(updateSequenceTimer);
        showDiagramEditor();
    }

    //
    //stop live updates
    //
    base.stopLiveUpdates = function(){
        // Turn off timer, turn it on after we get the dataset
        clearTimeout(updateSequenceTimer);
    }

    base.historyResponseHandler = function(data) {
        sequenceName = data.name;
        var values = data.values;
        var timestamps = data.timestamps;
        var validvalues = [];
        var validtimestamps = [];

        if(timestamps == null || values == null) {
            // If we couldn't get a valid timestamp or value object,
            // something went terribly wrong and sequence is invalid
            // i.e., sequence has name="" and we tried to read the
            // contents of the dataset folder as if it were a sequence folder
            return;
        }

        console.log('received', values.length, 'values');
        console.log('received', timestamps.length, 'timestamps');
        //console.log('timestamps: ', timestamps);
        //console.log('values: ', values);

        // Make sure all values are numeric (or null)
        // fix(faster): do on server
        var len = values.length;
        for (var i = 0; i < len; i++) {
            var val = values[i];
            if (val !== null) {
                values[i] = +val;  // convert to number
                if(!isNaN(values[i])){
                    validvalues.push(values[i]);
                    validtimestamps.push(timestamps[i]);
                }
            }
        }

        //
        // Update plot data
        //
        var dataPair = base.findDataPair(sequenceName);
        if (!dataPair) {

            dataPair = base.createDataPair(sequenceName);

            // add data pair to plotter
            base.m_plotHandler.plotter.dataPairs.push(dataPair);
            base.m_plotHandler.plotter.setData(base.m_plotHandler.plotter.dataPairs);
        }

        if (dataPair) {
            dataPair.xData.data = validtimestamps;  // we are updating the plotter's internal data
            dataPair.yData.data = validvalues;
            dataPair.dataReceived = true;
            // indicate to autoBounds to adjust timestamps
            base.m_plotHandler.plotter.autoBounds(true);
            base.m_plotHandler.drawPlot(null, null);
        }

        // If we found the final sequence and we are live, set the timer to load again
        sequenceCount--;
        if(isLive && sequenceCount == 0){
            updateSequenceTimer = setTimeout(updateSequence, updateSequenceTime);
        }
    }


    /*
    params example ( 1 hour)
    Object {count: 100000, start_timestamp: "2017-06-10T00:23:09.095Z", end_timestamp: "2017-06-10T01:23:09.095Z"}

     */
    base.requestServerSequenceData = function(blockName, params) {
        //
        // handle sequence history data received from server
        //
        var url = '/api/v1/resources' + base.m_recordingLocation + '/' + blockName;
        console.log("[DEBUG] Requesting server data: ", url, params);
        $.get(url, params, base.historyResponseHandler);
    }

    base.createDataPair = function(sequenceName) {
        var xData = createDataColumn('timestamp', []);
        xData.type = 'timestamp';
        var yData = createDataColumn('value', []);
        yData.name = sequenceName;
        //yData.units = block.units;
        return {
            'xData': xData,
            'yData': yData,
            'dataReceived': false,
        };
    }

    base.findDataPair = function(sequenceName) {
        var dataPair = null;
        var dataPairs = base.m_plotHandler.plotter.dataPairs;
        for (var i = 0; i < dataPairs.length; i++) {
            var d = dataPairs[i];
            console.log("[DEBUG] findDataPair checking", d.yData.name, sequenceName);
            if (d.yData.name === sequenceName) {
                dataPair = d;
                break;
            }
        }
        console.log("[DEBUG] findDataPair", sequenceName, "found", dataPair);
        return dataPair;
    }


    //
    // Set the start and end time on the graph.
    //
    // startStr - UTC date string as stored in metadata
    //                  e.g. "2017-11-29 17:03:30.137684"
    // endStr   - UTC date string as stored in metadata. If undefined, use
    //                  the current date (now)
    //
    function setTimeFrame(sequences, startStr, endStr) {

        //
        // Parse the date string into a javascript Date object.
        //
        function parseDate(d) {
            if(d == undefined) {
                return new Date();
            }

            if(d.indexOf('.') != -1) {
                d = d.split('.')[0];
            }
            var dateStr = d + " UTC";

            // Safari workaround
            var dateStr = dateStr.replace(/-/g, '/');

            return new Date(dateStr);
        }

        var startDate   = parseDate(startStr);
        var endDate     = parseDate(endStr);
        console.log("[DEBUG] setTimeFrame startDate endDate",
                                startDate, endDate);

        base.m_plotHandler.plotter.resetReceived();

        var start   = moment(startDate.getTime()).toISOString();
        var end     = moment(endDate.getTime() - 1000).toISOString();

        // Save the start time in case we are live and need to request sequence data again
        savedStartTime = start;
        savedSequences = sequences;
        sequenceCount = 0;

        for (var i = 0; i < sequences.length; i++) {
            if(sequences[i].name!="metadata"){
                sequenceCount++;
                base.requestServerSequenceData(sequences[i].name, {
                    count: 100000,
                    start_timestamp: start,
                    end_timestamp: end
                });
            }
        }
    }
    //
    // Update the data view when we are looking at a live recording
    //
    function updateSequence() {
        // Turn off timer, turn it on after we get the dataset
        clearTimeout(updateSequenceTimer);

        // Store the number of sequences that we will request
        sequenceCount = 0;

        // Request dataset
        var start   = savedStartTime;
        var d = new Date();
        var end = d.toISOString();

        for (var i = 0; i < savedSequences.length; i++) {
            if(savedSequences[i].name!="metadata"){
                sequenceCount++;
                base.requestServerSequenceData(savedSequences[i].name, {
                    count: 100000,
                    start_timestamp: start,
                    end_timestamp: end
                });
            }
        }
    }

    function selectInterval() {
        if (base.m_plotHandler.intervalSelect) {
            base.m_plotHandler.setIntervalSelect(false);
            $('#data-set-select-interval').html('Select Interval');
        } else {
            base.m_plotHandler.setIntervalSelect(true);
            $('#data-set-select-interval').html('Done with Interval Selection');
            CodapTest.logTopic('Dataflow/StartSelectDataToExport');
        }
    }


    function exploreRecordedDataInCODAP() {
        var timeThresh = 0.4;  // seconds
        var dataPairs = base.m_plotHandler.plotter.dataPairs;
        if (dataPairs.length && dataPairs[0].xData.data.length) {
            // Set collection attributes based on sequence data
            var attrs = [{name: 'seconds', type: 'numeric', precision: 2}, {name: 'timestamp', type: 'date'}];
            for (var i = 0; i < dataPairs.length; i++) {
                attrs.push({
                    name: dataPairs[i].yData.name,
                    type: 'numeric',
                    precision: 2,
                });
            }

            CodapTest.prepCollection(
                attrs,
                function() {
                    // Get data for quick reference
                    var xs = [];
                    var ys = [];
                    for (var j = 0; j < dataPairs.length; j++) {
                        xs.push(dataPairs[j].xData.data);
                        ys.push(dataPairs[j].yData.data);
                    }

                    // Get timestamp bounds
                    var frame = base.m_plotHandler.plotter.frames[0];
                    var minTimestamp = frame.intervalLowerX;
                    var maxTimestamp = frame.intervalUpperX;
                    var ind = [];
                    for (var j = 0; j < dataPairs.length; j++) {
                        if (xs[j].length) {
                            ind[j] = 0;  // start at beginning
                        } else {
                            ind[j] = -1;  // no data; done with this pair
                        }
                    }

                    // Merge the sequences
                    var data = [];
                    var startTimestamp = null;
                    var step = 0;
                    while (1) {

                        // Get current timestamp: min across sequences at current position
                        var timestamp = null;
                        for (var j = 0; j < dataPairs.length; j++) {
                            if (ind[j] >= 0) {
                                var t = xs[j][ind[j]];
                                if (timestamp === null || t < timestamp) {
                                    timestamp = t;
                                }
                            }
                        }

                        // If no timestamp, then we've reached the end of all sequences, stop here
                        if (timestamp === null) {
                            break;
                        }

                        // Check whether to keep this point
                        var keepPoint = ((minTimestamp === null || timestamp >= minTimestamp - timeThresh) && (maxTimestamp === null || timestamp <= maxTimestamp + timeThresh));

                        // First timestamp will be start timestamp
                        if (keepPoint && startTimestamp === null) {
                            startTimestamp = timestamp;
                        }

                        // Grab the data for this timestamp and move indices forward
                        var dataPoint = {};
                        for (var j = 0; j < dataPairs.length; j++) {
                            if (ind[j] >= 0) {
                                var t = xs[j][ind[j]];
                                if (Math.abs(t - timestamp) < timeThresh) {
                                    if (keepPoint) {
                                        dataPoint[dataPairs[j].yData.name] = ys[j][ind[j]];
                                    }
                                    ind[j]++;  // move to next point for this sequence; we'll assume for now that each data point within a sequence has a distinct timestamp
                                    if (ind[j] >= xs[j].length) {
                                        ind[j] = -1;  // at end of this sequence
                                    }
                                }
                            }
                        }

                        // Add to data set to send to CODAP
                        if (keepPoint) {
                            dataPoint['seconds'] = timestamp - startTimestamp;
                            dataPoint['timestamp'] = moment(timestamp * 1000).format('M/D/YYYY H:mm:ss');
                            data.push(dataPoint);
                        }

                        // Sanity check
                        step++;
                        if (step > 3000) {
                            break;
                        }
                    }

                    //
                    // Send data to CODAP
                    //
                    CodapTest.sendData(data);
                    CodapTest.logTopic('Dataflow/ExportDataToCODAP');

                    debug("Attempting to open case table.");

                    //
                    // Open case table for the user so they don't
                    // have to select it from the menu after clicking the
                    // export button.
                    //
                    codapInterface.sendRequest(
                        {
                            action:     "create",
                            resource:   "component",
                            values:     {   type:           "caseTable",
                                            name:           "explore_flow_data",
                                            title:          "Explore Data in CODAP",
                                            dimensions:     {   width:  700,
                                                                height: 500 },
                                            dataContext:    "Flow_Data"
                                        }
                        },
                        function(iResult, iRequest) {
                            debug("Opened case table", iResult);
                        }
                    );
                }
            );
        }
    }

    //
    // Delete all history for this sequence
    //  
    function deleteSequenceData() {
        modalConfirm({
            title: 'Delete Sequence Data',
            'prompt': 'Are you sure you want to <b>delete all data</b> for these blocks?',
            yesFunc: function() {
                var first = true;
                var diagram = base.m_program;

                for (var i = 0; i < diagram.blocks.length; i++) {
                    var block = diagram.blocks[i];
                    if (block.inputCount === 0) {
                        $.ajax({
                            type: 'DELETE',
                            url: '/api/v1/resources' + base.m_recordingLocation + '/' + block.name,
                            data: {
                                'csrf_token': g_csrfToken,
                                'data_only': 1,
                            },
                            success: function() {
                                if (first) {  // only do this once
                                    for (var j = 0; j < base.m_plotHandler.plotter.dataPairs.length; j++) {
                                        var d = base.m_plotHandler.plotter.dataPairs[j];
                                        d.xData.data = [];  // clear out data so it's not visible when come back
                                        d.yData.data = [];
                                    }
                                    base.m_plotHandler.drawPlot(null, null);
                                    closePlotter();  // close the plotter since there's no longer anything to see
                                    first = false;
                                }
                            },
                        });
                    }
                }
            }
        });
    }

    return base;
}
