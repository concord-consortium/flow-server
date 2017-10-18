var g_controllerViewerInitialized = false;
var g_diagramSpecs = [];  // a collection of all diagrams on the controller
var g_recordingInterval = null;  // current recording interval

var g_diagramIdMap = {};    // Map diagram name to an id so that we aren't
                            // using spaces in dom ids.

var g_status = {};          // Keep this to check for things like 
                            // currently running diagram.

/**
 *
 * Handle diagram list message from controller
 * @param timestamp
 * @param params
 */
function diagram_list_handler(timestamp, params) {

    console.log("INFO diagram_list_handler", params);
    console.log("INFO diagram_list_handler g_controller", g_controller.name);

	var diagramListDiv = $('#diagramList');
	diagramListDiv.empty();
	g_diagramSpecs = params.diagrams;

    //
    // Sort diagrams by name alphabetically
    //
    g_diagramSpecs.sort(Util.sortByName);

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

                    //
                    // If we renamed the currently running diagram, we need
                    // to not leave the old diagram name running on the
                    // controller. Start the renamed diagram and request
                    // status to ensure that current_diagram reflects
                    // the newly renamed diagram as running.
                    //
                    if( g_status.current_diagram &&
                        g_status.current_diagram == diagramSpec.name ) {

                        console.log("[DEBUG] Starting newly named diagram.");
                        sendMessage('start_diagram', { name: newName });

                    } else {
                        console.log("[DEBUG] Renamed non-running diagram.", g_status);
                    }

                    //
                    // Reload list after rename.
                    //
                    sendMessage('list_diagrams');
                    sendMessage('request_status');

				}});
		});

        deleteAction.click(diagramIndex, function(e){
            var diagramSpec = g_diagramSpecs[e.data];
            // TODO: add validator similar to diagram save prompt
            modalConfirm({title: 'Delete Diagram', prompt: 'Are you sure you want to delete this diagram?', yesFunc: function() {
                sendMessage('delete_diagram', {'name': diagramSpec.name });
                deleteDiagramSpec(diagramSpec.name);
                btnGroup.remove();
                //
                // Reload list after deletion and set running diagram.
                //
                sendMessage('list_diagrams');
                sendMessage('request_status');
            }});
        });
        diagramMenu.appendTo(btnGroup);

	};

    //
    // Create new mapping of name to id.
    //
    g_diagramIdMap = {};

	for (var i = 0; i < g_diagramSpecs.length; i++) {
		var diagram = g_diagramSpecs[i];

        g_diagramIdMap[diagram.name] = i;

		var diagramDiv = $('<div>', {class: 'listButton'});
		var btnGroup = $('<div>', {class: 'btn-group'});
		var diagramName = $('<button>', {class: 'btn btn-lg diagram-name', html: diagram.name, id: 'd_' + i}).appendTo(btnGroup);

        diagramName.click(i, function(e) {
            setDiagramInfo( { diagramName: g_diagramSpecs[e.data].name } );
            showDiagramEditor();
            sendMessage('start_diagram', g_diagramSpecs[e.data]);
            loadDiagram(g_diagramSpecs[e.data]);
        });

		createMenu(btnGroup, i, 'dm_' + i);
		btnGroup.appendTo(diagramDiv);
		diagramDiv.appendTo(diagramListDiv);
	}
}

//
// Set diagram info
//
function setDiagramInfo(info) {

    var controllerName  = info['controllerName'];
    var diagramName     = info['diagramName'];
    var interval        = info['interval'];
    var newDiagram      = info['newDiagram'];

    var recording_interval_text = interval ? interval + ' second(s)' : 'none';

    if (controllerName) {
        $('#diagramControllerName').text(controllerName);
    }

    if (diagramName) {
        $('#diagramName').text(diagramName);
    }

    if (newDiagram) {
        $('#diagramName').text('');
    }

    //
    // Use 'in' to check for presence of interval in param map, 
    // since this can be present but null.
    //
    if ('interval' in info) {
        $('#diagramInterval').html("<b>Recording Interval:</b> " + recording_interval_text);
    }

}

/**
 *
 * Handle status message from the controller
 * @param timestamp
 * @param params
 */
function status_handler(timestamp, params) {

    console.log('status', params);

    g_status = params;

    //
    // Add a row to a table
    //
    var addTableRow = function(_table, nameText, valueText) {
        var row     = $('<tr>')
        var name    = $('<td>');
        var value   = $('<td>', { css: { 'paddingLeft': '5px' } } );

        row.appendTo(_table);

        name.text(nameText);
        name.appendTo(row);

        value.text(valueText);
        value.appendTo(row);
    }

    //
    // Add status table
    //
    var statusDiv = $('#controllerStatus');
    statusDiv.empty();

    var statusList  = $('<div>', { css: { 'paddingBottom': '5px' } } );
    var statusTable = $('<table>');

    statusList.appendTo(statusDiv);
    statusTable.appendTo(statusList);

    var recording_interval_text = params.recording_interval ? params.recording_interval + ' second(s)' : 'none';

    g_recordingInterval = params.recording_interval;

    addTableRow(statusTable, 'Number of devices: ', params.device_count);

    addTableRow(statusTable, 'Recording interval: ', recording_interval_text);

    if (params.current_diagram) {

        var id = g_diagramIdMap[params.current_diagram];

        var button = $('#d_' + id);

        console.log("[DEBUG] Setting running button", button);

        if (button) {
            button.addClass('btn-success');
            $('#dm_' + id).addClass('btn-success');
            button.html(params.current_diagram + ' (running' + (g_recordingInterval ? ' and recording' : '') + ')');

            console.log("[DEBUG] Running button set.");
        }
    }

    //
    // Add admin status
    //
    var adminStatusDiv = $('#controllerAdminStatus');
    adminStatusDiv.empty();

    var adminList   = $('<div>', { css: { 'paddingBottom': '5px' } } );
    var adminTable  = $('<table>');

    adminList.appendTo(adminStatusDiv);
    adminTable.appendTo(adminList);

    //
    // Add IP addresses to admin table. (Useful when trying to connect to
    // a device via ssh.)
    //
    if( params.ip_addresses != null ) {
        for (var key in params.ip_addresses) {
            addTableRow(adminTable, key+": ", params.ip_addresses[key]);
        }
    }

    //
    // Add version info. (Useful when trying to track what version of 
    // software is installed.)
    //
    addTableRow(adminTable, "Flow Client Version: ", params.flow_version);
    addTableRow(adminTable, "Rhizo Client Version: ", params.lib_version);

    //
    // Add current_diagram to admin view. (Useful when trying to figure
    // out why no diagrams in the list appear as running.)
    //
    var curDiagram = "N/A";
    if(params.current_diagram) {
        curDiagram = params.current_diagram;
    }
    addTableRow(adminTable, "Current diagram: ", curDiagram);

    setDiagramInfo( {   controllerName: g_controller.name,
                        interval:       params.recording_interval } );


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
    // Clear out old status messages (potentially from some other controller
    // previously selected...)
    //
    $('#controllerStatus').empty();
    $('#controllerAdminStatus').empty();

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

//
// Open a new flow diagram in the diagram editor
//
function newDiagram() {
    console.log("[DEBUG] Setting new diagram with empty name.");
    setDiagramInfo( { newDiagram: true } );
    showDiagramEditor();
    loadDiagram({'blocks': []});  // load an empty diagram
    sendMessage('set_diagram', {diagram: diagramToSpec(g_diagram)});  // send empty diagram to controller
    CodapTest.logTopic('Dataflow/CreateDiagram');
}
