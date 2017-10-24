g_adminControllerIdMap = {};

//
// Initialize admin view for controller administration
//
function initAdminView() {

    var panel = $('#controllerAdminLabel');
    panel.html('Controller Administration  ');

    var addButton = function(text, func) {

        var button = $('<button>', {    css: {  position: 'relative',
                                                bottom: '5px' },
                                        html: text });

        button.css('font-size','10px');
        button.appendTo(panel);

        button.click(func);
    }

    addButton("Refresh",   
        function() {
            loadAdminViewData();
        });

    addButton("Exit",   
        function() {
            showControllerSelector();
        });

    loadAdminViewData();
}

//
// Make ajax call to obtain admin controller data
//
function loadAdminViewData() {

    var controllerAdminContent = $('#controllerAdminContent');
    controllerAdminContent.empty();
    controllerAdminContent.append(
        $('<div>', { css: { paddingLeft: '10px' } } ).text("Loading...")
    );

    $.ajax({
        url: '/ext/flow/controllers',
        method: 'GET',
        // data: {},
        success: function(data) {
            renderAdminViewData(data);
        },
        error: function(data) {
            alert('Error loading admin data.')
        },
    });
}

//
// Render admin controller data returned by ajax call.
//
function renderAdminViewData(data) {

    console.log("[DEBUG] renderAdminViewData", data);

    var controllerAdminContent = $('#controllerAdminContent');
    controllerAdminContent.empty();

    var controllers = JSON.parse(data);

    var serverInfo = $('<table>', {} );
    Util.addTableRow(serverInfo, [
                                    $('<div>').text("Flow Server Version: "), 
                                    $('<div>').text(g_flow_server_version)  ]);
    Util.addTableRow(serverInfo, [
                                    $('<div>').text("Rhizo Server Version: "),
                                    $('<div>').text(g_rhizo_server_version) ]);
    
    serverInfo.appendTo(controllerAdminContent);
    $('<br>').appendTo(controllerAdminContent);

    var table = $('<table>', {   css: { width: '80%' } } );
    table.appendTo(controllerAdminContent);

    var header = function() {
        return  $('<div>', { css: { textAlign: 'center',
                                    paddingBottom: '10px' } });
    }

    var cell = function(id) {
        return  $('<div>', {    id: id,
                                css: {  textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        paddingBottom: '5px' } });
    }

    Util.addTableRow(table, [   header().html('<b>Status</b>'), 
                                header().html('<b>Recording</b>'),
                                header().html('<b>Last Online</b>'),
                                header().html('<b>Name</b>'),
                                header().html('<b>Version</b>'),
                                header().html('<b>Updates</b>')    ]);

    if (controllers.length) {
        controllers.sort(Util.sortByName);

        console.log("[DEBUG] Admin view controllers", controllers);

        g_adminControllerIdMap = {};

        for (var i = 0; i < controllers.length; i++) {

            var controller = controllers[i];
            g_adminControllerIdMap[controller.path] = i;

            console.log("[DEBUG] Admin view controller", controller);

            //
            // Online status
            //
            var onlineDiv = cell();
            var isOnline = controller.online;
            var cls = "circle red";
            if(isOnline) {
                cls = "circle green";
            }
            var onlineCircle = $('<div>', { class: cls } );
            var onlineText = $('<div>');
            onlineCircle.appendTo(onlineDiv);
            onlineText.text(isOnline ? "online" : "offline");
            onlineText.appendTo(onlineDiv);

            //
            // Recording
            //
            var recordingDiv = cell();
            if(controller.status.recording_interval != null) {
                // Add check mark
                recordingDiv.html("&#10004;");
            }

            //
            // Last online time
            //
            var lastOnline = cell();
            lastOnline.text(controller.last_online);

            //
            // Name
            //
            var name = cell();
            name.text(controller.name);

            //
            // Version
            //
            var versionDiv = cell();
            var verTable = $('<table>');
            verTable.appendTo(versionDiv)
            Util.addTableRow(verTable, [
                    $('<div>').text("Flow:"),
                    $('<div>', { css: { whiteSpace: 'nowrap' } } ).text(controller.status.flow_version) ] );
                
            Util.addTableRow(verTable, [
                    $('<div>').text("Rhizo:"),
                    $('<div>', { css: { whiteSpace: 'nowrap' } } ).text(controller.status.lib_version) ] );

            //
            // Available versions
            //
            var swUpdateDiv = $('<div>', {
                                            id: 'software_update_'+i,
                                            css: {  float: 'right',
                                                    width: '100%',
                                                    paddingBottom: '10px',
                                                    textAlign: 'right' } } );
            
            var swUpdateTable = $('<table>', { css: { float: 'right' } } );

            var availableVersionsDiv = cell('software_versions_'+i);
            var select = $('<select>', { css: { fontSize: '10px' } } );
            select.appendTo(availableVersionsDiv);

            //
            // Create buttons used for sw update.
            //
            var softwareButton = function(text, func) {

                var button = $('<button>', {    css: {  position: 'relative',
                                                        width: '100%',
                                                        bottom: '5px' },
                                                html: text });

                button.css('font-size','10px');
                button.click(func);
                return button;
            }

            downloadButton = softwareButton('Download Latest',
                function() {
                    download_software_updates(controller.path);
                });

            refreshButton = softwareButton('Refresh List',
                function() {
                    list_software_versions(controller.path);
                });
           
            applyButton = softwareButton('Apply Version');

            swUpdateTable.appendTo(swUpdateDiv);

            Util.addTableRow(swUpdateTable, 
                                [ availableVersionsDiv, downloadButton ] );
            Util.addTableRow(swUpdateTable, 
                                [ cell(), refreshButton ] );
            Util.addTableRow(swUpdateTable, 
                                [ cell(), applyButton ] );

            //
            // Now build a complete table row for this controller.
            //
            Util.addTableRow(table, [   onlineDiv, 
                                        recordingDiv,
                                        lastOnline,
                                        name, 
                                        versionDiv,
                                        swUpdateDiv ]);
        }

    }

}

//
// Send a message to a controller.
//
function sendAdminMessage(path, type, response_func) {

    addMessageHandler( type + "_response", response_func );

    subscribeToFolder(path);
    setTargetFolder(path);
    if(g_webSocketInited) {
        sendSubscriptions();
        sendMessage(type);
        return;
    }
    connectWebSocket(function() {
        console.log("INFO connecting websocket");
        sendMessage(type);
    });
}

//
// Download latest versions onto a controller.
//
function download_software_updates(path) {
    console.log("[DEBUG] download_software_updates", path);

    sendAdminMessage(   path, 
                        'download_software_updates',
                        download_software_updates_response );
}

//
// Handle response from download_software_updates
//
function download_software_updates_response(ts, params) {
    console.log("[DEBUG] download_software_updates_response", params);

    if(!params.success) {
        alert("Error downloading software update for " + params.src_folder);
    }
}

//
// List available software versions on a controller.
//
function list_software_versions(path) {

    console.log("[DEBUG] list_software_versions", path);

    var domId = g_adminControllerIdMap[path];
    var div = $('#software_versions_'+domId);
    div.empty();

    sendAdminMessage(   path, 
                        'list_software_versions', 
                        list_software_versions_response );

}

//
// Handle response from list_software_versions
//
function list_software_versions_response(ts, params) {

    console.log("[DEBUG] list_software_versions_response", params);

    var path = params['src_folder'];
    var domId = g_adminControllerIdMap[path];
    var div = $('#software_versions_'+domId);
    div.empty();

    var select = $('<select>', { css: { fontSize: '10px' } } );
    select.appendTo(div);

    var list = params['version_list'];
    if(list.length) {
        for(var i = 0; i < list.length; i++) {
            var opt = $('<option>', { text: list[i], value: list[i] })
            opt.appendTo(select);
        }
    }

}

