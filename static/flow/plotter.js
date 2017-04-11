var g_plotHandler = null;
var g_xData = null;
var g_yData = null;
var g_sequenceName = null;
var g_sequenceBlock = null;
var g_localTimestamps = null;
var g_localValues = null;


// initialize the plotter view
function initPlotter() {
	if (g_plotHandler === null) {
		var canvas = document.getElementById('canvas');
		g_plotHandler = createPlotHandler(canvas);
	}
}


// close the plotter screen and go back to the diagram editor
function closePlotter() {
	showDiagramEditor();
}

function getServerSequenceData(params) {
	// handle sequence history data received from server
	var handler = function(data) {
		var values = data.values;
		var timestamps = data.timestamps;

		console.log('Received:');
		for(var i = 0; i < values.length; i++){
			console.log(values[i], timestamps[i]);
		}

		// console.log('received', values.length, 'values');
		// console.log('received', timestamps.length, 'timestamps');

		// make sure all values are numeric (or null)
		// fix(faster): do on server
		var len = values.length;
		for (var i = 0; i < len; i++) {
			var val = values[i];
			if (val !== null) {
				values[i] = +val;  // convert to number
			}
		}

		// merge server data with local data

		// sanity check to ensure server timestamps are earlier than local time
		if (g_localTimestamps[0] - timestamps[0] > 0){
	    Array.prototype.unshift.apply(g_localTimestamps, timestamps);
			Array.prototype.unshift.apply(g_localValues, values);
		}
		g_plotHandler.plotter.autoBounds();
		g_plotHandler.drawPlot(null, null);

	}

	var url = '/api/v1/resources' + g_controller.path + '/' + g_sequenceName;
	$.get(url, params, handler);
}

// add a sequence to be displayed in the plotter screen
function addSequence(block) {
	g_sequenceBlock = block;
	g_sequenceName = block.name;

	// Init the sequence with local data first
	g_localTimestamps = block.history.timestamps;
	g_localValues = block.history.values;
	g_xData = createDataColumn('timestamp', g_localTimestamps);
	g_xData.type = 'timestamp';
	g_yData = createDataColumn('value', g_localValues);
	g_yData.name = g_sequenceName;
	var dataPairs = [
		{
			'xData': g_xData,
			'yData': g_yData,
		}
	];
	g_plotHandler.plotter.setData(dataPairs);
	g_plotHandler.drawPlot(null, null);

	// request sequence history data from server
	// getServerSequenceData({ count: 1000 }, handler)

	addMessageHandler('sequence_update', function(timestamp, params) {
		// Since update_diagram is pushing new data to block history, simply update the plotter
		g_plotHandler.plotter.autoBounds();
		g_plotHandler.drawPlot(null, null);
	});

}

function setTimeFrame(timeStr) {
	var frameSeconds;

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


	var now = moment().valueOf(),
			start = moment(now - (frameSeconds * 1000)).toISOString(),
			end = moment(now).toISOString();

	getServerSequenceData({
		count: 1000,
		start_timestamp: start,
		end_timestamp: end
	})
}


// delete all history for this sequence
function deleteSequenceData() {
	modalConfirm({
		title: 'Delete Sequence Data',
		'prompt': 'Are you sure you want to <b>delete all data</b> for sequence <b>' + g_sequenceName + '</b>?',
		yesFunc: function() {
			$.ajax({
				type: 'DELETE',
				url: '/api/v1/resources' + g_controller.path + '/' + g_sequenceName,
				data: {
					'csrf_token': g_csrfToken,
					'data_only': 1,
				},
				success: function() {
					closePlotter();  // fix(later): just remove/clear this sequence
				},
			});
		}
	});
}
