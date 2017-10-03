var g_controllerViewerInitialized = false;
var g_diagramSpecs = [];  // a collection of all diagrams on the controller
var g_recordingInterval = null;  // current recording interval

/**
 Handle diagram list message from controller
 * @param timestamp
 * @param params
 */
function diagram_list_handler(timestamp, params) {

    console.log("INFO diagram_list_handler", timestamp, params);
    console.log("INFO diagram_list_handler g_controller", g_controller.name);

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

//
//
//
function diagramSetRecordingInterval(interval) {
    var recording_interval_text = interval ? interval + ' second(s)' : 'none';

    var nameEl  = $('<b>', {});
    var brEl    = $('<br>', {});
    var infoEl  = $('<div>', {});

    nameEl.text(g_controller.name);
    infoEl.html("<b>Recording Interval:</b> " + recording_interval_text);

    var controllerInfo = $('#diagramInfo');
    controllerInfo.html('');

    nameEl.appendTo(controllerInfo);
    brEl.appendTo(controllerInfo);
    infoEl.appendTo(controllerInfo);
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

//
// prepare an interface for viewing the diagrams contained within a controller
//
function initControllerViewer() {

    var controllerName = $('#controllerName');
    console.log("INFO initControllerViewer setting controller name", 
                    g_controller.name);
    controllerName.text(g_controller.name);

    var connectMsg = $('#diagramList');
    connectMsg.text('Connecting to controller...');

    //
    // Subscribe to messages for this controller.
    //
    clearSubscriptions();
    subscribeToFolder(g_controller.path);

    //
    // Set outgoing messages to go to this controller.
    //
    setTargetFolder(g_controller.path);

    //
    // if we've already initialized the view but are returning to it again, 
    // we should request the list of diagrams and status again
    //
    if (g_controllerViewerInitialized) {

        console.log("INFO already inited g_controllerViewerInitialized", g_controller.name);

        //
        // Update new subscriptions (in case we changed controllers on this 
        // websocket connection.)
        //
        sendSubscriptions();

        sendMessage('list_diagrams');
        sendMessage('request_status');

        return;
    }


    console.log("INFO connecting websocket", g_controller.name);

    //
    // open websocket connect to server
    //
    connectWebSocket(function() {
        console.log("INFO connecting websocket func", g_controller.name);
        sendMessage('list_diagrams');
        sendMessage('request_status');
    });

    console.log("INFO connected websocket", g_controller.name);

    if (g_useBle) {
        bleaddMessageHandler('diagram_list', diagram_list_handler);
        bleaddMessageHandler('status', status_handler);
    } else {
        console.log("INFO adding message handlers diagram_list and status");
        addMessageHandler('diagram_list', diagram_list_handler);
        addMessageHandler('status', status_handler);
    }

    console.log("INFO Setting g_controllerViewerInitialized", g_controller.name);
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
