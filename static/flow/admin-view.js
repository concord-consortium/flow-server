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

    var table = $('<table>', {   css: { width: '60%' } } );
    table.appendTo(controllerAdminContent);

    var header = function() {
        return  $('<div>', { css: { textAlign: 'center',
                                    paddingBottom: '10px' } });
    }

    var cell = function() {
        return  $('<div>', { css: { textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    paddingBottom: '5px' } });
    }

    Util.addTableRow(table, [   header().html('<b>Status</b>'), 
                                header().html('<b>Recording</b>'),
                                header().html('<b>Last Online</b>'),
                                header().html('<b>Name</b>'),
                                header().html('<b>Version</b>')    ]);

    if (controllers.length) {
        controllers.sort(Util.sortByName);

        console.log("[DEBUG] Admin view controllers", controllers);

        for (var i = 0; i < controllers.length; i++) {
            var controller = controllers[i];

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

            Util.addTableRow(table, [   onlineDiv, 
                                        recordingDiv,
                                        lastOnline,
                                        name, 
                                        versionDiv ]);
        }

    } 

}
