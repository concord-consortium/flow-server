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
        method: 'POST',
        data: { csrf_token: g_csrfToken },
        success: function(data) {
            var response = JSON.parse(data);
            if(response.success) {
                var controllers = response.controllers;
                renderAdminViewData(controllers);
            } else {
                console.log("[ERROR] Error loading controller data.", response);
                alert("Error loading controller data.");
            }
        },
        error: function(data) {
            alert('Error loading admin data.')
        },
    });
}

//
// Util function to create table headers.
//
function createAdminHeader() {
    return  $('<div>', { css: { textAlign: 'center',
                                paddingBottom: '10px' } });
}

//
// Util function to create table cells.
//
function createAdminCell(id) {
    return  $('<div>', {    id: id,
                            css: {  textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    paddingBottom: '5px' } });
}


//
// Render admin controller data returned by ajax API call.
//
function renderAdminViewData(controllers) {

    console.log("[DEBUG] renderAdminViewData", controllers);

    var controllerAdminContent = $('#controllerAdminContent');
    controllerAdminContent.empty();

    g_adminControllerIdMap = {};

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

    //
    // Add table headers
    //
    Util.addTableRow(table, [   createAdminHeader().html('<b>Status</b>'),
                                createAdminHeader().html('<b>Recording</b>'),
                                createAdminHeader().html('<b>Last Online</b>'),
                                createAdminHeader().html('<b>Name</b>'),
                                createAdminHeader().html('<b>Version</b>'),
                                createAdminHeader().html('<b>Updates</b>')    ]);

    if (controllers.length) {
        controllers.sort(Util.sortByName);

        console.log("[DEBUG] Admin view controllers", controllers);

        for (var i = 0; i < controllers.length; i++) {

            (function(_i) {

                var controller = controllers[_i];
                g_adminControllerIdMap[controller.path] = _i;

                console.log("[DEBUG] Admin view controller", controller);

                //
                // Online status
                //
                var onlineDiv = createAdminCell('admin_online_status_'+_i);

                //
                // Recording
                //
                var recordingDiv = createAdminCell('admin_recording_status_'+_i);

                //
                // Last online time
                //
                var lastOnlineDiv = createAdminCell('admin_last_online_'+_i);

                //
                // Controller name
                //
                var nameDiv = createAdminCell('admin_controller_name_'+_i);

                //
                // Version
                //
                var versionDiv = createAdminCell('admin_version_div_'+_i);

                //
                // Available versions (Updates column)
                //
                var swUpdateDiv = $('<div>', {
                                            id: 'software_update_'+i,
                                            css: {  float: 'right',
                                                    width: '100%',
                                                    paddingBottom: '10px',
                                                    textAlign: 'right' } } );



                //
                // Now build a complete table row for this controller.
                //
                Util.addTableRow(table, [   onlineDiv,
                                            recordingDiv,
                                            lastOnlineDiv,
                                            nameDiv,
                                            versionDiv,
                                            swUpdateDiv ]);

                //
                // Update table row cells with controller info.
                //
                setAdminOnlineStatus(    _i, controller.online);
                setAdminRecordingStatus( _i, controller.status);
                setAdminLastOnline(      _i, controller.last_online);
                setAdminControllerName(  _i, controller.name);
                setAdminVersionInfo(     _i, controller.status);

                if(controller.status.operational_status == "UPDATING") {
                    swUpdateDiv.text("Updating...");
                } else {
                    setAdminAvailableVersions(
                                        _i,
                                        controller.status.available_versions,
                                        controller.path);
                }

            })(i);

        }
    }
}

//
// Set online status (note this comes from the REST API, not the
// status message.
//
function setAdminOnlineStatus(i, isOnline) {

    // console.log("[DEBUG] setAdminOnlineStatus", i, isOnline);

    var onlineDiv = $('#admin_online_status_'+i);
    onlineDiv.empty();

    var cls = "circle red";
    if(isOnline) {
        cls = "circle green";
    }
    var onlineCircle = $('<div>', { class: cls } );
    var onlineText = $('<div>');
    onlineCircle.appendTo(onlineDiv);
    onlineText.text(isOnline ? "online" : "offline");
    onlineText.appendTo(onlineDiv);
}

//
// Set recording status
//
function setAdminRecordingStatus(i, status) {

    var recordingDiv = $('#admin_recording_status_'+i);
    recordingDiv.empty();

    if(status.recording_interval != null) {
        // Add check mark
        recordingDiv.html("&#10004;");
    }

}

//
// Set last online status.
// Note this comes from the REST API, not the status message
//
function setAdminLastOnline(i, last_online) {
    var lastOnlineDiv = $('#admin_last_online_'+i);
    lastOnlineDiv.text(last_online);
}

//
// Set admin controller name
//
function setAdminControllerName(i, name) {
    var nameDiv = $('#admin_controller_name_'+i);
    nameDiv.text(name);
}

//
// Set controller version info
//
function setAdminVersionInfo(i, status) {

    var versionDiv = $('#admin_version_div_'+i);
    versionDiv.empty();

    var verTable = $('<table>');
    verTable.appendTo(versionDiv)
    Util.addTableRow(verTable, [
                    $('<div>').text("Flow:"),
                    $('<div>', { css: { whiteSpace: 'nowrap' } } ).text(status.flow_version) ] );

    Util.addTableRow(verTable, [
                    $('<div>').text("Rhizo:"),
                    $('<div>', { css: { whiteSpace: 'nowrap' } } ).text(status.lib_version) ] );

}

//
// Set available versions and software update buttons
//
function setAdminAvailableVersions(i, version_list, path) {

    var swUpdateDiv = $('#software_update_'+i)
    swUpdateDiv.empty();

    var swUpdateTable = $('<table>', { css: { float: 'right' } } );

    var availableVersionsDiv = createAdminCell('software_versions_'+i);
    var select = $('<select>', {    id: 'sw_version_select_'+i,
                                    css: { fontSize: '10px' } } );
    select.appendTo(availableVersionsDiv);

    if(version_list && version_list.length) {
        for(var i = 0; i < version_list.length; i++) {
            var opt = $('<option>', {   text:   version_list[i],
                                        value:  version_list[i]     });
            opt.appendTo(select);
        }
    }

    //
    // Create buttons used for sw update.
    //
    var softwareButton = function(text, func) {

        var button = $('<button>',
                                    {   css: {  position: 'relative',
                                                width: '100%',
                                                bottom: '5px' },
                                        html: text });

        button.css('font-size','10px');
        button.click(func);
        return button;
    }

    downloadButton  = softwareButton('Check for Updates',
                        function() {
                            downloadSoftwareUpdates(path);
                        });

    applyButton     = softwareButton('Apply Update',
                        function() {
                            updateSoftwareVersion(path);
                        });

    swUpdateTable.appendTo(swUpdateDiv);

    Util.addTableRow(swUpdateTable,
                        [ availableVersionsDiv, downloadButton ] );
    Util.addTableRow(swUpdateTable,
                        [ createAdminCell(), applyButton ] );

}

//
// Send a message to a controller.
//
function sendAdminMessage(path, type, params, response_func) {

    addMessageHandler( type + "_response", response_func );

    subscribeToFolder(path);
    setTargetFolder(path);
    if(g_webSocketInited) {
        sendSubscriptions();
        sendMessage(type, params);
        return;
    }
    connectWebSocket(function() {
        console.log("INFO connecting websocket");
        sendMessage(type, params);
    });
}

//
// Download latest versions onto a controller.
//
function downloadSoftwareUpdates(path) {
    console.log("[DEBUG] downloadSoftwareUpdates", path);

    var id = g_adminControllerIdMap[path];
    var swUpdateDiv = $('#software_update_'+id)
    swUpdateDiv.text('Downloading updates...');


    sendAdminMessage(   path,
                        'download_software_updates',
                        {},
                        downloadSoftwareUpdatesResponse );
}

//
// Handle response from download_software_updates
//
function downloadSoftwareUpdatesResponse(ts, params) {
    console.log("[DEBUG] downloadSoftwareUpdatesResponse", params);

    if(!params.success) {
        alert("Error downloading software update for " + params.src_folder);
        return;
    }

    //
    // Now list the latest versions on this controller.
    //
    listSoftwareVersions(params.src_folder)
}

//
// List available software versions on a controller.
//
function listSoftwareVersions(path) {

    console.log("[DEBUG] listSoftwareVersions", path);

    var domId = g_adminControllerIdMap[path];
    var div = $('#software_versions_'+domId);
    div.empty();

    sendAdminMessage(   path,
                        'list_software_versions',
                        {},
                        listSoftwareVersionsResponse );

}

//
// Handle response from list_software_versions
//
function listSoftwareVersionsResponse(ts, params) {

    console.log("[DEBUG] listSoftwareVersionsResponse", params);

    var path = params['src_folder'];
    var domId = g_adminControllerIdMap[path];

    setAdminAvailableVersions(domId, params['version_list'], path);

}


//
// Perform software update
//
function updateSoftwareVersion(path) {

    console.log("[DEBUG] updateSoftwareVersion", path);

    var id = g_adminControllerIdMap[path];
    var value = $('#sw_version_select_'+id).val();

    console.log("[DEBUG] Update to: " + value);

    sendAdminMessage(   path,
                        'update_software_version',
                        { release: value },
                        updateSoftwareVersionResponse );

    var div = $('#software_update_'+id);
    div.text('Updating...');
}

//
// Handle update_software_version response message
//
function updateSoftwareVersionResponse(ts, params) {
    var domId = g_adminControllerIdMap[params['src_folder']];
    var div = $('#software_versions_'+domId);
    div.empty();
    div.text('Updating...');
}

