var g_controllerViewerInitialized = false;
var g_diagramSpecs = [];  // a collection of all diagrams on the controller


// prepare an interface for viewing the diagrams contained within a controller
function initControllerViewer() {
	
	// if we've already initialized the view but are returning to it again, we should request the list of diagrams again
	if (g_controllerViewerInitialized) {
		sendMessage('list_diagrams');
		return;
	}
	
	// subscribe to message for this controller
	subscribeToFolder(g_controller.path);
	
	// set outgoing messages to go to this controller
	setTargetFolder(g_controller.path);
	
	// open websocket connect to server
	connectWebSocket(function() {
		sendMessage('list_diagrams');
	});
	
	// handle diagram list message from controller
	addMessageHandler('diagram_list', function(timestamp, params) {
		var diagramListDiv = $('#diagramList');
		diagramListDiv.empty();
		g_diagramSpecs = params.diagrams;
		for (var i = 0; i < g_diagramSpecs.length; i++) {
			var diagram = g_diagramSpecs[i];
			var div = $('<div>');
			var button = $('<button>', {class: 'btn btn-lg listButton', html: diagram.name}).appendTo(div);
			button.click(i, function(e) {
				showDiagramEditor();
				sendMessage('start_diagram', g_diagramSpecs[e.data]);
				loadDiagram(g_diagramSpecs[e.data]);
			});
			div.appendTo(diagramListDiv);
		}
	});
	
	// handle status message from the controller
	addMessageHandler('status', function(timestamp, params) {
		console.log(params);
	})
	
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


// close the controller viewer and go back to the controller selector
function closeControllerViewer() {
	showControllerSelector();
}


// open a new flow diagram in the diagram editor
function newDiagram() {
	showDiagramEditor();
	loadDiagram({'blocks': []});  // load an empty diagram
	sendMessage('set_diagram', {diagram: diagramToSpec(g_diagram)});  // send empty diagram to controller
}
