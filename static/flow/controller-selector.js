//
// Initialize a view that lets the user choose a controller
//
function initControllerSelector() {
    var controllerListDiv = $('#controllerList');
    controllerListDiv.empty();

    if (g_controllers.length) {

        g_controllers.sort(Util.sortByName);

        $('#controllerSelectorLabel').html('Select your controller. ');

        console.log("[DEBUG] user ", g_user);

        if(g_adminEnabled && g_user.isAdmin) {

            var panel = $('#controllerSelectorLabel');

            var button = $('<button>', {    css: {  position: 'relative',
                                                    bottom: '5px' },
                                            html: 'Admin' } );

            button.css('font-size','10px');

            button.click(i, function(e) {
                showAdminView();
            });
            button.appendTo(panel);
        }

        for (var i = 0; i < g_controllers.length; i++) {
            var controller = g_controllers[i];
            var div = $('<div>');
            var button = $('<button>', {class: 'btn btn-lg listButton', html: controller.name}).appendTo(div);
            button.click(i, function(e) {
                g_controller = g_controllers[e.data];
                CodapTest.logTopic('Dataflow/SelectPi');
                showControllerViewer();
            });
            div.appendTo(controllerListDiv);
        }

    // if not, assume user isn't logged in and allow them to type in a controller name
    } else {
        $('#controllerSelectorLabel').html('Enter the name of your controller:');
        $('<input>', {class: 'form-control', id: 'controller_name_entry'}).appendTo(controllerListDiv);
        $('<button>', {class: 'btn btn-primary', html: 'Go'}).appendTo(controllerListDiv).click(function() {
            $.ajax({
                url: '/ext/flow/select',
                method: 'POST',
                data: {controller_name: $('#controller_name_entry').val()},
                success: function(data) {
                    g_controller = JSON.parse(data);
                    CodapTest.logTopic('Dataflow/SelectPi');
                    showControllerViewer();
                },
                error: function(data) {
                    alert('Controller not found.')
                },
            });
        });
    }
}
