//
// Initialize admin view for controller administration
//
function initAdminView() {

    var panel = $('#controllerAdminLabel');
    panel.html('Controller Administration  ');

    var button = $('<button>', {    css: {  position: 'relative',
                                            bottom: '5px' },
                                    html: 'Exit' });

    button.css('font-size','10px');
    button.appendTo(panel);

    button.click(function() {
        showControllerSelector();
    });

    loadAdminViewData();
}

//
// Make ajax call to obtain admin controller data
//
function loadAdminViewData() {

    var controllerListDiv = $('#controllerAdminList');
    controllerListDiv.empty();

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

    var controllerListDiv = $('#controllerAdminList');
    controllerListDiv.empty();

    var controllers = JSON.parse(data);

    var table= $('<table>', {   css: { width: '50%' } } );
    table.appendTo(controllerListDiv);

    var header = function() {
        return  $('<div>', { css: { textAlign: 'center',
                                    paddingBottom: '10px' } });
    }

    var cell = function() {
        return  $('<div>', { css: { textAlign: 'center',
                                    paddingBottom: '5px' } });
    }

    Util.addTableRow(table, [   header().text('Status'), 
                                header().text('Last Online'),
                                header().text('Name'),
                                header().text('Version')    ]);

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
            var css = "circle red";
            if(isOnline) {
                css = "circle green";
            }
            var onlineCircle = $('<div>', { class: css } );
            var onlineText = $('<div>');
            onlineCircle.appendTo(onlineDiv);
            onlineText.text(isOnline ? "online" : "offline");
            onlineText.appendTo(onlineDiv);

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
            var version = cell();
            version.text(controller.status.flow_version);

            Util.addTableRow(table, [   onlineDiv, 
                                        lastOnline,
                                        name, 
                                        version ]);
        }

    } 

}
