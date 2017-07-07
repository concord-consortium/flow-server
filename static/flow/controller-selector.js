// initialize a view that lets the user choose a controller
function initControllerSelector() {
	var controllerListDiv = $('#controllerList');
	controllerListDiv.empty();

	// if we have a list of controllers, the user is logged in and can pick one of them
	if (g_controllers.length) {
		$('#controllerSelectorLabel').html('Select your controller:');
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
