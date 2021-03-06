//
// Admin view
//
var AdminView = function(options) {

    var base = BaseView(options);
    var _this = this;

    var content = $('#'+base.getDivId());

    this.adminControllerIdMap = {};

    //
    // Create the view heading with title and nav buttons
    //
    this.createViewHeading = function() {

        var heading = $('<h2>', { css: { textAlign: 'center' } } );
        heading.html('Controller Administration  ');
        heading.appendTo(content);

        var addButton = function(text, func) {

            var button = $('<button>', {    css: {  position: 'relative',
                                                    bottom: '5px' },
                                            html: text });

            button.css('font-size','10px');
            button.appendTo(heading);

            button.click(func);
        }


        addButton("Refresh",
            function() {
                console.log("[DEBUG] refresh admin view");
                _this.loadAdminViewData();
            });

        addButton("Exit",
            function() {
                console.log("[DEBUG] exit admin view");
                showTopLevelView('landing-page-view');
            });

        return heading;
    }


    //
    // Make ajax call to obtain admin controller data
    //
    this.loadAdminViewData = function() {

        var controllerAdminContent = $('#'+base.getDivId());
        controllerAdminContent.empty();

        var heading = _this.createViewHeading();
        heading.appendTo(controllerAdminContent);

        controllerAdminContent.append(
            $('<div>', { css: { paddingLeft: '10px' } } ).text("Loading...")
        );

        $.ajax({
            url:    '/ext/flow/controllers',
            method: 'POST',
            data:   { csrf_token: g_csrfToken },
            success: function(data) {
                var response = JSON.parse(data);
                if (response.success) {
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

    };

    //
    // Create the user admin div area
    //
    this.createUserAdminDiv = function() {

        var controllerAdminContent = $('#'+base.getDivId());
        var userAdmin = $('<div>', {    id: 'user-admin-div',
                                        css: {  height: '500px',
                                                padding: '5px' } } );
        controllerAdminContent.append(userAdmin);
        _this.updateUserAdminDiv();
    };

    //
    // Update the user admin div.
    //
    this.updateUserAdminDiv = function() {
        var userAdmin = $('#user-admin-div');
        userAdmin.empty();

        var userAdminLabel = $('<h3>').text("User Administration");
        userAdmin.append(userAdminLabel);

        var searchLabel = $('<span>').text('Username: ');
        userAdmin.append(searchLabel);

        var username = $('<input>', { id: 'user-admin-search', type: 'text' });
        userAdmin.append(username);

        var userSearch = $('<button>', { id: 'user-search-button'} ).text('Search');
        userAdmin.append(userSearch);

        var userSearchResult = $('<div>', { id: 'user-admin-search-result' } );
        userAdmin.append(userSearchResult);

        userSearch.click( function() {
            username = $('#user-admin-search').val();
            $('#user-admin-search-result').empty();

            $.ajax({
                url:    '/ext/flow/get_user',
                method: 'POST',
                data:   {   username:   username,
                            csrf_token: g_csrfToken },

                success: function(data) {
                    var response = JSON.parse(data);
                    if (response.success) {
                        var user = response.data;
                        var resultDiv = $('#user-admin-search-result');

                        resultDiv.empty();
                        var resultTable = $('<table>');

                        Util.addTableRow(resultTable, [
                                            $('<div>').text("Username"),
                                            $('<div>').text(user.user_name) ],
                                            { padding: '5px' } );

                        Util.addTableRow(resultTable, [
                                            $('<div>').text("Email"),
                                            $('<div>').text(user.email_address) ],
                                            { padding: '5px' } );

                        Util.addTableRow(resultTable, [
                                            $('<div>').text("Full Name"),
                                            $('<div>').text(user.full_name) ],
                                            { padding: '5px' } );

                        Util.addTableRow(resultTable, [
                                            $('<div>').text("SSO User"),
                                            $('<div>').text(user.is_sso) ],
                                            { padding: '5px' } );


                        var setAdmin = $('<button>');
                        if (user.is_admin) {
                            setAdmin.text('Remove Admin');
                        } else {
                            setAdmin.text('Set Admin');
                        }
                        setAdmin.click( function() {
                            _this.updateUser(username,
                                                { is_admin: !user.is_admin } );
                        });

                        Util.addTableRow(resultTable, [
                                            $('<div>').text("Admin"),
                                            $('<div>').text(user.is_admin),
                                            setAdmin ],
                                            { padding: '5px' } );


                        resultDiv.append(resultTable);

                    } else {
                        console.log("[ERROR] Cannot find user.", response);
                        alert("Cannot find user " + username);
                    }
                },

                error: function(data) {
                    console.log('[ERROR] Error searching for user', data);
                    alert('Error searching for user ' + username);
                }
            });

        });

    };

    //
    // Update user data
    //
    this.updateUser = function(username, data) {
        console.log("[DEBUG] updateUser", username, data);

        $.ajax({
                url:    '/ext/flow/set_user',
                method: 'POST',
                data:   {   username:   username,
                            data:       JSON.stringify(data),
                            csrf_token: g_csrfToken },

                success: function(data) {
                    var response = JSON.parse(data);
                    if (response.success) {

                        alert("Updated user " + username);

                        //
                        // Perform a search again using the same username
                        // to refresh the user info div
                        //
                        $('#user-admin-search').val(username);
                        $('#user-search-button').click();

                    } else {
                        console.log("[ERROR] Error updating user.", response);
                        alert('Error updating user ' + username);
                    }
                },
                error: function(data) {
                    console.log('[ERROR] Error updating user', data);
                    alert('Error updating user ' + username);
                }
            });



    };

    //
    // Util function to create table headers.
    //
    this.createAdminTableHeader = function() {
        return  $('<div>', { css: { textAlign: 'center',
                                    paddingBottom: '10px' } });
    }

    //
    // Util function to create table cells.
    //
    this.createAdminTableCell = function(id) {
        return  $('<div>', {    id: id,
                                css: {  textAlign: 'center',
                                        fontSize:   '12px',
                                        whiteSpace: 'nowrap',
                                        paddingBottom: '5px' } });
    }


    //
    // Render admin controller data returned by ajax API call.
    //
    this.renderAdminViewData = function(controllers) {

        // console.log("[DEBUG] renderAdminViewData", controllers);

        var controllerAdminContent = $('#'+base.getDivId());
        controllerAdminContent.empty();

        var heading = _this.createViewHeading();
        heading.appendTo(controllerAdminContent);

        _this.adminControllerIdMap = {};

        var serverInfo = $('<table>', {} );
        Util.addTableRow(serverInfo, [
                                        $('<div>').text("Flow Server Version: "),
                                        $('<div>').text(g_flow_server_version)  ],
                                        { paddingLeft: '5px' } );
        Util.addTableRow(serverInfo, [
                                        $('<div>').text("Rhizo Server Version: "),
                                        $('<div>').text(g_rhizo_server_version) ],
                                        { paddingLeft: '5px' } );

        serverInfo.appendTo(controllerAdminContent);
        $('<br>').appendTo(controllerAdminContent);

        //
        // Main admin controller table
        //
        var table = $('<table>', { css: { width: '95%' } } );
        table.appendTo(controllerAdminContent);

        //
        // Add table headers
        //
        Util.addTableRow(table,
                [   _this.createAdminTableHeader().html('<b>Status</b>'),
                    _this.createAdminTableHeader().html('<b>Recording</b>'),
                    _this.createAdminTableHeader().html('<b>Controls</b>'),
                    _this.createAdminTableHeader().html('<b>Last Online</b>'),
                    _this.createAdminTableHeader().html('<b>Name</b>'),
                    _this.createAdminTableHeader().html('<b>Version</b>'),
                    _this.createAdminTableHeader().html('<b>Updates</b>')    ],
                    { paddingLeft: '5px' } );

        if (controllers.length) {
            controllers.sort(Util.sortByName);

            // console.log("[DEBUG] Admin view controllers", controllers);

            for (var i = 0; i < controllers.length; i++) {

                (function(_i) {

                    var controller = controllers[_i];
                    _this.adminControllerIdMap[controller.path] = _i;

                    // console.log("[DEBUG] Admin view controller", controller);

                    //
                    // Online status
                    //
                    var onlineDiv = _this.createAdminTableCell('admin_online_status_'+_i);

                    //
                    // Recording status
                    //
                    var recordingDiv = _this.createAdminTableCell('admin_recording_status_'+_i);

                    //
                    // Recording controls
                    //
                    var recordingControlDiv = _this.createAdminTableCell('admin_recording_control_'+_i);

                    var createRecordingControl = function(text, func) {
                        var button = $('<button>',
                                        {   css: {
                                                    width: '100%',
                                                    bottom: '5px' },
                                            html: text });
                        button.css('font-size','10px');
                        button.click(func);
                        return button;
                    };

                    var stopProgram = createRecordingControl('Stop Program',
                        function() {
                            var path = controller.path;
                            console.log("[DEBUG] stop program", path);
                            _this.sendAdminMessage( path,
                                                    'stop_diagram',
                                                    {} );
                            _this.sendAdminMessage( path,
                                                    'request_status',
                                                    {} );
                        }
                    );

                    stopProgram.appendTo(recordingControlDiv);

                    //
                    // Last online time
                    //
                    var lastOnlineDiv = _this.createAdminTableCell('admin_last_online_'+_i);

                    //
                    // Controller name
                    //
                    var nameDiv = _this.createAdminTableCell('admin_controller_name_'+_i);

                    //
                    // Version
                    //
                    var versionDiv = _this.createAdminTableCell('admin_version_div_'+_i);

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
                                                recordingControlDiv,
                                                lastOnlineDiv,
                                                nameDiv,
                                                versionDiv,
                                                swUpdateDiv ],
                                                { paddingLeft: '5px' } );

                    var detailsDiv = _this.createAdminTableCell('admin_details_div_'+_i);
                    detailsDiv.css('display','inline-block');
                    detailsDiv.hide();

                    //
                    // Add the details row
                    //
                    var detailRow = $('<tr>');
                    var detailCell = $('<td>', { colspan: 7 } );
                    table.append(detailRow);
                    detailRow.append(detailCell);
                    detailCell.append(detailsDiv);


                    //
                    // Update table row cells with controller info.
                    //
                    _this.setAdminOnlineStatus(    _i, controller.online);
                    _this.setAdminRecordingStatus( _i, controller.status);
                    _this.setAdminLastOnline(      _i, controller.last_online);
                    _this.setAdminControllerName(  _i, controller.name);
                    _this.setAdminVersionInfo(     _i, controller.status);

                    if (controller.status.operational_status == "UPDATING") {
                        swUpdateDiv.text("Updating...");
                    } else {
                        _this.setAdminAvailableVersions(
                                            _i,
                                            controller.status.available_versions,
                                            controller.path);
                    }

                    _this.setAdminDetailInfo(_i, controller.status);

                })(i);

            }
        }

        _this.createUserAdminDiv();
    }

    //
    // Set online status (note this comes from the REST API, not the
    // status message.
    //
    this.setAdminOnlineStatus = function(i, isOnline) {

        // console.log("[DEBUG] setAdminOnlineStatus", i, isOnline);

        var onlineDiv = $('#admin_online_status_'+i);
        onlineDiv.empty();

        var cls = "circle red";
        if (isOnline) {
            cls = "circle green";
        }
        var onlineCircle = $('<div>', { class: cls } );
        var onlineText = $('<div>');
        onlineCircle.appendTo(onlineDiv);
        onlineText.text(isOnline ? "online" : "offline");
        onlineText.appendTo(onlineDiv);

        //
        // Add toggle for detail view
        //
        onlineDiv.click( function() {
            var detailsDiv = $('#admin_details_div_'+i);
            if (detailsDiv.is(":visible")) {
                detailsDiv.hide();
            } else {
                detailsDiv.show();
            }
        });
        onlineDiv.css('cursor','pointer');
    }

    //
    // Set recording status
    //
    this.setAdminRecordingStatus = function(i, status) {

        var recordingDiv = $('#admin_recording_status_'+i);
        recordingDiv.empty();

        if (status.recording_interval != null) {
            // Add check mark
            recordingDiv.html("&#10004;");
        }

    }

    //
    // Set last online status.
    // Note this comes from the REST API, not the status message
    //
    this.setAdminLastOnline = function(i, last_online) {

        var lastOnlineDiv = $('#admin_last_online_'+i);
        lastOnlineDiv.html( Util.getLocalDate(last_online) +
                            "<br/>" +
                            Util.getLocalTime(last_online) );
    }

    //
    // Set admin controller name
    //
    this.setAdminControllerName = function(i, name) {
        var nameDiv = $('#admin_controller_name_'+i);
        nameDiv.text(name);
    }

    //
    // Set controller version info
    //
    this.setAdminVersionInfo = function(i, status) {

        var versionDiv = $('#admin_version_div_'+i);
        versionDiv.empty();

        var verTable = $('<table>');
        verTable.appendTo(versionDiv)
        Util.addTableRow(
                verTable,
                [
                    _this.createAdminTableCell()
                        .css('text-align','left')
                        .text("Flow:"),
                    _this.createAdminTableCell()
                        .css('text-align','left')
                        .text(status.flow_version)
                ],
                { paddingLeft: '5px' } );

        Util.addTableRow(
                verTable,
                [
                    _this.createAdminTableCell()
                        .css('text-align','left')
                        .text("Rhizo:"),
                    _this.createAdminTableCell()
                        .css('text-align','left')
                        .text(status.lib_version)
                ],
                { paddingLeft: '5px' } );

    }

    //
    // Set available versions and software update buttons
    //
    this.setAdminAvailableVersions = function(i, version_list, path) {

        var swUpdateDiv = $('#software_update_'+i)
        swUpdateDiv.empty();

        var swUpdateTable = $('<table>', { css: { float: 'right' } } );

        var availableVersionsDiv = _this.createAdminTableCell('software_versions_'+i);

        var select = $('<select>', {    id: 'sw_version_select_'+i,
                                        css: {  fontSize: '10px' } });

        select.appendTo(availableVersionsDiv);

        if (version_list && version_list.length) {
            for (var i = 0; i < version_list.length; i++) {
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
                                        {   css: {  whiteSpace: 'no-wrap',
                                                    width: '100%',
                                                    bottom: '5px' },
                                            html: text });

            button.css('font-size','10px');
            button.click(func);
            return button;
        }

        downloadButton  = softwareButton('Check for Updates',
                            function() {
                                _this.downloadSoftwareUpdates(path);
                            });

        applyButton     = softwareButton('Apply Update',
                            function() {
                                _this.updateSoftwareVersion(path);
                            });

        swUpdateTable.appendTo(swUpdateDiv);

        Util.addTableRow(swUpdateTable,
                            [ availableVersionsDiv, downloadButton ],
                            {   verticalAlign:  'top',
                                paddingLeft:    '3px'   } );
        Util.addTableRow(swUpdateTable,
                            [ _this.createAdminTableCell(), applyButton ],
                            {   verticalAlign:  'top',
                                paddingLeft:    '3px'   } );

    }

    //
    // Set controller detail info
    //
    this.setAdminDetailInfo = function(i, status) {

        var detailsDiv = $('#admin_details_div_'+i);
        detailsDiv.empty();

        var ipTable = $('<table>');

        if (status.ip_addresses != null) {
            for (var key in status.ip_addresses) {
                Util.addTableRow(ipTable,
                    [
                        _this.createAdminTableCell()
                            .css('text-align', 'left')
                            .text(key+": "),
                        _this.createAdminTableCell()
                            .css('text-align', 'left')
                            .text(status.ip_addresses[key])
                    ],
                    { paddingLeft: '5px' } );
            }
        }

        detailsDiv.append(ipTable);

        var currentProgram = $('<span>', { css: {   float: 'left',
                                                    paddingLeft: '5px' } } );
        if (status.current_diagram == null) {
            currentProgram.text("No Current Program");
        } else {
            currentProgram.text("Current Program: " + status.current_diagram);
        }

        detailsDiv.append(currentProgram);

        detailsDiv.append($('<br>'));

        var currentUser = $('<span>', { css: {    float: 'left',
                                                    paddingLeft: '5px',
                                                    paddingBottom: '2px' } } );
        if (status.username == null) {
            currentUser.text("No Current User");
        } else {
            currentUser.text("Current User: " + status.username);
        }

        detailsDiv.append(currentUser);

    }

    //
    // Send a message to a controller.
    //
    this.sendAdminMessage = function(path, type, params, response_func) {

        if (response_func) {
            addMessageHandler( type + "_response", response_func );
        }

        subscribeToFolder(path);
        setTargetFolder(path);
        if (g_webSocketInited) {
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
    this.downloadSoftwareUpdates = function(path) {

        console.log("[DEBUG] downloadSoftwareUpdates", path);

        var id = _this.adminControllerIdMap[path];
        var swUpdateDiv = $('#software_update_'+id)
        swUpdateDiv.text('Downloading updates...');


        sendAdminMessage(   path,
                            'download_software_updates',
                            {},
                            _this.downloadSoftwareUpdatesResponse );
    }

    //
    // Handle response from download_software_updates
    //
    this.downloadSoftwareUpdatesResponse = function(ts, params) {

        console.log("[DEBUG] AdminView.downloadSoftwareUpdatesResponse", params);

        if (!params.success) {
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
    this.listSoftwareVersions = function(path) {

        console.log("[DEBUG] listSoftwareVersions", path);

        var domId = _this.adminControllerIdMap[path];
        var div = $('#software_versions_'+domId);
        div.empty();

        sendAdminMessage(   path,
                            'list_software_versions',
                            {},
                            _this.listSoftwareVersionsResponse );

    }

    //
    // Handle response from list_software_versions
    //
    this.listSoftwareVersionsResponse = function(ts, params) {

        console.log("[DEBUG] AdminView.listSoftwareVersionsResponse", params);

        var path = params['src_folder'];
        var domId = _this.adminControllerIdMap[path];

        setAdminAvailableVersions(domId, params['version_list'], path);

    }


    //
    // Perform software update
    //
    this.updateSoftwareVersion = function(path) {

        console.log("[DEBUG] updateSoftwareVersion", path);

        var id = _this.adminControllerIdMap[path];
        var value = $('#sw_version_select_'+id).val();

        console.log("[DEBUG] Update to: " + value);

        sendAdminMessage(   path,
                            'update_software_version',
                            { release: value },
                            _this.updateSoftwareVersionResponse );

        var div = $('#software_update_'+id);
        div.text('Updating...');
    }

    //
    // Handle update_software_version response message
    //
    this.updateSoftwareVersionResponse = function(ts, params) {

        console.log("[DEBUG] AdminView.updateSoftwareVersionResponse", params);

        var domId = _this.adminControllerIdMap[params['src_folder']];
        var div = $('#software_versions_'+domId);
        div.empty();
        div.text('Updating...');
    }

    base.show = function() {
        $('#'+base.getDivId()).show();
        _this.loadAdminViewData();
    }
    return base;
}

