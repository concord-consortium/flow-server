// initialize a view that lets the user choose a controller
function initControllerSelector() {
	var vm = new Vue({
		template: [
			'<div id="controllerSelectorPanel" class="flowPanel">',
				'<div class="row">',
					'<div class="col-md-4"></div>',
					'<div class="col-md-4">',
						'<h2>Select a Controller</h2>',
						'<div class="controllerList" v-if="controllers.length > 0">',
							'<div v-for="controller in controllers">',
								'<button class="btn btn-lg listButton" v-on:click="viewController(controller)">{{controller.name}}</button>',
							'</div>',
						'</div>',
						'<div v-else>',
							'<input id="controller_name_entry" class="form-control" v-model="customController" />',
							'<button class="btn btn-primary" v-on:click="fetchController()">Go</button>',
						'</div>',
					'</div>',
					'<div class="col-md-4"></div>',
				'</div>',
			'</div>'
		].join('\n'),
	  el: '#app',
		data: {
			controllers: g_controllers, // Populate if user is logged in
			customController: ''
		},
		methods: {
			viewController: function(controller){
				g_controller = controller;
				// showControllerViewer();
			},
			fetchController: function(){
				$.ajax({
					url: '/ext/flow/select',
					method: 'POST',
					data: {
						controller_name: this.customController
					},
					success: function(data) {
						g_controller = JSON.parse(data);
						showControllerViewer();
					},
					error: function(data) {
						alert('Controller not found.')
					},
				});
			}
		}
	});
}
