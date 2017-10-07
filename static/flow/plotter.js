var g_plotHandler = null;


var PLOTTER_MARGIN_BOTTOM = 94; // px


function resizeCanvas(){
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - PLOTTER_MARGIN_BOTTOM;
	if (g_plotHandler){
		g_plotHandler.drawPlot(null, null);
	}
}


// initialize the plotter view
function initPlotter() {
	if (g_plotHandler === null) {
		var canvas = document.getElementById('canvas');
		g_plotHandler = createPlotHandler(canvas);

		context = canvas.getContext('2d');
		window.addEventListener('resize', resizeCanvas, false);
		resizeCanvas();

		/* ---- disabling auto-update for now ----
		addMessageHandler('sequence_update', function(timestamp, params) {
			// Since update_diagram is pushing new data to block history, simply update the plotter
			g_plotHandler.plotter.autoBounds();
			g_plotHandler.drawPlot(null, null);
		});
		*/
	}

	g_plotHandler.plotter.resetReceived();
	if (g_useBle) {
		bleaddMessageHandler('history', bleHistoryResponseHandler);
	}
	// request sequence history data from server
	setTimeFrame('10m');
}


// close the plotter screen and go back to the diagram editor
function closePlotter() {
	showDiagramEditor();
}

function bleHistoryResponseHandler(timestamp, params) {
	// translate from more compact ble format to format used by http service at /api/v1/resource
	// convert timestamp strings to date type

	/*
	sample data:
	params.name
	light

	params.timestamps
	14:23:15.784 (9) ["2017-06-16T21:14:00Z", "2017-06-16T21:15:00Z", "2017-06-16T21:16:00Z", "2017-06-16T21:17:00Z", "2017-06-16T21:18:00Z", "2017-06-16T21:19:00Z", "2017-06-16T21:20:00Z", "2017-06-16T21:21:00Z", "2017-06-16T21:22:00Z"]
	14:23:15.784 params.values
	14:23:15.784 (9) [230, 229.86666666666667, 229.6, 228, 228, 228.3, 228, 228, 227.5]


	historyResponseHandler requires this timestamp format (epoch seconds):
	timestamps
    14:18:40.607 (3) [1497644353.195688, 1497644413.407017, 1497644473.750816]


	 */

	var timestamps = params.timestamps.map(dt => new Date(dt).getTime()/1000.);
	//var values = params.values.map(v => v.toString());
	// convert to strings, except if value is null
	var values = params.values.map( v => {if (v) { return v.toString() } else {return v}})
	var newdata = {name: params.name, values: values, timestamps: timestamps}


	historyResponseHandler(newdata);
}

function historyResponseHandler(data) {
	blockName = data.name;
	var values = data.values;
	var timestamps = data.timestamps;

	console.log('received', values.length, 'values');
	console.log('received', timestamps.length, 'timestamps');
	//console.log('timestamps: ', timestamps);
	//console.log('values: ', values);

	// make sure all values are numeric (or null)
	// fix(faster): do on server
	var len = values.length;
	for (var i = 0; i < len; i++) {
		var val = values[i];
		if (val !== null) {
			values[i] = +val;  // convert to number
		}
	}

	/* ---- disabling local history for now ----
	// merge server data with local data
	// sanity check to ensure server timestamps are earlier than local time
	if (g_localTimestamps[0] - timestamps[0] > 0){
		Array.prototype.unshift.apply(g_localTimestamps, timestamps);
		Array.prototype.unshift.apply(g_localValues, values);
	}
	*/

	// update plot data
	var dataPair = findDataPair(blockName);
	if (!dataPair) {
		var block = g_diagram.findBlockByName(blockName);
		if (block) {
			dataPair = createDataPair(block);
			
			// add data pair to plotter
			g_plotHandler.plotter.dataPairs.push(dataPair);
			g_plotHandler.plotter.setData(g_plotHandler.plotter.dataPairs);
		}
	}
	if (dataPair) {
		dataPair.xData.data = timestamps;  // we are updating the plotter's internal data
		dataPair.yData.data = values;
		dataPair.dataReceived = true;
		// indicate to autoBounds to adjust timestamps
		g_plotHandler.plotter.autoBounds(true);
		g_plotHandler.drawPlot(null, null);
	}
}


function bleRequestHistory(params) {
	//sendMessage('history?start=%s&end=%s&limit=%s' % (params.start_timestamp, params.end_timestamp, params.count));
	sendMessage('history', params);
}

/*
params example ( 1 hour)
Object {count: 100000, start_timestamp: "2017-06-10T00:23:09.095Z", end_timestamp: "2017-06-10T01:23:09.095Z"}

 */
function requestServerSequenceData(blockName, params) {
	// handle sequence history data received from server
	var url = '/api/v1/resources' + g_controller.path + '/' + blockName;
	$.get(url, params, historyResponseHandler);
}

function createDataPair(block) {
	var xData = createDataColumn('timestamp', []);
	xData.type = 'timestamp';
	var yData = createDataColumn('value', []);
	yData.name = block.name;
	yData.units = block.units;
	return {
		'xData': xData,
		'yData': yData,
		'dataReceived': false,
	};
}


function findDataPair(blockName) {
	var dataPair = null;
	var dataPairs = g_plotHandler.plotter.dataPairs;
	for (var i = 0; i < dataPairs.length; i++) {
		var d = dataPairs[i];
		if (d.yData.name === blockName) {
			dataPair = d;
			break;
		}
	}
	return dataPair;
}


function setTimeFrame(timeStr) {

	// compute time bounds
	var frameSeconds = 0;
	if (timeStr === '1m'){
		frameSeconds = 60;
	} else if (timeStr === '10m'){
		frameSeconds = 60 * 10;
	} else if (timeStr === '1h'){
		frameSeconds = 60 * 60;
	} else if (timeStr === '24h'){
		frameSeconds = 60 * 60 * 24;
	} else if (timeStr === '7d'){
		frameSeconds = 60 * 60 * 24 * 7;
	} else if (timeStr === '30d'){
		frameSeconds = 60 * 60 * 24 * 30;
	}
    g_plotHandler.plotter.resetReceived();

	// get current time
	var now = moment().valueOf();
	// round up to next whole second
	now = Math.round((now + 999) / 1000) * 1000;
	var start = moment(now - (frameSeconds * 1000)).toISOString();
	var end = moment(now).toISOString();

	// request all current input blocks from server
	for (var i = 0; i < g_diagram.blocks.length; i++) {
		var block = g_diagram.blocks[i];
		if (block.inputCount === 0) {
			if (g_useBle) {
				bleRequestHistory({
					name: block.name,
					count: 100000,
					start_timestamp: start,
					end_timestamp: end
				});

			} else {
				requestServerSequenceData(block.name, {
					count: 100000,
					start_timestamp: start,
					end_timestamp: end
				});

			}
		}
	}
}


function selectInterval() {
	if (g_plotHandler.intervalSelect) {
		g_plotHandler.setIntervalSelect(false);
		$('#selectInterval').html('Select Interval');
		$('#selectInterval').removeClass('btn-info');
	} else {
		g_plotHandler.setIntervalSelect(true);
		$('#selectInterval').html('Done with Interval Selection');
		$('#selectInterval').addClass('btn-info');
        CodapTest.logTopic('Dataflow/StartSelectDataToExport');
	}
}


function exploreRecordedDataInCODAP() {
	var timeThresh = 0.4;  // seconds
	var dataPairs = g_plotHandler.plotter.dataPairs;
	if (dataPairs.length && dataPairs[0].xData.data.length) {

		// set collection attributes based on current input blocks
		var attrs = [{name: 'seconds', type: 'numeric', precision: 2}, {name: 'timestamp', type: 'date'}];
		for (var i = 0; i < g_diagram.blocks.length; i++) {
			var block = g_diagram.blocks[i];
			if (block.inputCount === 0) {
				attrs.push({
					name: block.name,
					type: 'numeric',
					precision: 2,
				});
			}
		}

		CodapTest.prepCollection(
            attrs, 
            function() {
                // get data for quick reference
                var xs = [];
                var ys = [];
                for (var j = 0; j < dataPairs.length; j++) {
                    xs.push(dataPairs[j].xData.data);
                    ys.push(dataPairs[j].yData.data);
                }

                // get timestamp bounds
                var frame = g_plotHandler.plotter.frames[0];
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

                // merge the sequences
                var data = [];
                var startTimestamp = null;
                var step = 0;
                while (1) {

                    // get current timestamp: min across sequences at current position
                    var timestamp = null;
                    for (var j = 0; j < dataPairs.length; j++) {
                        if (ind[j] >= 0) {
                            var t = xs[j][ind[j]];
                            if (timestamp === null || t < timestamp) {
                                timestamp = t;
                            }
                        }
                    }

                    // if no timestamp, then we've reached the end of all sequences, stop here
                    if (timestamp === null) {
                        break;
                    }

                    // check whether to keep this point
                    var keepPoint = ((minTimestamp === null || timestamp >= minTimestamp - timeThresh) && (maxTimestamp === null || timestamp <= maxTimestamp + timeThresh));

                    // first timestamp will be start timestamp
                    if (keepPoint && startTimestamp === null) {
                        startTimestamp = timestamp;
                    }

                    // grab the data for this timestamp and move indices forward
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

                    // add to data set to send to CODAP
                    if (keepPoint) {
                        dataPoint['seconds'] = timestamp - startTimestamp;
                        dataPoint['timestamp'] = moment(timestamp * 1000).format('M/D/YYYY H:mm:ss');
                        data.push(dataPoint);
                    }

                    // sanity check
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


// delete all history for this sequence
function deleteSequenceData() {
	modalConfirm({
		title: 'Delete Sequence Data',
		'prompt': 'Are you sure you want to <b>delete all data</b> for these blocks?',
		yesFunc: function() {
			var first = true;
			for (var i = 0; i < g_diagram.blocks.length; i++) {
				var block = g_diagram.blocks[i];
				if (block.inputCount === 0) {
					$.ajax({
						type: 'DELETE',
						url: '/api/v1/resources' + g_controller.path + '/' + block.name,
						data: {
							'csrf_token': g_csrfToken,
							'data_only': 1,
						},
						success: function() {
							if (first) {  // only do this once
								for (var j = 0; j < g_plotHandler.plotter.dataPairs.length; j++) {
									var d = g_plotHandler.plotter.dataPairs[j];
									d.xData.data = [];  // clear out data so it's not visible when come back
									d.yData.data = [];
								}
								g_plotHandler.drawPlot(null, null);
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
