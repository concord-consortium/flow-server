var g_controllerViewerInitialized = false;
var g_diagramSpecs = [];  // a collection of all diagrams on the controller
var g_recordingInterval = null;  // current recording interval

/**
 Handle diagram list message from controller
 * @param timestamp
 * @param params
 */
function diagram_list_handler(timestamp, params) {
	var diagramListDiv = $('#diagramList');
	diagramListDiv.empty();
	g_diagramSpecs = params.diagrams;

	var createMenu = function(btnGroup, diagramIndex, id){
		var diagramActions = $('<button>', {class: 'btn btn-lg dropdown-toggle', html: '<span class="caret"></span>', id: id});
		diagramActions
			.css({ height: '45px'})
			.attr({ 'data-toggle': 'dropdown'})
			.appendTo(btnGroup);

		var diagramMenu = $('<ul>', { class: 'dropdown-menu '});

		var renameAction = $('<li>', { html: '<a href="#">Rename</a>' }).appendTo(diagramMenu);
		var deleteAction = $('<li>', { html: '<a href="#">Delete</a>' }).appendTo(diagramMenu);

		renameAction.click(diagramIndex, function(e){
			var diagramSpec = g_diagramSpecs[e.data];
			modalPrompt({title: 'Rename Diagram', prompt: 'Name', default: diagramSpec.name,
				validator: Util.diagramValidator,
				resultFunc: function(newName) {
					sendMessage('rename_diagram', {'old_name': diagramSpec.name, 'new_name': newName});
					diagramSpec.name = newName;
					updateDiagramSpec(diagramSpec);
					btnGroup.find('.diagram-name').html(newName);
				}});
		});

		deleteAction.click(diagramIndex, function(e){
			var diagramSpec = g_diagramSpecs[e.data];
			// TODO: add validator similar to diagram save prompt
			modalConfirm({title: 'Delete Diagram', prompt: 'Are you sure you want to delete this diagram?', yesFunc: function() {
				sendMessage('delete_diagram', {'name': diagramSpec.name });
				deleteDiagramSpec(diagramSpec.name);
				btnGroup.remove();
			}});
		});
		diagramMenu.appendTo(btnGroup);
	};


	for (var i = 0; i < g_diagramSpecs.length; i++) {
		var diagram = g_diagramSpecs[i];
		var diagramDiv = $('<div>', {class: 'listButton'});
		var btnGroup = $('<div>', {class: 'btn-group'});
		var diagramName = $('<button>', {class: 'btn btn-lg diagram-name', html: diagram.name, id: 'd_' + diagram.name}).appendTo(btnGroup);
		diagramName.click(i, function(e) {
			showDiagramEditor();
			sendMessage('start_diagram', g_diagramSpecs[e.data]);
			loadDiagram(g_diagramSpecs[e.data]);
		});
		createMenu(btnGroup, i, 'dm_' + diagram.name);
		btnGroup.appendTo(diagramDiv);
		diagramDiv.appendTo(diagramListDiv);
	}
}

function diagramSetRecordingInterval(interval) {
	var recording_interval_text = interval ? interval + ' second(s)' : 'none';
	$('#diagramInfo').html("<b>Recording Interval:</b> " + recording_interval_text)
}

/**
 Handle status message from the controller
 * @param timestamp
 * @param params
 */
function status_handler(timestamp, params) {
	console.log('status', params);
	var statusDiv = $('#controllerStatus');
	statusDiv.empty();
	$('<div>', {html: 'Number of devices: ' + params.device_count}).appendTo(statusDiv);
	var recording_interval_text = params.recording_interval ? params.recording_interval + ' second(s)' : 'none';
	$('<div>', {html: 'Recording interval: ' + recording_interval_text }).appendTo(statusDiv);
	g_recordingInterval = params.recording_interval;
	if (params.current_diagram) {
		var button = $('#d_' + params.current_diagram);
		if (button) {
			button.addClass('btn-success');
			$('#dm_' + params.current_diagram).addClass('btn-success');
			button.html(params.current_diagram + ' (running' + (g_recordingInterval ? ' and recording' : '') + ')');
		}
	}
    diagramSetRecordingInterval(params.recording_interval);

}

// prepare an interface for viewing the diagrams contained within a controller
function initControllerViewer() {

	// if we've already initialized the view but are returning to it again, we should request the list of diagrams again
	if (g_controllerViewerInitialized) {
		sendMessage('list_diagrams');
		//sendMessage('list_diagrams_names');
		sendMessage('request_status');
		return;
	}

	// subscribe to message for this controller
	subscribeToFolder(g_controller.path);

	// set outgoing messages to go to this controller
	setTargetFolder(g_controller.path);

	// open websocket connect to server
	connectWebSocket(function() {
		sendMessage('list_diagrams');
		//sendMessage('list_diagrams_names');
		sendMessage('request_status');
	});

	if (g_useBle) {
		bleaddMessageHandler('diagram_list', diagram_list_handler);
		bleaddMessageHandler('status', status_handler);
	} else {
		addMessageHandler('diagram_list', diagram_list_handler);
		addMessageHandler('status', status_handler);
	}

	g_controllerViewerInitialized = true;
}


// update a diagram spec in the list of diagrams after user makes edits
function updateDiagramSpec(diagramSpec) {
	for (var i = 0; i < g_diagramSpecs.length; i++) {
		if (g_diagramSpecs[i].name === diagramSpec.name) {
			g_diagramSpecs[i] = diagramSpec;
		}
	}
}


function deleteDiagramSpec(name) {
	for (var i = 0; i < g_diagramSpecs.length; i++) {
		if (g_diagramSpecs[i].name === name) {
			delete g_diagramSpecs[i];
		}
	}
}


// close the controller viewer and go back to the controller selector
function closeControllerViewer() {
	showControllerSelector();
}


// open a new flow diagram in the diagram editor
function newDiagram() {
	showDiagramEditor();
	loadDiagram({'blocks': []});  // load an empty diagram
	sendMessage('set_diagram', {diagram: diagramToSpec(g_diagram)});  // send empty diagram to controller
    CodapTest.logTopic('Dataflow/CreateDiagram');
}
