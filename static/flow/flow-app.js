// This file provide top-level control for the data flow app.

var g_app;

// initialize the app
function initFlowApp() {
	g_app = new Vue({
		el: '#app',
		template: [
			'<component v-bind:is="currentView"></component>'
		].join('\n'),
		data: {
			currentView: 'controllerSelector',
		},
		components: {
			'controllerSelector': controllerSelectorView(),
			'controllerViewer': controllerViewerView(),
			'diagramEditor': diagramEditorView(),
			'plotter': plotterView(),
		}
	});
}


// change screens within the app: show the controller selection screen
function showControllerSelector() {
	g_app.currentView = 'controllerSelector';
}


// change screens within the app: show the controller contents (diagram list) screen
function showControllerViewer() {
	g_app.currentView = 'controllerViewer';
}


// change screens within the app: show the flow diagram editor screen
function showDiagramEditor() {
	g_app.currentView = 'diagramEditor';
}


// change screens within the app: show the plotter screen
function showPlotter() {
	g_app.currentView = 'plotter'
}
