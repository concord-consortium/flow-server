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

		var createMenu = function(btnGroup, diagramIndex){
			var diagramActions = $('<button>', {class: 'btn btn-lg dropdown-toggle', html: '<span class="caret"></span>'});
			diagramActions
				.css({ height: '45px'})
				.attr({ 'data-toggle': 'dropdown'})
				.appendTo(btnGroup);

			var diagramMenu = $('<ul>', { class: 'dropdown-menu '});

			var renameAction = $('<li>', { html: '<a href="#">Rename</a>' }).appendTo(diagramMenu);
			var deleteAction = $('<li>', { html: '<a href="#">Delete</a>' }).appendTo(diagramMenu);

			renameAction.click(diagramIndex, function(e){
				var diagramSpec = g_diagramSpecs[e.data];
				// TODO: add validator similar to diagram save prompt
				modalPrompt({title: 'Rename Diagram', prompt: 'Name', default: diagramSpec.name, resultFunc: function(name) {
					sendMessage('save_diagram', {'name': name, 'diagram': diagramSpec});
					diagramSpec.name = name;
					updateDiagramSpec(diagramSpec);
				}});
			});

			deleteAction.click(diagramIndex, function(e){
				var diagramSpec = g_diagramSpecs[e.data];
				// TODO: add validator similar to diagram save prompt
				modalConfirm({title: 'Delete Diagram', prompt: 'Are you sure you want to delete this diagram?', yesFunc: function() {
					sendMessage('delete_diagram', {'name': diagramSpec.name });
					deleteDiagramSpec(diagramSpec.name);
				}});
			});
			diagramMenu.appendTo(btnGroup);
		};


		for (var i = 0; i < g_diagramSpecs.length; i++) {
			var diagram = g_diagramSpecs[i];
			var diagramDiv = $('<div>', {class: 'listButton'});
			var btnGroup = $('<div>', {class: 'btn-group'});
			var diagramName = $('<button>', {class: 'btn btn-lg', html: diagram.name}).appendTo(btnGroup);
			diagramName.click(i, function(e) {
				showDiagramEditor();
				sendMessage('start_diagram', g_diagramSpecs[e.data]);
				loadDiagram(g_diagramSpecs[e.data]);
			});
			createMenu(btnGroup, i)
			btnGroup.appendTo(diagramDiv);
			diagramDiv.appendTo(diagramListDiv);
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
}
