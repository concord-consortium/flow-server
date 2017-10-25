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
// Util function to create table headers.
//
function admin_header() {
    return  $('<div>', { css: { textAlign: 'center',
                                paddingBottom: '10px' } });
}

//
// Util function to create table cells.
//
function admin_cell(id) {
    return  $('<div>', {    id: id,
                            css: {  textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    paddingBottom: '5px' } });
}


//
// Render admin controller data returned by ajax API call.
//
function renderAdminViewData(data) {

    console.log("[DEBUG] renderAdminViewData", data);

    var controllerAdminContent = $('#controllerAdminContent');
    controllerAdminContent.empty();

    var controllers = JSON.parse(data);
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
    Util.addTableRow(table, [   admin_header().html('<b>Status</b>'), 
                                admin_header().html('<b>Recording</b>'),
                                admin_header().html('<b>Last Online</b>'),
                                admin_header().html('<b>Name</b>'),
                                admin_header().html('<b>Version</b>'),
                                admin_header().html('<b>Updates</b>')    ]);

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
                var onlineDiv = admin_cell('admin_online_status_'+_i);

                //
                // Recording
                //
                var recordingDiv = admin_cell('admin_recording_status_'+_i);
 
                //
                // Last online time
                //
                var lastOnlineDiv = admin_cell('admin_last_online_'+_i);

                //
                // Controller name
                //
                var nameDiv = admin_cell('admin_controller_name_'+_i);

                //
                // Version
                //
                var versionDiv = admin_cell('admin_version_div_'+_i);
            
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
                set_admin_online_status(    _i, controller.online);
                set_admin_recording_status( _i, controller.status);
                set_admin_last_online(      _i, controller.last_online);
                set_admin_controller_name(  _i, controller.name);
                set_admin_version_info(     _i, controller.status);

                set_admin_available_versions(   
                                    _i, 
                                    controller.status.available_versions, 
                                    controller.path);

            })(i);
 
        }
    }
}

//
// Set online status (note this comes from the REST API, not the
// status message.
//
function set_admin_online_status(i, isOnline) {

    // console.log("[DEBUG] set_admin_online_status", i, isOnline);

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
function set_admin_recording_status(i, status) {

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
function set_admin_last_online(i, last_online) {
    var lastOnlineDiv = $('#admin_last_online_'+i);
    lastOnlineDiv.text(last_online);
}

//
// Set admin controller name
//
function set_admin_controller_name(i, name) {
    var nameDiv = $('#admin_controller_name_'+i);
    nameDiv.text(name);
}

//
// Set controller version info
//
function set_admin_version_info(i, status) {

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
function set_admin_available_versions(i, version_list, path) {

    var swUpdateDiv = $('#software_update_'+i)
    swUpdateDiv.empty();

    var swUpdateTable = $('<table>', { css: { float: 'right' } } );

    var availableVersionsDiv = admin_cell('software_versions_'+i);
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
                            download_software_updates(path);
                        });
    
    applyButton     = softwareButton('Apply Update',
                        function() {
                            update_software_version(path);
                        });

    swUpdateTable.appendTo(swUpdateDiv);

    Util.addTableRow(swUpdateTable, 
                        [ availableVersionsDiv, downloadButton ] );
    Util.addTableRow(swUpdateTable, 
                        [ admin_cell(), applyButton ] );

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
function download_software_updates(path) {
    console.log("[DEBUG] download_software_updates", path);

    var id = g_adminControllerIdMap[path];
    var swUpdateDiv = $('#software_update_'+id)
    swUpdateDiv.text('Downloading updates...');


    sendAdminMessage(   path,
                        'download_software_updates',
                        {},
                        download_software_updates_response );
}

//
// Handle response from download_software_updates
//
function download_software_updates_response(ts, params) {
    console.log("[DEBUG] download_software_updates_response", params);

    if(!params.success) {
        alert("Error downloading software update for " + params.src_folder);
        return;
    }

    //
    // Now list the latest versions on this controller.
    //
    list_software_versions(params.src_folder)
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
                        {},
                        list_software_versions_response );

}

//
// Handle response from list_software_versions
//
function list_software_versions_response(ts, params) {

    console.log("[DEBUG] list_software_versions_response", params);

    var path = params['src_folder'];
    var domId = g_adminControllerIdMap[path];

    set_admin_available_versions(domId, params['version_list'], path);

}


//
// Perform software update
//
function update_software_version(path) {

    console.log("[DEBUG] update_software_version", path);

    var id = g_adminControllerIdMap[path];
    var value = $('#sw_version_select_'+id).val();

    console.log("[DEBUG] Update to: " + value);

    sendAdminMessage(   path,
                        'update_software_version',
                        { release: value },
                        update_software_version_response );
    
    var div = $('#software_update_'+id);
    div.text('Updating...');
}

//
// update_software_version response
//
function update_software_version_response(ts, params) {
    var domId = g_adminControllerIdMap[params['src_folder']];
    var div = $('#software_versions_'+domId);
    div.empty();
    div.text('Updating...');
}

