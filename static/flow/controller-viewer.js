var g_diagramSpecs = [];  // a collection of all diagrams on the controller
var g_controllerViewerInitialized = false;

// prepare an interface for viewing the diagrams contained within a controller
function controllerViewerView() {
	return Vue.component('controller-viewer', {
		template: [
			'<div id="controllerViewerPanel" class="flowPanel center-block">',
				'<div class="row">',
					'<div class="col-md-4"></div>',
					'<div class="col-md-4">',
						'<h2>Flow Diagrams</h2> <span class="controllerStatus"><a data-toggle="collapse" href="#controllerStatus" aria-expanded="false" aria-controls="controllerStatus">Status</a></span>',
						'<div class="collapse" id="controllerStatus">',
						  '<div class="well">',
						    '{{statusMsg}}',
						  '</div>',
						'</div>',
						'<div v-if="connecting">Connecting to controller...</div>',
						'<div id="diagramList" v-for="(diagram, i) in diagrams">',
							'<div class="listButton">',
								'<div class="btn-group">',
									'<button class="btn btn-lg diagram-name" v-on:click="viewDiagram(diagram)">{{diagram.name}}</button>',
									'<button class="btn btn-lg dropdown-toggle" style="height:45px;" data-toggle="dropdown"><span class="caret"></span></button>',
									'<ul class="dropdown-menu">',
										'<li v-on:click="renameDiagram(diagram)"><a>Rename</a></li>',
										'<li v-on:click="deleteDiagram(diagram, i)"><a>Delete</a></li>',
									'</ul>',
								'</div>',
							'</div>',
						'</div>',
						'<button class="btn btn-primary" v-on:click="newDiagram()">New Diagram</button>',
						'<button class="btn btn-primary" v-on:click="closeView()">Close Controller</button>',
					'</div>',
					'<div class="col-md-4"></div>',
				'</div>',
			'</div>'
		].join('\n'),
		data: function(){
			return {
				connecting: true,
				diagrams: [], // Populate from message handler
				statusMsg: '...'
			}
		},
		methods: {
			newDiagram: function(){
				// open a new flow diagram in the diagram editor
				showDiagramEditor();
				loadDiagram({'blocks': []});  // load an empty diagram
				sendMessage('set_diagram', {diagram: diagramToSpec(g_diagram)});  // send empty diagram to controller
			},
			viewDiagram: function(diagramSpec){
				showDiagramEditor();
				sendMessage('start_diagram', diagramSpec);
				loadDiagram(diagramSpec);
			},
			renameDiagram: function(diagramSpec){
				modalPrompt({title: 'Rename Diagram', prompt: 'Name', default: diagramSpec.name,
					validator: Util.diagramValidator,
					resultFunc: function(newName) {
						sendMessage('rename_diagram', {'old_name': diagramSpec.name, 'new_name': newName});
						diagramSpec.name = newName;
					}});
			},
			deleteDiagram: function(diagramSpec, i){
				var view = this;
				// TODO: add validator similar to diagram save prompt
				modalConfirm({title: 'Delete Diagram', prompt: 'Are you sure you want to delete this diagram?', yesFunc: function() {
					sendMessage('delete_diagram', {'name': diagramSpec.name });
					view.diagrams.splice(i, 1);
				}});
			},
			closeView: function(){
				showControllerSelector();
			}
		},
		created: function(){
			var view = this;
			// if we've already initialized the view but are returning to it again, we should request the list of diagrams again

			// subscribe to message for this controller
			subscribeToFolder(g_controller.path);

			// set outgoing messages to go to this controller
			setTargetFolder(g_controller.path);

			// open websocket connect to server
			if (g_controllerViewerInitialized) {
				sendMessage('list_diagrams');
				sendMessage('request_status');
			} else {
				connectWebSocket(function() {
					sendMessage('list_diagrams');
					sendMessage('request_status');
				});
			}

			addMessageHandler('diagram_list', function(timestamp, params){
				view.connecting = false;
				view.diagrams = params.diagrams;
			});

			// handle status message from the controller
			addMessageHandler('status', function(timestamp, params) {
				console.log('status', params);
				view.statusMsg = 'Number of devices: ' + params.device_count;
			});

			g_controllerViewerInitialized = true;

		}
	});
}
